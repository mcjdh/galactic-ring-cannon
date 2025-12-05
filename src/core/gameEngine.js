const __GLOBAL = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : global);
const GAME_CONSTANTS = __GLOBAL.GAME_CONSTANTS || (__GLOBAL.GAME_CONSTANTS = {});

const DEFAULT_PERFORMANCE_CONSTANTS = {
    PROJECTILE_BATCH_SIZE: 64,
    ENEMY_BATCH_SIZE: 64,
    ENEMY_PROJECTILE_BATCH_SIZE: 64,
    XP_ORB_BATCH_SIZE: 64,
    FALLBACK_BATCH_SIZE: 32,
    TARGET_FPS: 60,
    CLEANUP_INTERVAL: 0.5,
    MAX_FIXED_STEPS: 5
};

GAME_CONSTANTS.PERFORMANCE = {
    ...DEFAULT_PERFORMANCE_CONSTANTS,
    ...(GAME_CONSTANTS.PERFORMANCE || {})
};

let __GameStateRef;
(function resolveGameStateClass() {
    if (typeof GameState !== 'undefined') {
        __GameStateRef = GameState;
        return;
    }

    if (typeof window !== 'undefined' && window.Game?.GameState) {
        __GameStateRef = window.Game.GameState;
        return;
    }

    if (typeof module !== 'undefined' && typeof require === 'function') {
        try {
            const moduleExport = require('./GameState.js');
            __GameStateRef = moduleExport?.GameState || moduleExport || null;
            return;
        } catch (error) {
            // Ignore and fall back to stub below
        }
    }

    // Minimal stub so headless tests can instantiate the engine without the full GameState
    class GameStateStub {
        constructor() {
            this.meta = { achievements: new Set(), starTokens: 0 };
            this.state = {};
        }

        on() { }
        off() { }
    }

    __GameStateRef = GameStateStub;
})();

class GameEngine {
    constructor() {
        if (typeof window !== 'undefined' && window.__activeGameEngine && typeof window.__activeGameEngine.cleanupEventListeners === 'function') {
            try {
                window.__activeGameEngine.cleanupEventListeners();
            } catch (e) {
                window.logger.warn('Previous GameEngine cleanup failed:', e);
            }
        }

        // Initialize canvas with error handling
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            window.logger.error('Game canvas not found!');
            return;
        }

        // Canvas performance optimizations
        this.canvas.style.willChange = 'transform'; // Hint to browser for GPU acceleration
        this.canvas.style.transform = 'translateZ(0)'; // Force GPU layer
        this.canvas.style.backfaceVisibility = 'hidden'; // Optimize for transforms

        // Get 2D context with performance optimizations
        this.ctx = this.canvas.getContext('2d', {
            alpha: false, // Disable alpha for better performance
            willReadFrequently: false // Optimize for GPU rendering
        });

        if (!this.ctx) {
            window.logger.error('Could not get 2D context!');
            return;
        }

        // Set canvas size to window size with error handling
        try {
            // Store bound functions for proper cleanup later
            this.boundResizeCanvas = this.resizeCanvas.bind(this);
            this.boundHandleContextLoss = this.handleContextLoss.bind(this);
            this.boundHandleContextRestore = this.handleContextRestore.bind(this);
            this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
            this.boundHandleFocusChange = this.handleFocusChange.bind(this);
            this.boundHandleBlurChange = this.handleBlurChange.bind(this);
            this.boundHandleBeforeUnload = () => {
                try {
                    this.cleanupEventListeners();
                } catch (error) {
                    window.logger.warn('Cleanup during unload failed:', error);
                }
            };

            this.resizeCanvas();
            window.addEventListener('resize', this.boundResizeCanvas);
            window.addEventListener('beforeunload', this.boundHandleBeforeUnload, { once: true });
        } catch (error) {
            window.logger.error('Error initializing canvas:', error);
        }

        // [GAME STATE] - Single Source of Truth
        // Initialize centralized state management
        this.state = new __GameStateRef();

        // Entity arrays (still managed by GameEngine for performance)
        this.entities = [];
        this.player = null;
        this.enemies = [];
        this.xpOrbs = [];
        this.projectiles = [];
        this.enemyProjectiles = [];

        this.isRunning = false;
        this.isPaused = false;

        // [OPTIMIZATION] Pre-allocated batch arrays for rendering (eliminates 240 allocations/sec at 60fps)
        // Initialize as dense arrays with null for better V8 optimization
        const PERF = GAME_CONSTANTS.PERFORMANCE;
        this._projectileBatch = Array(PERF.PROJECTILE_BATCH_SIZE).fill(null);
        this._enemyBatch = Array(PERF.ENEMY_BATCH_SIZE).fill(null);
        this._enemyProjectileBatch = Array(PERF.ENEMY_PROJECTILE_BATCH_SIZE).fill(null);
        this._xpOrbBatch = Array(PERF.XP_ORB_BATCH_SIZE).fill(null);
        this._fallbackBatch = Array(PERF.FALLBACK_BATCH_SIZE).fill(null);

        // Enemy projectile pool is initialized below with other pools
        this.lastTime = 0;

        // Performance tracking (local to GameEngine for frame timing)
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.targetFps = PERF.TARGET_FPS;
        this.lastFrameTime = 0;
        this._cleanupTimer = 0;
        this._cleanupInterval = PERF.CLEANUP_INTERVAL;
        this._needsCleanup = false;
        this._maxFixedSteps = PERF.MAX_FIXED_STEPS;
        this._accumulatorMs = 0;
        this._renderAccumulatorMs = 0;

        // [PERFORMANCE] Delegated to PerformanceManager
        // Initialize PerformanceManager
        try {
            const SystemPerformanceManager = window.Game?.SystemPerformanceManager;
            this.performanceManager = SystemPerformanceManager ? new SystemPerformanceManager(this) : null;
        } catch (e) {
            window.logger.warn('PerformanceManager initialization failed:', e);
            this.performanceManager = null;
        }

        // Local fallbacks when PerformanceManager isn't available
        this._performanceModeFallback = false;
        this._lowGpuModeFallback = false;
        this._lowPerformanceModeFallback = false;

        this.debugMode = false;

        this._visibleEntitiesScratch = [];
        this._visibleEntitiesGeneration = 1;
        this._domCache = new Map();
        this._minimapUpdateAccumulator = 0;
        this._minimapHasDrawn = false;
        this._collisionFallbackRules = {
            player: new Set(['enemy', 'xpOrb', 'enemyProjectile']),
            enemy: new Set(['player', 'projectile']),
            projectile: new Set(['enemy']),
            enemyProjectile: new Set(['player']),
            xpOrb: new Set(['player'])
        };
        this._updateTimingTargets();

        // Track pause origins so auto-resume doesn't override manual pauses
        this.manualPause = false;
        this.autoPaused = false;

        // Object pools
        // Current pools: particlePool, enemyProjectilePool, projectilePool (global)
        this.enemyProjectilePool = [];
        this.particlePool = [];
        this.maxPoolSize = 100; // Pool size works well for most devices

        // Spatial partitioning system
        this.gridSize = 100; // Fixed grid size for collision detection
        this.spatialGrid = new Map();
        this._spatialGridCellPool = [];
        this._maxSpatialGridPoolSize = 256;

        // [OPTIMIZATION] Initialize Performance Caches (Pi5 stability improvements)
        if (typeof window !== 'undefined' && window.perfCache) {
            window.perfCache.setGridSize(this.gridSize);
            window.logger.info('[Pi5] Performance caches enabled: sqrt, floor, random, vectors');
        }

        // Initialize unified systems if available
        try {
            this.collisionSystem = null;
            if (typeof window !== 'undefined') {
                const CollisionSystem = window.Game?.CollisionSystem;
                if (typeof CollisionSystem === 'function') {
                    this.collisionSystem = new CollisionSystem(this);
                }
            }
        } catch (e) {
            window.logger.warn('Collision system initialization failed, using internal collision logic.', e);
            this.collisionSystem = null;
        }

        this.entityManager = null;
        this._initializeEntityManager();

        // Initialize Unified UI Manager for proper health bars and floating text
        try {
            const UnifiedUIManager = (typeof window !== 'undefined')
                ? window.Game?.UnifiedUIManager
                : undefined;
            this.unifiedUI = typeof UnifiedUIManager === 'function'
                ? new UnifiedUIManager(this)
                : null;

            // Make game engine globally accessible for UI systems
            window.gameEngine = this;
        } catch (e) {
            window.logger.warn('UnifiedUIManager initialization failed, using legacy UI systems.', e);
            this.unifiedUI = null;
        }
        if (typeof window !== 'undefined') {
            window.__activeGameEngine = this;
        }
        // Input handling with additional pause key support and error handling
        this.keys = {};
        try {
            // Store bound input handlers so we can remove them during cleanup
            this.boundHandleKeyDown = this.onKeyDown.bind(this);
            this.boundHandleKeyUp = this.onKeyUp.bind(this);
            window.addEventListener('keydown', this.boundHandleKeyDown);
            window.addEventListener('keyup', this.boundHandleKeyUp);
        } catch (error) {
            window.logger.error('Error setting up input handling:', error);
        }

        // Visibility state tracking
        this.isVisible = true;
        this.isMinimized = false;
        this.lastVisibilityChange = 0;

        // Add visibility change handlers
        if (typeof document?.addEventListener === 'function') {
            document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
        }
        window.addEventListener('focus', this.boundHandleFocusChange);
        window.addEventListener('blur', this.boundHandleBlurChange);

        // Resource cleanup
        this.resourceCleanupInterval = 5000;
        this.lastResourceCleanup = 0;

        // Add canvas context loss handling
        if (typeof this.canvas?.addEventListener === 'function') {
            this.canvas.addEventListener('webglcontextlost', this.boundHandleContextLoss);
            this.canvas.addEventListener('webglcontextrestored', this.boundHandleContextRestore);
        }
        this.contextLost = false;

        // Track the main loop status
        this._loopInitialized = false;
        this._loopHandle = null;
        this._useSetTimeoutLoop = false;
        this._boundGameLoop = this.gameLoop.bind(this);


        // [C] Initialize Cosmic Background
        this.cosmicBackground = null;
        this._initializeCosmicBackground();
    }

    // ===== PERFORMANCE MANAGER PROXIES =====
    get performanceMode() { return this.performanceManager?.performanceMode ?? this._performanceModeFallback; }
    set performanceMode(v) {
        if (this.performanceManager) {
            this.performanceManager.performanceMode = v;
        } else {
            this._performanceModeFallback = !!v;
        }
    }

    get lowGpuMode() { return this.performanceManager?.lowGpuMode ?? this._lowGpuModeFallback; }
    get lowPerformanceMode() { return this.performanceManager?.lowPerformanceMode ?? this._lowPerformanceModeFallback; }

    get _manualPerformanceOverride() { return this.performanceManager?._manualPerformanceOverride ?? null; }
    set _manualPerformanceOverride(v) { if (this.performanceManager) this.performanceManager._manualPerformanceOverride = v; }

    get _autoLowQualityCosmic() { return this.performanceManager?._autoLowQualityCosmic ?? false; }
    get _autoParticleLowQuality() { return this.performanceManager?._autoParticleLowQuality ?? false; }


    _initializeCosmicBackground() {
        try {
            const CosmicBackground = (typeof window !== 'undefined')
                ? window.Game?.CosmicBackground
                : undefined;
            if (typeof CosmicBackground === 'function') {
                // [PERF OPT] Reuse existing global instance to preserve caches
                if (window.cosmicBackground) {
                    this.cosmicBackground = window.cosmicBackground;
                    // Update canvas reference for game canvas
                    this.cosmicBackground.canvas = this.canvas;
                    this.cosmicBackground.ctx = this.ctx;
                    // Resize if needed (will skip if same size)
                    this.cosmicBackground.resize(this.canvas.width, this.canvas.height);
                    window.logger.info('Cosmic background reused from global instance');
                } else {
                    this.cosmicBackground = new CosmicBackground(this.canvas);
                    window.cosmicBackground = this.cosmicBackground;
                    window.logger.info('Cosmic background initialized');
                }

                // [PERFORMANCE] Update quality settings via PerformanceManager
                if (this.performanceManager) {
                    this.performanceManager.updateQualitySettings();
                }
            }
        } catch (e) {
            window.logger.warn('CosmicBackground initialization failed', e);
            if (typeof window !== 'undefined' && window.cosmicBackground === this.cosmicBackground) {
                window.cosmicBackground = null;
            }
            this.cosmicBackground = null;
        }
    }



    // ===== GAMESTATE PROXY PROPERTIES =====
    // External systems access state through these properties
    // These are the public API - do not remove
    // Null checks required during initialization

    get gameTime() { return this.state?.runtime.gameTime ?? 0; }
    set gameTime(value) { if (this.state) this.state.runtime.gameTime = value; }

    get isPaused() { return this.state?.runtime.isPaused ?? false; }
    set isPaused(value) { if (this.state) { value ? this.state.pause() : this.state.resume(); } }

    // Player management with GameState sync
    setPlayer(player) {
        this.player = player;
        this.state.setPlayer(player);
    }

    removeEntity(target) {
        if (!target) return false;

        // 1. Resolve target to entity object
        let entity = typeof target === 'object' ? target : null;
        if (!entity && typeof target === 'string') {
            entity = this.entityManager?.getEntity?.(target) ?? null;
            if (!entity) {
                entity = this.entities.find(e => e && e.id === target);
            }
        }

        if (!entity) return false;

        // 2. Handle Projectile Pooling
        if (entity.type === 'projectile' && window.projectilePool) {
            // Remove from main entities list
            const index = this.entities.indexOf(entity);
            if (index > -1) {
                this.entities.splice(index, 1);
            }

            // Remove from projectiles list
            const pIndex = this.projectiles.indexOf(entity);
            if (pIndex > -1) {
                this.projectiles.splice(pIndex, 1);
            }

            // Release to pool
            window.projectilePool.release(entity);
            this._needsCleanup = true;
            // Notify collision system that entities changed
            if (this.collisionSystem?.markGridDirty) {
                this.collisionSystem.markGridDirty();
            }
            return true;
        }

        // 3. Handle other entities (Legacy + EntityManager)
        const handleSideEffects = (removedEntity) => {
            if (!removedEntity) return;
            if (removedEntity.type === 'enemyProjectile') {
                this._releaseEnemyProjectile(removedEntity);
            }
            if (removedEntity.type === 'player' && this.player === removedEntity) {
                this.player = null;
            }
        };

        // Try EntityManager first
        if (this.entityManager) {
            try {
                const removed = this.entityManager.removeEntity(entity);
                if (removed) {
                    handleSideEffects(entity);
                    this._needsCleanup = true;
                    // Notify collision system that entities changed
                    if (this.collisionSystem?.markGridDirty) {
                        this.collisionSystem.markGridDirty();
                    }
                    return true;
                }
            } catch (error) {
                window.logger.warn('EntityManager.removeEntity failed, falling back to legacy removal:', error);
            }
        }

        // Legacy fallback
        const removeFromArray = (array) => {
            if (!Array.isArray(array)) return false;
            const index = array.indexOf(entity);
            if (index !== -1) {
                const lastIndex = array.length - 1;
                if (index !== lastIndex) {
                    array[index] = array[lastIndex];
                }
                array.length = lastIndex;
                return true;
            }
            return false;
        };

        let removed = removeFromArray(this.entities);

        if (entity.type === 'enemy') {
            removed = removeFromArray(this.enemies) || removed;
        } else if (entity.type === 'xpOrb') {
            removed = removeFromArray(this.xpOrbs) || removed;
        } else if (entity.type === 'enemyProjectile') {
            removed = removeFromArray(this.enemyProjectiles) || removed;
        }

        if (removed) {
            handleSideEffects(entity);
            this._needsCleanup = true;
            // Notify collision system that entities changed
            if (this.collisionSystem?.markGridDirty) {
                this.collisionSystem.markGridDirty();
            }
        }

        return removed;
    }

    _initializeEntityManager() {
        if (this.entityManager) {
            return;
        }

        const ManagerClass = (typeof window !== 'undefined' && window.Game?.EntityManager)
            ? window.Game.EntityManager
            : (typeof EntityManager !== 'undefined' ? EntityManager : undefined);

        if (!ManagerClass) {
            return;
        }

        try {
            this.entityManager = new ManagerClass({
                all: this.entities,
                typeCollections: {
                    enemy: this.enemies,
                    xpOrb: this.xpOrbs,
                    projectile: this.projectiles,
                    enemyProjectile: this.enemyProjectiles
                }
            });
        } catch (error) {
            window.logger.warn('EntityManager initialization failed, continuing with legacy arrays.', error);
            this.entityManager = null;
        }
    }

    _updateTimingTargets() {
        const clampedFps = Math.max(15, Math.min(this.targetFps || 60, 240));
        this.targetFps = clampedFps;
        this.frameTime = 1000 / this.targetFps;
        this._fixedDeltaMs = this.frameTime;
        this._fixedDeltaSeconds = this._fixedDeltaMs / 1000;
        this._renderIntervalMs = this.frameTime;
    }

    getEntitiesByType(type) {
        if (this.entityManager) {
            const collection = this.entityManager.getEntitiesByType(type);
            return Array.isArray(collection) ? collection : [];
        }

        switch (type) {
            case 'enemy':
                return this.enemies;
            case 'xpOrb':
                return this.xpOrbs;
            case 'projectile':
                return this.projectiles;
            case 'enemyProjectile':
                if (!this.enemyProjectiles) {
                    this.enemyProjectiles = [];
                }
                return this.enemyProjectiles;
            case 'player':
                return this.player ? [this.player] : [];
            default:
                const matches = [];
                for (let i = 0; i < this.entities.length; i++) {
                    const entity = this.entities[i];
                    if (!entity || entity.type !== type) continue;
                    matches.push(entity);
                }
                return matches;
        }
    }

    getEnemies() {
        return this.getEntitiesByType('enemy');
    }

    getXPOrbs() {
        return this.getEntitiesByType('xpOrb');
    }

    getProjectiles() {
        return this.getEntitiesByType('projectile');
    }

    getEnemyProjectiles() {
        return this.getEntitiesByType('enemyProjectile');
    }

    getAllEntities() {
        if (this.entityManager) {
            return this.entityManager.getAllEntities();
        }
        return this.entities;
    }

    getEntitiesWithinRadius(type, centerX, centerY, radius, options = {}) {
        const { includeDead = false, predicate } = options;

        if (!Number.isFinite(radius) || radius <= 0) {
            return [];
        }

        const x = Number.isFinite(centerX) ? centerX : (this.player?.x ?? 0);
        const y = Number.isFinite(centerY) ? centerY : (this.player?.y ?? 0);
        const radiusSq = radius * radius;

        const matches = [];
        const entities = this.getEntitiesByType(type);

        for (const entity of entities) {
            if (!entity) continue;
            if (!includeDead && entity.isDead) continue;
            if (predicate && !predicate(entity)) continue;

            const dx = entity.x - x;
            const dy = entity.y - y;
            if ((dx * dx + dy * dy) <= radiusSq) {
                matches.push(entity);
            }
        }

        return matches;
    }

    findClosestEntity(type, originX, originY, options = {}) {
        const {
            maxRadius = Infinity,
            includeDead = false,
            predicate,
            useSpatialGrid = true
        } = options;

        const x = Number.isFinite(originX) ? originX : (this.player?.x ?? 0);
        const y = Number.isFinite(originY) ? originY : (this.player?.y ?? 0);
        const maxRadiusSq = Number.isFinite(maxRadius) ? Math.max(0, maxRadius) ** 2 : Infinity;

        let closest = null;
        let closestDistSq = maxRadiusSq;

        const shouldInclude = (entity) => {
            if (!entity) return false;
            if (!includeDead && entity.isDead) return false;
            if (predicate && !predicate(entity)) return false;
            return true;
        };

        if (useSpatialGrid && this.spatialGrid && this.gridSize > 0 && this.spatialGrid.size > 0) {
            // [OPTIMIZATION] Use PerformanceCache for grid coordinate calculations
            const gridX = window.perfCache
                ? window.perfCache.gridCoord(x, this.gridSize)
                : Math.floor(x / this.gridSize);
            const gridY = window.perfCache
                ? window.perfCache.gridCoord(y, this.gridSize)
                : Math.floor(y / this.gridSize);

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cell = this.spatialGrid.get(this._encodeGridKey(gridX + dx, gridY + dy));
                    if (!cell || cell.length === 0) continue;

                    for (const entity of cell) {
                        if (!shouldInclude(entity) || entity.type !== type) continue;

                        const distSq = this._distanceSquared(entity.x, entity.y, x, y);
                        if (distSq < closestDistSq) {
                            closest = entity;
                            closestDistSq = distSq;
                        }
                    }
                }
            }
        }

        if (!closest) {
            const entities = this.getEntitiesByType(type);
            for (const entity of entities) {
                if (!shouldInclude(entity)) continue;

                const distSq = this._distanceSquared(entity.x, entity.y, x, y);
                if (distSq < closestDistSq) {
                    closest = entity;
                    closestDistSq = distSq;
                }
            }
        }

        if (closest && maxRadiusSq !== Infinity && closestDistSq > maxRadiusSq) {
            return null;
        }

        return closest;
    }

    findClosestEnemy(originX, originY, options = {}) {
        return this.findClosestEntity('enemy', originX, originY, options);
    }

    getEnemiesWithinRadius(centerX, centerY, radius, options = {}) {
        return this.getEntitiesWithinRadius('enemy', centerX, centerY, radius, options);
    }

    _distanceSquared(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    }

    encodeGridKey(gridX, gridY) {
        return this._encodeGridKey(gridX, gridY);
    }

    decodeGridKey(key) {
        return this._decodeGridKey(key);
    }

    _encodeGridKey(gridX, gridY) {
        const offset = 0x200000; // 2,097,152
        const stride = 0x400000; // 4,194,304 (2^22)
        return ((gridX + offset) * stride) + (gridY + offset);
    }

    _decodeGridKey(key) {
        const offset = 0x200000;
        const stride = 0x400000;
        const gridX = Math.floor(key / stride) - offset;
        const gridY = (key % stride) - offset;
        return [gridX, gridY];
    }

    _getDomRef(id) {
        if (!this._domCache) {
            this._domCache = new Map();
        }
        const body = typeof document !== 'undefined' ? document.body : null;
        if (this._domCache.has(id)) {
            const cached = this._domCache.get(id);
            if (cached && body && body.contains(cached)) {
                return cached;
            }
            this._domCache.delete(id);
        }
        const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
        if (el) {
            this._domCache.set(id, el);
        }
        return el;
    }

    prepareNewRun() {
        // Abort if canvas or player constructor are missing
        if (!this.canvas) {
            return;
        }

        window.logger.log('@ Preparing game engine for new run');

        this._initializeEntityManager();

        // Reset core timing/performance metrics
        this.gameTime = 0;
        this.lastTime = 0;
        this.lastFrameTime = 0;
        this.lastRenderTime = 0;
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.deltaTimeHistory = null;
        this._accumulatorMs = 0;
        this._renderAccumulatorMs = 0;

        // Reset pause/visibility state
        this.isPaused = false;
        this.manualPause = false;
        this.autoPaused = false;
        this.contextLost = false;

        // [PERFORMANCE] Reset via PerformanceManager
        if (this.performanceManager) {
            this.performanceManager.reset();
        }
        this._performanceModeFallback = false;
        this._lowGpuModeFallback = false;
        this._lowPerformanceModeFallback = false;

        this.isVisible = true;
        this.isMinimized = false;

        // Notify UI layer of game reset (loose coupling via events)
        this.state._notifyObservers('gameReset');

        // Clear entity collections via EntityManager when available
        if (this.entityManager) {
            this.entityManager.clear();
        } else {
            this.entities.length = 0;
            this.enemies.length = 0;
            this.xpOrbs.length = 0;
            this.projectiles.length = 0;
            if (this.enemyProjectiles && Array.isArray(this.enemyProjectiles)) {
                this.enemyProjectiles.length = 0;
            }
        }
        this.player = null;

        // Reset pooled resources
        if (Array.isArray(this.enemyProjectilePool)) {
            this.enemyProjectilePool.length = 0;
        }
        if (Array.isArray(this.particlePool)) {
            this.particlePool.length = 0;
        }

        // [OPTIMIZATION] Pre-allocate enemy projectile pool to reduce GC stutter
        // during initial enemy attacks
        this._preallocateEnemyProjectilePool();

        // Reset spatial caches
        if (this.spatialGrid && typeof this.spatialGrid.clear === 'function') {
            this.spatialGrid.clear();
        }
        if (this.spatialGridCache && typeof this.spatialGridCache.clear === 'function') {
            this.spatialGridCache.clear();
        }

        // Reset collision system state for new run
        if (this.collisionSystem?.reset) {
            this.collisionSystem.reset();
        }

        // Reset auxiliary managers
        this.unifiedUI?.clearAllFloatingText?.();
        if (window.optimizedParticles?.clear) {
            window.optimizedParticles.clear();
        }

        if (this.performanceManager) {
            this.performanceManager.updateQualitySettings();
        }

        // [BUG FIX] Reset input state to avoid stuck keys between runs
        // Clear both legacy keys object and InputManager state
        this.keys = {};
        if (window.inputManager?.clearAllKeys) {
            window.inputManager.clearAllKeys();
        }

        // Reset upgrade UI/system state so the next run starts clean
        if (window.upgradeSystem?.resetForNewRun) {
            try {
                window.upgradeSystem.resetForNewRun();
            } catch (error) {
                window.logger.warn('UpgradeSystem reset failed:', error);
            }
        }

        // Drop reference to prior player and spawn a fresh instance
        this.player = null;
        if (typeof Player !== 'undefined') {
            const spawnX = (this.canvas.width || window.innerWidth || 0) / 2;
            const spawnY = (this.canvas.height || window.innerHeight || 0) / 2;
            const player = new Player(spawnX, spawnY);
            this.addEntity(player);

            // Notify UI layer that player was created (loose coupling via events)
            try {
                player?.stats?.updateXPBar?.();
                this.state._notifyObservers('playerCreated', { player });
            } catch (error) {
                window.logger.warn('Failed to notify player creation:', error);
            }
        }

        if (this.performanceManager) {
            this.performanceManager.updateQualitySettings();
        }
    }

    onKeyDown(e) {
        this.keys[e.key] = true;
        if (e.code) this.keys[e.code] = true;

        // Toggle debug mode with F3
        if (e.key === 'F3') {
            this.debugMode = !this.debugMode;
        }

        // Toggle performance mode with 'O' key (O for Optimize)
        if (e.key === 'o' || e.key === 'O') {
            if (this.performanceManager) {
                if (e.altKey) {
                    this.performanceManager.setPerformanceOverride(null);
                } else {
                    // Toggle between on/off overrides
                    const current = this.performanceManager._manualPerformanceOverride;
                    this.performanceManager.setPerformanceOverride(current === 'on' ? 'off' : 'on');
                }
            }
        }

        // Pause/resume with P or Escape
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            this.togglePause();
        }
    }

    onKeyUp(e) {
        this.keys[e.key] = false;
        if (e.code) this.keys[e.code] = false;
    }

    resizeCanvas() {
        try {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;

            // Optimize canvas for performance
            this.canvas.style.imageRendering = 'pixelated';
            this.ctx.imageSmoothingEnabled = false;

            // Set up GPU-optimized rendering
            this.ctx.imageSmoothingQuality = 'low'; // Better performance
            this.ctx.globalCompositeOperation = 'source-over'; // Optimize blending

            // [C] Notify cosmic background of resize
            if (this.cosmicBackground && typeof this.cosmicBackground.resize === 'function') {
                this.cosmicBackground.resize(this.canvas.width, this.canvas.height);
            }
        } catch (error) {
            window.logger.error('Error resizing canvas:', error);
        }
    }

    start() {
        window.logger.log('> GameEngine starting...');

        // 🌊 START GAME STATE
        this.state.start();

        this.prepareNewRun();

        this.isRunning = true;
        this.isPaused = false;

        const now = performance.now();
        this.lastTime = now;
        this.lastFrameTime = now;
        this.lastRenderTime = now;
        this._accumulatorMs = 0;
        this._renderAccumulatorMs = 0;

        if (!this._loopInitialized) {
            this._loopInitialized = true;
            this.gameLoop(now);
            window.logger.log('+ Game loop started');
        } else {
            window.logger.log('@ Game loop already active - refreshed run state');
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) {
            this._loopHandle = null;
            this._loopInitialized = false;
            return;
        }

        // [Pi] Performance profiling for Pi5
        if (window.performanceProfiler?.enabled) {
            window.performanceProfiler.frameStart();
        }

        if (this.lastTime === 0 || !Number.isFinite(this.lastTime)) {
            this.lastTime = timestamp;
        }

        let frameDeltaMs = timestamp - this.lastTime;
        if (!Number.isFinite(frameDeltaMs) || frameDeltaMs < 0) {
            frameDeltaMs = this.frameTime;
        }

        const maxCatchup = this.frameTime * this._maxFixedSteps;
        if (frameDeltaMs > maxCatchup) {
            frameDeltaMs = maxCatchup;
        }

        this.lastTime = timestamp;

        this.updatePerformanceMetrics(frameDeltaMs);
        this.adjustPerformanceMode();

        if (!this.isPaused) {
            this._accumulatorMs += frameDeltaMs;
            const stepMs = this._fixedDeltaMs;
            const stepSeconds = this._fixedDeltaSeconds;

            let steps = 0;
            while (this._accumulatorMs >= stepMs && steps < this._maxFixedSteps) {
                this.update(stepSeconds);
                this._accumulatorMs -= stepMs;
                steps++;
            }

            if (steps === this._maxFixedSteps) {
                this._accumulatorMs = 0;
            }

            this._renderAccumulatorMs += frameDeltaMs;
            if (this._renderAccumulatorMs >= this._renderIntervalMs) {
                this.render();
                this.lastRenderTime = timestamp;
                this._renderAccumulatorMs %= this._renderIntervalMs;
            }
        } else {
            this._accumulatorMs = 0;
            this._renderAccumulatorMs = 0;
        }

        this.lastFrameTime = timestamp;

        // [Pi] End frame profiling
        if (window.performanceProfiler?.enabled) {
            window.performanceProfiler.frameEnd();
        }

        this._scheduleNextFrame();
    }

    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        this.isPaused = true;
        this._cancelNextFrame();
        this._loopInitialized = false;
        this.shutdown();
    }

    update(deltaTime) {
        // Validate and smooth deltaTime to prevent jitter
        if (!Number.isFinite(deltaTime) || deltaTime < 0 || deltaTime > 1) {
            // [AI NOTE]: Reduced console spam - only log critical deltaTime issues
            if (deltaTime > 0.1 && window.logger?.isDebugEnabled?.('systems')) {
                window.logger.warn('Invalid deltaTime:', deltaTime);
            }
            deltaTime = 1 / 60; // Fallback to 60fps
        } else if (deltaTime === 0) {
            // Use a small timestep silently when browsers report 0ms frame
            deltaTime = 1 / 60;
        }

        // Smooth deltaTime to reduce movement jitter from frame rate fluctuations
        if (!this.deltaTimeHistory) {
            // Initialize with current value - use this frame's deltaTime for smoothing
            this.deltaTimeHistory = [deltaTime, deltaTime, deltaTime];
        } else {
            // Add current deltaTime and maintain history of last 3 frames
            this.deltaTimeHistory.push(deltaTime);
            if (this.deltaTimeHistory.length > 3) {
                this.deltaTimeHistory.shift();
            }
        }

        // Use smoothed deltaTime (weighted average favoring recent frames)
        // Array is guaranteed to have 3 elements after initialization above
        const smoothedDelta = (this.deltaTimeHistory[0] * 0.1 +
            this.deltaTimeHistory[1] * 0.3 +
            this.deltaTimeHistory[2] * 0.6);
        deltaTime = Math.max(1 / 120, Math.min(1 / 30, smoothedDelta)); // Clamp between 30-120fps

        // 🌊 UPDATE GAME STATE
        if (this.state && this.state.updateTime) {
            this.state.updateTime(deltaTime);

            // Sync player state if player exists
            if (this.player) {
                this.state.syncPlayerState(this.player);
            }

            // Update entity counts
            const particleStats = window.Game?.ParticleHelpers?.getParticleStats?.();
            const particleCount = particleStats
                ? particleStats.currentParticles
                : window.optimizedParticles?.activeParticles?.length || 0;

            this.state.updateEntityCounts(
                this.enemies.length,
                this.projectiles.length,
                this.xpOrbs.length,
                particleCount
            );
        }

        // [CRITICAL] Update GameManager systems BEFORE entities
        // This ensures formations and constellations are updated and targets set
        // before enemies calculate their movement forces for this frame.
        if (window.gameManager && typeof window.gameManager.update === 'function') {
            try {
                window.gameManager.update(deltaTime);

                if (typeof window.gameManager.renderMinimap === 'function') {
                    this._minimapUpdateAccumulator += deltaTime;
                    const interval = this._getMinimapUpdateInterval();
                    if (!this._minimapHasDrawn || this._minimapUpdateAccumulator >= interval) {
                        this._minimapUpdateAccumulator = 0;
                        this._minimapHasDrawn = true;
                        window.gameManager.renderMinimap();
                    }
                }
            } catch (error) {
                if (window.logger?.isDebugEnabled?.('systems')) {
                    window.logger.error('GameManager update error:', error);
                }
            }
        }

        // Update gamepad state if available
        if (window.inputManager && typeof window.inputManager.updateGamepad === 'function') {
            window.inputManager.updateGamepad();
        }

        // Update performance manager if available
        if (window.performanceManager && typeof window.performanceManager.update === 'function') {
            window.performanceManager.update(deltaTime);
        }

        // Update optimized particle pool if available
        if (window.optimizedParticles && typeof window.optimizedParticles.update === 'function') {
            if (window.performanceProfiler?.enabled) window.performanceProfiler.start('particles');
            window.optimizedParticles.update(deltaTime);
            if (window.performanceProfiler?.enabled) window.performanceProfiler.end('particles', 'particles');
        }

        // [C] Update cosmic background
        if (this.cosmicBackground && typeof this.cosmicBackground.update === 'function') {
            if (window.performanceProfiler?.enabled) window.performanceProfiler.start('cosmicBackground');
            // [FIX] Pass coordinates explicitly to ensure proper parallax tracking
            const pX = this.player ? this.player.x : 0;
            const pY = this.player ? this.player.y : 0;
            this.cosmicBackground.update(deltaTime, pX, pY);
            if (window.performanceProfiler?.enabled) window.performanceProfiler.end('cosmicBackground', 'cosmicBackground');
        }

        // Late-bind unified systems if modules loaded after engine
        if (!this.collisionSystem && typeof window !== 'undefined') {
            const CollisionSystem = window.Game?.CollisionSystem;
            if (typeof CollisionSystem === 'function') {
                try { this.collisionSystem = new CollisionSystem(this); } catch (_) { }
            }
        }
        if (!this.entityManager) {
            this._initializeEntityManager();
        }

        // Update all entities with proper error handling
        if (this.entities && Array.isArray(this.entities)) {
            for (let i = this.entities.length - 1; i >= 0; i--) {
                const entity = this.entities[i];
                if (entity && typeof entity.update === 'function' && !entity.isDead) {
                    try {
                        entity.update(deltaTime, this);
                    } catch (error) {
                        window.logger.error('Error updating entity:', error, entity);
                        entity.isDead = true; // Mark as dead to prevent further errors
                    }
                }
            }
        }

        // Rebuild spatial grid AFTER entities have moved so culling/collisions are accurate
        if (this.collisionSystem && typeof this.collisionSystem.updateSpatialGrid === 'function') {
            this.collisionSystem.updateSpatialGrid();
        } else {
            this.updateSpatialGrid();
        }

        // Update legacy combat texts only when unified UI is not available
        if (!this.unifiedUI && window.gameManager && typeof window.gameManager.updateCombatTexts === 'function') {
            window.gameManager.updateCombatTexts(deltaTime);
        }



        // Check collisions with error handling (uses up-to-date spatial grid)
        try {
            if (this.collisionSystem && typeof this.collisionSystem.checkCollisions === 'function') {
                this.collisionSystem.checkCollisions();
            } else {
                this.checkCollisions();
            }
        } catch (error) {
            window.logger.error('Error in collision detection:', error);
        }

        // Update unified UI system
        if (this.unifiedUI) {
            this.unifiedUI.update(deltaTime);
        }

        // Clean up dead entities
        this._cleanupTimer += deltaTime;
        this.cleanupEntities();
    }

    _getMinimapUpdateInterval() {
        if (!this._minimapHasDrawn) {
            return 0;
        }

        if (this.performanceMode || this.lowPerformanceMode || this.lowGpuMode) {
            return 0.28;
        }

        if (this.fps && this.fps < 40) {
            return 0.24;
        }

        if (this.fps && this.fps > 57) {
            return 0.12;
        }

        return 0.16;
    }

    updatePerformanceMetrics(elapsed) {
        // Simple FPS tracking
        this.frameCount++;
        this.lastFpsUpdate += elapsed;
        if (this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            // 🌊 UPDATE GAME STATE FPS
            if (this.state && this.state.updateFPS) {
                this.state.updateFPS(this.fps);
            }
            this.frameCount = 0;
            this.lastFpsUpdate = 0;
        }

        // Periodic resource cleanup
        const now = Date.now();
        if (now - this.lastResourceCleanup > this.resourceCleanupInterval) {
            this.cleanupResources();
            this.lastResourceCleanup = now;
        }
    }

    adjustPerformanceMode() {
        // Defer to centralized performance manager if present
        // [R] We are using PerformanceManager now, but GameEngine still drives FPS monitoring

        const manualOverride = this.performanceManager?._manualPerformanceOverride;
        if (manualOverride === 'on') {
            if (!this.performanceMode) {
                this.enablePerformanceMode();
            }
            return;
        }
        if (manualOverride === 'off') {
            if (this.performanceMode) {
                this.disablePerformanceMode();
            }
            return;
        }
        // Simple FPS-based performance adjustment
        if (this.fps < 30 && !this.performanceMode) {
            this.enablePerformanceMode();
        } else if (this.fps > 55 && this.performanceMode) {
            this.disablePerformanceMode();
        }
        // adjustPerformanceMode method removed as its logic is now fully handled by PerformanceManager

    }

    setPerformancePreference(level) {
        const normalized = (level === 'critical' || level === 'low') ? level : 'normal';

        if (this.performanceManager) {
            if (normalized === 'normal') {
                this.performanceManager.setPerformanceOverride('off');
            } else {
                this.performanceManager.setPerformanceOverride('on');
                // Critical mode handling if needed
                if (normalized === 'critical' && !this.performanceManager._autoLowQualityCosmic) {
                    // We might want to expose a way to force critical mode in PerformanceManager
                    // For now, 'on' is sufficient
                }
            }
        } else {
            if (normalized === 'normal') {
                this.disablePerformanceMode();
            } else {
                this.enablePerformanceMode();
            }
        }
    }

    togglePerformanceMode() {
        if (this.performanceManager) {
            const current = this.performanceManager._manualPerformanceOverride;
            this.performanceManager.setPerformanceOverride(current === 'on' ? 'off' : 'on');
        } else if (this.performanceMode) {
            this.disablePerformanceMode();
        } else {
            this.enablePerformanceMode();
        }
    }

    enablePerformanceMode() {
        if (this.performanceMode) return;

        if (this.performanceManager) {
            this.performanceManager.performanceMode = true;
            if (!this.performanceManager._autoLowQualityCosmic) {
                this.performanceManager.lowGpuMode = true;
            }
            this.performanceManager.updateQualitySettings();
        }
        if (!this.performanceManager) {
            this._performanceModeFallback = true;
            this._lowGpuModeFallback = true;
            this._lowPerformanceModeFallback = true;
        }

        // Apply low-end CSS class when enabling performance mode
        if (document?.documentElement?.classList?.add) {
            document.documentElement.classList.add('low-end-device');
        }

        this._maxSpatialGridPoolSize = 128;
        // Optimize rendering
        if (this.ctx) {
            if (typeof this._previousImageSmoothingEnabled !== 'boolean') {
                this._previousImageSmoothingEnabled = this.ctx.imageSmoothingEnabled;
            }
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.globalCompositeOperation = 'source-over';
        }
        // Performance mode enabled
    }

    disablePerformanceMode() {
        if (!this.performanceMode) return;

        if (this.performanceManager) {
            this.performanceManager.performanceMode = false;
            if (!this.performanceManager._autoLowQualityCosmic) {
                this.performanceManager.lowGpuMode = false;
                if (document?.documentElement?.classList?.remove) {
                    document.documentElement.classList.remove('low-end-device');
                }
            }
            this.performanceManager.updateQualitySettings();
        } else {
            this._performanceModeFallback = false;
            this._lowGpuModeFallback = false;
            this._lowPerformanceModeFallback = false;
            if (document?.documentElement?.classList?.remove) {
                document.documentElement.classList.remove('low-end-device');
            }
        }

        this._maxSpatialGridPoolSize = 256;
        // Restore rendering quality
        if (this.ctx) {
            const previous = this._previousImageSmoothingEnabled;
            this.ctx.imageSmoothingEnabled = (typeof previous === 'boolean') ? previous : false;
            delete this._previousImageSmoothingEnabled;
        }
        // Performance mode disabled
    }

    updateSpatialGrid() {
        if (!this.spatialGrid) {
            this.spatialGrid = new Map();
        }

        const grid = this.spatialGrid;
        const cellPool = this._spatialGridCellPool;

        // Move existing cell arrays into a reusable pool
        for (const [, entities] of grid) {
            entities.length = 0;
            cellPool.push(entities);
        }
        grid.clear();

        // Helper function to add entity to grid
        const addEntityToGrid = (entity) => {
            if (!entity || entity.isDead || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
                return;
            }

            // [OPTIMIZATION] Use PerformanceCache for grid coordinate calculations
            const gridX = window.perfCache
                ? window.perfCache.gridCoord(entity.x, this.gridSize)
                : Math.floor(entity.x / this.gridSize);
            const gridY = window.perfCache
                ? window.perfCache.gridCoord(entity.y, this.gridSize)
                : Math.floor(entity.y / this.gridSize);
            const key = this._encodeGridKey(gridX, gridY);

            let cellEntities = grid.get(key);
            if (!cellEntities) {
                cellEntities = cellPool.pop() || [];
                grid.set(key, cellEntities);
            }
            cellEntities.push(entity);
        };

        // CRITICAL: Add player to spatial grid for collision detection
        // Player is stored separately from this.entities, so we must add it explicitly
        if (this.player) {
            addEntityToGrid(this.player);
        }

        // Add entities to grid with bounds checking
        for (const entity of this.entities) {
            addEntityToGrid(entity);
        }

        // Keep the pool from growing without bound
        const activeCells = grid.size;
        const desiredPoolSize = Math.max(
            32,
            Math.min(this._maxSpatialGridPoolSize, Math.ceil(activeCells * 1.5))
        );
        if (cellPool.length > desiredPoolSize) {
            cellPool.length = desiredPoolSize;
        }
    }

    checkCollisions() {
        // Use spatial grid for collision checks
        for (const [key, entities] of this.spatialGrid) {
            // Check collisions within the same grid cell
            this.checkCollisionsInCell(entities);

            // Check collisions with adjacent cells
            const [gridX, gridY] = this._decodeGridKey(key);
            this.checkAdjacentCellCollisions(gridX, gridY, entities);
        }
    }

    checkCollisionsInCell(entities) {
        // Early return if not enough entities to collide
        if (entities.length < 2) return;

        for (let i = 0; i < entities.length; i++) {
            const entity1 = entities[i];
            // Skip invalid or dead entities
            if (!entity1 || entity1.isDead) continue;

            for (let j = i + 1; j < entities.length; j++) {
                const entity2 = entities[j];
                // Skip invalid or dead entities
                if (!entity2 || entity2.isDead) continue;

                if (!this._canFallbackCollide(entity1, entity2)) {
                    continue;
                }

                // Quick distance check before expensive collision test
                const dx = entity1.x - entity2.x;
                const dy = entity1.y - entity2.y;
                const maxRadius = (entity1.radius || 0) + (entity2.radius || 0);

                // Use squared distance to avoid sqrt
                if (dx * dx + dy * dy < maxRadius * maxRadius) {
                    if (this.isColliding(entity1, entity2)) {
                        this.handleCollision(entity1, entity2);
                    }
                }
            }
        }
    }

    checkAdjacentCellCollisions(gridX, gridY, entities) {
        const adjacentOffsets = [
            [1, 0], [0, 1], [1, 1], [-1, 1]
        ];

        for (const [dx, dy] of adjacentOffsets) {
            const adjacentKey = this._encodeGridKey(gridX + dx, gridY + dy);
            const adjacentEntities = this.spatialGrid.get(adjacentKey);

            if (adjacentEntities) {
                for (let i = 0; i < entities.length; i++) {
                    const entity = entities[i];
                    if (!entity || entity.isDead) continue;

                    for (let j = 0; j < adjacentEntities.length; j++) {
                        const adjacentEntity = adjacentEntities[j];
                        if (!adjacentEntity || adjacentEntity.isDead || adjacentEntity === entity) continue;

                        if (!this._canFallbackCollide(entity, adjacentEntity)) {
                            continue;
                        }

                        // [OPTIMIZATION] Use CollisionCache for fast collision detection
                        const dxPos = entity.x - adjacentEntity.x;
                        const dyPos = entity.y - adjacentEntity.y;
                        const distSq = dxPos * dxPos + dyPos * dyPos;

                        // Use cached radius sum to avoid repeated addition
                        const radiusSum = window.collisionCache
                            ? window.collisionCache.getRadiusSum(entity.radius || 0, adjacentEntity.radius || 0)
                            : (entity.radius || 0) + (adjacentEntity.radius || 0);
                        const radiusSumSq = radiusSum * radiusSum;

                        // Squared distance comparison - NO sqrt needed!
                        if (distSq < radiusSumSq) {
                            if (this.isColliding(entity, adjacentEntity)) {
                                this.handleCollision(entity, adjacentEntity);
                            }
                        }
                    }
                }
            }
        }
    }

    _canFallbackCollide(entity1, entity2) {
        const type1 = entity1?.type;
        const type2 = entity2?.type;
        if (!type1 || !type2 || type1 === type2) {
            if (type1 === 'enemy' && type2 === 'enemy') {
                return false;
            }
            if (type1 === 'projectile' && type2 === 'projectile') {
                return false;
            }
        }

        const rules = this._collisionFallbackRules;

        const set1 = rules[type1];
        if (set1 && set1.has(type2)) {
            return true;
        }

        const set2 = rules[type2];
        if (set2 && set2.has(type1)) {
            return true;
        }

        // Fallback: allow if either lacks type rules but objects are defined
        return !set1 && !set2;
    }
    handleCollision(entity1, entity2) {
        // Comprehensive validation to prevent invalid collisions
        if (!entity1 || !entity2 || entity1.isDead || entity2.isDead || entity1 === entity2) {
            return;
        }

        // Additional ID check only if both entities have IDs and they match
        if (entity1.id && entity2.id && entity1.id === entity2.id) {
            return;
        }

        const type1 = entity1.type;
        const type2 = entity2.type;

        try {
            if ((type1 === 'player' && type2 === 'xpOrb') || (type1 === 'xpOrb' && type2 === 'player')) {
                this._handlePlayerXpOrbCollision(
                    type1 === 'player' ? entity1 : entity2,
                    type1 === 'xpOrb' ? entity1 : entity2
                );
            } else if ((type1 === 'player' && type2 === 'enemy') || (type1 === 'enemy' && type2 === 'player')) {
                this._handlePlayerEnemyCollision(
                    type1 === 'player' ? entity1 : entity2,
                    type1 === 'enemy' ? entity1 : entity2
                );
            } else if ((type1 === 'projectile' && type2 === 'enemy') || (type1 === 'enemy' && type2 === 'projectile')) {
                this._handleProjectileEnemyCollision(
                    type1 === 'projectile' ? entity1 : entity2,
                    type1 === 'enemy' ? entity1 : entity2
                );
            } else if ((type1 === 'enemyProjectile' && type2 === 'player') || (type1 === 'player' && type2 === 'enemyProjectile')) {
                this._handleEnemyProjectilePlayerCollision(
                    type1 === 'enemyProjectile' ? entity1 : entity2,
                    type1 === 'player' ? entity1 : entity2
                );
            }
        } catch (error) {
            window.logger.error('Error handling collision:', error, 'Entity1:', entity1?.type, 'Entity2:', entity2?.type);
        }
    }

    _handlePlayerXpOrbCollision(player, xpOrb) {
        if (typeof player.addXP === 'function' && typeof xpOrb.value === 'number') {
            player.addXP(xpOrb.value);
            if (typeof xpOrb.createCollectionEffect === 'function') {
                try { xpOrb.createCollectionEffect(); } catch (e) { window.logger.error('Error creating collection effect', e); }
            }
            if ('collected' in xpOrb) xpOrb.collected = true;
            xpOrb.isDead = true;
        }
    }

    _handlePlayerEnemyCollision(player, enemy) {
        // Check both player invulnerability AND enemy's contact cooldown
        // This allows multiple enemies to hit rapidly while preventing spam from single enemy
        if (player.isInvulnerable) return;
        if (enemy.collisionCooldown > 0) return;
        
        if (typeof player.takeDamage === 'function' && typeof enemy.damage === 'number') {
            player.takeDamage(enemy.damage);
            
            // Set per-enemy contact cooldown (0.5 seconds)
            // This prevents THIS enemy from hitting again immediately
            // but other enemies can still deal damage
            enemy.collisionCooldown = 0.5;
            
            if (window.gameManager) {
                window.gameManager.createHitEffect(player.x, player.y, enemy.damage);
            }
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('hit', 0.2);
            }
        }
    }

    _handleProjectileEnemyCollision(projectile, enemy) {
        if (window.logger?.isDebugEnabled?.('projectiles')) {
            window.logger.log(`[GameEngine] _handleProjectileEnemyCollision: Projectile ${projectile.id} hitting enemy ${enemy.id}. Projectile piercing: ${projectile.piercing}`);
        }

        if (enemy.isDead || (projectile.hitEnemies && projectile.hitEnemies.has(enemy.id))) {
            if (window.logger?.isDebugEnabled?.('projectiles')) {
                window.logger.log(`[GameEngine] Collision skipped - enemy dead: ${enemy.isDead}, already hit: ${projectile.hitEnemies && projectile.hitEnemies.has(enemy.id)}`);
            }
            return;
        }

        let hitSuccessful = typeof projectile.hit === 'function' ? projectile.hit(enemy) : true;
        if (!hitSuccessful) return;

        // Track successful projectile hit
        window.gameManager?.statsManager?.trackProjectileHit?.();

        if (typeof enemy.takeDamage === 'function' && typeof projectile.damage === 'number') {
            const wasCritical = !!(projectile.isCrit);
            const preHealth = typeof enemy.health === 'number' ? enemy.health : null;

            enemy.takeDamage(projectile.damage);

            const currentHealth = typeof enemy.health === 'number' ? enemy.health : preHealth;
            const wasKilled = enemy.isDead || (typeof currentHealth === 'number' && currentHealth <= 0);
            const actualDamage = preHealth !== null && currentHealth !== null
                ? Math.max(0, preHealth - currentHealth)
                : projectile.damage;
            if (window.gameManager) window.gameManager.createHitEffect(enemy.x, enemy.y, actualDamage ?? projectile.damage);
            if (window.audioSystem?.play) window.audioSystem.play('hit', 0.2);
        }

        // Don't add to hitEnemies here - the projectile.hit() method already handles this for piercing projectiles

        // Trigger chain lightning if projectile has this ability
        // [BEHAVIOR] Check behavior manager for chain capability
        if (projectile.behaviorManager && projectile.behaviorManager.hasBehavior('chain') &&
            typeof projectile.triggerChain === 'function') {
            projectile.triggerChain(this, enemy);
        }

        if (this.player && projectile.lifesteal) {
            const healAmount = projectile.damage * projectile.lifesteal;
            this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
            window.gameManager?.showFloatingText?.(`+${Math.round(healAmount)}`, this.player.x, this.player.y - 30, '#2ecc71', 14);
            // Track lifesteal healing for achievements
            if (window.achievementSystem) window.achievementSystem.onLifestealHeal(healAmount);
        }

        // Align projectile termination with CollisionSystem behavior
        let projectileShouldDie = true;
        let piercingExhausted = false;

        // Handle piercing - projectile continues if it still has piercing charges
        if (typeof projectile.piercing === 'number' && projectile.piercing >= 0) {
            if (window.logger?.isDebugEnabled?.('projectiles')) {
                window.logger.log(`[Collision] Projectile ${projectile.id} piercing hit. Piercing: ${projectile.piercing} -> ${projectile.piercing - 1}`);
            }
            projectile.piercing--;
            
            // Check if piercing is now exhausted (went negative)
            if (projectile.piercing < 0) {
                piercingExhausted = true;
                projectileShouldDie = true; // Now it should die unless ricochet saves it
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.log(`[Collision] Projectile ${projectile.id} piercing exhausted, should die unless ricochet saves it`);
                }
            } else {
                projectileShouldDie = false; // Projectile continues after piercing hit
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.log(`[Collision] Projectile ${projectile.id} still has piercing charges: ${projectile.piercing}`);
                }
            }
        }

        // Check for ricochet only when projectile would normally die
        // This allows ricochet to work after piercing is exhausted OR for non-piercing projectiles
        if (projectileShouldDie && projectile.behaviorManager && projectile.behaviorManager.hasBehavior('ricochet')) {
            if (window.logger?.isDebugEnabled?.('projectiles')) {
                window.logger.log(`[Collision] Projectile ${projectile.id} attempting ricochet. hasRicochet: ${projectile.behaviorManager.hasBehavior('ricochet')}`);
            }
            if (projectile.type === 'projectile') {
                try {
                    const ok = Projectile.prototype.ricochet.call(projectile, this);
                    if (ok) {
                        projectileShouldDie = false; // Ricochet successful, projectile continues
                        if (window.logger?.isDebugEnabled?.('projectiles')) {
                            window.logger.log(`[Collision] Projectile ${projectile.id} ricochet successful!`);
                        }
                        // Reset piercing if projectile ricocheted (balanced gameplay choice)
                        if (piercingExhausted && projectile.originalPiercing > 0) {
                            projectile.piercing = Math.max(0, Math.floor(projectile.originalPiercing / 2));
                            if (window.logger?.isDebugEnabled?.('projectiles')) {
                                window.logger.log(`[Collision] Projectile ${projectile.id} piercing restored: ${projectile.piercing}`);
                            }
                        }
                    } else {
                        if (window.logger?.isDebugEnabled?.('projectiles')) {
                            window.logger.log(`[Collision] Projectile ${projectile.id} ricochet failed`);
                        }
                    }
                } catch (e) {
                    if (window.logger?.isDebugEnabled?.('projectiles')) {
                        window.logger.log(`[Collision] Projectile ${projectile.id} ricochet error:`, e);
                    }
                }
            }
        }
        // Trigger explosion if projectile should die or has exhausted piercing
        if (projectile.behaviorManager && projectile.behaviorManager.hasBehavior('explosive') &&
            (projectileShouldDie || (typeof projectile.piercing === 'number' && projectile.piercing < 0)) &&
            typeof projectile.explode === 'function') {
            projectile.explode(this);
            projectileShouldDie = true;
        }
        if (projectileShouldDie) projectile.isDead = true;
    }

    _handleEnemyProjectilePlayerCollision(enemyProjectile, player) {
        if (!player.isInvulnerable && typeof player.takeDamage === 'function' && typeof enemyProjectile.damage === 'number') {
            player.takeDamage(enemyProjectile.damage);
            enemyProjectile.isDead = true;
        }
    }

    render() {
        // Check for context loss before rendering
        if (this.contextLost || !this.ctx || !this.canvas) {
            if (window.debugManager?.debugMode) {
                window.logger.warn('Canvas context unavailable, skipping render');
            }
            return;
        }

        try {
            // Double buffer protection - ensure we have valid canvas state
            if (!this.canvas.width || !this.canvas.height ||
                this.canvas.width <= 0 || this.canvas.height <= 0) {
                return;
            }

            // Validate context state before clearing
            if (this.ctx.isContextLost && this.ctx.isContextLost()) {
                this.handleContextLoss(new Event('webglcontextlost'));
                return;
            }

            // [C] Render cosmic background (replaces canvas clear)
            if (this.cosmicBackground && typeof this.cosmicBackground.render === 'function') {
                if (window.performanceProfiler?.enabled) window.performanceProfiler.start('cosmicBgRender');
                this.cosmicBackground.render(this.player);
                if (window.performanceProfiler?.enabled) window.performanceProfiler.end('cosmicBgRender', 'cosmicBackground');
            } else {
                const ctx = this.ctx;
                const previousFill = ctx.fillStyle;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.fillStyle = '#0a0a1f';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.fillStyle = previousFill;
            }

            // Set camera with optimized transform
            this.ctx.save();
            if (this.player) {
                const cameraX = -this.player.x + this.canvas.width / 2;
                const cameraY = -this.player.y + this.canvas.height / 2;

                // Apply screen shake from effectsManager if available
                let shakeX = 0, shakeY = 0;
                if (window.gameManager?.effectsManager) {
                    const shakeOffset = window.gameManager.effectsManager.getScreenShakeOffset();
                    shakeX = shakeOffset.x;
                    shakeY = shakeOffset.y;
                }

                this.ctx.translate(cameraX + shakeX, cameraY + shakeY);
            }

            // Use frustum culling to only render visible entities
            const visibleEntities = this.getVisibleEntities();

            // Batch render by entity type for better performance
            this.renderEntities(visibleEntities);
            // Ensure player is drawn last on top as a safety net
            if (this.player && typeof this.player.render === 'function') {
                try { this.player.render(this.ctx); } catch (e) { window.logger.error('Player render error', e); }
            }

            // Render UI elements using unified system (replaces buggy floating text)
            if (this.unifiedUI) {
                this.unifiedUI.render();
            } else if (window.floatingTextSystem && typeof window.floatingTextSystem.render === 'function') {
                window.floatingTextSystem.render(this.ctx);
            }

            // Render formation visual markers (Polybius feature - optional wireframe guides)
            if (this.formationManager && typeof this.formationManager.render === 'function') {
                this.formationManager.render(this.ctx);
            }

            // Render emergent constellation markers (Polybius: organic clustering debug)
            if (this.emergentDetector && typeof this.emergentDetector.render === 'function') {
                this.emergentDetector.render(this.ctx);
            }

            // Render particles on top of entities (trail effects, explosions, etc.)
            if (window.optimizedParticles && typeof window.optimizedParticles.render === 'function') {
                window.optimizedParticles.render(this.ctx);
            } else if (window.gameManager && typeof window.gameManager.renderParticles === 'function') {
                window.gameManager.renderParticles(this.ctx);
            }

            // Render effects manager (includes lightning arcs and other visual effects)
            if (window.gameManager?.effectsManager && typeof window.gameManager.effectsManager.render === 'function') {
                window.gameManager.effectsManager.render(this.ctx);
            }

            // Render debug information if enabled
            if (this.debugMode) {
                this.renderDebugInfo();
            }

            this.ctx.restore();

        } catch (error) {
            window.logger.error('Render error:', error);
            // Try to recover context if possible
            if (!this.ctx || this.contextLost) {
                this.handleContextLoss(new Event('webglcontextlost'));
            }
        }
    }

    // Render batching to reduce per-frame draw overhead for common entity types
    renderEntities(entities) {
        if (!entities || entities.length === 0) return;

        const ctx = this.ctx;
        const PERF = GAME_CONSTANTS.PERFORMANCE;

        // Ensure batch arrays are at full capacity before filling
        // This handles cases where they were truncated in a previous frame
        if (this._projectileBatch.length < PERF.PROJECTILE_BATCH_SIZE) {
            this._projectileBatch.length = PERF.PROJECTILE_BATCH_SIZE;
        }
        if (this._enemyBatch.length < PERF.ENEMY_BATCH_SIZE) {
            this._enemyBatch.length = PERF.ENEMY_BATCH_SIZE;
        }
        if (this._enemyProjectileBatch.length < PERF.ENEMY_PROJECTILE_BATCH_SIZE) {
            this._enemyProjectileBatch.length = PERF.ENEMY_PROJECTILE_BATCH_SIZE;
        }
        if (this._xpOrbBatch.length < PERF.XP_ORB_BATCH_SIZE) {
            this._xpOrbBatch.length = PERF.XP_ORB_BATCH_SIZE;
        }
        if (this._fallbackBatch.length < PERF.FALLBACK_BATCH_SIZE) {
            this._fallbackBatch.length = PERF.FALLBACK_BATCH_SIZE;
        }

        // Use pre-allocated arrays with index-based writes (eliminates 240 allocations/sec at 60fps)
        let projectileCount = 0;
        let enemyCount = 0;
        let enemyProjectileCount = 0;
        let xpOrbCount = 0;
        let fallbackCount = 0;

        const projectileRenderer = (typeof ProjectileRenderer !== 'undefined')
            ? ProjectileRenderer
            : (typeof window !== 'undefined' ? window.Game?.ProjectileRenderer : undefined);
        const enemyRenderer = (typeof EnemyRenderer !== 'undefined')
            ? EnemyRenderer
            : (typeof window !== 'undefined' ? window.Game?.EnemyRenderer : undefined);
        const enemyProjectileClass = (typeof EnemyProjectile !== 'undefined')
            ? EnemyProjectile
            : (typeof window !== 'undefined' ? window.Game?.EnemyProjectile : undefined);
        const xpOrbClass = (typeof XPOrb !== 'undefined')
            ? XPOrb
            : (typeof window !== 'undefined' ? window.Game?.XPOrb : undefined);

        // Get batch sizes for bounds checking (PERF already declared at top of function)
        const maxProjectiles = PERF.PROJECTILE_BATCH_SIZE;
        const maxEnemies = PERF.ENEMY_BATCH_SIZE;
        const maxEnemyProjectiles = PERF.ENEMY_PROJECTILE_BATCH_SIZE;
        const maxXpOrbs = PERF.XP_ORB_BATCH_SIZE;
        const maxFallback = PERF.FALLBACK_BATCH_SIZE;

        // Single pass to categorize entities (optimized for loop with index writes)
        // Bounds checking prevents array overflow when entity counts exceed batch size
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity || entity.isDead || typeof entity.render !== 'function' || entity === this.player) {
                continue;
            }

            switch (entity.type) {
                case 'projectile':
                    if (projectileCount < maxProjectiles) {
                        this._projectileBatch[projectileCount++] = entity;
                    }
                    break;
                case 'enemy':
                    if (enemyCount < maxEnemies) {
                        this._enemyBatch[enemyCount++] = entity;
                    }
                    break;
                case 'enemyProjectile':
                    if (enemyProjectileCount < maxEnemyProjectiles) {
                        this._enemyProjectileBatch[enemyProjectileCount++] = entity;
                    }
                    break;
                case 'xpOrb':
                    if (xpOrbCount < maxXpOrbs) {
                        this._xpOrbBatch[xpOrbCount++] = entity;
                    }
                    break;
                default:
                    if (fallbackCount < maxFallback) {
                        this._fallbackBatch[fallbackCount++] = entity;
                    }
            }
        }

        // Truncate arrays to actual count (no reallocation, just size adjustment)
        this._projectileBatch.length = projectileCount;
        this._enemyBatch.length = enemyCount;
        this._enemyProjectileBatch.length = enemyProjectileCount;
        this._xpOrbBatch.length = xpOrbCount;
        this._fallbackBatch.length = fallbackCount;

        if (projectileCount) {
            if (projectileRenderer && typeof projectileRenderer.renderBatch === 'function') {
                try {
                    projectileRenderer.renderBatch(this._projectileBatch, ctx);
                } catch (error) {
                    this._renderEntitiesIndividually(this._projectileBatch, error);
                }
            } else {
                this._renderEntitiesIndividually(this._projectileBatch);
            }
        }

        if (enemyCount) {
            if (enemyRenderer && typeof enemyRenderer.renderBatch === 'function') {
                try {
                    enemyRenderer.renderBatch(this._enemyBatch, ctx);
                } catch (error) {
                    this._renderEntitiesIndividually(this._enemyBatch, error);
                }
            } else {
                this._renderEntitiesIndividually(this._enemyBatch);
            }
        }

        if (enemyProjectileCount) {
            if (enemyProjectileClass && typeof enemyProjectileClass.renderBatch === 'function') {
                try {
                    enemyProjectileClass.renderBatch(this._enemyProjectileBatch, ctx);
                } catch (error) {
                    this._renderEntitiesIndividually(this._enemyProjectileBatch, error);
                }
            } else {
                this._renderEntitiesIndividually(this._enemyProjectileBatch);
            }
        }

        if (xpOrbCount) {
            if (xpOrbClass && typeof xpOrbClass.renderBatch === 'function') {
                try {
                    xpOrbClass.renderBatch(this._xpOrbBatch, ctx);
                } catch (error) {
                    this._renderEntitiesIndividually(this._xpOrbBatch, error);
                }
            } else {
                this._renderEntitiesIndividually(this._xpOrbBatch);
            }
        }

        if (fallbackCount) {
            this._renderEntitiesIndividually(this._fallbackBatch);
        }
    }

    _renderEntitiesIndividually(entities, batchError = null) {
        if (batchError && typeof window !== 'undefined' && window.debugManager?.debugMode) {
            window.logger.warn('Render batch failed, falling back to per-entity rendering:', batchError);
        }

        const ctx = this.ctx;
        for (const entity of entities) {
            if (!entity || entity.isDead || typeof entity.render !== 'function') continue;
            try {
                entity.render(ctx);
            } catch (error) {
                if (typeof window !== 'undefined' && window.debugManager?.debugMode) {
                    window.logger.error(`Render error for ${entity.constructor?.name || 'entity'}:`, error);
                }
            }
        }
    }

    renderDebugInfo() {
        this.ctx.save();
        this.ctx.translate(-this.player.x + this.canvas.width / 2, -this.player.y + this.canvas.height / 2);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        const startX = Math.floor((this.player.x - this.canvas.width) / this.gridSize) * this.gridSize;
        const startY = Math.floor((this.player.y - this.canvas.height) / this.gridSize) * this.gridSize;
        const endX = Math.ceil((this.player.x + this.canvas.width) / this.gridSize) * this.gridSize;
        const endY = Math.ceil((this.player.y + this.canvas.height) / this.gridSize) * this.gridSize;

        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }

        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }

        // Draw FPS counter
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        this.ctx.fillText(`Entities: ${this.entities.length}`, 10, 40);
        this.ctx.fillText(`Performance Mode: ${this.performanceMode}`, 10, 60);

        this.ctx.restore();
    }
    isColliding(entity1, entity2) {
        // Validate entities have required properties
        if (!entity1 || !entity2 ||
            typeof entity1.x !== 'number' || typeof entity1.y !== 'number' ||
            typeof entity2.x !== 'number' || typeof entity2.y !== 'number' ||
            typeof entity1.radius !== 'number' || typeof entity2.radius !== 'number') {
            return false;
        }

        // Use squared distance to avoid costly sqrt per collision check
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        const r = entity1.radius + entity2.radius;

        // Ensure radius sum is positive to avoid division issues
        if (r <= 0) return false;

        return (dx * dx + dy * dy) < (r * r);
    }

    cleanupEntities(force = false) {
        if (!force) {
            if (this._cleanupTimer < this._cleanupInterval && !this._needsCleanup) {
                return;
            }
        }

        this._cleanupTimer = 0;
        this._needsCleanup = false;

        if (this.entityManager) {
            this._cleanupEntitiesWithManager();
        } else {
            this._legacyCleanupEntities();
        }
    }

    _cleanupEntitiesWithManager() {
        const handleRemoval = (entity) => {
            if (!entity) return;

            if (entity.type === 'enemyProjectile') {
                this._releaseEnemyProjectile(entity);
            }

            // NEVER remove the player entity reference here
            // Player death is handled by GameManagerBridge.onGameOver()
            // Removing player here causes race condition where checkGameConditions can't detect death
            // if (entity.type === 'player' && this.player === entity) {
            //     this.player = null;
            // }
        };

        // Don't cull the player entity even if dead - let game manager handle it
        const shouldCull = (entity) => {
            if (!entity || typeof entity !== 'object') return true;
            if (entity.type === 'player') return false; // Never auto-remove player
            return entity.isDead;
        };

        this.entityManager.prune(shouldCull, handleRemoval);

        const maxEntities = 2000;
        const currentCount = this.entities.length;
        if (currentCount > maxEntities) {
            const initialExcess = currentCount - maxEntities;
            let toRemove = initialExcess;
            for (let i = this.entities.length - 1; i >= 0 && toRemove > 0; i--) {
                const entity = this.entities[i];
                if (!entity || entity.type === 'player' || entity.isDead) continue;
                entity.isDead = true;
                toRemove--;
            }

            if (toRemove !== initialExcess) {
                this.entityManager.prune(shouldCull, handleRemoval);
            }
        }
    }

    _legacyCleanupEntities() {
        const maxEntities = 2000;
        let needsTrim;

        do {
            needsTrim = false;

            // Batch cleanup with reduced array operations
            let entityIndex = 0;
            let enemyIndex = 0;
            let xpOrbIndex = 0;
            let projectileIndex = 0;
            let enemyProjectileIndex = 0;

            // Clean main entities array using write-back approach for better performance
            for (let i = 0; i < this.entities.length; i++) {
                const entity = this.entities[i];
                // NEVER remove player entity here - causes race condition with death detection
                const isPlayer = entity && entity.type === 'player';
                const shouldKeep = entity && (!entity.isDead || isPlayer) && typeof entity === 'object';

                if (shouldKeep) {
                    if (entityIndex !== i) {
                        this.entities[entityIndex] = entity;
                    }
                    entityIndex++;
                }
                // Dead projectiles are just garbage collected - no pooling needed
            }
            this.entities.length = entityIndex;

            // Clean enemies array
            for (let i = 0; i < this.enemies.length; i++) {
                const enemy = this.enemies[i];
                if (enemy && !enemy.isDead && typeof enemy === 'object') {
                    if (enemyIndex !== i) {
                        this.enemies[enemyIndex] = enemy;
                    }
                    enemyIndex++;
                }
            }
            this.enemies.length = enemyIndex;

            // Clean XP orbs array
            for (let i = 0; i < this.xpOrbs.length; i++) {
                const orb = this.xpOrbs[i];
                if (orb && !orb.isDead && typeof orb === 'object') {
                    if (xpOrbIndex !== i) {
                        this.xpOrbs[xpOrbIndex] = orb;
                    }
                    xpOrbIndex++;
                }
            }
            this.xpOrbs.length = xpOrbIndex;

            // Clean projectiles array
            for (let i = 0; i < this.projectiles.length; i++) {
                const p = this.projectiles[i];
                if (p && !p.isDead && typeof p === 'object') {
                    if (projectileIndex !== i) {
                        this.projectiles[projectileIndex] = p;
                    }
                    projectileIndex++;
                }
                // Dead projectiles are just garbage collected - no pooling needed
            }
            this.projectiles.length = projectileIndex;

            // Clean enemy projectiles array
            if (this.enemyProjectiles && Array.isArray(this.enemyProjectiles)) {
                for (let i = 0; i < this.enemyProjectiles.length; i++) {
                    const ep = this.enemyProjectiles[i];
                    if (ep && !ep.isDead && typeof ep === 'object') {
                        if (enemyProjectileIndex !== i) {
                            this.enemyProjectiles[enemyProjectileIndex] = ep;
                        }
                        enemyProjectileIndex++;
                    } else if (ep && ep.isDead && ep.type === 'enemyProjectile') {
                        // Release dead enemy projectiles back to pool
                        this._releaseEnemyProjectile(ep);
                    }
                }
                this.enemyProjectiles.length = enemyProjectileIndex;
            }

            if (this.entities.length > maxEntities) {
                let toRemove = this.entities.length - maxEntities;
                for (let i = this.entities.length - 1; i >= 0 && toRemove > 0; i--) {
                    const entity = this.entities[i];
                    if (!entity || entity.type === 'player' || entity.isDead) continue;
                    entity.isDead = true;
                    toRemove--;
                }
                if (toRemove < this.entities.length - maxEntities) {
                    needsTrim = true;
                }
            }
        } while (needsTrim);
    }

    // Simplified projectile spawning with ProjectileFactory integration
    // ⚠️ CRITICAL: Must use ProjectileFactory to attach behaviors (burn, chain, etc.)
    // See docs/CRITICAL_BUG_PROJECTILE_FACTORY_BYPASS.md for historical context
    spawnProjectile(x, y, vxOrConfig, vyOrOwnerId, damage, piercing = 0, isCrit = false, specialType = null) {
        // Support new signature: (x, y, config, ownerId)
        let config;
        let ownerId = 'player';

        if (typeof vxOrConfig === 'object' && vxOrConfig !== null) {
            config = vxOrConfig;
            ownerId = vyOrOwnerId || 'player';
        } else {
            // Legacy signature support
            const vx = vxOrConfig;
            const vy = vyOrOwnerId;

            // Enhanced validation for legacy calls
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy) || damage <= 0) {
                window.logger.warn('Invalid projectile parameters:', { x, y, vx, vy, damage });
                return null;
            }

            const speed = Math.sqrt(vx * vx + vy * vy);
            config = {
                vx, vy, damage, piercing, isCrit, specialType,
                speed,
                range: 1000
            };
        }

        // Ensure reasonable velocity limits
        const speed = config.speed || Math.sqrt(config.vx * config.vx + config.vy * config.vy);
        if (speed < 10 || speed > 2000) {
            // window.logger.warn('Projectile speed out of reasonable range:', speed);
        }

        try {
            // ✅ CRITICAL FIX: Use ProjectileFactory to create projectiles with behaviors!
            // Previously used direct instantiation which bypassed ALL behavior attachment
            // This caused burn, chain lightning, homing, ricochet, etc. to never work
            const ProjectileFactory = window.Game?.ProjectileFactory || window.ProjectileFactory;

            let proj;
            if (ProjectileFactory && typeof ProjectileFactory.create === 'function') {
                // Use factory to create projectile WITH behaviors (burn, chain, etc.)
                proj = ProjectileFactory.create(x, y, config, this.player, ownerId);
            } else {
                // Fallback to direct creation if factory not available  
                if (window.projectilePool) {
                    proj = window.projectilePool.acquire(x, y, config, ownerId);
                } else if (typeof Projectile === 'function') {
                    proj = new Projectile(x, y, config, ownerId);
                } else {
                    proj = this._createFallbackProjectile(x, y, config);
                }
                window.logger.warn('[GameEngine] ⚠️ ProjectileFactory not available - behaviors will NOT be attached!');
            }

            // Debug logging
            if (window.logger?.isDebugEnabled?.('projectiles') && (config.piercing > 0 || proj.piercing > 0)) {
                window.logger.log(`[GameEngine] Projectile ${proj.id} spawned: piercing=${proj.piercing}`);
            }

            this.addEntity(proj);
            return proj;
        } catch (error) {
            window.logger.error('Error spawning projectile:', error);
            return null;
        }
    }

    spawnEnemyProjectile(x, y, vx, vy, damage) {
        // Validate parameters
        if (typeof x !== 'number' || typeof y !== 'number' ||
            typeof vx !== 'number' || typeof vy !== 'number' ||
            typeof damage !== 'number' || damage <= 0) {
            if (window.debugManager?.debugMode) {
                window.logger.warn('Invalid enemy projectile parameters:', { x, y, vx, vy, damage });
            }
            return null;
        }

        // Check for NaN values
        if (isNaN(x) || isNaN(y) || isNaN(vx) || isNaN(vy) || isNaN(damage)) {
            if (window.debugManager?.debugMode) {
                window.logger.warn('NaN detected in enemy projectile parameters:', { x, y, vx, vy, damage });
            }
            return null;
        }

        // Initialize enemy projectile pool if it doesn't exist
        if (!this.enemyProjectilePool) {
            this.enemyProjectilePool = [];
        }

        let ep = this.enemyProjectilePool.length > 0 ? this.enemyProjectilePool.pop() : null;

        if (!ep) {
            // Check if EnemyProjectile class is available
            const EnemyProjectile = window.Game?.EnemyProjectile;
            if (typeof EnemyProjectile !== 'function') {
                window.logger.error('EnemyProjectile class not available');
                return null;
            }
            try {
                ep = new EnemyProjectile(x, y, vx, vy, damage);
            } catch (error) {
                window.logger.error('Failed to create new EnemyProjectile:', error);
                return null;
            }
        } else {
            // Reset pooled enemy projectile safely
            try {
                ep.id = Math.random().toString(36).substr(2, 9); // New ID for pooled enemy projectile
                ep.x = x; ep.y = y; ep.vx = vx; ep.vy = vy;
                ep.damage = damage;
                ep.isDead = false;
                ep.timer = 0;
                ep.lifetime = 3;
                ep.radius = 5;
                ep.type = 'enemyProjectile';
                ep.color = '#9b59b6';
                ep.glowColor = 'rgba(155, 89, 182, 0.45)';
            } catch (error) {
                window.logger.error('Failed to reset pooled EnemyProjectile:', error);
                return null;
            }
        }

        if (ep) {
            this.addEntity(ep);
        }
        return ep;
    }

    _releaseEnemyProjectile(ep) {
        // Properly sanitize enemy projectile before pooling to prevent state corruption
        if (ep) {
            ep.isDead = true;
            ep.x = 0;
            ep.y = 0;
            ep.vx = 0;
            ep.vy = 0;
            ep.timer = 0;
            ep.damage = 0;
            ep.radius = 5;
            ep.color = '#9b59b6';
            ep.glowColor = 'rgba(155, 89, 182, 0.45)';
            // Clear any references that might prevent garbage collection
            if (ep.target) ep.target = null;
            if (ep.hitEnemies) ep.hitEnemies.clear();

            // Initialize pool if it doesn't exist
            if (!this.enemyProjectilePool) {
                this.enemyProjectilePool = [];
            }
            if (this.enemyProjectilePool.length < this.maxPoolSize) {
                this.enemyProjectilePool.push(ep);
            }
        }
    }

    /**
     * [OPTIMIZATION] Pre-allocate enemy projectile pool to reduce GC stutter
     * during initial enemy attacks. Creates projectiles upfront instead of
     * allocating them on-demand during gameplay.
     */
    _preallocateEnemyProjectilePool() {
        const EnemyProjectile = window.Game?.EnemyProjectile;
        if (typeof EnemyProjectile !== 'function') {
            // Class not loaded yet, will allocate on-demand
            return;
        }

        if (!this.enemyProjectilePool) {
            this.enemyProjectilePool = [];
        }

        // Pre-allocate 50 enemy projectiles (half of maxPoolSize)
        const preAllocCount = Math.min(50, this.maxPoolSize);
        for (let i = this.enemyProjectilePool.length; i < preAllocCount; i++) {
            try {
                const ep = new EnemyProjectile(0, 0, 0, 0, 0);
                ep.isDead = true; // Mark as available for reuse
                this.enemyProjectilePool.push(ep);
            } catch (error) {
                window.logger?.warn('Failed to pre-allocate enemy projectile:', error);
                break;
            }
        }
    }

    // Add error handling to addEntity
    addEntity(entity) {
        if (!entity) {
            window.logger.error('Attempted to add null/undefined entity!');
            return null;
        }

        // Validate entity has required properties
        if (typeof entity.x !== 'number' || typeof entity.y !== 'number') {
            window.logger.error('Entity missing required position properties:', entity);
            return null;
        }

        if (!entity.type || typeof entity.type !== 'string') {
            window.logger.error('Entity missing or invalid type property:', entity);
            return null;
        }

        // Assign unique ID before inserting so managers and fallbacks stay in sync
        if (!entity.id) {
            entity.id = `${entity.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }

        try {
            if (this.entityManager) {
                this.entityManager.addEntity(entity);
            } else {
                this.entities.push(entity);

                if (entity.type === 'enemy') {
                    this.enemies.push(entity);
                } else if (entity.type === 'xpOrb') {
                    this.xpOrbs.push(entity);
                } else if (entity.type === 'projectile') {
                    this.projectiles.push(entity);
                } else if (entity.type === 'enemyProjectile') {
                    if (!this.enemyProjectiles) {
                        this.enemyProjectiles = [];
                    }
                    this.enemyProjectiles.push(entity);
                }
            }

            if (entity.type === 'player') {
                if (this.player && this.player !== entity) {
                    window.logger.warn('Player already exists, replacing...');
                }
                this.setPlayer(entity);
            }

            this._needsCleanup = true;
            // Notify collision system that entities changed
            if (this.collisionSystem?.markGridDirty) {
                this.collisionSystem.markGridDirty();
            }
            return entity;
        } catch (error) {
            window.logger.error('Error adding entity:', error, entity);
            return null;
        }
    }

    // Add error handling to togglePause
    togglePause() {
        try {
            // Don't allow toggling pause when level-up menu is active
            if (window.upgradeSystem && window.upgradeSystem.isLevelUpActive()) {
                return;
            }

            if (this.isPaused) {
                this.resumeGame({ reason: 'manual' });
            } else {
                this.pauseGame({ reason: 'manual' });
            }
        } catch (error) {
            window.logger.error('Error toggling pause:', error);
        }
    }

    pauseGame(options = {}) {
        const { reason = 'manual' } = options;

        if (reason === 'manual') {
            this.manualPause = true;
        } else if (reason === 'auto') {
            this.autoPaused = true;
        }

        if (!this.isPaused) {
            this.isPaused = true;
        }

        const resultScreen = this._getDomRef('result-screen');
        const resultVisible = resultScreen && typeof resultScreen.classList?.contains === 'function'
            ? !resultScreen.classList.contains('hidden')
            : false;

        const shouldShowPauseMenu = reason === 'manual';

        // Only show pause menu if we're not in level-up mode or result screen
        if (shouldShowPauseMenu && !resultVisible && (!window.upgradeSystem || !window.upgradeSystem.isLevelUpActive())) {
            const pauseMenu = this._getDomRef('pause-menu');
            if (pauseMenu?.classList?.remove) pauseMenu.classList.remove('hidden');
        }

        // Suspend audio during pause
        if (window.audioSystem && window.audioSystem.audioContext && window.audioSystem.audioContext.state === 'running') {
            window.audioSystem.audioContext.suspend();
        }
    }

    resumeGame(options = {}) {
        const { reason = 'manual' } = options;

        if (reason === 'auto') {
            if (this.manualPause) {
                return;
            }
            this.autoPaused = false;
        } else if (reason === 'manual') {
            this.manualPause = false;
            this.autoPaused = false;
        }

        if (!this.isPaused) {
            return;
        }

        // Don't resume if level-up menu is active
        if (window.upgradeSystem && window.upgradeSystem.isLevelUpActive()) {
            return;
        }
        if (!this.canAutoResume()) {
            return;
        }

        this.isPaused = false;

        if (reason === 'manual') {
            // Hide pause menu
            const pauseMenu = this._getDomRef('pause-menu');
            if (pauseMenu?.classList?.add) pauseMenu.classList.add('hidden');
        }
        // Resume audio on unpause
        if (window.audioSystem) {
            window.audioSystem.resumeAudioContext();
        }
    }

    canAutoResume() {
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm) {
            if (gm.endScreenShown || gm.gameOver || gm.gameWon) {
                return false;
            }
        }

        const resultScreen = this._getDomRef('result-screen');
        if (resultScreen && typeof resultScreen.classList?.contains === 'function' && !resultScreen.classList.contains('hidden')) {
            return false;
        }

        return true;
    }

    _scheduleNextFrame() {
        if (!this.isRunning) {
            this._loopHandle = null;
            return;
        }

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            this._useSetTimeoutLoop = false;
            this._loopHandle = window.requestAnimationFrame(this._boundGameLoop);
        } else if (typeof requestAnimationFrame === 'function') {
            this._useSetTimeoutLoop = false;
            this._loopHandle = requestAnimationFrame(this._boundGameLoop);
        } else {
            this._useSetTimeoutLoop = true;
            this._loopHandle = setTimeout(this._boundGameLoop, 16);
        }
    }

    _cancelNextFrame() {
        if (this._loopHandle == null) {
            return;
        }

        if (this._useSetTimeoutLoop) {
            clearTimeout(this._loopHandle);
        } else if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(this._loopHandle);
        } else if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this._loopHandle);
        }

        this._loopHandle = null;
    }

    _createFallbackProjectile(x, y, config = {}) {
        return {
            id: `fallback_projectile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: 'projectile',
            x,
            y,
            vx: config.vx || 0,
            vy: config.vy || 0,
            damage: typeof config.damage === 'number' ? config.damage : 10,
            isCrit: !!config.isCrit,
            behaviorManager: {
                addBehavior() { },
                handleCollision() { return true; },
                hasBehavior() { return false; },
                update() { },
                onDestroy() { }
            },
            update() { },
            render() { },
            isDead: false,
            hitEnemies: new Set()
        };
    }

    getVisibleEntities() {
        if (!this.player || !Array.isArray(this.entities)) {
            return [];
        }

        const viewportWidth = this.canvas.width;
        const viewportHeight = this.canvas.height;
        const margin = 200;

        if (!viewportWidth || !viewportHeight) {
            const fallback = [];
            for (let i = 0; i < this.entities.length; i++) {
                const entity = this.entities[i];
                if (!entity || entity.isDead) continue;
                fallback.push(entity);
            }
            return fallback;
        }

        const visibleEntities = this._visibleEntitiesScratch;
        visibleEntities.length = 0;

        let generation = this._visibleEntitiesGeneration + 1;
        if (generation > 0x7fffffff) {
            generation = 1;
        }
        this._visibleEntitiesGeneration = generation;

        const halfW = viewportWidth / 2 + margin;
        const halfH = viewportHeight / 2 + margin;
        const maxVisible = (this.performanceMode || this.lowPerformanceMode || this.lowGpuMode) ? 350 : 600;
        const minVisible = Math.min(10, maxVisible);

        const grid = this.spatialGrid;
        let anyCellFound = false;

        if (grid && grid.size > 0) {
            // [OPTIMIZATION] Use PerformanceCache for viewport grid calculations
            const startX = window.perfCache
                ? window.perfCache.gridCoord(this.player.x - halfW, this.gridSize)
                : Math.floor((this.player.x - halfW) / this.gridSize);
            const startY = window.perfCache
                ? window.perfCache.gridCoord(this.player.y - halfH, this.gridSize)
                : Math.floor((this.player.y - halfH) / this.gridSize);
            const endX = Math.ceil((this.player.x + halfW) / this.gridSize);
            const endY = Math.ceil((this.player.y + halfH) / this.gridSize);

            outer: for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    const cellEntities = grid.get(this._encodeGridKey(x, y));
                    if (!cellEntities || cellEntities.length === 0) {
                        continue;
                    }

                    anyCellFound = true;
                    for (let i = 0; i < cellEntities.length; i++) {
                        const entity = cellEntities[i];
                        if (!entity || entity.isDead || entity.__visibleGeneration === generation) continue;

                        const dx = Math.abs(entity.x - this.player.x);
                        const dy = Math.abs(entity.y - this.player.y);

                        if (dx < halfW && dy < halfH) {
                            entity.__visibleGeneration = generation;
                            visibleEntities.push(entity);

                            if (visibleEntities.length >= maxVisible) {
                                break outer;
                            }
                        }
                    }
                }
            }
        }

        const needFallback = (!anyCellFound || visibleEntities.length < minVisible) && Array.isArray(this.entities);
        if (needFallback) {
            const targetCount = Math.min(maxVisible, Math.max(minVisible, visibleEntities.length));
            for (let i = 0; i < this.entities.length && visibleEntities.length < targetCount; i++) {
                const entity = this.entities[i];
                if (!entity || entity.isDead || entity.__visibleGeneration === generation) continue;

                const dx = Math.abs(entity.x - this.player.x);
                const dy = Math.abs(entity.y - this.player.y);
                if (dx < halfW && dy < halfH) {
                    entity.__visibleGeneration = generation;
                    visibleEntities.push(entity);
                }
            }
        }

        if (this.player && this.player.__visibleGeneration !== generation && visibleEntities.length < maxVisible) {
            this.player.__visibleGeneration = generation;
            visibleEntities.push(this.player);
        }

        return visibleEntities;
    }

    handleVisibilityChange() {
        const now = Date.now();
        if (now - this.lastVisibilityChange < 1000) return; // Debounce

        const hidden = typeof document !== 'undefined' ? document.hidden : false;
        this.isVisible = !hidden;
        this.lastVisibilityChange = now;

        if (!this.isVisible) {
            this.pauseGame({ reason: 'auto' });
            this.reduceResourceUsage();
        } else {
            this.restoreResourceUsage();
            this.resumeGame({ reason: 'auto' });
        }
    }

    handleFocusChange() {
        this.isMinimized = false;
        this.restoreResourceUsage();
        this.resumeGame({ reason: 'auto' });
    }

    handleBlurChange() {
        this.isMinimized = true;
        this.reduceResourceUsage();
    }

    reduceResourceUsage() {
        // Clear particles and effects
        if (window.gameManager) {
            window.gameManager.particles = [];
            window.gameManager.particlePool = [];
        }

        // Reduce update frequency
        this.targetFps = 30;
        this._updateTimingTargets();
        this._maxSpatialGridPoolSize = 128;

        // Clear unnecessary resources
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Suspend audio if available
        if (window.audioSystem && window.audioSystem.audioContext) {
            window.audioSystem.audioContext.suspend();
        }
    }

    restoreResourceUsage() {
        // Restore normal FPS
        this.targetFps = 60;
        this._updateTimingTargets();
        this._maxSpatialGridPoolSize = 256;

        // Resume audio if available
        if (window.audioSystem && window.audioSystem.audioContext) {
            window.audioSystem.audioContext.resume();
        }
    }
    cleanupResources() {
        // Clean up dead entities
        this.cleanupEntities(true);

        // More aggressive pool management for better memory usage
        const maxPoolSize = this.maxPoolSize || 100;
        const performanceMode = this.lowPerformanceMode || false;

        // Reduce pool sizes more aggressively when in low performance mode
        const targetPoolSize = performanceMode ? Math.floor(maxPoolSize * 0.5) : maxPoolSize;

        if (this.enemyProjectilePool && this.enemyProjectilePool.length > targetPoolSize) {
            this.enemyProjectilePool.length = targetPoolSize;
        }

        if (this.particlePool && this.particlePool.length > targetPoolSize) {
            this.particlePool.length = targetPoolSize;
        }

        // Clean up particle system if it exists
        if (window.optimizedParticles && typeof window.optimizedParticles.cleanup === 'function') {
            window.optimizedParticles.cleanup();
        }

        // Clean up spatial grid cache periodically
        if (this.spatialGridCache) {
            this.spatialGridCache.clear();
        }

        // Clear spatial grid
        this.spatialGrid.clear();
        if (this._spatialGridCellPool && this._spatialGridCellPool.length) {
            if (this.isShuttingDown) {
                this._spatialGridCellPool.length = 0;
            } else if (this._spatialGridCellPool.length > this._maxSpatialGridPoolSize) {
                this._spatialGridCellPool.length = this._maxSpatialGridPoolSize;
            }
        }

        // Rebuild spatial grid
        if (this.collisionSystem && typeof this.collisionSystem.updateSpatialGrid === 'function') {
            this.collisionSystem.updateSpatialGrid();
        } else {
            this.updateSpatialGrid();
        }

        // Clean up event listeners if shutting down
        if (this.isShuttingDown) {
            this.cleanupEventListeners();
        }
    }

    handleContextLoss(event) {
        event.preventDefault();
        this.contextLost = true;
        // Track previous pause state so we can restore it correctly
        this._wasPausedBeforeContextLoss = this.isPaused;
        window.logger.warn('Canvas context lost - game paused');
        this.isPaused = true;
    }

    handleContextRestore(event) {
        window.logger.log('Canvas context restored - resuming game');
        this.contextLost = false;

        // Reinitialize canvas context
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false
        });

        if (this.ctx) {
            // Restore previous pause state instead of always unpausing
            this.isPaused = this._wasPausedBeforeContextLoss || false;
            window.logger.log('Game context successfully restored');
        } else {
            window.logger.error('Failed to restore canvas context');
        }
    }

    cleanupEventListeners() {
        // Remove event listeners to prevent memory leaks
        try {
            // Store original bound functions for proper removal
            if (this.boundResizeCanvas) {
                window.removeEventListener('resize', this.boundResizeCanvas);
            }
            if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
                if (this.boundHandleContextLoss) {
                    this.canvas.removeEventListener('webglcontextlost', this.boundHandleContextLoss);
                }
                if (this.boundHandleContextRestore) {
                    this.canvas.removeEventListener('webglcontextrestored', this.boundHandleContextRestore);
                }
            }
            if (this.boundHandleVisibilityChange) {
                if (typeof document?.removeEventListener === 'function') {
                    document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
                }
            }
            if (this.boundHandleFocusChange) {
                window.removeEventListener('focus', this.boundHandleFocusChange);
            }
            if (this.boundHandleBlurChange) {
                window.removeEventListener('blur', this.boundHandleBlurChange);
            }
            if (this.boundHandleKeyDown) {
                window.removeEventListener('keydown', this.boundHandleKeyDown);
            }
            if (this.boundHandleKeyUp) {
                window.removeEventListener('keyup', this.boundHandleKeyUp);
            }
            if (this.boundHandleBeforeUnload) {
                window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);
            }

            if (this._domCache) {
                this._domCache.clear();
            }

            this.boundResizeCanvas = null;
            this.boundHandleContextLoss = null;
            this.boundHandleContextRestore = null;
            this.boundHandleVisibilityChange = null;
            this.boundHandleFocusChange = null;
            this.boundHandleBlurChange = null;
            this.boundHandleKeyDown = null;
            this.boundHandleKeyUp = null;
            this.boundHandleBeforeUnload = null;

            if (typeof window !== 'undefined' && window.__activeGameEngine === this) {
                window.__activeGameEngine = null;
            }
            if (typeof window !== 'undefined' && window.gameEngine === this) {
                window.gameEngine = null;
            }

            window.logger.log('Event listeners cleaned up successfully');
        } catch (error) {
            window.logger.error('Error cleaning up event listeners:', error);
        }
    }

    shutdown() {
        window.logger.log('Shutting down game engine...');
        this.isShuttingDown = true;
        this.isPaused = true;

        // Clean up all resources
        this.cleanupResources();

        // Clear all entities
        this.entities = [];
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.xpOrbs = [];

        // Clear pools
        this.enemyProjectilePool = [];
        this.particlePool = [];

        // Clear collision system
        if (this.collisionSystem) {
            this.collisionSystem.reset?.();
            this.collisionSystem = null;
        }

        // Clear spatial grid
        if (this.spatialGrid) {
            this.spatialGrid.clear();
        }

        // Clear entity manager
        if (this.entityManager) {
            this.entityManager.clear?.();
            this.entityManager = null;
        }

        if (typeof window !== 'undefined' && window.cosmicBackground === this.cosmicBackground) {
            window.cosmicBackground = null;
        }
        this.cosmicBackground = null;

        if (typeof window !== 'undefined' && window.__activeGameEngine === this) {
            window.__activeGameEngine = null;
        }

        window.logger.log('Game engine shutdown complete');
    }

}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.GameEngine = GameEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
}

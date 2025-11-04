(function() {
    class GameBootstrap {
        constructor() {
            this.systemReadyCheckId = null;
            this.mainMenu = null;

            // Load meta upgrade definitions from config
            // Fallback to empty array if config not loaded yet
            this.metaUpgrades = window.META_UPGRADE_DEFINITIONS || [];

            // Warn if config not loaded
            if (!window.META_UPGRADE_DEFINITIONS) {
                console.warn('⚠️ META_UPGRADE_DEFINITIONS not loaded. Make sure metaUpgrades.config.js is loaded before bootstrap.');
            }

            const ready = document.readyState === 'loading';
            if (ready) {
                document.addEventListener('DOMContentLoaded', () => this.handleDomLoaded());
            } else {
                this.handleDomLoaded();
            }

            window.addEventListener('beforeunload', () => this.cleanup());
        }

        log(...args) {
            (window.logger?.log || console.log)(...args);
        }

        info(...args) {
            (window.logger?.info || console.info)(...args);
        }

        warn(...args) {
            (window.logger?.warn || console.warn)(...args);
        }

        error(...args) {
            (window.logger?.error || console.error)(...args);
        }

        getNamespace() {
            return window.Game || {};
        }

        resolveNamespace(name) {
            const ns = this.getNamespace();
            if (typeof ns.resolve === 'function') {
                return ns.resolve(name);
            }
            return ns?.[name];
        }

        hasNamespace(name) {
            const ns = this.getNamespace();
            if (typeof ns.has === 'function') {
                return ns.has(name);
            }
            return typeof ns?.[name] !== 'undefined';
        }

        async handleDomLoaded() {
            try {
                this.log('🌊 DOM loaded, initializing game bridge...');

                const classesReady = await this.waitForCoreClasses(20, 100);
                if (!classesReady) {
                    throw new Error('Core classes failed to load after maximum retries');
                }

                const availability = this.inspectSystemAvailability();
                const missing = Object.entries(availability)
                    .filter(([, available]) => !available)
                    .map(([name]) => name);

                if (missing.length > 0) {
                    this.warn('⚠️ Missing systems:', missing);
                } else {
                    this.info('✅ All core systems available!');
                }

                this.initGameManager();
                this.initSystems();
                this.setupUI();
                this.checkSystemsReady();
            } catch (err) {
                this.error('❌ Error initializing game systems:', err);
                alert('Failed to initialize game. Error: ' + (err?.message || err));
            }
        }

        async waitForCoreClasses(maxAttempts = 20, delayMs = 100) {
            const required = ['GameEngine', 'Player', 'Enemy', 'Projectile'];
            const ns = this.getNamespace();
            const interval = Math.max(10, delayMs);
            const totalWait = Math.max(1, maxAttempts) * interval;

            if (typeof ns.whenReady === 'function') {
                return new Promise(resolve => {
                    let settled = false;
                    const finish = result => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        resolve(result);
                    };

                    const cancel = ns.whenReady(required, () => finish(true), {
                        checkInterval: interval,
                        timeoutMs: totalWait,
                        silent: true
                    });

                    window.setTimeout(() => {
                        if (settled) {
                            return;
                        }
                        if (typeof cancel === 'function') {
                            cancel();
                        }
                        const ready = required.every(name => this.hasNamespace(name));
                        if (!ready) {
                            this.warn('Core classes still missing after wait:', required.filter(name => !this.hasNamespace(name)));
                        }
                        finish(ready);
                    }, totalWait + interval);
                });
            }

            let attempts = 0;
            while (attempts < maxAttempts) {
                if (required.every(name => typeof window[name] !== 'undefined')) {
                    return true;
                }

                await new Promise(resolve => setTimeout(resolve, interval));
                attempts += 1;
            }
            return false;
        }

        inspectSystemAvailability() {
            const ns = this.getNamespace();
            const register = typeof ns.register === 'function'
                ? ns.register.bind(ns)
                : (name, value) => {
                    if (typeof value !== 'undefined') {
                        ns[name] = value;
                    }
                };

            const attachIfPresent = (name, candidate) => {
                if (!this.hasNamespace(name) && typeof candidate !== 'undefined') {
                    register(name, candidate, { silent: true });
                }
                return this.hasNamespace(name);
            };

            const availability = {
                GameEngine: attachIfPresent('GameEngine', typeof GameEngine !== 'undefined' ? GameEngine : undefined),
                EnemySpawner: attachIfPresent('EnemySpawner', typeof EnemySpawner !== 'undefined' ? EnemySpawner : undefined),
                Player: attachIfPresent('Player', typeof Player !== 'undefined' ? Player : undefined),
                Projectile: attachIfPresent('Projectile', typeof Projectile !== 'undefined' ? Projectile : undefined),
                Enemy: attachIfPresent('Enemy', typeof Enemy !== 'undefined' ? Enemy : undefined),
                Particle: attachIfPresent('Particle', typeof Particle !== 'undefined' ? Particle : undefined)
            };

            this.info('🔍 System availability:', availability);
            return availability;
        }

        initGameManager() {
            this.info('🌊 Creating GameManager bridge...');
            const GameManagerBridge = this.resolveNamespace('GameManagerBridge');
            if (typeof GameManagerBridge === 'function') {
                window.gameManager = new GameManagerBridge();
                window.gameManagerBridge = window.gameManager;
                this.info('✅ GameManager bridge created successfully');
            } else {
                this.error('❌ GameManagerBridge class not available');
            }
        }

        initSystems() {
            this.initInputManager();
            this.initUpgradeSystem();
            this.initAudioSystem();
            this.initPerformanceManager();
            this.initAchievementSystem();
            this.initHUDEventHandlers();
        }

        initInputManager() {
            const InputManager = this.resolveNamespace('InputManager');
            if (typeof InputManager !== 'function') {
                this.warn('⚠️ InputManager not available');
                return;
            }

            if (!window.inputManager) {
                window.inputManager = new InputManager();
                this.log('✅ InputManager initialized');
            } else {
                this.log('ℹ️ InputManager already initialized');
            }
        }

        initUpgradeSystem() {
            const UpgradeSystem = this.resolveNamespace('UpgradeSystem');
            if (typeof UpgradeSystem !== 'function') {
                this.warn('⚠️ UpgradeSystem not available');
                return;
            }

            if (!window.upgradeSystem) {
                window.upgradeSystem = new UpgradeSystem();
                this.log('✅ UpgradeSystem initialized');
            } else {
                this.log('ℹ️ UpgradeSystem already initialized');
            }
        }

        initAudioSystem() {
            const AudioSystem = this.resolveNamespace('AudioSystem');
            if (typeof AudioSystem !== 'function') {
                this.warn('⚠️ AudioSystem not available - creating stub');
                window.audioSystem = {
                    play: () => {},
                    playBossBeat: () => {},
                    resumeAudioContext: () => {},
                    isMuted: false,
                    setEnabled: () => {},
                    masterGain: { gain: { value: 0.5 } }
                };
                return;
            }

            if (!window.audioSystem) {
                window.audioSystem = new AudioSystem();
                this.log('✅ AudioSystem initialized');
            } else {
                this.log('ℹ️ AudioSystem already initialized');
            }
        }

        initPerformanceManager() {
            const PerformanceManager = this.resolveNamespace('PerformanceManager');
            if (typeof PerformanceManager !== 'function') {
                return;
            }

            if (!window.performanceManager) {
                window.performanceManager = new PerformanceManager();
                this.log('✅ PerformanceManager initialized');
                
                // 🍓 Detect and optimize for Raspberry Pi 5
                this.detectAndOptimizeForPi5();
            } else {
                this.log('ℹ️ PerformanceManager already initialized');
            }
        }
        
        /**
         * 🍓 RASPBERRY PI 5 AUTO-DETECTION & OPTIMIZATION
         * Automatically enables performance mode when running on Pi5 or low-end ARM devices
         */
        detectAndOptimizeForPi5() {
            const ua = navigator.userAgent.toLowerCase();
            const platform = navigator.platform?.toLowerCase() || '';
            
            // Check for ARM architecture + Linux
            const isARM = /arm|aarch64/.test(platform) || /arm|aarch64/.test(ua);
            const isLinux = /linux/.test(platform) || /linux/.test(ua);
            
            // Check GPU renderer
            let gpu = '';
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                    }
                }
            } catch (e) {
                // Ignore WebGL errors
            }
            
            // Detect Raspberry Pi indicators
            const isPi = isARM && isLinux && (
                /mali|videocore|broadcom/i.test(gpu) || 
                /raspberry/i.test(ua) ||
                /rpi/i.test(ua)
            );
            
            if (isPi) {
                window.isRaspberryPi = true;
                console.log('🍓 Raspberry Pi detected!');
                console.log('🚀 Enabling Pi5 performance optimizations...');
                
                // Enable performance mode across all systems
                this.enablePi5Optimizations();
            } else if (isARM) {
                // Other ARM devices (mobile, tablets) - use moderate optimizations
                console.log('📱 ARM device detected - enabling moderate optimizations');
                window.isLowPowerDevice = true;
                this.enableModeratePowerOptimizations();
            }
        }
        
        /**
         * Enable aggressive optimizations for Raspberry Pi 5
         */
        enablePi5Optimizations() {
            // CosmicBackground optimizations
            if (window.cosmicBackground && typeof window.cosmicBackground.enablePi5Mode === 'function') {
                window.cosmicBackground.enablePi5Mode();
                this.log('✅ CosmicBackground Pi5 mode enabled');
            }
            
            // Particle system optimizations
            if (window.optimizedParticles) {
                window.optimizedParticles.setLowQuality(true);
                window.optimizedParticles.maxParticles = 80; // Reduced for Pi5
                window.optimizedParticles.densityMultiplier = 0.5;
                this.log('✅ Particle system optimized for Pi5');
            }
            
            // Enemy AI optimizations (cache lifetime)
            if (window.Game?.EnemyAI) {
                // Increase cache lifetime for Pi5
                const originalConstructor = window.Game.EnemyAI;
                if (originalConstructor.prototype) {
                    const originalInit = originalConstructor.prototype.constructor;
                    originalConstructor.prototype._pi5OptimizationApplied = true;
                }
                this.log('✅ Enemy AI cache optimizations ready for Pi5');
            }
            
            // GameEngine performance mode
            if (window.gameEngine && typeof window.gameEngine.enablePerformanceMode === 'function') {
                window.gameEngine.enablePerformanceMode();
                this.log('✅ GameEngine performance mode enabled');
            }
            
            // PerformanceManager settings
            if (window.performanceManager) {
                window.performanceManager.targetFPS = 60;
                window.performanceManager.criticalMode = false; // Start optimistic
                this.log('✅ PerformanceManager configured for Pi5');
            }
            
            // 🍓 GPU Memory Manager (NEW)
            if (window.gpuMemoryManager && typeof window.gpuMemoryManager.enable === 'function') {
                window.gpuMemoryManager.enable();
                this.log('✅ GPU Memory Manager enabled for Pi5');
            }

            // 🍓 ProjectileRenderer cache limits (ensure applied after detection)
            if (typeof ProjectileRenderer !== 'undefined' && typeof ProjectileRenderer.applyPi5GpuLimits === 'function') {
                ProjectileRenderer.applyPi5GpuLimits();
                this.log('✅ ProjectileRenderer Pi5 GPU limits enforced');
            }

            // 🍓 Enable performance profiler now that Pi detection is confirmed
            if (window.performanceProfiler && typeof window.performanceProfiler.setEnabled === 'function') {
                window.performanceProfiler.setEnabled(true);
                if (typeof window.performanceProfiler.setVerbose === 'function' && window.debugMode) {
                    window.performanceProfiler.setVerbose(true);
                }
                this.log('✅ Performance profiler enabled for Pi5 monitoring');
            }
            
            // 🍓 Trig Cache for fast math on ARM (NEW)
            if (window.initTrigCache && typeof window.initTrigCache === 'function') {
                window.trigCache = window.initTrigCache();
                this.log('✅ TrigCache initialized for Pi5 (ARM-optimized math)');
            }

            // 🍓 Install FastMath global overrides to accelerate existing math calls
            if (window.FastMath && typeof window.FastMath.installGlobals === 'function') {
                window.FastMath.installGlobals();
                this.log('✅ FastMath global overrides installed');
            }
            
            this.log('🍓 All Pi5 optimizations applied! Target: 60 FPS');
        }
        
        /**
         * Enable moderate optimizations for low-power ARM devices
         */
        enableModeratePowerOptimizations() {
            if (window.cosmicBackground && typeof window.cosmicBackground.setLowQuality === 'function') {
                window.cosmicBackground.setLowQuality(true);
            }
            
            if (window.optimizedParticles) {
                window.optimizedParticles.setLowQuality(true);
                window.optimizedParticles.maxParticles = 120;
                window.optimizedParticles.densityMultiplier = 0.7;
            }
            
            this.log('✅ Moderate optimizations applied for low-power device');
        }

        initHUDEventHandlers() {
            const HUDEventHandlers = this.resolveNamespace('HUDEventHandlers');
            if (typeof HUDEventHandlers !== 'function') {
                this.warn('⚠️ HUDEventHandlers not available');
                return;
            }

            if (window.gameEngine?.state && !window.hudEventHandlers) {
                window.hudEventHandlers = new HUDEventHandlers(window.gameEngine.state);
                this.log('✅ HUD event handlers initialized');
            }
        }

        initAchievementSystem() {
            const AchievementSystem = this.resolveNamespace('AchievementSystem');
            if (typeof AchievementSystem !== 'function') {
                this.warn('⚠️ AchievementSystem not available - creating stub');
                window.achievementSystem = {
                    achievements: {},
                    getUnlockedCount: () => 0,
                    getTotalCount: () => 0
                };
                return;
            }

            window.achievementSystem = new AchievementSystem();
            this.log('✅ AchievementSystem initialized');
        }

        setupUI() {
            const Controller = this.resolveNamespace('MainMenuController');
            if (typeof Controller !== 'function') {
                this.warn('MainMenuController not available');
                return;
            }

            if (this.mainMenu) {
                this.mainMenu.cleanup();
            }

            this.mainMenu = new Controller({
                metaUpgrades: this.metaUpgrades,
                logger: {
                    log: (...args) => this.log(...args),
                    warn: (...args) => this.warn(...args),
                    error: (...args) => this.error(...args)
                }
            });

            if (typeof window !== 'undefined') {
                window.mainMenuController = this.mainMenu;
            }
        }

        checkSystemsReady() {
            if (!this.mainMenu) {
                return;
            }

            if (this.mainMenu.isVisible()) {
                return;
            }

            const ready = Boolean(window.gameManager && window.upgradeSystem && window.audioSystem);
            if (ready) {
                this.mainMenu.show();

                if (this.systemReadyCheckId) {
                    clearTimeout(this.systemReadyCheckId);
                    this.systemReadyCheckId = null;
                }

                this.log('Game ready to play');
                return;
            }

            if (this.systemReadyCheckId) {
                clearTimeout(this.systemReadyCheckId);
            }

            this.systemReadyCheckId = window.setTimeout(() => this.checkSystemsReady(), 100);
        }

        cleanup() {
            if (this.mainMenu) {
                this.mainMenu.cleanup();
                this.mainMenu = null;
            }

            if (this.systemReadyCheckId) {
                clearTimeout(this.systemReadyCheckId);
                this.systemReadyCheckId = null;
            }

            // Clean up system managers to prevent memory leaks
            if (window.inputManager?.destroy) {
                window.inputManager.destroy();
            }

            if (window.performanceManager?.destroy) {
                window.performanceManager.destroy();
            }

            window.gameManager?.cleanup?.();
        }
    }

    new GameBootstrap();
})();

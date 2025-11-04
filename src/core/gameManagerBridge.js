/**
 * 🌊 GAME MANAGER BRIDGE - Compatibility layer for script-based loading
 * This bridges the ES6 module-based refactored code with the script-tag based HTML
 * Provides a working game manager until the full module system is integrated
 */

class GameManagerBridge {
    constructor() {
        (window.logger?.log || console.log)('🌊 GameManager Bridge initializing...');

        // Core game systems
        this.game = null;
        this.enemySpawner = null;

        // Cached star token count (used before GameState initialization)
        let storedStars = 0;
        try {
            storedStars = parseInt(localStorage.getItem('starTokens') || '0', 10);
        } catch (_) {
            storedStars = 0;
        }
        this.cachedStarTokens = Number.isFinite(storedStars) ? storedStars : 0;

        // 🌊 GAME STATE - Single Source of Truth
        // Will be set when game engine initializes
        this.state = null;

        // Game settings (local to bridge)
        this.lowQuality = false;
        this.difficultyFactor = 1.0;

        // Reference to effects manager (primary system handles particles)
        this.effects = null;
        // UI manager (DOM HUD)
        this.uiManager = null;

        // Minimap system
        this.minimapSystem = null;
        this.performanceMode = 'normal';
        this._minimapRetryHandle = null;

        (window.logger?.log || console.log)('🌊 GameManager Bridge ready');

        this._uiRefs = new Map();
        this._uiLookupInterval = 750;
    }

    getNamespace() {
        return window.Game || {};
    }

    resolveNamespace(name) {
        const ns = this.getNamespace();
        if (typeof ns.resolve === 'function') {
            const resolved = ns.resolve(name);
            if (typeof resolved !== 'undefined') {
                return resolved;
            }
        } else if (typeof ns[name] !== 'undefined') {
            return ns[name];
        }

        if (typeof window !== 'undefined' && typeof window[name] !== 'undefined') {
            const candidate = window[name];
            if (typeof ns.register === 'function') {
                ns.register(name, candidate, { silent: true });
            } else {
                ns[name] = candidate;
            }
            return candidate;
        }

        return undefined;
    }

    hasNamespace(name) {
        const ns = this.getNamespace();
        if (typeof ns.has === 'function') {
            return ns.has(name);
        }
        if (typeof ns[name] !== 'undefined') {
            return true;
        }
        return typeof window?.[name] !== 'undefined';
    }

    // ===== GAMESTATE PROXY PROPERTIES =====
    // External systems access state through these properties
    // These are the public API - do not remove
    // Null checks required during initialization

    get gameTime() { return this.state?.runtime.gameTime ?? 0; }
    set gameTime(value) { if (this.state) this.state.runtime.gameTime = value; }

    get isPaused() { return this.state?.runtime.isPaused ?? false; }
    set isPaused(value) { if (this.state) { value ? this.state.pause() : this.state.resume(); } }

    get running() { return this.state?.runtime.isRunning ?? false; }
    set running(value) { if (this.state) { value ? this.state.start() : this.state.stop(); } }

    get gameOver() { return this.state?.flow.isGameOver ?? false; }
    set gameOver(value) {
        if (!this.state) return;

        if (value) {
            this.state.gameOver();
        } else {
            // Reset defeat flag so new sessions can start cleanly
            this.state.flow.isGameOver = false;
            this.state.player.isAlive = true;
        }
    }

    get gameWon() { return this.state?.flow.isGameWon ?? false; }
    set gameWon(value) {
        if (!this.state) return;

        if (value) {
            this.state.gameWon();
        } else {
            // Allow subsequent bosses to trigger victory flow again
            this.state.flow.isGameWon = false;
            this.state.runtime.isRunning = false;
        }
    }

    get endScreenShown() { return this.state?.flow.hasShownEndScreen ?? false; }
    set endScreenShown(value) { if (this.state) this.state.flow.hasShownEndScreen = value; }

    get killCount() { return this.state?.progression.killCount ?? 0; }
    set killCount(value) { if (this.state) this.state.progression.killCount = value; }

    get xpCollected() { return this.state?.progression.xpCollected ?? 0; }
    set xpCollected(value) { if (this.state) this.state.progression.xpCollected = value; }

    get currentCombo() { return this.state?.combo.count ?? 0; }
    set currentCombo(value) { if (this.state) this.state.combo.count = value; }

    get highestCombo() { return this.state?.combo.highest ?? 0; }
    set highestCombo(value) { if (this.state) this.state.combo.highest = value; }

    get comboTimer() { return this.state?.combo.timer ?? 0; }
    set comboTimer(value) { if (this.state) this.state.combo.timer = value; }

    get comboMultiplier() { return this.state?.combo.multiplier ?? 1.0; }
    set comboMultiplier(value) { if (this.state) this.state.combo.multiplier = value; }

    get metaStars() {
        if (this.state?.meta) {
            const current = this.state.meta.starTokens ?? 0;
            this.cachedStarTokens = current;
            return current;
        }
        return this.cachedStarTokens ?? 0;
    }

    set metaStars(value) {
        if (this.state?.meta) {
            this.state.meta.starTokens = value;
        }
        this.cachedStarTokens = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    getStarTokenBalance() {
        return this.metaStars; // getter handles caching fallback
    }

    /**
     * Minimap: initialize canvas refs and context
     */
    initializeMinimap() {
        this.setupMinimap();
    }

    /**
     * Minimap: render periodically
     */
    renderMinimap() {
        if (!this.minimapSystem) {
            this.setupMinimap();
        }
        this.minimapSystem?.update();
    }

    onPerformanceModeChange(mode) {
        const normalized = (mode === 'critical' || mode === 'low') ? mode : 'normal';
        this.performanceMode = normalized;

        if (this.game) {
            if (typeof this.game.setPerformancePreference === 'function') {
                this.game.setPerformancePreference(normalized);
            } else if (normalized === 'normal') {
                this.game.disablePerformanceMode?.();
            } else {
                this.game.enablePerformanceMode?.();
            }
        }

        this.lowQuality = normalized === 'critical';

        if (this.minimapSystem) {
            if (typeof this.minimapSystem.setUpdateInterval === 'function') {
                const interval = normalized === 'critical'
                    ? 320
                    : normalized === 'low'
                        ? 220
                        : 100;
                this.minimapSystem.setUpdateInterval(interval);
            }

            if (typeof this.minimapSystem.setEnabled === 'function' && !this.minimapSystem.enabled) {
                this.minimapSystem.setEnabled(true);
                this.minimapSystem.update?.(true);
            }

            if (normalized !== 'critical') {
                this.minimapSystem.update?.(true);
            }
        }
    }

    // Prefer pooled particles with graceful fallback
    _spawnParticleViaPoolOrFallback(x, y, vx, vy, size, color, life, type = 'basic') {
        try {
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({ x, y, vx, vy, size, color, life, type });
                return true;
            }
            const ParticleClass = this.resolveNamespace('Particle');
            if (typeof this.addParticleViaEffectsManager === 'function' && typeof ParticleClass === 'function') {
                const particle = new ParticleClass(x, y, vx, vy, size, color, life);
                return this.addParticleViaEffectsManager(particle);
            }
        } catch (e) {
            (window.logger?.warn || console.warn)('Particle spawn failed in GameManagerBridge', e);
        }
        return false;
    }
    
    /**
     * Initialize the game systems
     */
    initGameEngine() {
        (window.logger?.log || console.log)('🎮 Initializing game engine...');

        try {
            // Create game engine
            const GameEngineClass = this.resolveNamespace('GameEngine');
            if (typeof GameEngineClass !== 'function') {
                throw new Error('GameEngine class not available on window.Game namespace');
            }
            this.game = new GameEngineClass();

            // 🌊 LINK GAME STATE - Single Source of Truth
            this.state = this.game.state;
            (window.logger?.log || console.log)('✅ GameState linked to GameManagerBridge');
        
            // Create enemy spawner
            const EnemySpawnerClass = this.resolveNamespace('EnemySpawner');
            if (typeof EnemySpawnerClass === 'function') {
                this.enemySpawner = new EnemySpawnerClass(this.game);
                (window.logger?.log || console.log)('✅ Enemy spawner created');
            } else {
                (window.logger?.warn || console.warn)('⚠️ EnemySpawner not available');
            }

            // Initialize HUD event handlers now that the engine/state exist
            this._ensureHUDEventHandlers();

            // Player will be created by GameEngine.prepareNewRun() when game starts
            // This prevents double-initialization where player is created here then recreated in prepareNewRun()
            // See: ARCHITECTURE_FIXES.md - Issue 3
            (window.logger?.log || console.log)('✅ Player will be created on game start');
        
            // Initialize minimap after core systems
            this.setupMinimap();

            // Initialize UI Manager for HUD (timer, bars, boss UI)
            const UIManagerClass = this.resolveNamespace('UnifiedUIManager');
            if (typeof UIManagerClass === 'function') {
                this.uiManager = new UIManagerClass(this);
                (window.logger?.log || console.log)('✅ UIManager initialized');
            }

            // Initialize Effects Manager for particles, screen shake, etc.
            const EffectsManagerClass = this.resolveNamespace('EffectsManager');
            if (typeof EffectsManagerClass === 'function') {
                this.effectsManager = new EffectsManagerClass(this);
                (window.logger?.log || console.log)('✅ EffectsManager initialized');
            } else {
                (window.logger?.warn || console.warn)('⚠️ EffectsManager not available');
            }

            const StatsManagerClass = this.resolveNamespace('StatsManager');
            if (typeof StatsManagerClass === 'function') {
                this.statsManager = new StatsManagerClass(this);
                if (!window.statsManager) {
                    window.statsManager = this.statsManager;
                }
                this.metaStars = this.statsManager.starTokens;
                (window.logger?.log || console.log)('✅ StatsManager initialized');
                this.updateStarDisplay();
            } else {
                (window.logger?.warn || console.warn)('⚠️ StatsManager not available');
            }

            // Initialize DifficultyManager to drive game scaling
            const DifficultyManagerClass = this.resolveNamespace('DifficultyManager');
            if (typeof DifficultyManagerClass === 'function') {
                this.difficultyManager = new DifficultyManagerClass(this);
                if (!window.gameManager) {
                    window.gameManager = this;
                }
                window.gameManager.difficultyManager = this.difficultyManager;
                (window.logger?.log || console.log)('✅ DifficultyManager initialized');
            } else {
                (window.logger?.warn || console.warn)('⚠️ DifficultyManager not available');
            }

            (window.logger?.log || console.log)('✅ Game engine initialized successfully');
            return true;
            
        } catch (error) {
            (window.logger?.error || console.error)('❌ Failed to initialize game engine:', error);
            return false;
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        (window.logger?.log || console.log)('🚀 Starting game...');
        
        // Initialize engine if not done
        if (!this.game) {
            (window.logger?.log || console.log)('🔧 Game engine not initialized, creating...');
            if (!this.initGameEngine()) {
                (window.logger?.error || console.error)('❌ Cannot start game - engine initialization failed');
                alert('Failed to initialize game engine. Please refresh the page.');
                return;
            }
        }
        
        // Reset game state
        this.resetGameState();
        
        // Start the game engine
        if (this.game && typeof this.game.start === 'function') {
            (window.logger?.log || console.log)('▶️ Starting game engine...');
            this.game.start();
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.isPaused = false;
            }
            this.running = true;
            this.setupMinimap();
            this.renderMinimap();
            (window.logger?.log || console.log)('✅ Game started successfully!');
            (window.logger?.log || console.log)('🎮 Player position:', this.game.player ? `${this.game.player.x}, ${this.game.player.y}` : 'No player');
            (window.logger?.log || console.log)('🎨 Canvas size:', this.game.canvas ? `${this.game.canvas.width}x${this.game.canvas.height}` : 'No canvas');
        } else {
            (window.logger?.error || console.error)('❌ Game engine start method not available');
            (window.logger?.log || console.log)('Available methods:', Object.getOwnPropertyNames(this.game || {}));
            alert('Game engine is not ready. Please refresh the page.');
        }
    }
    
    /**
     * Reset game state for new game
     */
    resetGameState() {
        // 🌊 RESET GAME STATE - Single Source of Truth
        if (this.state) {
            this.state.resetSession();
            (window.logger?.log || console.log)('✅ GameState reset for new session');
        }

        // Reset StatsManager (it will sync with GameState)
        this.statsManager?.resetSession?.();

        // Reset DifficultyManager for new run
        this.difficultyManager?.reset?.();

        // Clear effects

        this.minimapSystem?.reset?.();

        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        if (this.enemySpawner && typeof this.enemySpawner.reset === 'function') {
            this.enemySpawner.reset();
        }

        (window.logger?.log || console.log)('🔄 Game state reset');
    }

    setupMinimap() {
        const MinimapSystemClass = this.resolveNamespace('MinimapSystem');

        if (!this.game || typeof MinimapSystemClass !== 'function') {
            return;
        }

        const ensureUpdate = system => {
            if (!system) {
                return;
            }
            if (this._minimapRetryHandle) {
                clearTimeout(this._minimapRetryHandle);
                this._minimapRetryHandle = null;
            }
            system.setEnabled?.(true);
            system.update?.(true);
        };

        const initialize = system => {
            if (!system) {
                return false;
            }
            try {
                const result = system.initialize?.();
                if (result === false) {
                    return false;
                }
                ensureUpdate(system);
                return true;
            } catch (error) {
                (window.logger?.warn || console.warn)('Minimap initialization error:', error);
                return false;
            }
        };

        if (!this.minimapSystem) {
            this.minimapSystem = new MinimapSystemClass(this.game, {
                width: 150,
                height: 150,
                scale: 0.12,
                updateInterval: 100,
                containerId: 'minimap-container',
                canvasId: 'minimap'
            });

            if (initialize(this.minimapSystem)) {
                return;
            }
        } else {
            if (typeof this.minimapSystem.setGame === 'function') {
                this.minimapSystem.setGame(this.game);
            }
            if (initialize(this.minimapSystem)) {
                return;
            }
        }

        if (!this._minimapRetryHandle) {
            this._minimapRetryHandle = window.setTimeout(() => {
                this._minimapRetryHandle = null;
                this.setupMinimap();
            }, 500);
        }
    }
    
    /**
     * Increment kill count when enemy dies
     */
    incrementKills() {
        // Delegate to StatsManager which updates GameState
        const stats = this.statsManager;
        if (stats?.incrementKills) {
            const killCount = stats.incrementKills();
            (window.logger?.log || console.log)(`💀 Kill count: ${killCount}`);

            if (this.currentCombo >= 5) {
                const textTargetY = this.game?.player?.y ? this.game.player.y - 50 : 0;
                if (this.game?.unifiedUI?.addComboText) {
                    this.game.unifiedUI.addComboText(this.currentCombo, this.game.player.x, textTargetY);
                } else {
                    this.showCombatText(`${this.currentCombo}x COMBO!`, this.game.player?.x ?? 0, textTargetY, 'combo', 18);
                }
            }

            return killCount;
        }

        // Fallback: Use GameState directly if StatsManager not available
        if (this.state) {
            this.state.addKill();
            return this.state.progression.killCount;
        }

        return 0;
    }
    
    /**
     * Handle boss death
     */
    onBossKilled() {
        (window.logger?.log || console.log)('👑 Boss killed!');

        // Add screen shake for dramatic effect (duration in seconds for bridge)
        this.addScreenShake(20, 1.0);

        // Show boss kill text
        if (this.game && this.game.player) {
            this.showCombatText('BOSS DEFEATED!', 
                this.game.canvas.width / 2, this.game.canvas.height / 2, 'critical', 32);
        }
        
        // Play victory sound if available
        if (window.audioSystem && window.audioSystem.play) {
            window.audioSystem.play('bossKilled', 0.6);
        }

        // Update boss HUD tracking
        if (this.uiManager && typeof this.uiManager.removeBoss === 'function') {
            try { this.uiManager.removeBoss(this._lastBossId || null); } catch (_) {}
        }

        if (!this.gameWon) {
            this.onGameWon();
        }
    }
    
    /**
     * Main update loop - called by GameEngine
     */
    update(deltaTime) {
        if (!this.running || this.gameOver || this.isPaused) {
            return;
        }

        // Update DifficultyManager before other systems
        this.difficultyManager?.update?.(deltaTime);

        // (Removed redundant copying of DifficultyManager multipliers to enemy spawner)

        // Update StatsManager (it syncs with GameState)
        this.statsManager?.update?.(deltaTime);

        // GameState is already updated by GameEngine
        // No need to update gameTime here anymore

        // Update timer display
        this.updateTimerDisplay();

        // Update boss countdown
        this.updateBossCountdown();

        // Update HUD periodically
        if (this.uiManager && typeof this.uiManager.update === 'function') {
            this.uiManager.update(deltaTime);
        }

        // Update effects manager (particles, screen shake, floating text)
        if (this.effectsManager && typeof this.effectsManager.update === 'function') {
            try {
                this.effectsManager.update(deltaTime);
            } catch (error) {
                (window.logger?.error || console.error)('ERROR in effectsManager.update():', error);
                // Disable effectsManager to prevent continuous errors
                this.effectsManager = null;
            }
        }

        // Update enemy spawner
        if (this.enemySpawner) {
            this.enemySpawner.update(deltaTime);
        }

        // Combo system is updated by GameState
        // Just sync UI
        const comboText = this._getUiRef('comboText', 'combo-text');
        const comboFill = this._getUiRef('comboFill', 'combo-fill');
        const comboContainer = this._getUiRef('comboContainer', 'combo-container');
        const comboCount = this.currentCombo;

        if (comboText) {
            comboText.textContent = comboCount > 0 ? `${comboCount}` : '';
            comboText.style.opacity = comboCount > 0 ? '1' : '0.5';
        }

        if (comboFill) {
            const timeout = this.state?.combo?.timeout ?? 1;
            const timer = Math.max(0, Math.min(this.comboTimer ?? 0, timeout));
            const ratio = timeout > 0 ? timer / timeout : 0;
            comboFill.style.width = `${Math.round(ratio * 100)}%`;
            comboFill.style.opacity = comboCount > 0 ? '1' : '0';
        }

        if (comboContainer) {
            comboContainer.style.opacity = comboCount > 0 ? '1' : '0.3';
            comboContainer.style.visibility = 'visible';
        }

        // Check win/lose conditions
        this.checkGameConditions();
    }
    
    /**
     * Check game win/lose conditions
     */
    checkGameConditions() {
        if (!this.game || !this.game.player) return;
        
        // Check lose condition
        if (this.game.player.isDead && !this.gameOver) {
            this.onGameOver();
        }
        
    }
    
    /**
     * Handle game over
     */
    onGameOver() {
        (window.logger?.log || console.log)('💀 Game Over');
        this.gameOver = true;
        this.running = false;
        
        // Create death effect
        if (this.game.player) {
            this.createExplosion(this.game.player.x, this.game.player.y, 100, '#e74c3c');
            this.addScreenShake(15, 1.5);
        }

        this.showRunSummary({
            title: 'Defeat',
            subtitle: `You survived ${this.formatTime(this.gameTime)}.`,
            outcome: 'defeat',
            buttons: [
                { label: 'Retry Run', action: () => this.startGame() },
                { label: 'Main Menu', action: () => this.returnToMenu() }
            ]
        });
    }
    
    /**
     * Handle game won
     */
    onGameWon() {
        (window.logger?.log || console.log)('🏆 Victory!');
        this.gameWon = true;
        this.running = false;

        // Award bonus stars
        this.earnStarTokens(10);

        // Create victory effect
        if (this.game.player) {
            this.createLevelUpEffect(this.game.player.x, this.game.player.y);
            this.showFloatingText('VICTORY!', this.game.player.x, this.game.player.y - 50, '#f1c40f', 36);
        }

        this.showRunSummary({
            title: 'Victory!',
            subtitle: `Boss defeated in ${this.formatTime(this.gameTime)}.`,
            outcome: 'victory',
            buttons: [
                { label: 'Continue Run', action: () => this.resumeRun() },
                { label: 'Start New Run', action: () => this.startGame() },
                { label: 'Main Menu', action: () => this.returnToMenu() }
            ]
        });
    }

    formatTime(totalSeconds) {
        const seconds = Math.max(0, Math.floor(totalSeconds || 0));
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
        }
        return `${remaining}s`;
    }

    getRunSummaryStats() {
        return [
            { label: 'Enemies Defeated', value: this.killCount },
            { label: 'Highest Combo', value: `${this.highestCombo || 0}x` },
            { label: 'Survival Time', value: this.formatTime(this.gameTime) },
            { label: 'Star Tokens', value: this.metaStars }
        ];
    }

    showRunSummary({ title, subtitle = '', outcome = 'summary', buttons = [] }) {
        if (this.endScreenShown) return;
        this.endScreenShown = true;

        const stats = this.getRunSummaryStats();

        if (window.resultScreen && typeof window.resultScreen.show === 'function') {
            window.resultScreen.show({
                title,
                subtitle,
                stats,
                outcome,
                buttons
            });
        } else {
            let message = `${title}\n${subtitle}`.trim();
            stats.forEach(stat => {
                message += `\n${stat.label}: ${stat.value}`;
            });
            alert(message);
        }

        if (this.game) {
            this.game.isPaused = true;
        }
    }

    _ensureHUDEventHandlers() {
        try {
            const HandlerClass = this.resolveNamespace('HUDEventHandlers');
            if (!HandlerClass) {
                (window.logger?.warn || console.warn)('⚠️ HUDEventHandlers class not found');
                return;
            }

            if (!this.game?.state) {
                (window.logger?.warn || console.warn)('⚠️ Game state not available for HUD handlers');
                return;
            }

            if (!window.hudEventHandlers) {
                window.hudEventHandlers = new HandlerClass(this.game.state);
                (window.logger?.log || console.log)('✅ HUD event handlers initialized');
            }
        } catch (error) {
            (window.logger?.error || console.error)('❌ Failed to initialize HUD event handlers:', error);
        }
    }

    returnToMenu() {
        const gameContainer = this._getUiRef('gameContainer', 'game-container', true);
        const mainMenu = this._getUiRef('mainMenu', 'main-menu', true);
        if (gameContainer) gameContainer.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');

        const pauseMenu = this._getUiRef('pauseMenu', 'pause-menu', true);
        if (pauseMenu) pauseMenu.classList.add('hidden');

        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        this.running = false;
        this.gameOver = true;
        this.gameWon = false;
        this.endScreenShown = false;

        if (this.game) {
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            }
            if (typeof this.game.prepareNewRun === 'function') {
                this.game.prepareNewRun();
            }
            this.game.isPaused = true;
        }

        this.updateStarDisplay();

        const bossCountdown = this._getUiRef('bossCountdown', 'boss-countdown');
        if (bossCountdown) bossCountdown.classList.add('hidden');
    }

    resumeRun() {
        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        this.endScreenShown = false;
        this.gameWon = false;
        this.gameOver = false;
        this.running = true;

        if (this.game) {
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.isPaused = false;
            }
        }

        this.updateStarDisplay();
    }
    
    showFloatingText(text, x, y, color = '#ffffff', size = 16) {
        if (this.game?.unifiedUI?.addFloatingText) {
            this.game.unifiedUI.addFloatingText(text, x, y, { color, size });
            return;
        }

        if (this.game?.effectsManager?.showFloatingText) {
            this.game.effectsManager.showFloatingText(text, x, y, color, size);
        }
    }

    showCombatText(text, x, y, type, size = 16) {
        const colors = {
            'damage': '#e74c3c',
            'critical': '#f1c40f',
            'heal': '#2ecc71',
            'xp': '#9b59b6',
            'combo': '#3498db'
        };
        if (this.game?.effectsManager?.showCombatText) {
            this.game.effectsManager.showCombatText(text, x, y, type, size);
            return;
        }

        this.showFloatingText(text, x, y, colors[type] || '#ffffff', size);
    }

    // Alias for backward compatibility
    addCombatText(text, x, y, color, size) {
        this.showFloatingText(text, x, y, color, size);
    }
    
    /**
     * Particle System
     */
    /**
     * Screen Shake System
     */
    addScreenShake(intensity, duration) {
        if (this.lowQuality) return;

        const effectsManager = this.game?.effectsManager || this.effects || window.gameManager?.effectsManager;
        effectsManager?.addScreenShake?.(intensity, duration);
    }

    /**
     * Combo System
     * DEPRECATED: Combo is now managed by GameState
     * This method kept for backward compatibility but does nothing
     */
    updateComboSystem(deltaTime) {
        // Combo system is now handled by GameState.updateCombo()
        // Called automatically in StatsManager.update()
        // No action needed here
    }
    
    /**
     * Event handlers
     */
    onEnemyDied(enemy) {
        if (this.statsManager?.registerEnemyKill) {
            this.statsManager.registerEnemyKill(enemy);
            this.killCount = this.statsManager.killCount;
            this.currentCombo = this.statsManager.comboCount;
            this.highestCombo = this.statsManager.highestCombo;
            this.comboTimer = this.statsManager.comboTimer;
        } else {
            this.incrementKills();
        }

        // Create death effect
        this.createHitEffect(enemy.x, enemy.y, enemy.maxHealth || 50);

        // Show kill combo
        if (this.currentCombo > 1) {
            this.showCombatText(`${this.currentCombo}x COMBO!`, enemy.x, enemy.y - 40, 'combo', 18);
        }
        
        // Milestone messages
        if (this.killCount % 25 === 0) {
            if (this.game && this.game.player) {
                this.showCombatText(`${this.killCount} KILLS!`, this.game.player.x, this.game.player.y - 50, 'critical', 24);
            }
        }
    }
    
    onPlayerLevelUp(level) {
        (window.logger?.log || console.log)('🆙 Player leveled up to', level);

        this.statsManager?.onPlayerLevelUp?.(level);

        if (this.game && this.game.player) {
            this.createLevelUpEffect(this.game.player.x, this.game.player.y);
            this.addScreenShake(3, 0.5);
        }
    }
    
    onXpCollected(amount) {
        this.xpCollected += amount;
    }
    
    /**
     * Effect creation methods
     */
    createHitEffect(x, y, damage = 50) {
        if (this.lowQuality) return;
        const effectsManager = this.game?.effectsManager || this.effects || window.gameManager?.effectsManager;
        if (effectsManager && typeof effectsManager.createHitEffect === 'function') {
            effectsManager.createHitEffect(x, y, damage);
            return;
        }
        const helpers = this.resolveNamespace('ParticleHelpers');
        if (helpers && typeof helpers.createHitEffect === 'function') {
            helpers.createHitEffect(x, y, damage);
            return;
        }
        const particleCount = Math.min(8, Math.floor(damage / 10));
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 3,
                    color: '#e74c3c',
                    life: 0.3 + Math.random() * 0.3,
                    type: 'spark'
                });
            } else {
                this._spawnParticleViaPoolOrFallback(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    2 + Math.random() * 3,
                    '#e74c3c',
                    0.3 + Math.random() * 0.3,
                    'spark'
                );
            }
        }
    }
    
    createExplosion(x, y, radius, color) {
        if (this.lowQuality) return;
        const effectsManager = this.game?.effectsManager || this.effects || window.gameManager?.effectsManager;
        if (effectsManager && typeof effectsManager.createExplosion === 'function') {
            effectsManager.createExplosion(x, y, radius, color);
            return;
        }
        const helpers = this.resolveNamespace('ParticleHelpers');
        if (helpers && typeof helpers.createExplosion === 'function') {
            helpers.createExplosion(x, y, radius, color);
            this.addScreenShake(radius / 10, 0.5);
            return;
        }
        const particleCount = Math.min(20, radius / 5);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 5,
                    color,
                    life: 0.5 + Math.random() * 0.5,
                    type: 'spark'
                });
            } else {
                this._spawnParticleViaPoolOrFallback(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    3 + Math.random() * 5,
                    color,
                    0.5 + Math.random() * 0.5,
                    'spark'
                );
            }
        }
        this.addScreenShake(radius / 10, 0.5);
    }
    
    createLevelUpEffect(x, y) {
        if (this.lowQuality) return;
        const effectsManager = this.game?.effectsManager || this.effects || window.gameManager?.effectsManager;
        if (effectsManager && typeof effectsManager.createLevelUpEffect === 'function') {
            effectsManager.createLevelUpEffect(x, y);
            return;
        }
        const helpers = this.resolveNamespace('ParticleHelpers');
        if (helpers && typeof helpers.createLevelUpEffect === 'function') {
            helpers.createLevelUpEffect(x, y);
            return;
        }
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const speed = 80 + Math.random() * 40;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: '#f1c40f',
                    life: 0.8 + Math.random() * 0.4,
                    type: 'spark'
                });
            } else {
                this._spawnParticleViaPoolOrFallback(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    3 + Math.random() * 3,
                    '#f1c40f',
                    0.8 + Math.random() * 0.4,
                    'spark'
                );
            }
        }
    }

    addParticleViaEffectsManager(particle) {
        if (this.lowQuality || !particle) {
            return false;
        }

        const effectsManager = this.game?.effectsManager || this.effects;
        const particleManager = effectsManager?.particleManager;

        if (particleManager?.spawnParticle) {
            particleManager.spawnParticle(particle);
            return true;
        }

        if (particleManager?.addParticle) {
            particleManager.addParticle(particle);
            return true;
        }

        return false;
    }
    
    /**
     * Update the timer display
     */
    updateTimerDisplay() {
        const timerElement = this._getUiRef('timerDisplay', 'timer-display');
        if (timerElement) {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = Math.floor(this.gameTime % 60);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Update boss spawn countdown
     */
    updateBossCountdown() {
        if (!this.enemySpawner) {
            return;
        }

        const bossCountdownElement = this._getUiRef('bossCountdown', 'boss-countdown');

        if (bossCountdownElement) {
            if (typeof this.enemySpawner.isBossAlive === 'function' && this.enemySpawner.isBossAlive()) {
                bossCountdownElement.classList.remove('hidden');
                bossCountdownElement.style.color = '#f1c40f';
                bossCountdownElement.style.animation = 'pulse 1.5s infinite';
                bossCountdownElement.textContent = 'Boss active!';
                return;
            }

            const timeUntilBoss = this.enemySpawner.bossInterval - this.enemySpawner.bossTimer;

            // Debug once per second
            const currentSecond = Math.floor(this.gameTime);
            if (currentSecond !== this._lastBossDebugSecond) {
                this._lastBossDebugSecond = currentSecond;
            if (window.debugManager?.enabled) {
                console.log(`[Boss Countdown] Timer: ${this.enemySpawner.bossTimer.toFixed(1)}s, Interval: ${this.enemySpawner.bossInterval}s, Time until: ${timeUntilBoss.toFixed(1)}s`);
            }
            }

            // Show different messages based on time until boss
            if (timeUntilBoss > 0) {
                bossCountdownElement.classList.remove('hidden');

                if (timeUntilBoss <= 10) {
                    // Urgent countdown - red pulsing
                    bossCountdownElement.style.color = '#e74c3c';
                    bossCountdownElement.style.animation = 'pulse 1s infinite';
                    bossCountdownElement.textContent = `Boss in: ${Math.ceil(timeUntilBoss)}s`;
                } else if (timeUntilBoss <= 30) {
                    // Warning - orange, no animation
                    bossCountdownElement.style.color = '#f39c12';
                    bossCountdownElement.style.animation = 'none';
                    bossCountdownElement.textContent = `Boss approaching: ${Math.ceil(timeUntilBoss)}s`;
                } else {
                    // Info - white, no animation
                    bossCountdownElement.style.color = '#ecf0f1';
                    bossCountdownElement.style.animation = 'none';
                    const minutes = Math.floor(timeUntilBoss / 60);
                    const seconds = Math.floor(timeUntilBoss % 60);
                    if (minutes > 0) {
                        bossCountdownElement.textContent = `Next boss: ${minutes}m ${seconds}s`;
                    } else {
                        bossCountdownElement.textContent = `Next boss: ${seconds}s`;
                    }
                }
            } else {
                bossCountdownElement.classList.add('hidden');
            }
        } else {
            console.log('[GameManagerBridge] Boss countdown element not found');
        }
    }

    /**
     * Star token management
     */
    earnStarTokens(amount) {
        if (this.statsManager?.earnStarTokens) {
            this.statsManager.earnStarTokens(amount);
            this.metaStars = this.statsManager.starTokens;
            return;
        }

        this.metaStars += amount;
        this.saveStarTokens();
        this.updateStarDisplay();
    }

    saveStarTokens() {
        const stars = this.getStarTokenBalance();
        try {
            localStorage.setItem('starTokens', stars.toString());
        } catch (_) {
            // Ignore storage errors in restricted environments
        }
    }

    updateStarDisplay() {
        const stars = this.getStarTokenBalance();
        const starDisplay = this._getUiRef('starMenuDisplay', 'star-menu-display');
        if (starDisplay) {
            starDisplay.textContent = '⭐ ' + stars;
        }

        const vendorDisplay = this._getUiRef('vendorStarDisplay', 'vendor-star-display');
        if (vendorDisplay) {
            vendorDisplay.textContent = '⭐ ' + stars;
        }
    }
    
    /**
     * Handle when a meta upgrade is maxed out
     */
    onUpgradeMaxed(upgradeId) {
        (window.logger?.log || console.log)('Meta upgrade maxed:', upgradeId);
        this.statsManager?.achievementSystem?.onUpgradeMaxed?.();
    }
    
    /**
     * Check if any menus are active (for input handling)
     */
    isMenuActive() {
        const levelUpContainer = this._getUiRef('levelUpContainer', 'level-up-container');
        return levelUpContainer && !levelUpContainer.classList.contains('hidden');
    }

    _getUiRef(key, elementId, force = false) {
        if (typeof document === 'undefined') {
            return null;
        }

        let entry = this._uiRefs.get(key);
        if (!entry) {
            entry = { element: null, nextLookup: 0 };
            this._uiRefs.set(key, entry);
        }

        const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();

        const needsLookup = force
            || !entry.element
            || (entry.element && typeof entry.element.isConnected === 'boolean' && !entry.element.isConnected)
            || now >= entry.nextLookup;

        if (needsLookup) {
            entry.element = document.getElementById(elementId) || null;
            entry.nextLookup = now + this._uiLookupInterval;
        }

        return entry.element;
    }

    _invalidateUiRef(key) {
        const entry = this._uiRefs.get(key);
        if (entry) {
            entry.element = null;
            entry.nextLookup = 0;
        }
    }
    
    onPlayerDamaged() {
        // Handle player taking damage (for achievements)
        (window.logger?.log || console.log)('Player took damage');
        this.statsManager?.onPlayerDamaged?.();
    }
    
    addXpCollected(amount) {
        if (this.statsManager?.collectXP) {
            const total = this.statsManager.collectXP(amount);
            this.xpCollected = this.statsManager.xpCollected;
            return total;
        }

        this.xpCollected += amount;
        return amount;
    }

    onDodge(wasPerfect) {
        this.statsManager?.trackSpecialEvent?.('dodge');

        if (wasPerfect) {
            this.statsManager?.trackSpecialEvent?.('perfect_dodge');
            this.showFloatingText('PERFECT DODGE!', this.game.player.x, this.game.player.y - 30, '#3498db', 18);
        }
    }

    onChainLightningHit(chainCount) {
        this.statsManager?.recordChainLightningHit?.(chainCount);
        if (chainCount >= 3) {
            this.showFloatingText(`${chainCount} CHAIN!`, this.game.player.x, this.game.player.y - 40, '#74b9ff', 16);
        }
    }

    onRicochetHit(bounceCount) {
        this.statsManager?.recordRicochetHit?.(bounceCount);
        if (bounceCount >= 2) {
            this.showFloatingText(`${bounceCount} BOUNCES!`, this.game.player.x, this.game.player.y - 40, '#f39c12', 16);
        }
    }
    
    onOrbitalCountChanged(count) {
        this.statsManager?.achievementSystem?.onOrbitalCountChanged?.(count);
    }
    
    createSpecialEffect(type, x, y, size, color) {
        const effectsManager = this.game?.effectsManager || this.effects || window.gameManager?.effectsManager;
        if (effectsManager && typeof effectsManager.createSpecialEffect === 'function') {
            effectsManager.createSpecialEffect(type, x, y, size, color);
            return;
        }

        // Minimal fallback: spawn a small burst
        const fallbackColor = color || '#ffffff';
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            this._spawnParticleViaPoolOrFallback(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2,
                fallbackColor,
                0.4 + Math.random() * 0.3,
                'spark'
            );
        }
    }

    cleanup() {
        if (this._minimapRetryHandle) {
            clearTimeout(this._minimapRetryHandle);
            this._minimapRetryHandle = null;
        }
        this.minimapSystem?.destroy?.();
        this.minimapSystem = null;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    const namespace = window.Game || (window.Game = {});
    if (typeof namespace.register === 'function') {
        namespace.register('GameManagerBridge', GameManagerBridge);
    } else {
        namespace.GameManagerBridge = GameManagerBridge;
    }
}

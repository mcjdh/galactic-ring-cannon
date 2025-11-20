(function() {
    class GameBootstrap {
        constructor() {
            this.systemReadyCheckId = null;
            this.mainMenu = null;
            this.pendingFatalError = null;
            this._fatalErrorShown = false;
            this._errorHandlersRegistered = false;

            // Load meta upgrade definitions from config
            // Fallback to empty array if config not loaded yet
            this.metaUpgrades = window.META_UPGRADE_DEFINITIONS || [];

            // Warn if config not loaded
            if (!window.META_UPGRADE_DEFINITIONS) {
                window.logger.warn('! META_UPGRADE_DEFINITIONS not loaded. Make sure metaUpgrades.config.js is loaded before bootstrap.');
            }

            const ready = document.readyState === 'loading';
            this.registerGlobalErrorHandlers();
            if (ready) {
                document.addEventListener('DOMContentLoaded', () => this.handleDomLoaded());
            } else {
                this.handleDomLoaded();
            }

            window.addEventListener('beforeunload', () => this.cleanup());
        }

        log(...args) {
            window.logger.log(...args);
        }

        info(...args) {
            window.logger.info(...args);
        }

        warn(...args) {
            window.logger.warn(...args);
        }

        error(...args) {
            window.logger.error(...args);
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
                if (this._fatalErrorShown) {
                    return;
                }
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
                    this.warn('! Missing systems:', missing);
                } else {
                    this.info('+ All core systems available!');
                }
                
                this.assertConfigDefinitionsLoaded();
                if (this.pendingFatalError) {
                    this.showFatalError(this.pendingFatalError);
                    return;
                }

                this.initGameManager();
                this.initSystems();
                this.setupUI();
                this.checkSystemsReady();
            } catch (err) {
                this.error('! Error initializing game systems:', err);
                this.showFatalError(err?.message || 'Failed to initialize game systems.');
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
                this.info('+ GameManager bridge created successfully');
            } else {
                this.error('! GameManagerBridge class not available');
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
        
        registerGlobalErrorHandlers() {
            if (this._errorHandlersRegistered || typeof window === 'undefined') {
                return;
            }
            this._errorHandlersRegistered = true;
            const captureError = (message) => {
                const text = typeof message === 'string'
                    ? message
                    : (message?.message || 'Unexpected error occurred');
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    this.showFatalError(text);
                } else {
                    this.pendingFatalError = text;
                }
            };

            window.addEventListener('error', (event) => {
                if (!event) return;
                captureError(event.error || event.message);
            });
            window.addEventListener('unhandledrejection', (event) => {
                if (!event) return;
                const reason = event.reason;
                captureError(typeof reason === 'string' ? reason : reason?.message);
            });
        }
        
        assertConfigDefinitionsLoaded() {
            const missing = [];

            if (!Array.isArray(window.CHARACTER_DEFINITIONS) || window.CHARACTER_DEFINITIONS.length === 0) {
                missing.push('Character definitions');
            }
            const hasWeaponDefinitions = window.WEAPON_DEFINITIONS &&
                Object.keys(window.WEAPON_DEFINITIONS).length > 0;
            if (!hasWeaponDefinitions) {
                missing.push('Weapon definitions');
            }
            if (!Array.isArray(window.UPGRADE_DEFINITIONS) || window.UPGRADE_DEFINITIONS.length === 0) {
                missing.push('Upgrade definitions');
            }
            if (!Array.isArray(window.META_UPGRADE_DEFINITIONS) || window.META_UPGRADE_DEFINITIONS.length === 0) {
                missing.push('Meta upgrade definitions');
            }

            if (missing.length > 0) {
                throw new Error(`Missing required configuration: ${missing.join(', ')}`);
            }
        }

        showFatalError(message) {
            this._fatalErrorShown = true;
            this.pendingFatalError = null;
            const overlay = document.getElementById('fatal-error-overlay');
            const msgNode = document.getElementById('fatal-error-message');
            if (!overlay || !msgNode) {
                this.pendingFatalError = message;
                return;
            }

            overlay.classList.remove('hidden');
            msgNode.textContent = message || 'Unexpected error occurred.';

            const restartButton = document.getElementById('fatal-error-restart');
            if (restartButton && !restartButton.dataset.boundRestart) {
                restartButton.dataset.boundRestart = 'true';
                restartButton.addEventListener('click', () => {
                    window.location.reload();
                });
            }

            // Hide other panels to keep focus on recovery UI
            document.getElementById('main-menu')?.classList?.add('hidden');
            document.getElementById('game-container')?.classList?.add('hidden');
        }

        initInputManager() {
            const InputManager = this.resolveNamespace('InputManager');
            if (typeof InputManager !== 'function') {
                this.warn('! InputManager not available');
                return;
            }

            if (!window.inputManager) {
                window.inputManager = new InputManager();
                this.log('+ InputManager initialized');
            } else {
                this.log('i InputManager already initialized');
            }
        }

        initUpgradeSystem() {
            const UpgradeSystem = this.resolveNamespace('UpgradeSystem');
            if (typeof UpgradeSystem !== 'function') {
                this.warn('! UpgradeSystem not available');
                return;
            }

            if (!window.upgradeSystem) {
                window.upgradeSystem = new UpgradeSystem();
                this.log('+ UpgradeSystem initialized');
            } else {
                this.log('i UpgradeSystem already initialized');
            }
        }

        initAudioSystem() {
            const AudioSystem = this.resolveNamespace('AudioSystem');
            if (typeof AudioSystem !== 'function') {
                this.warn('! AudioSystem not available - creating stub');
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
                this.log('+ AudioSystem initialized');
            } else {
                this.log('i AudioSystem already initialized');
            }
        }

        initPerformanceManager() {
            const PerformanceManager = this.resolveNamespace('PerformanceManager');
            if (typeof PerformanceManager !== 'function') {
                return;
            }

            if (!window.performanceManager) {
                window.performanceManager = new PerformanceManager();
                this.log('+ PerformanceManager initialized');
            } else {
                this.log('i PerformanceManager already initialized');
            }
        }

        initHUDEventHandlers() {
            const HUDEventHandlers = this.resolveNamespace('HUDEventHandlers');
            if (typeof HUDEventHandlers !== 'function') {
                this.warn('! HUDEventHandlers not available');
                return;
            }

            if (window.gameEngine?.state && !window.hudEventHandlers) {
                window.hudEventHandlers = new HUDEventHandlers(window.gameEngine.state);
                this.log('+ HUD event handlers initialized');
            }
        }

        initAchievementSystem() {
            const AchievementSystem = this.resolveNamespace('AchievementSystem');
            if (typeof AchievementSystem !== 'function') {
                this.warn('! AchievementSystem not available - creating stub');
                window.achievementSystem = {
                    achievements: {},
                    getUnlockedCount: () => 0,
                    getTotalCount: () => 0
                };
                return;
            }

            window.achievementSystem = new AchievementSystem();
            this.log('+ AchievementSystem initialized');
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

            // Clean up main menu controller (removes event listeners, animations, etc.)
            if (window.mainMenuController?.cleanup) {
                window.mainMenuController.cleanup();
            }

            window.gameManager?.cleanup?.();
        }
    }

    new GameBootstrap();
})();

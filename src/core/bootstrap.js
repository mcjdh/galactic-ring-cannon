(function() {
    class GameBootstrap {
        constructor() {
            this.eventListeners = [];
            this.systemReadyCheckId = null;
            this.mainMenuShown = false;
            this.controls = {};
            this.metaUpgrades = [
                {
                    id: 'starting_damage',
                    name: 'Enhanced Firepower',
                    description: 'Start each run with +25% damage',
                    cost: 5,
                    maxLevel: 5,
                    icon: '🔥',
                    effect: 'Starting damage multiplier'
                },
                {
                    id: 'starting_health',
                    name: 'Reinforced Hull',
                    description: 'Start each run with +20% health',
                    cost: 4,
                    maxLevel: 5,
                    icon: '🛡️',
                    effect: 'Starting health boost'
                },
                {
                    id: 'starting_speed',
                    name: 'Ion Thrusters',
                    description: 'Start each run with +15% movement speed',
                    cost: 3,
                    maxLevel: 4,
                    icon: '🚀',
                    effect: 'Starting speed boost'
                },
                {
                    id: 'star_chance',
                    name: 'Stellar Fortune',
                    description: 'Increase star token drop rate',
                    cost: 8,
                    maxLevel: 3,
                    icon: '⭐',
                    effect: 'Better star drops'
                },
                {
                    id: 'chain_upgrade',
                    name: 'Lightning Mastery',
                    description: 'Chain lightning effects +1 additional chain',
                    cost: 12,
                    maxLevel: 2,
                    icon: '⚡',
                    effect: 'Improved chain lightning'
                }
            ];

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

        warn(...args) {
            (window.logger?.warn || console.warn)(...args);
        }

        error(...args) {
            (window.logger?.error || console.error)(...args);
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
                    this.log('✅ All core systems available!');
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

        async waitForCoreClasses(maxAttempts, delayMs) {
            let attempts = 0;
            while (attempts < maxAttempts) {
                const coreReady = typeof GameEngine !== 'undefined'
                    && typeof Player !== 'undefined'
                    && typeof Enemy !== 'undefined'
                    && typeof Projectile !== 'undefined';

                if (coreReady) {
                    return true;
                }

                await new Promise(resolve => setTimeout(resolve, delayMs));
                attempts += 1;
            }
            return false;
        }

        inspectSystemAvailability() {
            const availability = {
                GameEngine: typeof window.GameEngine !== 'undefined',
                EnemySpawner: typeof window.EnemySpawner !== 'undefined',
                Player: typeof window.Player !== 'undefined',
                Projectile: typeof window.Projectile !== 'undefined',
                Enemy: typeof window.Enemy !== 'undefined',
                Particle: typeof window.Particle !== 'undefined'
            };

            this.log('🔍 System availability:', availability);
            return availability;
        }

        initGameManager() {
            this.log('🌊 Creating GameManager bridge...');
            window.gameManager = new GameManagerBridge();
            window.gameManagerBridge = window.gameManager;
            this.log('✅ GameManager bridge created successfully');
        }

        initSystems() {
            this.initInputManager();
            this.initUpgradeSystem();
            this.initAudioSystem();
            this.initPerformanceManager();
            this.initAchievementSystem();
        }

        initInputManager() {
            if (typeof InputManager === 'undefined') {
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
            if (typeof UpgradeSystem === 'undefined') {
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
            if (typeof AudioSystem === 'undefined') {
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
            if (typeof PerformanceManager === 'undefined') {
                return;
            }

            if (!window.performanceManager) {
                window.performanceManager = new PerformanceManager();
                this.log('✅ PerformanceManager initialized');
            } else {
                this.log('ℹ️ PerformanceManager already initialized');
            }
        }

        initAchievementSystem() {
            if (typeof AchievementSystem === 'undefined') {
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
            this.removeAllEventListeners();

            const controls = {
                muteCheckbox: document.getElementById('mute-checkbox'),
                volumeRange: document.getElementById('volume-range'),
                lowQualityCheckbox: document.getElementById('lowquality-checkbox'),
                difficultySelect: document.getElementById('difficulty-select'),
                achievementsCount: document.getElementById('achievements-count'),
                achievementsList: document.getElementById('achievements-list')
            };
            this.controls = controls;

            const btnNormal = document.getElementById('btn-normal');
            const btnEndless = document.getElementById('btn-endless');
            const btnSettings = document.getElementById('btn-settings');
            const btnShop = document.getElementById('btn-shop');
            const btnAchievements = document.getElementById('btn-achievements');
            const resumeButton = document.getElementById('resume-button');
            const restartButton = document.getElementById('restart-button-pause');
            const returnButton = document.getElementById('return-button-pause');
            const settingsClose = document.getElementById('settings-close');
            const shopClose = document.getElementById('shop-close');
            const achievementsClose = document.getElementById('achievements-close');

            this.addListener(btnNormal, 'click', () => {
                this.log('🎮 Starting Normal Mode...');
                this.startGame(false);
            });

            this.addListener(btnEndless, 'click', () => {
                this.log('🎮 Starting Endless Mode...');
                this.startGame(true);
            });

            this.addListener(btnSettings, 'click', () => {
                this.showPanel('settings-panel');
            });

            this.addListener(settingsClose, 'click', () => {
                this.applySettingsFromControls();
                this.hidePanel('settings-panel');
            });

            this.addListener(btnShop, 'click', () => {
                this.updateStarDisplay();
                this.populateShop();
                this.showPanel('shop-panel');
            });

            this.addListener(shopClose, 'click', () => {
                this.hidePanel('shop-panel');
            });

            this.addListener(btnAchievements, 'click', () => {
                this.updateAchievementsUI();
                this.showPanel('achievements-panel');
            });

            this.addListener(achievementsClose, 'click', () => {
                this.hidePanel('achievements-panel');
            });

            this.addListener(resumeButton, 'click', () => {
                window.gameManager?.game?.resumeGame?.();
            });

            this.addListener(restartButton, 'click', () => {
                window.gameManager?.startGame?.();
            });

            this.addListener(returnButton, 'click', () => {
                if (window.gameManager?.returnToMenu) {
                    window.gameManager.returnToMenu();
                } else if (window.gameManagerBridge?.returnToMenu) {
                    window.gameManagerBridge.returnToMenu();
                } else {
                    this.hidePanel('pause-menu');
                    this.showMainMenu();
                }
            });
        }

        startGame(isEndless) {
            const mainMenu = document.getElementById('main-menu');
            const gameContainer = document.getElementById('game-container');

            if (mainMenu) mainMenu.classList.add('hidden');
            if (gameContainer) gameContainer.classList.remove('hidden');

            if (!window.gameManager) return;

            window.gameManager.endlessMode = Boolean(isEndless);
            window.gameManager.startGame();
        }

        applySettingsFromControls() {
            const {
                muteCheckbox,
                volumeRange,
                lowQualityCheckbox,
                difficultySelect
            } = this.controls || {};

            try {
                if (muteCheckbox && window.audioSystem && typeof window.audioSystem.setEnabled === 'function') {
                    const enabled = !muteCheckbox.checked;
                    window.audioSystem.setEnabled(enabled);
                    localStorage.setItem('soundEnabled', enabled.toString());
                }

                if (volumeRange && window.audioSystem?.masterGain) {
                    let volumeValue = Number(volumeRange.value);
                    if (!Number.isFinite(volumeValue) || volumeValue < 0 || volumeValue > 1) {
                        volumeValue = 0.5;
                        volumeRange.value = '0.5';
                    }
                    window.audioSystem.masterGain.gain.value = volumeValue;
                    localStorage.setItem('volume', volumeValue.toString());
                }

                if (lowQualityCheckbox && window.gameManager) {
                    const lowQualityEnabled = Boolean(lowQualityCheckbox.checked);
                    window.gameManager.lowQuality = lowQualityEnabled;
                    localStorage.setItem('lowQuality', lowQualityEnabled.toString());
                }

                if (difficultySelect) {
                    const valid = ['easy', 'normal', 'hard'];
                    const selected = difficultySelect.value;
                    if (valid.includes(selected)) {
                        localStorage.setItem('difficulty', selected);
                    } else {
                        difficultySelect.value = 'normal';
                        localStorage.setItem('difficulty', 'normal');
                    }
                }
            } catch (err) {
                this.error('Error applying settings:', err);
            }
        }

        loadStoredSettingsIntoUI() {
            const {
                muteCheckbox,
                volumeRange,
                lowQualityCheckbox,
                difficultySelect
            } = this.controls || {};

            try {
                if (muteCheckbox) {
                    const stored = localStorage.getItem('soundEnabled');
                    if (stored === 'true' || stored === 'false') {
                        muteCheckbox.checked = stored !== 'true';
                    } else {
                        muteCheckbox.checked = false;
                        localStorage.setItem('soundEnabled', 'true');
                    }
                }

                if (volumeRange) {
                    let volumeValue = 0.5;
                    const storedVolume = localStorage.getItem('volume');
                    if (storedVolume !== null) {
                        const parsed = Number(storedVolume);
                        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
                            volumeValue = parsed;
                        }
                    }
                    volumeRange.value = volumeValue.toString();
                    if (window.audioSystem?.masterGain) {
                        window.audioSystem.masterGain.gain.value = volumeValue;
                    }
                }

                if (lowQualityCheckbox) {
                    const storedLowQ = localStorage.getItem('lowQuality');
                    if (storedLowQ === 'true' || storedLowQ === 'false') {
                        const enabled = storedLowQ === 'true';
                        lowQualityCheckbox.checked = enabled;
                        if (window.gameManager) {
                            window.gameManager.lowQuality = enabled;
                        }
                    } else {
                        lowQualityCheckbox.checked = false;
                        localStorage.setItem('lowQuality', 'false');
                    }
                }

                if (difficultySelect) {
                    const storedDifficulty = localStorage.getItem('difficulty');
                    const valid = ['easy', 'normal', 'hard'];
                    if (valid.includes(storedDifficulty)) {
                        difficultySelect.value = storedDifficulty;
                    } else {
                        difficultySelect.value = 'normal';
                        localStorage.setItem('difficulty', 'normal');
                    }
                }
            } catch (err) {
                this.error('Error loading settings:', err);
            }
        }

        updateAchievementsUI() {
            const { achievementsCount, achievementsList } = this.controls || {};
            const system = window.achievementSystem;
            if (!system) return;

            if (achievementsCount) {
                const unlocked = system.getUnlockedCount?.() ?? 0;
                const total = system.getTotalCount?.() ?? 0;
                achievementsCount.textContent = `${unlocked}/${total}`;
            }

            if (achievementsList) {
                achievementsList.innerHTML = '';
                const items = system.achievements || {};
                Object.values(items).forEach(achievement => {
                    const entry = document.createElement('div');
                    entry.className = 'achievement-item';
                    entry.textContent = `${achievement.icon || ''} ${achievement.name}${achievement.unlocked ? ' ✅' : ''}`;
                    achievementsList.appendChild(entry);
                });
            }
        }

        populateShop() {
            const container = document.getElementById('shop-items');
            if (!container) return;

            container.innerHTML = '';

            this.metaUpgrades.forEach(upgrade => {
                const currentLevel = this.getMetaUpgradeLevel(upgrade.id);
                const isMaxed = currentLevel >= upgrade.maxLevel;
                const cost = upgrade.cost + (currentLevel * Math.floor(upgrade.cost * 0.5));
                const currentStars = window.gameManager?.metaStars ?? 0;
                const canAfford = currentStars >= cost;

                const item = document.createElement('div');
                item.className = 'shop-item';
                item.innerHTML = `
                    <div class="shop-item-header">
                        <span class="shop-item-icon">${upgrade.icon}</span>
                        <span class="shop-item-name">${upgrade.name}</span>
                        <span class="shop-item-level">${currentLevel}/${upgrade.maxLevel}</span>
                    </div>
                    <div class="shop-item-description">${upgrade.description}</div>
                `;

                const footer = document.createElement('div');
                footer.className = 'shop-item-footer';

                if (isMaxed) {
                    const maxed = document.createElement('span');
                    maxed.className = 'shop-item-maxed';
                    maxed.textContent = 'MAXED';
                    footer.appendChild(maxed);
                } else {
                    const button = document.createElement('button');
                    button.className = `shop-buy-btn${canAfford ? '' : ' disabled'}`;
                    button.disabled = !canAfford;
                    button.textContent = canAfford ? `Buy for ${cost} ⭐` : `Need ${cost} ⭐`;

                    if (canAfford) {
                        this.addListener(button, 'click', () => this.purchaseUpgrade(upgrade.id));
                    }

                    footer.appendChild(button);
                }

                item.appendChild(footer);
                container.appendChild(item);
            });
        }

        purchaseUpgrade(upgradeId) {
            const upgrade = this.metaUpgrades.find(u => u.id === upgradeId);
            if (!upgrade || !window.gameManager) {
                return;
            }

            const currentLevel = this.getMetaUpgradeLevel(upgradeId);
            if (currentLevel >= upgrade.maxLevel) {
                return;
            }

            const cost = upgrade.cost + (currentLevel * Math.floor(upgrade.cost * 0.5));
            if ((window.gameManager.metaStars ?? 0) < cost) {
                return;
            }

            window.gameManager.metaStars -= cost;
            this.setMetaUpgradeLevel(upgradeId, currentLevel + 1);

            this.updateStarDisplay();
            window.gameManager.saveStarTokens?.();
            this.populateShop();

            this.log(`Purchased ${upgrade.name} level ${currentLevel + 1}`);
        }

        getMetaUpgradeLevel(id) {
            return parseInt(localStorage.getItem(`meta_${id}`) || '0', 10);
        }

        setMetaUpgradeLevel(id, level) {
            localStorage.setItem(`meta_${id}`, level.toString());
        }

        showPanel(id) {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('hidden');
            }
        }

        hidePanel(id) {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        }

        updateStarDisplay() {
            if (window.gameManager?.updateStarDisplay) {
                window.gameManager.updateStarDisplay();
            }
        }

        checkSystemsReady() {
            if (this.mainMenuShown) {
                return;
            }

            const ready = Boolean(window.gameManager && window.upgradeSystem && window.audioSystem);
            if (ready) {
                this.showMainMenu();
                return;
            }

            if (this.systemReadyCheckId) {
                clearTimeout(this.systemReadyCheckId);
            }

            this.systemReadyCheckId = window.setTimeout(() => this.checkSystemsReady(), 100);
        }

        showMainMenu() {
            if (this.mainMenuShown) {
                return;
            }

            const loadingScreen = document.getElementById('loading-screen');
            const mainMenu = document.getElementById('main-menu');

            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');

            this.updateStarDisplay();
            this.loadStoredSettingsIntoUI();

            this.mainMenuShown = true;
            if (this.systemReadyCheckId) {
                clearTimeout(this.systemReadyCheckId);
                this.systemReadyCheckId = null;
            }

            this.log('✅ Game ready to play!');
        }

        addListener(element, event, handler, options) {
            if (!element || typeof handler !== 'function') {
                return false;
            }

            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler, options });
            return true;
        }

        removeAllEventListeners() {
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (err) {
                    this.warn('Error removing event listener:', err);
                }
            });
            this.eventListeners = [];
        }

        cleanup() {
            this.removeAllEventListeners();
            if (this.systemReadyCheckId) {
                clearTimeout(this.systemReadyCheckId);
                this.systemReadyCheckId = null;
            }
            window.gameManager?.cleanup?.();
        }
    }

    new GameBootstrap();
})();

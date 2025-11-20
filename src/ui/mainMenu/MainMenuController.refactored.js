/**
 * MainMenuController - Orchestrates all menu panels and navigation
 * 
 * This is the main controller that coordinates:
 * - Character selection (via CharacterSelector)
 * - Shop panel (via ShopPanel)
 * - Achievements panel (via AchievementsPanel)
 * - Settings panel (via SettingsPanel)
 * - Menu backgrounds (via MenuBackgroundRenderer)
 * - Pause menu
 * - Main menu visibility
 */
(function () {
    class MainMenuController {
        constructor(options = {}) {
            this.logger = options.logger || console;
            this.callbacks = {
                onStartNormalMode: typeof options.onStartNormalMode === 'function' ? options.onStartNormalMode : null,
                onReturnToMenu: typeof options.onReturnToMenu === 'function' ? options.onReturnToMenu : null,
                onResumeGame: typeof options.onResumeGame === 'function' ? options.onResumeGame : null,
                onRestartFromPause: typeof options.onRestartFromPause === 'function' ? options.onRestartFromPause : null
            };

            this.state = { visible: false };
            this.eventListeners = [];
            this.dom = this.captureDomRefs();

            // Initialize sub-controllers
            this.initializeSubControllers(options);

            // Bind main menu buttons
            this.bindButtons();

            // Listen for external achievement unlocks
            this.achievementUnlockHandler = (event) => this.handleExternalAchievementUnlock(event);
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener('achievementUnlocked', this.achievementUnlockHandler);
            }
        }

        /**
         * Initialize all sub-controllers
         */
        initializeSubControllers(options) {
            const sharedOptions = {
                logger: this.logger,
                dom: this.dom,
                mainController: this
            };

            // Background renderer
            this.backgroundRenderer = new window.Game.MenuBackgroundRenderer(sharedOptions);

            // Character selector
            this.characterSelector = new window.Game.CharacterSelector(sharedOptions);

            // Shop panel
            this.shopPanel = new window.Game.ShopPanel({
                ...sharedOptions,
                metaUpgrades: Array.isArray(options.metaUpgrades) ? options.metaUpgrades : []
            });

            // Achievements panel
            this.achievementsPanel = new window.Game.AchievementsPanel(sharedOptions);

            // Settings panel
            this.settingsPanel = new window.Game.SettingsPanel(sharedOptions);
        }

        /**
         * Capture DOM references
         */
        captureDomRefs() {
            if (typeof document === 'undefined') {
                return { buttons: {}, panels: {}, controls: {} };
            }

            const byId = (id) => document.getElementById(id);
            return {
                loadingScreen: byId('loading-screen'),
                mainMenu: byId('main-menu'),
                menuBackground: byId('menu-background'),
                gameContainer: byId('game-container'),
                pauseMenu: byId('pause-menu'),
                starMenuDisplay: byId('star-menu-display'),
                vendorStarDisplay: byId('vendor-star-display'),
                shopItems: byId('shop-items'),
                buttons: {
                    normal: byId('btn-normal'),
                    settings: byId('btn-settings'),
                    settingsClose: byId('settings-close'),
                    shop: byId('btn-shop'),
                    shopClose: byId('shop-close'),
                    achievements: byId('btn-achievements'),
                    achievementsClose: byId('achievements-close'),
                    resume: byId('resume-button'),
                    restartPause: byId('restart-button-pause'),
                    returnPause: byId('return-button-pause'),
                    shopPrevPage: byId('shop-prev-page'),
                    shopNextPage: byId('shop-next-page'),
                    achievementsPrevPage: byId('achievements-prev-page'),
                    achievementsNextPage: byId('achievements-next-page')
                },
                panels: {
                    settings: byId('settings-panel'),
                    shop: byId('shop-panel'),
                    achievements: byId('achievements-panel'),
                    pause: byId('pause-menu')
                },
                loadoutSelector: byId('loadout-selector'),
                characterOptions: byId('character-options'),
                loadoutDescription: byId('loadout-description'),
                controls: {
                    muteCheckbox: byId('mute-checkbox'),
                    volumeRange: byId('volume-range'),
                    lowQualityCheckbox: byId('lowquality-checkbox'),
                    difficultySelect: byId('difficulty-select'),
                    achievementsCount: byId('achievements-count'),
                    achievementsList: byId('achievements-list'),
                    achievementsSidebar: byId('achievements-sidebar'),
                    shopPageIndicator: byId('shop-page-indicator'),
                    achievementsPageIndicator: byId('achievements-page-indicator')
                }
            };
        }

        /**
         * Bind button event listeners
         */
        bindButtons() {
            const buttons = this.dom.buttons || {};

            this.addListener(buttons.normal, 'click', () => this.handleStartNormalMode());
            this.addListener(buttons.settings, 'click', () => this.showPanel('settings'));
            this.addListener(buttons.settingsClose, 'click', () => {
                this.settingsPanel.applySettings();
                this.hidePanel('settings');
            });
            this.addListener(buttons.shop, 'click', () => {
                this.shopPanel.refreshStarDisplay();
                this.showPanel('shop');
                // Wait for panel to be visible and rendered before calculating layout
                requestAnimationFrame(() => {
                    this.shopPanel.render();
                });
            });
            this.addListener(buttons.shopClose, 'click', () => this.hidePanel('shop'));
            this.addListener(buttons.achievements, 'click', () => {
                this.showPanel('achievements');
                // Wait for panel to be visible and rendered before calculating layout
                requestAnimationFrame(() => {
                    this.achievementsPanel.render();
                });
            });
            this.addListener(buttons.achievementsClose, 'click', () => this.hidePanel('achievements'));
            this.addListener(buttons.resume, 'click', () => this.handleResumeFromPause());
            this.addListener(buttons.restartPause, 'click', () => this.handleRestartFromPause());
            this.addListener(buttons.returnPause, 'click', () => this.handleReturnToMenuFromPause());

            // Pagination controls
            this.addListener(buttons.shopPrevPage, 'click', () => this.shopPanel.navigatePage(-1));
            this.addListener(buttons.shopNextPage, 'click', () => this.shopPanel.navigatePage(1));
            this.addListener(buttons.achievementsPrevPage, 'click', () => this.achievementsPanel.navigatePage(-1));
            this.addListener(buttons.achievementsNextPage, 'click', () => this.achievementsPanel.navigatePage(1));

            // Bind category buttons
            const categoryBtns = this.dom.controls.achievementsSidebar?.querySelectorAll('.category-btn');
            categoryBtns?.forEach(btn => {
                this.addListener(btn, 'click', () => {
                    this.achievementsPanel.selectCategory(btn.dataset.category);
                });
            });
        }

        /**
         * Add an event listener and track it
         */
        addListener(element, event, handler, options) {
            if (!element || typeof handler !== 'function') {
                return;
            }
            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler, options });
        }

        /**
         * Check if menu is visible
         */
        isVisible() {
            return Boolean(this.state.visible);
        }

        /**
         * Show the main menu
         */
        show() {
            if (this.dom.loadingScreen) {
                this.dom.loadingScreen.classList.add('hidden');
            }
            if (this.dom.mainMenu) {
                this.dom.mainMenu.classList.remove('hidden');
            }
            this.hidePanel('settings');
            this.hidePanel('shop');
            this.hidePanel('achievements');
            this.hidePanel('pause');
            this.shopPanel.refreshStarDisplay();
            this.settingsPanel.loadSettings();
            this.characterSelector.initialize();
            this.state.visible = true;

            // Restart background animation
            if (this.dom.menuBackground) {
                this.backgroundRenderer.initMenuBackground(this.dom.menuBackground);
            }

            this.logger?.log?.('Main menu shown');
        }

        /**
         * Hide the main menu
         */
        hide() {
            if (this.dom.mainMenu) {
                this.dom.mainMenu.classList.add('hidden');
            }
            this.state.visible = false;

            // Stop background animation for performance
            this.backgroundRenderer.stop();
        }

        /**
         * Show the game container
         */
        showGameContainer() {
            if (this.dom.gameContainer) {
                this.dom.gameContainer.classList.remove('hidden');
            }
        }

        /**
         * Hide the game container
         */
        hideGameContainer() {
            if (this.dom.gameContainer) {
                this.dom.gameContainer.classList.add('hidden');
            }
        }

        /**
         * Handle start normal mode button click
         */
        handleStartNormalMode() {
            this.logger?.log?.('Starting normal mode');

            const characterId = this.characterSelector.getSelectedCharacterId();
            const weaponId = this.characterSelector.getSelectedWeaponId();

            this.characterSelector.syncCharacterState(characterId);
            this.characterSelector.syncWeaponState(weaponId);

            this.hide();
            this.showGameContainer();

            const manager = window.gameManager;
            if (manager && typeof manager.startGame === 'function') {
                manager.startGame();
            } else if (this.callbacks.onStartNormalMode) {
                this.callbacks.onStartNormalMode();
            }
        }

        /**
         * Handle resume from pause
         */
        handleResumeFromPause() {
            const manager = window.gameManager;
            if (manager?.game?.resumeGame) {
                manager.game.resumeGame();
            } else if (manager?.resumeGame) {
                manager.resumeGame();
            } else if (this.callbacks.onResumeGame) {
                this.callbacks.onResumeGame();
            }
            this.hidePanel('pause');
        }

        /**
         * Handle restart from pause
         */
        handleRestartFromPause() {
            const manager = window.gameManager;
            if (manager && typeof manager.startGame === 'function') {
                manager.startGame();
            } else if (this.callbacks.onRestartFromPause) {
                this.callbacks.onRestartFromPause();
            }
        }

        /**
         * Handle return to menu from pause
         */
        handleReturnToMenuFromPause() {
            let handled = false;
            const manager = window.gameManager;

            if (manager && typeof manager.returnToMenu === 'function') {
                manager.returnToMenu();
                handled = true;
            } else if (window.gameManagerBridge && typeof window.gameManagerBridge.returnToMenu === 'function') {
                window.gameManagerBridge.returnToMenu();
                handled = true;
            } else if (this.callbacks.onReturnToMenu) {
                this.callbacks.onReturnToMenu();
                handled = true;
            }

            if (!handled) {
                this.hideGameContainer();
            }

            this.hidePanel('pause');
            this.show();
        }

        /**
         * Show a panel
         */
        showPanel(name) {
            const panel = this.resolvePanel(name);
            if (panel) {
                panel.classList.remove('hidden');
                // Initialize canvas backgrounds for sub-panels
                if (name === 'settings') {
                    this.backgroundRenderer.initPanelBackground('settings-background');
                } else if (name === 'shop') {
                    this.backgroundRenderer.initPanelBackground('shop-background');
                } else if (name === 'achievements') {
                    this.backgroundRenderer.initPanelBackground('achievements-background');
                }
            }
        }

        /**
         * Hide a panel
         */
        hidePanel(name) {
            const panel = this.resolvePanel(name);
            if (panel) {
                panel.classList.add('hidden');
            }
        }

        /**
         * Resolve a panel element by name
         */
        resolvePanel(name) {
            if (!name) {
                return null;
            }

            const panels = this.dom.panels || {};
            const normalized = name.replace('-panel', '');
            if (panels[normalized]) {
                return panels[normalized];
            }

            if (typeof document !== 'undefined') {
                return document.getElementById(name);
            }
            return null;
        }

        /**
         * Handle external achievement unlock events
         */
        handleExternalAchievementUnlock(event) {
            this.characterSelector.initialize();
            const achievementsPanel = this.dom.panels?.achievements;
            if (achievementsPanel && achievementsPanel.classList && !achievementsPanel.classList.contains('hidden')) {
                this.achievementsPanel.render();
            }
        }

        /**
         * Clean up all resources
         */
        cleanup() {
            // Clean up sub-controllers
            this.backgroundRenderer?.cleanup();
            this.characterSelector?.cleanup();
            this.shopPanel?.cleanup();
            this.achievementsPanel?.cleanup();
            this.settingsPanel?.cleanup();

            // Clean up main event listeners
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    this.logger?.warn?.('Failed to remove listener', error);
                }
            });
            this.eventListeners = [];

            // Remove achievement unlock listener
            if (this.achievementUnlockHandler && typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('achievementUnlocked', this.achievementUnlockHandler);
                this.achievementUnlockHandler = null;
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.MainMenuController = MainMenuController;
    }
})();

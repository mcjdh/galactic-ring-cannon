(function() {
    class MainMenuController {
        constructor(options = {}) {
            this.logger = options.logger || console;
            this.metaUpgrades = Array.isArray(options.metaUpgrades) ? options.metaUpgrades : [];
            this.callbacks = {
                onStartNormalMode: typeof options.onStartNormalMode === 'function' ? options.onStartNormalMode : null,
                onReturnToMenu: typeof options.onReturnToMenu === 'function' ? options.onReturnToMenu : null,
                onResumeGame: typeof options.onResumeGame === 'function' ? options.onResumeGame : null,
                onRestartFromPause: typeof options.onRestartFromPause === 'function' ? options.onRestartFromPause : null
            };

            this.state = { visible: false };
            this.selectedCharacterId = null;
            this.selectedWeaponId = null;
            this.characterButtons = new Map();
            this.eventListeners = [];
            this.dynamicListeners = [];
            this.dom = this.captureDomRefs();

            // Menu background state
            this.menuStars = null;
            this.menuGradient = null;

            this.bindButtons();
            // Don't init background here - wait for show() to avoid double init
        }

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
                    returnPause: byId('return-button-pause')
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
                    achievementsList: byId('achievements-list')
                }
            };
        }

        bindButtons() {
            const buttons = this.dom.buttons || {};

            this.addListener(buttons.normal, 'click', () => this.handleStartNormalMode());
            this.addListener(buttons.settings, 'click', () => this.showPanel('settings'));
            this.addListener(buttons.settingsClose, 'click', () => {
                this.applySettingsFromControls();
                this.hidePanel('settings');
            });
            this.addListener(buttons.shop, 'click', () => {
                this.refreshStarDisplay();
                this.populateShop();
                this.showPanel('shop');
            });
            this.addListener(buttons.shopClose, 'click', () => this.hidePanel('shop'));
            this.addListener(buttons.achievements, 'click', () => {
                this.updateAchievementsUI();
                this.showPanel('achievements');
            });
            this.addListener(buttons.achievementsClose, 'click', () => this.hidePanel('achievements'));
            this.addListener(buttons.resume, 'click', () => this.handleResumeFromPause());
            this.addListener(buttons.restartPause, 'click', () => this.handleRestartFromPause());
            this.addListener(buttons.returnPause, 'click', () => this.handleReturnToMenuFromPause());
        }

        addListener(element, event, handler, options) {
            if (!element || typeof handler !== 'function') {
                return;
            }
            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler, options });
        }

        addDynamicListener(element, event, handler, options) {
            if (!element || typeof handler !== 'function') {
                return;
            }
            element.addEventListener(event, handler, options);
            this.dynamicListeners.push({ element, event, handler, options });
        }

        clearDynamicListeners() {
            this.dynamicListeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    if (this.logger && typeof this.logger.warn === 'function') {
                        this.logger.warn('Failed to remove dynamic listener', error);
                    }
                }
            });
            this.dynamicListeners = [];
        }

        isVisible() {
            return Boolean(this.state.visible);
        }

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
            this.refreshStarDisplay();
            this.loadStoredSettingsIntoUI();
            this.initializeLoadoutSelector();
            this.state.visible = true;

            // Restart background animation
            if (this.dom.menuBackground) {
                this.initMenuBackground();
            }

            if (this.logger && typeof this.logger.log === 'function') {
                this.logger.log('Main menu shown');
            }
        }

        hide() {
            if (this.dom.mainMenu) {
                this.dom.mainMenu.classList.add('hidden');
            }
            this.state.visible = false;

            // Stop background animation for performance
            if (this.menuAnimationFrame) {
                cancelAnimationFrame(this.menuAnimationFrame);
                this.menuAnimationFrame = null;
            }
        }

        showGameContainer() {
            if (this.dom.gameContainer) {
                this.dom.gameContainer.classList.remove('hidden');
            }
        }

        hideGameContainer() {
            if (this.dom.gameContainer) {
                this.dom.gameContainer.classList.add('hidden');
            }
        }

        handleStartNormalMode() {
            if (this.logger && typeof this.logger.log === 'function') {
                this.logger.log('Starting normal mode');
            }

            this.syncCharacterState(this.selectedCharacterId);
            this.syncWeaponState(this.selectedWeaponId);
            this.hide();
            this.showGameContainer();

            const manager = window.gameManager;
            if (manager && typeof manager.startGame === 'function') {
                manager.startGame();
            } else if (this.callbacks.onStartNormalMode) {
                this.callbacks.onStartNormalMode();
            }
        }

        getGameState() {
            return window.gameManager?.state || window.gameManager?.game?.state || null;
        }

        getCharacterDefinitions() {
            if (!Array.isArray(window.CHARACTER_DEFINITIONS)) {
                return [];
            }
            return window.CHARACTER_DEFINITIONS.map(def => def);
        }

        getWeaponDefinition(weaponId) {
            if (!weaponId || typeof window === 'undefined' || !window.WEAPON_DEFINITIONS) {
                return null;
            }
            return window.WEAPON_DEFINITIONS[weaponId] || null;
        }

        resolveInitialCharacterId(definitions) {
            if (!Array.isArray(definitions) || definitions.length === 0) {
                return null;
            }

            const state = this.getGameState();
            const stored =
                state?.getSelectedCharacter?.() ||
                state?.flow?.selectedCharacter ||
                (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedCharacter') : null);

            if (stored && definitions.some(def => def.id === stored)) {
                return stored;
            }

            return definitions[0].id;
        }

        syncCharacterState(characterId) {
            if (!characterId) return;

            const state = this.getGameState();
            if (state?.setSelectedCharacter) {
                state.setSelectedCharacter(characterId);
            } else if (state) {
                state.flow = state.flow || {};
                state.flow.selectedCharacter = characterId;
            }

            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('selectedCharacter', characterId);
                } catch (error) {
                    if (this.logger && typeof this.logger.warn === 'function') {
                        this.logger.warn('Failed to persist selected character', error);
                    }
                }
            }
        }

        syncWeaponState(weaponId) {
            if (!weaponId) return;

            const state = this.getGameState();
            if (state?.setSelectedWeapon) {
                state.setSelectedWeapon(weaponId);
            } else if (state) {
                state.flow = state.flow || {};
                state.flow.selectedWeapon = weaponId;
            }

            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('selectedWeapon', weaponId);
                } catch (error) {
                    if (this.logger && typeof this.logger.warn === 'function') {
                        this.logger.warn('Failed to persist selected weapon', error);
                    }
                }
            }
        }

        initializeLoadoutSelector() {
            const container = this.dom.characterOptions;
            if (!container) return;

            const definitions = this.getCharacterDefinitions();
            if (!definitions.length) {
                if (this.dom.loadoutSelector) {
                    this.dom.loadoutSelector.classList.add('hidden');
                }
                this.selectedCharacterId = null;
                this.selectedWeaponId = null;
                this.characterButtons.clear();
                if (this.dom.loadoutDescription) {
                    this.dom.loadoutDescription.textContent = '';
                }
                return;
            }

            if (this.dom.loadoutSelector) {
                this.dom.loadoutSelector.classList.remove('hidden');
            }

            const initialCharacterId = this.resolveInitialCharacterId(definitions);
            const initialDefinition = definitions.find(def => def.id === initialCharacterId) || definitions[0];
            this.selectedCharacterId = initialDefinition?.id || initialCharacterId;
            this.selectedWeaponId = initialDefinition?.weaponId || this.selectedWeaponId;

            this.syncCharacterState(this.selectedCharacterId);
            if (this.selectedWeaponId) {
                this.syncWeaponState(this.selectedWeaponId);
            }

            const hasMatchingButtons =
                container.childElementCount === definitions.length &&
                definitions.every(def => this.characterButtons.has(def.id));

            if (!hasMatchingButtons) {
                container.innerHTML = '';
                this.characterButtons.clear();

                definitions.forEach(def => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'menu-button loadout-option';
                    button.dataset.characterId = def.id;
                    const icon = def.icon ? `<span class="button-icon">${def.icon}</span>` : '';
                    button.innerHTML = `${icon}<span class="button-text">${def.name || def.id}</span>`;
                    button.title = def.tagline || def.description || def.name || def.id;
                    this.addListener(button, 'click', () => this.handleCharacterSelect(def.id));
                    container.appendChild(button);
                    this.characterButtons.set(def.id, button);
                });
            }

            this.highlightSelectedCharacter(this.selectedCharacterId);
            this.updateLoadoutDescription(this.selectedCharacterId);
        }

        highlightSelectedCharacter(selectedId) {
            this.characterButtons.forEach((button, id) => {
                if (!button) return;
                const isSelected = id === selectedId;
                button.classList.toggle('menu-button-primary', isSelected);
                button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            });
        }

        updateLoadoutDescription(characterId) {
            const descriptionEl = this.dom.loadoutDescription;
            if (!descriptionEl) return;

            const definitions = this.getCharacterDefinitions();
            const character = definitions.find(item => item.id === characterId);

            if (!character) {
                descriptionEl.textContent = 'Select a pilot to tailor your run.';
                return;
            }

            const detailParts = [];
            if (character.description) {
                detailParts.push(character.description);
            }

            const weaponDef = this.getWeaponDefinition(character.weaponId);
            if (weaponDef) {
                const summary = this.formatWeaponSummary(weaponDef);
                detailParts.push(`Starts with ${weaponDef.name}${summary ? ` (${summary})` : ''}`);
            }

            const highlights = this.formatCharacterHighlights(character);
            if (highlights) {
                detailParts.push(highlights);
            }

            descriptionEl.textContent = detailParts.join(' — ');
        }

        formatWeaponSummary(def) {
            if (!def) return '';
            const parts = [];
            if (typeof def.fireRate === 'number') {
                const rate = def.fireRate % 1 === 0 ? def.fireRate.toFixed(0) : def.fireRate.toFixed(2);
                parts.push(`${rate.replace(/\.00$/, '')} shots/sec`);
            }
            if (def.projectileTemplate?.count) {
                parts.push(`${def.projectileTemplate.count} proj`);
            }
            if (def.archetype) {
                parts.push(def.archetype.charAt(0).toUpperCase() + def.archetype.slice(1));
            }
            return parts.join(' • ');
        }

        formatCharacterHighlights(character) {
            if (!character) return '';
            if (Array.isArray(character.highlights) && character.highlights.length) {
                return character.highlights.join(' • ');
            }
            if (character.tagline) {
                return character.tagline;
            }
            return '';
        }

        handleCharacterSelect(characterId) {
            if (!characterId || this.selectedCharacterId === characterId) {
                return;
            }
            const definitions = this.getCharacterDefinitions();
            const character = definitions.find(def => def.id === characterId);

            this.selectedCharacterId = characterId;
            this.syncCharacterState(characterId);

            if (character?.weaponId) {
                this.selectedWeaponId = character.weaponId;
                this.syncWeaponState(character.weaponId);
            }

            this.highlightSelectedCharacter(characterId);
            this.updateLoadoutDescription(characterId);
        }

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

        handleRestartFromPause() {
            const manager = window.gameManager;
            if (manager && typeof manager.startGame === 'function') {
                manager.startGame();
            } else if (this.callbacks.onRestartFromPause) {
                this.callbacks.onRestartFromPause();
            }
        }

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

        showPanel(name) {
            const panel = this.resolvePanel(name);
            if (panel) {
                panel.classList.remove('hidden');
            }
        }

        hidePanel(name) {
            const panel = this.resolvePanel(name);
            if (panel) {
                panel.classList.add('hidden');
            }
        }

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

        applySettingsFromControls() {
            const controls = this.dom.controls || {};
            const {
                muteCheckbox,
                volumeRange,
                lowQualityCheckbox,
                difficultySelect
            } = controls;

            try {
                if (muteCheckbox && window.audioSystem && typeof window.audioSystem.setEnabled === 'function') {
                    const enabled = !muteCheckbox.checked;
                    window.audioSystem.setEnabled(enabled);
                    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
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
                    localStorage.setItem('lowQuality', lowQualityEnabled ? 'true' : 'false');
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
            } catch (error) {
                if (this.logger && typeof this.logger.error === 'function') {
                    this.logger.error('Error applying settings', error);
                }
            }
        }

        loadStoredSettingsIntoUI() {
            const controls = this.dom.controls || {};
            const {
                muteCheckbox,
                volumeRange,
                lowQualityCheckbox,
                difficultySelect
            } = controls;

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
            } catch (error) {
                if (this.logger && typeof this.logger.error === 'function') {
                    this.logger.error('Error loading settings', error);
                }
            }
        }

        updateAchievementsUI() {
            const controls = this.dom.controls || {};
            const countElement = controls.achievementsCount;
            const listElement = controls.achievementsList;
            const system = window.achievementSystem;

            if (!system) {
                return;
            }

            if (countElement) {
                const unlocked = system.getUnlockedCount?.() ?? 0;
                const total = system.getTotalCount?.() ?? 0;
                countElement.textContent = `${unlocked}/${total}`;
            }

            if (listElement) {
                listElement.innerHTML = '';
                const items = system.achievements || {};
                Object.values(items).forEach((achievement) => {
                    const entry = document.createElement('div');
                    entry.className = 'achievement-item';
                    const status = achievement.unlocked ? ' (Unlocked)' : '';
                    entry.textContent = `${achievement.icon || ''} ${achievement.name}${status}`.trim();
                    listElement.appendChild(entry);
                });
            }
        }

        populateShop() {
            const container = this.dom.shopItems;
            if (!container) {
                return;
            }

            this.clearDynamicListeners();
            container.innerHTML = '';

            this.metaUpgrades.forEach((upgrade) => {
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
                    button.textContent = canAfford ? `Buy for ${cost} \u2B50` : `Need ${cost} \u2B50`;

                    if (canAfford) {
                        this.addDynamicListener(button, 'click', () => this.purchaseUpgrade(upgrade.id));
                    }

                    footer.appendChild(button);
                }

                item.appendChild(footer);
                container.appendChild(item);
            });
        }

        purchaseUpgrade(upgradeId) {
            const upgrade = this.metaUpgrades.find((entry) => entry.id === upgradeId);
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

            this.refreshStarDisplay();
            window.gameManager.saveStarTokens?.();
            this.populateShop();

            if (this.logger && typeof this.logger.log === 'function') {
                this.logger.log(`Purchased ${upgrade.name} level ${currentLevel + 1}`);
            }

            if (currentLevel + 1 >= upgrade.maxLevel) {
                window.gameManager.onUpgradeMaxed?.(upgradeId);
            }
        }

        getMetaUpgradeLevel(id) {
            try {
                return parseInt(localStorage.getItem(`meta_${id}`) || '0', 10);
            } catch (e) {
                console.warn('[MainMenuController] Failed to get meta upgrade level:', e.message);
                return 0;
            }
        }

        setMetaUpgradeLevel(id, level) {
            try {
                localStorage.setItem(`meta_${id}`, level.toString());
            } catch (e) {
                console.warn('[MainMenuController] Failed to set meta upgrade level:', e.message);
            }
        }

        refreshStarDisplay() {
            if (window.gameManager?.updateStarDisplay) {
                window.gameManager.updateStarDisplay();
                return;
            }

            const stars = this.safeStarBalance();
            if (this.dom.starMenuDisplay) {
                this.dom.starMenuDisplay.textContent = `\u2B50 ${stars}`;
            }
            if (this.dom.vendorStarDisplay) {
                this.dom.vendorStarDisplay.textContent = `\u2B50 ${stars}`;
            }
        }

        safeStarBalance() {
            if (typeof window.gameManager?.getStarTokenBalance === 'function') {
                return window.gameManager.getStarTokenBalance();
            }
            if (typeof window.gameManager?.metaStars === 'number') {
                return window.gameManager.metaStars;
            }
            if (typeof window.gameManagerBridge?.metaStars === 'number') {
                return window.gameManagerBridge.metaStars;
            }
            const stored = parseInt(localStorage.getItem('starTokens') || '0', 10);
            return Number.isFinite(stored) ? stored : 0;
        }

        initMenuBackground() {
            const canvas = this.dom.menuBackground;
            if (!canvas || !canvas.getContext) {
                return;
            }

            // Cancel any existing animation
            if (this.menuAnimationFrame) {
                cancelAnimationFrame(this.menuAnimationFrame);
            }

            const ctx = canvas.getContext('2d');

            // Set canvas size and handle resize
            const resizeCanvas = () => {
                const oldWidth = canvas.width;
                const oldHeight = canvas.height;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                // Recreate gradient after resize
                this.menuGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                this.menuGradient.addColorStop(0, '#0a0a1f');
                this.menuGradient.addColorStop(0.5, '#1a0a2f');
                this.menuGradient.addColorStop(1, '#0a0a1f');

                // Reposition stars if resized and stars exist
                if (this.menuStars && oldWidth > 0 && oldHeight > 0) {
                    this.menuStars.forEach(star => {
                        star.x = (star.x / oldWidth) * canvas.width;
                        star.y = (star.y / oldHeight) * canvas.height;
                    });
                }
            };
            resizeCanvas();

            // Only add resize listener once
            if (!this.menuResizeHandler) {
                this.menuResizeHandler = resizeCanvas;
                window.addEventListener('resize', this.menuResizeHandler);
            }

            // Create or reuse stars array
            if (!this.menuStars) {
                const starCount = 200;
                this.menuStars = [];
                for (let i = 0; i < starCount; i++) {
                    this.menuStars.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        size: Math.random() * 2 + 0.5,
                        speed: Math.random() * 0.5 + 0.1,
                        brightness: Math.random() * 0.5 + 0.5,
                        twinkle: Math.random() * Math.PI * 2,
                        // Pre-calculate color strings for performance
                        colorCyan: 'rgba(0, 255, 255, ',
                        colorMagenta: 'rgba(255, 0, 255, '
                    });
                }
            }

            // Animation loop
            const animate = () => {
                if (!this.state.visible) {
                    return;
                }

                // Clear with cached gradient
                ctx.fillStyle = this.menuGradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw grid (static, only once per frame)
                ctx.strokeStyle = 'rgba(138, 0, 255, 0.1)';
                ctx.lineWidth = 1;
                const gridSize = 80;
                ctx.beginPath();
                for (let x = 0; x < canvas.width; x += gridSize) {
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                }
                for (let y = 0; y < canvas.height; y += gridSize) {
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                }
                ctx.stroke();

                // Draw stars - batch rendering for performance
                const time = Date.now() * 0.001;
                const stars = this.menuStars;
                const len = stars.length;

                for (let i = 0; i < len; i++) {
                    const star = stars[i];
                    star.y += star.speed;
                    if (star.y > canvas.height) {
                        star.y = 0;
                        star.x = Math.random() * canvas.width;
                    }

                    // Twinkle effect
                    const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
                    const alpha = star.brightness * twinkle;

                    // Use pre-calculated color strings
                    const colorStr = star.size > 1.5 ? star.colorMagenta : star.colorCyan;
                    ctx.fillStyle = colorStr + alpha + ')';

                    // Only use shadow on larger stars for performance
                    if (star.size > 1.5) {
                        ctx.shadowBlur = star.size * 3;
                        ctx.shadowColor = ctx.fillStyle;
                    }

                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    ctx.fill();

                    if (star.size > 1.5) {
                        ctx.shadowBlur = 0;
                    }
                }

                this.menuAnimationFrame = requestAnimationFrame(animate);
            };

            // Start animation
            animate();
        }

        cleanup() {
            this.clearDynamicListeners();
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    if (this.logger && typeof this.logger.warn === 'function') {
                        this.logger.warn('Failed to remove listener', error);
                    }
                }
            });
            this.eventListeners = [];

            // Clean up menu background animation
            if (this.menuAnimationFrame) {
                cancelAnimationFrame(this.menuAnimationFrame);
                this.menuAnimationFrame = null;
            }
            if (this.menuResizeHandler) {
                window.removeEventListener('resize', this.menuResizeHandler);
                this.menuResizeHandler = null;
            }

            // Clean up cached menu background resources
            this.menuStars = null;
            this.menuGradient = null;
        }
    }

    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.MainMenuController = MainMenuController;
    }
})();

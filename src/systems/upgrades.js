class UpgradeSystem {
    constructor() {
        // Load upgrade definitions from config
        // Fallback to empty array if config not loaded yet
        this.availableUpgrades = window.UPGRADE_DEFINITIONS || [];

        // Warn if config not loaded
        if (!window.UPGRADE_DEFINITIONS) {
            console.warn('! UPGRADE_DEFINITIONS not loaded. Make sure upgrades.config.js is loaded before UpgradeSystem.');
        }

        this.selectedUpgrades = [];
        this.levelUpContainer = document.getElementById('level-up-container');
        this.upgradeOptionsContainer = document.getElementById('upgrade-options');
        this.levelUpActive = false;
        this.levelUpKeyListener = null; // Store reference to listener for cleanup
        this.comboEffects = new Set();

        // Auto-level feature: load from StorageManager
        this.autoLevelEnabled = window.StorageManager.getBoolean('autoLevelEnabled', false);
    }

    resetForNewRun() {
        // Clear any persistent upgrade state between runs
        if (Array.isArray(this.selectedUpgrades)) {
            this.selectedUpgrades.length = 0;
        } else {
            this.selectedUpgrades = [];
        }

        if (this.comboEffects?.clear) {
            this.comboEffects.clear();
        } else {
            this.comboEffects = new Set();
        }

        this.levelUpActive = false;
        this.removeKeyboardShortcuts();

        // Refresh DOM references in case the UI was re-rendered
        this.levelUpContainer = document.getElementById('level-up-container');
        this.upgradeOptionsContainer = document.getElementById('upgrade-options');

        if (this.levelUpContainer) {
            this.levelUpContainer.classList.add('hidden');
        }
        if (this.upgradeOptionsContainer) {
            this.upgradeOptionsContainer.innerHTML = '';
        }
    }
    
    showUpgradeOptions() {
        // Get three random upgrades
        const options = this.getRandomUpgrades(3);

        // Auto-level: immediately select random upgrade if enabled
        // Do this BEFORE setting any state to avoid blocking input
        if (this.autoLevelEnabled && options.length > 0) {
            const randomIndex = Math.floor(Math.random() * options.length);
            const selectedUpgrade = options[randomIndex];

            // Directly apply upgrade without state changes or pausing
            this.applyUpgradeDirectly(selectedUpgrade);
            return;
        }

        // Normal flow: Set level up active state BEFORE pausing the game
        this.levelUpActive = true;

        // Pause game without showing pause menu
        if (window.gameManager && window.gameManager.game) {
            window.gameManager.game.isPaused = true;
        }

        // Clear previous options
        if (this.upgradeOptionsContainer) {
            this.upgradeOptionsContainer.innerHTML = '';
        }

        // Add upgrade options to the DOM
        options.forEach((upgrade, index) => {
            const option = document.createElement('div');
            option.className = 'upgrade-option';
            option.dataset.rarity = upgrade.rarity || 'common';
            option.dataset.index = index + 1; // Store numeric index

            // Create elements safely to prevent XSS
            const shortcutKey = document.createElement('div');
            shortcutKey.className = 'shortcut-key';
            shortcutKey.textContent = (index + 1).toString();

            const upgradeIcon = document.createElement('div');
            upgradeIcon.className = 'upgrade-icon';
            upgradeIcon.textContent = upgrade.icon || '';

            const upgradeName = document.createElement('h3');
            upgradeName.textContent = upgrade.name || '';

            const upgradeDesc = document.createElement('p');
            upgradeDesc.textContent = upgrade.description || '';

            const upgradeRarity = document.createElement('div');
            upgradeRarity.className = 'upgrade-rarity';
            upgradeRarity.textContent = upgrade.rarity || 'common';

            // Append all elements
            option.appendChild(shortcutKey);
            option.appendChild(upgradeIcon);
            option.appendChild(upgradeName);
            option.appendChild(upgradeDesc);
            option.appendChild(upgradeRarity);

            option.addEventListener('click', () => {
                this.selectUpgrade(upgrade);
            });

            this.upgradeOptionsContainer.appendChild(option);
        });

        // Show the level up UI
        if (this.levelUpContainer) {
            this.levelUpContainer.classList.remove('hidden');
        }

        // Add keyboard shortcut listener
        this.addKeyboardShortcuts(options);
    }
    
    applyUpgradeDirectly(upgrade) {
        // Streamlined upgrade application for auto-level (no UI state changes)
        // Apply the core upgrade logic
        this._applyUpgradeCore(upgrade);

        // Show notification with "(Auto)" label for auto-level
        if (window.gameManager?.showFloatingText && window.gameManager?.game?.player) {
            const message = `${upgrade.icon} ${upgrade.name} (Auto)`;
            window.gameManager.showFloatingText(
                message,
                window.gameManager.game.player.x,
                window.gameManager.game.player.y - 50,
                '#3498db',
                20
            );
        }

        // Play a subtle sound for auto-level
        if (window.audioSystem?.play) {
            window.audioSystem.play('levelUp', 0.3); // Lower volume than manual
        }
    }

    _applyUpgradeCore(upgrade) {
        // Core upgrade application logic shared by both manual and auto-level
        const upgradeInstance = this._cloneUpgrade(upgrade);

        // Add to selected upgrades
        this.selectedUpgrades.push(upgradeInstance);

        // Validate player exists before applying upgrade
        const player = window.gameManager?.game?.player;
        if (!player) {
            window.LoggerUtils.warn('Cannot apply upgrade: player not found');
            return;
        }

        // Apply upgrade to player using clean delegation
        const playerUpgrades = window.Game?.PlayerUpgrades;
        if (playerUpgrades && typeof playerUpgrades.apply === 'function') {
            playerUpgrades.apply(player, upgradeInstance);
        } else {
            // Fallback to player method if PlayerUpgrades not available
            player.applyUpgrade(upgradeInstance);
        }

        // Handle special effects
        if (upgradeInstance.specialEffect) {
            this.applySpecialEffect(upgradeInstance);
        }

        // Handle combo effects
        if (upgradeInstance.comboEffects) {
            this.updateComboEffects(upgradeInstance);
        }

        // Track stats
        window.gameManager?.statsManager?.trackSpecialEvent?.('upgrade_chosen');
    }

    _cloneUpgrade(upgrade) {
        if (!upgrade || typeof upgrade !== 'object') {
            return upgrade;
        }

        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(upgrade);
            } catch (error) {
                // Fallback to JSON clone below
            }
        }

        return JSON.parse(JSON.stringify(upgrade));
    }

    addKeyboardShortcuts(upgrades) {
        // Remove existing listener if present
        this.removeKeyboardShortcuts();
        
        // Create new listener
        this.levelUpKeyListener = (e) => {
            // Check if a number key 1-3 was pressed
            if (e.key >= '1' && e.key <= '3') {
                const index = parseInt(e.key) - 1;
                
                // Make sure the index is valid
                if (index >= 0 && index < upgrades.length) {
                    this.selectUpgrade(upgrades[index]);
                }
            }
        };
        
        // Add the listener
        window.addEventListener('keydown', this.levelUpKeyListener);
    }
    
    removeKeyboardShortcuts() {
        // Remove existing listener if present
        if (this.levelUpKeyListener) {
            window.removeEventListener('keydown', this.levelUpKeyListener);
            this.levelUpKeyListener = null;
        }
    }
    
    isLevelUpActive() {
        return this.levelUpActive;
    }

    isAutoLevelEnabled() {
        return this.autoLevelEnabled;
    }

    setAutoLevel(enabled) {
        this.autoLevelEnabled = !!enabled;
        window.StorageManager.setItem('autoLevelEnabled', enabled ? 'true' : 'false');
    }
    
    // Enhanced method to get better quality random upgrades with build path consideration
    getRandomUpgrades(count) {
        // Get all available upgrades that player can select
        const activeWeaponId = window.gameManager?.game?.player?.combat?.weaponManager?.getActiveWeaponId?.();
        const weaponDefinitions = typeof window !== 'undefined' ? (window.WEAPON_DEFINITIONS || {}) : {};
        const activeWeaponDefinition = activeWeaponId ? weaponDefinitions[activeWeaponId] : null;
        const activeWeaponTags = Array.isArray(activeWeaponDefinition?.upgradeTags)
            ? activeWeaponDefinition.upgradeTags
            : [];

        const availableUpgrades = this.availableUpgrades.filter(upgrade => {
            // Exclude any non-stackable upgrade already selected
            if (!upgrade.stackable && this.isUpgradeSelected(upgrade.id)) {
                return false;
            }
            
            // Allow stackable upgrades to appear multiple times
            if (upgrade.stackable === true) {
                // For stackable upgrades, we don't exclude them even if already selected
                // Check if required upgrades are met
                if (upgrade.requires) {
                    return upgrade.requires.every(reqId => this.isUpgradeSelected(reqId));
                }
                return true;
            }
            
            // Exclude already selected one-time upgrades
            if (upgrade.type === 'piercing' && this.isUpgradeSelected('piercing_shot')) {
                return false;
            }
            
            // Check if required upgrades are met
            if (upgrade.requires) {
                return upgrade.requires.every(reqId => this.isUpgradeSelected(reqId));
            }
            
            // If special type is aoe, check if player already has it
            if (upgrade.specialType === 'aoe' && this.isUpgradeSelected('aoe_attack')) {
                return false;
            }

            if (upgrade.weaponTags && upgrade.weaponTags.length > 0) {
                if (!activeWeaponDefinition) {
                    return false;
                }
                const matchesTags = upgrade.weaponTags.some(tag =>
                    activeWeaponTags.includes(tag) || tag === activeWeaponDefinition.id
                );
                if (!matchesTags) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Weight upgrades by rarity and build path
        const weightedOptions = [];
        availableUpgrades.forEach(upgrade => {
            let weight = this.getBaseWeight(upgrade);
            
            // Increase weight for upgrades in the same build path
            const currentPath = this.getCurrentBuildPath();
            if (currentPath && upgrade.buildPath === currentPath) {
                weight *= 1.5;
            }
            
            // Increase weight for synergistic upgrades
            if (upgrade.synergies && upgrade.synergies.some(syn => this.isUpgradeSelected(syn))) {
                weight *= 1.3;
            }
            
            // Increase weight for combo effects
            if (upgrade.comboEffects && upgrade.comboEffects.some(effect => 
                this.comboEffects.has(effect))) {
                weight *= 1.2;
            }

            if (upgrade.weaponTags && upgrade.weaponTags.length > 0 && activeWeaponDefinition) {
                weight *= 1.8;
            }
            
            // Add weighted copies to the pool
            for (let i = 0; i < weight; i++) {
                weightedOptions.push(upgrade);
            }
        });
        
        // Shuffle and select unique upgrades
        const shuffled = this.shuffleArray([...weightedOptions]);
        const selected = [];
        const selectedIds = new Set();
        
        for (const upgrade of shuffled) {
            // For stackable upgrades, we want to still ensure variety in options
            // by not offering the same upgrade twice in one level-up choice
            if (!selectedIds.has(upgrade.id)) {
                selected.push(upgrade);
                selectedIds.add(upgrade.id);
                
                if (selected.length >= count) {
                    break;
                }
            }
        }
        
        return selected;
    }
    
    getBaseWeight(upgrade) {
        const rarity = upgrade.rarity || 'common';
        switch (rarity) {
            case 'common': return 100;
            case 'uncommon': return 50;
            case 'rare': return 25;
            case 'epic': return 10;
            default: return 10;
        }
    }
    
    getCurrentBuildPath() {
        // Get all selected build paths, excluding core and support
        const selectedPaths = this.selectedUpgrades
            .map(upgrade => upgrade.buildPath)
            .filter(path => path && path !== 'core' && path !== 'support');
        
        if (selectedPaths.length === 0) return null;
        
        // Return the most common build path
        const pathCounts = {};
        selectedPaths.forEach(path => {
            pathCounts[path] = (pathCounts[path] || 0) + 1;
        });
        
        return Object.entries(pathCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    isUpgradeSelected(upgradeId) {
        return this.selectedUpgrades.some(u => u.id === upgradeId);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    selectUpgrade(upgrade) {
        // Apply the core upgrade logic (shared with auto-level)
        this._applyUpgradeCore(upgrade);

        // Show special notification for manual selection
        this.showUpgradeNotification(upgrade);

        // Hide the level up UI
        if (this.levelUpContainer) {
            this.levelUpContainer.classList.add('hidden');
        }

        // Clean up keyboard shortcuts
        this.removeKeyboardShortcuts();

        // Reset levelUpActive state
        this.levelUpActive = false;

        // Resume game
        if (window.gameManager && window.gameManager.game) {
            window.gameManager.game.isPaused = false;
        }
    }

    applySpecialEffect(upgrade) {
        const player = window.gameManager.game.player;
        if (!player) return;

        const effectsManager = window.gameManager?.effectsManager || window.gameManager?.game?.effectsManager;

        switch (upgrade.specialEffect) {
            case 'chain_visual':
                // Create lightning effect at player position
                effectsManager?.createSpecialEffect?.('lightning', player.x, player.y, upgrade.chainRange || 175, '#74b9ff');
                break;
            case 'orbit_visual': {
                // Create orbit effect with FastMath optimization
                const FastMath = window.Game?.FastMath;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const { sin, cos } = FastMath ? FastMath.sincos(angle) : { sin: Math.sin(angle), cos: Math.cos(angle) };
                    const x = player.x + cos * (upgrade.orbitRadius || 100);
                    const y = player.y + sin * (upgrade.orbitRadius || 100);
                    effectsManager?.createSpecialEffect?.('circle', x, y, 20, '#9b59b6');
                }
                break;
            }
            case 'ricochet_visual':
                // Create ricochet effect
                effectsManager?.createSpecialEffect?.('ricochet', player.x, player.y, upgrade.bounceRange || 180, '#f39c12');
                break;
            case 'explosion_visual':
                // Create explosion effect
                effectsManager?.createSpecialEffect?.('bossPhase', player.x, player.y, upgrade.explosionRadius || 60, '#e74c3c');
                break;
            case 'magnet_visual': {
                // Create magnet field effect with FastMath optimization
                const FastMath = window.Game?.FastMath;
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const { sin, cos } = FastMath ? FastMath.sincos(angle) : { sin: Math.sin(angle), cos: Math.cos(angle) };
                    const x = player.x + cos * (upgrade.value || 75);
                    const y = player.y + sin * (upgrade.value || 75);
                    effectsManager?.createSpecialEffect?.('circle', x, y, 15, '#3498db');
                }
                break;
            }
            case 'heal_visual':
                // Create healing effect
                effectsManager?.createSpecialEffect?.('random', player.x, player.y, 40, '#2ecc71');
                break;
            case 'armor_visual':
                // Create armor effect
                effectsManager?.createSpecialEffect?.('circle', player.x, player.y, 50, '#95a5a6');
                break;
        }
    }

    updateComboEffects(upgrade) {
        if (upgrade.comboEffects) {
            upgrade.comboEffects.forEach(effect => {
                this.comboEffects.add(effect);
            });
        }
    }

    showUpgradeNotification(upgrade) {
        let message = `${upgrade.name} acquired!`;
        let color = '#3498db';
        
        if (upgrade.specialEffect) {
            message += ` (New effect: ${upgrade.specialEffect})`;
        }
        
        if (this.comboEffects.size > 0) {
            message += `\nActive combos: ${Array.from(this.comboEffects).join(', ')}`;
            color = '#9b59b6';
        }
        
        if (window.gameManager?.showFloatingText && window.gameManager?.game?.player) {
            window.gameManager.showFloatingText(
                message,
                window.gameManager.game.player.x,
                window.gameManager.game.player.y - 50,
                color,
                24
            );
        }
    }
}

// + ARCHITECTURE: Clean delegation pattern implemented
// UpgradeSystem -> PlayerUpgrades.apply() -> Player methods
// This eliminates global state dependencies and improves testability
// Previous prototype monkey patching removed in favor of composition

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.UpgradeSystem = UpgradeSystem;
}

// [A] RESONANT NOTE: XP bonus logic should be moved to XP orb collection logic

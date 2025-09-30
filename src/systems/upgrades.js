class UpgradeSystem {
    constructor() {
        // Load upgrade definitions from config
        // Fallback to empty array if config not loaded yet
        this.availableUpgrades = window.UPGRADE_DEFINITIONS || [];

        // Warn if config not loaded
        if (!window.UPGRADE_DEFINITIONS) {
            console.warn('⚠️ UPGRADE_DEFINITIONS not loaded. Make sure upgrades.config.js is loaded before UpgradeSystem.');
        }

        this.selectedUpgrades = [];
        this.levelUpContainer = document.getElementById('level-up-container');
        this.upgradeOptionsContainer = document.getElementById('upgrade-options');
        this.levelUpActive = false;
        this.levelUpKeyListener = null; // Store reference to listener for cleanup
        this.comboEffects = new Set();
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
        // Set level up active state BEFORE pausing the game
        this.levelUpActive = true;
        
        // Pause game without showing pause menu
        if (window.gameManager && window.gameManager.game) {
            window.gameManager.game.isPaused = true;
        }
        
        // Get three random upgrades
        const options = this.getRandomUpgrades(3);
        
        // Clear previous options
        this.upgradeOptionsContainer.innerHTML = '';
        
        // Add upgrade options to the DOM
        options.forEach((upgrade, index) => {
            const option = document.createElement('div');
            option.className = 'upgrade-option';
            option.dataset.rarity = upgrade.rarity || 'common';
            option.dataset.index = index + 1; // Store numeric index
            
            option.innerHTML = `
                <div class="shortcut-key">${index + 1}</div>
                <div class="upgrade-icon">${upgrade.icon}</div>
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
                <div class="upgrade-rarity">${upgrade.rarity || 'common'}</div>
            `;
            
            option.addEventListener('click', () => {
                this.selectUpgrade(upgrade);
            });
            
            this.upgradeOptionsContainer.appendChild(option);
        });
        
        // Show the level up UI
        this.levelUpContainer.classList.remove('hidden');
        
        // Add keyboard shortcut listener
        this.addKeyboardShortcuts(options);
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
    
    // Enhanced method to get better quality random upgrades with build path consideration
    getRandomUpgrades(count) {
        // Get all available upgrades that player can select
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
        // Add to selected upgrades
        this.selectedUpgrades.push(upgrade);
        
        // Apply upgrade to player using clean delegation (no monkey patching)
        if (window.PlayerUpgrades && window.PlayerUpgrades.apply) {
            window.PlayerUpgrades.apply(window.gameManager.game.player, upgrade);
        } else {
            // Fallback to player method if PlayerUpgrades not available
            window.gameManager.game.player.applyUpgrade(upgrade);
        }
        
        // Handle special effects
        if (upgrade.specialEffect) {
            this.applySpecialEffect(upgrade);
        }

        // Handle combo effects
        if (upgrade.comboEffects) {
            this.updateComboEffects(upgrade);
        }

        window.gameManager?.statsManager?.trackSpecialEvent?.('upgrade_chosen');

        // Show special notification
        this.showUpgradeNotification(upgrade);
        
        // Hide the level up UI
        this.levelUpContainer.classList.add('hidden');
        
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
            case 'orbit_visual':
                // Create orbit effect
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = player.x + Math.cos(angle) * (upgrade.orbitRadius || 100);
                    const y = player.y + Math.sin(angle) * (upgrade.orbitRadius || 100);
                    effectsManager?.createSpecialEffect?.('circle', x, y, 20, '#9b59b6');
                }
                break;
            case 'ricochet_visual':
                // Create ricochet effect
                effectsManager?.createSpecialEffect?.('ricochet', player.x, player.y, upgrade.bounceRange || 180, '#f39c12');
                break;
            case 'explosion_visual':
                // Create explosion effect
                effectsManager?.createSpecialEffect?.('bossPhase', player.x, player.y, upgrade.explosionRadius || 60, '#e74c3c');
                break;
            case 'magnet_visual':
                // Create magnet field effect
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const x = player.x + Math.cos(angle) * (upgrade.value || 75);
                    const y = player.y + Math.sin(angle) * (upgrade.value || 75);
                    effectsManager?.createSpecialEffect?.('circle', x, y, 15, '#3498db');
                }
                break;
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

// 🤖 RESONANT NOTE: Prototype modification creates tight coupling
// TODO: Move this logic to PlayerUpgrades.apply() for better encapsulation
// This pattern should be avoided in favor of composition over modification

// 🤖 RESONANT NOTE: Removed deprecated prototype monkey patching - now uses direct delegation
// Clean architecture: UpgradeSystem -> PlayerUpgrades.apply() -> Player methods
// This eliminates global state dependencies and improves testability

// Make globally available
if (typeof window !== 'undefined') {
    window.UpgradeSystem = UpgradeSystem;
}

// 🤖 RESONANT NOTE: XP bonus logic should be moved to XP orb collection logic

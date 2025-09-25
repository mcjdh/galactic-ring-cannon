class UpgradeSystem {
    constructor() {
        this.availableUpgrades = [
            // Core Stats (Common)
            {
                id: 'attack_speed_1',
                name: 'Quick Shot',
                description: '30% faster attacks',
                type: 'attackSpeed',
                multiplier: 1.30,
                icon: '⚡',
                rarity: 'common',
                buildPath: 'core'
            },
            {
                id: 'attack_damage_1',
                name: 'Sharp Shots',
                description: '35% more damage',
                type: 'attackDamage',
                multiplier: 1.35,
                icon: '🗡️',
                rarity: 'common',
                buildPath: 'core'
            },
            {
                id: 'max_health_1',
                name: 'Vitality',
                description: '25% more health',
                type: 'maxHealth',
                multiplier: 1.25,
                icon: '❤️',
                rarity: 'common',
                buildPath: 'core'
            },
            {
                id: 'movement_speed_1',
                name: 'Swift Feet',
                description: '20% faster movement',
                type: 'speed',
                multiplier: 1.2,
                icon: '👟',
                rarity: 'common',
                buildPath: 'core'
            },

            // Projectile Modifiers
            {
                id: 'multi_shot_1',
                name: 'Split Shot',
                description: 'Fire an additional projectile',
                type: 'projectileCount',
                value: 1,
                icon: '🔱',
                rarity: 'uncommon',
                buildPath: 'core',
                stackable: true
            },
            {
                id: 'spread_shot_1',
                name: 'Wide Spread',
                description: 'Increase projectile spread by 15°',
                type: 'projectileSpread',
                value: 15,
                icon: '↔️',
                rarity: 'common',
                buildPath: 'core',
                comboEffects: ['ricochet', 'chain'],
                specialEffect: 'increased_bounce_angle' // Better ricochet angles
            },
            {
                id: 'piercing_shot',
                name: 'Piercing Shot',
                description: 'Projectiles penetrate through enemies',
                type: 'piercing',
                value: 1, // Number of enemies projectile can pierce through
                icon: '🔪',
                rarity: 'rare',
                buildPath: 'core',
                comboEffects: ['chain', 'explosive'],
                specialEffect: 'chain_through_pierced' // Can chain through pierced enemies
            },

            // Chain Lightning Build Path
            {
                id: 'chain_lightning_1',
                name: 'Chain Lightning',
                description: 'Projectiles have a 40% chance to chain to a nearby enemy',
                type: 'special',
                specialType: 'chain',
                value: 0.4,
                chainDamage: 0.8,
                chainRange: 175,
                maxChains: 1,
                icon: '⚡',
                rarity: 'rare',
                buildPath: 'chain',
                synergies: ['attack_speed_1', 'attack_damage_1'],
                specialEffect: 'chain_visual' // Adds lightning visual effect
            },
            {
                id: 'chain_lightning_2',
                name: 'Improved Chains',
                description: 'Chain chance increased to 60% and can hit one more target',
                type: 'chain',
                value: 0.6,
                maxChains: 2,
                icon: '⚡⚡',
                rarity: 'rare',
                requires: ['chain_lightning_1'],
                buildPath: 'chain',
                specialEffect: 'chain_visual_enhanced' // Enhanced lightning visuals
            },
            {
                id: 'chain_damage',
                name: 'Conductive Strike',
                description: 'Chain lightning deals 100% of the original damage',
                type: 'chainDamage',
                value: 1.0,
                icon: '⚡💥',
                rarity: 'uncommon',
                requires: ['chain_lightning_1'],
                buildPath: 'chain',
                specialEffect: 'chain_explosion' // Small explosion on chain
            },

            // Orbital Build Path
            {
                id: 'orbit_attack_1',
                name: 'Orbital Projectiles',
                description: 'Projectiles orbit around you, dealing damage to nearby enemies',
                type: 'special',
                specialType: 'orbit',
                orbitRadius: 100,
                orbitSpeed: 2,
                damage: 0.5,
                icon: '🔄',
                rarity: 'rare',
                buildPath: 'orbit',
                synergies: ['attack_speed_1', 'multi_shot_1'],
                specialEffect: 'orbit_visual' // Adds orbit trail effect
            },
            {
                id: 'orbit_attack_2',
                name: 'Double Orbit',
                description: 'Add a second orbiting projectile',
                type: 'orbit',
                value: 1,
                icon: '🔄🔄',
                rarity: 'rare',
                requires: ['orbit_attack_1'],
                buildPath: 'orbit',
                specialEffect: 'orbit_sync' // Orbits sync for double damage
            },
            {
                id: 'orbit_damage',
                name: 'Orbital Impact',
                description: 'Orbiting projectiles deal 40% more damage',
                type: 'orbitDamage',
                multiplier: 1.4,
                icon: '🔄💥',
                rarity: 'uncommon',
                requires: ['orbit_attack_1'],
                buildPath: 'orbit',
                specialEffect: 'orbit_pulse' // Adds damage pulse effect
            },

            // Ricochet Build Path
            {
                id: 'ricochet_1',
                name: 'Ricochet Shot',
                description: '25% chance for projectiles to bounce to a new target once',
                type: 'special',
                specialType: 'ricochet',
                bounces: 1,
                bounceRange: 180,
                bounceDamage: 0.8,
                icon: '↩️',
                rarity: 'rare',
                buildPath: 'ricochet',
                synergies: ['attack_damage_1', 'spread_shot_1'],
                specialEffect: 'ricochet_visual' // Adds bounce trail effect
            },
            {
                id: 'ricochet_2',
                name: 'Multi-Bounce',
                description: 'Projectiles can bounce one additional time',
                type: 'ricochetBounces',
                value: 1,
                icon: '↩️↩️',
                rarity: 'rare',
                requires: ['ricochet_1'],
                buildPath: 'ricochet',
                specialEffect: 'ricochet_chain' // Can chain between bounces
            },
            {
                id: 'ricochet_damage',
                name: 'Momentum Transfer',
                description: 'Ricochets deal 100% damage instead of reduced damage',
                type: 'ricochetDamage',
                value: 1.0,
                icon: '↩️💥',
                rarity: 'uncommon',
                requires: ['ricochet_1'],
                buildPath: 'ricochet',
                specialEffect: 'ricochet_explosion' // Small explosion on bounce
            },

            // Explosive Build Path
            {
                id: 'explosive_shots_1',
                name: 'Explosive Rounds',
                description: '30% chance for projectiles to explode on impact, dealing area damage',
                type: 'special',
                specialType: 'explosion',
                explosionRadius: 60,
                explosionDamage: 0.5,
                icon: '💥',
                rarity: 'rare',
                buildPath: 'explosive',
                synergies: ['attack_damage_1', 'multi_shot_1'],
                specialEffect: 'explosion_visual' // Enhanced explosion visuals
            },
            {
                id: 'explosive_shots_2',
                name: 'Bigger Explosions',
                description: 'Explosion radius increased by 40%',
                type: 'explosionSize',
                multiplier: 1.4,
                icon: '💥↔️',
                rarity: 'uncommon',
                requires: ['explosive_shots_1'],
                buildPath: 'explosive',
                specialEffect: 'explosion_knockback' // Adds knockback effect
            },
            {
                id: 'explosive_shots_3',
                name: 'Devastating Blasts',
                description: 'Explosions deal 75% of hit damage (up from 50%)',
                type: 'explosionDamage',
                value: 0.75,
                icon: '💥💥',
                rarity: 'rare',
                requires: ['explosive_shots_1'],
                buildPath: 'explosive',
                specialEffect: 'explosion_chain' // Can trigger chain reactions
            },

            // Support Upgrades
            {
                id: 'magnet_1',
                name: 'Magnetic Field',
                description: '+75% XP attraction radius',
                type: 'magnet',
                value: 75,
                icon: '🧲',
                rarity: 'uncommon',
                buildPath: 'support',
                specialEffect: 'magnet_visual' // Shows magnet field effect
            },
            {
                id: 'regeneration_1',
                name: 'Regeneration',
                description: 'Recover 1.5 health per second',
                type: 'regeneration',
                value: 1.5,
                icon: '🌱',
                rarity: 'uncommon',
                buildPath: 'support',
                specialEffect: 'heal_visual' // Shows healing particles
            },
            {
                id: 'damage_reduction_1',
                name: 'Armor',
                description: 'Reduce damage taken by 15%',
                type: 'damageReduction',
                value: 0.15,
                icon: '🛡️',
                rarity: 'uncommon',
                buildPath: 'support',
                specialEffect: 'armor_visual' // Shows damage reduction effect
            }
        ];
        
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

        switch (upgrade.specialEffect) {
            case 'chain_visual':
                // Create lightning effect at player position
                window.gameManager.createSpecialEffect('lightning', player.x, player.y, upgrade.chainRange || 175, '#74b9ff');
                break;
            case 'orbit_visual':
                // Create orbit effect
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = player.x + Math.cos(angle) * (upgrade.orbitRadius || 100);
                    const y = player.y + Math.sin(angle) * (upgrade.orbitRadius || 100);
                    window.gameManager.createSpecialEffect('circle', x, y, 20, '#9b59b6');
                }
                break;
            case 'ricochet_visual':
                // Create ricochet effect
                window.gameManager.createSpecialEffect('ricochet', player.x, player.y, upgrade.bounceRange || 180, '#f39c12');
                break;
            case 'explosion_visual':
                // Create explosion effect
                window.gameManager.createSpecialEffect('bossPhase', player.x, player.y, upgrade.explosionRadius || 60, '#e74c3c');
                break;
            case 'magnet_visual':
                // Create magnet field effect
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const x = player.x + Math.cos(angle) * (upgrade.value || 75);
                    const y = player.y + Math.sin(angle) * (upgrade.value || 75);
                    window.gameManager.createSpecialEffect('circle', x, y, 15, '#3498db');
                }
                break;
            case 'heal_visual':
                // Create healing effect
                window.gameManager.createSpecialEffect('random', player.x, player.y, 40, '#2ecc71');
                break;
            case 'armor_visual':
                // Create armor effect
                window.gameManager.createSpecialEffect('circle', player.x, player.y, 50, '#95a5a6');
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

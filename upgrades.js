class UpgradeSystem {
    constructor() {
        this.availableUpgrades = [
            {
                id: 'attack_speed_1',
                name: 'Quick Shot',
                description: '25% faster attacks', // Increased from 20%
                type: 'attackSpeed',
                multiplier: 1.25,
                icon: '⚡',
                rarity: 'common'
            },
            {
                id: 'attack_speed_2',
                name: 'Lightning Shot',
                description: '35% faster attacks', // Increased from 30%
                type: 'attackSpeed',
                multiplier: 1.35,
                icon: '⚡⚡',
                rarity: 'uncommon',
                requires: ['attack_speed_1']
            },
            {
                id: 'attack_speed_3', // New tier
                name: 'Thunder Shot',
                description: '45% faster attacks',
                type: 'attackSpeed',
                multiplier: 1.45,
                icon: '⚡⚡⚡',
                rarity: 'rare',
                requires: ['attack_speed_2']
            },
            {
                id: 'attack_damage_1',
                name: 'Sharp Shots',
                description: '30% more damage', // Increased from 25%
                type: 'attackDamage',
                multiplier: 1.3,
                icon: '🗡️',
                rarity: 'common'
            },
            {
                id: 'attack_damage_2',
                name: 'Lethal Shots',
                description: '40% more damage', // Increased from 35%
                type: 'attackDamage',
                multiplier: 1.4,
                icon: '🗡️🗡️',
                rarity: 'uncommon',
                requires: ['attack_damage_1']
            },
            {
                id: 'attack_damage_3', // New tier
                name: 'Deadly Shots',
                description: '50% more damage',
                type: 'attackDamage',
                multiplier: 1.5,
                icon: '🗡️🗡️🗡️',
                rarity: 'rare',
                requires: ['attack_damage_2']
            },
            {
                id: 'multi_shot_1',
                name: 'Split Shot',
                description: 'Fire an additional projectile (+1 projectile)',
                type: 'projectileCount',
                value: 1,
                icon: '🔱',
                rarity: 'uncommon',
                stackable: true  // Allow this upgrade to be selected multiple times
            },
            {
                id: 'multi_shot_2',
                name: 'Triple Shot',
                description: 'Fire two additional projectiles (+2 projectiles)',
                type: 'projectileCount',
                value: 2,
                icon: '🔱🔱',
                rarity: 'rare',
                stackable: true  // Allow this upgrade to be selected multiple times
            },
            {
                id: 'multi_shot_3',
                name: 'Shotgun Blast',
                description: 'Fire three additional projectiles (+3 projectiles)',
                type: 'projectileCount',
                value: 3,
                icon: '🔱🔱🔱',
                rarity: 'epic',
                stackable: true  // Allow this upgrade to be selected multiple times
            },
            {
                id: 'spread_shot_1',
                name: 'Wide Spread',
                description: 'Increase projectile spread by 15°',
                type: 'projectileSpread',
                value: 15,
                icon: '↔️',
                rarity: 'common'
            },
            {
                id: 'spread_shot_2', // New upgrade
                name: 'Wider Spread',
                description: 'Increase projectile spread by 10° more',
                type: 'projectileSpread',
                value: 10,
                icon: '↔️↔️',
                rarity: 'uncommon',
                requires: ['spread_shot_1']
            },
            {
                id: 'piercing_shot',
                name: 'Piercing Shot',
                description: 'Projectiles penetrate through enemies',
                type: 'piercing',
                icon: '🔪',
                rarity: 'rare'
            },
            {
                id: 'movement_speed_1',
                name: 'Swift Feet',
                description: '20% faster movement', // Increased from 15%
                type: 'speed',
                multiplier: 1.2,
                icon: '👟',
                rarity: 'common'
            },
            {
                id: 'movement_speed_2',
                name: 'Sonic Speed',
                description: '25% faster movement', // Increased from 20%
                type: 'speed',
                multiplier: 1.25,
                icon: '👟👟',
                rarity: 'uncommon',
                requires: ['movement_speed_1']
            },
            {
                id: 'max_health_1',
                name: 'Vitality',
                description: '25% more health', // Increased from 20%
                type: 'maxHealth',
                multiplier: 1.25,
                icon: '❤️',
                rarity: 'common'
            },
            {
                id: 'max_health_2',
                name: 'Fortitude',
                description: '30% more health', // Increased from 25%
                type: 'maxHealth',
                multiplier: 1.3,
                icon: '❤️❤️',
                rarity: 'uncommon',
                requires: ['max_health_1']
            },
            {
                id: 'max_health_3', // New tier
                name: 'Iron Constitution',
                description: '40% more health',
                type: 'maxHealth',
                multiplier: 1.4,
                icon: '❤️❤️❤️',
                rarity: 'rare',
                requires: ['max_health_2']
            },
            {
                id: 'crit_chance_1',
                name: 'Keen Eye',
                description: '+8% critical hit chance', // Increased from 5%
                type: 'critChance',
                value: 0.08,
                icon: '🎯',
                rarity: 'uncommon'
            },
            {
                id: 'crit_chance_2', // New tier
                name: 'Eagle Eye',
                description: '+12% critical hit chance',
                type: 'critChance',
                value: 0.12,
                icon: '🎯🎯',
                rarity: 'rare',
                requires: ['crit_chance_1']
            },
            {
                id: 'crit_damage_1',
                name: 'Lethal Strike',
                description: '+50% critical damage',
                type: 'critDamage',
                value: 0.5,
                icon: '💥',
                rarity: 'rare'
            },
            {
                id: 'crit_damage_2', // New tier
                name: 'Devastating Strike',
                description: '+75% critical damage',
                type: 'critDamage',
                value: 0.75,
                icon: '💥💥',
                rarity: 'rare',
                requires: ['crit_damage_1']
            },
            {
                id: 'regeneration_1',
                name: 'Regeneration',
                description: 'Recover 1.5 health per second', // Increased from 1
                type: 'regeneration',
                value: 1.5,
                icon: '🌱',
                rarity: 'uncommon'
            },
            {
                id: 'regeneration_2',
                name: 'Enhanced Regeneration',
                description: 'Recover 2.5 additional health per second', // Increased from 2
                type: 'regeneration',
                value: 2.5,
                icon: '🌿',
                rarity: 'rare',
                requires: ['regeneration_1']
            },
            {
                id: 'magnet_1',
                name: 'Magnetic Field',
                description: '+75% XP attraction radius', // Increased from 50%
                type: 'magnet',
                value: 75,
                icon: '🧲',
                rarity: 'uncommon'
            },
            {
                id: 'magnet_2', // New tier
                name: 'Powerful Magnet',
                description: '+100% XP attraction radius',
                type: 'magnet',
                value: 100,
                icon: '🧲🧲',
                rarity: 'rare',
                requires: ['magnet_1']
            },
            {
                id: 'aoe_attack',
                name: 'Area Attack',
                description: 'Periodically damage all enemies around you',
                type: 'special',
                specialType: 'aoe',
                icon: '⭕',
                rarity: 'rare'
            },
            {
                id: 'projectile_speed', // New upgrade
                name: 'Swift Projectiles',
                description: '30% faster projectiles',
                type: 'projectileSpeed',
                multiplier: 1.3,
                icon: '🏹',
                rarity: 'common'
            },
            {
                id: 'projectile_speed_2',
                name: 'Supersonic Projectiles',
                description: '40% faster projectiles',
                type: 'projectileSpeed',
                multiplier: 1.4,
                icon: '🏹🏹',
                rarity: 'uncommon',
                requires: ['projectile_speed']
            },
            {
                id: 'damage_reduction', // New upgrade
                name: 'Armor',
                description: 'Reduce damage taken by 15%',
                type: 'damageReduction',
                value: 0.15,
                icon: '🛡️',
                rarity: 'uncommon'
            },
            {
                id: 'damage_reduction_2',
                name: 'Heavy Armor',
                description: 'Reduce damage taken by additional 15%',
                type: 'damageReduction',
                value: 0.15,
                icon: '🛡️🛡️',
                rarity: 'rare',
                requires: ['damage_reduction']
            },
            // Add new dodge-related upgrades
            {
                id: 'dodge_cooldown',
                name: 'Quick Reflexes',
                description: '30% faster dodge cooldown',
                type: 'dodgeCooldown',
                multiplier: 0.7, // Reduces cooldown by 30%
                icon: '💨',
                rarity: 'uncommon'
            },
            {
                id: 'dodge_duration',
                name: 'Extended Dash',
                description: '50% longer dodge duration',
                type: 'dodgeDuration',
                multiplier: 1.5,
                icon: '🌪️',
                rarity: 'rare',
                requires: ['dodge_cooldown']
            },
            {
                id: 'dodge_invulnerability',
                name: 'Phase Shift',
                description: 'Remain invulnerable for 1s after dodge',
                type: 'dodgeInvulnerability',
                value: 1, // Extra second of invulnerability
                icon: '👻',
                rarity: 'epic',
                requires: ['dodge_duration']
            }
        ];
        
        this.selectedUpgrades = [];
        this.levelUpContainer = document.getElementById('level-up-container');
        this.upgradeOptionsContainer = document.getElementById('upgrade-options');
        this.levelUpActive = false;
        this.levelUpKeyListener = null; // Store reference to listener for cleanup
    }
    
    showUpgradeOptions() {
        // Set level up active state BEFORE pausing the game
        this.levelUpActive = true;
        
        // Pause game without showing pause menu
        if (gameManager && gameManager.game) {
            gameManager.game.isPaused = true;
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
    
    getRandomUpgrades(count) {
        // Get all available upgrades that player can select
        const availableUpgrades = this.availableUpgrades.filter(upgrade => {
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
        
        // Weight upgrades by rarity
        const weightedOptions = [];
        availableUpgrades.forEach(upgrade => {
            const rarity = upgrade.rarity || 'common';
            let weight;
            
            switch (rarity) {
                case 'common': weight = 100; break;
                case 'uncommon': weight = 50; break;
                case 'rare': weight = 25; break;
                default: weight = 10;
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
        
        // Apply upgrade to player
        gameManager.game.player.applyUpgrade(upgrade);
        
        // Hide the level up UI
        this.levelUpContainer.classList.add('hidden');
        
        // Clean up keyboard shortcuts
        this.removeKeyboardShortcuts();
        
        // Reset levelUpActive state BEFORE resuming game
        this.levelUpActive = false;
        
        // Resume game directly without going through togglePause logic
        if (gameManager && gameManager.game) {
            gameManager.game.isPaused = false;
        }
    }
}

// Remove this duplicate implementation to avoid conflicts
// Keep only the one in player.js
// Player.prototype.applyUpgrade = function(upgrade) { ... };

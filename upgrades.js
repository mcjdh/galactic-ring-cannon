class UpgradeSystem {
    constructor() {
        this.availableUpgrades = [
            // Make early game upgrades more impactful
            {
                id: 'attack_speed_1',
                name: 'Quick Shot',
                description: '30% faster attacks', // Increased from 25%
                type: 'attackSpeed',
                multiplier: 1.30,
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
                description: '35% more damage', // Increased from 30%
                type: 'attackDamage',
                multiplier: 1.35,
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
            // Make dodge more useful early
            {
                id: 'dodge_cooldown',
                name: 'Quick Reflexes',
                description: '35% faster dodge cooldown', // Improved from 30%
                type: 'dodgeCooldown',
                multiplier: 0.65, // Reduced from 0.7 (better cooldown reduction)
                icon: '💨',
                rarity: 'common' // Changed from uncommon to make available earlier
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
            },
            
            // Orbit Build Path - projectiles that orbit around the player
            {
                id: 'orbit_attack_1',
                name: 'Orbital Shield',
                description: 'Projectiles orbit around you, damaging enemies they contact',
                type: 'special',
                specialType: 'orbit',
                value: 1, // 1 orbiting projectile
                orbDamage: 0.4, // 40% of base damage
                orbSpeed: 2, // rotation speed
                orbRadius: 80, // distance from player
                icon: '🔄',
                rarity: 'rare'
            },
            {
                id: 'orbit_attack_2',
                name: 'Double Orbit',
                description: 'Add a second orbiting projectile',
                type: 'orbit',
                value: 1,
                icon: '🔄🔄',
                rarity: 'rare',
                requires: ['orbit_attack_1']
            },
            {
                id: 'orbit_attack_3',
                name: 'Orbital Swarm',
                description: 'Add two more orbiting projectiles',
                type: 'orbit',
                value: 2,
                icon: '🔄🔄🔄',
                rarity: 'epic',
                requires: ['orbit_attack_2']
            },
            {
                id: 'orbit_damage',
                name: 'Orbital Impact',
                description: 'Orbiting projectiles deal 40% more damage',
                type: 'orbitDamage',
                multiplier: 1.4,
                icon: '🔄💥',
                rarity: 'uncommon',
                requires: ['orbit_attack_1']
            },
            {
                id: 'orbit_speed',
                name: 'Rapid Orbit',
                description: 'Orbiting projectiles rotate 30% faster',
                type: 'orbitSpeed',
                multiplier: 1.3,
                icon: '🔄⚡',
                rarity: 'uncommon',
                requires: ['orbit_attack_1']
            },
            {
                id: 'orbit_size',
                name: 'Expanded Orbit',
                description: 'Orbiting projectiles circle at a greater distance',
                type: 'orbitSize',
                value: 30, // +30 to orbit radius
                icon: '🔄↔️',
                rarity: 'uncommon',
                requires: ['orbit_attack_1']
            },
            
            // Chain Lightning Build Path
            {
            id: 'chain_lightning_1',
                name: 'Chain Lightning',
                description: 'Projectiles have a 40% chance to chain to a nearby enemy',
                type: 'special',
                specialType: 'chain',
                value: 0.4, // 40% chain chance (buffed)
                chainDamage: 0.8, // 80% of original damage (buffed)
                chainRange: 175, // increased chain distance (buffed)
                maxChains: 1, // can hit one additional enemy
                icon: '⚡',
                rarity: 'rare'
            },
            {
                id: 'chain_lightning_2',
                name: 'Improved Chains',
                description: 'Chain chance increased to 60% and can hit one more target',
                type: 'chain',
                value: 0.6, // increased from 50%
                maxChains: 2,
                icon: '⚡⚡',
                rarity: 'rare',
                requires: ['chain_lightning_1']
            },
            {
                id: 'chain_lightning_3',
                name: 'Lightning Storm',
                description: 'Chain chance increased to 80% and can hit multiple targets',
                type: 'chain',
                value: 0.8, // increased from 70%
                maxChains: 4, // can hit up to 4 additional enemies
                icon: '⚡⚡⚡',
                rarity: 'epic',
                requires: ['chain_lightning_2']
            },
            {
                id: 'chain_damage',
                name: 'Conductive Strike',
                description: 'Chain lightning deals 100% of the original damage instead of 70%',
                type: 'chainDamage',
                value: 1.0, // increased from 85%
                icon: '⚡💥',
                rarity: 'uncommon',
                requires: ['chain_lightning_1']
            },
            {
                id: 'chain_range',
                name: 'Extended Discharge',
                description: 'Chain lightning can jump 75% further between enemies',
                type: 'chainRange',
                multiplier: 1.75, // increased from 1.5
                icon: '⚡↔️',
                rarity: 'uncommon',
                requires: ['chain_lightning_1']
            },
            
            // Explosion Build Path
            {
                id: 'explosive_shots_1',
                name: 'Explosive Rounds',
                description: 'Projectiles explode on impact, dealing area damage',
                type: 'special',
                specialType: 'explosion',
                explosionRadius: 60,
                explosionDamage: 0.5, // 50% of hit damage as explosion
                icon: '💥',
                rarity: 'rare'
            },
            {
                id: 'explosive_shots_2',
                name: 'Bigger Explosions',
                description: 'Explosion radius increased by 40%',
                type: 'explosionSize',
                multiplier: 1.4,
                icon: '💥↔️',
                rarity: 'uncommon',
                requires: ['explosive_shots_1']
            },
            {
                id: 'explosive_shots_3',
                name: 'Devastating Blasts',
                description: 'Explosions deal 75% of hit damage instead of 50%',
                type: 'explosionDamage',
                value: 0.75,
                icon: '💥💥',
                rarity: 'rare',
                requires: ['explosive_shots_1']
            },
            {
                id: 'explosive_chain',
                name: 'Chain Reaction',
                description: 'Enemies killed by explosions have a 30% chance to explode',
                type: 'explosionChain',
                value: 0.3,
                icon: '💥🔄',
                rarity: 'epic',
                requires: ['explosive_shots_1']
            },
            
            // Lifesteal Build Path
            {
                id: 'lifesteal_1',
                name: 'Life Drain',
                description: 'Heal for 5% of damage dealt',
                type: 'lifesteal',
                value: 0.05,
                icon: '❤️🧛',
                rarity: 'rare'
            },
            {
                id: 'lifesteal_2',
                name: 'Vampiric Touch',
                description: 'Heal for an additional 7% of damage dealt',
                type: 'lifesteal',
                value: 0.07,
                icon: '❤️🧛🧛',
                rarity: 'rare',
                requires: ['lifesteal_1']
            },
            {
                id: 'lifesteal_crit',
                name: 'Critical Drain',
                description: 'Critical hits heal for double the lifesteal amount',
                type: 'lifestealCrit',
                multiplier: 2,
                icon: '❤️🎯',
                rarity: 'epic',
                requires: ['lifesteal_1', 'crit_chance_1']
            },
            {
                id: 'lifesteal_aoe',
                name: 'AOE Drain',
                description: 'AOE attacks also benefit from lifesteal',
                type: 'lifestealAOE',
                value: true,
                icon: '❤️⭕',
                rarity: 'rare',
                requires: ['lifesteal_1', 'aoe_attack']
            },
            
            // Ricocheting Build Path
            {
                id: 'ricochet_1',
                name: 'Ricochet Shot',
                description: 'Projectiles can bounce to a new target once',
                type: 'special',
                specialType: 'ricochet',
                bounces: 1,
                bounceRange: 180,
                bounceDamage: 0.8, // 80% damage on bounce
                icon: '↩️',
                rarity: 'rare'
            },
            {
                id: 'ricochet_2',
                name: 'Multi-Bounce',
                description: 'Projectiles can bounce one additional time',
                type: 'ricochetBounces',
                value: 1,
                icon: '↩️↩️',
                rarity: 'rare',
                requires: ['ricochet_1']
            },
            {
                id: 'ricochet_3',
                name: 'Pinball Wizard',
                description: 'Projectiles can bounce two additional times',
                type: 'ricochetBounces',
                value: 2,
                icon: '↩️↩️↩️',
                rarity: 'epic',
                requires: ['ricochet_2']
            },
            {
                id: 'ricochet_damage',
                name: 'Momentum Transfer',
                description: 'Ricochets deal 100% damage instead of 80%',
                type: 'ricochetDamage',
                value: 1.0,
                icon: '↩️💥',
                rarity: 'uncommon',
                requires: ['ricochet_1']
            },
            // Add new fun upgrade option
            {
                id: 'lucky_shots',
                name: 'Lucky Shots',
                description: '+5% critical chance and enemies drop more XP',
                type: 'special',
                specialType: 'lucky',
                critBonus: 0.05,
                xpBonus: 0.2, // 20% more XP from enemies
                icon: '🍀',
                rarity: 'uncommon'
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
    
    // Enhanced method to get better quality random upgrades
    getRandomUpgrades(count) {
        // Get all available upgrades that player can select
        const availableUpgrades = this.availableUpgrades.filter(upgrade => {
            // For stackable upgrades, implement stacking limits
            if (upgrade.stackable === true) {
                // Check how many times this upgrade has been selected already
                const stackCount = this.player.upgrades.filter(u => u.id === upgrade.id).length;
                
                // Apply stacking limits based on rarity
                const stackLimit = this.getStackLimit(upgrade);
                if (stackCount >= stackLimit) {
                    return false;
                }
                
                // Check if required upgrades are met
                if (upgrade.requires) {
                    return upgrade.requires.every(reqId => this.isUpgradeSelected(reqId));
                }
                return true;
            }
            
            // Handle non-stackable upgrades (existing logic)
            if (this.isUpgradeSelected(upgrade.id)) {
                return false;
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
        
        // Weight upgrades by rarity and current composition
        const weightedOptions = [];
        availableUpgrades.forEach(upgrade => {
            const rarity = upgrade.rarity || 'common';
            let weight;
            
            switch (rarity) {
                case 'common': weight = 100; break;
                case 'uncommon': weight = 50; break;
                case 'rare': weight = 25; break;
                case 'epic': weight = 10; break;
                default: weight = 10;
            }
            
            // Adjust weight for stackable upgrades based on how many times they've been chosen
            if (upgrade.stackable) {
                const stackCount = this.player.upgrades.filter(u => u.id === upgrade.id).length;
                if (stackCount > 0) {
                    // Reduce weight for already stacked upgrades
                    weight = Math.floor(weight * Math.pow(0.8, stackCount));
                }
            }
            
            // Slightly prefer upgrades that complement existing ones
            if (this.isComplementaryUpgrade(upgrade)) {
                weight = Math.floor(weight * 1.2);
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
                // Create a deep copy of the upgrade
                const upgradeCopy = JSON.parse(JSON.stringify(upgrade));
                
                // Add stack info for UI display
                const stackCount = this.player.upgrades.filter(u => u.id === upgrade.id).length;
                if (stackCount > 0) {
                    const tiers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
                    upgradeCopy.tier = tiers[Math.min(stackCount, tiers.length - 1)];
                    upgradeCopy.displayName = `${upgrade.name} ${upgradeCopy.tier}`;
                    
                    // Enhance description to show stacking effect
                    upgradeCopy.description = this.getStackedDescription(upgrade, stackCount + 1);
                    
                    // Mark as stacked for UI highlighting
                    upgradeCopy.isStacked = true;
                    upgradeCopy.stackCount = stackCount;
                }
                
                selected.push(upgradeCopy);
                selectedIds.add(upgrade.id);
                
                if (selected.length >= count) {
                    break;
                }
            }
        }
        
        return selected;
    }
    
    // Helper to determine stack limits based on rarity
    getStackLimit(upgrade) {
        const rarity = upgrade.rarity || 'common';
        switch (rarity) {
            case 'common': return 5;
            case 'uncommon': return 4;
            case 'rare': return 3;
            case 'epic': return 2;
            default: return 3;
        }
    }
    
    // Helper to check if an upgrade complements existing upgrades
    isComplementaryUpgrade(upgrade) {
        // Check if player has upgrades that synergize with this one
        const playerUpgradeTypes = this.player.upgrades.map(u => u.type);
        
        // Some example synergies
        if (upgrade.type === 'critDamage' && playerUpgradeTypes.includes('critChance')) {
            return true;
        }
        if (upgrade.type === 'projectileCount' && playerUpgradeTypes.includes('attackDamage')) {
            return true;
        }
        if (upgrade.type === 'attackSpeed' && playerUpgradeTypes.includes('lifesteal')) {
            return true;
        }
        // Add more synergy checks as needed
        
        return false;
    }
    
    // Generate descriptive text for stacked upgrades
    getStackedDescription(upgrade, newStack) {
        let description = upgrade.description || '';
        
        // Add stacking info based on upgrade type
        switch (upgrade.type) {
            case 'attackSpeed':
                // Calculate compounded effect
                const speedMultiplier = Math.pow(upgrade.multiplier, newStack);
                const percentIncrease = Math.round((speedMultiplier - 1) * 100);
                description += ` (Total: +${percentIncrease}% attack speed)`;
                break;
                
            case 'attackDamage':
                // Calculate compounded effect
                const damageMultiplier = Math.pow(upgrade.multiplier, newStack);
                const damageIncrease = Math.round((damageMultiplier - 1) * 100);
                description += ` (Total: +${damageIncrease}% damage)`;
                break;
                
            case 'critChance':
                const totalCrit = Math.round(upgrade.value * newStack * 100);
                description += ` (Total: +${totalCrit}% chance)`;
                break;
                
            case 'critDamage':
                const totalCritDmg = (upgrade.value * newStack).toFixed(1);
                description += ` (Total: +${totalCritDmg}x)`;
                break;
                
            case 'projectileCount':
                const totalProjectiles = upgrade.value * newStack;
                description += ` (Total: ${totalProjectiles})`;
                break;
                
            // Add cases for other stackable upgrade types
        }
        
        return description;
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
        
        // Show special notification for certain upgrades
        if (upgrade.specialType === 'chain') {
            gameManager.showFloatingText("Chain Lightning Activated!", 
                gameManager.game.player.x, 
                gameManager.game.player.y - 50, 
                '#3498db', 24);
        } else if (upgrade.specialType === 'ricochet') {
            gameManager.showFloatingText("Ricochet Shots Activated!", 
                gameManager.game.player.x, 
                gameManager.game.player.y - 50, 
                '#f39c12', 24);
        } else if (upgrade.specialType === 'explosion') {
            gameManager.showFloatingText("Explosive Rounds Activated!", 
                gameManager.game.player.x, 
                gameManager.game.player.y - 50, 
                '#e74c3c', 24);
        }
        
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

// Add to Player's applyUpgrade method to handle the new lucky upgrade
const originalApplyUpgrade = Player.prototype.applyUpgrade;
Player.prototype.applyUpgrade = function(upgrade) {
    originalApplyUpgrade.call(this, upgrade);
    
    // Handle special "lucky" upgrade
    if (upgrade.specialType === 'lucky') {
        this.critChance += upgrade.critBonus || 0.05;
        
        // Apply XP bonus globally
        if (upgrade.xpBonus && gameManager) {
            // Create XP bonus function if it doesn't exist yet
            if (!gameManager.xpBonus) {
                gameManager.xpBonus = 0;
            }
            gameManager.xpBonus += upgrade.xpBonus;
        }
    }
};

// Override XP gain to apply the new XP bonus
XPOrb.prototype.getValue = function() {
    let finalValue = this.value;
    
    // Apply global XP bonus if exists
    if (gameManager && gameManager.xpBonus) {
        finalValue = Math.ceil(finalValue * (1 + gameManager.xpBonus));
    }
    
    return finalValue;
};

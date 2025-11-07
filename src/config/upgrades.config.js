/**
 * 🎮 UPGRADE DEFINITIONS
 * Central configuration for all in-game upgrades
 *
 * Upgrade Types:
 * - attackSpeed: Multiplies attack speed
 * - attackDamage: Multiplies damage
 * - maxHealth: Multiplies max health
 * - speed: Multiplies movement speed
 * - projectileCount: Adds additional projectiles
 * - projectileSpread: Increases spread angle
 * - piercing: Projectiles pass through enemies
 * - special: Special upgrade types (chain, orbit, ricochet, explosion)
 * - magnet: XP attraction range
 * - regeneration: Health regeneration per second
 * - damageReduction: Percentage damage reduction
 *
 * Rarity Levels: common, uncommon, rare, epic
 * Build Paths: core, chain, orbit, ricochet, explosive, support
 */

const UPGRADE_DEFINITIONS = [
    // ========================================
    // CORE STATS (Common)
    // ========================================
    {
        id: 'attack_speed_1',
        name: 'Quick Shot',
        description: '30% faster attacks',
        type: 'attackSpeed',
        multiplier: 1.30,
        icon: "*",
        rarity: 'common',
        buildPath: 'core'
    },
    {
        id: 'attack_damage_1',
        name: 'Sharp Shots',
        description: '35% more damage',
        type: 'attackDamage',
        multiplier: 1.35,
        icon: "+",
        rarity: 'common',
        buildPath: 'core'
    },
    {
        id: 'max_health_1',
        name: 'Vitality',
        description: '25% more health',
        type: 'maxHealth',
        multiplier: 1.25,
        icon: "<3",
        rarity: 'common',
        buildPath: 'core'
    },
    {
        id: 'movement_speed_1',
        name: 'Swift Feet',
        description: '20% faster movement',
        type: 'speed',
        multiplier: 1.2,
        icon: ">>",
        rarity: 'common',
        buildPath: 'core'
    },

    // ========================================
    // PROJECTILE MODIFIERS
    // ========================================
    {
        id: 'multi_shot_1',
        name: 'Split Shot',
        description: 'Fire an additional projectile',
        type: 'projectileCount',
        value: 1,
        icon: "T",
        rarity: 'uncommon',
        buildPath: 'core',
        stackable: true
    },
    {
        id: 'spread_shot_1',
        name: 'Wide Spread',
        description: 'Increase projectile spread by 15deg',
        type: 'projectileSpread',
        value: 15,
        icon: "<->",
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
        icon: "/",
        rarity: 'rare',
        buildPath: 'core',
        comboEffects: ['chain', 'explosive'],
        specialEffect: 'chain_through_pierced' // Can chain through pierced enemies
    },
    {
        id: 'critical_strike_1',
        name: 'Precision Targeting',
        description: '+12% crit chance, +0.3 crit multiplier',
        type: 'critChance',
        value: 0.12, // Crit chance increase (12%)
        critDamageBonus: 0.3, // Crit multiplier increase (+0.3 to multiplier)
        icon: "⊕",
        rarity: 'uncommon',
        buildPath: 'core',
        synergies: ['attack_speed_1', 'multi_shot_1'],
        stackable: true,
        specialEffect: 'crit_visual' // Enhanced crit visual feedback
    },

    // ========================================
    // CHAIN LIGHTNING BUILD PATH
    // ========================================
    {
        id: 'chain_lightning_1',
        name: 'Chain Lightning',
        description: 'Projectiles have a 55% chance to chain to a nearby enemy',
        type: 'special',
        specialType: 'chain',
        value: 0.55,
        chainDamage: 0.9,
        chainRange: 240,
        maxChains: 2,
        icon: "*",
        rarity: 'rare',
        buildPath: 'chain',
        synergies: ['attack_speed_1', 'attack_damage_1'],
        specialEffect: 'chain_visual' // Adds lightning visual effect
    },
    {
        id: 'chain_lightning_2',
        name: 'Improved Chains',
        description: 'Chain chance increased to 70% and can hit four targets',
        type: 'chain',
        value: 0.7,
        maxChains: 4,
        rangeBonus: 40,
        icon: "**",
        rarity: 'rare',
        requires: ['chain_lightning_1'],
        buildPath: 'chain',
        specialEffect: 'chain_visual_enhanced' // Enhanced lightning visuals
    },
    {
        id: 'chain_damage',
        name: 'Conductive Strike',
        description: 'Chain lightning deals 110% of the original damage',
        type: 'chainDamage',
        value: 1.1,
        icon: "*!",
        rarity: 'uncommon',
        requires: ['chain_lightning_1'],
        buildPath: 'chain',
        specialEffect: 'chain_explosion' // Small explosion on chain
    },

    // ========================================
    // ORBITAL BUILD PATH
    // ========================================
    {
        id: 'orbit_attack_1',
        name: 'Orbital Projectiles',
        description: 'Projectiles orbit around you, dealing damage to nearby enemies',
        type: 'special',
        specialType: 'orbit',
        orbitRadius: 100,
        orbitSpeed: 2,
        damage: 0.5,
        icon: "@",
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
        icon: "@@",
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
        icon: "@!",
        rarity: 'uncommon',
        requires: ['orbit_attack_1'],
        buildPath: 'orbit',
        specialEffect: 'orbit_pulse' // Adds damage pulse effect
    },

    // ========================================
    // RICOCHET BUILD PATH
    // ========================================
    {
        id: 'ricochet_1',
        name: 'Ricochet Shot',
        description: '60% chance for projectiles to bounce to a new target twice',
        type: 'special',
        specialType: 'ricochet',
        ricochetChance: 0.60,
        bounces: 2,
        bounceRange: 260,
        bounceDamage: 0.9,
        icon: "<",
        rarity: 'rare',
        buildPath: 'ricochet',
        synergies: ['attack_damage_1', 'spread_shot_1'],
        specialEffect: 'ricochet_visual' // Adds bounce trail effect
    },
    {
        id: 'ricochet_2',
        name: 'Multi-Bounce',
        description: 'Bounce one additional time with extended range and +15% trigger chance',
        type: 'ricochetBounces',
        value: 1,
        rangeBonus: 60,
        chanceBonus: 0.15,
        icon: "<<",
        rarity: 'rare',
        requires: ['ricochet_1'],
        buildPath: 'ricochet',
        specialEffect: 'ricochet_chain' // Can chain between bounces
    },
    {
        id: 'ricochet_damage',
        name: 'Momentum Transfer',
        description: 'Ricochets retain 95% of their damage and +10% trigger chance',
        type: 'ricochetDamage',
        value: 0.95,
        chanceBonus: 0.10,
        icon: "<!",
        rarity: 'uncommon',
        requires: ['ricochet_1'],
        buildPath: 'ricochet',
        specialEffect: 'ricochet_explosion' // Small explosion on bounce
    },

    // ========================================
    // EXPLOSIVE BUILD PATH
    // ========================================
    {
        id: 'explosive_shots_1',
        name: 'Explosive Rounds',
        description: '50% chance for projectiles to explode on impact, dealing area damage',
        type: 'special',
        specialType: 'explosion',
        explosiveChance: 0.50,  // Added: was missing, defaulted to 0.3
        explosionRadius: 60,
        explosionDamage: 0.5,
        icon: "X",
        rarity: 'rare',
        buildPath: 'explosive',
        synergies: ['attack_damage_1', 'multi_shot_1'],
        specialEffect: 'explosion_visual' // Enhanced explosion visuals
    },
    {
        id: 'explosive_shots_2',
        name: 'Bigger Explosions',
        description: 'Explosion radius increased by 40% and +15% trigger chance',
        type: 'explosionSize',
        multiplier: 1.4,
        chanceBonus: 0.15,  // Added: 50% → 65%
        icon: "X-",
        rarity: 'uncommon',
        requires: ['explosive_shots_1'],
        buildPath: 'explosive',
        specialEffect: 'explosion_knockback' // Adds knockback effect
    },
    {
        id: 'explosive_shots_3',
        name: 'Devastating Blasts',
        description: 'Explosions deal 75% of hit damage and +15% trigger chance',
        type: 'explosionDamage',
        value: 0.75,
        chanceBonus: 0.15,  // Added: 65% → 80%
        icon: "XX",
        rarity: 'rare',
        requires: ['explosive_shots_1'],
        buildPath: 'explosive',
        specialEffect: 'explosion_chain' // Can trigger chain reactions
    },

    // ========================================
    // SHOTGUN BUILD PATH (Nova Shotgun)
    // ========================================
    {
        id: 'nova_choke',
        name: 'Focused Choke',
        description: 'Tighten Nova spread by 10deg and boost pellet damage by 20%',
        type: 'weaponModifier',
        weaponTags: ['shotgun'],
        spreadReduction: 10,
        damageBonus: 1.2,
        icon: "o",
        rarity: 'uncommon',
        buildPath: 'shotgun',
        specialEffect: 'shotgun_focus'
    },
    {
        id: 'nova_scatter_flex',
        name: 'Scatter Flex',
        description: 'Add two extra pellets but slightly widen the cone',
        type: 'weaponModifier',
        weaponTags: ['shotgun'],
        additionalProjectiles: 2,
        spreadIncrease: 5,
        icon: "~",
        rarity: 'rare',
        buildPath: 'shotgun',
        specialEffect: 'shotgun_scatter'
    },
    {
        id: 'nova_frag_rounds',
        name: 'Frag Rounds',
        description: 'Pellets detonate on impact but deal 10% less base damage',
        type: 'weaponModifier',
        weaponTags: ['shotgun'],
        damagePenalty: 0.9,
        icon: 'B',
        rarity: 'epic',
        buildPath: 'shotgun',
        specialEffect: 'shotgun_explosive'
    },

    // ========================================
    // SUPPORT UPGRADES
    // ========================================
    {
        id: 'magnet_1',
        name: 'Magnetic Field',
        description: '+75% XP attraction radius',
        type: 'magnet',
        value: 75,
        icon: "M",
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
        icon: '+',
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
        icon: "#",
        rarity: 'uncommon',
        buildPath: 'support',
        specialEffect: 'armor_visual' // Shows damage reduction effect
    }
];

// Make globally available
if (typeof window !== 'undefined') {
    window.UPGRADE_DEFINITIONS = UPGRADE_DEFINITIONS;
}

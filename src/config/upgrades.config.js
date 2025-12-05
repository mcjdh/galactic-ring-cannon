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
        id: 'chain_lightning_3',
        name: 'Storm Chains',
        description: 'Chain chance increased to 85% and can hit six targets',
        type: 'chain',
        value: 0.85,
        maxChains: 6,
        rangeBonus: 60,
        icon: "***",
        rarity: 'epic',
        requires: ['chain_lightning_2'],
        buildPath: 'chain',
        specialEffect: 'chain_storm' // Massive lightning storm effect
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
        id: 'orbit_attack_3',
        name: 'Triple Orbit',
        description: 'Add a third orbiting projectile',
        type: 'orbit',
        value: 1,
        icon: "@@@",
        rarity: 'epic',
        requires: ['orbit_attack_2'],
        buildPath: 'orbit',
        specialEffect: 'orbit_shield' // Creates defensive orbit pattern
    },
    {
        id: 'orbit_attack_4',
        name: 'Quad Orbit',
        description: 'Add a fourth orbiting projectile for complete coverage',
        type: 'orbit',
        value: 1,
        icon: "@@@@",
        rarity: 'epic',
        requires: ['orbit_attack_3'],
        buildPath: 'orbit',
        specialEffect: 'orbit_fortress' // Enhanced defensive pattern
    },
    {
        id: 'orbit_attack_5',
        name: 'Penta Orbit',
        description: 'Add a fifth orbiting projectile - ultimate orbital defense',
        type: 'orbit',
        value: 1,
        icon: "@@@@@",
        rarity: 'epic',
        requires: ['orbit_attack_4'],
        buildPath: 'orbit',
        specialEffect: 'orbit_star' // Star formation pattern
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
        bounceRange: 320,  // INCREASED from 260 - needs bigger range than chain to find bounce targets reliably
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
        rangeBonus: 80,  // INCREASED from 60 - scales with larger base range
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
    // PHANTOM STRIKER EXCLUSIVE UPGRADES
    // ========================================
    {
        id: 'phantom_phase',
        name: 'Phantom Phase Geometry',
        description: 'Ricochets gain +1 bounce, +120 range, and +10% proc chance.',
        type: 'weaponModifier',
        weaponTags: ['phantom_repeater'],
        characterRestriction: 'phantom_striker',
        bonusBounces: 1,
        rangeBonus: 120,
        chanceBonus: 0.10,
        icon: 'Ψ',
        rarity: 'rare',
        buildPath: 'ricochet',
        specialEffect: 'phantom_phase'
    },
    {
        id: 'void_amplifier',
        name: 'Void Amplifier',
        description: 'Ricochet damage +25% and final hits detonate for 90 void damage.',
        type: 'weaponModifier',
        weaponTags: ['phantom_repeater'],
        characterRestriction: 'phantom_striker',
        requires: ['phantom_phase'],
        damageMultiplier: 1.25,
        finalExplosionDamage: 90,
        finalExplosionRadius: 110,
        icon: '₪',
        rarity: 'epic',
        buildPath: 'ricochet',
        specialEffect: 'phantom_nova'
    },
    {
        id: 'spectral_echoes',
        name: 'Spectral Echoes',
        description: 'Final ricochet has a 35% chance to spawn a 1-bounce echo chain and +1 bounce.',
        type: 'weaponModifier',
        weaponTags: ['phantom_repeater'],
        characterRestriction: 'phantom_striker',
        requires: ['void_amplifier'],
        echoChance: 0.35,
        echoBounces: 1,
        bonusBounces: 1,
        icon: '☄',
        rarity: 'epic',
        buildPath: 'ricochet',
        specialEffect: 'phantom_echo'
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
        explosionRadius: 70,  // INCREASED from 60 - more impactful AoE
        explosionDamage: 0.6,  // INCREASED from 0.5 - better damage scaling
        icon: "X",
        rarity: 'rare',
        buildPath: 'explosive',
        synergies: ['attack_damage_1', 'multi_shot_1'],
        specialEffect: 'explosion_visual' // Enhanced explosion visuals
    },
    {
        id: 'explosive_shots_2',
        name: 'Bigger Explosions',
        description: 'Explosion radius increased by 50% and +15% trigger chance',
        type: 'explosionSize',
        multiplier: 1.5,  // INCREASED from 1.4 - more noticeable upgrade
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
        id: 'detection_range_1',
        name: 'Long Range Sensors',
        description: '20% larger enemy detection range',
        type: 'attackRange',
        multiplier: 1.20,
        icon: "O",
        rarity: 'uncommon',
        buildPath: 'support',
        synergies: ['ricochet_1', 'chain_lightning_1', 'explosive_shots_1'],
        stackable: true,
        specialEffect: 'range_indicator' // Shows detection range when picked up
    },
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
        description: 'Recover 1 health per second',
        type: 'regeneration',
        value: 1.0,
        icon: '+',
        rarity: 'uncommon',
        buildPath: 'support',
        specialEffect: 'heal_visual' // Shows healing particles
    },
    {
        id: 'lifesteal_1',
        name: 'Vampiric Essence',
        description: 'Heal for 4% of damage dealt',
        type: 'lifesteal',
        value: 0.04,
        icon: "♦",
        rarity: 'rare',
        buildPath: 'support',
        specialEffect: 'lifesteal_visual' // Shows lifesteal effect
    },
    {
        id: 'damage_reduction_1',
        name: 'Armor',
        description: 'Reduce damage taken by 10%',
        type: 'damageReduction',
        value: 0.10,
        icon: "#",
        rarity: 'uncommon',
        buildPath: 'support',
        specialEffect: 'armor_visual' // Shows damage reduction effect
    },

    // ========================================
    // SHIELD BUILD PATH (Aegis Specialty)
    // Restricted to Aegis Vanguard - shield specialist
    // ========================================
    {
        id: 'barrier_shield_1',
        name: 'Barrier Shield',
        description: 'Generate a shield that absorbs 100 damage before breaking. Recharges after 5s',
        type: 'special',
        specialType: 'shield',
        shieldCapacity: 100,  // Increased from 75 - more impactful starting upgrade
        shieldRechargeTime: 5.0,
        icon: "[]",
        rarity: 'rare',
        buildPath: 'support',
        characterRestriction: 'aegis_vanguard',  // Only Aegis can get shield upgrades
        synergies: ['damage_reduction_1', 'regeneration_1'],
        specialEffect: 'shield_activate' // Shows shield generation effect
    },
    {
        id: 'barrier_shield_2',
        name: 'Reinforced Barriers',
        description: 'Shield capacity increased by 150 and recharges 25% faster',
        type: 'shieldCapacity',
        value: 150,  // Increased from 100 - more powerful scaling
        rechargeBonus: 0.25,  // Reduces recharge time by 25%
        icon: "[=]",
        rarity: 'uncommon',
        requires: ['barrier_shield_1'],
        buildPath: 'support',
        characterRestriction: 'aegis_vanguard',
        specialEffect: 'shield_strengthen' // Enhanced shield visuals
    },
    {
        id: 'energy_reflection',
        name: 'Energy Reflection',
        description: 'Shield reflects 50% of blocked damage back at nearby attackers',
        type: 'shieldReflection',
        value: 0.50,  // Increased from 0.35 (35% → 50%)
        icon: "[<]",
        rarity: 'rare',
        requires: ['barrier_shield_1'],
        buildPath: 'support',
        characterRestriction: 'aegis_vanguard',
        specialEffect: 'shield_reflect' // Reflection particle effect
    },
    {
        id: 'adaptive_armor',
        name: 'Adaptive Armor',
        description: 'Shield gains +3 max capacity for every 100 damage blocked (caps at +100)',
        type: 'shieldAdaptive',
        growthRate: 3,    // Increased from 2 - faster growth
        maxGrowth: 100,   // Increased from 50 - higher cap
        icon: "[^]",
        rarity: 'epic',
        requires: ['barrier_shield_2'],
        buildPath: 'support',
        characterRestriction: 'aegis_vanguard',
        specialEffect: 'shield_evolve' // Evolution visual when growing
    },
    {
        id: 'rapid_recharge',
        name: 'Rapid Recharge',
        description: 'Shield recharge time reduced by 50%',
        type: 'shieldRecharge',
        value: 0.50,
        icon: "[>>]",
        rarity: 'uncommon',
        requires: ['barrier_shield_1'],
        buildPath: 'support',
        characterRestriction: 'aegis_vanguard',
        specialEffect: 'shield_charge' // Charging particle effect
    },
    {
        id: 'aegis_protocol',
        name: 'Aegis Protocol',
        description: 'When shield breaks, release a devastating shockwave dealing 250 damage in 220px radius',
        type: 'shieldExplosion',
        explosionDamage: 250,  // Increased from 150 - devastatingly powerful!
        explosionRadius: 220,  // Increased from 180 - huge area
        icon: "[*]",
        rarity: 'epic',
        requires: ['barrier_shield_1'],
        buildPath: 'support',
        characterRestriction: 'aegis_vanguard',
        specialEffect: 'shield_burst' // Explosion effect on shield break
    },

    // ========================================
    // GRAVITY WELL BUILD PATH (Void Warden)
    // ========================================
    {
        id: 'gravity_well_focus',
        name: 'Event Horizon Focusers',
        description: 'Gravity wells are 20% larger and persist 0.5s longer.',
        type: 'gravityWell',
        radiusMultiplier: 1.2,
        durationBonus: 0.5,
        icon: '◎',
        rarity: 'uncommon',
        buildPath: 'support',
        characterRestriction: 'void_warden',
        specialEffect: 'gravitywell_radius'
    },
    {
        id: 'gravity_well_force',
        name: 'Tidal Lock Arrays',
        description: 'Gravity wells slow enemies 15% more and pull harder.',
        type: 'gravityWell',
        slowBonus: 0.15,
        pullBonus: 0.12,
        icon: '⇵',
        rarity: 'rare',
        requires: ['gravity_well_focus'],
        buildPath: 'support',
        characterRestriction: 'void_warden',
        specialEffect: 'gravitywell_pull'
    },
    {
        id: 'gravity_well_core',
        name: 'Quantum Singularity Core',
        description: 'Gravity well damage is massively increased and they linger a bit longer.',
        type: 'gravityWell',
        damageMultiplier: 1.35,
        damageAdd: 0.15,
        durationBonus: 0.3,
        icon: '✦',
        rarity: 'epic',
        requires: ['gravity_well_force'],
        buildPath: 'explosive',
        characterRestriction: 'void_warden',
        specialEffect: 'gravitywell_burst'
    },

    // ========================================
    // PYROMANCY BUILD PATH (Inferno Juggernaut)
    // ========================================
    {
        id: 'pyromancy_1',
        name: 'Pyromancy',
        description: 'Projectiles apply burning status to enemies (7 damage/sec for 3s)',
        type: 'burn',
        burnChance: 0.3,  // 30% chance to burn - CRITICAL: was missing!
        burnDamage: 7,
        burnDuration: 3.0,
        icon: "🔥",
        rarity: 'rare',
        buildPath: 'explosive',
        synergies: ['explosive_shots_1', 'attack_damage_1'],
        specialEffect: 'burn_visual'
    },
    {
        id: 'pyromancy_2',
        name: 'Intense Flames',
        description: 'Burn damage increased by 50% and lasts 2 seconds longer',
        type: 'burnDamage',
        damageMultiplier: 1.5,
        durationBonus: 2.0,
        icon: "🔥🔥",
        rarity: 'rare',
        requires: ['pyromancy_1'],
        buildPath: 'explosive',
        specialEffect: 'burn_intensify'
    },

    // ========================================
    // CRIMSON REAVER EXCLUSIVE UPGRADES
    // ========================================
    {
        id: 'blood_tithe',
        name: 'Blood Tithe',
        description: '+8% lifesteal for the Crimson Reaver.',
        type: 'lifesteal',
        value: 0.08,
        icon: '†',
        rarity: 'rare',
        buildPath: 'core',
        characterRestriction: 'crimson_reaver',
        specialEffect: 'lifesteal_glow'
    },
    {
        id: 'sanguine_lash',
        name: 'Sanguine Lash',
        description: 'Lifesteal lashes out at a nearby enemy for 45 damage.',
        type: 'bloodLash',
        damage: 45,
        range: 280,
        chance: 1.0,
        icon: '↯',
        rarity: 'rare',
        requires: ['blood_tithe'],
        buildPath: 'explosive',
        characterRestriction: 'crimson_reaver',
        specialEffect: 'blood_lash'
    },
    {
        id: 'crimson_cataclysm',
        name: 'Crimson Cataclysm',
        description: 'Overhealing erupts in a 120 radius nova for 90 damage.',
        type: 'bloodNova',
        damage: 90,
        radius: 120,
        icon: '☢',
        rarity: 'epic',
        requires: ['sanguine_lash'],
        buildPath: 'explosive',
        characterRestriction: 'crimson_reaver',
        specialEffect: 'blood_nova'
    },

    // ========================================
    // INFERNO JUGGERNAUT EXCLUSIVE UPGRADES
    // ========================================
    {
        id: 'inferno_brands',
        name: 'Inferno Brands',
        description: 'Burn chance +15% and scorch damage boosted to 10 DPS for 4s.',
        type: 'burn',
        characterRestriction: 'inferno_juggernaut',
        burnChance: 0.85,
        burnDamage: 10,
        burnDuration: 4.0,
        chanceBonus: 0.15,
        icon: '🔥✚',
        rarity: 'rare',
        requires: ['pyromancy_1'],
        buildPath: 'explosive',
        specialEffect: 'burn_empower'
    },
    {
        id: 'inferno_overpressure',
        name: 'Overpressure Chambers',
        description: 'Burn DPS +35% and duration +1.5s for the Juggernaut.',
        type: 'burnDamage',
        characterRestriction: 'inferno_juggernaut',
        damageMultiplier: 1.35,
        durationBonus: 1.5,
        icon: '🔥🔥🔥',
        rarity: 'rare',
        requires: ['inferno_brands'],
        buildPath: 'explosive',
        specialEffect: 'burn_overpressure'
    },
    {
        id: 'inferno_conflagration',
        name: 'Conflagration Core',
        description: 'Burning enemies emit fiery pulses (35 dmg, 90 radius) each tick.',
        type: 'burnDamage',
        characterRestriction: 'inferno_juggernaut',
        explosionDamage: 35,
        explosionRadius: 90,
        icon: '🔥🌪',
        rarity: 'epic',
        requires: ['inferno_overpressure'],
        buildPath: 'explosive',
        specialEffect: 'burn_conflagration'
    },

    // ========================================
    // OVERCLOCK BUILD PATH (Cybernetic Berserker)
    // ========================================
    {
        id: 'overclock_1',
        name: 'Overclock Protocol',
        description: 'Berserker bonuses increased by 20% (gain more power at low HP)',
        type: 'berserkerScaling',
        value: 0.2,  // +20% to scaling
        icon: "⚡",
        rarity: 'rare',
        buildPath: 'core',
        characterRestriction: 'cybernetic_berserker',
        specialEffect: 'berserker_visual'
    },
    {
        id: 'overclock_2',
        name: 'Critical Overclock',
        description: 'Gain +5% crit chance at low health',
        type: 'berserkerCrit',
        value: 0.05,
        icon: "⚡⚡",
        rarity: 'rare',
        requires: ['overclock_1'],
        buildPath: 'core',
        characterRestriction: 'cybernetic_berserker',
        specialEffect: 'berserker_crit'
    }
];

// Make globally available
if (typeof window !== 'undefined') {
    window.UPGRADE_DEFINITIONS = UPGRADE_DEFINITIONS;
}

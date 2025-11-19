/**
 * 🧬 CHARACTER DEFINITIONS
 * Starter class archetypes: weapon, stat modifiers, flavor text.
 *
 * Modifiers schema (all optional):
 * - unlockRequirement (optional):
 *     {
 *         type: 'achievement',
 *         ids: ['achievement_id'],
 *         hint: 'UI hint text shown when locked'
 *     }
 * - stats: {
 *     healthMultiplier,
 *     flatHealth,
 *     regeneration,
 *     damageReduction,
 *     lifesteal,
 *     critChance,
 *     critMultiplier
 *   }
 * - combat: {
 *     attackSpeedMultiplier,
 *     attackDamageMultiplier,
 *     projectileSpeedMultiplier,
 *     piercing,
 *     critChanceBonus
 *   }
 * - movement: {
 *     speedMultiplier,
 *     dodgeCooldownMultiplier,
 *     magnetRangeBonus
 *   }
 * - abilities: structured hints for PlayerAbilities adjustments
 * 
 * Build Path Integration (NEW):
 * - preferredBuildPaths: Array of build path IDs that synergize with this character
 *   Available paths: 'core', 'chain', 'orbit', 'ricochet', 'explosive', 'support'
 *   These paths receive +40% weight during upgrade selection for this character
 *   
 *   Character Synergies:
 *   - Aegis Vanguard: ['support', 'core'] - Shield specialist with barrier tech (reworked v1.1.2)
 *   - Nova Corsair: ['ricochet', 'explosive'] - Aggressive, burst damage
 *   - Stormcaller: ['chain'] - Amplifies built-in chain lightning
 *   - Nexus Architect: ['orbit', 'support'] - Orbital specialist (NEW v1.1.1)
 */

const CHARACTER_DEFINITIONS = [
    {
        id: 'aegis_vanguard',
        name: 'Aegis Vanguard',
        icon: '#',
        tagline: 'Shield Sentinel',
        description: 'Master of barrier technology who absorbs punishment and reflects it back. Fights with protective energy fields and the reliable Pulse Cannon.',
        difficulty: 'balanced',
        weaponId: 'pulse_cannon',
        highlights: [
            'Starts with 50HP barrier shield',
            '+30% max hull & +12% armor',
            'Passive shield recharges over time'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.3,
                damageReduction: 0.12,
                regeneration: 1.8
            },
            combat: {
                attackSpeedMultiplier: 0.96,
                attackDamageMultiplier: 1.05
            },
            movement: {
                speedMultiplier: 1.0
            },
            abilities: {
                shield: {
                    starterCapacity: 50,        // Starts with 50HP shield
                    rechargeTime: 5.0,          // 5 second recharge after break (reduced from 7s for better feel with combat interrupt)
                    capacityMultiplier: 1.0,    // No bonus to shield capacity upgrades
                    rechargeMultiplier: 1.2     // 20% faster shield recharge (increased from 15%)
                }
            }
        },
        // Build path preferences - these paths get +40% weight bonus for this character
        preferredBuildPaths: ['support', 'core'],
        flavor: '"They break against my shields. Every. Single. Time."'
    },
    {
        id: 'nova_corsair',
        name: 'Nova Corsair',
        icon: '^',
        tagline: 'Close-Range Raider',
        description: 'Dives into the swarm with a volatile Nova Shotgun. Lives fast, dodges often, never stops moving.',
        difficulty: 'aggressive',
        weaponId: 'nova_shotgun',
        highlights: [
            '+18% attack tempo & +8% damage',
            '+15% thruster speed & faster dodge',
            '5% lifesteal keeps raids going'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 0.9,
                lifesteal: 0.05
            },
            combat: {
                attackSpeedMultiplier: 1.18,
                attackDamageMultiplier: 1.08
            },
            movement: {
                speedMultiplier: 1.15,
                dodgeCooldownMultiplier: 0.85,
                magnetRangeBonus: 90
            }
        },
        // Build path preferences - these paths get +40% weight bonus for this character
        preferredBuildPaths: ['ricochet', 'explosive'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['split_shot_specialist'],
            hint: 'Keep drafting Split Shot until the Corsair answers the call.'
        },
        flavor: '"If you\'re not inside their formation, you\'re doing it wrong."'
    },
    {
        id: 'stormcaller',
        name: 'Stormcaller Adept',
        icon: '*',
        tagline: 'Arc Lance Savant',
        description: 'Channels chaining arc bursts that dance between enemies. Excels at crowd disruption.',
        difficulty: 'control',
        weaponId: 'arc_burst',
        highlights: [
            'Guaranteed chain lightning bursts',
            '+5% fire rate with bonus piercing',
            'Moderate auto-recharge shielding'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.05,
                regeneration: 0.8
            },
            combat: {
                attackSpeedMultiplier: 1.05,
                attackDamageMultiplier: 0.95,
                piercing: 1
            },
            abilities: {
                chainLightning: {
                    baseChance: 0.6,
                    damageMultiplier: 0.9,
                    range: 260,
                    maxChains: 3
                }
            }
        },
        // Build path preferences - these paths get +40% weight bonus for this character
        preferredBuildPaths: ['chain'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['storm_surge'],
            hint: 'Unleash the Storm Surge achievement to access this adept.'
        },
        flavor: '"The void hums with resonance—listen, and strike."'
    },
    {
        id: 'nexus_architect',
        name: 'Nexus Architect',
        icon: '@',
        tagline: 'Orbital Savant',
        description: 'Commands a constellation of orbital weapons that dance in perfect harmony. Master of sustained, methodical combat.',
        difficulty: 'tactical',
        weaponId: 'constellation_array',
        highlights: [
            'Starts with 2 free orbital projectiles',
            '+10% orbital damage & +20% orbital speed',
            'Reduced orbital collision radius for precision',
            'Unique Constellation Array weapon syncs orbitals into volleys'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.1,  // Slight tankiness
                regeneration: 1.2       // Moderate regen
            },
            combat: {
                attackSpeedMultiplier: 0.94,  // -6% attack speed (relies on orbitals)
                projectileSpeedMultiplier: 1.1 // +10% projectile speed
            },
            movement: {
                speedMultiplier: 1.05   // +5% movement (positioning is key)
            },
            abilities: {
                orbital: {
                    starterCount: 2,           // Begins with 2 orbitals (increased from 1)
                    damageMultiplier: 1.1,     // +10% orbital damage
                    speedMultiplier: 1.2,      // +20% orbital speed
                    radiusMultiplier: 0.9      // -10% radius (tighter orbit, harder to hit but safer)
                }
            }
        },
        // Build path preferences - orbitals are core identity
        preferredBuildPaths: ['orbit', 'support'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['orbital_master'],
            hint: 'Command five orbitals at once to unlock the Architect.'
        },
        flavor: '"Precision is not perfection. It is the path to it."'
    },
    {
        id: 'eclipse_reaper',
        name: 'Eclipse Reaper',
        icon: '†',
        tagline: 'Soul Harvester',
        description: 'A dark necromancer who reaps the void and grows stronger with each kill. Thrives on death itself with high-risk, high-reward gameplay.',
        difficulty: 'reaper',
        weaponId: 'void_scythe',
        highlights: [
            'Enemies explode on death (12% base chance)',
            '+15% base lifesteal - drain life from kills',
            '+15% damage but -20% max health (glass scythe)',
            'Void Scythe fires in sweeping reaping arcs'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 0.8,    // -20% health (high risk)
                lifesteal: 0.15,          // 15% base lifesteal (high reward)
                regeneration: 0.5         // Low natural regen (relies on lifesteal)
            },
            combat: {
                attackSpeedMultiplier: 1.0,   // Normal attack speed
                attackDamageMultiplier: 1.15  // +15% damage (death dealer)
            },
            movement: {
                speedMultiplier: 1.08,         // +8% movement (agile reaper)
                magnetRangeBonus: 120          // Extended pickup range for souls
            },
            abilities: {
                explosive: {
                    baseChance: 0.12,          // 12% chance enemies explode on death
                    damageMultiplier: 1.0,     // Normal explosive damage
                    radiusMultiplier: 1.1      // +10% explosion radius
                }
            }
        },
        // Build path preferences - explosive deaths and lifesteal synergy
        preferredBuildPaths: ['explosive', 'support'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['grim_harvest'],
            hint: 'Master the art of death by achieving the Grim Harvest.'
        },
        flavor: '"Death is not the end—it is the currency of power."'
    }
];

if (typeof window !== 'undefined') {
    window.CHARACTER_DEFINITIONS = CHARACTER_DEFINITIONS;
}

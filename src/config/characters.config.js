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
        id: 'void_reaver',
        name: 'Void Reaver',
        icon: '%',
        tagline: 'Gravitational Enforcer',
        description: 'Warps spacetime itself, firing devastating singularity projectiles that trap enemies in crushing gravity wells. Master of area denial and tactical positioning.',
        difficulty: 'strategic',
        weaponId: 'singularity_cannon',
        highlights: [
            'Every shot creates gravity wells that slow & pull enemies',
            '+25% attack damage but -12% fire rate (devastating hits)',
            'Slow projectiles create lingering void zones',
            '+8% movement for tactical repositioning'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.08,  // Moderate survivability
                regeneration: 1.0        // Standard regen
            },
            combat: {
                attackSpeedMultiplier: 0.88,   // -12% attack speed (slow, deliberate)
                attackDamageMultiplier: 1.25,  // +25% damage (highest per-shot damage)
                projectileSpeedMultiplier: 0.85 // -15% projectile speed (creates more control time)
            },
            movement: {
                speedMultiplier: 1.08    // +8% movement (positioning is key)
            },
            abilities: {
                gravityWell: {
                    enabled: true,
                    wellRadius: 150,           // Area of effect for gravity wells
                    wellDuration: 2.5,         // How long wells persist (seconds)
                    slowAmount: 0.4,           // 40% movement slow
                    pullStrength: 0.3,         // Pull force toward center
                    damageMultiplier: 0.15     // Optional: 15% DOT while in well
                }
            }
        },
        // Build path preferences - synergizes with area control
        preferredBuildPaths: ['explosive', 'support'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['event_horizon'],
            hint: 'Cross the Event Horizon achievement to harness the void.'
        },
        flavor: '"Gravity is not a force. It is a conversation—and I control the dialogue."'
    }
];

if (typeof window !== 'undefined') {
    window.CHARACTER_DEFINITIONS = CHARACTER_DEFINITIONS;
}

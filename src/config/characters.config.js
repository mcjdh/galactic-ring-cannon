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
 *   - Aegis Vanguard: ['support', 'core'] - Shield specialist
 *   - Nova Corsair: ['ricochet', 'explosive'] - Aggressive burst damage
 *   - Stormcaller: ['chain'] - Chain lightning specialist
 *   - Nexus Architect: ['orbit', 'support'] - Orbital specialist
 *   - Inferno Juggernaut: ['explosive', 'core'] - Fire & explosions (NEW!)
 *   - Crimson Reaver: ['explosive', 'core'] - Lifesteal vampire
 *   - Void Warden: ['explosive', 'support'] - Gravity control
 *   - Phantom Striker: ['ricochet', 'explosive', 'homing'] - Ricochet assassin
 *   - Cybernetic Berserker: ['core', 'chain'] - Low-HP scaling (NEW!)
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
        id: 'inferno_juggernaut',
        name: 'Inferno Juggernaut',
        icon: '🔥',
        tagline: 'Pyromancer Tank',
        description: 'A walking blast furnace who sets the battlefield ablaze. High durability and explosive firepower, but moves slowly.',
        difficulty: 'destructive',
        weaponId: 'magma_launcher',
        highlights: [
            'Projectiles ignite enemies (Burn DoT)',
            '+25% max health & +15% armor',
            'Explosive shots deal area damage',
            'Slow but unstoppable'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.25,   // +25% health (tanky)
                damageReduction: 0.15,    // 15% armor
                regeneration: 1.0         // Standard regen
            },
            combat: {
                attackSpeedMultiplier: 0.9,   // -10% attack speed (heavy weapons)
                attackDamageMultiplier: 1.2,  // +20% damage
                projectileSpeedMultiplier: 0.85 // Slower, heavier shots
            },
            movement: {
                speedMultiplier: 0.85,         // -15% movement (juggernaut)
                magnetRangeBonus: 60
            },
            abilities: {
                explosive: {
                    baseChance: 0.4,           // 40% chance for projectiles to explode
                    damageMultiplier: 0.8,     // 80% explosive damage
                    radiusMultiplier: 1.2      // +20% explosion radius
                },
                // New Burn Ability
                hasBurn: true,
                burnChance: 1.0,               // 100% burn chance on primary
                burnDamage: 7,                 // INCREASED from 5 - more satisfying DoT
                burnDuration: 3.0
            }
        },
        // Build path preferences - fire and explosions
        preferredBuildPaths: ['explosive', 'core'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['grim_harvest'], // Reuse existing ID for now to keep unlock logic simple
            hint: 'Survive the firestorm to unlock the Juggernaut.'
        },
        flavor: '"I don\'t just set the world on fire. I AM the fire."'
    },
    {
        id: 'crimson_reaver',
        name: 'Crimson Reaver',
        icon: '♦',
        tagline: 'Vampiric Striker',
        description: 'A predator who feeds on the battlefield, converting carnage into vitality. Strikes fast and hard, draining life from every wound inflicted.',
        difficulty: 'aggressive',
        weaponId: 'sanguine_lance',
        highlights: [
            'Extreme lifesteal (20%) - damage is survival',
            '+15% attack tempo & +12% damage output',
            'Glass cannon: -30% max health',
            '+8% critical chance for devastating strikes'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 0.7,      // Glass cannon - only 84 HP
                lifesteal: 0.20,            // Core identity: 20% lifesteal
                critChance: 0.08            // +8% base crit chance (18% total)
            },
            combat: {
                attackSpeedMultiplier: 1.15,    // +15% attack speed for more healing
                attackDamageMultiplier: 1.12,   // +12% damage to amplify lifesteal
                piercing: 1                     // Base +1 pierce for multi-target drain
            },
            movement: {
                speedMultiplier: 1.10,          // +10% movement - aggressive positioning
                magnetRangeBonus: 50            // Modest magnet range
            }
        },
        // Build path preferences - maximize damage for maximum healing
        preferredBuildPaths: ['explosive', 'core'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['crimson_pact'],
            hint: 'Embrace the blood pact: heal 3000 HP via lifesteal to awaken the Reaver.'
        },
        flavor: '"Every drop spilled is a gift. Every wound dealt, a feast."'
    },
    {
        id: 'void_warden',
        name: 'Void Warden',
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
    },
    {
        id: 'phantom_striker',
        name: 'Phantom Striker',
        icon: 'ψ',
        tagline: 'Void Ricochet Assassin',
        description: 'A ghostly phase-shifter who bends projectile trajectories through the void. Excels at making shots bounce between enemies with supernatural precision.',
        difficulty: 'tactical',
        weaponId: 'phantom_repeater',
        highlights: [
            'All projectiles ricochet 2 times by default',
            '+8% base critical chance',
            '+12% movement speed & faster dodge',
            'Extended ricochet range for guaranteed bounces'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 0.95,     // Slightly fragile (tactical playstyle)
                regeneration: 0.6,          // Modest regen
                critChance: 0.08            // +8% crit chance bonus
            },
            combat: {
                attackSpeedMultiplier: 1.08,  // +8% attack speed
                attackDamageMultiplier: 1.0,  // Balanced damage
                critChanceBonus: 0.08         // Additional +8% crit (stacks with stats)
            },
            movement: {
                speedMultiplier: 1.12,          // +12% movement speed (very agile)
                dodgeCooldownMultiplier: 0.85   // -15% dodge cooldown (frequent dodging)
            },
            abilities: {
                ricochet: {
                    baseBounces: 2,           // All projectiles ricochet 2 times
                    damageMultiplier: 0.85,   // 85% damage per bounce
                    range: 320,               // Extended range for finding targets
                    guaranteed: true          // Ricochet is always active
                }
            }
        },
        // Build path preferences - ricochet synergies
        preferredBuildPaths: ['ricochet', 'explosive', 'homing'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['ricochet_rampage'],
            hint: 'Master the art of ricochets to summon the Phantom.'
        },
        flavor: '"They never see the second shot coming—or the third."'
    },
    {
        id: 'cybernetic_berserker',
        name: 'Cybernetic Berserker',
        icon: '⚡',
        tagline: 'Critical Overclock',
        description: 'A cyborg warrior who fights harder as systems fail. Gains massive attack speed and damage when health is low.',
        difficulty: 'expert',
        weaponId: 'plasma_cutter',
        highlights: [
            'Berserker Protocol: +Damage/Speed as HP drops',
            '+20% movement speed & +10% crit chance',
            'High risk, extreme reward',
            'Plasma Cutter shreds armor'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.1,      // +10% health (needs buffer to play low HP)
                regeneration: 0.2           // Very low regen (wants to stay low HP)
            },
            combat: {
                attackSpeedMultiplier: 1.1, // +10% base speed
                attackDamageMultiplier: 1.0,
                piercing: 1,                // +1 base pierce
                critChanceBonus: 0.10,      // +10% crit chance
                projectileSpeedMultiplier: 1.2 // +20% projectile speed
            },
            movement: {
                speedMultiplier: 1.15,       // +15% movement (chase down targets)
                dodgeCooldownMultiplier: 0.9, // 10% faster dodge
            },
            abilities: {
                // New Berserker Ability
                hasBerserker: true,
                berserkerScaling: 0.6        // up to +60% stats at 0 HP
            }
        },
        // Build path preferences - critical hits and core damage
        preferredBuildPaths: ['core', 'chain'],
        unlockRequirement: {
            type: 'achievement',
            ids: ['edge_walker'],
            hint: 'Live on the edge—survive at critical health to unlock.'
        },
        flavor: '"Pain is just data. And the data says I\'m winning."'
    }
];


if (typeof window !== 'undefined') {
    window.CHARACTER_DEFINITIONS = CHARACTER_DEFINITIONS;
}

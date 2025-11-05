/**
 * 🧬 CHARACTER DEFINITIONS
 * Starter class archetypes: weapon, stat modifiers, flavor text.
 *
 * Modifiers schema (all optional):
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
 */

const CHARACTER_DEFINITIONS = [
    {
        id: 'aegis_vanguard',
        name: 'Aegis Vanguard',
        icon: '#',
        tagline: 'Bulwark Pilot',
        description: 'Frontline defender whose reinforced hull shrugs off punishment. Prefers the dependable Pulse Cannon.',
        difficulty: 'balanced',
        weaponId: 'pulse_cannon',
        highlights: [
            '+30% max hull integrity',
            '+12% flat damage mitigation',
            'Regenerates armor over time'
        ],
        modifiers: {
            stats: {
                healthMultiplier: 1.3,
                damageReduction: 0.12,
                regeneration: 1.8
            },
            combat: {
                attackSpeedMultiplier: 0.92
            },
            movement: {
                speedMultiplier: 0.95
            }
        },
        flavor: '“Hold the line. The stars are watching.”'
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
        flavor: '“If you’re not inside their formation, you’re doing it wrong.”'
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
        flavor: '“The void hums with resonance—listen, and strike.”'
    }
];

if (typeof window !== 'undefined') {
    window.CHARACTER_DEFINITIONS = CHARACTER_DEFINITIONS;
}

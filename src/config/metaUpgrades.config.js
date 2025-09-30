/**
 * ⭐ META UPGRADE DEFINITIONS
 * Star Vendor permanent upgrades that persist between runs
 *
 * Properties:
 * - id: Unique identifier
 * - name: Display name
 * - description: What the upgrade does
 * - cost: Star token cost per level
 * - maxLevel: Maximum upgrade level
 * - icon: Emoji icon
 * - effect: Description of the effect
 *
 * Application:
 * These upgrades are applied at game start in bootstrap.js
 * through the applyMetaUpgrades() function
 */

const META_UPGRADE_DEFINITIONS = [
    {
        id: 'starting_damage',
        name: 'Enhanced Firepower',
        description: 'Start each run with +25% damage',
        cost: 5,
        maxLevel: 5,
        icon: '🔥',
        effect: 'Starting damage multiplier'
    },
    {
        id: 'starting_health',
        name: 'Reinforced Hull',
        description: 'Start each run with +20% health',
        cost: 4,
        maxLevel: 5,
        icon: '🛡️',
        effect: 'Starting health boost'
    },
    {
        id: 'starting_speed',
        name: 'Ion Thrusters',
        description: 'Start each run with +15% movement speed',
        cost: 3,
        maxLevel: 4,
        icon: '🚀',
        effect: 'Starting speed boost'
    },
    {
        id: 'star_chance',
        name: 'Stellar Fortune',
        description: 'Increase star token drop rate',
        cost: 8,
        maxLevel: 3,
        icon: '⭐',
        effect: 'Better star drops'
    },
    {
        id: 'chain_upgrade',
        name: 'Lightning Mastery',
        description: 'Chain lightning effects +1 additional chain',
        cost: 12,
        maxLevel: 2,
        icon: '⚡',
        effect: 'Improved chain lightning'
    }
];

// Make globally available
if (typeof window !== 'undefined') {
    window.META_UPGRADE_DEFINITIONS = META_UPGRADE_DEFINITIONS;
}

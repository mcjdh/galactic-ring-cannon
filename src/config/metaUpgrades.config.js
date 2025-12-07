/**
 * ⭐ META UPGRADE DEFINITIONS
 * Star Vendor permanent upgrades that persist between runs
 *
 * DESIGN PHILOSOPHY:
 * - Small, stackable bonuses that compound over time
 * - Exponential pricing for extended progression (~1000 stars practical max)
 * - 3 tiers: Foundation (core stats), Specialization (builds), Fortune (utility)
 *
 * PRICING FORMULA:
 * Cost per level = BaseCost × 1.8^CurrentLevel
 * This creates accessible early levels but serious investment for max
 *
 * Application:
 * These upgrades are applied at game start in Player.applyMetaUpgrades()
 */

/**
 * Calculate cost for a specific level of an upgrade
 * @param {number} baseCost - Base star cost
 * @param {number} currentLevel - Current level (0 = not purchased)
 * @returns {number} Cost to purchase next level
 */
const calculateUpgradeCost = (baseCost, currentLevel) => {
    return Math.ceil(baseCost * Math.pow(1.8, currentLevel));
};

const META_UPGRADE_DEFINITIONS = [
    // ═══════════════════════════════════════════════════════════════
    // TIER 1: FOUNDATION - Core stats, many levels, small gains
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'starting_health',
        name: 'Reinforced Hull',
        description: '+5% max health per level',
        baseCost: 8,
        maxLevel: 10,
        icon: '◇',
        tier: 'foundation',
        effect: { type: 'health', valuePerLevel: 0.05 }
    },
    {
        id: 'starting_speed',
        name: 'Ion Thrusters',
        description: '+4% movement speed per level',
        baseCost: 6,
        maxLevel: 8,
        icon: '△',
        tier: 'foundation',
        effect: { type: 'speed', valuePerLevel: 0.04 }
    },
    {
        id: 'starting_damage',
        name: 'Enhanced Firepower',
        description: '+6% base damage per level',
        baseCost: 10,
        maxLevel: 10,
        icon: '◆',
        tier: 'foundation',
        effect: { type: 'damage', valuePerLevel: 0.06 }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIER 2: SPECIALIZATION - Build-enabling, medium investment
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'chain_upgrade',
        name: 'Lightning Mastery',
        description: '+1 chain target per level',
        baseCost: 20,
        maxLevel: 4,
        icon: '⚡',
        tier: 'specialization',
        effect: { type: 'chain', valuePerLevel: 1 }
    },
    {
        id: 'orbit_boost',
        name: 'Orbital Frequency',
        description: '+8% orbital damage & speed per level',
        baseCost: 18,
        maxLevel: 5,
        icon: '◎',
        tier: 'specialization',
        effect: { type: 'orbital', valuePerLevel: 0.08 }
    },
    {
        id: 'starting_crit',
        name: 'Precision Matrix',
        description: '+3% crit chance per level',
        baseCost: 22,
        maxLevel: 5,
        icon: '☆',
        tier: 'specialization',
        effect: { type: 'crit', valuePerLevel: 0.03 }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIER 3: FORTUNE & UTILITY - Long-term investment, QoL
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'star_chance',
        name: 'Stellar Fortune',
        description: '+8% bonus star chance per level',
        baseCost: 25,
        maxLevel: 5,
        icon: '★',
        tier: 'fortune',
        effect: { type: 'starChance', valuePerLevel: 0.08 }
    },
    {
        id: 'boss_stars',
        name: 'Cosmic Tribute',
        description: '+1 guaranteed star per boss per level',
        baseCost: 40,
        maxLevel: 3,
        icon: '✧',
        tier: 'fortune',
        effect: { type: 'bossStars', valuePerLevel: 1 }
    },
    {
        id: 'dodge_cooldown',
        name: 'Phase Harmonics',
        description: '-4% dodge cooldown per level',
        baseCost: 30,
        maxLevel: 4,
        icon: '⌘',
        tier: 'fortune',
        effect: { type: 'dodgeCooldown', valuePerLevel: -0.04 }
    }
];

// Tier display names for UI
const META_UPGRADE_TIERS = {
    foundation: { name: 'Foundation', color: '#00ffff', order: 1 },
    specialization: { name: 'Specialization', color: '#ff00ff', order: 2 },
    fortune: { name: 'Fortune', color: '#f1c40f', order: 3 }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.META_UPGRADE_DEFINITIONS = META_UPGRADE_DEFINITIONS;
    window.META_UPGRADE_TIERS = META_UPGRADE_TIERS;
    window.calculateUpgradeCost = calculateUpgradeCost;
}


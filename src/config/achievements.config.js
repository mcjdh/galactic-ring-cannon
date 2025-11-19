/**
 * 🏆 ACHIEVEMENT DEFINITIONS
 * Central configuration for all game achievements
 *
 * Achievement Categories:
 * - Combat: Kill-related achievements
 * - Progression: Level and collection achievements
 * - Skill: Dodge and defensive achievements
 * - Challenge: Survival and difficulty achievements
 * - Special: Build-specific and technical achievements
 *
 * Properties:
 * - name: Display name
 * - description: Achievement description
 * - icon: Emoji icon
 * - progress: Current progress (tracked at runtime)
 * - target: Goal value to unlock
 * - unlocked: Whether unlocked (tracked at runtime)
 * - important: Awards bonus stars if true
 * - unlocksCharacter: Optional character id rewarded on unlock
 */

const ACHIEVEMENT_DEFINITIONS = {
    // ========================================
    // COMBAT ACHIEVEMENTS
    // ========================================
    'first_kill': {
        name: 'First Blood',
        description: 'Defeat your first enemy',
        icon: '+',
        category: 'Combat',
        progress: 0,
        target: 1,
        unlocked: false
    },
    'combo_master': {
        name: 'Combo Master',
        description: 'Reach a 10x combo',
        icon: '^',
        category: 'Combat',
        progress: 0,
        target: 10,
        unlocked: false
    },
    'boss_slayer': {
        name: 'Boss Slayer',
        description: 'Defeat 5 bosses',
        icon: 'W',
        category: 'Combat',
        progress: 0,
        target: 5,
        unlocked: false,
        important: true
    },
    'mega_boss_slayer': {
        name: 'Mega Boss Slayer',
        description: 'Defeat the Mega Boss',
        icon: '*',
        category: 'Combat',
        progress: 0,
        target: 1,
        unlocked: false,
        important: true
    },
    'kill_streak': {
        name: 'Kill Streak',
        description: 'Kill 50 enemies in 10 seconds',
        icon: '*',
        category: 'Combat',
        progress: 0,
        target: 50,
        unlocked: false
    },

    // ========================================
    // PROGRESSION ACHIEVEMENTS
    // ========================================
    'level_up': {
        name: 'Level Up!',
        description: 'Reach level 20',
        icon: '*',
        category: 'Progression',
        progress: 0,
        target: 20,
        unlocked: false
    },
    'star_collector': {
        name: 'Star Collector',
        description: 'Collect 5000 XP orbs',
        icon: '+',
        category: 'Progression',
        progress: 0,
        target: 5000,
        unlocked: false
    },
    'meta_star_collector': {
        name: 'Meta Star Collector',
        description: 'Earn 500 meta stars',
        icon: '*',
        category: 'Progression',
        progress: 0,
        target: 500,
        unlocked: false
    },
    'max_upgrade': {
        name: 'Fully Upgraded',
        description: 'Max out any Star Vendor upgrade',
        icon: '=',
        category: 'Progression',
        progress: 0,
        target: 1,
        unlocked: false
    },

    // ========================================
    // SKILL ACHIEVEMENTS
    // ========================================
    'perfect_dodge': {
        name: 'Perfect Dodge',
        description: 'Dodge an attack at the last moment',
        icon: 'o',
        category: 'Skill',
        progress: 0,
        target: 1,
        unlocked: false
    },
    'untouchable': {
        name: 'Untouchable',
        description: 'Survive for 120 seconds without taking damage',
        icon: '#',
        category: 'Skill',
        progress: 0,
        target: 120,
        unlocked: false
    },
    'tank_commander': {
        name: 'Tank Commander',
        description: 'Survive 5 minutes without dodging in a single run',
        icon: '#',
        category: 'Skill',
        progress: 0,
        target: 300,
        unlocked: false
    },

    // ========================================
    // CHALLENGE ACHIEVEMENTS
    // ========================================
    'speed_runner': {
        name: 'Speed Runner',
        description: 'Reach level 25 in a single run',
        icon: '*',
        category: 'Skill',
        progress: 0,
        target: 25,
        unlocked: false
    },
    'elite_hunter': {
        name: 'Elite Hunter',
        description: 'Defeat 50 elite enemies',
        icon: 'M',
        category: 'Combat',
        progress: 0,
        target: 50,
        unlocked: false
    },
    // ========================================
    // LIFETIME/CUMULATIVE ACHIEVEMENTS
    // ========================================
    'cosmic_veteran': {
        name: 'Cosmic Veteran',
        description: 'Deal 2,000,000 total damage across all runs',
        icon: '*',
        category: 'Progression',
        progress: 0,
        target: 2000000,
        unlocked: false,
        important: true
    },
    'galactic_explorer': {
        name: 'Galactic Explorer',
        description: 'Travel 500,000 distance across all runs',
        icon: '~',
        category: 'Progression',
        progress: 0,
        target: 500000,
        unlocked: false
    },
    'trigger_happy': {
        name: 'Trigger Happy',
        description: 'Fire 100,000 projectiles across all runs',
        icon: '+',
        category: 'Progression',
        progress: 0,
        target: 100000,
        unlocked: false
    },

    // ========================================
    // CHARACTER-THEMED ACHIEVEMENTS
    // ========================================
    'nova_blitz': {
        name: 'Nova Blitz',
        description: 'Kill 75 enemies in 30 seconds',
        icon: '^',
        category: 'Special',
        progress: 0,
        target: 75,
        unlocked: false
    },
    'storm_surge': {
        name: 'Storm Surge',
        description: 'Hit 10 enemies with a single chain lightning',
        icon: '*',
        category: 'Special',
        progress: 0,
        target: 10,
        unlocked: false,
        unlocksCharacter: 'stormcaller'
    },
    'grim_harvest': {
        name: 'Grim Harvest',
        description: 'Deal 5000 damage with burn/fire effects in a single run',
        icon: '†',
        category: 'Special',
        progress: 0,
        target: 5000,  // Tuned for modern Pyromancy builds (≈10-15s sustained burns)
        unlocked: false,
        unlocksCharacter: 'inferno_juggernaut'
    },
    'crimson_pact': {
        name: 'Crimson Pact',
        description: 'Heal 1000 HP via lifesteal in a single run',
        icon: '♦',
        category: 'Special',
        progress: 0,
        target: 1000,  // Reduced from 1200 - lifesteal is % based so values are small
        unlocked: false,
        unlocksCharacter: 'crimson_reaver',
        important: true
    },
    'event_horizon': {
        name: 'Event Horizon',
        description: 'Deal 50,000 damage in a single run',
        icon: '%',
        category: 'Special',
        progress: 0,
        target: 50000,
        unlocked: false,
        unlocksCharacter: 'void_warden',
        important: true
    },
    'edge_walker': {
        name: 'Edge Walker',
        description: 'Survive for 45 seconds with less than 50% health in a single run',
        icon: 'V',
        category: 'Skill',
        progress: 0,
        target: 45, // Reduced from 60s - 45s feels more achievable while still risky
        unlocked: false,
        important: true,
        unlocksCharacter: 'cybernetic_berserker'

    },

    // ========================================
    // SPECIAL ACHIEVEMENTS (Build-Specific)
    // ========================================
    'critical_master': {
        name: 'Critical Master',
        description: 'Land 200 critical hits',
        icon: 'X',
        category: 'Special',
        progress: 0,
        target: 200,
        unlocked: false
    },
    'chain_reaction': {
        name: 'Chain Reaction',
        description: 'Hit 8 enemies with a single chain lightning',
        icon: '*',
        category: 'Special',
        progress: 0,
        target: 8,
        unlocked: false
    },
    'ricochet_master': {
        name: 'Ricochet Master',
        description: 'Hit 5 enemies with a single ricochet',
        icon: '<',
        category: 'Special',
        progress: 0,
        target: 5,
        unlocked: false
    },
    'ricochet_rampage': {
        name: 'Ricochet Rampage',
        description: 'Land 200 ricochet bounces in a single run',
        icon: '<<',
        category: 'Special',
        progress: 0,
        target: 200,
        unlocked: false,
        important: true,
        unlocksCharacter: 'phantom_striker'
    },
    'orbital_master': {
        name: 'Orbital Master',
        description: 'Have 5 orbital projectiles at once',
        icon: 'o-',
        category: 'Special',
        progress: 0,
        target: 5,
        unlocked: false,
        unlocksCharacter: 'nexus_architect'
    },
    'split_shot_specialist': {
        name: 'Split Shot Specialist',
        description: 'Draft Split Shot five times in a single run',
        icon: '≡',
        category: 'Special',
        progress: 0,
        target: 5,
        unlocked: false,
        unlocksCharacter: 'nova_corsair'
    },

    // ========================================
    // SHIELD ACHIEVEMENTS (Aegis Vanguard)
    // ========================================
    'unbreakable': {
        name: 'Unbreakable',
        description: 'Block 10000 damage with shields',
        icon: '[]',
        category: 'Special',
        progress: 0,
        target: 10000,
        unlocked: false,
        important: true
    },
    'adaptive_evolution': {
        name: 'Adaptive Evolution',
        description: 'Reach maximum adaptive armor growth',
        icon: '[^]',
        category: 'Special',
        progress: 0,
        target: 1,  // Binary achievement - either maxed or not
        unlocked: false
    },
    'aegis_guardian': {
        name: 'Aegis Guardian',
        description: 'Survive 1 minute without shield breaking',
        icon: '[=]',
        category: 'Skill',
        progress: 0,
        target: 60,
        unlocked: false,
        important: true
    }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;
}

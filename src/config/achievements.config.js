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
 */

const ACHIEVEMENT_DEFINITIONS = {
    // ========================================
    // COMBAT ACHIEVEMENTS
    // ========================================
    'first_kill': {
        name: 'First Blood',
        description: 'Defeat your first enemy',
        icon: '⚔️',
        progress: 0,
        target: 1,
        unlocked: false
    },
    'combo_master': {
        name: 'Combo Master',
        description: 'Reach a 10x combo',
        icon: '🔥',
        progress: 0,
        target: 10,
        unlocked: false
    },
    'boss_slayer': {
        name: 'Boss Slayer',
        description: 'Defeat 5 bosses',
        icon: '👑',
        progress: 0,
        target: 5,
        unlocked: false,
        important: true
    },
    'mega_boss_slayer': {
        name: 'Mega Boss Slayer',
        description: 'Defeat the Mega Boss',
        icon: '🌟',
        progress: 0,
        target: 1,
        unlocked: false,
        important: true
    },
    'kill_streak': {
        name: 'Kill Streak',
        description: 'Kill 50 enemies in 10 seconds',
        icon: '⚡',
        progress: 0,
        target: 50,
        unlocked: false
    },

    // ========================================
    // PROGRESSION ACHIEVEMENTS
    // ========================================
    'level_up': {
        name: 'Level Up!',
        description: 'Reach level 10',
        icon: '⭐',
        progress: 0,
        target: 10,
        unlocked: false
    },
    'star_collector': {
        name: 'Star Collector',
        description: 'Collect 1000 XP orbs',
        icon: '✨',
        progress: 0,
        target: 1000,
        unlocked: false
    },
    'meta_star_collector': {
        name: 'Meta Star Collector',
        description: 'Earn 100 meta stars',
        icon: '⭐',
        progress: 0,
        target: 100,
        unlocked: false
    },
    'max_upgrade': {
        name: 'Fully Upgraded',
        description: 'Max out any Star Vendor upgrade',
        icon: '🌈',
        progress: 0,
        target: 1,
        unlocked: false
    },

    // ========================================
    // SKILL ACHIEVEMENTS
    // ========================================
    'dodge_master': {
        name: 'Dodge Master',
        description: 'Successfully dodge 50 times',
        icon: '💨',
        progress: 0,
        target: 50,
        unlocked: false
    },
    'perfect_dodge': {
        name: 'Perfect Dodge',
        description: 'Dodge an attack at the last moment',
        icon: '🎯',
        progress: 0,
        target: 1,
        unlocked: false
    },
    'untouchable': {
        name: 'Untouchable',
        description: 'Survive for 60 seconds without taking damage',
        icon: '🛡️',
        progress: 0,
        target: 60,
        unlocked: false
    },

    // ========================================
    // CHALLENGE ACHIEVEMENTS
    // ========================================
    'survivor': {
        name: 'Survivor',
        description: 'Survive for 10 minutes',
        icon: '⏱️',
        progress: 0,
        target: 600, // 10 minutes in seconds
        unlocked: false
    },
    'elite_hunter': {
        name: 'Elite Hunter',
        description: 'Defeat 10 elite enemies',
        icon: '🎖️',
        progress: 0,
        target: 10,
        unlocked: false
    },
    'wave_master': {
        name: 'Wave Master',
        description: 'Survive 10 waves',
        icon: '🌊',
        progress: 0,
        target: 10,
        unlocked: false
    },

    // ========================================
    // SPECIAL ACHIEVEMENTS (Build-Specific)
    // ========================================
    'critical_master': {
        name: 'Critical Master',
        description: 'Land 50 critical hits',
        icon: '💥',
        progress: 0,
        target: 50,
        unlocked: false
    },
    'chain_reaction': {
        name: 'Chain Reaction',
        description: 'Hit 5 enemies with a single chain lightning',
        icon: '⚡',
        progress: 0,
        target: 5,
        unlocked: false
    },
    'ricochet_master': {
        name: 'Ricochet Master',
        description: 'Hit 3 enemies with a single ricochet',
        icon: '↪️',
        progress: 0,
        target: 3,
        unlocked: false
    },
    'orbital_master': {
        name: 'Orbital Master',
        description: 'Have 5 orbital projectiles at once',
        icon: '🌠',
        progress: 0,
        target: 5,
        unlocked: false
    }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;
}

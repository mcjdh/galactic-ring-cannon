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
        progress: 0,
        target: 1,
        unlocked: false
    },
    'combo_master': {
        name: 'Combo Master',
        description: 'Reach a 10x combo',
        icon: '^',
        progress: 0,
        target: 10,
        unlocked: false
    },
    'boss_slayer': {
        name: 'Boss Slayer',
        description: 'Defeat 5 bosses',
        icon: 'W',
        progress: 0,
        target: 5,
        unlocked: false,
        important: true
    },
    'mega_boss_slayer': {
        name: 'Mega Boss Slayer',
        description: 'Defeat the Mega Boss',
        icon: '*',
        progress: 0,
        target: 1,
        unlocked: false,
        important: true
    },
    'kill_streak': {
        name: 'Kill Streak',
        description: 'Kill 50 enemies in 10 seconds',
        icon: '*',
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
        icon: '*',
        progress: 0,
        target: 10,
        unlocked: false
    },
    'star_collector': {
        name: 'Star Collector',
        description: 'Collect 1000 XP orbs',
        icon: '+',
        progress: 0,
        target: 1000,
        unlocked: false
    },
    'meta_star_collector': {
        name: 'Meta Star Collector',
        description: 'Earn 100 meta stars',
        icon: '*',
        progress: 0,
        target: 100,
        unlocked: false
    },
    'max_upgrade': {
        name: 'Fully Upgraded',
        description: 'Max out any Star Vendor upgrade',
        icon: '=',
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
        progress: 0,
        target: 1,
        unlocked: false
    },
    'untouchable': {
        name: 'Untouchable',
        description: 'Survive for 60 seconds without taking damage',
        icon: '#',
        progress: 0,
        target: 60,
        unlocked: false
    },
    'tank_commander': {
        name: 'Tank Commander',
        description: 'Survive 3 minutes without dodging in a single run',
        icon: '#',
        progress: 0,
        target: 180,
        unlocked: false
    },

    // ========================================
    // CHALLENGE ACHIEVEMENTS
    // ========================================
    'speed_runner': {
        name: 'Speed Runner',
        description: 'Reach level 15 in a single run',
        icon: '*',
        progress: 0,
        target: 15,
        unlocked: false
    },
    'elite_hunter': {
        name: 'Elite Hunter',
        description: 'Defeat 10 elite enemies',
        icon: 'M',
        progress: 0,
        target: 10,
        unlocked: false
    },
    // ========================================
    // LIFETIME/CUMULATIVE ACHIEVEMENTS
    // ========================================
    'cosmic_veteran': {
        name: 'Cosmic Veteran',
        description: 'Deal 500,000 total damage across all runs',
        icon: '*',
        progress: 0,
        target: 500000,
        unlocked: false,
        important: true
    },
    'galactic_explorer': {
        name: 'Galactic Explorer',
        description: 'Travel 100,000 distance across all runs',
        icon: '~',
        progress: 0,
        target: 100000,
        unlocked: false
    },
    'trigger_happy': {
        name: 'Trigger Happy',
        description: 'Fire 25,000 projectiles across all runs',
        icon: '+',
        progress: 0,
        target: 25000,
        unlocked: false
    },

    // ========================================
    // CHARACTER-THEMED ACHIEVEMENTS
    // ========================================
    'nova_blitz': {
        name: 'Nova Blitz',
        description: 'Kill 75 enemies in 30 seconds',
        icon: '^',
        progress: 0,
        target: 75,
        unlocked: false
    },
    'storm_surge': {
        name: 'Storm Surge',
        description: 'Hit 6 enemies with a single chain lightning',
        icon: '*',
        progress: 0,
        target: 6,
        unlocked: false,
        unlocksCharacter: 'stormcaller'
    },
    'grim_harvest': {
        name: 'Grim Harvest',
        description: 'Lifesteal 1,000 HP in a single run',
        icon: '†',
        progress: 0,
        target: 1000,
        unlocked: false,
        unlocksCharacter: 'eclipse_reaper'
    },

    // ========================================
    // SPECIAL ACHIEVEMENTS (Build-Specific)
    // ========================================
    'critical_master': {
        name: 'Critical Master',
        description: 'Land 50 critical hits',
        icon: 'X',
        progress: 0,
        target: 50,
        unlocked: false
    },
    'chain_reaction': {
        name: 'Chain Reaction',
        description: 'Hit 5 enemies with a single chain lightning',
        icon: '*',
        progress: 0,
        target: 5,
        unlocked: false
    },
    'ricochet_master': {
        name: 'Ricochet Master',
        description: 'Hit 3 enemies with a single ricochet',
        icon: '<',
        progress: 0,
        target: 3,
        unlocked: false
    },
    'orbital_master': {
        name: 'Orbital Master',
        description: 'Have 5 orbital projectiles at once',
        icon: 'o-',
        progress: 0,
        target: 5,
        unlocked: false,
        unlocksCharacter: 'nexus_architect'
    },
    'split_shot_specialist': {
        name: 'Split Shot Specialist',
        description: 'Draft Split Shot four times in a single run',
        icon: '≡',
        progress: 0,
        target: 4,
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
        progress: 0,
        target: 10000,
        unlocked: false,
        important: true
    },
    'adaptive_evolution': {
        name: 'Adaptive Evolution',
        description: 'Reach maximum adaptive armor growth',
        icon: '[^]',
        progress: 0,
        target: 1,  // Binary achievement - either maxed or not
        unlocked: false
    },
    'aegis_guardian': {
        name: 'Aegis Guardian',
        description: 'Survive 1 minute without shield breaking',
        icon: '[=]',
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

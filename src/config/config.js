/**
 * Unified Game Configuration
 * Consolidated from multiple config files to eliminate duplication
 */
const GameConfig = {
    // Performance settings
    PERFORMANCE: {
        MAX_ENTITIES: 2000,
        MAX_PARTICLES: 150,
        TARGET_FPS: 60,
        MIN_FPS: 30,
        UI_UPDATE_INTERVAL: 16.67, // ~60fps
        RESOURCE_CLEANUP_INTERVAL: 5000
    },
    
    // Player settings
    PLAYER: {
        BASE_HEALTH: 100,
        BASE_SPEED: 150,
        BASE_DAMAGE: 25,
        BASE_ATTACK_SPEED: 1.5,
        RADIUS: 18,
        DODGE_COOLDOWN: 1.0,
        DODGE_DURATION: 0.2,
        DODGE_SPEED_MULTIPLIER: 2.5,
        XP_MAGNET_RANGE: 50,
        CRIT_CHANCE: 0.02,
        DAMAGE_REDUCTION: 0
    },
    
    // Enemy settings
    ENEMY: {
        BASE_HEALTH: 30,
        BASE_DAMAGE: 10,
        BASE_SPEED: 60,
        BASE_XP_VALUE: 10,
        SPAWN_DISTANCE: 800,
        DESPAWN_DISTANCE: 1200,
        ELITE_CHANCE: 0.1,
        ELITE_HEALTH_MULTIPLIER: 2.5,
        ELITE_DAMAGE_MULTIPLIER: 1.5
    },
    
    // Game progression
    PROGRESSION: {
        XP_SCALING: 1.2,
        LEVEL_UP_HEAL_PERCENT: 0.5,
        BOSS_INTERVALS: [60, 90, 120], // seconds
        DIFFICULTY_SCALING: 1.0,
        ENDLESS_MODE_SCALING: 1.15,
        MAX_DIFFICULTY_MULTIPLIER: 4.0
    },
    
    // Audio settings
    AUDIO: {
        MASTER_VOLUME: 0.5,
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.7
    },
    
    // UI settings
    UI: {
        HEALTH_BAR_SMOOTHING: 0.95,
        XP_BAR_SMOOTHING: 0.9,
        FLOATING_TEXT_DURATION: 2000,
        MINIMAP_SIZE: 150,
        COMBO_DECAY_RATE: 0.5
    },
    
    // Visual effects
    VISUAL: {
        SCREEN_SHAKE_AMOUNT: 4,
        PARTICLE_LIFETIME: 1.0,
        TRAIL_LENGTH: 8
    }
};

// Input key mappings
const INPUT_KEYS = {
    MOVE_UP: ['w', 'W', 'ArrowUp'],
    MOVE_DOWN: ['s', 'S', 'ArrowDown'], 
    MOVE_LEFT: ['a', 'A', 'ArrowLeft'],
    MOVE_RIGHT: ['d', 'D', 'ArrowRight'],
    DODGE: [' ', 'Space'],
    PAUSE: ['p', 'P', 'Escape'],
    MUTE: ['m', 'M'],
    LOW_QUALITY: ['l', 'L'],
    DEBUG: ['F3'],
    PERFORMANCE: ['o', 'O']
};

// Entity types
const ENTITY_TYPES = {
    PLAYER: 'player',
    ENEMY: 'enemy', 
    PROJECTILE: 'projectile',
    ENEMY_PROJECTILE: 'enemyProjectile',
    XP_ORB: 'xpOrb',
    PARTICLE: 'particle',
    DAMAGE_ZONE: 'damageZone'
};

// Make globally available
if (typeof window !== 'undefined') {
    window.GameConfig = GameConfig;
    window.INPUT_KEYS = INPUT_KEYS;
    window.ENTITY_TYPES = ENTITY_TYPES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameConfig, INPUT_KEYS, ENTITY_TYPES };
}

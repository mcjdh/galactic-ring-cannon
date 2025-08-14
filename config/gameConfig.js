// Game Configuration
export const GAME_CONFIG = {
    // Canvas & Rendering
    CANVAS: {
        TARGET_FPS: 60,
        ENABLE_VSYNC: true,
        ALPHA_ENABLED: false,
        GPU_ACCELERATION: true
    },
    
    // Performance Settings
    PERFORMANCE: {
        MAX_ENTITIES: 2000,
        MAX_PARTICLES: 150,
        GRID_SIZE: 100,
        MAX_POOL_SIZE: 100,
        UI_UPDATE_INTERVAL: 16.67, // ~60fps
        RESOURCE_CLEANUP_INTERVAL: 5000
    },
    
    // Player Settings
    PLAYER: {
        BASE_HEALTH: 100,
        BASE_SPEED: 150,
        BASE_DAMAGE: 25,
        DODGE_COOLDOWN: 1.0,
        DODGE_DURATION: 0.2,
        DODGE_SPEED_MULTIPLIER: 2.5,
        XP_MAGNET_RANGE: 50,
        ATTACK_RATE: 3.0,
        REGEN_RATE: 0,
        CRIT_CHANCE: 0.02,
        DAMAGE_REDUCTION: 0
    },
    
    // Enemy Settings
    ENEMY: {
        SPAWN_DISTANCE: 800,
        DESPAWN_DISTANCE: 1200,
        BASE_HEALTH_SCALING: 1.1,
        BASE_DAMAGE_SCALING: 1.05,
        ELITE_CHANCE: 0.1,
        ELITE_HEALTH_MULTIPLIER: 2.5,
        ELITE_DAMAGE_MULTIPLIER: 1.5
    },
    
    // Game Progression
    PROGRESSION: {
        XP_SCALING: 1.2,
        LEVEL_UP_HEAL_PERCENT: 0.5,
        BOSS_INTERVALS: [60, 90, 120], // seconds
        DIFFICULTY_SCALING: 1.0,
        ENDLESS_MODE_SCALING: 1.15
    },
    
    // Audio Settings
    AUDIO: {
        MASTER_VOLUME: 0.5,
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.7,
        ENABLE_AUDIO_CONTEXT: true
    },
    
    // UI Settings
    UI: {
        HEALTH_BAR_SMOOTHING: 0.95,
        XP_BAR_SMOOTHING: 0.9,
        FLOATING_TEXT_DURATION: 2000,
        MINIMAP_SIZE: 150,
        COMBO_DECAY_RATE: 0.5
    },
    
    // Debug Settings
    DEBUG: {
        SHOW_GRID: false,
        SHOW_HITBOXES: false,
        SHOW_FPS: false,
        LOG_ENTITY_COUNT: false,
        PERFORMANCE_MONITORING: true
    }
};

// Game Constants
export const CONSTANTS = {
    // Entity Types
    ENTITY_TYPES: {
        PLAYER: 'player',
        ENEMY: 'enemy',
        PROJECTILE: 'projectile',
        ENEMY_PROJECTILE: 'enemyProjectile',
        XP_ORB: 'xpOrb',
        PARTICLE: 'particle',
        DAMAGE_ZONE: 'damageZone'
    },
    
    // Enemy Types
    ENEMY_TYPES: {
        BASIC: 'basic',
        FAST: 'fast',
        TANK: 'tank',
        RANGED: 'ranged',
        DASHER: 'dasher',
        EXPLODER: 'exploder',
        TELEPORTER: 'teleporter',
        BOSS: 'boss'
    },
    
    // Upgrade Types
    UPGRADE_TYPES: {
        HEALTH: 'health',
        DAMAGE: 'damage',
        SPEED: 'speed',
        ATTACK_RATE: 'attackRate',
        PROJECTILE_COUNT: 'projectileCount',
        PIERCING: 'piercing',
        LIFESTEAL: 'lifesteal',
        MAGNET_RANGE: 'magnetRange',
        CRIT_CHANCE: 'critChance',
        EXPLOSIVE: 'explosive',
        CHAIN_LIGHTNING: 'chainLightning',
        ORBITAL: 'orbital'
    },
    
    // Game States
    GAME_STATES: {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        LEVEL_UP: 'levelUp',
        GAME_OVER: 'gameOver',
        VICTORY: 'victory'
    },
    
    // Input Keys
    KEYS: {
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
    }
};

// Export default configuration
export default GAME_CONFIG;

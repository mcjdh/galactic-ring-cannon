/**
 * Game Constants - Centralized configuration for all game values
 * Replaces magic numbers scattered throughout the codebase
 */

export const GAME_CONSTANTS = {
    // Player Configuration
    PLAYER: {
        BASE_SPEED: 220,
        BASE_HEALTH: 120,
        BASE_ATTACK_SPEED: 1.2,
        BASE_ATTACK_DAMAGE: 25,
        BASE_ATTACK_RANGE: 300,
        BASE_PROJECTILE_SPEED: 450,
        BASE_CRIT_CHANCE: 0.10,
        BASE_CRIT_MULTIPLIER: 2.2,
        BASE_MAGNET_RANGE: 120,
        
        // Dodge System
        DODGE_COOLDOWN: 2.0,
        DODGE_DURATION: 0.3,
        DODGE_SPEED: 600,
        INVULNERABILITY_TIME: 0.5,
        
        // XP System
        INITIAL_XP_TO_LEVEL: 212,
        XP_SCALING_FACTOR: 1.12,
        LEVEL_UP_HEAL_PERCENT: 0.3,
        
        // Player Physical Properties
        RADIUS: 20,
        TRAIL_DISTANCE: 15,
        
        // AOE Attack Constants
        AOE_ATTACK_COOLDOWN: 2.0,
        AOE_ATTACK_RANGE: 150,
        AOE_DAMAGE_MULTIPLIER: 0.6
    },
    
    // Enemy Configuration
    ENEMIES: {
        SPAWN_DISTANCE_MIN: 400,
        SPAWN_DISTANCE_MAX: 800,
        BASE_SPAWN_RATE: 1.1,
        BASE_MAX_ENEMIES: 50,
        ELITE_CHANCE_BASE: 0.06,
        ELITE_HEALTH_MULTIPLIER: 2.5,
        ELITE_DAMAGE_MULTIPLIER: 1.5,
        
        // Boss System
        BOSS_HEAL_BONUS: 0.15, // 15% max health restored on boss kill
        BOSS_INVULNERABILITY_REWARD: 2.0 // seconds of safety after boss kill
    },
    
    // Difficulty Scaling
    DIFFICULTY: {
        BASE_FACTOR: 1.0,
        MAX_FACTOR: 4.0,
        SCALING_INTERVAL: 20, // seconds between increases
        SCALING_MULTIPLIER: 1.12,
        
        // Performance-based adjustments
        LOW_HEALTH_THRESHOLD: 0.3,
        LOW_HEALTH_SCALING_REDUCTION: 0.85,
        HIGH_LEVEL_THRESHOLD: 10,
        HIGH_LEVEL_SCALING_INCREASE: 1.05
    },
    
    // Particle System
    PARTICLES: {
        MAX_PARTICLES_NORMAL: 150,
        MAX_PARTICLES_LOW: 75,
        MAX_PARTICLES_CRITICAL: 30,
        POOL_SIZE_DEFAULT: 100,
        CLEANUP_INTERVAL: 5000, // milliseconds
        
        // Effect Counts
        HIT_EFFECT_BASE_COUNT: 8,
        EXPLOSION_BASE_COUNT: 24,
        LEVEL_UP_BASE_COUNT: 30,
        TRAIL_DISTANCE_THRESHOLD: 15
    },
    
    // UI Configuration
    UI: {
        UPDATE_INTERVAL_NORMAL: 0.25, // seconds
        UPDATE_INTERVAL_LOW: 0.5,
        UPDATE_INTERVAL_CRITICAL: 1.0,
        
        MINIMAP_SIZE: 200,
        MINIMAP_SCALE: 0.15,
        MINIMAP_UPDATE_INTERVAL: 50, // milliseconds
        MINIMAP_UPDATE_INTERVAL_LOW: 120,
        
        COMBO_TIMEOUT: 0.8, // seconds
        COMBO_TARGET: 8
    },
    
    // Performance Thresholds
    PERFORMANCE: {
        FPS_TARGET: 60,
        FPS_LOW_THRESHOLD: 45,
        FPS_CRITICAL_THRESHOLD: 30,
        
        MEMORY_WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB
        MEMORY_CRITICAL_THRESHOLD: 100 * 1024 * 1024, // 100MB
        
        ENTITY_COUNT_WARNING: 200,
        ENTITY_COUNT_CRITICAL: 300
    },
    
    // Audio Configuration
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.5,
        MUSIC_VOLUME: 0.3,
        
        // Sound effect volumes
        PICKUP_VOLUME: 0.2,
        SHOOT_VOLUME: 0.3,
        HIT_VOLUME: 0.2,
        ENEMY_DEATH_VOLUME: 0.3,
        BOSS_VOLUME: 0.8,
        LEVEL_UP_VOLUME: 0.6,
        DODGE_VOLUME: 0.7,
        PLAYER_HIT_VOLUME: 0.5
    },
    
    // Game Modes
    MODES: {
        NORMAL_DURATION: 180, // 3 minutes in seconds
        BOSS_SPAWN_TIMES: [60, 120, 170], // seconds when bosses spawn
        MEGA_BOSS_TIME: 170 // when mega boss spawns
    },
    
    // Meta Progression
    META: {
        STARS_PER_50_KILLS: 1,
        STARS_PER_BOSS: 1,
        CRIT_XP_CHANCE: 0.15,
        CRIT_XP_MULTIPLIER_NORMAL: 2,
        CRIT_XP_MULTIPLIER_HIGH: 3,
        CRIT_XP_HIGH_CHANCE: 0.3
    },
    
    // Physics
    PHYSICS: {
        MOVEMENT_ACCELERATION: 1200, // pixels/sec²
        MOVEMENT_FRICTION: 0.85,
        PARTICLE_FRICTION: 0.95,
        GRAVITY: 0, // disabled for this game
        
        // Collision
        COLLISION_GRID_SIZE: 100,
        COLLISION_MARGIN: 5
    },
    
    // Colors (for consistency)
    COLORS: {
        PLAYER: '#3498db',
        ENEMY_BASIC: '#e74c3c',
        ENEMY_ELITE: '#f39c12',
        BOSS: '#f1c40f',
        MEGA_BOSS: '#9b59b6',
        
        XP_NORMAL: '#2ecc71',
        XP_CRITICAL: '#f39c12',
        
        DAMAGE_NORMAL: '#ffffff',
        DAMAGE_CRITICAL: '#f1c40f',
        DAMAGE_PLAYER: '#e74c3c',
        HEAL: '#2ecc71',
        
        COMBO: '#f1c40f',
        LEVEL_UP: '#9b59b6'
    },
    
    // Screen Effects
    SCREEN_EFFECTS: {
        SHAKE_INTENSITY_LIGHT: 2,
        SHAKE_INTENSITY_MEDIUM: 4,
        SHAKE_INTENSITY_HEAVY: 8,
        SHAKE_INTENSITY_EXTREME: 12,
        
        SHAKE_DURATION_SHORT: 0.2,
        SHAKE_DURATION_MEDIUM: 0.5,
        SHAKE_DURATION_LONG: 1.0
    }
};

// Convenience accessors for commonly used values
export const PLAYER_CONSTANTS = GAME_CONSTANTS.PLAYER;
export const ENEMY_CONSTANTS = GAME_CONSTANTS.ENEMIES;
export const PARTICLE_CONSTANTS = GAME_CONSTANTS.PARTICLES;
export const UI_CONSTANTS = GAME_CONSTANTS.UI;
export const PERFORMANCE_CONSTANTS = GAME_CONSTANTS.PERFORMANCE;

// Helper functions for common calculations
export const GameMath = {
    /**
     * Calculate XP required for a given level
     */
    xpForLevel(level) {
        let totalXP = 0;
        let currentRequirement = PLAYER_CONSTANTS.INITIAL_XP_TO_LEVEL;
        
        for (let i = 1; i < level; i++) {
            totalXP += currentRequirement;
            currentRequirement = Math.floor(currentRequirement * PLAYER_CONSTANTS.XP_SCALING_FACTOR);
        }
        
        return totalXP;
    },
    
    /**
     * Calculate difficulty-scaled enemy count
     */
    scaledEnemyCount(baseCount, difficultyFactor, gameTime) {
        const timeMinutes = gameTime / 60;
        const timeFactor = 1 + (timeMinutes * 0.1);
        return Math.floor(baseCount * difficultyFactor * timeFactor);
    },
    
    /**
     * Calculate performance-based particle count
     */
    particleCount(baseCount, performanceMode, reductionFactor = 1.0) {
        const maxParticles = PARTICLE_CONSTANTS[`MAX_PARTICLES_${performanceMode.toUpperCase()}`] || 
                           PARTICLE_CONSTANTS.MAX_PARTICLES_NORMAL;
        
        return Math.floor(baseCount * reductionFactor * (maxParticles / PARTICLE_CONSTANTS.MAX_PARTICLES_NORMAL));
    }
};

// Make constants globally available for compatibility
if (typeof window !== 'undefined') {
    window.GAME_CONSTANTS = GAME_CONSTANTS;
    window.GameMath = GameMath;
}

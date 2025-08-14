/**
 * Game Constants - Centralized configuration for all game values
 * 🎯 Extracted from scattered magic numbers across the codebase
 * 🔧 Tunable values for game balance and performance
 */

export const GAME_CONSTANTS = {
    // 🏃‍♂️ Player Configuration
    PLAYER: {
        // Movement & Physics
        BASE_SPEED: 220,              // Base movement speed
        RADIUS: 20,                   // Player collision radius
        
        // Health & Survival
        BASE_HEALTH: 120,             // Starting health
        MAX_HEALTH: 120,              // Maximum health
        INVULNERABILITY_TIME: 0.5,    // Invulnerability duration (seconds)
        
        // Experience & Progression
        INITIAL_XP_REQUIREMENT: 212,  // XP needed for level 2
        BASE_LEVEL: 1,                // Starting level
        
        // Combat Stats
        BASE_ATTACK_SPEED: 1.2,       // Attacks per second
        BASE_ATTACK_DAMAGE: 25,       // Base damage per attack
        BASE_ATTACK_RANGE: 300,       // Attack range in pixels
        BASE_CRIT_CHANCE: 0.10,       // 10% critical hit chance
        BASE_CRIT_MULTIPLIER: 2.2,    // 2.2x damage on critical hits
        
        // Projectile Properties
        PROJECTILE_SPEED: 450,        // Base projectile velocity
        BASE_PROJECTILE_COUNT: 1,     // Starting projectile count
        BASE_PIERCING: 0,             // Projectiles pierce through N enemies
        
        // Special Abilities
        MAGNET_RANGE: 120,            // XP attraction radius
        DODGE_COOLDOWN: 2.0,          // Dodge ability cooldown (seconds)
        DODGE_DURATION: 0.3,          // Dodge invulnerability duration
        DODGE_SPEED: 600,             // Speed boost during dodge
        
        // AOE Attack
        AOE_COOLDOWN: 2.0,            // AOE attack cooldown
        AOE_RANGE: 150,               // AOE attack radius
        AOE_DAMAGE_MULTIPLIER: 0.6,   // AOE damage as % of regular damage
        
        // Visual Effects
        TRAIL_DISTANCE: 15,           // Distance between trail particles
    },
    
    // 👾 Enemy Configuration
    ENEMY: {
        // Spawning
        BASE_SPAWN_RATE: 1.0,         // Base enemies per second
        MAX_ENEMIES: 100,             // Maximum enemies on screen
        
        // Boss Properties
        BOSS_HEALTH_MULTIPLIER: 5.0,  // Boss health vs regular enemies
        MEGA_BOSS_MULTIPLIER: 10.0,   // Mega boss health multiplier
        
        // AI Behavior
        CHASE_SPEED_MULTIPLIER: 0.8,  // Speed when chasing player
        WANDER_RADIUS: 50,            // Random movement radius
    },
    
    // 🎮 Game Mechanics
    GAME: {
        // Difficulty Scaling
        DIFFICULTY_INTERVAL: 20,      // Increase difficulty every N seconds
        MAX_DIFFICULTY_FACTOR: 4.0,   // Maximum difficulty multiplier
        BASE_DIFFICULTY: 1.0,         // Starting difficulty
        
        // Combo System
        COMBO_TIMEOUT: 0.8,           // Combo reset time (seconds)
        COMBO_TARGET: 8,              // Kills needed for combo bonus
        
        // Critical XP
        CRIT_XP_CHANCE: 0.15,         // 15% chance for bonus XP
        CRIT_XP_MULTIPLIER: 2.0,      // 2x XP on critical drops
        
        // Performance Targets
        TARGET_FPS: 60,               // Desired frame rate
        MIN_FPS_THRESHOLD: 30,        // Performance warning threshold
    },
    
    // 💥 Particle & Effects
    PARTICLES: {
        // Pool Management
        MAX_PARTICLES: 150,           // Maximum active particles
        POOL_SIZE: 100,               // Particle pool size
        CLEANUP_INTERVAL: 5000,       // Pool cleanup interval (ms)
        
        // Quality Settings
        REDUCTION_FACTORS: {
            HIGH: 1.0,                // Full particle effects
            MEDIUM: 0.6,              // 60% of particles
            LOW: 0.25,                // 25% of particles
        },
        
        // Effect Durations
        HIT_EFFECT_DURATION: 0.5,     // Hit particle lifetime
        EXPLOSION_DURATION: 1.0,      // Explosion particle lifetime
        TRAIL_LIFETIME: 0.8,          // Trail particle lifetime
    },
    
    // 🎵 Audio Configuration
    AUDIO: {
        // Volume Levels
        MASTER_VOLUME: 0.7,           // Overall volume
        SFX_VOLUME: 0.5,              // Sound effects volume
        MUSIC_VOLUME: 0.3,            // Background music volume
        
        // Audio Cues
        HIT_VOLUME: 0.25,             // Hit sound volume
        EXPLOSION_VOLUME: 0.4,        // Explosion sound volume
    },
    
    // 🖥️ UI Configuration
    UI: {
        // Update Intervals
        UPDATE_INTERVALS: {
            NORMAL: 0.25,             // Normal UI refresh rate
            LOW: 0.5,                 // Low performance refresh rate
            CRITICAL: 1.0,            // Critical performance refresh rate
        },
        
        // Text Settings
        FLOATING_TEXT_DURATION: 2.0,  // Floating text lifetime
        DAMAGE_TEXT_SIZE: 14,         // Damage number font size
        XP_TEXT_SIZE: 12,             // XP text font size
    },
    
    // 🔧 Performance Configuration
    PERFORMANCE: {
        // Memory Limits
        MAX_ENTITY_COUNT: 200,        // Maximum total entities
        GARBAGE_COLLECTION_INTERVAL: 10000, // GC hint interval (ms)
        
        // Rendering Optimizations
        OFFSCREEN_CULL_MARGIN: 50,    // Pixels beyond screen to still render
        LOD_DISTANCE_THRESHOLD: 300,  // Distance for level-of-detail switching
    }
};

/**
 * Helper functions for common calculations
 */
export const GameHelpers = {
    /**
     * Calculate XP required for a given level
     * @param {number} level - Target level
     * @returns {number} XP required
     */
    getXPRequirement(level) {
        const base = GAME_CONSTANTS.PLAYER.INITIAL_XP_REQUIREMENT;
        return Math.floor(base * Math.pow(1.5, level - 2));
    },
    
    /**
     * Calculate damage with critical hit chance
     * @param {number} baseDamage - Base damage amount
     * @param {number} critChance - Critical hit chance (0-1)
     * @param {number} critMultiplier - Critical damage multiplier
     * @returns {number} Final damage amount
     */
    calculateDamage(baseDamage, critChance = GAME_CONSTANTS.PLAYER.BASE_CRIT_CHANCE, critMultiplier = GAME_CONSTANTS.PLAYER.BASE_CRIT_MULTIPLIER) {
        const isCritical = Math.random() < critChance;
        return isCritical ? baseDamage * critMultiplier : baseDamage;
    },
    
    /**
     * Get performance-adjusted particle count
     * @param {number} baseCount - Desired particle count
     * @param {string} qualityMode - 'HIGH', 'MEDIUM', or 'LOW'
     * @returns {number} Adjusted particle count
     */
    getParticleCount(baseCount, qualityMode = 'HIGH') {
        const factor = GAME_CONSTANTS.PARTICLES.REDUCTION_FACTORS[qualityMode] || 1.0;
        return Math.max(1, Math.floor(baseCount * factor));
    },
    
    /**
     * Calculate difficulty-scaled value
     * @param {number} baseValue - Base value
     * @param {number} difficultyFactor - Current difficulty multiplier
     * @param {number} scalingRate - How much difficulty affects the value (0-1)
     * @returns {number} Scaled value
     */
    scaleToDifficulty(baseValue, difficultyFactor, scalingRate = 0.5) {
        return baseValue * (1 + (difficultyFactor - 1) * scalingRate);
    }
};

/**
 * Color constants for consistent theming
 */
export const COLORS = {
    PLAYER: '#3498db',
    ENEMY: '#e74c3c',
    BOSS: '#8e44ad',
    MEGA_BOSS: '#c0392b',
    XP_ORB: '#f1c40f',
    HEALTH: '#2ecc71',
    DAMAGE: '#e74c3c',
    CRITICAL: '#f39c12',
    UI_PRIMARY: '#2c3e50',
    UI_SECONDARY: '#34495e',
};

// Make constants available globally for backward compatibility
// TODO: Remove this once all files are updated to use imports
if (typeof window !== 'undefined') {
    window.GAME_CONSTANTS = GAME_CONSTANTS;
    window.GameHelpers = GameHelpers;
    window.COLORS = COLORS;
}
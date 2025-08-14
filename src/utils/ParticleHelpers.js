/**
 * Particle Helpers - Unified interface for particle effects
 * 🎯 Bridges the gap between old ParticleManager and new OptimizedParticlePool
 * 🔧 Provides consistent API across the entire codebase
 * 
 * RESONANT NOTE: This replaces scattered particle creation patterns
 * Use these helpers instead of direct particle instantiation
 */

import { GAME_CONSTANTS, COLORS } from '../config/GameConstants.js';

class ParticleHelpers {
    constructor() {
        this.particleSystem = null;
        this.fallbackParticles = [];
        this.initialized = false;
    }
    
    /**
     * Initialize the particle system
     * Automatically detects and uses the best available system
     */
    init() {
        if (this.initialized) return;
        
        // Try to use OptimizedParticlePool first (preferred)
        if (window.optimizedParticles) {
            this.particleSystem = window.optimizedParticles;
            console.log('🎯 ParticleHelpers: Using OptimizedParticlePool');
        }
        // Fallback to ParticleManager if available
        else if (window.gameManager && window.gameManager.particleManager) {
            this.particleSystem = window.gameManager.particleManager;
            console.log('⚠️ ParticleHelpers: Using legacy ParticleManager');
        }
        // Last resort: basic particle array
        else {
            console.log('📝 ParticleHelpers: Using fallback particle system');
        }
        
        this.initialized = true;
    }
    
    /**
     * Create a hit effect at the specified location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} damage - Damage amount (affects particle count)
     * @param {string} color - Particle color (optional)
     */
    createHitEffect(x, y, damage = 25, color = COLORS.DAMAGE) {
        this.init();
        
        if (this.particleSystem && this.particleSystem.createHitEffect) {
            return this.particleSystem.createHitEffect(x, y, damage);
        }
        
        // Fallback implementation using OptimizedParticlePool
        if (this.particleSystem && this.particleSystem.spawnParticle) {
            const particleCount = Math.min(8, Math.max(3, Math.floor(damage / 10)));
            
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 * i) / particleCount;
                const speed = 50 + Math.random() * 30;
                
                this.particleSystem.spawnParticle({
                    x: x + (Math.random() - 0.5) * 10,
                    y: y + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 2,
                    color: color,
                    life: GAME_CONSTANTS.PARTICLES.HIT_EFFECT_DURATION,
                    type: 'hit'
                });
            }
        }
    }
    
    /**
     * Create an explosion effect
     * @param {number} x - X coordinate  
     * @param {number} y - Y coordinate
     * @param {number} radius - Explosion radius
     * @param {string} color - Explosion color
     */
    createExplosion(x, y, radius = 50, color = '#ff6b35') {
        this.init();
        
        if (this.particleSystem && this.particleSystem.createExplosion) {
            return this.particleSystem.createExplosion(x, y, radius, color);
        }
        
        // Fallback implementation
        if (this.particleSystem && this.particleSystem.spawnParticle) {
            const particleCount = Math.min(20, Math.max(8, Math.floor(radius / 5)));
            
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
                const speed = (radius * 0.8) + Math.random() * (radius * 0.4);
                
                this.particleSystem.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 4,
                    color: color,
                    life: GAME_CONSTANTS.PARTICLES.EXPLOSION_DURATION,
                    type: 'explosion',
                    friction: 0.92
                });
            }
        }
    }
    
    /**
     * Create sparkle effect for XP orbs and special events
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - Sparkle color
     * @param {number} intensity - Effect intensity (1-5)
     */
    createSparkleEffect(x, y, color = COLORS.XP_ORB, intensity = 3) {
        this.init();
        
        if (this.particleSystem && this.particleSystem.createSparkleEffect) {
            return this.particleSystem.createSparkleEffect(x, y, color, intensity);
        }
        
        // Fallback implementation
        if (this.particleSystem && this.particleSystem.spawnParticle) {
            const particleCount = intensity * 2;
            
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 20 + Math.random() * 40;
                
                this.particleSystem.spawnParticle({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y + (Math.random() - 0.5) * 20,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1 + Math.random() * 2,
                    color: color,
                    life: 0.5 + Math.random() * 0.5,
                    type: 'sparkle',
                    alpha: 0.8
                });
            }
        }
    }
    
    /**
     * Create level up effect
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createLevelUpEffect(x, y) {
        this.init();
        
        if (this.particleSystem && this.particleSystem.createLevelUpEffect) {
            return this.particleSystem.createLevelUpEffect(x, y);
        }
        
        // Fallback: Create a burst of golden particles
        this.createExplosion(x, y, 80, COLORS.CRITICAL);
        this.createSparkleEffect(x, y, '#ffd700', 5);
    }
    
    /**
     * Create trail effect for moving objects
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - Trail color
     * @param {number} size - Trail particle size
     */
    createTrailEffect(x, y, color = COLORS.PLAYER, size = 2) {
        this.init();
        
        if (this.particleSystem && this.particleSystem.spawnParticle) {
            this.particleSystem.spawnParticle({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: size,
                color: color,
                life: GAME_CONSTANTS.PARTICLES.TRAIL_LIFETIME,
                type: 'trail',
                alpha: 0.6,
                friction: 0.98
            });
        }
    }
    
    /**
     * Performance-aware particle creation
     * Automatically adjusts particle count based on performance mode
     * @param {Function} particleCreator - Function that creates particles
     * @param {number} baseCount - Base particle count
     */
    createPerformanceAware(particleCreator, baseCount = 1) {
        this.init();
        
        const performanceMode = window.performanceManager?.mode || 'normal';
        const qualityMode = performanceMode === 'critical' ? 'LOW' : 
                           performanceMode === 'low' ? 'MEDIUM' : 'HIGH';
        
        const adjustedCount = this.getAdjustedParticleCount(baseCount, qualityMode);
        
        for (let i = 0; i < adjustedCount; i++) {
            particleCreator();
        }
    }
    
    /**
     * Get performance-adjusted particle count
     * @param {number} baseCount - Desired particle count
     * @param {string} qualityMode - Quality setting
     * @returns {number} Adjusted count
     */
    getAdjustedParticleCount(baseCount, qualityMode = 'HIGH') {
        const factor = GAME_CONSTANTS.PARTICLES.REDUCTION_FACTORS[qualityMode] || 1.0;
        return Math.max(1, Math.floor(baseCount * factor));
    }
    
    /**
     * Cleanup method for memory management
     */
    cleanup() {
        if (this.particleSystem && this.particleSystem.cleanup) {
            this.particleSystem.cleanup();
        }
        this.fallbackParticles.length = 0;
    }
}

// Create singleton instance
const particleHelpers = new ParticleHelpers();

// Export both the instance and the class
export default particleHelpers;
export { ParticleHelpers };

// Make available globally for backward compatibility
// TODO: Remove global access once all files use imports
if (typeof window !== 'undefined') {
    window.ParticleHelpers = particleHelpers;
}
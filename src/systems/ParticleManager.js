/**
 * Particle Manager - Handles all particle effects and visual feedback
 * Extracted from GameManager for better organization
 */
class ParticleManager {
    constructor() {
        this.particles = [];
        this.particlePool = [];
        
        // Performance settings
        this.maxParticles = 150;
        this.maxPoolSize = 100;
        this.particleReductionFactor = 1.0;
        this.lowQuality = false;
        
        // Performance monitoring
        this.lastPoolCleanup = 0;
        this.poolCleanupInterval = 5000; // Clean pool every 5 seconds
    }
    
    /**
     * Update all particles and manage memory
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Skip particle updates in low quality mode
        if (this.lowQuality) {
            this.particles.length = 0;
            return;
        }
        
        // Enforce particle limit to prevent memory issues
        if (this.particles.length > this.maxParticles) {
            const excessCount = this.particles.length - this.maxParticles;
            this.particles.splice(0, excessCount);
        }
        
        const deadParticles = [];
        
        // Update particles and collect dead ones for reuse
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (!particle) {
                this.particles.splice(i, 1);
                continue;
            }
            
            if (typeof particle.update === 'function') {
                particle.update(deltaTime);
            }
            
            // Check if particle is dead
            if (particle.isDead || (particle.age !== undefined && particle.lifetime !== undefined && particle.age >= particle.lifetime)) {
                deadParticles.push(particle);
                this.particles.splice(i, 1);
            }
        }
        
        // Return dead particles to pool
        this.recycleParticles(deadParticles);
        
        // Periodic pool cleanup
        this.cleanupPool();
    }
    
    /**
     * Render all particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (this.lowQuality || this.particles.length === 0) return;
        
        // Batch render particles for better performance
        for (const particle of this.particles) {
            if (particle && typeof particle.render === 'function') {
                particle.render(ctx);
            }
        }
    }
    
    /**
     * Try to add a particle (respects limits)
     * @param {Particle} particle - Particle to add
     * @returns {boolean} True if particle was added
     */
    tryAddParticle(particle) {
        if (this.lowQuality) return false;
        if (!this.particles) return false;
        if (this.particles.length >= this.maxParticles) return false;
        
        this.particles.push(particle);
        return true;
    }
    
    /**
     * Create explosion effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Explosion radius
     * @param {string} color - Particle color
     */
    createExplosion(x, y, radius, color = '#ff6b35') {
        if (this.particles.length >= this.maxParticles) return;
        
        const baseCount = Math.min(Math.floor(radius * 0.8), 50);
        const remainingBudget = Math.max(0, this.maxParticles - this.particles.length);
        const particleCount = Math.max(0, Math.min(
            Math.floor(baseCount * this.particleReductionFactor), 
            remainingBudget
        ));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getPooledParticle() || this.createParticle();
            
            // Set explosion properties
            particle.x = x;
            particle.y = y;
            particle.isDead = false;
            particle.age = 0;
            particle.opacity = 1.0;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.color = color;
            particle.size = 2 + Math.random() * 6;
            particle.lifetime = 0.5 + Math.random() * 0.5;
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create hit effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - Damage amount (affects particle count)
     */
    createHitEffect(x, y, amount) {
        if (this.particles.length >= this.maxParticles) return;
        
        const particleCount = Math.min(Math.ceil(amount / 10), 8);
        const remainingBudget = this.maxParticles - this.particles.length;
        const actualCount = Math.min(particleCount, remainingBudget);
        
        for (let i = 0; i < actualCount; i++) {
            const particle = this.getPooledParticle() || this.createParticle();
            
            particle.x = x + (Math.random() - 0.5) * 20;
            particle.y = y + (Math.random() - 0.5) * 20;
            particle.isDead = false;
            particle.age = 0;
            particle.opacity = 1.0;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 30;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed - 10; // Slight upward bias
            particle.color = '#ffff00'; // Yellow for hits
            particle.size = 1 + Math.random() * 3;
            particle.lifetime = 0.3 + Math.random() * 0.3;
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create level up effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createLevelUpEffect(x, y) {
        if (this.particles.length >= this.maxParticles) return;
        
        const particleCount = Math.min(20, this.maxParticles - this.particles.length);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getPooledParticle() || this.createParticle();
            
            particle.x = x;
            particle.y = y;
            particle.isDead = false;
            particle.age = 0;
            particle.opacity = 1.0;
            
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 80 + Math.random() * 40;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.color = '#00ff00'; // Green for level up
            particle.size = 3 + Math.random() * 3;
            particle.lifetime = 0.8 + Math.random() * 0.4;
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create special effect
     * @param {string} type - Effect type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Effect size
     * @param {string} color - Effect color
     */
    createSpecialEffect(type, x, y, size = 50, color = '#ffffff') {
        switch (type) {
            case 'explosion':
                this.createExplosion(x, y, size, color);
                break;
            case 'hit':
                this.createHitEffect(x, y, size);
                break;
            case 'levelup':
                this.createLevelUpEffect(x, y);
                break;
            default:
                console.warn(`Unknown particle effect type: ${type}`);
        }
    }
    
    /**
     * Get a particle from the pool or create new one
     * @returns {Particle} Pooled or new particle
     */
    getPooledParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return null;
    }
    
    /**
     * Create a new particle
     * @returns {Particle} New particle instance
     */
    createParticle() {
        // Create basic particle object (will be configured by calling method)
        return new Particle(0, 0, 0, 0, 1, '#ffffff', 1);
    }
    
    /**
     * Recycle dead particles back to pool
     * @param {Particle[]} deadParticles - Array of dead particles
     */
    recycleParticles(deadParticles) {
        const availablePoolSlots = this.maxPoolSize - this.particlePool.length;
        
        for (let i = 0; i < Math.min(deadParticles.length, availablePoolSlots); i++) {
            const particle = deadParticles[i];
            // Reset particle state for reuse
            particle.isDead = false;
            particle.age = 0;
            particle.opacity = 1.0;
            this.particlePool.push(particle);
        }
    }
    
    /**
     * Clean up particle pool periodically
     */
    cleanupPool() {
        const now = Date.now();
        if (now - this.lastPoolCleanup > this.poolCleanupInterval) {
            // Limit pool size to prevent memory bloat
            if (this.particlePool.length > this.maxPoolSize) {
                this.particlePool.length = this.maxPoolSize;
            }
            this.lastPoolCleanup = now;
        }
    }
    
    /**
     * Set performance settings
     * @param {Object} settings - Performance settings
     */
    setPerformanceSettings(settings) {
        if (settings.lowQuality !== undefined) {
            this.lowQuality = settings.lowQuality;
        }
        if (settings.maxParticles !== undefined) {
            this.maxParticles = settings.maxParticles;
        }
        if (settings.particleReductionFactor !== undefined) {
            this.particleReductionFactor = settings.particleReductionFactor;
        }
    }
    
    /**
     * Get particle system stats
     * @returns {Object} Particle system statistics
     */
    getStats() {
        return {
            activeParticles: this.particles.length,
            pooledParticles: this.particlePool.length,
            maxParticles: this.maxParticles,
            lowQuality: this.lowQuality,
            reductionFactor: this.particleReductionFactor
        };
    }
    
    /**
     * Clear all particles (for game reset)
     */
    clear() {
        this.particles.length = 0;
        // Don't clear the pool - keep it for reuse
    }
}

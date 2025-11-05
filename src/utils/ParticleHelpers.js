/**
 * Particle Helpers - Centralized particle creation utilities
 * [A] RESONANT NOTE: Uses pooled particles instead of direct instantiation
 * Replaces scattered `new Particle()` calls with pooled alternatives
 */

class ParticleHelpers {
    static init() {
        // Ensure optimized particle pool is available
        if (!window.optimizedParticles) {
            console.warn('OptimizedParticlePool not found, falling back to basic particles');
            return false;
        }
        return true;
    }

    /**
     * Retrieve current particle system statistics (counts, limits, quality flags)
     */
    static getParticleStats() {
        const gm = window.gameManager || window.gameManagerBridge || null;

        const particleManager = window.optimizedParticles
            || gm?.game?.effectsManager?.particleManager
            || gm?.game?.effectsManager
            || null;

        let currentParticles = 0;
        if (particleManager) {
            if (typeof particleManager.getActiveCount === 'function') {
                currentParticles = particleManager.getActiveCount();
            } else if (Array.isArray(particleManager.activeParticles)) {
                currentParticles = particleManager.activeParticles.length;
            } else if (Array.isArray(particleManager.particles)) {
                currentParticles = particleManager.particles.length;
            }
        }

        const maxParticles = gm?.maxParticles
            ?? particleManager?.maxParticles
            ?? window.optimizedParticles?.maxParticles
            ?? 150;

        const reduction = gm?.particleReductionFactor ?? 1;

        return {
            manager: particleManager,
            currentParticles,
            maxParticles,
            reduction,
            lowQuality: gm?.lowQuality ?? false
        };
    }

    /**
     * Calculate how many particles can spawn for a burst without exceeding limits
     */
    static calculateSpawnCount(baseCount) {
        if (!Number.isFinite(baseCount) || baseCount <= 0) {
            return 0;
        }

        const stats = this.getParticleStats();
        if (stats.lowQuality) {
            return 0;
        }

        const MathUtils = window.Game?.MathUtils;
        if (MathUtils?.budget) {
            return Math.floor(MathUtils.budget(
                baseCount,
                stats.reduction,
                stats.maxParticles,
                stats.currentParticles
            ));
        }

        const reduction = Math.min(1, Math.max(0, stats.reduction));
        return Math.floor(baseCount * reduction);
    }
    
    /**
     * Create hit effect particles
     */
    static createHitEffect(x, y, damage = 25) {
        if (window.optimizedParticles) {
            const intensity = Math.min(3, damage / 25); // Scale with damage
            window.optimizedParticles.spawnHitEffect(x, y, intensity);
            return;
        }
        
        // Fallback for compatibility
        this.createBasicHitEffect(x, y, damage);
    }
    
    /**
     * Create explosion effect
     */
    static createExplosion(x, y, radius = 60, color = '#ff6b35') {
        if (window.optimizedParticles) {
            const count = Math.min(20, Math.floor(radius / 3));
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const speed = 50 + Math.random() * 100;
                
                window.optimizedParticles.spawnParticle({
                    x: x + (Math.random() - 0.5) * 10,
                    y: y + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    color: color,
                    life: 0.5 + Math.random() * 0.5,
                    type: 'spark'
                });
            }
            return;
        }
        
        // Fallback
        this.createBasicExplosion(x, y, radius, color);
    }
    
    /**
     * Create trail effect for moving objects
     */
    static createTrail(x, y, vx, vy, color = '#4ecdc4') {
        if (window.optimizedParticles) {
            window.optimizedParticles.spawnTrailEffect(x, y, vx, vy);
            return;
        }
        
        // Fallback
        this.createBasicTrail(x, y, vx, vy, color);
    }
    
    /**
     * Create level up effect
     */
    static createLevelUpEffect(x, y) {
        if (window.optimizedParticles) {
            // Create burst of particles
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const speed = 60 + Math.random() * 80;
                
                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: '#f39c12',
                    life: 1 + Math.random() * 0.5,
                    type: 'spark'
                });
            }
            return;
        }
        
        // Fallback
        this.createBasicLevelUp(x, y);
    }
    
    /**
     * Create chain lightning effect
     */
    static createLightningEffect(fromX, fromY, toX, toY) {
        if (window.optimizedParticles) {
            const dx = toX - fromX;
            const dy = toY - fromY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const segments = Math.max(3, Math.floor(distance / 20));
            
            // Create lightning path
            for (let i = 0; i <= segments; i++) {
                const ratio = i / segments;
                const x = fromX + dx * ratio + (Math.random() - 0.5) * 20;
                const y = fromY + dy * ratio + (Math.random() - 0.5) * 20;
                
                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    size: 2 + Math.random() * 2,
                    color: '#74b9ff',
                    life: 0.2 + Math.random() * 0.1,
                    type: 'spark'
                });
            }
            
            // Impact flash
            window.optimizedParticles.spawnParticle({
                x: toX,
                y: toY,
                vx: 0,
                vy: 0,
                size: 12,
                color: '#74b9ff',
                life: 0.3,
                type: 'basic'
            });
            return;
        }
        
        // Fallback
        this.createBasicLightning(fromX, fromY, toX, toY);
    }
    
    // Fallback methods for compatibility (basic particle creation)
    static createBasicHitEffect(x, y, damage) {
        const gm = window.gameManager || window.gameManagerBridge;
        if (!gm || !gm.addParticleViaEffectsManager) return;
        
        const count = Math.min(8, Math.floor(damage / 5));
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 70;
            
            // [A] RESONANT NOTE: Using pooled particles for better performance
            if (window.optimizedParticles) {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1 + Math.random() * 3,
                    color: '#e74c3c',
                    life: 0.3 + Math.random() * 0.3,
                    type: 'blood'
                });
            } else if (gm?.addParticleViaEffectsManager) {
                const particle = new Particle(
                    x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
                    1 + Math.random() * 3, '#e74c3c', 0.3 + Math.random() * 0.3
                );
                gm.addParticleViaEffectsManager(particle);
            }
        }
    }
    
    static createBasicExplosion(x, y, radius, color) {
        const count = Math.min(15, Math.floor(radius / 4));
        
        // [A] RESONANT NOTE: Prefer pooled particles for explosions
        if (window.optimizedParticles) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 100;
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    color, life: 0.5 + Math.random() * 0.5,
                    type: 'explosion'
                });
            }
            return;
        }
        
        // Fallback to old system
        if (!window.gameManager?.addParticleViaEffectsManager) return;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const particle = new Particle(
                x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
                2 + Math.random() * 4, color, 0.5 + Math.random() * 0.5
            );
            window.gameManager.addParticleViaEffectsManager(particle);
        }
    }
    
    static createBasicTrail(x, y, vx, vy, color) {
        // [A] RESONANT NOTE: Trail particles using pooled system
        if (window.optimizedParticles) {
            window.optimizedParticles.spawnParticle({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5,
                vx: vx * 0.3, vy: vy * 0.3,
                size: 1 + Math.random() * 2,
                color, life: 0.5, type: 'trail'
            });
            return;
        }
        
        // Fallback
        if (!window.gameManager?.addParticleViaEffectsManager) return;
        const particle = new Particle(
            x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 5,
            vx * 0.3, vy * 0.3, 1 + Math.random() * 2, color, 0.5
        );
        
        window.gameManager.addParticleViaEffectsManager(particle);
    }
    
    static createBasicLevelUp(x, y) {
        if (!window.gameManager || !window.gameManager.addParticleViaEffectsManager) return;
        
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            
            const particle = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 4,
                '#f39c12',
                1 + Math.random() * 0.5
            );
            
            window.gameManager.addParticleViaEffectsManager(particle);
        }
    }
    
    static createBasicLightning(fromX, fromY, toX, toY) {
        if (!window.gameManager || !window.gameManager.addParticleViaEffectsManager) return;
        
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.max(3, Math.floor(distance / 30));
        
        for (let i = 0; i <= segments; i++) {
            const ratio = i / segments;
            const x = fromX + dx * ratio;
            const y = fromY + dy * ratio;
            
            const particle = new Particle(
                x, y,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                2 + Math.random() * 2,
                '#74b9ff',
                0.2
            );
            
            window.gameManager.addParticleViaEffectsManager(particle);
        }
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.ParticleHelpers = ParticleHelpers;
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ParticleHelpers.init());
    } else {
        ParticleHelpers.init();
    }
}

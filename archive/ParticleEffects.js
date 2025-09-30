/**
 * Consolidated Particle Effects System
 * NOTE TO OTHER COPILOTS: This replaces duplicate createSpecialEffect patterns
 * Found in gameManager.js. Consolidates similar particle logic to reduce duplication.
 */

class ParticleEffects {
    constructor() {
        // Pre-calculate common angles for performance
        this.precomputedAngles = {
            spread8: [],
            circle16: [],
            circle32: []
        };
        
        // Pre-compute spread angles
        for (let i = 0; i < 8; i++) {
            this.precomputedAngles.spread8.push(-Math.PI/8 + (Math.PI/4) * (i/7));
        }
        
        // Pre-compute circle angles
        for (let i = 0; i < 16; i++) {
            this.precomputedAngles.circle16.push((i / 16) * Math.PI * 2);
        }
        for (let i = 0; i < 32; i++) {
            this.precomputedAngles.circle32.push((i / 32) * Math.PI * 2);
        }
    }

    /**
     * Unified particle effect creation - replaces multiple similar functions
     * @param {string} type - Effect type: 'spread', 'circle', 'random', 'burst'
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {number} size - Effect size multiplier
     * @param {string} color - Particle color
     * @param {Function} addParticleCallback - Function to add particles
     */
    createEffect(type, x, y, size = 1, color = '#9b59b6', addParticleCallback) {
        if (!addParticleCallback) return;

        const factor = MathUtils.clamp(size, 0.1, 3); // Clamp size factor
        
        switch (type) {
            case 'spread': {
                const count = Math.floor(8 * factor);
                const angles = this.precomputedAngles.spread8;
                for (let i = 0; i < count; i++) {
                    const angle = angles[i % angles.length];
                    this._createParticle(x, y, angle, 80 + Math.random() * 40, 
                        3 + Math.random() * 2, color, 0.3 + Math.random() * 0.2, addParticleCallback);
                }
                break;
            }
            case 'circle': {
                const count = Math.floor(16 * factor);
                const angles = count <= 16 ? this.precomputedAngles.circle16 : this.precomputedAngles.circle32;
                for (let i = 0; i < count; i++) {
                    const angle = angles[i % angles.length];
                    this._createParticle(x, y, angle, 70 + Math.random() * 30,
                        3 + Math.random() * 2, color, 0.4, addParticleCallback);
                }
                break;
            }
            case 'random': {
                const count = Math.floor(12 * factor);
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    this._createParticle(x, y, angle, 50 + Math.random() * 100,
                        2 + Math.random() * 3, color, 0.2 + Math.random() * 0.3, addParticleCallback);
                }
                break;
            }
            case 'burst': {
                const count = Math.floor(6 * factor);
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    this._createParticle(x, y, angle, 120 + Math.random() * 80,
                        4 + Math.random() * 3, color, 0.5, addParticleCallback);
                }
                break;
            }
        }
    }

    _createParticle(x, y, angle, speed, size, color, alpha, addParticleCallback) {
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        // Use pooled particles when available
        if (window.optimizedParticles) {
            window.optimizedParticles.spawnParticle({
                x, y, vx, vy, size, color, life: alpha, type: 'basic'
            });
        } else {
            // Fallback to direct creation
            const particle = new Particle(x, y, vx, vy, size, color, alpha);
            addParticleCallback(particle);
        }
    }
}

// Export singleton instance
window.particleEffects = new ParticleEffects();

/**
 * BurnBehavior - Applies burn status to enemies on hit
 */
class BurnBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile);
        this.damage = config.damage || 5;
        this.duration = config.duration || 3.0;
        this.chance = config.chance || 1.0;
        this.explosionDamage = config.explosionDamage || 0;
        this.explosionRadius = config.explosionRadius || 0;
    }

    /**
     * Called when projectile hits an enemy (implements BehaviorBase.onHit interface)
     */
    onHit(target, engine) {
        // Check chance
        if (Math.random() > this.chance) {
            return false;
        }

        // Apply burn effect
        if (target && target.statusEffects) {
            target.statusEffects.applyEffect('burn', {
                damage: this.damage,
                explosionDamage: this.explosionDamage,
                explosionRadius: this.explosionRadius
            }, this.duration);

            // Visual feedback for application
            if (window.gameManager?.showFloatingText) {
                window.gameManager.showFloatingText(
                    'IGNITE!',
                    target.x,
                    target.y - 40,
                    '#e67e22',
                    12
                );
            }

            // Particle effects - flame burst on ignition
            this._createBurnParticles(target);
        } else {
            window.logger.warn('[BurnBehavior] Target missing statusEffects!', target);
        }

        return true; // Indicate hit was processed
    }

    /**
     * Create visual particle effects for burn application
     */
    _createBurnParticles(target) {
        if (!window.optimizedParticles || !target) {
            return;
        }

        const particleCount = Math.floor(8 + Math.random() * 6); // 8-14 particles
        const damageIntensity = Math.min(1.5, this.damage / 10); // Scale with damage

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.3 - 0.15);
            const speed = 30 + Math.random() * 40;

            // Outward burst then upward drift
            const vx = Math.cos(angle) * speed * 0.6; // Reduced horizontal
            const vy = Math.sin(angle) * speed * 0.3 - 50; // Strong upward bias (fire rises!)

            // Fire color palette - mix of orange, red, yellow
            const colors = ['#ff6b35', '#e67e22', '#d35400', '#ff9f1c', '#c0392b'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            window.optimizedParticles.spawnParticle({
                x: target.x + (Math.random() * 20 - 10),
                y: target.y + (Math.random() * 20 - 10),
                vx,
                vy,
                size: (2 + Math.random() * 2.5) * damageIntensity,
                color,
                life: 0.4 + Math.random() * 0.3,
                type: i % 3 === 0 ? 'spark' : 'smoke' // Mix of flame and smoke
            });
        }

        // Add a central flash for impact
        window.optimizedParticles.spawnParticle({
            x: target.x,
            y: target.y,
            vx: 0,
            vy: -20,
            size: 12 * damageIntensity,
            color: '#ff9f1c',
            life: 0.2,
            type: 'basic'
        });
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.BurnBehavior = BurnBehavior;
}

/**
 * ExplosiveBehavior - Causes area damage when projectile dies
 * This is a death-triggered effect (doesn't prevent death)
 */
class ExplosiveBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.radius = config.radius || 60;
        this.damageMultiplier = config.damageMultiplier || 0.7;
        this.hasExploded = false;
    }

    /**
     * Trigger explosion on death
     */
    onDeath(target, engine) {
        if (this.hasExploded) return false; // Already exploded

        this.hasExploded = true;
        this._explode(engine);

        return false; // Doesn't prevent death, just triggers effect
    }

    /**
     * Perform explosion - damage all enemies in radius
     */
    _explode(engine) {
        const enemies = engine?.enemies || [];
        if (enemies.length === 0) return;

        const baseDamage = this.projectile.damage * this.damageMultiplier;
        let enemiesHit = 0;

        for (const enemy of enemies) {
            if (!enemy || enemy.isDead) continue;

            const dx = enemy.x - this.projectile.x;
            const dy = enemy.y - this.projectile.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.radius) {
                // Damage falloff based on distance
                const falloff = Math.max(0.3, 1 - (dist / this.radius));
                const damage = baseDamage * falloff;

                if (typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(Math.max(1, damage));
                    enemiesHit++;

                    // Show damage text
                    if (window.gameEngine?.unifiedUI) {
                        window.gameEngine.unifiedUI.addDamageNumber(
                            Math.round(damage),
                            enemy.x,
                            enemy.y,
                            false
                        );
                    }
                }
            }
        }

        // Visual explosion effect
        this._createExplosionVisual();

        // Audio
        if (window.audioSystem?.play) {
            window.audioSystem.play('explosion', 0.4);
        }

        if (window.debugProjectiles) {
            console.log(`[ExplosiveBehavior] Projectile ${this.projectile.id} exploded, hit ${enemiesHit} enemies`);
        }
    }

    /**
     * Create visual explosion particles
     */
    _createExplosionVisual() {
        if (window.optimizedParticles) {
            // Outer ring
            for (let i = 0; i < 16; i++) {
                const angle = (Math.PI * 2 * i) / 16;
                const speed = 120 + Math.random() * 80;

                window.optimizedParticles.spawnParticle({
                    x: this.projectile.x,
                    y: this.projectile.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 6 + Math.random() * 3,
                    color: '#ff6b35',
                    life: 0.6,
                    type: 'explosion'
                });
            }

            // Inner burst
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 60 + Math.random() * 40;

                window.optimizedParticles.spawnParticle({
                    x: this.projectile.x,
                    y: this.projectile.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 4,
                    color: '#ffd93d',
                    life: 0.4,
                    type: 'spark'
                });
            }
        }

        // Flash effect through game manager
        if (window.gameManager?.createExplosion) {
            window.gameManager.createExplosion(
                this.projectile.x,
                this.projectile.y,
                this.radius,
                '#ff6b35'
            );
        }
    }
}
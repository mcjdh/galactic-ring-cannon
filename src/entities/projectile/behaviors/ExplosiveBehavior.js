/**
 * ExplosiveBehavior - Causes area damage when projectile dies
 * This is a death-triggered effect (doesn't prevent death)
 * 
 * 🎮 TUNING: Increased base radius and damage for better game feel
 * - Radius: 70 (was 60) - more impactful AoE
 * - Damage: 0.7 of projectile damage (was 0.7, keeping same)
 * - With upgrades can reach 105+ radius and 65%+ trigger chance
 */
class ExplosiveBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.radius = config.radius || 70;  // INCREASED from 60
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
            window.logger.log(`[ExplosiveBehavior] Projectile ${this.projectile.id} exploded, hit ${enemiesHit} enemies`);
        }
    }

    /**
     * Create visual explosion particles - ENHANCED with shockwave rings!
     */
    _createExplosionVisual() {
        if (!window.optimizedParticles) return;

        // Capture position at explosion time (projectile may be destroyed during setTimeout)
        const explosionX = this.projectile.x;
        const explosionY = this.projectile.y;

        // EXPANDING SHOCKWAVE RINGS - staggered for depth effect
        // [PERFORMANCE] Removed setTimeout to prevent memory leaks/lag with high fire rate
        // Spawning all rings immediately but with varied speeds/radii creates a similar effect
        const ringCount = 3;
        for (let ring = 0; ring < ringCount; ring++) {
            // const delay = ring * 50; // Removed delay
            
            const ringRadius = this.radius * 0.4 + (ring * this.radius * 0.2);
            const particlesInRing = 24 + (ring * 8); // More particles in outer rings
            
            for (let i = 0; i < particlesInRing; i++) {
                const angle = (Math.PI * 2 * i) / particlesInRing;
                const x = explosionX + Math.cos(angle) * ringRadius;
                const y = explosionY + Math.sin(angle) * ringRadius;
                
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * (80 - ring * 20), // Slower outer rings
                    vy: Math.sin(angle) * (80 - ring * 20),
                    size: 8 - ring * 2,  // Smaller outer rings
                    color: ring === 0 ? '#ff6b35' : (ring === 1 ? '#ff8c42' : '#ffaa52'),
                    life: 0.8 - ring * 0.15,
                    type: 'explosion'
                });
            }
        }

        // RADIAL BURST - bright fiery particles
        const burstCount = 32; // More particles for impact
        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount;
            const speed = 100 + Math.random() * 120;

            window.optimizedParticles.spawnParticle({
                x: explosionX,
                y: explosionY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 4,
                color: i % 2 === 0 ? '#ffd93d' : '#ffaa00', // Bright yellow/orange
                life: 0.7 + Math.random() * 0.3,
                type: 'spark'
            });
        }

        // CENTRAL FLASH - white-hot core
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;

            window.optimizedParticles.spawnParticle({
                x: explosionX,
                y: explosionY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6,
                color: '#ffffff', // Bright white core
                life: 0.5,
                type: 'spark'
            });
        }

        // SCREEN SHAKE for impact
        if (window.gameManager?.addScreenShake) {
            const shakeIntensity = Math.min(8, this.radius / 15); // Scaled to explosion size
            window.gameManager.addScreenShake(shakeIntensity, 0.3);
        }

        // Flash effect through game manager
        if (window.gameManager?.createExplosion) {
            window.gameManager.createExplosion(
                explosionX,
                explosionY,
                this.radius,
                '#ff6b35'
            );
        }
    }
}
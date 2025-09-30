/**
 * RicochetBehavior - Allows projectile to bounce to a new target when it would die
 * This is a death-recovery behavior
 */
class RicochetBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.bounces = config.bounces || 2;
        this.usedBounces = 0;
        this.range = config.range || 180;
        this.damageMultiplier = config.damageMultiplier || 0.8;
    }

    /**
     * On death, try to ricochet to a new target
     */
    onDeath(target, engine) {
        // Check if we have bounces left
        if (this.usedBounces >= this.bounces) {
            if (window.debugProjectiles) {
                console.log(`[RicochetBehavior] Projectile ${this.projectile.id} no bounces left`);
            }
            return false; // Can't prevent death
        }

        // Find a new target to bounce to
        const newTarget = this._findBounceTarget(target, engine);
        if (!newTarget) {
            if (window.debugProjectiles) {
                console.log(`[RicochetBehavior] Projectile ${this.projectile.id} no valid bounce target`);
            }
            return false; // No target found
        }

        // Perform the bounce
        this._bounceToTarget(newTarget);
        this.usedBounces++;

        // Restore some piercing charges if projectile has piercing
        const piercingBehavior = this.projectile.behaviorManager?.getBehavior('piercing');
        if (piercingBehavior && piercingBehavior.isExhausted()) {
            const restoreAmount = Math.max(1, Math.floor(piercingBehavior.maxCharges / 2));
            piercingBehavior.restoreCharges(restoreAmount);
        }

        if (window.debugProjectiles) {
            console.log(`[RicochetBehavior] Projectile ${this.projectile.id} ricocheted to enemy ${newTarget.id}. Bounces used: ${this.usedBounces}/${this.bounces}`);
        }

        return true; // Death prevented!
    }

    /**
     * Find a nearby enemy to bounce to
     */
    _findBounceTarget(currentTarget, engine) {
        const enemies = engine?.enemies || [];
        if (enemies.length === 0) return null;

        let bestTarget = null;
        let bestDist = this.range;

        for (const enemy of enemies) {
            if (!enemy || enemy.isDead || enemy === currentTarget) continue;

            // Don't bounce to already-hit enemies
            if (this.projectile.hitEnemies?.has(enemy.id)) continue;

            const dx = enemy.x - this.projectile.x;
            const dy = enemy.y - this.projectile.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < bestDist) {
                bestDist = dist;
                bestTarget = enemy;
            }
        }

        return bestTarget;
    }

    /**
     * Redirect projectile toward new target
     */
    _bounceToTarget(target) {
        const dx = target.x - this.projectile.x;
        const dy = target.y - this.projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            // Calculate current speed
            const currentSpeed = Math.sqrt(
                this.projectile.vx * this.projectile.vx +
                this.projectile.vy * this.projectile.vy
            );

            // Redirect velocity toward new target
            this.projectile.vx = (dx / dist) * currentSpeed;
            this.projectile.vy = (dy / dist) * currentSpeed;

            // Apply damage reduction for bounce
            this.projectile.damage *= this.damageMultiplier;

            // Visual effect
            if (window.optimizedParticles) {
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    window.optimizedParticles.spawnParticle({
                        x: this.projectile.x,
                        y: this.projectile.y,
                        vx: Math.cos(angle) * 100,
                        vy: Math.sin(angle) * 100,
                        size: 3,
                        color: '#4ecdc4',
                        life: 0.3,
                        type: 'spark'
                    });
                }
            }
        }
    }
}
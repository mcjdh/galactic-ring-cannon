/**
 * RicochetBehavior - Allows projectile to bounce to a new target when it would die
 * This is a death-recovery behavior
 * 
 * 🎮 GAME FEEL: Ricochet has LARGER range than chain lightning
 * - Ricochet: 320 base, 400+ with upgrades (needs to find targets to save projectile!)
 * - Chain: 180 base, 240 with Arc weapon
 * - This ensures ricochet can find targets even when enemies are spread out
 */
class RicochetBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.bounces = config.bounces || 2;
        this.usedBounces = 0;
        this.range = config.range || 320;  // INCREASED default - was 180, now matches upgrade config
        this.damageMultiplier = config.damageMultiplier || 0.8;
    }

    /**
     * On death, try to ricochet to a new target
     */
    onDeath(target, engine) {
        // Check if we have bounces left
        if (this.usedBounces >= this.bounces) {
            if (window.debugProjectiles) {
                window.logger.log(`[RicochetBehavior] Projectile ${this.projectile.id} no bounces left`);
            }
            return false; // Can't prevent death
        }

        // Find a new target to bounce to
        const newTarget = this._findBounceTarget(target, engine);
        if (!newTarget) {
            if (window.debugProjectiles) {
                window.logger.log(`[RicochetBehavior] Projectile ${this.projectile.id} no valid bounce target`);
            }
            return false; // No target found
        }

        // Perform the bounce
        this._bounceToTarget(newTarget);
        this.usedBounces++;

        // Track ricochet for achievements (total bounces + 1 for initial hit)
        const totalHits = this.usedBounces + 1;
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm && typeof gm.onRicochetHit === 'function') {
            gm.onRicochetHit(totalHits);
        }

        // NOTE: Piercing charges are NOT restored anymore
        // New design: Ricochet attempts FIRST on every hit, piercing is fallback
        // This makes upgrades feel additive rather than replacements
        // Piercing charges are preserved when ricochet succeeds

        if (window.debugProjectiles) {
            window.logger.log(`[RicochetBehavior] Projectile ${this.projectile.id} ricocheted to enemy ${newTarget.id}. Bounces used: ${this.usedBounces}/${this.bounces}. Total hits: ${totalHits}`);
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
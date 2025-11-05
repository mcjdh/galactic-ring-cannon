/**
 * HomingBehavior - Gradually turns projectile toward nearest enemy
 * This is an update-based behavior
 */
class HomingBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.turnSpeed = config.turnSpeed || 2.0;
        this.range = config.range || 250;
        this.target = null;
        this.retargetTimer = 0;
        this.retargetInterval = 0.1; // Retarget every 0.1 seconds
    }

    /**
     * Update homing trajectory every frame
     */
    update(deltaTime, game) {
        this.retargetTimer += deltaTime;

        // Periodically find new target
        if (this.retargetTimer >= this.retargetInterval) {
            this.retargetTimer = 0;
            this._findTarget(game);
        }

        // Turn toward target
        if (this.target && !this.target.isDead) {
            this._turnTowardTarget(deltaTime);
        }
    }

    /**
     * Find nearest enemy within range
     */
    _findTarget(game) {
        const enemies = game?.enemies || [];
        if (enemies.length === 0) {
            this.target = null;
            return;
        }

        let nearest = null;
        const rangeSq = this.range * this.range;
        let minDistSq = rangeSq;

        for (const enemy of enemies) {
            if (!enemy || enemy.isDead) continue;

            const dx = enemy.x - this.projectile.x;
            const dy = enemy.y - this.projectile.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = enemy;
            }
        }

        this.target = nearest;
    }

    /**
     * Gradually turn projectile velocity toward target
     */
    _turnTowardTarget(deltaTime) {
        const dx = this.target.x - this.projectile.x;
        const dy = this.target.y - this.projectile.y;
        const targetLenSq = dx * dx + dy * dy;
        if (targetLenSq === 0) {
            return;
        }

        const currentVx = this.projectile.vx;
        const currentVy = this.projectile.vy;
        const currentSpeedSq = currentVx * currentVx + currentVy * currentVy;
        if (currentSpeedSq === 0) {
            return;
        }

        // Use FastMath.invSqrt for 2x faster normalization on ARM
        const FastMath = window.Game?.FastMath;
        const invCurrentSpeed = FastMath ? FastMath.invSqrt(currentSpeedSq) : (1 / Math.sqrt(currentSpeedSq));
        const invTargetLen = FastMath ? FastMath.invSqrt(targetLenSq) : (1 / Math.sqrt(targetLenSq));
        
        const currentDirX = currentVx * invCurrentSpeed;
        const currentDirY = currentVy * invCurrentSpeed;
        const targetDirX = dx * invTargetLen;
        const targetDirY = dy * invTargetLen;

        const dot = currentDirX * targetDirX + currentDirY * targetDirY;
        const cross = currentDirX * targetDirY - currentDirY * targetDirX;
        const angleDiff = FastMath ? FastMath.atan2(cross, dot) : Math.atan2(cross, dot);

        const maxTurn = this.turnSpeed * deltaTime;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        if (turn === 0) {
            return;
        }

        // Use FastMath.sincos for combined trig calculation
        const { sin, cos } = FastMath ? FastMath.sincos(turn) : { sin: Math.sin(turn), cos: Math.cos(turn) };
        const newDirX = currentDirX * cos - currentDirY * sin;
        const newDirY = currentDirX * sin + currentDirY * cos;
        const speed = 1 / invCurrentSpeed; // Reuse invCurrentSpeed instead of sqrt

        this.projectile.vx = newDirX * speed;
        this.projectile.vy = newDirY * speed;
    }

    /**
     * Visual indicator (optional - could add trail color change)
     */
    onAdd() {
        // Make homing projectiles visually distinct
        if (this.projectile.radius) {
            this.projectile.radius *= 0.9; // Slightly smaller
        }
    }
}

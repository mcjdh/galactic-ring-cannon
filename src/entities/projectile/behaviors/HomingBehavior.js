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
        let minDist = this.range;

        for (const enemy of enemies) {
            if (!enemy || enemy.isDead) continue;

            const dx = enemy.x - this.projectile.x;
            const dy = enemy.y - this.projectile.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        this.target = nearest;
    }

    /**
     * Gradually turn projectile velocity toward target
     */
    _turnTowardTarget(deltaTime) {
        // Calculate direction to target
        const dx = this.target.x - this.projectile.x;
        const dy = this.target.y - this.projectile.y;
        const targetAngle = Math.atan2(dy, dx);

        // Current velocity angle
        const currentAngle = Math.atan2(this.projectile.vy, this.projectile.vx);

        // Calculate angular difference
        let angleDiff = targetAngle - currentAngle;

        // Normalize to -PI to PI range
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Apply turn (limited by turn speed)
        const maxTurn = this.turnSpeed * deltaTime;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        const newAngle = currentAngle + turn;

        // Calculate speed (preserve it)
        const speed = Math.sqrt(
            this.projectile.vx * this.projectile.vx +
            this.projectile.vy * this.projectile.vy
        );

        // Apply new velocity
        this.projectile.vx = Math.cos(newAngle) * speed;
        this.projectile.vy = Math.sin(newAngle) * speed;
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
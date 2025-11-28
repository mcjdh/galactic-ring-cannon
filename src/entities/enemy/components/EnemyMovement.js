/**
 * EnemyMovement Component
 * Handles movement patterns, physics, and formation behavior
 * 
 * [UNIFIED PHYSICS REFACTOR]
 * Now exclusively uses ForceAccumulator for all motion.
 * - No direct velocity manipulation (except initialization)
 * - No hybrid acceleration/position logic
 * - All behaviors (patterns, formations, avoidance) output FORCES
 */

// Movement pattern cache - trades RAM for fewer trig/random calls per frame.
// MovementPatternCache is now loaded from src/utils/MovementPatternCache.js
// Fallback if not loaded (shouldn't happen in production)
const MovementPatternCache = window.Game?.MovementPatternCache || {
    sin: Math.sin,
    cos: Math.cos,
    random: Math.random,
    randomRange: (min, max) => min + Math.random() * (max - min),
    randomAngle: () => Math.random() * Math.PI * 2,
    fastMagnitude: (x, y) => Math.sqrt(x * x + y * y),
    TWO_PI: Math.PI * 2
};

class EnemyMovement {
    constructor(enemy) {
        this.enemy = enemy;

        // [FIX] Per-enemy random seed to prevent synchronized movement patterns
        this._randomSeed = Math.floor(Math.random() * 4096);

        // Movement properties
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        // Configurable physics parameters (with defaults)
        this.friction = enemy.friction || 0.92;
        this.turnSpeed = enemy.turnSpeed || 0.1; // Not currently used directly but good for future
        this.steeringStrength = enemy.steeringStrength || 4.0;
        this.maxSpeed = enemy.speed || 100;

        // Movement patterns
        this.currentPattern = 'direct';
        this.patternTimer = 0;
        this.patternState = {}; // Pattern-specific state

        // Stuck detection
        this.lastPosition = { x: enemy.x, y: enemy.y };
        this.stuckTimer = 0;
        this.isStuck = false;

        // Knockback
        this.knockbackVelocity = { x: 0, y: 0 };
        this.knockbackDrag = 0.9;

        // [UNIFIED PHYSICS] Force system components
        this.forceAccumulator = window.Game?.ForceAccumulator
            ? new window.Game.ForceAccumulator(enemy)
            : null;
        this.localForceProducer = null; // Lazy - requires game reference

        // Initialize pattern cache if needed
        if (!EnemyMovement.patternCache) {
            EnemyMovement.patternCache = new MovementPatternCache(); // Use internal cache class if needed, or global
        }

        // [OPTIMIZATION] Object pooling for vectors to reduce GC
        this._tempDesiredVelocity = { x: 0, y: 0 };
        this._tempSteer = { x: 0, y: 0 };
    }

    /**
     * Main update loop
     */
    update(deltaTime, game) {
        // Initialize local force producer if needed
        if (!this.localForceProducer && window.Game?.LocalForceProducer) {
            this.localForceProducer = new window.Game.LocalForceProducer(this.enemy, game);
        }

        // 1. Reset forces for this frame
        if (this.forceAccumulator) {
            this.forceAccumulator.reset();
            this.forceAccumulator.updateWeights();
        }

        // 2. Calculate Steering Forces from Movement Pattern
        // (This replaces direct velocity/position manipulation)
        this.applyPatternForces(deltaTime, game);

        // 3. Calculate Local Forces (Separation, Alignment, Cohesion)
        // (Only if not in a managed formation/constellation - handled by weights)
        if (this.localForceProducer) {
            this.localForceProducer.calculateForces(this.forceAccumulator, deltaTime);
        }

        // 4. Apply Environmental Forces (Gravity, Wind, etc.)
        this.applyEnvironmentalForces(deltaTime, game);

        // 5. Integrate Physics (Force -> Velocity -> Position)
        this.integratePhysics(deltaTime);

        // 6. Handle Knockback (Decay)
        this.updateKnockback(deltaTime);

        // 7. Stuck Detection
        this.checkStuck(deltaTime);
    }

    /**
     * [REFACTORED] Calculate and apply steering forces based on current pattern
     * Instead of setting velocity directly, we calculate a desired velocity
     * and apply a steering force to reach it.
     */
    applyPatternForces(deltaTime, game) {
        if (!this.forceAccumulator) return;

        // If we have a target direction from AI, that overrides specific patterns
        // (AI is the "brain", Movement is the "legs")
        // Use pooled object
        const desiredVelocity = this._tempDesiredVelocity;
        desiredVelocity.x = 0;
        desiredVelocity.y = 0;

        const moveSpeed = this.enemy.speed || 100;
        let currentSteeringStrength = this.steeringStrength;

        // [FIX] Priority: Dash > AI > Pattern
        if (this.enemy.abilities && this.enemy.abilities.isDashing) {
            // Dash override
            const dashSpeed = this.enemy.abilities.dashSpeed || (moveSpeed * 3);
            const dashDir = this.enemy.abilities.dashDirection || { x: 1, y: 0 };

            desiredVelocity.x = dashDir.x * dashSpeed;
            desiredVelocity.y = dashDir.y * dashSpeed;

            // Dash needs high steering strength to be snappy
            currentSteeringStrength = 20.0;
        } else if (this.enemy.targetDirection) {
            // AI-driven movement (Direct/Pursuit)
            desiredVelocity.x = this.enemy.targetDirection.x * moveSpeed;
            desiredVelocity.y = this.enemy.targetDirection.y * moveSpeed;
        } else {
            // Pattern-driven movement (Fallback if no AI target)
            // Calculate desired velocity based on pattern
            // Pass the pooled object to be filled
            this.calculatePatternVelocity(deltaTime, game, desiredVelocity);
        }

        // Calculate Steering Force: F = (Desired - Current) * SteeringStrength
        // Higher steering strength = snappier movement
        // Lower steering strength = more "drift"

        const steerX = (desiredVelocity.x - this.velocity.x) * currentSteeringStrength * deltaTime;
        const steerY = (desiredVelocity.y - this.velocity.y) * currentSteeringStrength * deltaTime;

        // Apply as a 'local' force (or could be a new 'steering' category)
        // Using 'local' for now as it represents the entity's own volition
        this.forceAccumulator.addForce('local', steerX * 50, steerY * 50); // Scale up for mass
    }

    /**
     * Calculate desired velocity based on movement pattern
     * @param {number} deltaTime 
     * @param {object} game 
     * @param {object} outVel - Vector to write result to
     */
    calculatePatternVelocity(deltaTime, game, outVel) {
        this.patternTimer += deltaTime;
        const speed = this.enemy.speed || 100;
        // Use provided output vector or create one (fallback)
        const vel = outVel || { x: 0, y: 0 };

        switch (this.currentPattern) {
            case 'circular':
                // Orbit around a center point
                const angle = this.patternTimer * 2;
                vel.x = Math.cos(angle) * speed;
                vel.y = Math.sin(angle) * speed;
                break;

            case 'zigzag':
                // Move forward with sine wave strafing
                vel.y = speed * 0.5; // Forward
                vel.x = Math.sin(this.patternTimer * 5) * speed;
                break;

            case 'random':
            default:
                // Drift randomly
                // (This is usually handled by AI setting targetDirection, but as fallback)
                if (this.patternTimer % 2 < 0.1) {
                    this.patternState.angle = Math.random() * Math.PI * 2;
                }
                const a = this.patternState.angle || 0;
                vel.x = Math.cos(a) * speed * 0.5;
                vel.y = Math.sin(a) * speed * 0.5;
                break;
        }

        return vel;
    }

    /**
     * [REFACTORED] Apply environmental forces via accumulator
     */
    applyEnvironmentalForces(deltaTime, game) {
        if (!this.forceAccumulator) return;

        // Example: Gravity Wells
        if (game.gravityWells && game.gravityWells.length > 0) {
            for (const well of game.gravityWells) {
                const dx = well.x - this.enemy.x;
                const dy = well.y - this.enemy.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < well.radius * well.radius) {
                    const dist = Math.sqrt(distSq);
                    const force = well.strength * (1 - dist / well.radius);

                    const fx = (dx / dist) * force * deltaTime;
                    const fy = (dy / dist) * force * deltaTime;

                    this.forceAccumulator.addForce('external', fx, fy);
                }
            }
        }

        // Example: World Boundaries (Soft repulsion)
        const margin = 50;
        if (this.enemy.x < margin) this.forceAccumulator.addForce('external', 200 * deltaTime, 0);
        if (this.enemy.x > game.width - margin) this.forceAccumulator.addForce('external', -200 * deltaTime, 0);
        if (this.enemy.y < margin) this.forceAccumulator.addForce('external', 0, 200 * deltaTime);
        if (this.enemy.y > game.height - margin) this.forceAccumulator.addForce('external', 0, -200 * deltaTime);
    }

    /**
     * [REFACTORED] Integrate physics: Force -> Velocity -> Position
     * This is the ONLY place where velocity and position are updated.
     */
    integratePhysics(deltaTime) {
        if (!this.forceAccumulator) return;

        // 1. Get Net Force
        const netForce = this.forceAccumulator.computeNetForce();

        // 2. Apply Force to Velocity (F = ma, assume m=1 for now)
        this.velocity.x += netForce.x;
        this.velocity.y += netForce.y;

        // 3. Apply Friction/Damping
        // (Simulates air resistance)
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // 4. Clamp Velocity to Max Speed
        // (Allow exceeding max speed slightly from external forces like knockback)
        const speedSq = this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y;
        const maxSpeedSq = this.maxSpeed * this.maxSpeed;

        if (speedSq > maxSpeedSq) {
            // Soft cap: only clamp if not being knocked back
            if (this.knockbackVelocity.x === 0 && this.knockbackVelocity.y === 0) {
                const speed = Math.sqrt(speedSq);
                const scale = this.maxSpeed / speed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        }

        // 5. Update Position
        this.updatePosition(deltaTime);
    }

    /**
     * Update position based on velocity and knockback
     */
    updatePosition(deltaTime) {
        // Combine natural velocity and knockback
        const totalVx = this.velocity.x + this.knockbackVelocity.x;
        const totalVy = this.velocity.y + this.knockbackVelocity.y;

        // Apply to position
        this.enemy.x += totalVx * deltaTime;
        this.enemy.y += totalVy * deltaTime;

        // Update rotation to face movement direction (visual polish)
        // Only if moving significantly
        const totalSpeedSq = totalVx * totalVx + totalVy * totalVy;
        if (totalSpeedSq > 10) {
            this.enemy.rotation = Math.atan2(totalVy, totalVx);
        }
    }

    /**
     * Handle knockback decay
     */
    updateKnockback(deltaTime) {
        if (Math.abs(this.knockbackVelocity.x) > 0.1 || Math.abs(this.knockbackVelocity.y) > 0.1) {
            this.knockbackVelocity.x *= this.knockbackDrag;
            this.knockbackVelocity.y *= this.knockbackDrag;

            // Snap to zero if very small
            if (Math.abs(this.knockbackVelocity.x) < 0.1) this.knockbackVelocity.x = 0;
            if (Math.abs(this.knockbackVelocity.y) < 0.1) this.knockbackVelocity.y = 0;
        }
    }

    /**
     * Apply knockback impulse
     * [NOTE] This is the primary entry point for external knockback (e.g. from explosions)
     */
    applyKnockback(forceX, forceY) {
        this.knockbackVelocity.x += forceX;
        this.knockbackVelocity.y += forceY;
    }

    /**
     * Check if enemy is stuck
     */
    checkStuck(deltaTime) {
        this.stuckTimer += deltaTime;
        if (this.stuckTimer >= 1.0) { // Check every second
            const dx = this.enemy.x - this.lastPosition.x;
            const dy = this.enemy.y - this.lastPosition.y;
            const distSq = dx * dx + dy * dy;

            // If moved less than 10 pixels in 1 second, consider stuck
            if (distSq < 100 && !this.enemy.isDead) {
                this.isStuck = true;
                // Attempt to unstuck: apply random large force
                if (this.forceAccumulator) {
                    const angle = Math.random() * Math.PI * 2;
                    const force = 500;
                    this.forceAccumulator.addForce('external', Math.cos(angle) * force, Math.sin(angle) * force);
                }
            } else {
                this.isStuck = false;
            }

            this.lastPosition.x = this.enemy.x;
            this.lastPosition.y = this.enemy.y;
            this.stuckTimer = 0;
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemyMovement = EnemyMovement;
}
if (typeof module !== 'undefined') {
    module.exports = EnemyMovement;
}

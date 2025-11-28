/**
 * SteeringUtils
 * Common steering behaviors for autonomous agents.
 * Centralizes logic for seek, arrive, wander, etc. to reduce duplication.
 */
class SteeringUtils {
    /**
     * Calculate a steering force to seek a target position.
     * @param {Object} currentPos - Current position {x, y}
     * @param {Object} targetPos - Target position {x, y}
     * @param {Object} currentVel - Current velocity {x, y}
     * @param {number} maxSpeed - Maximum speed
     * @param {number} slowingRadius - Radius at which to start slowing down (0 for no slowing)
     * @returns {Object} Steering force {x, y}
     */
    static seek(currentPos, targetPos, currentVel, maxSpeed, slowingRadius = 0) {
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return { x: 0, y: 0 };

        let targetSpeed = maxSpeed;
        if (slowingRadius > 0 && distance < slowingRadius) {
            targetSpeed = maxSpeed * (distance / slowingRadius);
        }

        const targetVelocityX = (dx / distance) * targetSpeed;
        const targetVelocityY = (dy / distance) * targetSpeed;

        return {
            x: targetVelocityX - currentVel.x,
            y: targetVelocityY - currentVel.y
        };
    }

    /**
     * Calculate a steering force to arrive at a target position with damping.
     * This is similar to seek with a slowing radius, but often tuned differently for "springy" arrival.
     * @param {Object} currentPos - Current position {x, y}
     * @param {Object} targetPos - Target position {x, y}
     * @param {Object} currentVel - Current velocity {x, y}
     * @param {Object} params - Tuning parameters
     * @param {number} params.maxSpeed - Maximum speed
     * @param {number} params.deceleration - Deceleration factor (higher = faster stop)
     * @returns {Object} Steering force {x, y}
     */
    static arrive(currentPos, targetPos, currentVel, params) {
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return { x: 0, y: 0 };

        // Deceleration tweak
        const deceleration = params.deceleration || 3.0;
        let speed = distance / deceleration;

        speed = Math.min(speed, params.maxSpeed);

        const targetVelocityX = (dx / distance) * speed;
        const targetVelocityY = (dy / distance) * speed;

        return {
            x: targetVelocityX - currentVel.x,
            y: targetVelocityY - currentVel.y
        };
    }

    /**
     * Calculate a steering force to wander randomly.
     * @param {Object} currentVel - Current velocity {x, y}
     * @param {Object} wanderState - State object to persist wander angle { angle: number }
     * @param {Object} params - Tuning parameters
     * @param {number} params.wanderDistance - Distance to wander circle
     * @param {number} params.wanderRadius - Radius of wander circle
     * @param {number} params.wanderJitter - Random displacement per frame
     * @returns {Object} Steering force {x, y}
     */
    static wander(currentVel, wanderState, params) {
        // Add random jitter to the wander angle
        wanderState.angle += (Math.random() * 2 - 1) * params.wanderJitter;

        // Calculate the circle center
        // If velocity is zero, assume forward is right (1, 0)
        let headingX = 1, headingY = 0;
        const speedSq = currentVel.x * currentVel.x + currentVel.y * currentVel.y;
        if (speedSq > 0) {
            const speed = Math.sqrt(speedSq);
            headingX = currentVel.x / speed;
            headingY = currentVel.y / speed;
        }

        const circleCenterX = headingX * params.wanderDistance;
        const circleCenterY = headingY * params.wanderDistance;

        // Calculate the displacement force
        const displacementX = Math.cos(wanderState.angle) * params.wanderRadius;
        const displacementY = Math.sin(wanderState.angle) * params.wanderRadius;

        return {
            x: circleCenterX + displacementX,
            y: circleCenterY + displacementY
        };
    }
}

// Export
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.SteeringUtils = SteeringUtils;
}
if (typeof module !== 'undefined') {
    module.exports = SteeringUtils;
}

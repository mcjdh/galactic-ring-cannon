/**
 * SteeringUtils
 * Common steering behaviors for autonomous agents.
 * Centralizes logic for seek, arrive, wander, etc. to reduce duplication.
 */
class SteeringUtils {
    /**
     * Internal helper for fast sqrt with perfCache fallback
     * @private
     */
    static _sqrt(value) {
        if (typeof window !== 'undefined' && window.perfCache) {
            return window.perfCache.sqrt(value);
        }
        return Math.sqrt(value);
    }

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
        const distSq = dx * dx + dy * dy;
        
        if (distSq === 0) return { x: 0, y: 0 };
        
        const distance = this._sqrt(distSq);

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
        const distSq = dx * dx + dy * dy;

        // Early exit: already at target (use squared distance to avoid sqrt)
        if (distSq < 1) return { x: 0, y: 0 };

        const distance = this._sqrt(distSq);

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
        // Use cached random if available for better perf on Pi5
        const rand = (typeof window !== 'undefined' && window.perfCache)
            ? window.perfCache.random()
            : Math.random();
        
        // Add random jitter to the wander angle
        wanderState.angle += (rand * 2 - 1) * params.wanderJitter;

        // Calculate the circle center
        // If velocity is zero, assume forward is right (1, 0)
        let headingX = 1, headingY = 0;
        const speedSq = currentVel.x * currentVel.x + currentVel.y * currentVel.y;
        if (speedSq > 0) {
            const speed = this._sqrt(speedSq);
            headingX = currentVel.x / speed;
            headingY = currentVel.y / speed;
        }

        const circleCenterX = headingX * params.wanderDistance;
        const circleCenterY = headingY * params.wanderDistance;

        // Use cached sin/cos if available
        let displacementX, displacementY;
        if (typeof window !== 'undefined' && window.trigCache) {
            const sc = window.trigCache.sincos(wanderState.angle);
            displacementX = sc.cos * params.wanderRadius;
            displacementY = sc.sin * params.wanderRadius;
        } else {
            displacementX = Math.cos(wanderState.angle) * params.wanderRadius;
            displacementY = Math.sin(wanderState.angle) * params.wanderRadius;
        }

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

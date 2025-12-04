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

class EnemyMovement {
    constructor(enemy) {
        this.enemy = enemy;

        // [FIX] Per-enemy random seed to prevent synchronized movement patterns
        this._randomSeed = Math.floor(Math.random() * 4096);

        // Movement properties
        this.velocity = { x: 0, y: 0 };
        // Configurable physics parameters (with defaults)
        // [TUNED] Reduced friction for better momentum, increased steering for responsiveness
        this.friction = enemy.friction || 0.95;
        this.steeringStrength = enemy.steeringStrength || 6.0;
        this.maxSpeed = enemy.speed || 100;

        // Movement patterns
        this.currentPattern = 'direct';
        this.patternTimer = 0;
        this.patternState = {}; // Pattern-specific state

        // Stuck detection
        this.lastPosition = { x: enemy.x, y: enemy.y };
        this.stuckTimer = 0;
        this.isStuck = false;
        this._stuckCooldown = 0; // [FIX] Cooldown to prevent stuck detection jitter

        // Knockback
        this.knockbackVelocity = { x: 0, y: 0 };
        this.knockbackDrag = 0.9;

        // [UNIFIED PHYSICS] Force system components
        this.forceAccumulator = window.Game?.ForceAccumulator
            ? new window.Game.ForceAccumulator(enemy)
            : null;
        this.localForceProducer = null; // Lazy - requires game reference

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

        // 4. Apply Formation/Constellation Forces
        // [FIX] These must be applied AFTER reset, not before (in GameManager.update)
        // The external systems set targets; we pull and apply forces here
        this.applyManagedStructureForces(deltaTime, game);

        // 5. Apply Environmental Forces (Gravity, Wind, etc.)
        this.applyEnvironmentalForces(deltaTime, game);

        // 6. Integrate Physics (Force -> Velocity -> Position)
        this.integratePhysics(deltaTime);

        // 7. Handle Knockback (Decay)
        this.updateKnockback(deltaTime);

        // 8. Stuck Detection
        this.checkStuck(deltaTime);
    }

    /**
     * Apply forces from managed structures (formations and constellations)
     * [FIX] This replaces the external force injection that happened before reset()
     */
    applyManagedStructureForces(deltaTime, game) {
        if (!this.forceAccumulator) return;

        const enemy = this.enemy;

        // Apply formation forces
        if (enemy.formationId && game.formationManager) {
            const formation = game.formationManager.formations?.find(f => f.id === enemy.formationId);
            if (formation && formation.active) {
                this._applyFormationForce(deltaTime, formation, game);
            }
        }
        // Apply constellation forces (mutually exclusive with formations)
        else if (enemy.constellation && game.emergentDetector) {
            const constellation = game.emergentDetector.constellations?.find(c => c.id === enemy.constellation);
            if (constellation) {
                this._applyConstellationForce(deltaTime, constellation, game);
            }
        }
    }

    /**
     * Apply steering force toward formation target position
     * [TUNED] Stronger forces and no dead zone to prevent enemies freezing
     */
    _applyFormationForce(deltaTime, formation, game) {
        const enemy = this.enemy;
        const config = formation.config;
        
        // Get target positions for this formation
        const positions = this._getFormationPositions(formation, config);

        // Use stored formationIndex to get correct target
        const positionIndex = enemy.formationIndex ?? 0;
        const targetPos = positions[positionIndex];
        if (!targetPos) return;

        const dx = targetPos.x - enemy.x;
        const dy = targetPos.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        // [FIX] Always apply some force - use seek instead of arrive to prevent stopping
        // Formation enemies should always be moving since the formation moves toward player
        if (dist > 0.1) {
            // Use SteeringUtils.seek for continuous movement (no deceleration)
            if (window.Game?.SteeringUtils) {
                // [IMPROVED] Use 'arrive' behavior with a small slowing radius for smoother settling
                // but keep the force high to prevent lagging behind
                const steering = window.Game.SteeringUtils.arrive(
                    { x: enemy.x, y: enemy.y },
                    { x: targetPos.x, y: targetPos.y },
                    this.velocity,
                    {
                        maxSpeed: (this.maxSpeed || 100) * 1.3,
                        deceleration: 0.5 // Low value = fast arrival (distance / deceleration)
                    }
                );
                // [BUFFED] Increased force multiplier for more responsive formation keeping
                this.forceAccumulator.addForce('formation', steering.x * 120 * deltaTime, steering.y * 120 * deltaTime);
            } else {
                // Fallback spring force - no dead zone
                // [IMPROVED] Damped spring for organic movement
                const springStrength = 20.0;  // Stronger spring
                const damping = 0.8;
                
                const targetVelX = (dx / dist) * (enemy.speed || 100);
                const targetVelY = (dy / dist) * (enemy.speed || 100);
                
                // Spring force: k * displacement
                const springX = dx * springStrength;
                const springY = dy * springStrength;
                
                // Damping force: -c * velocity
                const dampX = -this.velocity.x * damping;
                const dampY = -this.velocity.y * damping;
                
                this.forceAccumulator.addForce('formation', (springX + dampX) * deltaTime, (springY + dampY) * deltaTime);
            }
        }
    }

    /**
     * Apply steering force toward constellation target position
     * [FIXED] Simplified stable spring-damper system to prevent oscillation
     */
    _applyConstellationForce(deltaTime, constellation, game) {
        const enemy = this.enemy;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const joinAge = now - (enemy.constellationJoinedAt || now);
        const isFreshJoin = joinAge < 2000;

        // Get target positions (cached per frame)
        const targetPositions = this._getConstellationPositions(constellation);

        if (!targetPositions || targetPositions.length === 0) return;

        const anchorIndex = enemy.constellationAnchor ?? 0;
        const target = targetPositions[anchorIndex % targetPositions.length];
        if (!target) return;

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // [FIXED] Simple critically-damped spring system
        // Uses velocity-based approach rather than acceleration-based to prevent oscillation
        
        // Calculate desired velocity toward target
        // Speed scales with distance but caps at max speed
        const maxApproachSpeed = isFreshJoin ? 180 : 120;
        const minSpeed = 5;  // Always move at least a little if not at target
        
        // Dead zone - if very close, just stop
        if (dist < 3) {
            // Apply gentle velocity damping to settle
            this.forceAccumulator.addForce('constellation',
                -this.velocity.x * 3.0 * deltaTime,
                -this.velocity.y * 3.0 * deltaTime
            );
            return;
        }
        
        // Desired speed: fast when far, slow when close (smooth arrival)
        const arrivalRadius = 60;  // Start slowing down at this distance
        let desiredSpeed;
        if (dist > arrivalRadius) {
            desiredSpeed = maxApproachSpeed;
        } else {
            // Linear slowdown as we approach
            desiredSpeed = Math.max(minSpeed, maxApproachSpeed * (dist / arrivalRadius));
        }
        
        // Desired velocity toward target
        const desiredVelX = (dx / dist) * desiredSpeed;
        const desiredVelY = (dy / dist) * desiredSpeed;
        
        // Steering force: smoothly blend current velocity toward desired
        // Higher values = snappier but can oscillate
        // Lower values = smoother but sluggish
        const steerStrength = isFreshJoin ? 4.0 : 2.5;
        
        const steerX = (desiredVelX - this.velocity.x) * steerStrength;
        const steerY = (desiredVelY - this.velocity.y) * steerStrength;
        
        this.forceAccumulator.addForce('constellation', steerX * deltaTime * 50, steerY * deltaTime * 50);

        // Catch-up pull if too far from constellation center (emergency only)
        const maxConstellationRadius = 280;
        const toCenterX = constellation.centerX - enemy.x;
        const toCenterY = constellation.centerY - enemy.y;
        const distToCenterSq = toCenterX * toCenterX + toCenterY * toCenterY;
        const catchUpThresholdSq = maxConstellationRadius * maxConstellationRadius * 0.5;
        
        if (distToCenterSq > catchUpThresholdSq) {
            const distToCenter = Math.sqrt(distToCenterSq);
            const pullStrength = (distToCenter / maxConstellationRadius - 0.7) * 2;  // Ramps up past 70%
            const catchUpForce = 600 * Math.max(0, pullStrength);
            this.forceAccumulator.addForce('constellation',
                (toCenterX / distToCenter) * catchUpForce * deltaTime,
                (toCenterY / distToCenter) * catchUpForce * deltaTime
            );
        }
    }

    /**
     * Cache formation target positions per frame to avoid recomputing for every enemy
     */
    _getFormationPositions(formation, config) {
        if (!formation || !config || typeof config.getPositions !== 'function') {
            return [];
        }

        const cache = formation._targetCache || (formation._targetCache = {});
        const enemyCount = formation.enemies?.length || 0;

        if (
            cache.time !== formation.time ||
            cache.rotation !== formation.rotation ||
            cache.cx !== formation.center.x ||
            cache.cy !== formation.center.y ||
            cache.count !== enemyCount ||
            cache.config !== config
        ) {
            cache.positions = config.getPositions(
                formation.center.x,
                formation.center.y,
                formation.rotation,
                formation.time
            ) || [];
            cache.time = formation.time;
            cache.rotation = formation.rotation;
            cache.cx = formation.center.x;
            cache.cy = formation.center.y;
            cache.count = enemyCount;
            cache.config = config;
        }

        return cache.positions;
    }

    /**
     * Cache constellation target positions per frame to avoid recomputing for every enemy
     * [PERFORMANCE] Uses frame number for cache key instead of comparing floats
     */
    _getConstellationPositions(constellation) {
        if (!constellation || !constellation.pattern || typeof constellation.pattern.getTargetPositions !== 'function') {
            return [];
        }

        const cache = constellation._targetCache || (constellation._targetCache = {});
        const enemyCount = constellation.enemies?.length || 0;
        
        // [PERFORMANCE] Use frame number as primary cache key - much faster than float comparisons
        // Falls back to parameter checks only if frame number isn't available
        const currentFrame = this.enemy?.movement?._frameNumber || 
                            window.gameManager?.frameCount || 
                            Math.floor(performance.now() / 16.67); // ~60fps fallback

        // Only recompute if this is a new frame or count changed
        if (cache.frame !== currentFrame || cache.count !== enemyCount) {
            cache.positions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            ) || [];
            cache.frame = currentFrame;
            cache.count = enemyCount;
        }

        return cache.positions;
    }

    /**
     * [REFACTORED] Calculate and apply steering forces based on current pattern
     * Instead of setting velocity directly, we calculate a desired velocity
     * and apply a steering force to reach it.
     */
    applyPatternForces(deltaTime, game) {
        if (!this.forceAccumulator) return;

        const isManaged = (this.forceAccumulator.weights?.formation > 0) ||
            (this.forceAccumulator.weights?.constellation > 0);
        const hasDashOverride = !!this.enemy?.abilities?.isDashing;

        // When an enemy is controlled by a formation/constellation, let those forces
        // drive steering and only keep separation via LocalForceProducer.
        if (isManaged && !hasDashOverride) {
            return;
        }

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
     * @param {object} _game - Reserved for future pattern enhancements
     * @param {object} outVel - Vector to write result to
     */
    calculatePatternVelocity(deltaTime, _game, outVel) {
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

            case 'spiral_approach':
                // Spiral inward towards target (or just forward if no target context)
                // This creates a "flanking" feel
                const spiralAngle = this.patternTimer * 3;
                const spiralRadius = Math.max(10, 100 - this.patternTimer * 20); // Shrinking radius
                // Tangential velocity + Inward velocity
                // We simulate this by rotating the forward vector
                // Assuming "forward" is roughly towards player, we add a perpendicular component
                
                // Since we don't have target context here easily without passing it, 
                // we'll just make a generic spiral motion relative to current velocity direction?
                // No, let's just make a cool local pattern.
                
                vel.x = Math.cos(spiralAngle) * speed;
                vel.y = Math.sin(spiralAngle) * speed;
                // Add a bias to move "forward" (down/left depending on spawn)
                // But without context, 'random' drift is safer.
                // Let's make it a figure-eight
                vel.x = Math.cos(this.patternTimer * 2) * speed;
                vel.y = Math.sin(this.patternTimer * 4) * speed * 0.5;
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

        // World Boundaries (Soft repulsion)
        // [FIX] Use game.canvas dimensions, not game.width/height which don't exist
        const margin = 50;
        const canvasWidth = game.canvas?.width || window.innerWidth || 1920;
        const canvasHeight = game.canvas?.height || window.innerHeight || 1080;

        if (this.enemy.x < margin) this.forceAccumulator.addForce('external', 200 * deltaTime, 0);
        if (this.enemy.x > canvasWidth - margin) this.forceAccumulator.addForce('external', -200 * deltaTime, 0);
        if (this.enemy.y < margin) this.forceAccumulator.addForce('external', 0, 200 * deltaTime);
        if (this.enemy.y > canvasHeight - margin) this.forceAccumulator.addForce('external', 0, -200 * deltaTime);
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

        // 3. Apply Friction/Damping (frame-rate independent)
        // [FIX] Normalize friction to 60fps to prevent sliding differences at varying framerates
        const frictionFactor = Math.pow(this.friction, deltaTime * 60);
        this.velocity.x *= frictionFactor;
        this.velocity.y *= frictionFactor;

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
     * [FIX] Now frame-rate independent - decay is normalized to 60fps
     */
    updateKnockback(deltaTime) {
        if (Math.abs(this.knockbackVelocity.x) > 0.1 || Math.abs(this.knockbackVelocity.y) > 0.1) {
            // [FIX] Frame-rate independent decay: normalize drag to 60fps
            // At 60fps, deltaTime ≈ 1/60, so decayFactor ≈ knockbackDrag
            // At 30fps, deltaTime ≈ 1/30, so decayFactor ≈ knockbackDrag^2 (more decay per frame)
            const decayFactor = Math.pow(this.knockbackDrag, deltaTime * 60);
            this.knockbackVelocity.x *= decayFactor;
            this.knockbackVelocity.y *= decayFactor;

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
     * Reset movement state (for pooled enemy reuse)
     * [FIX] Clears all momentum and state to prevent carryover from previous life
     */
    reset() {
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.knockbackVelocity.x = 0;
        this.knockbackVelocity.y = 0;
        this.isStuck = false;
        this.stuckTimer = 0;
        this._stuckCooldown = 0;
        this.lastPosition.x = this.enemy.x;
        this.lastPosition.y = this.enemy.y;
        this.patternTimer = 0;
        this.patternState = {};
        if (this.forceAccumulator) {
            this.forceAccumulator.reset();
        }
    }

    /**
     * Get movement state for debugging/UI
     */
    getMovementState() {
        return {
            velocity: { ...this.velocity },
            knockback: { ...this.knockbackVelocity },
            isStuck: this.isStuck,
            pattern: this.currentPattern,
            maxSpeed: this.maxSpeed
        };
    }

    /**
     * Check if enemy is stuck
     * [TUNED] More aggressive stuck detection and recovery with anti-jitter cooldown
     */
    checkStuck(deltaTime) {
        // [FIX] Cooldown prevents rapid re-triggering that causes jitter
        if (this._stuckCooldown > 0) {
            this._stuckCooldown -= deltaTime;
            return;
        }

        this.stuckTimer += deltaTime;
        // [FIX] Check more frequently (0.5s) for faster stuck recovery
        if (this.stuckTimer >= 0.5) {
            const dx = this.enemy.x - this.lastPosition.x;
            const dy = this.enemy.y - this.lastPosition.y;
            const distSq = dx * dx + dy * dy;

            // [FIX] If moved less than 5 pixels in 0.5 second, consider stuck
            // This catches enemies that are barely moving
            if (distSq < 25 && !this.enemy.isDead) {
                this.isStuck = true;
                
                // [FIX] Set cooldown to prevent jitter from repeated stuck detection
                this._stuckCooldown = 1.5; // Don't check again for 1.5 seconds
                
                // Attempt to unstuck: apply directional impulse toward player (smarter than random)
                if (this.forceAccumulator) {
                    let angle;
                    const player = window.gameManager?.player;
                    if (player && !player.isDead) {
                        // Push toward player (more likely to be open space)
                        const toPlayerX = player.x - this.enemy.x;
                        const toPlayerY = player.y - this.enemy.y;
                        angle = Math.atan2(toPlayerY, toPlayerX);
                        // Add some randomness to avoid all enemies going same direction
                        angle += (Math.random() - 0.5) * Math.PI * 0.5;
                    } else {
                        angle = Math.random() * Math.PI * 2;
                    }
                    
                    // [BUFFED] Stronger impulse for more reliable unstuck
                    const impulseStrength = 2000;
                    this.forceAccumulator.addForce('external', 
                        Math.cos(angle) * impulseStrength, 
                        Math.sin(angle) * impulseStrength
                    );
                }
                
                // [FIX] Also give AI a new direction to pursue
                if (this.enemy.targetDirection) {
                    const newAngle = Math.random() * Math.PI * 2;
                    this.enemy.targetDirection.x = Math.cos(newAngle);
                    this.enemy.targetDirection.y = Math.sin(newAngle);
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

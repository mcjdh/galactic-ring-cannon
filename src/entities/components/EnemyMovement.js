// Movement pattern cache - trades RAM for fewer trig/random calls per frame.
const MovementPatternCache = (() => {
    const TABLE_SIZE = 4096;
    const TABLE_MASK = TABLE_SIZE - 1;
    const TWO_PI = Math.PI * 2;
    const INV_TWO_PI = 1 / TWO_PI;

    const sinTable = new Float32Array(TABLE_SIZE);
    const cosTable = new Float32Array(TABLE_SIZE);
    const randomTable = new Float32Array(TABLE_SIZE);
    const vectorTable = new Float32Array(TABLE_SIZE * 2);

    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = (i / TABLE_SIZE) * TWO_PI;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        sinTable[i] = sin;
        cosTable[i] = cos;
        randomTable[i] = Math.random();
        vectorTable[i * 2] = cos;
        vectorTable[i * 2 + 1] = sin;
    }

    let randomIndex = 0;
    let vectorIndex = 0;

    const hasPerfCache = () => typeof window !== 'undefined' && window.perfCache;

    const normalizeAngle = (angle) => {
        if (!Number.isFinite(angle)) return 0;
        let normalized = angle % TWO_PI;
        if (normalized < 0) normalized += TWO_PI;
        return normalized;
    };

    const getIndex = (angle) => {
        const normalized = normalizeAngle(angle);
        const scaled = normalized * INV_TWO_PI * TABLE_SIZE;
        return scaled & TABLE_MASK;
    };

    const sin = (angle) => sinTable[getIndex(angle)];
    const cos = (angle) => cosTable[getIndex(angle)];
    const sincos = (angle) => {
        const idx = getIndex(angle);
        return { sin: sinTable[idx], cos: cosTable[idx] };
    };

    const nextRandom = () => {
        if (hasPerfCache()) {
            return window.perfCache.random();
        }
        const value = randomTable[randomIndex];
        randomIndex = (randomIndex + 1) & TABLE_MASK;
        return value;
    };

    const randomRange = (min, max) => min + nextRandom() * (max - min);
    const randomAngle = () => nextRandom() * TWO_PI;

    const sampleUnitVector = () => {
        vectorIndex = (vectorIndex + 1) & TABLE_MASK;
        const base = vectorIndex << 1;
        return {
            x: vectorTable[base],
            y: vectorTable[base + 1]
        };
    };

    const fastSqrt = (value) => {
        if (value <= 0) return 0;
        return hasPerfCache() ? window.perfCache.sqrt(value) : Math.sqrt(value);
    };

    const fastMagnitude = (x, y) => fastSqrt(x * x + y * y);

    return {
        sin,
        cos,
        sincos,
        random: nextRandom,
        randomRange,
        randomAngle,
        sampleUnitVector,
        fastMagnitude,
        fastSqrt,
        normalizeAngle,
        TWO_PI
    };
})();

/**
 * EnemyMovement Component
 * [A] RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all movement patterns, physics, collision detection, and pathfinding
 */

class EnemyMovement {
    constructor(enemy) {
        this.enemy = enemy;

        // [FIX] Per-enemy random seed to prevent synchronized movement patterns
        this._randomSeed = Math.floor(Math.random() * 4096);

        // Movement properties - optimized for smooth movement
        this.speed = 100;
        this.velocity = { x: 0, y: 0 };
        this.currentDirection = { x: 0, y: 0 }; // Current movement direction (calculated from AI input)
        this.acceleration = 250; // Further reduced for stability
        this.friction = 0.92; // Balanced friction for smooth movement

        // Anti-jitter properties
        this.velocitySmoothing = { x: 0, y: 0 }; // Smoothed velocity for ultra-stable movement
        this.smoothingFactor = 0.85; // How much to smooth velocity changes
        this.lastNonZeroDirection = { x: 1, y: 0 };

        // Movement patterns
        this.movementPattern = 'direct'; // direct, circular, zigzag, random
        this.patternTimer = this._randomRange(0, 2.0); // Randomize initial timer to desync movement patterns
        this.patternData = {}; // Pattern-specific data
        
        // Collision detection
        this.collisionRadius = 15;
        this.collidedThisFrame = false;
        this.collisionCooldown = 0;
        this.lastCollisionTime = 0;
        
        // Canvas boundaries
        this.canvasMargin = 50; // Stay this far from canvas edges (unused in infinite arena)
        
        // Movement state
        this.isMoving = false;
        this.lastPosition = { x: 0, y: 0 };
        this.stuckTimer = 0;
        this.stuckThreshold = 2.0; // Seconds before considering enemy stuck
        
        // Temporary pattern change state
        this.tempPatternTimer = 0;
        this.originalPattern = null;
        
        // Special movement states
        this.isKnockback = false;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.knockbackTimer = 0;
        this.knockbackDuration = 0.3;
    }

    /**
     * Per-enemy random number generation to prevent synchronized patterns
     * Uses pre-initialized static table for performance
     */
    _getNextRandom() {
        const TABLE_MASK = 4095; // TABLE_SIZE - 1
        const value = EnemyMovement._randomTableCache[this._randomSeed];
        this._randomSeed = (this._randomSeed + 1) & TABLE_MASK;
        return value;
    }

    _randomRange(min, max) {
        return min + this._getNextRandom() * (max - min);
    }

    _randomAngle() {
        return this._getNextRandom() * (Math.PI * 2);
    }

    /**
     * Update movement system
     */
    update(deltaTime, game) {
        // Store last position for stuck detection (at END of update)
        // Note: lastPosition will be updated at end of this method
        
        // Update movement timers
        this.updateTimers(deltaTime);
        
        // Handle special movement states
        if (this.isKnockback) {
            this.updateKnockback(deltaTime);
        } else {
            // Handle different movement patterns
            this.updateMovementPattern(deltaTime, game);

            // Apply ambient forces such as gravity wells after determining movement direction
            this.applyEnvironmentalForces(deltaTime, game);

            // Apply atomic lattice forces (Molecular Dynamics)
            this.applyAtomicForces(deltaTime, game);
            
            // Apply movement physics
            this.updatePhysics(deltaTime);
        }
        
        // Apply final position updates
        this.updatePosition(deltaTime);
        
        // Handle collision detection
        this.handleCollisions(deltaTime, game);
        
        // Skip constraining to canvas to avoid jitter at edges; world is effectively infinite
        // this.constrainToCanvas(game);
        
        // Check if enemy is stuck
        this.checkStuckState(deltaTime);
        
        // Update last position for next frame's stuck detection
        this.lastPosition = { x: this.enemy.x, y: this.enemy.y };
    }
    
    /**
     * Update movement timers
     */
    updateTimers(deltaTime) {
        this.patternTimer += deltaTime;
        
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        }
        
        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= deltaTime;
            
            if (this.knockbackTimer <= 0) {
                this.isKnockback = false;
            }
        }
        
        // Handle temporary pattern change timer
        if (this.tempPatternTimer > 0) {
            this.tempPatternTimer -= deltaTime;
            
            if (this.tempPatternTimer <= 0 && this.originalPattern) {
                this.movementPattern = this.originalPattern;
                this.originalPattern = null;
            }
        }
    }
    
    /**
     * Update movement pattern
     */
    updateMovementPattern(deltaTime, game) {
        // If in a formation, disable standard AI steering
        // The FormationManager handles movement
        if (this.enemy.formationId) {
            this.currentDirection = { x: 0, y: 0 };
            return;
        }

        // Get base direction from AI (from enemy's targetDirection set by AI component)
        let baseDirection = this.enemy.targetDirection || { x: 0, y: 0 };
        
        // Apply movement pattern modifier
        switch (this.movementPattern) {
            case 'direct':
                // No modification - use direct path
                break;
            case 'circular':
                baseDirection = this.applyCircularPattern(baseDirection, deltaTime);
                break;
            case 'zigzag':
                baseDirection = this.applyZigzagPattern(baseDirection, deltaTime);
                break;
            case 'random':
                baseDirection = this.applyRandomPattern(baseDirection, deltaTime);
                break;
            case 'orbital':
                baseDirection = this.applyOrbitalPattern(baseDirection, deltaTime, game);
                break;
        }
        
        // Apply special movement modifiers
        if (this.enemy.abilities && this.enemy.abilities.isDashing) {
            // Use dash direction and speed (with fallback)
            baseDirection = this.enemy.abilities.dashDirection || baseDirection;
            this.speed = this.enemy.abilities.dashSpeed || this.speed;
        } else {
            // Reset to normal speed
            this.speed = this.enemy.baseSpeed || 100;
        }

        let desiredDirection = { x: baseDirection.x, y: baseDirection.y };
        let desiredMagnitude = MovementPatternCache.fastMagnitude(desiredDirection.x, desiredDirection.y);

        const lastMagnitude = MovementPatternCache.fastMagnitude(
            this.lastNonZeroDirection.x,
            this.lastNonZeroDirection.y
        );
        if (desiredMagnitude < 0.02 && lastMagnitude > 0.01) {
            desiredDirection = {
                x: this.lastNonZeroDirection.x * 0.7,
                y: this.lastNonZeroDirection.y * 0.7
            };
            desiredMagnitude = MovementPatternCache.fastMagnitude(desiredDirection.x, desiredDirection.y);
        }

        if (desiredMagnitude > 1) {
            desiredDirection.x /= desiredMagnitude;
            desiredDirection.y /= desiredMagnitude;
            desiredMagnitude = 1;
        } else if (desiredMagnitude < 0.005) {
            desiredDirection.x = 0;
            desiredDirection.y = 0;
        }

        const frames = Math.max(deltaTime * 60, 1);
        const smoothingBase = this.collidedThisFrame ? 0.7 : 0.82;
        const lerpFactor = 1 - Math.pow(smoothingBase, frames);

        this.currentDirection.x += (desiredDirection.x - this.currentDirection.x) * lerpFactor;
        this.currentDirection.y += (desiredDirection.y - this.currentDirection.y) * lerpFactor;

        this.currentDirection.x = Math.max(-1, Math.min(1, this.currentDirection.x));
        this.currentDirection.y = Math.max(-1, Math.min(1, this.currentDirection.y));

        const currentMagnitude = MovementPatternCache.fastMagnitude(
            this.currentDirection.x,
            this.currentDirection.y
        );
        if (currentMagnitude > 1) {
            this.currentDirection.x /= currentMagnitude;
            this.currentDirection.y /= currentMagnitude;
        }

        if (currentMagnitude > 0.05) {
            this.lastNonZeroDirection.x = this.currentDirection.x;
            this.lastNonZeroDirection.y = this.currentDirection.y;
        }
    }

    /**
     * Apply external forces such as gravity wells for dynamic battlefield effects.
     */
    applyEnvironmentalForces(deltaTime, game) {
        if (!game || typeof game.getEntitiesByType !== 'function') {
            return;
        }

        const wells = game.getEntitiesByType('gravityWell');
        if (!Array.isArray(wells) || wells.length === 0) {
            return;
        }

        let totalPullX = 0;
        let totalPullY = 0;
        let maxSlowFactor = 0;
        let affected = false;

        for (const well of wells) {
            if (!well || well.isDead) continue;
            const radius = well.radius || 0;
            if (radius <= 0) continue;

            const dx = well.x - this.enemy.x;
            const dy = well.y - this.enemy.y;
            const distanceSquared = dx * dx + dy * dy;
            const radiusSquared = radius * radius;
            if (distanceSquared > radiusSquared) continue;

            const distance = MovementPatternCache.fastSqrt(distanceSquared) || 0.001;
            const intensity = 1 - (distance / radius);
            if (intensity <= 0) continue;

            affected = true;
            const dirX = dx / distance;
            const dirY = dy / distance;
            const pullStrength = (typeof well.pullStrength === 'number' ? well.pullStrength : 0.3) * 420;

            totalPullX += dirX * pullStrength * intensity;
            totalPullY += dirY * pullStrength * intensity;

            const slowAmount = typeof well.slowAmount === 'number' ? well.slowAmount : 0.4;
            maxSlowFactor = Math.max(maxSlowFactor, slowAmount * intensity);
        }

        if (!affected) {
            return;
        }

        const accelScale = deltaTime;
        this.velocity.x += totalPullX * accelScale;
        this.velocity.y += totalPullY * accelScale;
        this.velocitySmoothing.x += totalPullX * (accelScale * 0.5);
        this.velocitySmoothing.y += totalPullY * (accelScale * 0.5);

        if (maxSlowFactor > 0) {
            const clampSlow = Math.min(0.85, maxSlowFactor);
            const slowMultiplier = Math.max(0.2, 1 - clampSlow);
            this.speed *= slowMultiplier;
            this.velocity.x *= slowMultiplier;
            this.velocity.y *= slowMultiplier;
            this.velocitySmoothing.x *= slowMultiplier;
            this.velocitySmoothing.y *= slowMultiplier;
        }
    }
    
    /**
     * Apply circular movement pattern - enhanced smoothing
     */
    applyCircularPattern(baseDirection, deltaTime) {
        // Initialize pattern data if needed
        if (!this.patternData.circularAngle) {
            this.patternData.circularAngle = this._randomAngle();
            this.patternData.circularRadius = this._randomRange(30, 60); // Reduced for stability
            this.patternData.circularSpeed = this._randomRange(0.8, 2.0); // Slower for smoother movement
            this.patternData.lastCircularX = 0;
            this.patternData.lastCircularY = 0;
        }

        // Update circular angle with smoother progression
        this.patternData.circularAngle = MovementPatternCache.normalizeAngle(
            this.patternData.circularAngle + this.patternData.circularSpeed * deltaTime
        );

        // Calculate circular offset with reduced magnitude
        const circularTrig = MovementPatternCache.sincos(this.patternData.circularAngle);
        const targetOffsetX = circularTrig.cos * this.patternData.circularRadius * 0.2;
        const targetOffsetY = circularTrig.sin * this.patternData.circularRadius * 0.2;

        // Apply smoothing to circular offsets to reduce sudden direction changes
        const circularSmoothing = 0.8;
        this.patternData.lastCircularX = this.patternData.lastCircularX * circularSmoothing + targetOffsetX * (1 - circularSmoothing);
        this.patternData.lastCircularY = this.patternData.lastCircularY * circularSmoothing + targetOffsetY * (1 - circularSmoothing);

        // Combine with base direction using smoother integration
        return {
            x: baseDirection.x + this.patternData.lastCircularX * deltaTime * 2,
            y: baseDirection.y + this.patternData.lastCircularY * deltaTime * 2
        };
    }
    
    /**
     * Apply zigzag movement pattern - enhanced smoothing
     */
    applyZigzagPattern(baseDirection, deltaTime) {
        // Initialize pattern data if needed
        if (!this.patternData.zigzagPhase) {
            this.patternData.zigzagPhase = this._randomAngle(); // Random start phase
            this.patternData.zigzagFrequency = this._randomRange(1.2, 2.7); // Further reduced for stability
            this.patternData.zigzagAmplitude = this._randomRange(0.2, 0.4); // Reduced amplitude for less jitter
            this.patternData.lastZigzagValue = 0; // Track last value for smoothing
            this.patternData.velocitySmoothing = 0; // Additional velocity smoothing
        }

        // Update zigzag phase with frame rate compensation
        this.patternData.zigzagPhase = MovementPatternCache.normalizeAngle(
            this.patternData.zigzagPhase + this.patternData.zigzagFrequency * deltaTime
        );

        // Calculate perpendicular direction for zigzag
        const perpX = -baseDirection.y;
        const perpY = baseDirection.x;

        // Apply zigzag offset with enhanced smoothing to reduce jitter
        const targetZigzagOffset = MovementPatternCache.sin(this.patternData.zigzagPhase) * this.patternData.zigzagAmplitude;

        // Multiple stages of smoothing for ultra-smooth movement
        const smoothingFactor = 0.8; // Stronger smoothing
        this.patternData.lastZigzagValue = this.patternData.lastZigzagValue * smoothingFactor + targetZigzagOffset * (1 - smoothingFactor);

        // Additional velocity-based smoothing
        const velocityChange = targetZigzagOffset - this.patternData.velocitySmoothing;
        this.patternData.velocitySmoothing += velocityChange * 0.3; // Smooth velocity changes

        const finalOffset = this.patternData.velocitySmoothing;

        return {
            x: baseDirection.x + perpX * finalOffset,
            y: baseDirection.y + perpY * finalOffset
        };
    }
    
    /**
     * Apply random movement pattern
     */
    applyRandomPattern(baseDirection, deltaTime) {
        // Change direction randomly
        if (this.patternTimer > this._randomRange(1.0, 3.0)) {
            this.patternTimer = 0;
            
            this.patternData.randomDirection = MovementPatternCache.sampleUnitVector();
        }
        
        // Blend random direction with base direction
        if (this.patternData.randomDirection) {
            const blendFactor = 0.3;
            return {
                x: baseDirection.x * (1 - blendFactor) + this.patternData.randomDirection.x * blendFactor,
                y: baseDirection.y * (1 - blendFactor) + this.patternData.randomDirection.y * blendFactor
            };
        }
        
        return baseDirection;
    }
    
    /**
     * Apply orbital movement pattern (for enemies that orbit around player)
     */
    applyOrbitalPattern(baseDirection, deltaTime, game) {
        if (!game.player) return baseDirection;
        
        // Initialize orbital data
        if (!this.patternData.orbitalAngle) {
            this.patternData.orbitalAngle = this._randomAngle();
            this.patternData.orbitalRadius = this._randomRange(150, 250);
            this.patternData.orbitalSpeed = this._randomRange(0.5, 1.5);
        }

        // Update orbital angle
        this.patternData.orbitalAngle = MovementPatternCache.normalizeAngle(
            this.patternData.orbitalAngle + this.patternData.orbitalSpeed * deltaTime
        );

        // Calculate target orbital position
        const orbitalTrig = MovementPatternCache.sincos(this.patternData.orbitalAngle);
        const targetX = game.player.x + orbitalTrig.cos * this.patternData.orbitalRadius;
        const targetY = game.player.y + orbitalTrig.sin * this.patternData.orbitalRadius;
        
        // Calculate direction to orbital position
        const dx = targetX - this.enemy.x;
        const dy = targetY - this.enemy.y;
        const distance = MovementPatternCache.fastMagnitude(dx, dy);
        
        if (distance > 0.001) {  // Add small epsilon to prevent division by very small numbers
            return {
                x: dx / distance,
                y: dy / distance
            };
        }
        
        return baseDirection;
    }
    
    /**
     * Update physics simulation - enhanced smoothing
     */
    updatePhysics(deltaTime) {
        // If in formation, skip standard steering acceleration
        // The FormationManager applies its own forces
        if (this.enemy.formationId) {
            // Apply simple damping (friction)
            const dampingFactor = Math.pow(this.friction, deltaTime);
            this.velocity.x *= dampingFactor;
            this.velocity.y *= dampingFactor;

            // Apply velocity smoothing
            this.velocitySmoothing.x = this.velocitySmoothing.x * this.smoothingFactor + this.velocity.x * (1 - this.smoothingFactor);
            this.velocitySmoothing.y = this.velocitySmoothing.y * this.smoothingFactor + this.velocity.y * (1 - this.smoothingFactor);
            
            return;
        }

        // Calculate desired velocity
        const currentDir = this.currentDirection || { x: 0, y: 0 };

        // Add deadzone to prevent micro-movements that cause jitter
        const dirMagnitudeSquared = currentDir.x * currentDir.x + currentDir.y * currentDir.y;
        const activeDeadzone = this.collidedThisFrame ? 0.0004 : 0.0001;
        if (dirMagnitudeSquared < activeDeadzone) {
            currentDir.x = 0;
            currentDir.y = 0;
        }

        const desiredVelocity = {
            x: currentDir.x * this.speed,
            y: currentDir.y * this.speed
        };

        // Enhanced acceleration with adaptive damping based on collision state
        const baseAcceleration = this.acceleration * deltaTime;
        const adaptiveAcceleration = this.collidedThisFrame ? baseAcceleration * 0.7 : baseAcceleration;

        const accelX = (desiredVelocity.x - this.velocity.x) * adaptiveAcceleration;
        const accelY = (desiredVelocity.y - this.velocity.y) * adaptiveAcceleration;

        this.velocity.x += accelX;
        this.velocity.y += accelY;

        // Enhanced damping system
        let dampingFactor = this.friction;

        if (currentDir.x === 0 && currentDir.y === 0) {
            // Stronger friction when not moving
            dampingFactor = Math.max(this.friction, 0.8);
        } else if (this.collidedThisFrame) {
            // Extra damping when colliding to prevent jitter
            dampingFactor = 0.85;
        } else {
            // Normal damping with slight reduction for smoother movement
            dampingFactor = 0.92;
        }

        this.velocity.x *= Math.pow(dampingFactor, deltaTime);
        this.velocity.y *= Math.pow(dampingFactor, deltaTime);

        // Apply velocity smoothing for ultra-stable movement
        this.velocitySmoothing.x = this.velocitySmoothing.x * this.smoothingFactor + this.velocity.x * (1 - this.smoothingFactor);
        this.velocitySmoothing.y = this.velocitySmoothing.y * this.smoothingFactor + this.velocity.y * (1 - this.smoothingFactor);

        // Use smoothed velocity for final calculations
        const smoothedVelocity = {
            x: this.velocitySmoothing.x,
            y: this.velocitySmoothing.y
        };

        // Velocity clamping with improved calculation using smoothed values
        const maxVelocity = this.speed * 1.3; // Reduced overshoot for stability
        const currentSpeedSquared = smoothedVelocity.x * smoothedVelocity.x + smoothedVelocity.y * smoothedVelocity.y;
        const maxVelocitySquared = maxVelocity * maxVelocity;

        if (currentSpeedSquared > maxVelocitySquared) {
            const scale = maxVelocity / MovementPatternCache.fastSqrt(currentSpeedSquared);
            smoothedVelocity.x *= scale;
            smoothedVelocity.y *= scale;
            // Update both smoothed and actual velocity
            this.velocitySmoothing.x = smoothedVelocity.x;
            this.velocitySmoothing.y = smoothedVelocity.y;
            this.velocity.x = smoothedVelocity.x;
            this.velocity.y = smoothedVelocity.y;
        } else {
            // Apply smoothed velocity back to actual velocity
            this.velocity.x = smoothedVelocity.x;
            this.velocity.y = smoothedVelocity.y;
        }

        // Enhanced deadzone with hysteresis to prevent flickering
        const deadzone = this.collidedThisFrame ? 1.2 : 0.8;
        if (Math.abs(this.velocity.x) < deadzone) {
            this.velocity.x = 0;
            this.velocitySmoothing.x = 0;
        }
        if (Math.abs(this.velocity.y) < deadzone) {
            this.velocity.y = 0;
            this.velocitySmoothing.y = 0;
        }
    }
    
    /**
     * Update position based on velocity - improved integration
     */
    updatePosition(deltaTime) {
        // Store position before movement for movement detection
        const prevX = this.enemy.x;
        const prevY = this.enemy.y;

        // Apply velocity to position with clamping to prevent extreme movements
        const maxMovement = 500 * deltaTime; // Limit to reasonable movement per frame
        const deltaX = Math.max(-maxMovement, Math.min(maxMovement, this.velocity.x * deltaTime));
        const deltaY = Math.max(-maxMovement, Math.min(maxMovement, this.velocity.y * deltaTime));

        this.enemy.x += deltaX;
        this.enemy.y += deltaY;

        // Apply knockback if active (separate from normal movement)
        if (this.isKnockback) {
            const knockbackDeltaX = this.knockbackVelocity.x * deltaTime;
            const knockbackDeltaY = this.knockbackVelocity.y * deltaTime;

            this.enemy.x += knockbackDeltaX;
            this.enemy.y += knockbackDeltaY;

            // Reduce knockback over time with smoother decay
            const decay = Math.pow(0.05, deltaTime);
            this.knockbackVelocity.x *= decay;
            this.knockbackVelocity.y *= decay;

            // Stop knockback when velocity is very small
            if (Math.abs(this.knockbackVelocity.x) < 1 && Math.abs(this.knockbackVelocity.y) < 1) {
                this.knockbackVelocity.x = 0;
                this.knockbackVelocity.y = 0;
                this.isKnockback = false;
            }
        }

        // Update movement state using squared distance
        const dx = this.enemy.x - prevX;
        const dy = this.enemy.y - prevY;
        const distanceMovedSquared = dx * dx + dy * dy;

        this.isMoving = distanceMovedSquared > 1; // Moving if moved more than 1 pixel
    }
    
    /**
     * Handle collision detection with other entities - improved stability
     */
    handleCollisions(deltaTime, game) {
        // Gradual cooldown reduction for smoother behavior
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
            // Still reset collision flag even during cooldown
            this.collidedThisFrame = false;
            return;
        }

        // Reset collision flag
        this.collidedThisFrame = false;

        // [FIX] Skip collision handling for constellation members - they're positioned by formation forces
        // and atomic forces already provide the necessary separation
        if (this.enemy.constellation) {
            return;
        }

        // Only check collisions if we have a reasonable number of enemies to avoid performance issues
        const enemies = game?.getEnemies?.() ?? game?.enemies ?? [];
        if (enemies.length < 200 && this.enemy.canAvoidOthers !== false) {
            this.handleEnemyCollisions(enemies);
        }

        // Check collisions with obstacles (if any)
        if (game.obstacles && game.obstacles.length > 0) {
            this.handleObstacleCollisions(game.obstacles);
        }
    }
    
    /**
     * Handle collisions with other enemies - minimal intervention system
     * [FIX] Now only handles deep overlap emergencies - atomic forces do the rest
     * This prevents the collision system from fighting with atomic physics
     */
    handleEnemyCollisions(enemies) {
        const myRadius = this.collisionRadius || 15;
        
        // Only process a limited number of neighbors to prevent O(n²) explosion
        let processedCount = 0;
        const maxProcess = 8;

        for (const other of enemies) {
            if (other === this.enemy || other.isDead) continue;
            if (processedCount >= maxProcess) break;

            const dx = other.x - this.enemy.x;
            const dy = other.y - this.enemy.y;
            const distanceSquared = dx * dx + dy * dy;
            const otherRadius = other.radius || 15;
            const minDistance = myRadius + otherRadius;
            
            // [FIX] Only intervene for DEEP overlaps (< 60% of minDistance)
            // Atomic forces handle everything else
            const emergencyThreshold = minDistance * 0.6;
            const emergencyThresholdSq = emergencyThreshold * emergencyThreshold;

            if (distanceSquared < emergencyThresholdSq && distanceSquared > 0.01) {
                const distance = MovementPatternCache.fastSqrt(distanceSquared);
                const overlap = minDistance - distance;
                
                // Calculate emergency pushout direction
                const invDist = 1 / distance;
                const dirX = -dx * invDist;
                const dirY = -dy * invDist;

                // [FIX] Minimal position correction - just enough to prevent total overlap
                // Cap the pushout to prevent jitter
                const pushAmount = Math.min(overlap * 0.25, 4);
                this.enemy.x += dirX * pushAmount;
                this.enemy.y += dirY * pushAmount;

                // [FIX] Only apply velocity change if moving INTO the collision
                const velDot = this.velocity.x * (-dirX) + this.velocity.y * (-dirY);
                if (velDot > 0) {
                    // Reduce velocity component moving into collision
                    this.velocity.x -= (-dirX) * velDot * 0.4;
                    this.velocity.y -= (-dirY) * velDot * 0.4;
                }

                processedCount++;
            }
        }

        // Only set collision flag if we actually processed emergencies
        if (processedCount > 0) {
            this.collidedThisFrame = true;
            this.collisionCooldown = 0.08; // Short cooldown
            this.lastCollisionTime = performance.now();
        }
    }
    
    /**
     * Handle collisions with obstacles
     */
    handleObstacleCollisions(obstacles) {
        // Implementation for obstacle collision detection
        // This would be used if the game has environmental obstacles
        for (const obstacle of obstacles) {
            if (this.isCollidingWithObstacle(obstacle)) {
                this.handleObstacleCollision(obstacle);
                break;
            }
        }
    }
    
    /**
     * Apply knockback effect
     */
    applyKnockback(forceX, forceY, duration = 0.3) {
        this.isKnockback = true;
        this.knockbackVelocity.x = forceX;
        this.knockbackVelocity.y = forceY;
        this.knockbackTimer = duration;
        this.knockbackDuration = duration;
    }
    
    /**
     * Update knockback physics
     */
    updateKnockback(deltaTime) {
        // Knockback is handled in updatePosition
        // This method can be used for additional knockback logic
    }
    
    /**
     * Keep enemy within canvas boundaries
     */
    constrainToCanvas(game) {
        if (!game.canvas) return;
        
        const margin = this.canvasMargin;
        const radius = this.enemy.radius || 15;
        
        // Left boundary
        if (this.enemy.x - radius < margin) {
            this.enemy.x = margin + radius;
            this.velocity.x = Math.max(0, this.velocity.x); // Stop leftward movement
        }
        
        // Right boundary
        if (this.enemy.x + radius > game.canvas.width - margin) {
            this.enemy.x = game.canvas.width - margin - radius;
            this.velocity.x = Math.min(0, this.velocity.x); // Stop rightward movement
        }
        
        // Top boundary
        if (this.enemy.y - radius < margin) {
            this.enemy.y = margin + radius;
            this.velocity.y = Math.max(0, this.velocity.y); // Stop upward movement
        }
        
        // Bottom boundary
        if (this.enemy.y + radius > game.canvas.height - margin) {
            this.enemy.y = game.canvas.height - margin - radius;
            this.velocity.y = Math.min(0, this.velocity.y); // Stop downward movement
        }
    }
    
    /**
     * Check if enemy is stuck and apply unstuck logic - optimized
     */
    checkStuckState(deltaTime) {
        const dx = this.enemy.x - this.lastPosition.x;
        const dy = this.enemy.y - this.lastPosition.y;
        const distanceMovedSquared = dx * dx + dy * dy;

        // Use squared distance to avoid sqrt call
        if (distanceMovedSquared < 1 && this.isMoving) {
            // Enemy is trying to move but not making progress
            this.stuckTimer += deltaTime;

            if (this.stuckTimer >= this.stuckThreshold) {
                // Apply unstuck logic
                this.handleStuckState();
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
    }
    
    /**
     * Handle when enemy gets stuck
     */
    handleStuckState() {
        // [FIX] Skip unstuck logic for constellation members - they're positioned by formation forces
        if (this.enemy.constellation) {
            this.stuckTimer = 0;
            return;
        }
        
        // Apply gentle random impulse to unstuck the enemy
        const angle = this._randomAngle();
        const force = this._randomRange(50, 75); // Much gentler force
        const trig = MovementPatternCache.sincos(angle);
        
        this.velocity.x += trig.cos * force;
        this.velocity.y += trig.sin * force;
        
        // Temporarily change movement pattern using a timer instead of setTimeout
        this.tempPatternTimer = 2.0; // 2 seconds
        this.originalPattern = this.movementPattern;
        this.movementPattern = 'random';
    }
    
    /**
     * Set movement pattern
     */
    setMovementPattern(pattern) {
        if (this.movementPattern !== pattern) {
            this.movementPattern = pattern;
            this.patternTimer = 0;
            this.patternData = {}; // Reset pattern data
        }
    }
    
    /**
     * Configure movement for specific enemy type
     */
    configureForEnemyType(enemyType) {
        switch (enemyType) {
            case 'basic':
                this.speed = 100;
                this.movementPattern = 'direct';
                this.acceleration = 500;
                break;
            case 'fast':
                this.speed = 180;
                this.movementPattern = 'zigzag';
                this.acceleration = 400; // Reduced from 800 to prevent jitter with zigzag
                this.friction = 0.85; // Lower friction for more responsive but stable movement
                break;
            case 'tank':
                this.speed = 60;
                this.movementPattern = 'direct';
                this.acceleration = 300;
                this.collisionRadius = 25;
                break;
            case 'ranged':
                this.speed = 70;
                this.movementPattern = 'circular';
                this.acceleration = 400;
                break;
            case 'dasher':
                this.speed = 120;
                this.movementPattern = 'direct';
                this.acceleration = 600;
                break;
            case 'phantom':
                this.speed = 110;
                this.movementPattern = 'random';
                this.acceleration = 700;
                break;
            case 'boss':
                this.speed = 80;
                this.movementPattern = 'orbital';
                this.acceleration = 400;
                this.collisionRadius = 30;
                break;
        }
        
        // Store base speed for reference
        this.enemy.baseSpeed = this.speed;
    }
    
    /**
     * Get current movement state for debugging/UI
     */
    getMovementState() {
        return {
            isMoving: this.isMoving,
            speed: this.speed,
            velocity: { ...this.velocity },
            movementPattern: this.movementPattern,
            isKnockback: this.isKnockback,
            collidedThisFrame: this.collidedThisFrame,
            stuckTimer: this.stuckTimer
        };
    }
}

/**
 * Apply atomic lattice forces (Molecular Dynamics)
 * Uses Lennard-Jones-like potential for stable, crystal-like spacing
 * Prevents overlap (Pauli exclusion) and creates geometric bonds
 * 
 * Force Coordination Notes:
 * - Free enemies: Full repulsion + attraction for emergent lattice formation
 * - Constellation members: Repulsion + weak cohesion (constellation forces do main positioning)
 * - Formation members: Repulsion + weak cohesion (formation forces do main positioning)
 * 
 * This function complements:
 * - EmergentFormationDetector.applyConstellationForces() - positions constellation members
 * - FormationManager.updateEnemyPositions() - positions formation members
 * - EnemyAI.calculateAvoidance() - skip for constellation members to reduce redundancy
 * 
 * [FIX] Improved grid search radius to handle adaptive grid sizes
 * [FIX] Added bonding for constellation members (weaker) to maintain cohesion
 * [FIX] Better damping for smoother emergent behavior
 */
EnemyMovement.prototype.applyAtomicForces = function(deltaTime, game) {
    // Only apply if spatial grid is available and enemy is active
    if (!game.spatialGrid || !game.gridSize || !this.enemy || this.enemy.isDead) return;

    // Skip if performance mode is critical (save CPU)
    if (game.performanceMode && game.performanceManager?.performanceMode === 'critical') return;

    const isInConstellation = !!this.enemy.constellation;
    const isInFormation = !!this.enemy.formationId;

    // Atomic parameters - tuned for visual cohesion and emergent shapes
    const myRadius = this.enemy.radius || 15;
    
    // [FIX] Equilibrium multiplier determines natural spacing between enemies
    // Higher values = more spacing, preventing clumping
    // Constellation members need MORE spacing to form visible geometric patterns
    let equilibriumMultiplier;
    if (isInConstellation) {
        const constellationObj = typeof this.enemy.constellation === 'object' 
            ? this.enemy.constellation 
            : null;
        const age = constellationObj?.age || 0;
        // Smoothly transition from 2.5 to 3.2 over 2 seconds for gradual formation
        const t = Math.min(age / 2.0, 1.0);
        equilibriumMultiplier = 2.5 + (3.2 - 2.5) * t;
    } else if (isInFormation) {
        // Formation members also need spacing to maintain shape
        equilibriumMultiplier = 2.8;
    } else {
        // Free enemies use tighter spacing for natural clustering
        equilibriumMultiplier = 2.2;
    }

    const atomicRadius = myRadius * equilibriumMultiplier; // Equilibrium distance (~33-48px)
    // [FIX] Extended interaction radius to ensure forces apply across formation patterns
    // Must exceed constellation detection radius (130px) significantly
    const interactionRadius = atomicRadius * 3.5; // Increased from 3.0 to cover larger patterns
    const interactionRadiusSq = interactionRadius * interactionRadius;
    
    // Force constants - balanced for emergent behavior without fighting formation forces
    // [FIX] Reduced repulsion slightly to prevent oscillation with constellation forces
    const repulsionStrength = isInConstellation ? 900 : 1100; // Softer for grouped enemies
    const bondStrength = isInConstellation ? 25 : 45; // Weaker bonding in constellations (let constellation forces lead)
    const constellationCohesion = 30; // Reduced - constellation forces handle main cohesion
    const dampingFactor = isInConstellation ? 10.0 : 7.0; // More damping in groups for stability

    // Calculate grid position
    const gridX = Math.floor(this.enemy.x / game.gridSize);
    const gridY = Math.floor(this.enemy.y / game.gridSize);

    // [PERF FIX] Cache grid key encoder reference to avoid 9 property lookups per frame
    const encodeGridKey = game._encodeGridKey;
    if (!encodeGridKey) return; // Early exit if no encoder

    // [FIX] Calculate search radius based on interaction distance and grid size
    // Need to search enough cells to cover the full interaction radius
    // Use ceiling to ensure we never miss neighbors at the edge
    const cellsToSearch = Math.ceil(interactionRadius / game.gridSize);
    const searchRange = Math.max(1, Math.min(cellsToSearch, 3)); // Clamp to 1-3 for performance (was 2, increased to handle larger formations)

    // Check cells within search range
    for (let x = -searchRange; x <= searchRange; x++) {
        for (let y = -searchRange; y <= searchRange; y++) {
            const key = encodeGridKey(gridX + x, gridY + y);
            if (key === null) continue;

            const cell = game.spatialGrid.get(key);
            if (!cell) continue;

            for (let i = 0; i < cell.length; i++) {
                const other = cell[i];
                
                // Skip self, dead, or non-enemies
                if (other === this.enemy || other.isDead || other.type !== 'enemy') continue;

                const dx = this.enemy.x - other.x;
                const dy = this.enemy.y - other.y;
                const distSq = dx * dx + dy * dy;

                // Only interact within cutoff radius
                if (distSq < interactionRadiusSq && distSq > 0.1) {
                    const dist = Math.sqrt(distSq);
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    
                    // Use average radius for interaction calculations
                    const otherRadius = other.radius || 15;
                    const avgRadius = (myRadius + otherRadius) / 2;
                    
                    // [FIX] Dynamic atomic radius based on relationship
                    // Same-group members have minimal atomic radius - just prevent overlap
                    // Let constellation/formation forces handle the actual spacing
                    const sameConstellation = isInConstellation && other.constellation === this.enemy.constellation;
                    const sameFormation = isInFormation && other.formationId === this.enemy.formationId;
                    const isSameGroup = sameConstellation || sameFormation;

                    let effectiveAtomicRadius;
                    if (isSameGroup) {
                        // [FIX] Minimal atomic radius for same-group - just prevent physical overlap
                        // This gives constellation forces full authority over positioning
                        // Enemies can get close (touching) without atomic repulsion fighting the shape
                        effectiveAtomicRadius = (myRadius + otherRadius) * 1.1; // Reduced from 1.6
                    } else {
                        // For enemies not in the same group, maintain full atomic spacing
                        effectiveAtomicRadius = avgRadius * equilibriumMultiplier;
                    }
                    
                    // Lennard-Jones Potential Derivative (Force)
                    let force = 0;
                    
                    if (dist < effectiveAtomicRadius) {
                        // Strong repulsion (1/r^2 falloff approximation)
                        const overlap = effectiveAtomicRadius - dist;
                        // Exponential ramp up for very close encounters (Hard Shell)
                        const hardness = 1 + (overlap / effectiveAtomicRadius) * 2;
                        force = repulsionStrength * (overlap / effectiveAtomicRadius) * hardness;

                        // Direct Position Correction (prevent stacking)
                        // Move away immediately if too close - critical for preventing overlap
                        const minSeparation = myRadius + otherRadius;
                        if (dist < minSeparation) {
                            // [FIX] Smoother pushout with clamped maximum to prevent jitter
                            const overlapAmount = minSeparation - dist;
                            const pushOut = Math.min(overlapAmount * 0.35, 8); // Cap at 8px per frame
                            this.enemy.x += dirX * pushOut;
                            this.enemy.y += dirY * pushOut;
                            
                            // Kill velocity component towards the other enemy
                            // This prevents them from fighting the pushout
                            const velDot = this.velocity.x * dirX + this.velocity.y * dirY;
                            if (velDot < 0) { // Moving towards other
                                // [FIX] Softer velocity dampening to avoid sudden stops
                                this.velocity.x -= dirX * velDot * 0.6;
                                this.velocity.y -= dirY * velDot * 0.6;
                            }
                        }
                    } else {
                        // Attraction zone - different behavior based on context
                        const stretch = dist - effectiveAtomicRadius;
                        const normalizedStretch = stretch / effectiveAtomicRadius;
                        
                        if (isInConstellation || isInFormation) {
                            if (isSameGroup) {
                                // [FIX] Add light cohesion for same-group members when they drift too far
                                // This provides a safety net when constellation forces alone aren't enough
                                // Only kicks in at significant stretch (> 0.8 equilibrium distances away)
                                if (normalizedStretch > 0.8) {
                                    // Gentle cohesion that ramps up with distance
                                    const cohesionRamp = Math.min((normalizedStretch - 0.8) * 2.0, 1.5);
                                    force = -constellationCohesion * 0.4 * cohesionRamp;
                                } else {
                                    force = 0;
                                }
                            } else {
                                // Different groups - apply weaker bond to prevent complete separation
                                if (normalizedStretch > 0.5) {
                                    force = -bondStrength * 0.3 * normalizedStretch;
                                }
                            }
                        } else {
                            // Free atoms get normal bonding to form emergent lattices
                            force = -bondStrength * normalizedStretch;
                        }
                    }

                    // Apply force
                    if (Math.abs(force) > 0.01) {
                        const accelX = dirX * force * deltaTime;
                        const accelY = dirY * force * deltaTime;

                        this.velocity.x += accelX;
                        this.velocity.y += accelY;
                    }

                    // Apply damping based on relative velocity (friction)
                    // This kills oscillation and helps enemies settle into stable positions
                    const otherVelX = other.movement?.velocity?.x || 0;
                    const otherVelY = other.movement?.velocity?.y || 0;
                    const relVelX = this.velocity.x - otherVelX;
                    const relVelY = this.velocity.y - otherVelY;
                    
                    // Project relative velocity onto direction vector
                    const relVelDot = relVelX * dirX + relVelY * dirY;
                    
                    // [FIX] Only apply damping if enemies are approaching each other
                    // or if they're very close (settling phase)
                    const isApproaching = relVelDot < 0;
                    const isSettling = dist < effectiveAtomicRadius * 1.5;
                    
                    if ((isApproaching || isSettling) && Math.abs(relVelDot) > 0.05) {
                        // [FIX] Smoother damping curve based on distance
                        const dampScale = dampingFactor * deltaTime;
                        // More aggressive damping when very close, gentler at distance
                        const normalizedDist = dist / effectiveAtomicRadius;
                        const distanceFactor = normalizedDist < 1.0 
                            ? 1.0  // Full damping when overlapping
                            : Math.max(0.3, 1.0 - (normalizedDist - 1.0) * 0.4); // Gradual falloff
                        
                        const dampX = dirX * relVelDot * dampScale * distanceFactor;
                        const dampY = dirY * relVelDot * dampScale * distanceFactor;
                        
                        this.velocity.x -= dampX;
                        this.velocity.y -= dampY;
                    }
                }
            }
        }
    }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemyMovement = EnemyMovement;
}

// [PERF] Initialize random table at module load time instead of first enemy spawn
// This moves the 4096 Math.random() calls from gameplay to page load
(function initRandomTable() {
    const TABLE_SIZE = 4096;
    EnemyMovement._randomTableCache = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
        EnemyMovement._randomTableCache[i] = Math.random();
    }
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnemyMovement;
}

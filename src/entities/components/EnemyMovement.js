/**
 * EnemyMovement Component
 * 🤖 RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all movement patterns, physics, collision detection, and pathfinding
 */

class EnemyMovement {
    constructor(enemy) {
        this.enemy = enemy;
        
        // Movement properties - optimized for smooth movement
        this.speed = 100;
        this.velocity = { x: 0, y: 0 };
        this.currentDirection = { x: 0, y: 0 }; // Current movement direction (calculated from AI input)
        this.acceleration = 250; // Further reduced for stability
        this.friction = 0.92; // Balanced friction for smooth movement

        // Anti-jitter properties
        this.velocitySmoothing = { x: 0, y: 0 }; // Smoothed velocity for ultra-stable movement
        this.smoothingFactor = 0.85; // How much to smooth velocity changes
        
        // Movement patterns
        this.movementPattern = 'direct'; // direct, circular, zigzag, random
        this.patternTimer = Math.random() * 2.0; // Randomize initial timer to desync movement patterns
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
        
        // Update target direction with increased smoothing to reduce jitter
        const smoothingFactor = 0.95; // Much higher smoothing for stability

        // Add stability check - only update if change is significant
        const directionChange = Math.sqrt(
            Math.pow(baseDirection.x - this.currentDirection.x, 2) +
            Math.pow(baseDirection.y - this.currentDirection.y, 2)
        );

        // Only apply direction changes if they're significant enough (reduces micro-jitters)
        if (directionChange > 0.05) {
            if (this.currentDirection.x !== 0 || this.currentDirection.y !== 0) {
                // Smooth the direction change
                this.currentDirection.x = this.currentDirection.x * smoothingFactor + baseDirection.x * (1 - smoothingFactor);
                this.currentDirection.y = this.currentDirection.y * smoothingFactor + baseDirection.y * (1 - smoothingFactor);
            } else {
                // First time setting direction
                this.currentDirection = { x: baseDirection.x, y: baseDirection.y };
            }
        }
    }
    
    /**
     * Apply circular movement pattern - enhanced smoothing
     */
    applyCircularPattern(baseDirection, deltaTime) {
        // Initialize pattern data if needed
        if (!this.patternData.circularAngle) {
            this.patternData.circularAngle = Math.random() * Math.PI * 2;
            this.patternData.circularRadius = 30 + Math.random() * 30; // Reduced for stability
            this.patternData.circularSpeed = 0.8 + Math.random() * 1.2; // Slower for smoother movement
            this.patternData.lastCircularX = 0;
            this.patternData.lastCircularY = 0;
        }

        // Update circular angle with smoother progression
        this.patternData.circularAngle += this.patternData.circularSpeed * deltaTime;

        // Calculate circular offset with reduced magnitude
        const targetOffsetX = Math.cos(this.patternData.circularAngle) * this.patternData.circularRadius * 0.2;
        const targetOffsetY = Math.sin(this.patternData.circularAngle) * this.patternData.circularRadius * 0.2;

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
            this.patternData.zigzagPhase = Math.random() * Math.PI * 2; // Random start phase
            this.patternData.zigzagFrequency = 1.2 + Math.random() * 1.5; // Further reduced for stability
            this.patternData.zigzagAmplitude = 0.2 + Math.random() * 0.2; // Reduced amplitude for less jitter
            this.patternData.lastZigzagValue = 0; // Track last value for smoothing
            this.patternData.velocitySmoothing = 0; // Additional velocity smoothing
        }

        // Update zigzag phase with frame rate compensation
        this.patternData.zigzagPhase += this.patternData.zigzagFrequency * deltaTime;

        // Calculate perpendicular direction for zigzag
        const perpX = -baseDirection.y;
        const perpY = baseDirection.x;

        // Apply zigzag offset with enhanced smoothing to reduce jitter
        const targetZigzagOffset = Math.sin(this.patternData.zigzagPhase) * this.patternData.zigzagAmplitude;

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
        if (this.patternTimer > 1.0 + Math.random() * 2.0) {
            this.patternTimer = 0;
            
            const randomAngle = Math.random() * Math.PI * 2;
            this.patternData.randomDirection = {
                x: Math.cos(randomAngle),
                y: Math.sin(randomAngle)
            };
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
            this.patternData.orbitalAngle = Math.random() * Math.PI * 2;
            this.patternData.orbitalRadius = 150 + Math.random() * 100;
            this.patternData.orbitalSpeed = 0.5 + Math.random() * 1.0;
        }
        
        // Update orbital angle
        this.patternData.orbitalAngle += this.patternData.orbitalSpeed * deltaTime;
        
        // Calculate target orbital position
        const targetX = game.player.x + Math.cos(this.patternData.orbitalAngle) * this.patternData.orbitalRadius;
        const targetY = game.player.y + Math.sin(this.patternData.orbitalAngle) * this.patternData.orbitalRadius;
        
        // Calculate direction to orbital position
        const dx = targetX - this.enemy.x;
        const dy = targetY - this.enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
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
        // Calculate desired velocity
        const currentDir = this.currentDirection || { x: 0, y: 0 };

        // Add deadzone to prevent micro-movements that cause jitter
        const dirMagnitudeSquared = currentDir.x * currentDir.x + currentDir.y * currentDir.y;
        if (dirMagnitudeSquared < 0.01) { // Use squared magnitude to avoid sqrt
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
            const scale = maxVelocity / Math.sqrt(currentSpeedSquared);
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

        // Only check collisions if we have a reasonable number of enemies to avoid performance issues
        if (game.enemies && game.enemies.length < 200 && this.enemy.canAvoidOthers !== false) {
            this.handleEnemyCollisions(game.enemies);
        }

        // Check collisions with obstacles (if any)
        if (game.obstacles && game.obstacles.length > 0) {
            this.handleObstacleCollisions(game.obstacles);
        }
    }
    
    /**
     * Handle collisions with other enemies - improved anti-jitter system
     */
    handleEnemyCollisions(enemies) {
        // Accumulate separation forces from all nearby enemies for smoother resolution
        let totalSeparationX = 0;
        let totalSeparationY = 0;
        let collisionCount = 0;

        for (const other of enemies) {
            if (other === this.enemy || other.isDead) continue;

            const dx = other.x - this.enemy.x;
            const dy = other.y - this.enemy.y;
            const distanceSquared = dx * dx + dy * dy;
            const minDistance = this.collisionRadius + (other.radius || 15);
            const minDistanceSquared = minDistance * minDistance;

            if (distanceSquared < minDistanceSquared && distanceSquared > 0.01) {
                const distance = Math.sqrt(distanceSquared);
                const overlap = minDistance - distance;

                // Use gentler position-based correction instead of velocity-based
                const correctionStrength = Math.min(overlap / minDistance, 1.0) * 0.5;
                const separationX = -(dx / distance) * correctionStrength;
                const separationY = -(dy / distance) * correctionStrength;

                totalSeparationX += separationX;
                totalSeparationY += separationY;
                collisionCount++;
            }
        }

        if (collisionCount > 0) {
            // Apply averaged separation with damping to prevent oscillation
            const avgSeparationX = (totalSeparationX / collisionCount) * 30; // Reduced strength
            const avgSeparationY = (totalSeparationY / collisionCount) * 30;

            // Apply separation to position directly for immediate correction
            this.enemy.x += avgSeparationX * 0.3;
            this.enemy.y += avgSeparationY * 0.3;

            // Apply gentler velocity adjustment with stronger damping
            this.velocity.x += avgSeparationX * 0.2;
            this.velocity.y += avgSeparationY * 0.2;

            // Apply extra damping when colliding to prevent jitter
            this.velocity.x *= 0.85;
            this.velocity.y *= 0.85;

            // Mark collision with longer cooldown
            this.collidedThisFrame = true;
            this.collisionCooldown = 0.15; // Slightly longer to reduce jitter
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
        // Apply gentle random impulse to unstuck the enemy
        const angle = Math.random() * Math.PI * 2;
        const force = 50 + Math.random() * 25; // Much gentler force
        
        this.velocity.x += Math.cos(angle) * force;
        this.velocity.y += Math.sin(angle) * force;
        
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

// Make globally available
if (typeof window !== 'undefined') {
    window.EnemyMovement = EnemyMovement;
}

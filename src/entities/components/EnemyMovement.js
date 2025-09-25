/**
 * EnemyMovement Component
 * 🤖 RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all movement patterns, physics, collision detection, and pathfinding
 */

class EnemyMovement {
    constructor(enemy) {
        this.enemy = enemy;
        
        // Movement properties
        this.speed = 100;
        this.velocity = { x: 0, y: 0 };
        this.currentDirection = { x: 0, y: 0 }; // Current movement direction (calculated from AI input)
        this.acceleration = 300; // Reduced from 500 to reduce jitter
        this.friction = 0.9; // Increased friction for smoother movement
        
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
     * Apply circular movement pattern
     */
    applyCircularPattern(baseDirection, deltaTime) {
        // Initialize pattern data if needed
        if (!this.patternData.circularAngle) {
            this.patternData.circularAngle = Math.random() * Math.PI * 2;
            this.patternData.circularRadius = 50 + Math.random() * 50;
            this.patternData.circularSpeed = 1 + Math.random() * 2;
        }
        
        // Update circular angle
        this.patternData.circularAngle += this.patternData.circularSpeed * deltaTime;
        
        // Calculate circular offset
        const offsetX = Math.cos(this.patternData.circularAngle) * this.patternData.circularRadius * 0.3;
        const offsetY = Math.sin(this.patternData.circularAngle) * this.patternData.circularRadius * 0.3;
        
        // Combine with base direction
        return {
            x: baseDirection.x + offsetX * deltaTime,
            y: baseDirection.y + offsetY * deltaTime
        };
    }
    
    /**
     * Apply zigzag movement pattern
     */
    applyZigzagPattern(baseDirection, deltaTime) {
        // Initialize pattern data if needed
        if (!this.patternData.zigzagPhase) {
            this.patternData.zigzagPhase = Math.random() * Math.PI * 2; // Random start phase
            this.patternData.zigzagFrequency = 1.5 + Math.random() * 2; // Reduced from 2-5 to 1.5-3.5
            this.patternData.zigzagAmplitude = 0.3 + Math.random() * 0.3; // Reduced amplitude
            this.patternData.lastZigzagValue = 0; // Track last value for smoothing
        }

        // Update zigzag phase
        this.patternData.zigzagPhase += this.patternData.zigzagFrequency * deltaTime;

        // Calculate perpendicular direction for zigzag
        const perpX = -baseDirection.y;
        const perpY = baseDirection.x;

        // Apply zigzag offset with smoothing to reduce jitter
        const targetZigzagOffset = Math.sin(this.patternData.zigzagPhase) * this.patternData.zigzagAmplitude;
        const smoothingFactor = 0.7; // Smooth zigzag transitions
        this.patternData.lastZigzagValue = this.patternData.lastZigzagValue * smoothingFactor + targetZigzagOffset * (1 - smoothingFactor);

        return {
            x: baseDirection.x + perpX * this.patternData.lastZigzagValue,
            y: baseDirection.y + perpY * this.patternData.lastZigzagValue
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
     * Update physics simulation
     */
    updatePhysics(deltaTime) {
        // Calculate desired velocity
        const currentDir = this.currentDirection || { x: 0, y: 0 };
        
        // Add deadzone to prevent micro-movements that cause jitter
        const dirMagnitude = Math.sqrt(currentDir.x * currentDir.x + currentDir.y * currentDir.y);
        if (dirMagnitude < 0.1) {
            currentDir.x = 0;
            currentDir.y = 0;
        }
        
        const desiredVelocity = {
            x: currentDir.x * this.speed,
            y: currentDir.y * this.speed
        };
        
        // Apply acceleration towards desired velocity with smoothing
        const accelX = (desiredVelocity.x - this.velocity.x) * this.acceleration * deltaTime;
        const accelY = (desiredVelocity.y - this.velocity.y) * this.acceleration * deltaTime;
        
        this.velocity.x += accelX;
        this.velocity.y += accelY;
        
        // Apply friction when no target direction
        if (currentDir.x === 0 && currentDir.y === 0) {
            this.velocity.x *= Math.pow(this.friction, deltaTime);
            this.velocity.y *= Math.pow(this.friction, deltaTime);
        } else {
            // Apply stronger damping even when moving to reduce jitter accumulation
            const dampingFactor = 0.95; // More aggressive damping
            this.velocity.x *= Math.pow(dampingFactor, deltaTime);
            this.velocity.y *= Math.pow(dampingFactor, deltaTime);
        }

        // Velocity clamping to prevent runaway values that could cause jitter
        const maxVelocity = this.speed * 1.5; // Allow 50% overshoot for responsiveness
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > maxVelocity && currentSpeed > 0.001) {
            const scale = maxVelocity / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }

        // Deadzone to eliminate tiny movements that cause visual jitter
        if (Math.abs(this.velocity.x) < 0.5) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.5) this.velocity.y = 0;
    }
    
    /**
     * Update position based on velocity
     */
    updatePosition(deltaTime) {
        // Apply velocity to position
        this.enemy.x += this.velocity.x * deltaTime;
        this.enemy.y += this.velocity.y * deltaTime;
        
        // Apply knockback if active
        if (this.isKnockback) {
            this.enemy.x += this.knockbackVelocity.x * deltaTime;
            this.enemy.y += this.knockbackVelocity.y * deltaTime;
            
            // Reduce knockback over time
            this.knockbackVelocity.x *= Math.pow(0.1, deltaTime);
            this.knockbackVelocity.y *= Math.pow(0.1, deltaTime);
        }
        
        // Update movement state
        const dx = this.enemy.x - this.lastPosition.x;
        const dy = this.enemy.y - this.lastPosition.y;
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);
        
        this.isMoving = distanceMoved > 1; // Moving if moved more than 1 pixel
    }
    
    /**
     * Handle collision detection with other entities
     */
    handleCollisions(deltaTime, game) {
        if (this.collisionCooldown > 0) return;
        
        // Reset collision flag
        this.collidedThisFrame = false;
        
        // Check collisions with other enemies
        if (game.enemies && this.enemy.canAvoidOthers !== false) {
            this.handleEnemyCollisions(game.enemies);
        }
        
        // Check collisions with obstacles (if any)
        if (game.obstacles) {
            this.handleObstacleCollisions(game.obstacles);
        }
    }
    
    /**
     * Handle collisions with other enemies
     */
    handleEnemyCollisions(enemies) {
        for (const other of enemies) {
            if (other === this.enemy || other.isDead) continue;
            
            const dx = other.x - this.enemy.x;
            const dy = other.y - this.enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.collisionRadius + (other.radius || 15);
            
            if (distance < minDistance && distance > 0) {
                // Calculate separation force
                const separationForce = (minDistance - distance) / minDistance;
                const separationX = -(dx / distance) * separationForce * 100;
                const separationY = -(dy / distance) * separationForce * 100;
                
                // Apply separation
                this.velocity.x += separationX * 0.5;
                this.velocity.y += separationY * 0.5;
                
                // Mark collision
                this.collidedThisFrame = true;
                this.collisionCooldown = 0.1; // Small cooldown to prevent jitter
                this.lastCollisionTime = Date.now();
                
                // Do not apply collision damage between enemies; separation only to reduce chaos
                
                break; // Only handle one collision per frame
            }
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
     * Check if enemy is stuck and apply unstuck logic
     */
    checkStuckState(deltaTime) {
        const dx = this.enemy.x - this.lastPosition.x;
        const dy = this.enemy.y - this.lastPosition.y;
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceMoved < 1 && this.isMoving) {
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

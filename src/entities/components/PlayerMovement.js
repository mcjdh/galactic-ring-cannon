/**
 * PlayerMovement Component
 * 🤖 RESONANT NOTE: Extracted from massive Player.js to improve maintainability
 * Handles all movement, physics, and dodge mechanics
 */

class PlayerMovement {
    constructor(player) {
        this.player = player;
        
        // Movement properties
        this.speed = 220; // Base movement speed
        this.isMoving = false;
        
        // Dodge system properties
        this.canDodge = true;
        this.dodgeCooldown = 2; // seconds
        this.dodgeTimer = 0;
        this.isDodging = false;
        this.dodgeDuration = 0.3; // seconds
        this.dodgeSpeed = 600; // Speed multiplier during dodge
        this.dodgeDirection = { x: 0, y: 0 };
        
        // Trail effect properties for visual feedback
        this.lastTrailPos = { x: this.player.x, y: this.player.y };
        this.trailDistance = 15; // Distance before creating new trail particle
    }
    
    /**
     * Update movement and dodge mechanics
     */
    update(deltaTime, game) {
        this.handleMovement(deltaTime, game);
        this.handleDodge(deltaTime, game);
        this.updateTrailEffect(deltaTime, game);
    }
    
    /**
     * Handle player movement input and physics
     */
    handleMovement(deltaTime, game) {
        let inputX = 0;
        let inputY = 0;
        
        // Get input from InputManager if available, fallback to direct key checking
        if (window.inputManager) {
            const input = window.inputManager.getMovementInput();
            inputX = input.x;
            inputY = input.y;
        } else {
            // Fallback input handling
            const keys = game.keys || {};
            if (keys['KeyW'] || keys['ArrowUp']) inputY -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) inputY += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;
        }
        
        // Normalize diagonal movement
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707; // 1/√2 for normalized diagonal movement
            inputY *= 0.707;
        }
        
        // Determine if player is moving
        this.isMoving = (inputX !== 0 || inputY !== 0);
        
        // Apply movement with speed modifier
        const currentSpeed = this.isDodging ? this.dodgeSpeed : this.speed;
        
        if (this.isDodging) {
            // During dodge, use stored dodge direction
            this.player.x += this.dodgeDirection.x * currentSpeed * deltaTime;
            this.player.y += this.dodgeDirection.y * currentSpeed * deltaTime;
        } else {
            // Normal movement
            this.player.x += inputX * currentSpeed * deltaTime;
            this.player.y += inputY * currentSpeed * deltaTime;
        }
        
        // Keep player within canvas bounds
        this.constrainToCanvas(game);
    }
    
    /**
     * Handle dodge ability mechanics
     */
    handleDodge(deltaTime, game) {
        // Update dodge timer
        if (this.dodgeTimer > 0) {
            this.dodgeTimer -= deltaTime;
            if (this.dodgeTimer <= 0) {
                this.canDodge = true;
            }
        }
        
        // Handle active dodge
        if (this.isDodging) {
            this.dodgeDuration -= deltaTime;
            if (this.dodgeDuration <= 0) {
                this.endDodge();
            }
        }
        
        // Check for dodge input
        if (this.canDodge && !this.isDodging) {
            let shouldDodge = false;
            
            // Check dodge input from InputManager or fallback
            if (window.inputManager) {
                shouldDodge = window.inputManager.isDodgePressed();
            } else {
                // Fallback: check for space key
                const keys = game.keys || {};
                shouldDodge = keys['Space'];
            }
            
            if (shouldDodge) {
                this.startDodge(game);
            }
        }
    }
    
    /**
     * Start dodge maneuver
     */
    startDodge(game) {
        if (!this.canDodge || this.isDodging) return;
        
        // Get current movement direction for dodge
        let dodgeX = 0;
        let dodgeY = 0;
        
        if (window.inputManager) {
            const input = window.inputManager.getMovementInput();
            dodgeX = input.x;
            dodgeY = input.y;
        } else {
            // Fallback input handling
            const keys = game.keys || {};
            if (keys['KeyW'] || keys['ArrowUp']) dodgeY -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) dodgeY += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) dodgeX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) dodgeX += 1;
        }
        
        // If no movement input, dodge forward (upward)
        if (dodgeX === 0 && dodgeY === 0) {
            dodgeY = -1; // Default to upward dodge
        }
        
        // Normalize dodge direction
        const magnitude = Math.sqrt(dodgeX * dodgeX + dodgeY * dodgeY);
        if (magnitude > 0) {
            this.dodgeDirection.x = dodgeX / magnitude;
            this.dodgeDirection.y = dodgeY / magnitude;
        }
        
        // Start dodge
        this.isDodging = true;
        this.dodgeDuration = 0.3; // Reset dodge duration
        this.canDodge = false;
        this.dodgeTimer = this.dodgeCooldown;
        
        // Make player temporarily invulnerable during dodge
        this.player.isInvulnerable = true;
        
        // Create dodge effect
        this.createDodgeEffect(game);
        
        // Play dodge sound
        if (window.audioSystem) {
            window.audioSystem.play('dodge', 0.3);
        }
        
        // Notify game manager for achievement tracking
        if (window.gameManager && window.gameManager.onPlayerDodged) {
            window.gameManager.onPlayerDodged();
        }
    }
    
    /**
     * End dodge maneuver
     */
    endDodge() {
        this.isDodging = false;
        this.player.isInvulnerable = false;
        this.dodgeDirection = { x: 0, y: 0 };
    }
    
    /**
     * Create visual effect for dodge
     */
    createDodgeEffect(game) {
        // Create trail particles during dodge
        if (window.optimizedParticles) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const speed = 100 + Math.random() * 50;
                
                window.optimizedParticles.spawnParticle({
                    x: this.player.x,
                    y: this.player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 2,
                    color: '#3498db',
                    life: 0.5,
                    type: 'spark'
                });
            }
        } else if (window.gameManager && window.gameManager.createHitEffect) {
            // Fallback effect
            window.gameManager.createHitEffect(this.player.x, this.player.y, 15);
        }
    }
    
    /**
     * Update trail effect for movement feedback
     */
    updateTrailEffect(deltaTime, game) {
        if (!this.isMoving) return;
        
        // Check if we've moved far enough to create a trail particle
        const dx = this.player.x - this.lastTrailPos.x;
        const dy = this.player.y - this.lastTrailPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance >= this.trailDistance) {
            this.createTrailParticle();
            this.lastTrailPos.x = this.player.x;
            this.lastTrailPos.y = this.player.y;
        }
    }
    
    /**
     * Create trail particle for movement feedback
     */
    createTrailParticle() {
        if (window.ParticleHelpers) {
            // Use the helper for consistent trail creation
            window.ParticleHelpers.createTrail(
                this.player.x, 
                this.player.y, 
                -this.dodgeDirection.x * 50, 
                -this.dodgeDirection.y * 50
            );
        }
    }
    
    /**
     * Keep player within canvas boundaries
     */
    constrainToCanvas(game) {
        const canvas = game.canvas;
        if (!canvas) return;
        
        const radius = this.player.radius;
        this.player.x = MathUtils.clamp(this.player.x, radius, canvas.width - radius);
        this.player.y = MathUtils.clamp(this.player.y, radius, canvas.height - radius);
    }
    
    /**
     * Get current movement state for other components
     */
    getMovementState() {
        return {
            isMoving: this.isMoving,
            isDodging: this.isDodging,
            canDodge: this.canDodge,
            speed: this.speed,
            dodgeTimer: this.dodgeTimer,
            dodgeCooldown: this.dodgeCooldown
        };
    }
    
    /**
     * Apply speed modifier from upgrades
     */
    modifySpeed(multiplier) {
        this.speed *= multiplier;
    }
    
    /**
     * Apply dodge cooldown reduction from upgrades
     */
    reduceDodgeCooldown(reduction) {
        this.dodgeCooldown = Math.max(0.5, this.dodgeCooldown - reduction);
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.PlayerMovement = PlayerMovement;
}

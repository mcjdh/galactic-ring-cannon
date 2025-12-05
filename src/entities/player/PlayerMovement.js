class PlayerMovement {
    // Movement physics constants (extracted for clarity and maintainability)
    static MOVEMENT_CONSTANTS = {
        ACCELERATION: 1200,                // pixels/sec² - how fast player accelerates
        FRICTION: 0.85,                    // friction coefficient (0-1) - how fast player decelerates
        MOVEMENT_THRESHOLD: 5,             // velocity below this is considered "stopped"
        SQRT2_INV_FALLBACK: 0.7071067811865476, // 1/√2 for diagonal normalization (if FastMath unavailable)

        // Trail effect settings
        TRAIL_SIZE_NORMAL: 0.5,            // trail particle size (ratio of player radius)
        TRAIL_SIZE_DODGING: 0.8,           // trail particle size while dodging
        TRAIL_DURATION_NORMAL: 0.3,        // seconds
        TRAIL_DURATION_DODGING: 0.4,       // seconds
        TRAIL_MIN_DURATION_FACTOR: 0.6,    // minimum duration multiplier in low-performance mode

        // Dodge mechanics
        PERFECT_DODGE_DETECTION_RADIUS: 80,  // pixels - radius to check for nearby enemies
        PERFECT_DODGE_DISTANCE: 50,          // pixels - max distance for perfect dodge

        // Dodge visual effects
        DODGE_TEXT_OFFSET_Y: -30,            // pixels above player
        DODGE_PARTICLE_COUNT: 10,            // number of particles spawned
        DODGE_PARTICLE_VELOCITY_SPREAD: 50,  // pixels/sec - random velocity range
        DODGE_PARTICLE_SIZE_RATIO: 0.5,      // ratio of player radius
        DODGE_PARTICLE_DURATION: 0.3,        // seconds
        DODGE_SOUND_VOLUME: 0.7,             // 0-1

        // Dodge indicator UI
        DODGE_INDICATOR_RADIUS_OFFSET: 8,    // pixels outside player radius
        DODGE_INDICATOR_LINE_WIDTH: 2        // pixels
    };

    constructor(player) {
        this.player = player;

        const PLAYER_CONSTANTS = window.GAME_CONSTANTS?.PLAYER || {};

        // Movement properties
        this.speed = PLAYER_CONSTANTS.BASE_SPEED || 220;
        this.velocity = { x: 0, y: 0 };

        // Dodge system
        this.canDodge = true;
        this.dodgeCooldown = PLAYER_CONSTANTS.DODGE_COOLDOWN || 2;
        this.dodgeTimer = 0;
        this.isDodging = false;
        this.dodgeDuration = PLAYER_CONSTANTS.DODGE_DURATION || 0.3;
        this.dodgeSpeed = PLAYER_CONSTANTS.DODGE_SPEED || 600;
        this.dodgeDirection = { x: 0, y: 0 };
        this.dodgeCooldownTimer = 0;
        this.dodgeActiveTimer = 0;

        // Trail effects
        this.lastTrailPos = { x: 0, y: 0 };
        this.trailDistance = PLAYER_CONSTANTS.TRAIL_DISTANCE || 15;
        this.isMoving = false;

        // Magnet system
        this.magnetRange = PLAYER_CONSTANTS.BASE_MAGNET_RANGE || 120;

        // Cache SQRT2_INV to avoid repeated property access
        this._sqrt2Inv = window.FastMath?.SQRT2_INV || PlayerMovement.MOVEMENT_CONSTANTS.SQRT2_INV_FALLBACK;
    }

    update(deltaTime, game) {
        this.handleMovement(deltaTime, game);
        this.handleDodge(deltaTime, game);
    }

    handleMovement(deltaTime, game) {
        if (this.isDodging) {
            // Apply dodge movement
            this.player.x += this.dodgeDirection.x * this.dodgeSpeed * deltaTime;
            this.player.y += this.dodgeDirection.y * this.dodgeSpeed * deltaTime;
            return; // Skip normal movement during dodge
        }

        let inputX = 0;
        let inputY = 0;

        // Get keys from the game engine
        const keys = game.keys || {};

        if (keys['w'] || keys['W'] || keys['ArrowUp']) inputY -= 1;
        if (keys['s'] || keys['S'] || keys['ArrowDown']) inputY += 1;
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) inputX -= 1;
        if (keys['d'] || keys['D'] || keys['ArrowRight']) inputX += 1;

        // Enhanced movement physics with acceleration and momentum
        const C = PlayerMovement.MOVEMENT_CONSTANTS; // Shorthand for constants
        const acceleration = C.ACCELERATION;
        const friction = C.FRICTION;

        // Apply kill streak speed bonus
        const streakBonuses = this.player.stats?.getKillStreakBonuses?.() || { speed: 1.0 };
        const maxSpeed = this.speed * streakBonuses.speed;

        // Apply input acceleration
        if (inputX !== 0 || inputY !== 0) {
            // OPTIMIZED: Normalize diagonal input using FastMath (avoids sqrt)
            // For keyboard input, values are always -1, 0, or 1
            if (inputX !== 0 && inputY !== 0) {
                // Diagonal movement: multiply by 1/√2 (cached instance property)
                inputX *= this._sqrt2Inv;
                inputY *= this._sqrt2Inv;
            }
            // Cardinal directions (N/S/E/W) are already normalized

            // Accelerate towards input direction
            this.velocity.x += inputX * acceleration * deltaTime;
            this.velocity.y += inputY * acceleration * deltaTime;

            // Store movement direction for dodge
            this.dodgeDirection.x = inputX;
            this.dodgeDirection.y = inputY;
            this.isMoving = true;
        } else {
            // Apply friction when no input (optimized: friction^60 pre-computed or approximated)
            const frictionFactor = friction ** (deltaTime * 60);
            this.velocity.x *= frictionFactor;
            this.velocity.y *= frictionFactor;
            this.isMoving = Math.abs(this.velocity.x) > C.MOVEMENT_THRESHOLD ||
                          Math.abs(this.velocity.y) > C.MOVEMENT_THRESHOLD;
        }

        // Clamp velocity to max speed (optimized: use squared comparison)
        // Guard against division by zero if maxSpeed is somehow 0
        if (maxSpeed > 0) {
            const currentSpeedSq = this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y;
            const maxSpeedSq = maxSpeed * maxSpeed;
            if (currentSpeedSq > maxSpeedSq) {
                // Only calculate sqrt when we need to clamp
                const currentSpeed = Math.sqrt(currentSpeedSq);
                const scale = maxSpeed / currentSpeed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        }

        // Apply movement with improved responsiveness
        const moveX = this.velocity.x * deltaTime;
        const moveY = this.velocity.y * deltaTime;

        // Store previous position
        const oldX = this.player.x;
        const oldY = this.player.y;

        // Update position directly (velocity already accounts for speed)
        this.player.x += moveX;
        this.player.y += moveY;

        // Update rotation based on movement direction
        if (this.isMoving) {
            const targetRotation = Math.atan2(this.velocity.y, this.velocity.x);
            
            if (this.player.rotation === undefined || this.player.rotation === null) {
                this.player.rotation = targetRotation;
            } else {
                // Smooth rotation interpolation
                let diff = targetRotation - this.player.rotation;
                // Normalize angle to -PI to PI
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                
                // Rotation speed (radians per second)
                // Increased from 15 to 30 for snappier, more responsive turning
                const rotationSpeed = 30; 
                this.player.rotation += diff * Math.min(1, rotationSpeed * deltaTime);
            }
        }

        // Create trail effect when moving
        if (this.isMoving || this.isDodging) {
            // Calculate distance moved (optimized: use squared distance comparison)
            const dx = this.player.x - this.lastTrailPos.x;
            const dy = this.player.y - this.lastTrailPos.y;
            const distanceSq = dx * dx + dy * dy;

            // Create trail particles at regular intervals (compare squared distances to avoid sqrt)
            const trailDistanceSq = this.trailDistance * this.trailDistance;
            if (distanceSq > trailDistanceSq) {
                this.createTrailParticle(oldX, oldY);
                this.lastTrailPos = { x: this.player.x, y: this.player.y };
            }
        }
    }

    createTrailParticle(x, y) {
        // Respect performance settings
        if (!window.gameManager || window.gameManager.lowQuality) return;

        const C = PlayerMovement.MOVEMENT_CONSTANTS;
        const trailSize = this.isDodging
            ? this.player.radius * C.TRAIL_SIZE_DODGING
            : this.player.radius * C.TRAIL_SIZE_NORMAL;

        // Slightly shorten in constrained modes
        const baseDuration = this.isDodging ? C.TRAIL_DURATION_DODGING : C.TRAIL_DURATION_NORMAL;
        const factor = (window.gameManager.particleReductionFactor || 1.0);
        const duration = baseDuration * (factor < 1 ? Math.max(C.TRAIL_MIN_DURATION_FACTOR, factor + 0.4) : 1);
        const trailColor = this.player.trailColor || this.player.color;

        this.player.spawnParticle(x, y, 0, 0, trailSize, trailColor, duration, 'trail');
    }

    handleDodge(deltaTime, game) {
        // Progress cooldown timer when dodge is unavailable
        if (!this.canDodge && !this.isDodging) {
            this.dodgeCooldownTimer += deltaTime;
            if (this.dodgeCooldownTimer >= this.dodgeCooldown) {
                this.canDodge = true;
                this.dodgeCooldownTimer = 0;
            }
        }

        // Handle active dodge duration independently
        if (this.isDodging) {
            this.dodgeActiveTimer += deltaTime;
            if (this.dodgeActiveTimer >= this.dodgeDuration) {
                this.isDodging = false;
                this.dodgeActiveTimer = 0;
                this.player.stats.isInvulnerable = false;
                // Start cooldown timer after dodge ends
                this.dodgeCooldownTimer = 0;
            }
        }

        // Get keys from the game engine
        const keys = game.keys || {};

        // Only activate dodge if game is active (not paused or in level-up menu)
        const isMenuActive = window.upgradeSystem?.isLevelUpActive?.() ||
                           window.gameManager?.isMenuActive?.() ||
                           game.isPaused;

        if (keys[' '] && this.canDodge && !this.isDodging && !isMenuActive) {
            keys[' '] = false; // Prevent holding space
            this.doDodge();
        }
    }

    doDodge() {
        if (!this.canDodge || this.isDodging) return;

        const C = PlayerMovement.MOVEMENT_CONSTANTS;

        // Check for perfect dodge (dodging when very close to enemies)
        // Perfect dodge = dodging within close range of any enemy
        let wasPerfectDodge = false;
        if (window.gameManager && window.gameManager.game) {
            const enemies = window.gameManager.game.getEnemiesWithinRadius?.(
                this.player.x,
                this.player.y,
                C.PERFECT_DODGE_DISTANCE, // Use smaller radius for perfect dodge detection
                { includeDead: false }
            ) ?? [];

            // Perfect dodge if there are enemies very close (within ~50px)
            if (enemies.length > 0) {
                wasPerfectDodge = true;
            }
        }

        this.isDodging = true;
        this.player.stats.isInvulnerable = true;
        this.canDodge = false;
        this.dodgeActiveTimer = 0;
        this.dodgeCooldownTimer = 0;

        // Track dodge achievement
        if (window.gameManager) {
            window.gameManager.onDodge(wasPerfectDodge);
        }

        // Visual effect for dodge (perfect dodge handled by gameManager.onDodge)
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm && typeof gm.showFloatingText === 'function' && !wasPerfectDodge) {
            const dodgeSymbol = window.GAME_CONSTANTS?.VISUAL_SYMBOLS?.DODGE || '>';
            const color = this.player.glowColor || '#3498db';
            gm.showFloatingText(
                dodgeSymbol,
                this.player.x,
                this.player.y + C.DODGE_TEXT_OFFSET_Y,
                color,
                20
            );
        }

        // Create dodge effect
        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();
        const fallbackLowQuality = gm?.lowQuality ?? false;
        const particleCount = stats?.lowQuality || fallbackLowQuality
            ? 0
            : helpers?.calculateSpawnCount?.(C.DODGE_PARTICLE_COUNT)
                ?? Math.floor(C.DODGE_PARTICLE_COUNT * Math.min(gm?.particleReductionFactor || 1, 1));

        for (let i = 0; i < particleCount; i++) {
            this.player.spawnParticle(
                this.player.x,
                this.player.y,
                (Math.random() - 0.5) * C.DODGE_PARTICLE_VELOCITY_SPREAD,
                (Math.random() - 0.5) * C.DODGE_PARTICLE_VELOCITY_SPREAD,
                this.player.radius * C.DODGE_PARTICLE_SIZE_RATIO,
                this.player.glowColor || this.player.color,
                C.DODGE_PARTICLE_DURATION,
                'spark'
            );
        }

        // Play dodge sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('dodge', C.DODGE_SOUND_VOLUME);
        }
    }

    // Upgrade application for movement-related upgrades
    applyMovementUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'speed':
                this.speed *= upgrade.multiplier;
                break;

            case 'magnet':
                this.magnetRange += upgrade.value;
                break;

            case 'dodgeCooldown':
                this.dodgeCooldown *= upgrade.multiplier;
                break;

            case 'dodgeDuration':
                this.dodgeDuration *= upgrade.multiplier;
                break;

            case 'dodgeInvulnerability':
                this.player.stats.invulnerabilityTime += upgrade.value;
                break;
        }
    }

    // Render dodge cooldown indicator
    renderDodgeIndicator(ctx) {
        if (!this.canDodge) {
            const C = PlayerMovement.MOVEMENT_CONSTANTS;
            const cooldownPercent = Math.min(1, this.dodgeCooldownTimer / this.dodgeCooldown);
            ctx.beginPath();
            ctx.arc(
                this.player.x,
                this.player.y,
                this.player.radius + C.DODGE_INDICATOR_RADIUS_OFFSET,
                -Math.PI / 2,
                -Math.PI / 2 + (2 * Math.PI * cooldownPercent)
            );
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.7)';
            ctx.lineWidth = C.DODGE_INDICATOR_LINE_WIDTH;
            ctx.stroke();
        }
    }

    // Get debug information
    getDebugInfo() {
        return {
            position: { x: this.player.x, y: this.player.y },
            velocity: { x: this.velocity.x, y: this.velocity.y },
            speed: this.speed,
            isDodging: this.isDodging,
            canDodge: this.canDodge,
            dodgeCooldown: this.dodgeCooldown,
            isMoving: this.isMoving
        };
    }
}

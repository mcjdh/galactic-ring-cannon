class PlayerMovement {
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
        const acceleration = 1200; // pixels/sec²
        const friction = 0.85; // friction coefficient
        const maxSpeed = this.speed;

        // Apply input acceleration
        if (inputX !== 0 || inputY !== 0) {
            // Normalize diagonal input
            const inputMagnitude = Math.sqrt(inputX * inputX + inputY * inputY);
            if (inputMagnitude > 0) {
                inputX /= inputMagnitude;
                inputY /= inputMagnitude;
            }

            // Accelerate towards input direction
            this.velocity.x += inputX * acceleration * deltaTime;
            this.velocity.y += inputY * acceleration * deltaTime;

            // Store movement direction for dodge
            this.dodgeDirection.x = inputX;
            this.dodgeDirection.y = inputY;
            this.isMoving = true;
        } else {
            // Apply friction when no input
            this.velocity.x *= Math.pow(friction, deltaTime * 60);
            this.velocity.y *= Math.pow(friction, deltaTime * 60);
            this.isMoving = Math.abs(this.velocity.x) > 5 || Math.abs(this.velocity.y) > 5;
        }

        // Clamp velocity to max speed
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
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

        // Create trail effect when moving
        if (this.isMoving || this.isDodging) {
            // Calculate distance moved
            const distance = Math.sqrt(
                Math.pow(this.player.x - this.lastTrailPos.x, 2) +
                Math.pow(this.player.y - this.lastTrailPos.y, 2)
            );

            // Create trail particles at regular intervals
            if (distance > this.trailDistance) {
                this.createTrailParticle(oldX, oldY);
                this.lastTrailPos = { x: this.player.x, y: this.player.y };
            }
        }
    }

    createTrailParticle(x, y) {
        // Respect performance settings
        if (!window.gameManager || window.gameManager.lowQuality) return;
        const trailSize = this.isDodging ? this.player.radius * 0.8 : this.player.radius * 0.5;
        // Slightly shorten in constrained modes
        const baseDuration = this.isDodging ? 0.4 : 0.3;
        const factor = (window.gameManager.particleReductionFactor || 1.0);
        const duration = baseDuration * (factor < 1 ? Math.max(0.6, factor + 0.4) : 1);

        this.player.spawnParticle(x, y, 0, 0, trailSize, this.player.color, duration, 'trail');
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

        // Check for perfect dodge (dodging just before being hit)
        let wasPerfectDodge = false;
        if (window.gameManager && window.gameManager.game) {
            const enemies = window.gameManager.game.getEnemiesWithinRadius?.(
                this.player.x,
                this.player.y,
                80,
                { includeDead: false }
            ) ?? [];

            for (const enemy of enemies) {
                if (enemy.isAttacking && this.player.distanceTo(enemy) < 50) {
                    wasPerfectDodge = true;
                    break;
                }
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

        // Visual effect for dodge
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm && typeof gm.showFloatingText === 'function') {
            gm.showFloatingText("Dodge!", this.player.x, this.player.y - 30, '#3498db', 18);
        }

        // Create dodge effect
        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();
        const fallbackLowQuality = gm?.lowQuality ?? false;
        const particleCount = stats?.lowQuality || fallbackLowQuality
            ? 0
            : helpers?.calculateSpawnCount?.(10)
                ?? Math.floor(10 * Math.min(gm?.particleReductionFactor || 1, 1));

        for (let i = 0; i < particleCount; i++) {
            this.player.spawnParticle(
                this.player.x,
                this.player.y,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                this.player.radius / 2,
                this.player.color,
                0.3,
                'spark'
            );
        }

        // Play dodge sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('dodge', 0.7);
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
            const cooldownPercent = Math.min(1, this.dodgeCooldownTimer / this.dodgeCooldown);
            ctx.beginPath();
            ctx.arc(
                this.player.x,
                this.player.y,
                this.player.radius + 8,
                -Math.PI / 2,
                -Math.PI / 2 + (2 * Math.PI * cooldownPercent)
            );
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.7)';
            ctx.lineWidth = 2;
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

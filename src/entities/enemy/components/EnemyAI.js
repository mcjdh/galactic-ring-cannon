/**
 * EnemyAI Component
 * [A] RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all AI behaviors, targeting, attack patterns, and decision making
 */

class EnemyAI {
    // AI behavior constants (extracted for clarity and maintainability)
    static AI_CONSTANTS = {
        // Targeting system
        TARGET_UPDATE_INTERVAL_BASE: 0.4,       // seconds - base interval for target updates
        TARGET_UPDATE_INTERVAL_RANDOM: 0.3,     // seconds - random variance to desync enemies
        TARGET_UPDATE_TIMER_RANDOM: 0.5,        // seconds - random initial timer
        MAX_TARGET_DISTANCE: 800,               // pixels - max range to consider player as target

        // Attack timing
        ATTACK_TIMER_RANDOM: 1.0,               // seconds - random initial attack timer
        ATTACK_COOLDOWN_BASE: 1.8,              // seconds - base cooldown between attacks
        ATTACK_COOLDOWN_RANDOM: 0.4,            // seconds - random variance

        // Combat positioning (attacking state)
        OPTIMAL_ATTACK_DISTANCE_RATIO: 0.8,     // ratio of attack range - preferred distance
        ATTACK_HYSTERESIS_RATIO: 0.2,           // ratio - buffer zone to prevent jittering
        RETREAT_SPEED: 0.2,                     // movement speed when backing away
        APPROACH_SPEED: 0.15,                   // movement speed when approaching
        OPTIMAL_RANGE_DAMPING: 0.8,             // dampen movement when in optimal range

        // Collision avoidance
        SEPARATION_RADIUS: 30,                  // pixels - distance to maintain from other enemies
        AVOIDANCE_UPDATE_INTERVAL_BASE: 0.12,   // seconds - base interval for avoidance updates
        AVOIDANCE_UPDATE_INTERVAL_RANDOM: 0.08, // seconds - random variance
        AVOIDANCE_TIMER_RANDOM: 0.1,            // seconds - random initial timer
        AVOIDANCE_STRENGTH: 0.8,                // [BUFFED] multiplier for avoidance force - prevents clumping
        MAX_NEIGHBOR_CHECK: 8,                  // max neighbors to check for avoidance

        // Aggressive movement (different AI modes)
        AGGRESSIVE_CHASE_DISTANCE: 150          // pixels - distance threshold for aggressive pursuit
    };

    constructor(enemy) {
        this.enemy = enemy;

        const C = EnemyAI.AI_CONSTANTS;

        // AI state management
        this.currentState = 'idle';
        this.stateTimer = 0;
        this.lastStateChange = 0;

        // Targeting system (randomized to desync enemies)
        this.target = null;
        this.targetUpdateTimer = Math.random() * C.TARGET_UPDATE_TIMER_RANDOM;
        this.targetUpdateInterval = C.TARGET_UPDATE_INTERVAL_BASE + Math.random() * C.TARGET_UPDATE_INTERVAL_RANDOM;
        this.maxTargetDistance = C.MAX_TARGET_DISTANCE;

        // Attack AI (randomized timing)
        this.attackTimer = Math.random() * C.ATTACK_TIMER_RANDOM;
        this.attackCooldown = C.ATTACK_COOLDOWN_BASE + Math.random() * C.ATTACK_COOLDOWN_RANDOM;
        this.lastAttackTime = 0;

        // Boss-specific AI
        this.attackPatterns = [];
        this.currentAttackPattern = 0;
        this.phaseChangeThresholds = [0.7, 0.4, 0.15]; // Health % thresholds
        this.currentPhase = 1;

        // Behavior flags
        this.isAggressive = true;
        this.canAttackPlayer = true;
        this.canAvoidOthers = true;
        this.canUseSpecialAbilities = true;
    }

    /**
     * Main AI update loop
     */
    update(deltaTime, game) {
        // Update timers
        this.updateTimers(deltaTime);

        // Update target
        this.updateTarget(game);

        // Update AI state machine
        this.updateStateMachine(deltaTime, game);

        // Handle boss-specific AI
        if (this.enemy.isBoss) {
            this.updateBossAI(deltaTime, game);
        }

        // Avoidance is now handled by EnemyMovement via LocalForceProducer
        // Removed redundant avoidance calculation loop
    }

    /**
     * Update AI timers
     */
    updateTimers(deltaTime) {
        this.stateTimer += deltaTime;
        this.targetUpdateTimer += deltaTime;
        this.attackTimer += deltaTime;
    }

    /**
     * Update target selection
     */
    updateTarget(game) {
        if (this.targetUpdateTimer >= this.targetUpdateInterval) {
            this.targetUpdateTimer = 0;

            // Primary target is always the player
            if (game.player && !game.player.isDead) {
                const distance = this.getDistanceToTarget(game.player);

                if (distance <= this.maxTargetDistance) {
                    this.target = game.player;
                } else {
                    this.target = null;
                }
            } else {
                this.target = null;
            }
        }
    }

    /**
     * Main AI state machine
     */
    updateStateMachine(deltaTime, game) {
        switch (this.currentState) {
            case 'idle':
                this.handleIdleState(deltaTime, game);
                break;
            case 'pursuing':
                this.handlePursuingState(deltaTime, game);
                break;
            case 'attacking':
                this.handleAttackingState(deltaTime, game);
                break;
            case 'retreating':
                this.handleRetreatingState(deltaTime, game);
                break;
            case 'special':
                this.handleSpecialState(deltaTime, game);
                break;
        }
    }

    /**
     * Handle idle AI state
     */
    handleIdleState(deltaTime, game) {
        if (this.target && this.isAggressive) {
            this.changeState('pursuing');
            return;
        }

        // Random movement when idle - frequent direction changes to appear alive
        // [IMPROVED] Changed from 0.8s to 0.5s for more active movement
        if (this.stateTimer > 0.5) {
            const angle = Math.random() * Math.PI * 2;
            this.enemy.targetDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
            this.stateTimer = 0;
        }
        
        // [FIX] If no direction set, set one immediately
        if (!this.enemy.targetDirection || 
            (this.enemy.targetDirection.x === 0 && this.enemy.targetDirection.y === 0)) {
            const angle = Math.random() * Math.PI * 2;
            this.enemy.targetDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        }
    }

    /**
     * Handle pursuing AI state
     */
    handlePursuingState(deltaTime, game) {
        if (!this.target) {
            this.changeState('idle');
            return;
        }

        // OPTIMIZED: Get both distance and direction with single sqrt calculation
        const { distance, direction } = this.getDistanceAndDirection(this.target);

        // Switch to attacking if close enough
        if (distance <= this.getAttackRange()) {
            this.changeState('attacking');
            return;
        }

        // Set pursuit direction
        this.enemy.targetDirection = direction;

        // Check for special ability usage while pursuing
        if (this.canUseSpecialAbilities && this.shouldUseSpecialAbility(distance)) {
            this.changeState('special');
        }
    }

    /**
     * Handle attacking AI state
     */
    handleAttackingState(deltaTime, game) {
        if (!this.target) {
            this.changeState('idle');
            return;
        }

        // OPTIMIZED: Get both distance and direction with single sqrt calculation
        const { distance, direction } = this.getDistanceAndDirection(this.target);

        // If target moved out of range, pursue again
        if (distance > this.getAttackRange() * 1.2) {
            this.changeState('pursuing');
            return;
        }

        // Attempt to attack if cooldown is ready
        if (this.canAttackPlayer && this.attackTimer >= this.attackCooldown) {
            this.performAttack(game);
            this.attackTimer = 0;
        }

        // Check if this is a melee/contact damage enemy (no ranged attacks)
        const hasRanged = (this.enemy.abilities && this.enemy.abilities.canRangeAttack) || this.enemy.canRangeAttack;
        
        if (!hasRanged) {
            // MELEE ENEMIES: Press into player for contact damage
            // They should always try to close distance, never back away
            const closingSpeed = 0.6;  // Aggressive approach speed
            this.enemy.targetDirection = {
                x: direction.x * closingSpeed,
                y: direction.y * closingSpeed
            };
            return;
        }

        // RANGED ENEMIES: Movement while in attack state - maintain optimal distance
        const C = EnemyAI.AI_CONSTANTS;
        const optimalDistance = this.getAttackRange() * C.OPTIMAL_ATTACK_DISTANCE_RATIO;
        const hysteresisRange = optimalDistance * C.ATTACK_HYSTERESIS_RATIO;

        if (distance < optimalDistance - hysteresisRange) {
            // Too close, back away
            this.enemy.targetDirection = {
                x: -direction.x * C.RETREAT_SPEED,
                y: -direction.y * C.RETREAT_SPEED
            };
        } else if (distance > optimalDistance + hysteresisRange) {
            // Too far, move closer
            this.enemy.targetDirection = {
                x: direction.x * C.APPROACH_SPEED,
                y: direction.y * C.APPROACH_SPEED
            };
        } else {
            // In optimal range - circle strafe for dynamic combat
            // [IMPROVED] Consistent strafing that doesn't decay to zero
            const strafeSpeed = 0.4;  // Increased from 0.3
            const strafeDirection = Math.sin(this.stateTimer * 2) > 0 ? 1 : -1;  // Oscillate direction
            
            // Perpendicular to target (strafe)
            this.enemy.targetDirection = {
                x: -direction.y * strafeSpeed * strafeDirection,
                y: direction.x * strafeSpeed * strafeDirection
            };
        }
    }

    /**
     * Handle retreating AI state
     */
    handleRetreatingState(deltaTime, game) {
        if (!this.target) {
            this.changeState('idle');
            return;
        }

        // Move away from target
        const direction = this.getDirectionToTarget(this.target);
        this.enemy.targetDirection = {
            x: -direction.x,
            y: -direction.y
        };

        // Return to pursuing after retreat time
        if (this.stateTimer > 2.0) {
            this.changeState('pursuing');
        }
    }

    /**
     * Handle special ability AI state
     */
    handleSpecialState(deltaTime, game) {
        // This state is handled by the EnemyAbilities component
        // AI just waits for the special ability to complete

        if (this.stateTimer > 1.0) { // Give abilities time to execute
            this.changeState('pursuing');
        }
    }

    /**
     * Boss-specific AI updates
     */
    updateBossAI(deltaTime, game) {
        // Check for phase changes based on health
        const healthPercent = this.enemy.health / this.enemy.maxHealth;
        let newPhase = this.currentPhase;

        for (let i = 0; i < this.phaseChangeThresholds.length; i++) {
            if (healthPercent <= this.phaseChangeThresholds[i]) {
                newPhase = i + 2; // Phases start at 2
                break;
            }
        }

        if (newPhase !== this.currentPhase) {
            this.onPhaseChange(newPhase, game);
            this.currentPhase = newPhase;
        }

        // Update attack pattern progression
        this.updateAttackPattern();

        // Boss-specific behaviors based on phase
        this.handleBossPhaseLogic(deltaTime, game);
    }

    /**
     * Handle boss phase transitions
     */
    onPhaseChange(newPhase, game) {
        // Create dramatic phase change effect
        if (window.gameManager) {
            window.gameManager.showFloatingText(
                `⚡ PHASE ${newPhase} ⚡`,
                this.enemy.x,
                this.enemy.y - 50,
                '#ff6b35',
                32
            );

            // Add screen shake for phase change (stronger for later phases)
            if (window.gameManager.addScreenShake) {
                const shakeStrength = 8 + (newPhase * 2);
                window.gameManager.addScreenShake(shakeStrength, 0.8);
            }
        }

        // Create expanding shockwave particle effect
        if (window.optimizedParticles) {
            const ringCount = 3;
            const baseRadius = this.enemy.radius || 35;

            for (let ring = 0; ring < ringCount; ring++) {
                const delay = ring * 80;
                const segments = 24 + (ring * 8);

                setTimeout(() => {
                    for (let i = 0; i < segments; i++) {
                        const angle = (i / segments) * Math.PI * 2;
                        const startRadius = baseRadius + (ring * 10);
                        const speed = 120 + (ring * 40) + (newPhase * 20);

                        window.optimizedParticles.spawnParticle({
                            x: this.enemy.x + Math.cos(angle) * startRadius,
                            y: this.enemy.y + Math.sin(angle) * startRadius,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: 4 + ring,
                            color: ring === 0 ? '#ff6b35' : (ring === 1 ? '#e74c3c' : '#c0392b'),
                            life: 0.8 - (ring * 0.15),
                            type: 'spark',
                            friction: 0.95
                        });
                    }
                }, delay);
            }

            // Add energy burst at center
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 120;
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x,
                    y: this.enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: Math.random() > 0.5 ? '#ff6b35' : '#f39c12',
                    life: 1.0 + Math.random() * 0.5,
                    type: 'spark',
                    friction: 0.92
                });
            }
        }

        // Play phase change audio
        if (window.audioSystem?.play) {
            window.audioSystem.play('bossPhase', 0.6);
        }

        // Adjust AI behavior based on phase
        switch (newPhase) {
            case 2:
                this.attackCooldown *= 0.8; // Attack 20% faster
                this.isAggressive = true;
                break;
            case 3:
                this.attackCooldown *= 0.7; // Attack 30% faster than original
                this.canUseSpecialAbilities = true;
                break;
            case 4:
                this.attackCooldown *= 0.6; // Attack 40% faster than original
                this.isAggressive = true;
                this.canUseSpecialAbilities = true;
                break;
        }
    }

    /**
     * Update boss attack patterns
     */
    updateAttackPattern() {
        if (!this.enemy.attackPatterns || this.enemy.attackPatterns.length === 0) return;

        // Change attack pattern based on phase
        const patternsPerPhase = Math.ceil(this.enemy.attackPatterns.length / 4);
        const basePattern = (this.currentPhase - 1) * patternsPerPhase;

        // Add some randomness to pattern selection
        const patternRange = Math.min(patternsPerPhase, this.enemy.attackPatterns.length - basePattern);
        this.currentAttackPattern = basePattern + Math.floor(Math.random() * patternRange);

        // Ensure pattern index is valid
        this.currentAttackPattern = Math.min(this.currentAttackPattern, this.enemy.attackPatterns.length - 1);
    }

    /**
     * Handle boss phase-specific logic
     */
    handleBossPhaseLogic(deltaTime, game) {
        switch (this.currentPhase) {
            case 1:
                // Basic behavior
                break;
            case 2:
                // More aggressive movement
                if (this.target) {
                    // OPTIMIZED: Get both distance and direction with single sqrt calculation
                    const { distance, direction } = this.getDistanceAndDirection(this.target);
                    if (distance > EnemyAI.AI_CONSTANTS.AGGRESSIVE_CHASE_DISTANCE) {
                        this.enemy.targetDirection = direction;
                    }
                }
                break;
            case 3:
                // Erratic movement patterns - random direction changes
                if (this.stateTimer > 1.0) {
                    const angle = Math.random() * Math.PI * 2;
                    // [FIX] Direction vectors must be normalized (magnitude 1.0)
                    // Previous 0.5 magnitude caused boss to move at 50% intended speed
                    this.enemy.targetDirection = {
                        x: Math.cos(angle),
                        y: Math.sin(angle)
                    };
                    this.stateTimer = 0; // Reset timer after changing direction
                }
                break;
            case 4:
                // Desperate phase - very aggressive
                if (this.target) {
                    this.enemy.targetDirection = this.getDirectionToTarget(this.target);
                    this.isAggressive = true;
                }
                break;
        }
    }



    /**
     * Perform attack based on enemy type and current pattern
     */
    performAttack(game) {
        if (!this.target || !this.canAttackPlayer) return;

        // Delegate to enemy abilities component for actual attack execution
        if (this.enemy.abilities && this.enemy.abilities.performAttack) {
            this.enemy.abilities.performAttack(game, this.target, this.currentAttackPattern);
        } else {
            // Fallback basic attack
            this.performBasicAttack(game);
        }

        this.lastAttackTime = Date.now();
    }

    /**
     * Basic attack fallback
     */
    performBasicAttack(game) {
        if (!this.target || !game.spawnEnemyProjectile) return;

        const direction = this.getDirectionToTarget(this.target);
        const speed = this.enemy.projectileSpeed || 200;
        const damage = this.enemy.projectileDamage || this.enemy.damage * 0.5;

        game.spawnEnemyProjectile(
            this.enemy.x,
            this.enemy.y,
            direction.x * speed,
            direction.y * speed,
            damage
        );
    }

    /**
     * Check if should use special ability
     */
    shouldUseSpecialAbility(distanceToTarget) {
        // Use special abilities when at medium range and not recently used
        const timeSinceLastAttack = Date.now() - this.lastAttackTime;
        return distanceToTarget > 100 &&
            distanceToTarget < 300 &&
            timeSinceLastAttack > 3000 &&
            Math.random() < 0.3;
    }

    /**
     * Change AI state
     */
    changeState(newState) {
        if (this.currentState !== newState) {
            this.currentState = newState;
            this.stateTimer = 0;
            this.lastStateChange = Date.now();
        }
    }

    /**
     * Get distance to target
     */
    getDistanceToTarget(target) {
        if (!target) return Infinity;

        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get normalized direction to target
     */
    getDirectionToTarget(target) {
        if (!target) return { x: 0, y: 0 };

        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return { x: 0, y: 0 };

        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    /**
     * Get both distance and direction to target in a single calculation (OPTIMIZED)
     * Avoids redundant sqrt calculations when both values are needed
     * @returns {Object} { distance: number, direction: {x: number, y: number} }
     */
    getDistanceAndDirection(target) {
        if (!target) return {
            distance: Infinity,
            direction: { x: 0, y: 0 }
        };

        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return {
            distance: 0,
            direction: { x: 0, y: 0 }
        };

        return {
            distance,
            direction: {
                x: dx / distance,
                y: dy / distance
            }
        };
    }

    /**
     * Get attack range based on enemy type
     */
    getAttackRange() {
        const hasRanged = (this.enemy.abilities && this.enemy.abilities.canRangeAttack) || this.enemy.canRangeAttack;

        if (hasRanged) {
            return this.enemy.attackRange || 250; // Ranged enemies attack from distance
        }

        if (this.enemy.isBoss) {
            return 200; // Bosses have longer reach
        }

        return this.enemy.attackRange || 50; // Melee enemies need to get close
    }

    /**
     * Get current AI state for debugging/UI
     */
    getAIState() {
        return {
            currentState: this.currentState,
            hasTarget: !!this.target,
            currentPhase: this.currentPhase,
            attackCooldown: this.attackCooldown,
            attackTimer: this.attackTimer,
            canAttack: this.attackTimer >= this.attackCooldown,
            isAggressive: this.isAggressive
        };
    }

}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemyAI = EnemyAI;
}

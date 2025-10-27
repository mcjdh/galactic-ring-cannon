/**
 * EnemyAI Component
 * 🤖 RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all AI behaviors, targeting, attack patterns, and decision making
 */

class EnemyAI {
    constructor(enemy) {
        this.enemy = enemy;
        
        // AI state management
        this.currentState = 'idle';
        this.stateTimer = 0;
        this.lastStateChange = 0;
        
        // Targeting system
        this.target = null;
        this.targetUpdateTimer = Math.random() * 0.5; // Randomize initial timer to desync enemies
        this.targetUpdateInterval = 0.4 + Math.random() * 0.3; // Random interval 0.4-0.7s
        this.maxTargetDistance = 800; // Maximum distance to consider player as target
        
        // Attack AI
        this.attackTimer = Math.random() * 1.0; // Randomize initial attack timer
        this.attackCooldown = 1.8 + Math.random() * 0.4; // Random cooldown 1.8-2.2s
        this.lastAttackTime = 0;
        
        // Boss-specific AI
        this.attackPatterns = [];
        this.currentAttackPattern = 0;
        this.phaseChangeThresholds = [0.7, 0.4, 0.15]; // Health % thresholds
        this.currentPhase = 1;
        
        // Collision avoidance
        this.avoidanceVector = { x: 0, y: 0 };
        this.separationRadius = 30; // Distance to maintain from other enemies
        
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
        
        // Calculate avoidance if enabled (throttled for performance)
        if (this.canAvoidOthers) {
            // Only recalculate avoidance every few frames to prevent jittering
            if (!this.avoidanceUpdateTimer) this.avoidanceUpdateTimer = Math.random() * 0.1;
            if (!this.avoidanceUpdateInterval) this.avoidanceUpdateInterval = 0.08 + Math.random() * 0.04; // 80-120ms random
            this.avoidanceUpdateTimer += deltaTime;

            if (this.avoidanceUpdateTimer >= this.avoidanceUpdateInterval) {
                this.calculateAvoidance(game);
                this.avoidanceUpdateTimer = 0;
            }
        }
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
        }
        
        // Random movement when idle
        if (this.stateTimer > 2.0) {
            const angle = Math.random() * Math.PI * 2;
            this.enemy.targetDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
            this.stateTimer = 0;
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
        
        const distance = this.getDistanceToTarget(this.target);
        
        // Switch to attacking if close enough
        if (distance <= this.getAttackRange()) {
            this.changeState('attacking');
            return;
        }
        
        // Calculate pursuit direction
        const direction = this.getDirectionToTarget(this.target);
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
        
        const distance = this.getDistanceToTarget(this.target);
        
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
        
        // Slight movement to maintain optimal attack distance (with hysteresis to prevent jittering)
        const optimalDistance = this.getAttackRange() * 0.8;
        const hysteresisRange = optimalDistance * 0.2; // 20% buffer zone

        if (distance < optimalDistance - hysteresisRange) {
            // Too close, back away
            const direction = this.getDirectionToTarget(this.target);
            this.enemy.targetDirection = {
                x: -direction.x * 0.2,
                y: -direction.y * 0.2
            };
        } else if (distance > optimalDistance + hysteresisRange) {
            // Too far, move closer
            const direction = this.getDirectionToTarget(this.target);
            this.enemy.targetDirection = {
                x: direction.x * 0.15,
                y: direction.y * 0.15
            };
        } else {
            // In optimal range, minimal movement
            this.enemy.targetDirection = {
                x: this.enemy.targetDirection.x * 0.8,  // Dampen existing movement
                y: this.enemy.targetDirection.y * 0.8
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
        // Create phase change effect
        if (window.gameManager) {
            window.gameManager.showFloatingText(
                `PHASE ${newPhase}!`,
                this.enemy.x,
                this.enemy.y - 50,
                '#ff6b35',
                28
            );
            
            // Add screen shake for phase change
            if (window.gameManager.addScreenShake) {
                window.gameManager.addScreenShake(8, 0.8);
            }
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
                    const distance = this.getDistanceToTarget(this.target);
                    if (distance > 150) {
                        this.enemy.targetDirection = this.getDirectionToTarget(this.target);
                    }
                }
                break;
            case 3:
                // Erratic movement patterns
                if (this.stateTimer > 1.0) {
                    const angle = Math.random() * Math.PI * 2;
                    this.enemy.targetDirection = {
                        x: Math.cos(angle) * 0.5,
                        y: Math.sin(angle) * 0.5
                    };
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
     * Calculate collision avoidance with other enemies
     */
    calculateAvoidance(game) {
        this.avoidanceVector = { x: 0, y: 0 };
        let neighborCount = 0;
        const nearbyEnemies = this.getNearbyEnemies(game);

        for (const other of nearbyEnemies) {
            if (other === this.enemy || other.isDead) continue;

            const dx = this.enemy.x - other.x;
            const dy = this.enemy.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.separationRadius && distance > 0) {
                // Add separation force
                const force = (this.separationRadius - distance) / this.separationRadius;
                this.avoidanceVector.x += (dx / distance) * force;
                this.avoidanceVector.y += (dy / distance) * force;
                neighborCount++;

                // Limit checks to prevent performance issues
                if (neighborCount >= 8) break; // Only consider closest 8 neighbors
            }
        }

        
        if (neighborCount > 0) {
            // Average and normalize avoidance vector
            this.avoidanceVector.x /= neighborCount;
            this.avoidanceVector.y /= neighborCount;
            
            // Apply avoidance to target direction
            if (this.enemy.targetDirection) {
                this.enemy.targetDirection.x += this.avoidanceVector.x * 0.5;
                this.enemy.targetDirection.y += this.avoidanceVector.y * 0.5;
                
                // Normalize the combined direction
                const magnitude = Math.sqrt(
                    this.enemy.targetDirection.x * this.enemy.targetDirection.x +
                    this.enemy.targetDirection.y * this.enemy.targetDirection.y
                );
                
                if (magnitude > 0) {
                    this.enemy.targetDirection.x /= magnitude;
                    this.enemy.targetDirection.y /= magnitude;
                }
            }
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
     * Get attack range based on enemy type
     */
    getAttackRange() {
        if (this.enemy.canRangeAttack) {
            return 250; // Ranged enemies attack from distance
        } else if (this.enemy.isBoss) {
            return 200; // Bosses have longer reach
        } else {
            return 50; // Melee enemies need to get close
        }
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
    
    /**
     * Get nearby enemies using spatial grid for efficient neighbor detection
     */
    getNearbyEnemies(game) {
        // Fallback to full list if no spatial grid available
        if (!game.spatialGrid || !game.gridSize) {
            return game?.getEnemies?.() ?? game?.enemies ?? [];
        }

        const gridSize = game.gridSize;
        const gridX = Math.floor(this.enemy.x / gridSize);
        const gridY = Math.floor(this.enemy.y / gridSize);
        const searchRadius = Math.ceil(this.separationRadius / gridSize) + 1; // Grid cells to search

        const nearbyEnemies = [];

        // Search neighboring grid cells
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                const key = game.encodeGridKey(gridX + dx, gridY + dy);
                const cell = game.spatialGrid.get(key);

                if (cell) {
                    for (const entity of cell) {
                        if (entity && entity.type === 'enemy' && !entity.isDead) {
                            nearbyEnemies.push(entity);
                        }
                    }
                }
            }
        }

        return nearbyEnemies;
    }

    /**
     * Configure AI for specific enemy type
     */
    configureForEnemyType(enemyType) {
        switch (enemyType) {
            case 'basic':
                this.attackCooldown = 2.0;
                this.separationRadius = 30;
                break;
            case 'fast':
                this.attackCooldown = 1.3 + Math.random() * 0.4; // Random 1.3-1.7s instead of fixed 1.5s
                this.separationRadius = 25;
                this.targetUpdateInterval = 0.5 + Math.random() * 0.3; // Random 0.5-0.8s to desync
                break;
            case 'tank':
                this.attackCooldown = 3.0;
                this.separationRadius = 40;
                this.isAggressive = true;
                break;
            case 'ranged':
                this.attackCooldown = 2.5;
                this.separationRadius = 35;
                this.canAttackPlayer = true;
                break;
            case 'dasher':
                this.attackCooldown = 2.0;
                this.separationRadius = 20;
                this.isAggressive = true;
                break;
            case 'boss':
                this.attackCooldown = 1.5;
                this.separationRadius = 50;
                this.isAggressive = true;
                this.canUseSpecialAbilities = true;
                this.maxTargetDistance = 1200;
                break;
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemyAI = EnemyAI;
}

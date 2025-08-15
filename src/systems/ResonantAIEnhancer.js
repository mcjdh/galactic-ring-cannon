/**
 * 🌊 RESONANT AI ENHANCER
 * 
 * Advanced AI system that enhances enemy intelligence with:
 * - Dynamic difficulty scaling
 * - Predictive player movement
 * - Adaptive attack patterns
 * - Emergent group behaviors
 * - Performance-aware AI quality scaling
 */

class ResonantAIEnhancer {
    constructor() {
        this.playerBehaviorAnalyzer = new PlayerBehaviorAnalyzer();
        this.groupBehaviorManager = new GroupBehaviorManager();
        this.adaptiveDifficulty = new AdaptiveDifficultyScaler();
        
        this.aiQualityMode = 'high'; // high, medium, low
        this.isEnabled = false;
        
        this.statistics = {
            decisionsPerSecond: 0,
            avgDecisionTime: 0,
            predictionAccuracy: 0,
            groupCoordination: 0
        };
        
        this.initializeEnhancements();
    }
    
    /**
     * Initialize AI enhancements
     */
    initializeEnhancements() {
        this.hookEnemyAI();
        this.setupPerformanceScaling();
        
        if (window.logger?.debug) {
            window.logger.debug('🌊 ResonantAIEnhancer initialized');
        }
    }
    
    /**
     * Hook into existing EnemyAI for enhancements
     */
    hookEnemyAI() {
        if (typeof EnemyAI !== 'undefined') {
            const originalUpdate = EnemyAI.prototype.update;
            const enhancer = this;
            
            EnemyAI.prototype.update = function(deltaTime, game) {
                if (enhancer.isEnabled) {
                    // Enhanced AI decision making
                    const startTime = performance.now();
                    
                    // Analyze player behavior for predictions
                    const playerAnalysis = enhancer.playerBehaviorAnalyzer.analyze(game.player);
                    
                    // Enhanced targeting with prediction
                    this.enhancedTargeting(playerAnalysis, game);
                    
                    // Group behavior coordination
                    enhancer.groupBehaviorManager.coordinateEnemy(this.enemy, game);
                    
                    // Adaptive difficulty scaling
                    enhancer.adaptiveDifficulty.scaleEnemy(this.enemy, game);
                    
                    const endTime = performance.now();
                    enhancer.updateStatistics(endTime - startTime);
                }
                
                // Original AI update
                return originalUpdate.call(this, deltaTime, game);
            };
            
            // Add enhanced targeting method
            EnemyAI.prototype.enhancedTargeting = function(playerAnalysis, game) {
                if (!game.player || !playerAnalysis) return;
                
                // Predict where player will be
                const prediction = this.predictPlayerPosition(playerAnalysis, game.player);
                
                // Adjust targeting based on prediction
                if (prediction && this.enemy.abilities?.canRangeAttack) {
                    this.targetDirection = {
                        x: prediction.x - this.enemy.x,
                        y: prediction.y - this.enemy.y
                    };
                    
                    // Normalize
                    const length = Math.sqrt(this.targetDirection.x ** 2 + this.targetDirection.y ** 2);
                    if (length > 0) {
                        this.targetDirection.x /= length;
                        this.targetDirection.y /= length;
                    }
                }
            };
            
            // Add prediction method
            EnemyAI.prototype.predictPlayerPosition = function(analysis, player) {
                if (!analysis.movementPattern) return null;
                
                const pattern = analysis.movementPattern;
                const predictionTime = 0.5; // Predict 0.5 seconds ahead
                
                return {
                    x: player.x + (pattern.velocityX * predictionTime),
                    y: player.y + (pattern.velocityY * predictionTime)
                };
            };
            
            window.logger?.debug('✅ Enhanced EnemyAI with predictive targeting');
        }
    }
    
    /**
     * Setup performance-aware AI quality scaling
     */
    setupPerformanceScaling() {
        // Monitor frame rate and adjust AI quality
        let frameTimeHistory = [];
        
        const scaleAIQuality = () => {
            const currentTime = performance.now();
            frameTimeHistory.push(currentTime);
            
            if (frameTimeHistory.length > 60) {
                frameTimeHistory.shift();
                
                // Calculate average frame time
                let totalFrameTime = 0;
                for (let i = 1; i < frameTimeHistory.length; i++) {
                    totalFrameTime += frameTimeHistory[i] - frameTimeHistory[i-1];
                }
                const avgFrameTime = totalFrameTime / (frameTimeHistory.length - 1);
                
                // Adjust AI quality based on performance
                if (avgFrameTime > 20) { // Below 50fps
                    this.aiQualityMode = 'low';
                } else if (avgFrameTime > 18) { // Below 55fps
                    this.aiQualityMode = 'medium';
                } else {
                    this.aiQualityMode = 'high';
                }
            }
            
            if (this.isEnabled) {
                requestAnimationFrame(scaleAIQuality);
            }
        };
        
        scaleAIQuality();
    }
    
    /**
     * Update performance statistics
     */
    updateStatistics(decisionTime) {
        this.statistics.avgDecisionTime = (this.statistics.avgDecisionTime * 0.9) + (decisionTime * 0.1);
        this.statistics.decisionsPerSecond++;
    }
    
    /**
     * Enable AI enhancements
     */
    enable() {
        this.isEnabled = true;
        window.logger?.log('🌊 ResonantAIEnhancer enabled');
    }
    
    /**
     * Disable AI enhancements
     */
    disable() {
        this.isEnabled = false;
        window.logger?.log('🌊 ResonantAIEnhancer disabled');
    }
    
    /**
     * Get AI statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            qualityMode: this.aiQualityMode,
            enabled: this.isEnabled
        };
    }
}

/**
 * Player Behavior Analyzer
 * Tracks player patterns for AI prediction
 */
class PlayerBehaviorAnalyzer {
    constructor() {
        this.behaviorHistory = [];
        this.maxHistoryLength = 100;
        
        this.patterns = {
            movementPattern: null,
            dodgePattern: null,
            combatPattern: null
        };
    }
    
    /**
     * Analyze current player behavior
     */
    analyze(player) {
        if (!player) return null;
        
        // Record current behavior
        const behavior = {
            timestamp: performance.now(),
            position: { x: player.x, y: player.y },
            health: player.health,
            isMoving: player.movement?.isMoving || false,
            isDodging: player.movement?.isDodging || false,
            recentAttack: player.combat?.attackTimer < 0.1
        };
        
        this.behaviorHistory.push(behavior);
        
        if (this.behaviorHistory.length > this.maxHistoryLength) {
            this.behaviorHistory.shift();
        }
        
        // Analyze patterns
        this.analyzeMovementPattern();
        this.analyzeCombatPattern();
        
        return {
            movementPattern: this.patterns.movementPattern,
            combatPattern: this.patterns.combatPattern,
            currentBehavior: behavior
        };
    }
    
    /**
     * Analyze player movement patterns
     */
    analyzeMovementPattern() {
        if (this.behaviorHistory.length < 10) return;
        
        const recent = this.behaviorHistory.slice(-10);
        let totalVelocityX = 0;
        let totalVelocityY = 0;
        let dodgeCount = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const current = recent[i];
            const previous = recent[i-1];
            const deltaTime = (current.timestamp - previous.timestamp) / 1000;
            
            if (deltaTime > 0) {
                totalVelocityX += (current.position.x - previous.position.x) / deltaTime;
                totalVelocityY += (current.position.y - previous.position.y) / deltaTime;
            }
            
            if (current.isDodging) dodgeCount++;
        }
        
        this.patterns.movementPattern = {
            velocityX: totalVelocityX / (recent.length - 1),
            velocityY: totalVelocityY / (recent.length - 1),
            dodgeFrequency: dodgeCount / recent.length,
            isPredictable: Math.abs(totalVelocityX) + Math.abs(totalVelocityY) > 50
        };
    }
    
    /**
     * Analyze player combat patterns
     */
    analyzeCombatPattern() {
        if (this.behaviorHistory.length < 20) return;
        
        const recent = this.behaviorHistory.slice(-20);
        let attackCount = 0;
        let healthLossRate = 0;
        
        for (const behavior of recent) {
            if (behavior.recentAttack) attackCount++;
        }
        
        // Calculate health loss rate
        if (recent.length >= 2) {
            const healthChange = recent[0].health - recent[recent.length - 1].health;
            const timeSpan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000;
            healthLossRate = healthChange / Math.max(timeSpan, 0.1);
        }
        
        this.patterns.combatPattern = {
            attackFrequency: attackCount / recent.length,
            healthLossRate: healthLossRate,
            isAggressive: attackCount > recent.length * 0.3
        };
    }
}

/**
 * Group Behavior Manager
 * Coordinates enemy group tactics
 */
class GroupBehaviorManager {
    constructor() {
        this.enemyGroups = new Map();
        this.groupFormations = ['scatter', 'surround', 'pincer', 'swarm'];
        this.coordinationRadius = 200;
    }
    
    /**
     * Coordinate enemy with nearby allies
     */
    coordinateEnemy(enemy, game) {
        if (!enemy || !game.entities) return;
        
        const nearbyEnemies = this.findNearbyEnemies(enemy, game.entities);
        
        if (nearbyEnemies.length >= 2) {
            const formation = this.selectFormation(nearbyEnemies, game.player);
            this.applyFormation(enemy, nearbyEnemies, formation, game.player);
        }
    }
    
    /**
     * Find enemies within coordination radius
     */
    findNearbyEnemies(enemy, entities) {
        const nearby = [];
        
        for (const entity of entities) {
            if (entity.type === 'enemy' && entity !== enemy && !entity.isDead) {
                const distance = Math.sqrt(
                    (entity.x - enemy.x) ** 2 + (entity.y - enemy.y) ** 2
                );
                
                if (distance <= this.coordinationRadius) {
                    nearby.push(entity);
                }
            }
        }
        
        return nearby;
    }
    
    /**
     * Select appropriate formation based on situation
     */
    selectFormation(enemies, player) {
        if (!player) return 'scatter';
        
        const enemyCount = enemies.length;
        
        if (enemyCount < 3) return 'pincer';
        if (enemyCount < 6) return 'surround';
        return 'swarm';
    }
    
    /**
     * Apply formation to enemy
     */
    applyFormation(enemy, allies, formation, player) {
        if (!player || !enemy.ai) return;
        
        switch (formation) {
            case 'surround':
                this.applySurroundFormation(enemy, allies, player);
                break;
            case 'pincer':
                this.applyPincerFormation(enemy, allies, player);
                break;
            case 'swarm':
                this.applySwarmFormation(enemy, allies, player);
                break;
            default:
                // Scatter - default behavior
                break;
        }
    }
    
    /**
     * Apply surround formation
     */
    applySurroundFormation(enemy, allies, player) {
        const totalEnemies = allies.length + 1;
        const enemyIndex = allies.indexOf(enemy);
        const angle = (2 * Math.PI * enemyIndex) / totalEnemies;
        
        const surroundRadius = 100;
        const targetX = player.x + Math.cos(angle) * surroundRadius;
        const targetY = player.y + Math.sin(angle) * surroundRadius;
        
        if (enemy.movement) {
            enemy.movement.setTarget(targetX, targetY);
        }
    }
    
    /**
     * Apply pincer formation
     */
    applyPincerFormation(enemy, allies, player) {
        // Split into two groups approaching from different angles
        const isFirstGroup = allies.indexOf(enemy) < allies.length / 2;
        const approachAngle = isFirstGroup ? -Math.PI/4 : Math.PI/4;
        
        const distance = 150;
        const targetX = player.x + Math.cos(approachAngle) * distance;
        const targetY = player.y + Math.sin(approachAngle) * distance;
        
        if (enemy.movement) {
            enemy.movement.setTarget(targetX, targetY);
        }
    }
    
    /**
     * Apply swarm formation
     */
    applySwarmFormation(enemy, allies, player) {
        // All enemies converge on player with slight randomization
        const randomOffset = {
            x: (Math.random() - 0.5) * 50,
            y: (Math.random() - 0.5) * 50
        };
        
        if (enemy.movement) {
            enemy.movement.setTarget(
                player.x + randomOffset.x,
                player.y + randomOffset.y
            );
        }
    }
}

/**
 * Adaptive Difficulty Scaler
 * Adjusts enemy capabilities based on player performance
 */
class AdaptiveDifficultyScaler {
    constructor() {
        this.playerPerformanceHistory = [];
        this.difficultyMultiplier = 1.0;
        this.adaptationRate = 0.05; // How quickly difficulty adapts
    }
    
    /**
     * Scale enemy based on adaptive difficulty
     */
    scaleEnemy(enemy, game) {
        if (!game.player) return;
        
        // Update player performance tracking
        this.trackPlayerPerformance(game.player);
        
        // Calculate appropriate difficulty
        const targetDifficulty = this.calculateTargetDifficulty();
        
        // Gradually adjust difficulty
        if (targetDifficulty > this.difficultyMultiplier) {
            this.difficultyMultiplier += this.adaptationRate;
        } else if (targetDifficulty < this.difficultyMultiplier) {
            this.difficultyMultiplier -= this.adaptationRate;
        }
        
        this.difficultyMultiplier = Math.max(0.5, Math.min(2.0, this.difficultyMultiplier));
        
        // Apply scaling to enemy
        this.applyDifficultyScaling(enemy);
    }
    
    /**
     * Track player performance metrics
     */
    trackPlayerPerformance(player) {
        const performance = {
            timestamp: performance.now(),
            healthPercent: player.health / player.maxHealth,
            level: player.level,
            hasUpgrades: player.abilities?.getUpgrades?.().length || 0
        };
        
        this.playerPerformanceHistory.push(performance);
        
        if (this.playerPerformanceHistory.length > 50) {
            this.playerPerformanceHistory.shift();
        }
    }
    
    /**
     * Calculate target difficulty based on player performance
     */
    calculateTargetDifficulty() {
        if (this.playerPerformanceHistory.length < 10) return 1.0;
        
        const recent = this.playerPerformanceHistory.slice(-10);
        const avgHealthPercent = recent.reduce((sum, p) => sum + p.healthPercent, 0) / recent.length;
        const highestLevel = Math.max(...recent.map(p => p.level));
        
        // Calculate difficulty based on player strength
        let targetDifficulty = 1.0;
        
        if (avgHealthPercent > 0.8) {
            targetDifficulty += 0.3; // Player is doing well, increase challenge
        } else if (avgHealthPercent < 0.3) {
            targetDifficulty -= 0.3; // Player struggling, reduce challenge
        }
        
        if (highestLevel > 5) {
            targetDifficulty += (highestLevel - 5) * 0.1;
        }
        
        return Math.max(0.5, Math.min(2.0, targetDifficulty));
    }
    
    /**
     * Apply difficulty scaling to enemy
     */
    applyDifficultyScaling(enemy) {
        if (!enemy || this.difficultyMultiplier === 1.0) return;
        
        // Scale enemy stats based on difficulty
        if (enemy.ai) {
            // Adjust attack frequency
            if (enemy.ai.attackCooldown) {
                const baseCooldown = enemy.ai.baseAttackCooldown || enemy.ai.attackCooldown;
                enemy.ai.attackCooldown = baseCooldown / this.difficultyMultiplier;
                
                if (!enemy.ai.baseAttackCooldown) {
                    enemy.ai.baseAttackCooldown = baseCooldown;
                }
            }
            
            // Adjust targeting accuracy
            if (enemy.ai.targetUpdateInterval) {
                const baseInterval = enemy.ai.baseTargetInterval || enemy.ai.targetUpdateInterval;
                enemy.ai.targetUpdateInterval = baseInterval / Math.max(0.5, this.difficultyMultiplier);
                
                if (!enemy.ai.baseTargetInterval) {
                    enemy.ai.baseTargetInterval = baseInterval;
                }
            }
        }
    }
}

// Initialize AI enhancer
window.ResonantAIEnhancer = ResonantAIEnhancer;
window.resonantAIEnhancer = new ResonantAIEnhancer();

// Global convenience functions
window.enableAdvancedAI = () => window.resonantAIEnhancer.enable();
window.disableAdvancedAI = () => window.resonantAIEnhancer.disable();
window.getAIStats = () => window.resonantAIEnhancer.getStatistics();

// Auto-enable in debug mode
if (window.debugManager?.enabled || window.location.search.includes('debug=true')) {
    setTimeout(() => {
        window.resonantAIEnhancer.enable();
        console.log('🌊 ResonantAIEnhancer auto-enabled in debug mode');
    }, 3000);
}
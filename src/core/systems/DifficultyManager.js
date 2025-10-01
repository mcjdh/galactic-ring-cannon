/**
 * 🌊 UNIFIED DIFFICULTY MANAGER - Resonant Multi-Agent Architecture
 * 🤖 RESONANT NOTE: Extracted from massive GameManager.js (2,400+ lines)
 * Handles all difficulty scaling, progression curves, and adaptive balancing
 * 
 * Single responsibility: Manage game difficulty progression and scaling
 * Provides intelligent scaling based on player performance and time
 */

class DifficultyManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Get GAME_CONSTANTS from global scope
        const GAME_CONSTANTS = window.GAME_CONSTANTS || {
            DIFFICULTY: { BASE_INTERVAL: 20, MAX_FACTOR: 4.0 }
        };
        
        // Core difficulty system
        this.difficultyFactor = 1.0;
        this.difficultyTimer = 0;
        this.difficultyInterval = GAME_CONSTANTS.DIFFICULTY.BASE_INTERVAL || 20; // 20 seconds
        this.maxDifficultyFactor = GAME_CONSTANTS.DIFFICULTY.MAX_FACTOR || 4.0; // 4.0
        
        // Adaptive difficulty system
        this.playerPerformanceScore = 0;
        this.performanceHistory = [];
        this.maxPerformanceHistory = 10;
        
        // Enemy scaling parameters
        this.enemyHealthMultiplier = 1.0;
        this.enemyDamageMultiplier = 1.0;
        this.enemySpeedMultiplier = 1.0;
        this.enemySpawnRateMultiplier = 1.0;
        
        // Boss scaling parameters
        this.bossScalingFactor = 1.0;
        this.bossCount = 0;
        this.megaBossThreshold = 3; // 3rd boss becomes mega boss
        
        // Curve parameters for smooth scaling
        this.scalingCurves = {
            health: { base: 1.0, growth: 0.5, cap: 3.0 },
            damage: { base: 1.0, growth: 0.4, cap: 2.5 },
            speed: { base: 1.0, growth: 0.2, cap: 1.5 },
            spawnRate: { base: 1.0, growth: 0.6, cap: 2.0 }
        };
        
        // Performance tracking
        this.lastDifficultyIncrease = 0;
        this.difficultyNotificationCooldown = 5.0; // seconds
        this.lastNotification = 0;
        
        // Endless mode adjustments
        this.endlessMode = false;
        this.endlessModeMultiplier = 1.2;
    }
    
    /**
     * Main difficulty update loop
     */
    update(deltaTime) {
        // Update timers
        this.difficultyTimer += deltaTime;
        this.lastNotification += deltaTime;
        
        // Check for difficulty increases
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.increaseDifficulty();
            this.difficultyTimer = 0;
        }
        
        // Update player performance tracking
        this.updatePlayerPerformance();
        
        // Apply adaptive difficulty adjustments
        this.applyAdaptiveDifficulty();
        
        // Update scaling multipliers
        this.updateScalingMultipliers();
    }
    
    /**
     * Increase base difficulty level
     */
    increaseDifficulty() {
        const oldFactor = this.difficultyFactor;
        
        // Calculate new difficulty factor
        const timeMinutes = this.gameManager.gameTime / 60;
        const baseIncrease = 0.2; // Base 20% increase
        
        // Accelerated scaling for shorter games
        const timeMultiplier = Math.min(2.0, 1 + (timeMinutes * 0.1));
        const actualIncrease = baseIncrease * timeMultiplier;
        
        this.difficultyFactor = Math.min(this.maxDifficultyFactor, this.difficultyFactor + actualIncrease);
        
        // Apply endless mode multiplier
        if (this.endlessMode) {
            this.difficultyFactor *= this.endlessModeMultiplier;
        }
        
        // Show difficulty notification
        this.showDifficultyNotification(oldFactor);
        
        // Update last increase time
        this.lastDifficultyIncrease = this.gameManager.gameTime;
        
        // Trigger adaptive scaling
        this.recalculateScaling();
    }
    
    /**
     * Update player performance tracking
     */
    updatePlayerPerformance() {
        if (!this.gameManager.game.player) return;
        
        const player = this.gameManager.game.player;
        const currentTime = this.gameManager.gameTime;
        
        // Calculate performance metrics
        const killsPerMinute = this.gameManager.killCount / Math.max(1, currentTime / 60);
        const healthPercent = player.health / player.maxHealth;
        const levelProgress = player.level;
        
        // Combined performance score (0-100)
        const performanceScore = Math.min(100, 
            (killsPerMinute * 2) + 
            (healthPercent * 20) + 
            (levelProgress * 5)
        );
        
        // Add to history
        this.performanceHistory.push({
            time: currentTime,
            score: performanceScore,
            killsPerMinute: killsPerMinute,
            healthPercent: healthPercent,
            level: levelProgress
        });
        
        // Maintain history size
        if (this.performanceHistory.length > this.maxPerformanceHistory) {
            this.performanceHistory.shift();
        }
        
        // Calculate average performance
        this.playerPerformanceScore = this.performanceHistory.reduce((sum, entry) => sum + entry.score, 0) / this.performanceHistory.length;
    }
    
    /**
     * Apply adaptive difficulty adjustments
     */
    applyAdaptiveDifficulty() {
        if (this.performanceHistory.length < 3) return; // Need some history
        
        const targetPerformance = 60; // Target 60% performance score
        const performanceDelta = this.playerPerformanceScore - targetPerformance;
        
        // Adaptive scaling factor (-0.2 to +0.2)
        const adaptiveAdjustment = Math.max(-0.2, Math.min(0.2, performanceDelta / 100));
        
        // Apply gentle adaptive scaling
        const adaptiveFactor = 1.0 + (adaptiveAdjustment * 0.1); // Max 2% adjustment
        
        // Store adaptive factor for use in scaling calculations
        this.adaptiveScalingFactor = adaptiveFactor;
    }
    
    /**
     * Update all scaling multipliers
     */
    updateScalingMultipliers() {
        const baseFactor = this.difficultyFactor;
        const adaptiveFactor = this.adaptiveScalingFactor || 1.0;
        
        // Calculate multipliers using smooth curves
        this.enemyHealthMultiplier = this.calculateScaledValue('health', baseFactor) * adaptiveFactor;
        this.enemyDamageMultiplier = this.calculateScaledValue('damage', baseFactor) * adaptiveFactor;
        this.enemySpeedMultiplier = this.calculateScaledValue('speed', baseFactor) * adaptiveFactor;
        this.enemySpawnRateMultiplier = this.calculateScaledValue('spawnRate', baseFactor) * adaptiveFactor;
        
        // Boss scaling is more conservative
        this.bossScalingFactor = 1.0 + ((baseFactor - 1.0) * 0.8) * adaptiveFactor;
    }
    
    /**
     * Calculate scaled value using smooth curve
     */
    calculateScaledValue(curveType, difficultyFactor) {
        const curve = this.scalingCurves[curveType];
        if (!curve) return 1.0;
        
        // Smooth exponential curve: base + (growth * (factor - 1)^0.8)
        const scaledIncrease = curve.growth * Math.pow(difficultyFactor - 1.0, 0.8);
        const result = curve.base + scaledIncrease;
        
        return Math.min(curve.cap, result);
    }
    
    /**
     * Recalculate all scaling after difficulty change
     */
    recalculateScaling() {
        this.updateScalingMultipliers();
        
        // Notify other systems of difficulty change
        if (this.gameManager.enemySpawner && this.gameManager.enemySpawner.onDifficultyChange) {
            this.gameManager.enemySpawner.onDifficultyChange(this.difficultyFactor);
        }
    }
    
    /**
     * Show difficulty increase notification
     */
    showDifficultyNotification(oldFactor) {
        if (this.lastNotification < this.difficultyNotificationCooldown) return;
        
        const difficultyIncrease = this.difficultyFactor - oldFactor;
        
        // Only show significant increases
        if (difficultyIncrease >= 0.15 && Math.floor(this.difficultyFactor * 10) % 5 === 0) {
            const player = this.gameManager.game.player;
            if (player && this.gameManager.effectsManager) {
                this.gameManager.effectsManager.showCombatText(
                    `Difficulty Increased! (x${this.difficultyFactor.toFixed(1)})`,
                    player.x, player.y - 70,
                    'critical', 20
                );
                
                // Add screen shake for dramatic effect
                this.gameManager.effectsManager.addScreenShake(3, 0.3);
            }
            
            this.lastNotification = 0;
        }
    }
    
    /**
     * Apply difficulty scaling to an enemy
     */
    scaleEnemy(enemy) {
        if (!enemy) return;
        
        // Store original values if not already stored
        if (!enemy.originalStats) {
            enemy.originalStats = {
                health: enemy.health,
                maxHealth: enemy.maxHealth,
                damage: enemy.damage,
                speed: enemy.baseSpeed || enemy.speed,
                xpValue: enemy.xpValue
            };
        }
        
        // Apply scaling
        const healthScale = this.enemyHealthMultiplier;
        const damageScale = this.enemyDamageMultiplier;
        const speedScale = this.enemySpeedMultiplier;
        
        enemy.maxHealth = Math.ceil(enemy.originalStats.maxHealth * healthScale);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.ceil(enemy.originalStats.damage * damageScale);
        
        // Apply speed scaling if enemy has movement component
        if (enemy.movement && enemy.movement.configureForEnemyType) {
            enemy.movement.speed = enemy.originalStats.speed * speedScale;
        } else if (enemy.speed !== undefined) {
            enemy.speed = enemy.originalStats.speed * speedScale;
        }
        
        // Scale XP reward proportionally to difficulty
        const xpScale = 1.0 + ((healthScale - 1.0) * 0.7); // XP scales 70% of health scaling
        enemy.xpValue = Math.ceil(enemy.originalStats.xpValue * xpScale);
        
        // Apply time-based late-game scaling
        this.applyLateGameScaling(enemy);
    }
    
    /**
     * Apply late-game scaling for sustained challenge
     */
    applyLateGameScaling(enemy) {
        const gameMinutes = this.gameManager.gameTime / 60;
        
        if (gameMinutes > 5) {
            // Additional scaling after 5 minutes
            const lateGameFactor = Math.min(1.5, 1 + ((gameMinutes - 5) * 0.05));
            enemy.maxHealth = Math.ceil(enemy.maxHealth * lateGameFactor);
            enemy.health = enemy.maxHealth;
        }
    }
    
    /**
     * Scale boss enemy with special considerations
     */
    scaleBoss(boss) {
        if (!boss) return;
        
        this.bossCount++;
        const isMegaBoss = this.bossCount >= this.megaBossThreshold;
        
        // Get player stats for intelligent scaling
        const player = this.gameManager.game.player;
        const playerLevel = player ? player.level : 1;
        const playerDamage = player ? (player.combat?.attackDamage || player.attackDamage || 25) : 25;
        const playerAttackSpeed = player ? (player.combat?.attackSpeed || player.attackSpeed || 1.2) : 1.2;
        
        // Calculate DPS-based minimum health
        const estimatedPlayerDPS = playerDamage * playerAttackSpeed;
        const minimumFightDuration = isMegaBoss ? 10 : 7; // seconds
        const minimumBossHealth = estimatedPlayerDPS * minimumFightDuration;
        
        // Apply boss scaling
        const bossHealthScale = this.bossScalingFactor * (isMegaBoss ? 1.5 : 1.0);
        const scaledHealth = Math.max(minimumBossHealth, boss.maxHealth * bossHealthScale);
        
        boss.maxHealth = Math.ceil(scaledHealth);
        boss.health = boss.maxHealth;
        
        // Conservative damage scaling to avoid one-shots
        boss.damage = Math.ceil(boss.damage * Math.sqrt(this.bossScalingFactor));
        
        // Increase XP reward proportionally
        boss.xpValue = Math.ceil(boss.xpValue * bossHealthScale);
        
        // Add damage resistance for high-DPS scenarios
        boss.damageResistance = Math.min(0.5, 0.2 + (this.bossCount * 0.02));
        
        // Set mega boss flag
        if (isMegaBoss) {
            boss.isMegaBoss = true;
            boss.radius *= 1.2;
            boss.color = '#8e44ad'; // Purple for mega bosses
        }
        
        return boss;
    }
    
    /**
     * Get current difficulty metrics
     */
    getDifficultyMetrics() {
        return {
            difficultyFactor: this.difficultyFactor,
            enemyHealthMultiplier: this.enemyHealthMultiplier,
            enemyDamageMultiplier: this.enemyDamageMultiplier,
            enemySpeedMultiplier: this.enemySpeedMultiplier,
            enemySpawnRateMultiplier: this.enemySpawnRateMultiplier,
            bossScalingFactor: this.bossScalingFactor,
            playerPerformanceScore: this.playerPerformanceScore,
            adaptiveScalingFactor: this.adaptiveScalingFactor || 1.0,
            timeMinutes: this.gameManager.gameTime / 60,
            bossCount: this.bossCount
        };
    }
    
    /**
     * Set endless mode
     */
    setEndlessMode(enabled) {
        this.endlessMode = enabled;
        
        if (enabled) {
            // Adjust parameters for endless mode
            this.difficultyInterval *= 0.8; // Faster scaling
            this.maxDifficultyFactor = 10.0; // Higher cap
            this.scalingCurves.health.cap = 5.0;
            this.scalingCurves.damage.cap = 4.0;
        }
    }
    
    /**
     * Reset difficulty (for new game)
     */
    reset() {
        this.difficultyFactor = 1.0;
        this.difficultyTimer = 0;
        this.playerPerformanceScore = 0;
        this.performanceHistory = [];
        this.bossCount = 0;
        this.lastDifficultyIncrease = 0;
        this.lastNotification = 0;
        this.adaptiveScalingFactor = 1.0;
        
        this.updateScalingMultipliers();
    }
    
    /**
     * Get difficulty state for debugging/UI
     */
    getDifficultyState() {
        return {
            ...this.getDifficultyMetrics(),
            nextIncreaseIn: this.difficultyInterval - this.difficultyTimer,
            performanceHistoryLength: this.performanceHistory.length,
            endlessMode: this.endlessMode,
            timeSinceLastIncrease: this.gameManager.gameTime - this.lastDifficultyIncrease
        };
    }
}

// Also make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.DifficultyManager = DifficultyManager;
    window.DifficultyManager = DifficultyManager;
}

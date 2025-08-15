/**
 * 🌊 UNIFIED STATS MANAGER - Resonant Multi-Agent Architecture
 * 🤖 RESONANT NOTE: Extracted from massive GameManager.js (2,400+ lines)
 * Handles all statistics tracking, achievements, combos, and progression
 * 
 * Single responsibility: Track and manage all game statistics and progression
 * Coordinates with achievements system and provides analytics
 */

class StatsManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Get GAME_CONSTANTS from global scope
        const GAME_CONSTANTS = window.GAME_CONSTANTS || {
            COMBO: { TIMEOUT: 0.8, TARGET: 8, MAX_MULTIPLIER: 2.5 },
            DIFFICULTY: { BASE_INTERVAL: 20 }
        };
        
        // Core game statistics
        this.killCount = 0;
        this.xpCollected = 0;
        this.totalDamageDealt = 0;
        this.totalDamageTaken = 0;
        this.projectilesFired = 0;
        this.distanceTraveled = 0;
        
        // Session statistics
        this.sessionStats = {
            startTime: Date.now(),
            gameTime: 0,
            highestLevel: 1,
            highestCombo: 0,
            bossesKilled: 0,
            elitesKilled: 0,
            perfectDodges: 0,
            criticalHits: 0,
            ricochetKills: 0,
            explosionKills: 0
        };
        
        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboTimeout = GAME_CONSTANTS.COMBO.TIMEOUT; // 0.8 seconds
        this.comboTarget = GAME_CONSTANTS.COMBO.TARGET; // 8 kills
        this.highestCombo = 0;
        this.comboMultiplier = 1.0;
        this.maxComboMultiplier = GAME_CONSTANTS.COMBO.MAX_MULTIPLIER; // 2.5
        
        // Achievement tracking
        this.achievementProgress = new Map();
        this.unlockedAchievements = new Set();
        this.achievementNotifications = [];
        
        // Star token system
        this.starTokens = parseInt(localStorage.getItem('starTokens') || '0', 10);
        this.starTokensEarned = 0;
        
        // Progression tracking
        this.gameStats = {
            highestEnemyCount: 0,
            totalEnemiesSpawned: 0,
            bossesSpawned: 0,
            wavesCompleted: 0,
            upgradesChosen: 0,
            deathsThisSession: 0
        };
        
        // Performance analytics
        this.performanceMetrics = {
            averageKillsPerMinute: 0,
            averageXPPerMinute: 0,
            survivalTime: 0,
            efficiencyScore: 0,
            difficultyRating: 0
        };
        
        // Milestone tracking
        this.milestones = {
            kills: [10, 25, 50, 100, 250, 500, 1000],
            level: [5, 10, 15, 20, 25, 30],
            time: [60, 180, 300, 600, 900], // seconds
            bosses: [1, 3, 5, 10, 15]
        };
        this.achievedMilestones = new Set();
        
        // Load persistent stats
        this.loadPersistentStats();
    }
    
    /**
     * Main stats update loop
     */
    update(deltaTime) {
        // Update timers
        this.updateTimers(deltaTime);
        
        // Update combo system
        this.updateComboSystem(deltaTime);
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        // Check for milestones
        this.checkMilestones();
        
        // Update session time
        this.sessionStats.gameTime = this.gameManager.gameTime;
    }
    
    /**
     * Update internal timers
     */
    updateTimers(deltaTime) {
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }
    
    /**
     * Update combo system
     */
    updateComboSystem(deltaTime) {
        // Calculate combo multiplier based on current combo
        if (this.comboCount >= this.comboTarget) {
            const bonusCombo = this.comboCount - this.comboTarget;
            const bonusMultiplier = Math.min(
                this.maxComboMultiplier - 1.0,
                bonusCombo * 0.1 // 10% per kill above target
            );
            this.comboMultiplier = 1.0 + bonusMultiplier;
        } else {
            this.comboMultiplier = 1.0;
        }
        
        // Update highest combo
        if (this.comboCount > this.highestCombo) {
            this.highestCombo = this.comboCount;
            this.sessionStats.highestCombo = this.highestCombo;
        }
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const timeMinutes = Math.max(0.1, this.gameManager.gameTime / 60);
        
        this.performanceMetrics.averageKillsPerMinute = this.killCount / timeMinutes;
        this.performanceMetrics.averageXPPerMinute = this.xpCollected / timeMinutes;
        this.performanceMetrics.survivalTime = this.gameManager.gameTime;
        
        // Calculate efficiency score (0-100)
        const player = this.gameManager.game.player;
        if (player) {
            const healthEfficiency = player.health / player.maxHealth;
            const levelEfficiency = Math.min(1.0, player.level / 20); // Normalize to level 20
            const killEfficiency = Math.min(1.0, this.performanceMetrics.averageKillsPerMinute / 30); // 30 KPM is excellent
            
            this.performanceMetrics.efficiencyScore = Math.floor(
                (healthEfficiency * 30 + levelEfficiency * 35 + killEfficiency * 35)
            );
        }
        
        // Calculate difficulty rating
        if (this.gameManager.difficultyManager) {
            this.performanceMetrics.difficultyRating = this.gameManager.difficultyManager.difficultyFactor;
        }
    }
    
    /**
     * Check for milestone achievements
     */
    checkMilestones() {
        // Kill milestones
        this.milestones.kills.forEach(milestone => {
            const key = `kills_${milestone}`;
            if (this.killCount >= milestone && !this.achievedMilestones.has(key)) {
                this.achievedMilestones.add(key);
                this.triggerMilestone('kills', milestone);
            }
        });
        
        // Level milestones
        const player = this.gameManager.game.player;
        if (player) {
            this.milestones.level.forEach(milestone => {
                const key = `level_${milestone}`;
                if (player.level >= milestone && !this.achievedMilestones.has(key)) {
                    this.achievedMilestones.add(key);
                    this.triggerMilestone('level', milestone);
                }
            });
        }
        
        // Time milestones
        this.milestones.time.forEach(milestone => {
            const key = `time_${milestone}`;
            if (this.gameManager.gameTime >= milestone && !this.achievedMilestones.has(key)) {
                this.achievedMilestones.add(key);
                this.triggerMilestone('time', milestone);
            }
        });
        
        // Boss milestones
        this.milestones.bosses.forEach(milestone => {
            const key = `bosses_${milestone}`;
            if (this.sessionStats.bossesKilled >= milestone && !this.achievedMilestones.has(key)) {
                this.achievedMilestones.add(key);
                this.triggerMilestone('bosses', milestone);
            }
        });
    }
    
    /**
     * Trigger milestone achievement
     */
    triggerMilestone(type, value) {
        let message = '';
        let color = 'combo';
        
        switch (type) {
            case 'kills':
                message = `${value} KILLS MILESTONE!`;
                color = 'critical';
                break;
            case 'level':
                message = `LEVEL ${value} REACHED!`;
                color = 'xp';
                break;
            case 'time':
                const minutes = Math.floor(value / 60);
                const seconds = value % 60;
                message = seconds > 0 ? 
                    `${minutes}:${seconds.toString().padStart(2, '0')} SURVIVED!` :
                    `${minutes} MINUTE${minutes > 1 ? 'S' : ''} SURVIVED!`;
                color = 'heal';
                break;
            case 'bosses':
                message = `${value} BOSS${value > 1 ? 'ES' : ''} DEFEATED!`;
                color = 'critical';
                break;
        }
        
        // Show milestone notification
        if (this.gameManager.effectsManager && this.gameManager.game.player) {
            this.gameManager.effectsManager.showCombatText(
                message,
                this.gameManager.game.player.x,
                this.gameManager.game.player.y - 60,
                color, 24
            );
            
            // Add screen shake for major milestones
            if (type === 'bosses' || (type === 'kills' && value >= 100)) {
                this.gameManager.effectsManager.addScreenShake(5, 0.5);
            }
        }
        
        // Award star tokens for significant milestones
        this.awardMilestoneTokens(type, value);
    }
    
    /**
     * Award star tokens for milestones
     */
    awardMilestoneTokens(type, value) {
        let tokensToAward = 0;
        
        switch (type) {
            case 'kills':
                if (value >= 500) tokensToAward = 3;
                else if (value >= 250) tokensToAward = 2;
                else if (value >= 100) tokensToAward = 1;
                break;
            case 'level':
                if (value >= 25) tokensToAward = 3;
                else if (value >= 15) tokensToAward = 2;
                else if (value >= 10) tokensToAward = 1;
                break;
            case 'time':
                if (value >= 900) tokensToAward = 5; // 15 minutes
                else if (value >= 600) tokensToAward = 3; // 10 minutes
                else if (value >= 300) tokensToAward = 2; // 5 minutes
                else if (value >= 180) tokensToAward = 1; // 3 minutes
                break;
            case 'bosses':
                tokensToAward = value; // 1 token per boss milestone
                break;
        }
        
        if (tokensToAward > 0) {
            this.earnStarTokens(tokensToAward);
        }
    }
    
    /**
     * Increment kill count and handle combo
     */
    incrementKills() {
        this.killCount++;
        this.gameStats.totalEnemiesSpawned++; // Track total spawned
        
        // Handle combo system
        this.comboCount++;
        this.comboTimer = this.comboTimeout;
        
        // Update session stats
        this.updateSessionStats('kill');
        
        return this.killCount;
    }
    
    /**
     * Reset combo system
     */
    resetCombo() {
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1.0;
    }
    
    /**
     * Track boss kill
     */
    onBossKilled() {
        this.sessionStats.bossesKilled++;
        this.gameStats.bossesSpawned++;
        
        // Award star tokens for boss kills
        this.earnStarTokens(1);
        
        // Check for Jupiter star drop upgrade
        const extraStars = parseInt(localStorage.getItem('meta_jupiter_star_drop') || '0', 10);
        if (extraStars > 0) {
            this.earnStarTokens(extraStars);
        }
    }
    
    /**
     * Track XP collection
     */
    collectXP(amount) {
        this.xpCollected += amount;
        
        // Apply combo multiplier
        const bonusXP = Math.floor(amount * (this.comboMultiplier - 1.0));
        if (bonusXP > 0) {
            this.xpCollected += bonusXP;
            return amount + bonusXP;
        }
        
        return amount;
    }
    
    /**
     * Track damage dealt
     */
    trackDamageDealt(amount) {
        this.totalDamageDealt += amount;
    }
    
    /**
     * Track damage taken
     */
    trackDamageTaken(amount) {
        this.totalDamageTaken += amount;
    }
    
    /**
     * Track projectile fired
     */
    trackProjectileFired() {
        this.projectilesFired++;
    }
    
    /**
     * Track special events
     */
    trackSpecialEvent(eventType, data = {}) {
        switch (eventType) {
            case 'critical_hit':
                this.sessionStats.criticalHits++;
                break;
            case 'perfect_dodge':
                this.sessionStats.perfectDodges++;
                break;
            case 'ricochet_kill':
                this.sessionStats.ricochetKills++;
                break;
            case 'explosion_kill':
                this.sessionStats.explosionKills++;
                break;
            case 'elite_kill':
                this.sessionStats.elitesKilled++;
                break;
            case 'upgrade_chosen':
                this.gameStats.upgradesChosen++;
                break;
            case 'wave_completed':
                this.gameStats.wavesCompleted++;
                break;
        }
    }
    
    /**
     * Update session statistics
     */
    updateSessionStats(eventType) {
        const player = this.gameManager.game.player;
        
        if (player && player.level > this.sessionStats.highestLevel) {
            this.sessionStats.highestLevel = player.level;
        }
        
        // Update enemy count tracking
        if (this.gameManager.game.enemies) {
            const currentEnemyCount = this.gameManager.game.enemies.length;
            if (currentEnemyCount > this.gameStats.highestEnemyCount) {
                this.gameStats.highestEnemyCount = currentEnemyCount;
            }
        }
    }
    
    /**
     * Earn star tokens
     */
    earnStarTokens(amount) {
        this.starTokens += amount;
        this.starTokensEarned += amount;
        
        // Save to localStorage
        localStorage.setItem('starTokens', this.starTokens.toString());
        
        // Show notification
        if (this.gameManager.effectsManager && this.gameManager.game.player) {
            this.gameManager.effectsManager.showCombatText(
                `+${amount} ⭐`,
                this.gameManager.game.player.x,
                this.gameManager.game.player.y - 40,
                'xp', 18
            );
        }
    }
    
    /**
     * Spend star tokens
     */
    spendStarTokens(amount) {
        if (this.starTokens >= amount) {
            this.starTokens -= amount;
            localStorage.setItem('starTokens', this.starTokens.toString());
            return true;
        }
        return false;
    }
    
    /**
     * Load persistent statistics
     */
    loadPersistentStats() {
        try {
            const savedStats = localStorage.getItem('gameStats');
            if (savedStats) {
                const parsed = JSON.parse(savedStats);
                // Load persistent stats but keep session stats separate
                this.totalDamageDealt = parsed.totalDamageDealt || 0;
                this.totalDamageTaken = parsed.totalDamageTaken || 0;
                this.projectilesFired = parsed.projectilesFired || 0;
                this.distanceTraveled = parsed.distanceTraveled || 0;
            }
        } catch (error) {
            console.warn('Failed to load persistent stats:', error);
        }
    }
    
    /**
     * Save persistent statistics
     */
    savePersistentStats() {
        try {
            const statsToSave = {
                totalDamageDealt: this.totalDamageDealt,
                totalDamageTaken: this.totalDamageTaken,
                projectilesFired: this.projectilesFired,
                distanceTraveled: this.distanceTraveled,
                lastSaved: Date.now()
            };
            
            localStorage.setItem('gameStats', JSON.stringify(statsToSave));
        } catch (error) {
            console.warn('Failed to save persistent stats:', error);
        }
    }
    
    /**
     * Get comprehensive statistics summary
     */
    getStatsSummary() {
        return {
            // Core stats
            killCount: this.killCount,
            xpCollected: this.xpCollected,
            totalDamageDealt: this.totalDamageDealt,
            totalDamageTaken: this.totalDamageTaken,
            projectilesFired: this.projectilesFired,
            
            // Session stats
            ...this.sessionStats,
            
            // Game stats
            ...this.gameStats,
            
            // Combo system
            comboCount: this.comboCount,
            highestCombo: this.highestCombo,
            comboMultiplier: this.comboMultiplier,
            
            // Performance metrics
            ...this.performanceMetrics,
            
            // Star tokens
            starTokens: this.starTokens,
            starTokensEarned: this.starTokensEarned,
            
            // Calculated stats
            accuracy: this.projectilesFired > 0 ? (this.killCount / this.projectilesFired * 100).toFixed(1) + '%' : '0%',
            damageRatio: this.totalDamageTaken > 0 ? (this.totalDamageDealt / this.totalDamageTaken).toFixed(2) : 'Infinite',
            survivalRating: this.calculateSurvivalRating()
        };
    }
    
    /**
     * Calculate survival rating (S, A, B, C, D, F)
     */
    calculateSurvivalRating() {
        const score = this.performanceMetrics.efficiencyScore;
        
        if (score >= 90) return 'S';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }
    
    /**
     * Reset session statistics (for new game)
     */
    resetSession() {
        this.killCount = 0;
        this.xpCollected = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.highestCombo = 0;
        this.comboMultiplier = 1.0;
        this.starTokensEarned = 0;
        
        this.sessionStats = {
            startTime: Date.now(),
            gameTime: 0,
            highestLevel: 1,
            highestCombo: 0,
            bossesKilled: 0,
            elitesKilled: 0,
            perfectDodges: 0,
            criticalHits: 0,
            ricochetKills: 0,
            explosionKills: 0
        };
        
        this.gameStats = {
            highestEnemyCount: 0,
            totalEnemiesSpawned: 0,
            bossesSpawned: 0,
            wavesCompleted: 0,
            upgradesChosen: 0,
            deathsThisSession: 0
        };
        
        this.achievedMilestones.clear();
        this.performanceMetrics.efficiencyScore = 0;
    }
    
    /**
     * Get stats state for debugging/UI
     */
    getStatsState() {
        return {
            killCount: this.killCount,
            xpCollected: this.xpCollected,
            comboCount: this.comboCount,
            comboMultiplier: this.comboMultiplier,
            highestCombo: this.highestCombo,
            starTokens: this.starTokens,
            efficiencyScore: this.performanceMetrics.efficiencyScore,
            survivalRating: this.calculateSurvivalRating(),
            milestonesAchieved: this.achievedMilestones.size
        };
    }
}

// Also make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.StatsManager = StatsManager;
}

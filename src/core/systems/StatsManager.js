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
        
        // Get GAME_CONSTANTS from global scope with safe fallbacks
        const GAME_CONSTANTS = window.GAME_CONSTANTS || {};
        const COMBO_CONFIG = (GAME_CONSTANTS && GAME_CONSTANTS.COMBO) || { TIMEOUT: 0.8, TARGET: 8, MAX_MULTIPLIER: 2.5 };
        
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
        this.comboTimeout = (COMBO_CONFIG && COMBO_CONFIG.TIMEOUT != null) ? COMBO_CONFIG.TIMEOUT : 0.8; // seconds
        this.comboTarget = (COMBO_CONFIG && COMBO_CONFIG.TARGET != null) ? COMBO_CONFIG.TARGET : 8; // kills
        this.highestCombo = 0;
        this.comboMultiplier = 1.0;
        this.maxComboMultiplier = (COMBO_CONFIG && COMBO_CONFIG.MAX_MULTIPLIER != null) ? COMBO_CONFIG.MAX_MULTIPLIER : 2.5;
        
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

        this.achievementSystem = (typeof window !== 'undefined') ? (window.achievementSystem || null) : null;

        // Load persistent stats
        this.loadPersistentStats();
    }
    
    /**
     * Main stats update loop
     */
    update(deltaTime) {
        this.bindAchievementSystem();

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

        this.achievementSystem?.updateUntouchable?.(deltaTime);
    }

    bindAchievementSystem() {
        if (!this.achievementSystem && typeof window !== 'undefined' && window.achievementSystem) {
            this.achievementSystem = window.achievementSystem;
            this.achievementSystem.updateAchievement?.('first_kill', this.killCount);
            this.achievementSystem.updateAchievement?.('combo_master', this.highestCombo);
            this.achievementSystem.updateAchievement?.('star_collector', this.xpCollected);
            this.achievementSystem.updateAchievement?.('meta_star_collector', this.starTokens);
            this.achievementSystem.updateAchievement?.('boss_slayer', this.sessionStats.bossesKilled);
        }
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

        this.achievementSystem?.updateAchievement?.('combo_master', this.highestCombo);
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
        this.bindAchievementSystem();

        this.killCount++;

        // Handle combo system
        this.comboCount++;
        this.comboTimer = this.comboTimeout;

        // Update session stats
        this.updateSessionStats('kill');

        if (this.achievementSystem) {
            this.achievementSystem.updateAchievement?.('first_kill', this.killCount);
            this.achievementSystem.onEnemyKilled?.(Date.now());
        }

        return this.killCount;
    }

    registerEnemyKill(enemy) {
        this.bindAchievementSystem();

        const killCount = this.incrementKills();

        if (enemy?.isElite) {
            this.trackSpecialEvent('elite_kill');
        }

        return killCount;
    }

    recordChainLightningHit(hitCount) {
        this.bindAchievementSystem();
        this.achievementSystem?.onChainLightningHit?.(hitCount);
    }

    recordRicochetHit(hitCount) {
        this.bindAchievementSystem();
        this.sessionStats.ricochetKills = Math.max(this.sessionStats.ricochetKills, hitCount);
        this.achievementSystem?.onRicochetHit?.(hitCount);
    }

    onPlayerLevelUp(level) {
        this.bindAchievementSystem();
        this.sessionStats.highestLevel = Math.max(this.sessionStats.highestLevel, level);
        this.achievementSystem?.updateAchievement?.('level_up', level);
    }

    onPlayerDamaged() {
        this.bindAchievementSystem();
        this.achievementSystem?.onPlayerDamaged?.();
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
        this.bindAchievementSystem();
        this.sessionStats.bossesKilled++;
        this.gameStats.bossesSpawned++;

        // Award star tokens for boss kills
        this.earnStarTokens(1);

        // Check for Jupiter star drop upgrade
        const extraStars = parseInt(localStorage.getItem('meta_jupiter_star_drop') || '0', 10);
        if (extraStars > 0) {
            this.earnStarTokens(extraStars);
        }

        this.achievementSystem?.updateAchievement?.('boss_slayer', this.sessionStats.bossesKilled);
    }
    
    /**
     * Track XP collection
     */
    collectXP(amount) {
        this.bindAchievementSystem();
        this.xpCollected += amount;

        this.achievementSystem?.updateAchievement?.('star_collector', this.xpCollected);

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
        this.bindAchievementSystem();
        switch (eventType) {
            case 'critical_hit':
                this.sessionStats.criticalHits++;
                this.achievementSystem?.onCriticalHit?.();
                break;
            case 'perfect_dodge':
                this.sessionStats.perfectDodges++;
                this.achievementSystem?.updateAchievement?.('dodge_master', this.sessionStats.perfectDodges);
                this.achievementSystem?.updateAchievement?.('perfect_dodge', 1);
                break;
            case 'ricochet_kill':
                this.sessionStats.ricochetKills++;
                if (typeof data.count === 'number') {
                    this.achievementSystem?.onRicochetHit?.(data.count);
                }
                break;
            case 'explosion_kill':
                this.sessionStats.explosionKills++;
                break;
            case 'elite_kill':
                this.sessionStats.elitesKilled++;
                this.achievementSystem?.onEliteKilled?.();
                break;
            case 'upgrade_chosen':
                this.gameStats.upgradesChosen++;
                break;
            case 'wave_completed':
                this.gameStats.wavesCompleted++;
                const wave = typeof data.waveNumber === 'number' ? data.waveNumber : this.gameStats.wavesCompleted;
                this.achievementSystem?.onWaveCompleted?.(wave);
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
        const enemies = this.gameManager?.game?.getEnemies?.() ?? this.gameManager?.game?.enemies ?? [];
        const currentEnemyCount = Array.isArray(enemies) ? enemies.length : 0;
        if (currentEnemyCount > this.gameStats.highestEnemyCount) {
            this.gameStats.highestEnemyCount = currentEnemyCount;
        }

        // Sync total enemies spawned from EnemySpawner if available
        if (this.gameManager.enemySpawner && typeof this.gameManager.enemySpawner.totalEnemiesSpawned === 'number') {
            this.gameStats.totalEnemiesSpawned = this.gameManager.enemySpawner.totalEnemiesSpawned;
        }
    }
    
    /**
     * Earn star tokens
     */
    earnStarTokens(amount) {
        this.bindAchievementSystem();
        // Apply Stellar Fortune bonus from Star Vendor
        const stellarFortuneLevel = parseInt(localStorage.getItem('meta_star_chance') || '0', 10);
        let finalAmount = amount;

        if (stellarFortuneLevel > 0) {
            // Each level gives a chance for bonus stars
            const bonusChance = stellarFortuneLevel * 0.33; // 33% chance per level
            for (let i = 0; i < amount; i++) {
                if (Math.random() < bonusChance) {
                    finalAmount++;
                }
            }
        }

        this.starTokens += finalAmount;
        this.starTokensEarned += finalAmount;

        // Save to localStorage
        localStorage.setItem('starTokens', this.starTokens.toString());

        this.achievementSystem?.updateAchievement?.('meta_star_collector', this.starTokens);

        // Sync with GameManager metaStars and update UI
        if (this.gameManager) {
            this.gameManager.metaStars = this.starTokens;
            if (typeof this.gameManager.updateStarDisplay === 'function') {
                this.gameManager.updateStarDisplay();
            }
            if (typeof this.gameManager.saveStarTokens === 'function') {
                this.gameManager.saveStarTokens();
            }
        }
        
        // Show notification
        if (this.gameManager.effectsManager && this.gameManager.game.player) {
            const displayText = finalAmount > amount ?
                `+${finalAmount} ⭐ (${finalAmount - amount} bonus!)` :
                `+${finalAmount} ⭐`;
            this.gameManager.effectsManager.showCombatText(
                displayText,
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

            // Sync with GameManager metaStars and update UI
            if (this.gameManager) {
                this.gameManager.metaStars = this.starTokens;
                if (typeof this.gameManager.updateStarDisplay === 'function') {
                    this.gameManager.updateStarDisplay();
                }
                if (typeof this.gameManager.saveStarTokens === 'function') {
                    this.gameManager.saveStarTokens();
                }
            }
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

                // Validate loaded data to prevent corruption issues
                if (parsed && typeof parsed === 'object') {
                    // Validate and sanitize numeric fields
                    this.totalDamageDealt = this.validateNumericStat(parsed.totalDamageDealt, 0);
                    this.totalDamageTaken = this.validateNumericStat(parsed.totalDamageTaken, 0);
                    this.projectilesFired = this.validateNumericStat(parsed.projectilesFired, 0);
                    this.distanceTraveled = this.validateNumericStat(parsed.distanceTraveled, 0);
                } else {
                    console.warn('Invalid save data structure, using defaults');
                }
            }
        } catch (error) {
            console.warn('Failed to load persistent stats:', error);
            // Clear corrupted data
            localStorage.removeItem('gameStats');
        }
    }

    /**
     * Validate and sanitize numeric statistics
     */
    validateNumericStat(value, defaultValue = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
        if (typeof value !== 'number' || !isFinite(value) || value < min || value > max) {
            return defaultValue;
        }
        return Math.floor(value); // Ensure integer values
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

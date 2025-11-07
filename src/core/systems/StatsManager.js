/**
 * 🌊 UNIFIED STATS MANAGER - Resonant Multi-Agent Architecture
 * [A] RESONANT NOTE: Extracted from massive GameManager.js (2,400+ lines)
 * Handles all statistics tracking, achievements, combos, and progression
 * 
 * Single responsibility: Track and manage all game statistics and progression
 * Coordinates with achievements system and provides analytics
 */

class StatsManager {
    constructor(gameManager) {
        this.gameManager = gameManager;

        // 🌊 GAME STATE - Single Source of Truth
        // Link to shared game state
        this.state = gameManager?.game?.state || null;

        // Get GAME_CONSTANTS from global scope with safe fallbacks
        const GAME_CONSTANTS = window.GAME_CONSTANTS || {};
        const COMBO_CONFIG = (GAME_CONSTANTS && GAME_CONSTANTS.COMBO) || { TIMEOUT: 0.8, TARGET: 8, MAX_MULTIPLIER: 2.5 };

        // Persistent statistics (not in GameState - these are long-term tracking)
        this.totalDamageDealt = 0;
        this.totalDamageTaken = 0;
        this.projectilesFired = 0;
        this.distanceTraveled = 0;
        
        // Combo configuration
        this.comboTimeout = (COMBO_CONFIG && COMBO_CONFIG.TIMEOUT != null) ? COMBO_CONFIG.TIMEOUT : 0.8;
        this.comboTarget = (COMBO_CONFIG && COMBO_CONFIG.TARGET != null) ? COMBO_CONFIG.TARGET : 8;
        this.maxComboMultiplier = (COMBO_CONFIG && COMBO_CONFIG.MAX_MULTIPLIER != null) ? COMBO_CONFIG.MAX_MULTIPLIER : 2.5;

        // Throttle achievement updates to reduce processing overhead
        this.lastLifetimeAchievementUpdate = 0;
        this.lifetimeAchievementUpdateInterval = 5; // Update every 5 seconds
        this.aegisWallChecked = false; // Track if we've checked the 180-second threshold

        // Update GameState combo config when available (after construction)
        // Deferred to avoid initialization order issues
        setTimeout(() => {
            if (this.state) {
                this.state.combo.timeout = this.comboTimeout;
            }
        }, 0);

        // Session statistics (still local to StatsManager)
        this.sessionStats = {
            startTime: Date.now(),
            gameTime: 0,
            highestLevel: 1,
            highestCombo: 0,
            bossesKilled: 0,
            elitesKilled: 0,
            perfectDodges: 0,
            dodges: 0,
            criticalHits: 0,
            ricochetKills: 0,
            explosionKills: 0,
            projectilesFired: 0, // Track session projectiles for accuracy achievements
            projectileHits: 0 // Track successful projectile hits for accuracy calculation
        };
        
        // Achievement tracking
        this.achievementProgress = new Map();
        this.unlockedAchievements = new Set();
        this.achievementNotifications = [];

        // Star token system - Use GameState as source of truth, fallback to localStorage
        // This prevents race conditions where GameState and StatsManager load independently
        if (this.state?.meta?.starTokens != null) {
            // GameState has already loaded, use it as the source of truth
            this.starTokens = this.state.meta.starTokens;
        } else {
            // GameState not yet loaded, load from localStorage as fallback
            try {
                this.starTokens = window.StorageManager.getInt('starTokens', 0);
            } catch (error) {
                window.logger.warn('Failed to load star tokens:', error);
                this.starTokens = 0;
            }
        }
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

    // ===== GAMESTATE PROXY PROPERTIES =====
    // These provide clean API access to GameState
    // External systems use these, so they must remain
    // Null checks required during initialization

    get killCount() { return this.state?.progression.killCount ?? 0; }
    set killCount(value) { if (this.state) this.state.progression.killCount = value; }

    get xpCollected() { return this.state?.progression.xpCollected ?? 0; }
    set xpCollected(value) { if (this.state) this.state.progression.xpCollected = value; }

    get comboCount() { return this.state?.combo.count ?? 0; }
    set comboCount(value) { if (this.state) this.state.combo.count = value; }

    get comboTimer() { return this.state?.combo.timer ?? 0; }
    set comboTimer(value) { if (this.state) this.state.combo.timer = value; }

    get highestCombo() { return this.state?.combo.highest ?? 0; }
    set highestCombo(value) { if (this.state) this.state.combo.highest = value; }

    get comboMultiplier() { return this.state?.combo.multiplier ?? 1.0; }
    set comboMultiplier(value) { if (this.state) this.state.combo.multiplier = value; }

    get starTokens() { return this.state?.meta.starTokens ?? 0; }
    set starTokens(value) { if (this.state) this.state.meta.starTokens = value; }

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

        // Update untouchable achievement (damage-free time)
        this.achievementSystem?.updateUntouchable?.(deltaTime);

        // Update lifetime achievements (throttled to every 5 seconds to reduce processing)
        const currentTime = this.gameManager.gameTime;
        if (currentTime - this.lastLifetimeAchievementUpdate >= this.lifetimeAchievementUpdateInterval) {
            this.achievementSystem?.updateLifetimeAchievements?.({
                totalDamageDealt: this.totalDamageDealt,
                distanceTraveled: this.distanceTraveled,
                projectilesFired: this.projectilesFired
            });
            this.lastLifetimeAchievementUpdate = currentTime;
        }

        // Update Tank Commander achievement (time without dodging)
        this.achievementSystem?.updateTankCommander?.(deltaTime);

        // Check Aegis Wall achievement only once when crossing the 180-second threshold
        if (!this.aegisWallChecked && currentTime >= 180) {
            this.achievementSystem?.checkAegisWall?.(this.totalDamageTaken, currentTime);
            this.aegisWallChecked = true;
        }

        // Start Aegis Wall tracking at game start
        if (this.gameManager.gameTime <= 1 && this.achievementSystem) {
            this.achievementSystem.startAegisWallTracking?.(this.totalDamageTaken, this.gameManager.gameTime);
        }
    }

    bindAchievementSystem() {
        if (!this.achievementSystem && typeof window !== 'undefined' && window.achievementSystem) {
            this.achievementSystem = window.achievementSystem;
            this.achievementSystem.updateAchievement?.('first_kill', this.killCount);
            this.achievementSystem.updateAchievement?.('combo_master', this.highestCombo);
            this.achievementSystem.updateAchievement?.('star_collector', this.xpCollected);
            this.achievementSystem.updateAchievement?.('meta_star_collector', this.starTokens);
            this.achievementSystem.updateAchievement?.('boss_slayer', this.sessionStats.bossesKilled);

            // Update lifetime achievements when binding
            this.achievementSystem.updateLifetimeAchievements?.({
                totalDamageDealt: this.totalDamageDealt,
                distanceTraveled: this.distanceTraveled,
                projectilesFired: this.projectilesFired
            });

            // Update level-based achievements
            const player = this.gameManager?.game?.player;
            if (player?.level) {
                this.achievementSystem.onLevelReached?.(player.level);
            }

            // Check efficient killer achievement (use hits for accuracy)
            this.achievementSystem.checkEfficientKiller?.(this.killCount, this.sessionStats.projectilesFired, this.sessionStats.projectileHits);
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
        // 🌊 DELEGATE TO GAME STATE
        if (this.state) {
            this.state.updateCombo(deltaTime);
            // Sync session stats
            if (this.state.combo) {
                this.sessionStats.highestCombo = this.state.combo.highest;
            }
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
                this.achievementSystem?.updateAchievement?.('level_up', value);
                break;
            case 'time':
                const minutes = Math.floor(value / 60);
                const seconds = value % 60;
                message = seconds > 0 ? 
                    `${minutes}:${seconds.toString().padStart(2, '0')} SURVIVED!` :
                    `${minutes} MINUTE${minutes > 1 ? 'S' : ''} SURVIVED!`;
                color = 'heal';
                if (value >= 600) {
                    this.achievementSystem?.updateAchievement?.('survivor', value);
                }
                break;
            case 'bosses':
                message = `${value} BOSS${value > 1 ? 'ES' : ''} DEFEATED!`;
                color = 'critical';
                this.achievementSystem?.updateAchievement?.('boss_slayer', value);
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

        // 🌊 USE GAME STATE
        if (this.state && this.state.addKill) {
            this.state.addKill();
        }

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

        if (enemy?.isBoss) {
            this.onBossKilled();
            if (enemy.isMegaBoss) {
                this.achievementSystem?.onMegaBossDefeated?.();
            }
        }

        // Track Nova Blitz achievement (75 kills in 30 seconds)
        this.achievementSystem?.onNovaBlitzKill?.(Date.now());

        // Check efficient killer achievement (use hits for accuracy)
        this.achievementSystem?.checkEfficientKiller?.(this.killCount, this.sessionStats.projectilesFired, this.sessionStats.projectileHits);

        return killCount;
    }

    recordChainLightningHit(hitCount) {
        this.bindAchievementSystem();
        this.achievementSystem?.onChainLightningHit?.(hitCount);
        // Also track Storm Surge achievement (higher target than chain_reaction)
        this.achievementSystem?.onStormSurgeHit?.(hitCount);
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
        // Track Speed Runner achievement (reach level 15)
        this.achievementSystem?.onLevelReached?.(level);
    }

    onPlayerDamaged() {
        this.bindAchievementSystem();
        this.achievementSystem?.onPlayerDamaged?.();
    }
    
    /**
     * Reset combo system
     */
    resetCombo() {
        // 🌊 USE GAME STATE
        if (this.state && this.state.resetCombo) {
            this.state.resetCombo();
        }
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
        try {
            const extraStars = window.StorageManager.getInt('meta_jupiter_star_drop', 0);
            if (extraStars > 0) {
                this.earnStarTokens(extraStars);
            }
        } catch (error) {
            window.logger.warn('Failed to load Jupiter star drop upgrade:', error);
        }

        this.achievementSystem?.updateAchievement?.('boss_slayer', this.sessionStats.bossesKilled);
    }
    
    /**
     * Track XP collection
     */
    collectXP(amount) {
        this.bindAchievementSystem();

        // 🌊 USE GAME STATE
        if (this.state && this.state.addXP) {
            this.state.addXP(amount);
        }

        this.achievementSystem?.updateAchievement?.('star_collector', this.xpCollected);

        // Apply combo multiplier
        const bonusXP = Math.floor(amount * (this.comboMultiplier - 1.0));
        if (bonusXP > 0) {
            if (this.state && this.state.addXP) {
                this.state.addXP(bonusXP);
            }
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
        this.projectilesFired++; // Lifetime counter
        this.sessionStats.projectilesFired++; // Session counter for accuracy tracking
    }
    
    /**
     * Track projectile hit (successful hit on enemy)
     */
    trackProjectileHit() {
        this.sessionStats.projectileHits++;
        
        // Check efficient killer achievement (use hits for accuracy)
        this.achievementSystem?.checkEfficientKiller?.(this.killCount, this.sessionStats.projectilesFired, this.sessionStats.projectileHits);
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
                // Perfect dodge counts as both a dodge AND a perfect dodge
                this.sessionStats.dodges++;
                this.achievementSystem?.updateAchievement?.('perfect_dodge', 1);
                this.achievementSystem?.onPlayerDodged?.(); // Reset Tank Commander timer
                break;
            case 'dodge':
                this.sessionStats.dodges++;
                this.achievementSystem?.onPlayerDodged?.(); // Reset Tank Commander timer
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
        let stellarFortuneLevel = 0;
        try {
            stellarFortuneLevel = window.StorageManager.getInt('meta_star_chance', 0);
        } catch (error) {
            window.logger.warn('Failed to load stellar fortune level:', error);
        }
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

        // 🌊 USE GAME STATE
        if (this.state && this.state.earnStarTokens) {
            this.state.earnStarTokens(finalAmount);
        }

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
            try {
                window.StorageManager.setItem('starTokens', this.starTokens.toString());
            } catch (error) {
                window.logger.warn('Failed to save star tokens:', error);
            }

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
            const parsed = window.StorageManager.getJSON('gameStats');
            if (parsed) {
                // Validate loaded data to prevent corruption issues
                if (parsed && typeof parsed === 'object') {
                    // Validate and sanitize numeric fields
                    this.totalDamageDealt = this.validateNumericStat(parsed.totalDamageDealt, 0);
                    this.totalDamageTaken = this.validateNumericStat(parsed.totalDamageTaken, 0);
                    this.projectilesFired = this.validateNumericStat(parsed.projectilesFired, 0);
                    this.distanceTraveled = this.validateNumericStat(parsed.distanceTraveled, 0);
                } else {
                    window.logger.warn('Invalid save data structure, using defaults');
                }
            }
        } catch (error) {
            window.logger.warn('Failed to load persistent stats:', error);
            // Clear corrupted data
            window.StorageManager.removeItem('gameStats');
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
            
            window.StorageManager.setJSON('gameStats', statsToSave);
        } catch (error) {
            window.logger.warn('Failed to save persistent stats:', error);
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
            accuracy: this.sessionStats.projectilesFired > 0 ? (this.killCount / this.sessionStats.projectilesFired * 100).toFixed(1) + '%' : '0%',
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
        // 🌊 USE GAME STATE
        // GameState resetSession is called by GameManagerBridge
        // Just reset local tracking
        this.starTokensEarned = 0;
        
        this.sessionStats = {
            startTime: Date.now(),
            gameTime: 0,
            highestLevel: 1,
            highestCombo: 0,
            bossesKilled: 0,
            elitesKilled: 0,
            perfectDodges: 0,
            dodges: 0,
            criticalHits: 0,
            ricochetKills: 0,
            explosionKills: 0,
            projectilesFired: 0,
            projectileHits: 0
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
        
        // Reset achievement update throttling
        this.lastLifetimeAchievementUpdate = 0;
        this.aegisWallChecked = false;
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
    window.Game = window.Game || {};
    window.Game.StatsManager = StatsManager;
}

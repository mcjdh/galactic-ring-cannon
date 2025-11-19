class AchievementSystem {
    constructor() {
        // Load achievement definitions from config
        // Create a deep copy to avoid mutating the config
        if (window.ACHIEVEMENT_DEFINITIONS) {
            this.achievements = JSON.parse(JSON.stringify(window.ACHIEVEMENT_DEFINITIONS));
        } else {
            window.logger.warn('! ACHIEVEMENT_DEFINITIONS not loaded. Make sure achievements.config.js is loaded before AchievementSystem.');
            this.achievements = {};
        }

        // Throttle save mechanism to prevent localStorage spam
        this.lastSaveTime = 0;
        this.saveThrottleMs = 2000; // Save at most once every 2 seconds
        this.pendingSave = false;
        this.saveTimeoutId = null;

        this.initializeTracking();
        this.loadAchievements(); // Load AFTER initializing to preserve saved max values
        this.syncUnlockedAchievementsWithGameState();
    }
    
    initializeTracking() {
        // Track time without damage for 'Untouchable' achievement
        this.timeSinceLastDamage = 0;
        this.maxTimeSinceLastDamage = 0;

        // Track kills in last 10 seconds for 'Kill Streak'
        this.recentKills = [];
        this.killStreakWindow = 10; // seconds

        // Track chain lightning hits (will be restored from saved progress in loadAchievements)
        this.currentChainHits = 0;

        // Track ricochet hits (will be restored from saved progress in loadAchievements)
        this.currentRicochetHits = 0;

        // Track total ricochet bounces in current run for Ricochet Rampage
        this.totalRicochetBounces = 0;

        // Track best chain lightning burst for Storm Surge
        this.maxStormSurgeHits = 0;

        // Track time without dodging for 'Tank Commander' achievement
        this.timeSinceLastDodge = 0;
        this.maxTimeSinceLastDodge = 0;

        // Track Nova Blitz kills in last 30 seconds
        this.novaBlitzKills = [];
        this.novaBlitzWindow = 30; // seconds

        // Track Split Shot selections in current run
        this.splitShotSelections = 0;

        // Track total lifesteal healing in current run
        this.runLifestealTotal = 0;
        
        // Track ricochet bounces
        this.totalRicochetBounces = 0;

        // Track time at low health for 'Edge Walker' achievement
        this.timeAtLowHealth = 0;
        this.maxTimeAtLowHealth = 0;
        this.lowHealthThreshold = 0.3; // 30% health

    }

    /**
     * Reset per-run tracking variables (call when starting a new game)
     * This preserves saved achievement progress but resets run-specific tracking
     */
    resetRunTracking() {
        // Reset time-based tracking
        this.timeSinceLastDamage = 0;
        this.maxTimeSinceLastDamage = 0;
        this.timeSinceLastDodge = 0;
        this.maxTimeSinceLastDodge = 0;

        // Reset windowed kill tracking
        this.recentKills = [];
        this.novaBlitzKills = [];
        this.splitShotSelections = 0;

        // Reset per-run lifesteal tracking
        this.runLifestealTotal = 0;
        
        // Reset ricochet rampage tracking (per-run achievement)
        this.totalRicochetBounces = 0;

        // Reset low health tracking
        this.timeAtLowHealth = 0;
        this.maxTimeAtLowHealth = 0;

        window.logger.log('Achievement run tracking reset');
    }
    
    loadAchievements() {
        try {
            const loaded = window.StorageManager.getJSON('achievements');
            if (loaded) {
                for (const [key, achievement] of Object.entries(loaded)) {
                    if (this.achievements[key]) {
                        // Preserve structure, only update progress and unlocked status
                        this.achievements[key].progress = achievement.progress || 0;
                        this.achievements[key].unlocked = achievement.unlocked || false;
                    }
                }
            }
            
            // Initialize tracking variables from saved progress to maintain max values across sessions
            this.currentChainHits = this.achievements.chain_reaction?.progress || 0;
            this.currentRicochetHits = this.achievements.ricochet_master?.progress || 0;
            this.maxStormSurgeHits = this.achievements.storm_surge?.progress || 0;
        } catch (error) {
            window.logger.error('Error loading achievements:', error);
            // Clear corrupted data
            window.StorageManager.removeItem('achievements');
        }
    }
    
    saveAchievements() {
        try {
            // Only save progress and unlocked status to prevent corruption
            const saveData = {};
            for (const [key, achievement] of Object.entries(this.achievements)) {
                saveData[key] = {
                    progress: achievement.progress,
                    unlocked: achievement.unlocked
                };
            }
            window.StorageManager.setJSON('achievements', saveData);
            this.lastSaveTime = Date.now();
            this.pendingSave = false;
        } catch (error) {
            window.logger.error('Error saving achievements:', error);
        }
    }

    /**
     * Throttled save - only saves at most once every saveThrottleMs
     * Use this for frequent progress updates to avoid localStorage spam
     */
    saveAchievementsThrottled() {
        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTime;

        // If enough time has passed, save immediately
        if (timeSinceLastSave >= this.saveThrottleMs) {
            this.saveAchievements();
            if (this.saveTimeoutId) {
                clearTimeout(this.saveTimeoutId);
                this.saveTimeoutId = null;
            }
            return;
        }

        // Otherwise, schedule a save for later (if not already scheduled)
        if (!this.pendingSave) {
            this.pendingSave = true;
            const remainingTime = this.saveThrottleMs - timeSinceLastSave;

            if (this.saveTimeoutId) {
                clearTimeout(this.saveTimeoutId);
            }

            this.saveTimeoutId = setTimeout(() => {
                this.saveAchievements();
                this.saveTimeoutId = null;
            }, remainingTime);
        }
    }

    /**
     * Force immediate save (call on game over, achievement unlock, etc.)
     */
    saveAchievementsImmediate() {
        if (this.saveTimeoutId) {
            clearTimeout(this.saveTimeoutId);
            this.saveTimeoutId = null;
        }
        try {
            this.saveAchievements();
        } finally {
            this.pendingSave = false;
        }
    }
    
    updateAchievement(key, value) {
        if (!this.achievements[key]) {
            // Use logger instead of console.warn for better error handling
            window.logger.warn(`Achievement '${key}' not found`);
            return;
        }

        const achievement = this.achievements[key];
        const oldProgress = achievement.progress;
        achievement.progress = Math.min(value, achievement.target);

        // Only show notification and save if progress actually changed
        if (oldProgress !== achievement.progress) {
            if (!achievement.unlocked && achievement.progress >= achievement.target) {
                achievement.unlocked = true;
                this.showAchievementNotification(achievement);

                // Award bonus stars for achievements
                if (window.gameManager) {
                    // Important achievements award more stars
                    const starBonus = achievement.important ? 3 : 1;
                    if (typeof window.gameManager.earnStarTokens === 'function') {
                        window.gameManager.earnStarTokens(starBonus);
                    }

                    if (typeof window.gameManager.showFloatingText === 'function' && window.gameManager.game?.player) {
                        window.gameManager.showFloatingText(`Achievement Bonus: +${starBonus} ⭐`,
                            window.gameManager.game.player.x,
                            window.gameManager.game.player.y - 50,
                            '#f1c40f',
                            20);
                    }
                }

                // Save immediately when achievement is unlocked (critical event)
                this.saveAchievementsImmediate();
                this.handleAchievementUnlocked(key);
            } else {
                // For progress updates, use throttled save to reduce localStorage writes
                this.saveAchievementsThrottled();
            }
        }
    }

    syncUnlockedAchievementsWithGameState() {
        const state = window.gameManager?.game?.state || window.gameManager?.state || null;
        if (!state?.unlockAchievement) {
            return;
        }

        try {
            Object.entries(this.achievements).forEach(([key, achievement]) => {
                if (!achievement?.unlocked) {
                    return;
                }
                const alreadyUnlocked =
                    state.isAchievementUnlocked?.(key) ||
                    (state.meta?.achievements instanceof Set && state.meta.achievements.has(key));
                if (!alreadyUnlocked) {
                    state.unlockAchievement(key);
                }
            });
        } catch (error) {
            window.logger.warn('Failed to sync achievements with GameState:', error);
        }
    }

    handleAchievementUnlocked(key) {
        if (!key) {
            return;
        }

        try {
            const state = window.gameManager?.game?.state || window.gameManager?.state || null;
            state?.unlockAchievement?.(key);
        } catch (error) {
            window.logger.warn('Failed to persist achievement unlock with GameState:', error);
        }

        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            const CustomEventCtor = window.CustomEvent || this._getFallbackCustomEvent();
            if (CustomEventCtor) {
                try {
                    const event = new CustomEventCtor('achievementUnlocked', {
                        detail: { id: key }
                    });
                    window.dispatchEvent(event);
                } catch (error) {
                    window.logger.warn('Failed to dispatch achievementUnlocked event:', error);
                }
            }
        }
    }

    _getFallbackCustomEvent() {
        if (typeof document === 'undefined') {
            return null;
        }
        function FallbackCustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: null };
            const evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }
        FallbackCustomEvent.prototype = window.Event?.prototype || {};
        return FallbackCustomEvent;
    }
    
    // Track damage-free time
    updateUntouchable(deltaTime) {
        this.timeSinceLastDamage += deltaTime;
        this.maxTimeSinceLastDamage = Math.max(this.maxTimeSinceLastDamage, this.timeSinceLastDamage);
        this.updateAchievement('untouchable', this.maxTimeSinceLastDamage);
    }
    
    // Reset damage-free time when hit
    onPlayerDamaged() {
        this.timeSinceLastDamage = 0;
    }
    
    // Track kill streak
    onEnemyKilled(timestamp) {
        // Add new kill
        this.recentKills.push(timestamp);
        
        // Remove kills older than window
        const windowStart = timestamp - (this.killStreakWindow * 1000);
        this.recentKills = this.recentKills.filter(t => t >= windowStart);
        
        // Update achievement
        this.updateAchievement('kill_streak', this.recentKills.length);
    }
    
    // Track chain lightning hits
    onChainLightningHit(hitCount) {
        this.currentChainHits = Math.max(this.currentChainHits, hitCount);
        this.updateAchievement('chain_reaction', this.currentChainHits);
    }
    
    // Track ricochet hits
    onRicochetHit(hitCount) {
        this.currentRicochetHits = Math.max(this.currentRicochetHits, hitCount);
        this.updateAchievement('ricochet_master', this.currentRicochetHits);

        // Track total ricochet bounces for Ricochet Rampage (cumulative per run)
        // Each ricochet adds 1 bounce to the total
        if (hitCount > 1) {
            this.totalRicochetBounces++;
            this.updateAchievement('ricochet_rampage', this.totalRicochetBounces);
        }
    }
    
    // Track orbital projectiles
    onOrbitalCountChanged(count) {
        this.updateAchievement('orbital_master', count);
    }
    
    // Track elite enemy kills
    onEliteKilled() {
        const currentProgress = this.achievements.elite_hunter.progress;
        this.updateAchievement('elite_hunter', currentProgress + 1);
    }
    
    // Track critical hits
    onCriticalHit() {
        const currentProgress = this.achievements.critical_master.progress;
        this.updateAchievement('critical_master', currentProgress + 1);
    }

    // Track mega boss defeat
    onMegaBossDefeated() {
        this.updateAchievement('mega_boss_slayer', 1);
    }

    // Track vendor upgrade maxed
    onUpgradeMaxed() {
        this.updateAchievement('max_upgrade', 1);
    }

    // Track time without dodging for 'Tank Commander' achievement
    updateTankCommander(deltaTime) {
        this.timeSinceLastDodge += deltaTime;
        const newMax = Math.max(this.maxTimeSinceLastDodge, this.timeSinceLastDodge);
        
        // Only update achievement if progress changed by at least 1 second or achievement is unlocked
        if (Math.floor(newMax) > Math.floor(this.maxTimeSinceLastDodge) || newMax >= 180) {
            this.updateAchievement('tank_commander', newMax);
        }
        
        this.maxTimeSinceLastDodge = newMax;
    }

    // Reset dodge-free time when player dodges
    onPlayerDodged() {
        this.timeSinceLastDodge = 0;
    }

    // Track time at low health for 'Edge Walker' achievement (Void Reaver unlock)
    updateEdgeWalker(deltaTime, player) {
        if (!player?.stats) {
            return;
        }

        const healthPercent = player.stats.health / player.stats.maxHealth;

        if (healthPercent < this.lowHealthThreshold) {
            // Player is below 30% health, accumulate time
            this.timeAtLowHealth += deltaTime;
            this.maxTimeAtLowHealth = Math.max(this.maxTimeAtLowHealth, this.timeAtLowHealth);

            // Only update achievement if progress changed by at least 1 second or achievement is about to unlock
            if (Math.floor(this.maxTimeAtLowHealth) > Math.floor(this.achievements.edge_walker?.progress || 0)
                || this.maxTimeAtLowHealth >= 180) {
                this.updateAchievement('edge_walker', this.maxTimeAtLowHealth);
            }
        } else {
            // Player is above 30% health, reset current streak but keep max
            this.timeAtLowHealth = 0;
        }
    }

    // Track Nova Blitz kills (75 kills in 30 seconds)
    onNovaBlitzKill(timestamp) {
        // Add new kill
        this.novaBlitzKills.push(timestamp);

        // Remove kills older than window
        const windowStart = timestamp - (this.novaBlitzWindow * 1000);
        this.novaBlitzKills = this.novaBlitzKills.filter(t => t >= windowStart);

        // Update achievement
        this.updateAchievement('nova_blitz', this.novaBlitzKills.length);
    }

    // Track lifetime achievements (cumulative across runs)
    updateLifetimeAchievements(stats = {}) {
        this.updateMonotonicAchievement('cosmic_veteran', stats.totalDamageDealt);
        this.updateMonotonicAchievement('galactic_explorer', stats.distanceTraveled);
        this.updateMonotonicAchievement('trigger_happy', stats.projectilesFired);
    }

    /**
     * Ensure achievements that should only increase never regress even if stats snapshot resets.
     */
    updateMonotonicAchievement(key, candidateValue) {
        if (candidateValue == null || !Number.isFinite(candidateValue)) {
            return;
        }
        const integerValue = Math.max(0, Math.floor(candidateValue));
        const currentProgress = this.achievements[key]?.progress ?? 0;
        const safeValue = Math.max(currentProgress, integerValue);
        this.updateAchievement(key, safeValue);
    }

    // Track Speed Runner (reach level 15 in single run)
    onLevelReached(level) {
        this.updateAchievement('speed_runner', level);
    }

    // Track Event Horizon (deal 15,000 damage in single run)
    onDamageDealtInRun(totalDamage) {
        if (!Number.isFinite(totalDamage) || totalDamage < 0) {
            return;
        }
        this.updateAchievement('event_horizon', Math.floor(totalDamage));
    }

    // Track Storm Surge (hit 8 enemies with chain lightning)
    onStormSurgeHit(hitCount) {
        if (!Number.isFinite(hitCount)) {
            return;
        }
        this.maxStormSurgeHits = Math.max(this.maxStormSurgeHits || 0, hitCount);
        this.updateAchievement('storm_surge', this.maxStormSurgeHits);
    }

    onUpgradeSelected(upgradeId) {
        if (typeof upgradeId !== 'string' || !upgradeId.trim()) {
            return;
        }

        const normalized = upgradeId.trim();
        if (normalized.startsWith('multi_shot') || normalized.includes('split_shot')) {
            this.splitShotSelections = (this.splitShotSelections || 0) + 1;
            this.updateAchievement('split_shot_specialist', this.splitShotSelections);
        }
    }

    // ========================================
    // SHIELD-SPECIFIC TRACKING (Aegis Vanguard)
    // ========================================

    // Track total damage blocked by shields (CUMULATIVE across all runs)
    updateShieldDamageBlocked(damageIncrement) {
        if (!Number.isFinite(damageIncrement) || damageIncrement <= 0) {
            return;
        }
        const currentProgress = this.achievements.unbreakable?.progress || 0;
        this.updateAchievement('unbreakable', currentProgress + damageIncrement);
    }

    // Track time without shield breaking (MAX value per run, not cumulative)
    updateShieldTimeWithoutBreak(timeInSeconds) {
        const currentProgress = this.achievements.aegis_guardian?.progress || 0;
        const newTime = Math.floor(timeInSeconds);
        // Only update if this run's time is better than saved best
        if (newTime > currentProgress) {
            this.updateAchievement('aegis_guardian', newTime);
        }
    }

    // ========================================
    // ========================================
    // LIFESTEAL TRACKING (Eclipse Reaper & Crimson Reaver)
    // ========================================

    // Track total HP lifesteal in current run (PER RUN, not cumulative)
    onLifestealHealing(healAmount) {
        if (!Number.isFinite(healAmount) || healAmount <= 0) {
            return;
        }

        // Initialize run lifesteal tracker if not present
        if (!this.runLifestealTotal) {
            this.runLifestealTotal = 0;
        }

        this.runLifestealTotal += healAmount;
        
        // Update both achievements
        this.updateAchievement('grim_harvest', Math.floor(this.runLifestealTotal));
        this.updateAchievement('crimson_pact', Math.floor(this.runLifestealTotal));
    }

    showAchievementNotification(achievement) {
        try {
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';

            // Add special styling for important achievements
            if (achievement.important) {
                notification.classList.add('important-achievement');
            }

            // Create elements safely to prevent XSS
            const icon = document.createElement('div');
            icon.className = 'achievement-icon';
            icon.textContent = achievement.icon || '';

            const content = document.createElement('div');
            content.className = 'achievement-content';

            const title = document.createElement('h3');
            title.textContent = 'Achievement Unlocked!';

            const name = document.createElement('p');
            name.textContent = achievement.name || '';

            const description = document.createElement('p');
            description.textContent = achievement.description || '';

            // Assemble the notification
            content.appendChild(title);
            content.appendChild(name);
            content.appendChild(description);
            notification.appendChild(icon);
            notification.appendChild(content);

            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('show');
                }
            }, 100);
            
            // For important achievements, show longer and with special effects
            const displayTime = achievement.important ? 5000 : 3000;
            
            // Remove after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            document.body.removeChild(notification);
                        }
                    }, 500);
                }
            }, displayTime);
            
            // Play achievement sound
            if (audioSystem) {
                // Play special sound for important achievements
                if (achievement.important) {
                    audioSystem.play('boss', 0.4);
                } else {
                    audioSystem.play('levelUp', 0.4);
                }
            }
        } catch (error) {
            window.logger.error('Error showing achievement notification:', error);
        }
    }
    
    getUnlockedCount() {
        return Object.values(this.achievements).filter(a => a.unlocked).length;
    }

    getTotalCount() {
        return Object.keys(this.achievements).length;
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.AchievementSystem = AchievementSystem;
} 

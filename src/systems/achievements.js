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

        this.initializeTracking();
        this.loadAchievements(); // Load AFTER initializing to preserve saved max values
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

        // Track time without dodging for 'Tank Commander' achievement
        this.timeSinceLastDodge = 0;
        this.maxTimeSinceLastDodge = 0;

        // Track Nova Blitz kills in last 30 seconds
        this.novaBlitzKills = [];
        this.novaBlitzWindow = 30; // seconds

        // Track Aegis Wall damage tracking
        this.aegisWallStartTime = null;
        this.aegisWallStartDamage = 0;
        this.aegisWallChecking = false;
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
        } catch (error) {
            window.logger.error('Error saving achievements:', error);
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
                    window.gameManager.earnStarTokens(starBonus);
                    if (window.gameManager.showFloatingText && window.gameManager.game?.player) {
                        window.gameManager.showFloatingText(`Achievement Bonus: +${starBonus} ⭐`, 
                            window.gameManager.game.player.x, 
                            window.gameManager.game.player.y - 50, 
                            '#f1c40f', 
                            20);
                    }
                }
            }
            
            this.saveAchievements();
        }
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
        this.maxTimeSinceLastDodge = Math.max(this.maxTimeSinceLastDodge, this.timeSinceLastDodge);
        this.updateAchievement('tank_commander', this.maxTimeSinceLastDodge);
    }

    // Reset dodge-free time when player dodges
    onPlayerDodged() {
        this.timeSinceLastDodge = 0;
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

    // Track Aegis Wall (less than 300 damage in 3 minutes)
    startAegisWallTracking(currentDamage, currentTime) {
        if (!this.aegisWallChecking) {
            this.aegisWallStartDamage = currentDamage;
            this.aegisWallStartTime = currentTime;
            this.aegisWallChecking = true;
        }
    }

    checkAegisWall(currentDamage, currentTime) {
        if (this.aegisWallChecking && this.aegisWallStartTime) {
            const elapsedTime = currentTime - this.aegisWallStartTime;
            const damageTaken = currentDamage - this.aegisWallStartDamage;

            // Check if 3 minutes have passed
            if (elapsedTime >= 180) {
                if (damageTaken < 300) {
                    this.updateAchievement('aegis_wall', 1);
                }
                // Reset tracking
                this.aegisWallChecking = false;
                this.aegisWallStartTime = null;
            }
        }
    }

    // Track lifetime achievements (cumulative across runs)
    updateLifetimeAchievements(stats) {
        if (stats.totalDamageDealt != null) {
            this.updateAchievement('cosmic_veteran', stats.totalDamageDealt);
        }
        if (stats.distanceTraveled != null) {
            this.updateAchievement('galactic_explorer', stats.distanceTraveled);
        }
        if (stats.projectilesFired != null) {
            this.updateAchievement('trigger_happy', stats.projectilesFired);
        }
    }

    // Track Speed Runner (reach level 15 in single run)
    onLevelReached(level) {
        this.updateAchievement('speed_runner', level);
    }

    // Track Storm Surge (hit 8 enemies with chain lightning)
    onStormSurgeHit(hitCount) {
        this.updateAchievement('storm_surge', hitCount);
    }

    // Track Efficient Killer (100 kills with 80%+ accuracy)
    checkEfficientKiller(kills, projectilesFired) {
        if (kills >= 100 && projectilesFired > 0) {
            const accuracy = kills / projectilesFired;
            if (accuracy >= 0.8) {
                this.updateAchievement('efficient_killer', kills);
            }
        }
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

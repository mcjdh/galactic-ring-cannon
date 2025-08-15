class AchievementSystem {
    constructor() {
        this.achievements = {
            // Combat Achievements
            'first_kill': {
                name: 'First Blood',
                description: 'Defeat your first enemy',
                icon: '⚔️',
                progress: 0,
                target: 1,
                unlocked: false
            },
            'combo_master': {
                name: 'Combo Master',
                description: 'Reach a 10x combo',
                icon: '🔥',
                progress: 0,
                target: 10,
                unlocked: false
            },
            'boss_slayer': {
                name: 'Boss Slayer',
                description: 'Defeat 5 bosses',
                icon: '👑',
                progress: 0,
                target: 5,
                unlocked: false,
                important: true  // Mark as important achievement
            },
            'mega_boss_slayer': {
                name: 'Mega Boss Slayer',
                description: 'Defeat the Mega Boss',
                icon: '🌟',
                progress: 0,
                target: 1,
                unlocked: false,
                important: true  // Mark as important achievement
            },
            'kill_streak': {
                name: 'Kill Streak',
                description: 'Kill 50 enemies in 10 seconds',
                icon: '⚡',
                progress: 0,
                target: 50,
                unlocked: false
            },
            
            // Progression Achievements
            'level_up': {
                name: 'Level Up!',
                description: 'Reach level 10',
                icon: '⭐',
                progress: 0,
                target: 10,
                unlocked: false
            },
            'star_collector': {
                name: 'Star Collector',
                description: 'Collect 1000 XP orbs',
                icon: '✨',
                progress: 0,
                target: 1000,
                unlocked: false
            },
            'meta_star_collector': {
                name: 'Meta Star Collector',
                description: 'Earn 100 meta stars',
                icon: '⭐',
                progress: 0,
                target: 100,
                unlocked: false
            },
            'max_upgrade': {
                name: 'Fully Upgraded',
                description: 'Max out any Star Vendor upgrade',
                icon: '🌈',
                progress: 0,
                target: 1,
                unlocked: false
            },
            
            // Skill Achievements
            'dodge_master': {
                name: 'Dodge Master',
                description: 'Successfully dodge 50 times',
                icon: '💨',
                progress: 0,
                target: 50,
                unlocked: false
            },
            'perfect_dodge': {
                name: 'Perfect Dodge',
                description: 'Dodge an attack at the last moment',
                icon: '🎯',
                progress: 0,
                target: 1,
                unlocked: false
            },
            'untouchable': {
                name: 'Untouchable',
                description: 'Survive for 60 seconds without taking damage',
                icon: '🛡️',
                progress: 0,
                target: 60,
                unlocked: false
            },
            
            // Challenge Achievements
            'survivor': {
                name: 'Survivor',
                description: 'Survive for 10 minutes',
                icon: '⏱️',
                progress: 0,
                target: 600, // 10 minutes in seconds
                unlocked: false
            },
            'endless_champion': {
                name: 'Endless Champion',
                description: 'Reach wave 20 in endless mode',
                icon: '♾️',
                progress: 0,
                target: 20,
                unlocked: false
            },
            'elite_hunter': {
                name: 'Elite Hunter',
                description: 'Defeat 10 elite enemies',
                icon: '🎖️',
                progress: 0,
                target: 10,
                unlocked: false
            },
            'wave_master': {
                name: 'Wave Master',
                description: 'Survive 10 waves',
                icon: '🌊',
                progress: 0,
                target: 10,
                unlocked: false
            },
            
            // Special Achievements
            'critical_master': {
                name: 'Critical Master',
                description: 'Land 50 critical hits',
                icon: '💥',
                progress: 0,
                target: 50,
                unlocked: false
            },
            'chain_reaction': {
                name: 'Chain Reaction',
                description: 'Hit 5 enemies with a single chain lightning',
                icon: '⚡',
                progress: 0,
                target: 5,
                unlocked: false
            },
            'ricochet_master': {
                name: 'Ricochet Master',
                description: 'Hit 3 enemies with a single ricochet',
                icon: '↪️',
                progress: 0,
                target: 3,
                unlocked: false
            },
            'orbital_master': {
                name: 'Orbital Master',
                description: 'Have 5 orbital projectiles at once',
                icon: '🌠',
                progress: 0,
                target: 5,
                unlocked: false
            }
        };
        
        this.loadAchievements();
        this.initializeTracking();
    }
    
    initializeTracking() {
        // Track time without damage for 'Untouchable' achievement
        this.timeSinceLastDamage = 0;
        this.maxTimeSinceLastDamage = 0;
        
        // Track kills in last 10 seconds for 'Kill Streak'
        this.recentKills = [];
        this.killStreakWindow = 10; // seconds
        
        // Track chain lightning hits
        this.currentChainHits = 0;
        
        // Track ricochet hits
        this.currentRicochetHits = 0;
    }
    
    loadAchievements() {
        try {
            const saved = localStorage.getItem('achievements');
            if (saved) {
                const loaded = JSON.parse(saved);
                for (const [key, achievement] of Object.entries(loaded)) {
                    if (this.achievements[key]) {
                        // Preserve structure, only update progress and unlocked status
                        this.achievements[key].progress = achievement.progress || 0;
                        this.achievements[key].unlocked = achievement.unlocked || false;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
            // Clear corrupted data
            localStorage.removeItem('achievements');
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
            localStorage.setItem('achievements', JSON.stringify(saveData));
        } catch (error) {
            console.error('Error saving achievements:', error);
        }
    }
    
    updateAchievement(key, value) {
        if (!this.achievements[key]) {
            // Use logger instead of console.warn for better error handling
            (window.logger?.warn || (() => {}))(`Achievement '${key}' not found`);
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
    
    // Track wave completion
    onWaveCompleted(waveNumber) {
        this.updateAchievement('wave_master', waveNumber);
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
    
    showAchievementNotification(achievement) {
        try {
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';
            
            // Add special styling for important achievements
            if (achievement.important) {
                notification.classList.add('important-achievement');
            }
            
            notification.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <h3>Achievement Unlocked!</h3>
                    <p>${achievement.name}</p>
                    <p>${achievement.description}</p>
                </div>
            `;
            
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
            console.error('Error showing achievement notification:', error);
        }
    }
    
    getUnlockedCount() {
        return Object.values(this.achievements).filter(a => a.unlocked).length;
    }
    
    getTotalCount() {
        return Object.keys(this.achievements).length;
    }
} 
/**
 * 🌊 GAME STATE - Single Source of Truth
 * Central state management for the entire game
 *
 * Architecture Pattern: Single Source of Truth
 * - All game state lives here
 * - Systems read and write through this class
 * - No duplicate state across managers
 * - Observable for reactive updates
 *
 * Design Principles:
 * 1. Data only - minimal logic
 * 2. Clear ownership of each state field
 * 3. Validation on writes
 * 4. Serializable for save/load
 */

class GameState {
    constructor() {
        // ===== RUNTIME STATE =====
        // Core game loop timing and control
        this.runtime = {
            gameTime: 0,              // Total elapsed game time (seconds)
            deltaTime: 0,             // Last frame delta time
            isPaused: false,          // Is game currently paused?
            isRunning: false,         // Is game loop active?
            lastUpdateTime: 0,        // Performance tracking
            fps: 0,                   // Current FPS
            frameCount: 0             // Total frames rendered
        };

        // ===== GAME FLOW STATE =====
        // Win/lose conditions and game state
        this.flow = {
            isGameOver: false,        // Player died
            isGameWon: false,         // Player won
            hasShownEndScreen: false,
            difficulty: 'normal'      // 'easy' | 'normal' | 'hard'
        };

        // ===== PLAYER STATE =====
        // Current player status (not the Player object itself)
        this.player = {
            reference: null,          // Actual Player instance
            isAlive: true,
            level: 1,
            health: 100,
            maxHealth: 100,
            xp: 0,
            xpToNextLevel: 100,
            x: 0,                     // Position for UI/minimap
            y: 0
        };

        // ===== PROGRESSION STATE =====
        // Session statistics and progression
        this.progression = {
            killCount: 0,
            xpCollected: 0,
            damageDealt: 0,
            damageTaken: 0,
            highestLevel: 1,
            bossesKilled: 0,
            elitesKilled: 0
        };

        // ===== COMBO STATE =====
        // Combo system
        this.combo = {
            count: 0,
            timer: 0,
            timeout: 0.8,             // From GAME_CONSTANTS
            highest: 0,
            multiplier: 1.0
        };

        // ===== ENTITY STATE =====
        // Entity counts and references (not the actual arrays)
        this.entities = {
            enemyCount: 0,
            projectileCount: 0,
            xpOrbCount: 0,
            particleCount: 0,
            maxEnemiesReached: 0      // Statistics
        };

        // ===== META STATE =====
        // Persistent meta progression
        this.meta = {
            starTokens: 0,
            totalStarsEarned: 0,
            achievements: new Set(),
            gamesPlayed: 0,
            totalKills: 0
        };

        // ===== PERFORMANCE STATE =====
        // Performance metrics and quality settings
        this.performance = {
            lowQuality: false,
            renderMode: 'normal',     // 'normal' | 'low' | 'minimal'
            averageFps: 60,
            isLagging: false
        };

        // ===== OBSERVERS =====
        // Event system for reactive updates
        this._observers = new Map();

        // State change history for debugging
        this._stateHistory = [];
        this._maxHistorySize = 10;
        this._debugMode = false;

        // Initialize meta state from localStorage
        this._loadMetaState();
    }

    // ===== RUNTIME STATE METHODS =====

    /**
     * Update game time (called by game loop)
     */
    updateTime(deltaTime) {
        this.runtime.deltaTime = deltaTime;
        this.runtime.gameTime += deltaTime;
        this.runtime.lastUpdateTime = performance.now();
        this._notifyObservers('timeUpdate', { gameTime: this.runtime.gameTime, deltaTime });
    }

    /**
     * Update FPS tracking
     */
    updateFPS(fps) {
        this.runtime.fps = fps;
        this.runtime.frameCount++;

        // Calculate running average
        const alpha = 0.1; // Smoothing factor
        this.performance.averageFps = this.performance.averageFps * (1 - alpha) + fps * alpha;
        this.performance.isLagging = this.performance.averageFps < 30;
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.runtime.isPaused) {
            this.runtime.isPaused = true;
            this._recordStateChange('pause');
            this._notifyObservers('pause');
        }
    }

    /**
     * Resume the game
     */
    resume() {
        if (this.runtime.isPaused) {
            this.runtime.isPaused = false;
            this._recordStateChange('resume');
            this._notifyObservers('resume');
        }
    }

    /**
     * Start the game
     */
    start() {
        this.runtime.isRunning = true;
        this.runtime.isPaused = false;
        this._recordStateChange('start');
        this._notifyObservers('start');
    }

    /**
     * Stop the game
     */
    stop() {
        this.runtime.isRunning = false;
        this._recordStateChange('stop');
        this._notifyObservers('stop');
    }

    // ===== GAME FLOW METHODS =====

    /**
     * Trigger game over
     */
    gameOver() {
        if (!this.flow.isGameOver) {
            this.flow.isGameOver = true;
            this.runtime.isRunning = false;
            this.player.isAlive = false;
            this._recordStateChange('gameOver');
            this._notifyObservers('gameOver');
        }
    }

    /**
     * Trigger game won
     */
    gameWon() {
        if (!this.flow.isGameWon) {
            this.flow.isGameWon = true;
            this.runtime.isRunning = false;
            this._recordStateChange('gameWon');
            this._notifyObservers('gameWon');
        }
    }

    /**
     * Set difficulty
     */
    setDifficulty(difficulty) {
        if (['easy', 'normal', 'hard'].includes(difficulty)) {
            this.flow.difficulty = difficulty;
            this._notifyObservers('difficultyChanged', { difficulty });
        }
    }

    // ===== PLAYER STATE METHODS =====

    /**
     * Set player reference and initialize state
     */
    setPlayer(player) {
        this.player.reference = player;
        if (player) {
            this.syncPlayerState(player);
        }
    }

    /**
     * Sync player state from Player instance
     */
    syncPlayerState(player) {
        if (!player) return;

        const oldLevel = this.player.level;

        this.player.isAlive = !player.isDead;
        this.player.level = player.level || 1;
        this.player.health = player.stats?.health || player.health || 100;
        this.player.maxHealth = player.stats?.maxHealth || player.maxHealth || 100;
        this.player.xp = player.stats?.xp || player.xp || 0;
        this.player.xpToNextLevel = player.stats?.xpToNextLevel || player.xpToNextLevel || 100;
        this.player.x = player.x || 0;
        this.player.y = player.y || 0;

        // Check for level up
        if (this.player.level > oldLevel) {
            this.progression.highestLevel = Math.max(this.progression.highestLevel, this.player.level);
            this._notifyObservers('levelUp', { level: this.player.level });
        }

        // Check for death
        if (!this.player.isAlive && !this.flow.isGameOver) {
            this.gameOver();
        }
    }

    // ===== PROGRESSION METHODS =====

    /**
     * Increment kill count
     */
    addKill(isElite = false, isBoss = false) {
        this.progression.killCount++;
        this.meta.totalKills++;

        if (isElite) {
            this.progression.elitesKilled++;
        }

        if (isBoss) {
            this.progression.bossesKilled++;
            this._notifyObservers('bossKilled', { count: this.progression.bossesKilled });
        }

        // Update combo
        this.combo.count++;
        this.combo.timer = this.combo.timeout;
        if (this.combo.count > this.combo.highest) {
            this.combo.highest = this.combo.count;
        }

        this._notifyObservers('kill', {
            killCount: this.progression.killCount,
            isElite,
            isBoss,
            comboCount: this.combo.count
        });
    }

    /**
     * Add XP collected
     */
    addXP(amount) {
        this.progression.xpCollected += amount;
        this._notifyObservers('xpCollected', { amount, total: this.progression.xpCollected });
    }

    /**
     * Track damage dealt
     */
    addDamageDealt(amount) {
        this.progression.damageDealt += amount;
    }

    /**
     * Track damage taken
     */
    addDamageTaken(amount) {
        this.progression.damageTaken += amount;
        this._notifyObservers('damageTaken', { amount });
    }

    // ===== COMBO METHODS =====

    /**
     * Update combo timer
     */
    updateCombo(deltaTime) {
        if (this.combo.count > 0 && this.combo.timer > 0) {
            this.combo.timer -= deltaTime;

            if (this.combo.timer <= 0) {
                this.resetCombo();
            }
        }

        // Calculate combo multiplier
        const comboTarget = 8; // From GAME_CONSTANTS
        if (this.combo.count >= comboTarget) {
            const bonusCombo = this.combo.count - comboTarget;
            this.combo.multiplier = Math.min(2.5, 1.0 + bonusCombo * 0.1);
        } else {
            this.combo.multiplier = 1.0;
        }
    }

    /**
     * Reset combo
     */
    resetCombo() {
        if (this.combo.count > 0) {
            this.combo.count = 0;
            this.combo.timer = 0;
            this.combo.multiplier = 1.0;
            this._notifyObservers('comboReset');
        }
    }

    // ===== ENTITY STATE METHODS =====

    /**
     * Update entity counts
     */
    updateEntityCounts(enemies, projectiles, xpOrbs, particles) {
        this.entities.enemyCount = enemies;
        this.entities.projectileCount = projectiles;
        this.entities.xpOrbCount = xpOrbs;
        this.entities.particleCount = particles;

        if (enemies > this.entities.maxEnemiesReached) {
            this.entities.maxEnemiesReached = enemies;
        }
    }

    // ===== META STATE METHODS =====

    /**
     * Earn star tokens
     */
    earnStarTokens(amount) {
        this.meta.starTokens += amount;
        this.meta.totalStarsEarned += amount;
        this._saveMetaState();
        this._notifyObservers('starTokensEarned', { amount, total: this.meta.starTokens });
    }

    /**
     * Spend star tokens
     */
    spendStarTokens(amount) {
        if (this.meta.starTokens >= amount) {
            this.meta.starTokens -= amount;
            this._saveMetaState();
            this._notifyObservers('starTokensSpent', { amount, remaining: this.meta.starTokens });
            return true;
        }
        return false;
    }

    /**
     * Unlock achievement
     */
    unlockAchievement(achievementId) {
        if (!this.meta.achievements.has(achievementId)) {
            this.meta.achievements.add(achievementId);
            this._saveMetaState();
            this._notifyObservers('achievementUnlocked', { achievementId });
        }
    }

    // ===== RESET METHODS =====

    /**
     * Reset session state (for new game)
     */
    resetSession() {
        // Reset runtime
        this.runtime.gameTime = 0;
        this.runtime.isPaused = false;
        this.runtime.isRunning = false;

        // Reset flow
        this.flow.isGameOver = false;
        this.flow.isGameWon = false;
        this.flow.hasShownEndScreen = false;

        // Reset player
        this.player.isAlive = true;
        this.player.level = 1;

        // Reset progression
        this.progression.killCount = 0;
        this.progression.xpCollected = 0;
        this.progression.damageDealt = 0;
        this.progression.damageTaken = 0;
        this.progression.highestLevel = 1;
        this.progression.bossesKilled = 0;
        this.progression.elitesKilled = 0;

        // Reset combo
        this.combo.count = 0;
        this.combo.timer = 0;
        this.combo.highest = 0;
        this.combo.multiplier = 1.0;

        // Reset entity counts
        this.entities.enemyCount = 0;
        this.entities.projectileCount = 0;
        this.entities.xpOrbCount = 0;
        this.entities.particleCount = 0;

        // Increment meta stats
        this.meta.gamesPlayed++;

        this._recordStateChange('resetSession');
        this._notifyObservers('sessionReset');
    }

    // ===== OBSERVER PATTERN =====

    /**
     * Subscribe to state changes
     * @param {string} event - Event name ('kill', 'levelUp', 'pause', etc.) or '*' for all
     * @param {Function} callback - Function to call when event occurs
     */
    on(event, callback) {
        if (!this._observers.has(event)) {
            this._observers.set(event, []);
        }
        this._observers.get(event).push(callback);
    }

    /**
     * Unsubscribe from state changes
     */
    off(event, callback) {
        if (this._observers.has(event)) {
            const callbacks = this._observers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Notify observers of state change
     */
    _notifyObservers(event, data = {}) {
        // Notify specific event listeners
        if (this._observers.has(event)) {
            this._observers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in observer callback for ${event}:`, error);
                }
            });
        }

        // Notify wildcard listeners
        if (this._observers.has('*')) {
            this._observers.get('*').forEach(callback => {
                try {
                    callback({ event, ...data });
                } catch (error) {
                    console.error(`Error in wildcard observer callback:`, error);
                }
            });
        }
    }

    // ===== PERSISTENCE =====

    /**
     * Load meta state from localStorage
     */
    _loadMetaState() {
        // Skip localStorage in Node.js environment (for testing)
        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            const starTokens = parseInt(localStorage.getItem('starTokens') || '0', 10);
            this.meta.starTokens = isNaN(starTokens) ? 0 : starTokens;

            const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0', 10);
            this.meta.gamesPlayed = isNaN(gamesPlayed) ? 0 : gamesPlayed;

            const totalKills = parseInt(localStorage.getItem('totalKills') || '0', 10);
            this.meta.totalKills = isNaN(totalKills) ? 0 : totalKills;

            // Use separate key to avoid conflict with AchievementSystem
            const achievements = localStorage.getItem('gamestate_achievements');
            if (achievements) {
                try {
                    const parsed = JSON.parse(achievements);
                    // GameState format is always an array of IDs
                    if (Array.isArray(parsed)) {
                        this.meta.achievements = new Set(parsed);
                    } else {
                        console.warn('GameState achievements has invalid format, resetting');
                        this.meta.achievements = new Set();
                    }
                } catch (parseError) {
                    console.warn('Failed to parse GameState achievements, resetting:', parseError);
                    this.meta.achievements = new Set();
                }
            } else {
                // Try to migrate from old AchievementSystem format (one-time migration)
                const oldAchievements = localStorage.getItem('achievements');
                if (oldAchievements) {
                    try {
                        const parsed = JSON.parse(oldAchievements);
                        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                            // Old AchievementSystem format: extract unlocked IDs
                            const unlockedIds = [];
                            for (const [key, data] of Object.entries(parsed)) {
                                if (data && data.unlocked === true) {
                                    unlockedIds.push(key);
                                }
                            }
                            this.meta.achievements = new Set(unlockedIds);
                            // Save in new format
                            this._saveMetaState();
                            console.log(`✅ Migrated ${unlockedIds.length} achievements from AchievementSystem`);
                        }
                    } catch (error) {
                        console.warn('Failed to migrate old achievements:', error);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load meta state:', error);
        }
    }

    /**
     * Save meta state to localStorage
     */
    _saveMetaState() {
        // Skip localStorage in Node.js environment (for testing)
        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            localStorage.setItem('starTokens', this.meta.starTokens.toString());
            localStorage.setItem('gamesPlayed', this.meta.gamesPlayed.toString());
            localStorage.setItem('totalKills', this.meta.totalKills.toString());
            // Use different key to avoid conflict with AchievementSystem
            localStorage.setItem('gamestate_achievements', JSON.stringify([...this.meta.achievements]));
        } catch (error) {
            console.warn('Failed to save meta state:', error);
        }
    }

    // ===== DEBUGGING =====

    /**
     * Record state change for debugging
     */
    _recordStateChange(action) {
        if (!this._debugMode) return;

        this._stateHistory.push({
            timestamp: performance.now(),
            action,
            gameTime: this.runtime.gameTime,
            snapshot: this.getSnapshot()
        });

        if (this._stateHistory.length > this._maxHistorySize) {
            this._stateHistory.shift();
        }
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this._debugMode = true;
        console.log('GameState debug mode enabled');
    }

    /**
     * Get current state snapshot
     */
    getSnapshot() {
        return {
            runtime: { ...this.runtime },
            flow: { ...this.flow },
            player: { ...this.player, reference: null }, // Exclude reference
            progression: { ...this.progression },
            combo: { ...this.combo },
            entities: { ...this.entities },
            meta: {
                ...this.meta,
                achievements: [...this.meta.achievements]
            },
            performance: { ...this.performance }
        };
    }

    /**
     * Get state history
     */
    getHistory() {
        return [...this._stateHistory];
    }

    /**
     * Get formatted summary for display
     */
    getSummary() {
        return {
            time: Math.floor(this.runtime.gameTime),
            kills: this.progression.killCount,
            level: this.player.level,
            combo: this.combo.count,
            bossesKilled: this.progression.bossesKilled,
            isRunning: this.runtime.isRunning,
            isPaused: this.runtime.isPaused,
            fps: Math.round(this.runtime.fps)
        };
    }

    /**
     * Validate state integrity
     */
    validate() {
        const issues = [];

        // Check for negative values
        if (this.runtime.gameTime < 0) issues.push('Negative gameTime');
        if (this.player.health < 0) issues.push('Negative health');
        if (this.progression.killCount < 0) issues.push('Negative killCount');
        if (this.meta.starTokens < 0) issues.push('Negative starTokens');

        // Check for invalid states
        if (this.runtime.isRunning && this.runtime.isPaused) {
            issues.push('Cannot be running and paused simultaneously');
        }

        if (this.flow.isGameOver && this.runtime.isRunning) {
            issues.push('Cannot be running when game is over');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.GameState = GameState;
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
}

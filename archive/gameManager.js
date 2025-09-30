/**
 * 🌊 GAME MANAGER - Modern Component-Based Architecture
 * 🤖 RESONANT NOTE: Refactored from massive 2,400+ line monolith to clean composition
 * Uses component composition for better maintainability and separation of concerns
 * 
 * Components:
 * - UIManager: All UI initialization, updates, and interactions
 * - EffectsManager: Visual effects, particles, screen shake, floating text
 * - DifficultyManager: Difficulty scaling, progression curves, adaptive balancing
 * - StatsManager: Statistics tracking, achievements, combos, progression
 */

// Use global window objects instead of ES6 imports for script-tag compatibility
// Managers are accessed directly via window.UIManager, window.EffectsManager, etc.

class GameManager {
    constructor() {
        // Core game systems
        this.game = new GameEngine();
        this.enemySpawner = new EnemySpawner(this.game);
        
        // Game state
        this.gameTime = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.winScreenDisplayed = false;
        this.endScreenShown = false;
        this.isPaused = false;
        
        // Initialize components using composition with safety checks
        this.uiManager = (typeof window.UIManager !== 'undefined') ? new window.UIManager(this) : null;
        this.effectsManager = (typeof window.EffectsManager !== 'undefined') ? new window.EffectsManager(this) : null;
        this.difficultyManager = (typeof window.DifficultyManager !== 'undefined') ? new window.DifficultyManager(this) : null;
        this.statsManager = (typeof window.StatsManager !== 'undefined') ? new window.StatsManager(this) : null;
        
        // Warn if components are missing
        if (!this.uiManager) (window.logger?.warn || console.warn)('UIManager not available');
        if (!this.effectsManager) (window.logger?.warn || console.warn)('EffectsManager not available');
        if (!this.difficultyManager) (window.logger?.warn || console.warn)('DifficultyManager not available');
        if (!this.statsManager) (window.logger?.warn || console.warn)('StatsManager not available');
        
        // Game settings from URL params
        this.endlessMode = false;
        this.lowQuality = false;
        this.difficultyFactor = 1.0;
        this.metaStars = parseInt(localStorage.getItem('starTokens') || '0', 10);
        
        this.initializeGameSettings();
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

        // Event handling
        this.initializeEventHandlers();
        
        // Boss mode system
        this.bossMode = false;
        this.bossModeTimer = 0;
        this.bossModeDuration = 30; // seconds
        
        // Performance monitoring
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 60; // 60 FPS target
    }
    
    /**
     * Initialize game settings from URL params
     */
    initializeGameSettings() {
        if (window.urlParams) {
            this.endlessMode = window.urlParams.getBoolean('mode') && window.urlParams.get('mode') === 'endless';
            this.lowQuality = window.urlParams.getBoolean('quality') && window.urlParams.get('quality') === 'low';
            
            // Configure difficulty manager for endless mode
            if (this.endlessMode) {
                if (this.difficultyManager) this.difficultyManager.setEndlessMode(true);
            }
            
            // Configure effects manager for low quality
            if (this.lowQuality) {
                if (this.effectsManager) this.effectsManager.setQualityMode('low');
            }
        }
    }
    
    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        // Key handling for pause
        window.addEventListener('keydown', this.handleKeyDown);
        
        // Handle visibility change (pause when tab is not visible)
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    handleKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            this.game.togglePause();
            if (this.uiManager) this.uiManager.updatePauseButton();
        }
    }

    handleVisibilityChange() {
        if (document.hidden && !this.gameOver) {
            this.game.isPaused = true;
            if (this.uiManager) this.uiManager.updatePauseButton();
        }
    }
    
    /**
     * Main game manager update loop - delegates to components
     */
    update(deltaTime) {
        // Skip update if game is over or paused
        if (this.gameOver || this.game.isPaused) return;
        
        // Update game time
        this.gameTime += deltaTime;

        // Update timer display
        this.updateTimerDisplay();

        // Update boss countdown
        this.updateBossCountdown();

        // Update all components
        this.updateComponents(deltaTime);
        
        // Handle boss mode
        this.updateBossMode(deltaTime);
        
        // Check win/lose conditions
        this.checkGameConditions();
        
        // Performance monitoring
        this.monitorPerformance();
    }
    
    /**
     * Update all manager components
     */
    updateComponents(deltaTime) {
        // Update in order of dependencies
        if (this.difficultyManager) this.difficultyManager.update(deltaTime);
        if (this.statsManager) this.statsManager.update(deltaTime);
        if (this.effectsManager) this.effectsManager.update(deltaTime);
        if (this.uiManager) this.uiManager.update(deltaTime);
    }
    
    /**
     * Update boss mode system
     */
    updateBossMode(deltaTime) {
        if (this.bossMode) {
            this.bossModeTimer += deltaTime;
            
            if (this.bossModeTimer >= this.bossModeDuration) {
                this.deactivateBossMode();
            }
        }
    }
    
    /**
     * Check game win/lose conditions
     */
    checkGameConditions() {
        const player = this.game.player;
        
        // Check lose condition
        if (player && player.isDead && !this.gameOver) {
            this.gameOver = true;
            this.onGameOver();
        }
        
    }
    
    /**
     * Monitor performance and adjust settings
     */
    monitorPerformance() {
        if (window.performanceManager) {
            const performanceMode = window.performanceManager.performanceMode;
            
            // Adjust update intervals based on performance
            switch (performanceMode) {
                case 'critical':
                    this.updateInterval = 1000 / 30; // 30 FPS
                    break;
                case 'low':
                    this.updateInterval = 1000 / 45; // 45 FPS
                    break;
                default:
                    this.updateInterval = 1000 / 60; // 60 FPS
            }
        }
    }
    
    /**
     * Handle game over
     */
    onGameOver() {
        // Save final statistics
        if (this.statsManager) this.statsManager.savePersistentStats();
        
        // Show game over screen
        if (this.uiManager) this.uiManager.showGameOverScreen();

        // Play game over sound
        if (window.audioSystem) {
            window.audioSystem.play('gameOver', 0.7);
        }

        // Create dramatic death effect
        if (this.game.player && this.effectsManager) {
            this.effectsManager.createExplosion(
                this.game.player.x,
                this.game.player.y,
                100,
                '#e74c3c'
            );
            this.effectsManager.addScreenShake(20, 2.0);
        }

        this.showRunSummary({
            title: 'Defeat',
            subtitle: `You survived ${this.formatTime(this.gameTime)}.`,
            outcome: 'defeat',
            buttons: [
                { label: 'Retry Run', action: () => this.startGame() },
                { label: 'Main Menu', action: () => this.returnToMenu() }
            ]
        });
    }
    
    /**
     * Handle game won
     */
    onGameWon() {
        if (this.endScreenShown) return;
        this.winScreenDisplayed = true;

        // Award bonus star tokens for winning
        if (this.statsManager) this.statsManager.earnStarTokens(10);

        // Show win screen
        this.showRunSummary({
            title: 'Victory!',
            subtitle: `Boss defeated in ${this.formatTime(this.gameTime)}.`,
            outcome: 'victory',
            buttons: [
                { label: 'Continue Run', action: () => this.resumeRun() },
                { label: 'Start New Run', action: () => this.startGame() },
                { label: 'Main Menu', action: () => this.returnToMenu() }
            ]
        });

        // Play victory sound
        if (window.audioSystem) {
            window.audioSystem.play('victory', 0.8);
        }
        
        // Create celebration effect
        if (this.game.player) {
            this.effectsManager.createLevelUpEffect(this.game.player.x, this.game.player.y);
            this.effectsManager.showCombatText(
                'VICTORY!',
                this.game.player.x,
                this.game.player.y - 50,
                'critical', 36
            );
        }
    }
    
    /**
     * Show win screen
     */
    showWinScreen() {}

    formatTime(totalSeconds) {
        const seconds = Math.max(0, Math.floor(totalSeconds || 0));
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
        }
        return `${remaining}s`;
    }

    getRunSummaryStats() {
        const stats = [];

        if (this.statsManager?.getStatsSummary) {
            const summary = this.statsManager.getStatsSummary();
            stats.push({ label: 'Enemies Defeated', value: summary.killCount ?? 0 });

            const level = summary.highestLevel ?? summary.level ?? this.game?.player?.level ?? 1;
            stats.push({ label: 'Highest Level', value: level });

            if (summary.highestCombo !== undefined) {
                stats.push({ label: 'Best Combo', value: `${summary.highestCombo || 0}x` });
            }

            if (summary.totalDamageDealt !== undefined) {
                stats.push({ label: 'Damage Dealt', value: Math.round(summary.totalDamageDealt) });
            }

            stats.push({ label: 'Survival Time', value: this.formatTime(this.gameTime) });

            if (summary.starTokensEarned !== undefined) {
                stats.push({ label: 'Star Tokens Earned', value: summary.starTokensEarned });
            }

            if (summary.survivalRating) {
                stats.push({ label: 'Survival Rating', value: summary.survivalRating });
            }
        } else {
            stats.push({ label: 'Survival Time', value: this.formatTime(this.gameTime) });
            const kills = this.statsManager?.killCount ?? this.game?.player?.stats?.killStreak ?? 0;
            stats.push({ label: 'Enemies Defeated', value: kills });
        }

        return stats;
    }

    showRunSummary({ title, subtitle = '', outcome = 'summary', buttons = [] }) {
        if (this.endScreenShown) return;
        this.endScreenShown = true;

        const stats = this.getRunSummaryStats();

        if (window.resultScreen && typeof window.resultScreen.show === 'function') {
            window.resultScreen.show({
                title,
                subtitle,
                stats,
                outcome,
                buttons
            });
        } else {
            let message = `${title}\n${subtitle}`.trim();
            stats.forEach(stat => {
                message += `\n${stat.label}: ${stat.value}`;
            });
            alert(message);
        }

        if (this.game) {
            this.game.isPaused = true;
        }
    }

    returnToMenu() {
        const gameContainer = document.getElementById('game-container');
        const mainMenu = document.getElementById('main-menu');
        if (gameContainer) gameContainer.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');

        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');

        if (this.game) {
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            }
            if (typeof this.game.prepareNewRun === 'function') {
                this.game.prepareNewRun();
            }
            this.game.isPaused = true;
        }

        this.gameOver = true;
        this.gameWon = false;
        this.endScreenShown = false;
        this.winScreenDisplayed = false;

        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        this.uiManager?.updatePauseButton?.();
        this.updateStarDisplay?.();

        const bossCountdown = document.getElementById('boss-countdown');
        if (bossCountdown) bossCountdown.classList.add('hidden');
    }

    resumeRun() {
        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        this.gameWon = false;
        this.gameOver = false;
        this.endScreenShown = false;
        this.winScreenDisplayed = false;

        if (this.game) {
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.isPaused = false;
            }
        }

        this.uiManager?.updatePauseButton?.();
    }
    
    /**
     * Activate boss mode
     */
    activateBossMode() {
        this.bossMode = true;
        this.bossModeTimer = 0;
        
        // Visual effects for boss mode activation
        this.effectsManager.addScreenShake(8, 1.0);
        
        if (this.game.player) {
            this.effectsManager.showCombatText(
                'BOSS MODE ACTIVATED!',
                this.game.player.x,
                this.game.player.y - 60,
                'critical', 28
            );
        }
        
        // Play boss mode sound
        if (window.audioSystem) {
            window.audioSystem.play('bossMode', 0.6);
        }
    }
    
    /**
     * Deactivate boss mode
     */
    deactivateBossMode() {
        this.bossMode = false;
        this.bossModeTimer = 0;
        
        if (this.game.player) {
            this.effectsManager.showCombatText(
                'Boss Mode Ended',
                this.game.player.x,
                this.game.player.y - 40,
                'heal', 20
            );
        }
    }
    
    /**
     * Handle enemy death (called by enemy die prototype override)
     */
    onEnemyDied(enemy) {
        // Delegate to stats manager
        const kills = this.statsManager.incrementKills();
        
        // Create death effects
        if (enemy.isBoss || enemy.isMegaBoss) {
            this.effectsManager.createBossDeathEffect(enemy.x, enemy.y);
            this.statsManager.onBossKilled();

            if (!this.endlessMode && !this.gameWon) {
                this.gameWon = true;
                this.onGameWon();
            }
        } else {
            this.effectsManager.createHitEffect(enemy.x, enemy.y, enemy.maxHealth);
        }
        
        // Show kill text
        this.effectsManager.showCombatText('+1', enemy.x, enemy.y - 30, 'combo', 16);
        
        // Show milestone messages
        if (kills % 50 === 0) {
            const player = this.game.player;
            if (player) {
                this.effectsManager.showCombatText(
                    `${kills} KILLS!`,
                    player.x, player.y - 50,
                    'critical', 24
                );
            }
        }
    }
    
    /**
     * Handle XP collection
     */
    onXPCollected(amount) {
        return this.statsManager.collectXP(amount);
    }
    
    /**
     * Handle player level up
     */
    onPlayerLevelUp(player) {
        // Create level up effect
        this.effectsManager.createLevelUpEffect(player.x, player.y);
        this.effectsManager.addScreenShake(5, 0.5);
        
        // Show level up screen
        this.uiManager.showLevelUpScreen();
        
        // Play level up sound
        if (window.audioSystem) {
            window.audioSystem.play('levelUp', 0.6);
        }
        
        // Award star token every 5 levels
        if (player.level % 5 === 0) {
            this.statsManager.earnStarTokens(1);
        }
    }
    
    /**
     * Handle wave completion
     */
    onWaveCompleted(waveNumber) {
        this.statsManager.trackSpecialEvent('wave_completed');
        
        // Award bonus XP for wave completion
        if (this.game.player) {
            const bonusXP = waveNumber * 10;
            this.game.player.gainXP(bonusXP);
            
            this.effectsManager.showCombatText(
                `Wave ${waveNumber} Complete! +${bonusXP} XP`,
                this.game.player.x,
                this.game.player.y - 70,
                'xp', 22
            );
        }
    }
    
    /**
     * Convenience methods for components
     */
    
    // Stats methods
    incrementKills() {
        return this.statsManager.incrementKills();
    }
    
    earnStarTokens(amount) {
        return this.statsManager.earnStarTokens(amount);
    }
    
    /**
     * Save star tokens to localStorage
     */
    saveStarTokens() {
        localStorage.setItem('starTokens', this.metaStars.toString());
    }
    
    /**
     * Update star display in UI
     */
    updateStarDisplay() {
        const starDisplay = document.getElementById('star-menu-display');
        if (starDisplay) {
            starDisplay.textContent = '⭐ ' + this.metaStars;
        }
        
        const vendorDisplay = document.getElementById('vendor-star-display');
        if (vendorDisplay) {
            vendorDisplay.textContent = '⭐ ' + this.metaStars;
        }
    }
    
    /**
     * Handle when an upgrade is maxed out
     */
    onUpgradeMaxed(upgradeId) {
        console.log('Upgrade maxed:', upgradeId);
        // Could trigger achievement or other effects here
    }

    // Effects methods
    showFloatingText(text, x, y, color, size) {
        return this.effectsManager.showFloatingText(text, x, y, color, size);
    }
    
    showCombatText(text, x, y, effect, size) {
        return this.effectsManager.showCombatText(text, x, y, effect, size);
    }
    
    addScreenShake(amount, duration) {
        return this.effectsManager.addScreenShake(amount, duration);
    }
    
    createHitEffect(x, y, damage) {
        return this.effectsManager.createHitEffect(x, y, damage);
    }
    
    // Difficulty methods
    getDifficultyFactor() {
        return this.difficultyManager.difficultyFactor;
    }
    
    scaleEnemy(enemy) {
        return this.difficultyManager.scaleEnemy(enemy);
    }
    
    scaleBoss(boss) {
        return this.difficultyManager.scaleBoss(boss);
    }
    
    /**
     * Start the game
     */
    startGame() {
        // Reset game state
        this.gameTime = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.winScreenDisplayed = false;
        this.endScreenShown = false;
        this.bossMode = false;
        this.bossModeTimer = 0;

        // Reset all components
        if (this.statsManager && typeof this.statsManager.resetSession === 'function') this.statsManager.resetSession();
        if (this.difficultyManager && typeof this.difficultyManager.reset === 'function') this.difficultyManager.reset();
        if (this.effectsManager && typeof this.effectsManager.clearAllEffects === 'function') this.effectsManager.clearAllEffects();
        if (this.enemySpawner && typeof this.enemySpawner.reset === 'function') this.enemySpawner.reset();

        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        // Start the game engine
        if (this.game) {
            this.game.start();
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.isPaused = false;
            }
        }

        // Hide UI screens
        if (this.uiManager && typeof this.uiManager.hideLevelUpScreen === 'function') this.uiManager.hideLevelUpScreen();
        
        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }
    }
    
    /**
     * Get comprehensive game state
     */
    getGameState() {
        return {
            // Core game state
            gameTime: this.gameTime,
            gameOver: this.gameOver,
            gameWon: this.gameWon,
            bossMode: this.bossMode,
            endlessMode: this.endlessMode,
            lowQuality: this.lowQuality,
            
            // Component states
            ui: this.uiManager.getUIState(),
            effects: this.effectsManager.getEffectsState(),
            difficulty: this.difficultyManager.getDifficultyState(),
            stats: this.statsManager.getStatsState(),
            
            // Performance metrics
            updateInterval: this.updateInterval,
            lastUpdateTime: this.lastUpdateTime
        };
    }
    
    /**
     * Update the timer display
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer-display');
        if (timerElement) {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = Math.floor(this.gameTime % 60);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Update boss spawn countdown
     */
    updateBossCountdown() {
        if (!this.enemySpawner) return;

        const bossCountdownElement = document.getElementById('boss-countdown');
        const bossTimerElement = document.getElementById('boss-timer');

        if (bossCountdownElement && bossTimerElement) {
            const timeUntilBoss = this.enemySpawner.bossInterval - this.enemySpawner.bossTimer;

            // Show countdown when boss spawn is within 10 seconds
            if (timeUntilBoss <= 10 && timeUntilBoss > 0) {
                bossCountdownElement.classList.remove('hidden');
                bossTimerElement.textContent = Math.ceil(timeUntilBoss);
            } else {
                bossCountdownElement.classList.add('hidden');
            }
        }
    }

    /**
     * Restart game
     */
    restart() {
        // Reset core game state
        this.gameTime = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.winScreenDisplayed = false;
        this.bossMode = false;
        this.bossModeTimer = 0;
        
        // Reset all components
        if (this.statsManager && typeof this.statsManager.resetSession === 'function') this.statsManager.resetSession();
        if (this.difficultyManager && typeof this.difficultyManager.reset === 'function') this.difficultyManager.reset();
        if (this.effectsManager && typeof this.effectsManager.clearAllEffects === 'function') this.effectsManager.clearAllEffects();
        
        // Restart game engine
        if (this.game.restart) {
            this.game.restart();
        }
        
        // Hide UI screens
        if (this.uiManager && typeof this.uiManager.hideLevelUpScreen === 'function') this.uiManager.hideLevelUpScreen();
        
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
            gameOverScreen.classList.add('hidden');
        }
        
        const winScreen = document.getElementById('win-screen');
        if (winScreen) {
            winScreen.classList.add('hidden');
        }
    }
    
    /**
     * Clean shutdown
     */
    shutdown() {
        // Save persistent data
        this.statsManager.savePersistentStats();
        
        // Clear all effects
        this.effectsManager.clearAllEffects();
        
        // Remove event listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Make globally available for script-tag loading
if (typeof window !== 'undefined') {
    window.GameManager = GameManager;
}

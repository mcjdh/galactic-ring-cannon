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

import UIManager from './systems/UIManager.js';
import EffectsManager from './systems/EffectsManager.js';
import DifficultyManager from './systems/DifficultyManager.js';
import StatsManager from './systems/StatsManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

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
        this.isPaused = false;
        
        // Initialize components using composition with safety checks
        this.uiManager = (typeof UIManager !== 'undefined') ? new UIManager(this) : null;
        this.effectsManager = (typeof EffectsManager !== 'undefined') ? new EffectsManager(this) : null;
        this.difficultyManager = (typeof DifficultyManager !== 'undefined') ? new DifficultyManager(this) : null;
        this.statsManager = (typeof StatsManager !== 'undefined') ? new StatsManager(this) : null;
        
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
        
        // Check win condition (if not endless mode)
        const winDuration = (GAME_CONSTANTS && GAME_CONSTANTS.MODES && GAME_CONSTANTS.MODES.NORMAL_DURATION)
            ? GAME_CONSTANTS.MODES.NORMAL_DURATION
            : 180;
        if (!this.endlessMode && !this.gameWon && this.gameTime >= winDuration) {
            this.gameWon = true;
            this.onGameWon();
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
    }
    
    /**
     * Handle game won
     */
    onGameWon() {
        if (this.winScreenDisplayed) return;
        this.winScreenDisplayed = true;
        
        // Award bonus star tokens for winning
        if (this.statsManager) this.statsManager.earnStarTokens(10);
        
        // Show win screen
        this.showWinScreen();
        
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
    showWinScreen() {
        const winScreen = document.getElementById('win-screen');
        if (winScreen) {
            winScreen.classList.remove('hidden');
            
            // Update win screen with final stats
            const finalStats = this.statsManager.getStatsSummary();
            
            const winStats = document.getElementById('win-stats');
            if (winStats) {
                winStats.innerHTML = `
                    <h3>Victory Statistics</h3>
                    <p>Enemies Defeated: ${finalStats.killCount}</p>
                    <p>Level Reached: ${finalStats.highestLevel}</p>
                    <p>Highest Combo: ${finalStats.highestCombo}x</p>
                    <p>Survival Rating: ${finalStats.survivalRating}</p>
                    <p>Star Tokens Earned: ${finalStats.starTokensEarned}</p>
                `;
            }
        }
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
        this.bossMode = false;
        this.bossModeTimer = 0;
        
        // Reset all components
        this.statsManager.resetSession();
        this.difficultyManager.reset();
        this.effectsManager.clearAllEffects();
        
        // Start the game engine
        this.game.start();
        
        // Hide UI screens
        this.uiManager.hideLevelUpScreen();
        
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
        this.statsManager.resetSession();
        this.difficultyManager.reset();
        this.effectsManager.clearAllEffects();
        
        // Restart game engine
        if (this.game.restart) {
            this.game.restart();
        }
        
        // Hide UI screens
        this.uiManager.hideLevelUpScreen();
        
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

// Export for ES6 module system
export default GameManager;

// Also make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.GameManager = GameManager;
}

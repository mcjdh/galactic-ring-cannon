/**
 * 🌊 UNIFIED UI MANAGER - Resonant Multi-Agent Architecture
 * 🤖 RESONANT NOTE: Extracted from massive GameManager.js (2,400+ lines)
 * Handles all UI initialization, updates, and interactions
 * 
 * Single responsibility: Manage all user interface elements and updates
 * Coordinates with other systems through clean interfaces
 * (Non-module version for script-tag loading)
 */

class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // UI update timing
        this.uiUpdateTimer = 0;
        this.uiUpdateIntervalNormal = 0.25; // seconds
        this.uiUpdateIntervalLow = 0.5;
        this.uiUpdateIntervalCritical = 1.0;
        this.uiUpdateIntervalCurrent = this.uiUpdateIntervalNormal;
        
        // UI element references
        this.elements = {
            healthBar: null,
            xpBar: null,
            levelDisplay: null,
            scoreDisplay: null,
            timerDisplay: null,
            starTokenDisplay: null,
            comboContainer: null,
            comboFill: null,
            comboText: null,
            pauseButton: null,
            soundButton: null,
            minimapContainer: null
        };
        
        // Minimap system
        this.minimap = {
            canvas: null,
            ctx: null,
            width: 150,
            height: 150,
            scale: 0.1,
            updateInterval: 100, // ms
            lastUpdate: 0
        };
        
        this.minimapUpdateInterval = 100; // milliseconds
        this.minimapUpdateIntervalLow = 200;
        this.lastMinimapUpdate = 0;
        
        // Sound system state
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        
        // Initialize all UI systems
        this.initializeAllUI();
    }
    
    /**
     * Initialize all UI components
     */
    initializeAllUI() {
        this.initializeBasicUI();
        this.initializePauseControls();
        this.initializeSoundButton();
        this.initializeMinimap();
        this.cacheUIElements();
    }
    
    /**
     * Initialize basic UI elements
     */
    initializeBasicUI() {
        // Create UI container if it doesn't exist
        let uiContainer = document.getElementById('ui-container');
        if (!uiContainer) {
            uiContainer = document.createElement('div');
            uiContainer.id = 'ui-container';
            document.body.appendChild(uiContainer);
        }
        
        // Create health bar
        this.createHealthBar(uiContainer);
        
        // Create XP bar
        this.createXPBar(uiContainer);
        
        // Create level display
        this.createLevelDisplay(uiContainer);
        
        // Create combo system UI
        this.createComboUI(uiContainer);
        
        // Create score and timer displays
        this.createScoreDisplay();
        this.createTimerDisplay();
        this.createStarTokenDisplay();
    }
    
    /**
     * Create health bar UI
     */
    createHealthBar(container) {
        let healthBar = document.getElementById('health-bar');
        if (!healthBar) {
            healthBar = document.createElement('div');
            healthBar.id = 'health-bar';
            healthBar.className = 'stat-bar';
            container.appendChild(healthBar);
        }
        this.elements.healthBar = healthBar;
    }
    
    /**
     * Create XP bar UI
     */
    createXPBar(container) {
        let xpBar = document.getElementById('xp-bar');
        if (!xpBar) {
            xpBar = document.createElement('div');
            xpBar.id = 'xp-bar';
            xpBar.className = 'stat-bar';
            container.appendChild(xpBar);
        }
        this.elements.xpBar = xpBar;
    }
    
    /**
     * Create level display
     */
    createLevelDisplay(container) {
        let levelDisplay = document.getElementById('level-display');
        if (!levelDisplay) {
            levelDisplay = document.createElement('div');
            levelDisplay.id = 'level-display';
            levelDisplay.textContent = 'Level: 1';
            container.appendChild(levelDisplay);
        }
        this.elements.levelDisplay = levelDisplay;
    }
    
    /**
     * Create combo system UI
     */
    createComboUI(container) {
        let comboContainer = document.getElementById('combo-container');
        if (!comboContainer) {
            comboContainer = document.createElement('div');
            comboContainer.id = 'combo-container';
            
            const comboFill = document.createElement('div');
            comboFill.id = 'combo-fill';
            comboContainer.appendChild(comboFill);
            
            container.appendChild(comboContainer);
        }
        
        let comboText = document.getElementById('combo-text');
        if (!comboText) {
            comboText = document.createElement('div');
            comboText.id = 'combo-text';
            comboText.textContent = 'Combo: 0x';
            container.appendChild(comboText);
        }
        
        this.elements.comboContainer = comboContainer;
        this.elements.comboFill = document.getElementById('combo-fill');
        this.elements.comboText = comboText;
    }
    
    /**
     * Create score display
     */
    createScoreDisplay() {
        let scoreDisplay = document.getElementById('score-display');
        if (!scoreDisplay) {
            scoreDisplay = document.createElement('div');
            scoreDisplay.id = 'score-display';
            scoreDisplay.textContent = 'Kills: 0';
            document.body.appendChild(scoreDisplay);
        }
        this.elements.scoreDisplay = scoreDisplay;
    }
    
    /**
     * Create timer display
     */
    createTimerDisplay() {
        let timerDisplay = document.getElementById('timer-display');
        if (!timerDisplay) {
            timerDisplay = document.createElement('div');
            timerDisplay.id = 'timer-display';
            timerDisplay.textContent = '00:00';
            document.body.appendChild(timerDisplay);
        }
        this.elements.timerDisplay = timerDisplay;
    }
    
    /**
     * Create star token display
     */
    createStarTokenDisplay() {
        let starDisplay = document.getElementById('star-token-display');
        if (!starDisplay) {
            starDisplay = document.createElement('div');
            starDisplay.id = 'star-token-display';
            starDisplay.textContent = '⭐ 0';
            document.body.appendChild(starDisplay);
        }
        this.elements.starTokenDisplay = starDisplay;
    }
    
    /**
     * Initialize pause controls
     */
    initializePauseControls() {
        let pauseButton = document.getElementById('pause-button');
        if (!pauseButton) {
            pauseButton = document.createElement('button');
            pauseButton.id = 'pause-button';
            pauseButton.textContent = 'Pause';
            pauseButton.className = 'control-button';
            
            pauseButton.addEventListener('click', () => {
                this.gameManager.game.togglePause();
                this.updatePauseButton();
            });
            
            document.body.appendChild(pauseButton);
        }
        
        this.elements.pauseButton = pauseButton;
    }
    
    /**
     * Initialize sound button
     */
    initializeSoundButton() {
        let soundButton = document.getElementById('sound-button');
        if (!soundButton) {
            soundButton = document.createElement('button');
            soundButton.id = 'sound-button';
            soundButton.className = 'control-button';
            
            soundButton.addEventListener('click', () => {
                this.toggleSound();
            });
            
            document.body.appendChild(soundButton);
        }
        
        this.elements.soundButton = soundButton;
        this.updateSoundButton();
    }
    
    /**
     * Initialize minimap
     */
    initializeMinimap() {
        let minimapContainer = document.getElementById('minimap-container');
        if (!minimapContainer) {
            minimapContainer = document.createElement('div');
            minimapContainer.id = 'minimap-container';
            minimapContainer.className = 'minimap-container';
            
            const minimapCanvas = document.createElement('canvas');
            minimapCanvas.id = 'minimap-canvas';
            minimapCanvas.width = this.minimap.width;
            minimapCanvas.height = this.minimap.height;
            
            minimapContainer.appendChild(minimapCanvas);
            document.body.appendChild(minimapContainer);
            
            this.minimap.canvas = minimapCanvas;
            this.minimap.ctx = minimapCanvas.getContext('2d');
        }
        
        this.elements.minimapContainer = minimapContainer;
    }
    
    /**
     * Cache UI element references for performance
     */
    cacheUIElements() {
        this.elements.healthBar = document.getElementById('health-bar');
        this.elements.xpBar = document.getElementById('xp-bar');
        this.elements.levelDisplay = document.getElementById('level-display');
        this.elements.scoreDisplay = document.getElementById('score-display');
        this.elements.timerDisplay = document.getElementById('timer-display');
        this.elements.starTokenDisplay = document.getElementById('star-token-display');
        this.elements.comboContainer = document.getElementById('combo-container');
        this.elements.comboFill = document.getElementById('combo-fill');
        this.elements.comboText = document.getElementById('combo-text');
    }
    
    /**
     * Main UI update method
     */
    update(deltaTime) {
        this.uiUpdateTimer += deltaTime;
        
        // Adaptive UI refresh rate based on performance mode
        const performanceMode = window.performanceManager?.performanceMode || 'normal';
        switch (performanceMode) {
            case 'low':
                this.uiUpdateIntervalCurrent = this.uiUpdateIntervalLow;
                break;
            case 'critical':
                this.uiUpdateIntervalCurrent = this.uiUpdateIntervalCritical;
                break;
            default:
                this.uiUpdateIntervalCurrent = this.uiUpdateIntervalNormal;
        }
        
        // Update UI elements at intervals
        if (this.uiUpdateTimer >= this.uiUpdateIntervalCurrent) {
            this.uiUpdateTimer = 0;
            this.updateAllUI();
        }
        
        // Update minimap at its own interval
        this.updateMinimap();
    }
    
    /**
     * Update all UI elements
     */
    updateAllUI() {
        this.updatePlayerUI();
        this.updateGameUI();
        this.updateComboUI();
        this.updateSkillCooldowns();
    }
    
    /**
     * Update player-related UI
     */
    updatePlayerUI() {
        const player = this.gameManager.game.player;
        if (!player) return;
        
        // Update health bar
        if (this.elements.healthBar) {
            const healthPercent = (player.health / player.maxHealth) * 100;
            this.elements.healthBar.style.setProperty('--health-width', `${healthPercent}%`);
        }
        
        // Update XP bar
        if (this.elements.xpBar) {
            const xpPercent = (player.xp / player.xpToNextLevel) * 100;
            this.elements.xpBar.style.setProperty('--xp-width', `${xpPercent}%`);
        }
        
        // Update level display
        if (this.elements.levelDisplay) {
            this.elements.levelDisplay.textContent = `Level: ${player.level}`;
        }
    }
    
    /**
     * Update game-related UI
     */
    updateGameUI() {
        // Update score display
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = `Kills: ${this.gameManager.killCount}`;
        }
        
        // Update timer display
        if (this.elements.timerDisplay) {
            const minutes = Math.floor(this.gameManager.gameTime / 60);
            const seconds = Math.floor(this.gameManager.gameTime % 60);
            this.elements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Update star token display
        if (this.elements.starTokenDisplay) {
            const starTokens = localStorage.getItem('starTokens') || '0';
            this.elements.starTokenDisplay.textContent = `⭐ ${starTokens}`;
        }
    }
    
    /**
     * Update combo UI
     */
    updateComboUI() {
        if (!this.elements.comboFill || !this.elements.comboText) return;
        
        const comboPercent = (this.gameManager.comboCount / this.gameManager.comboTarget) * 100;
        this.elements.comboFill.style.width = `${Math.min(100, comboPercent)}%`;
        
        if (this.gameManager.comboCount > 0) {
            this.elements.comboText.textContent = `Combo: ${this.gameManager.comboCount}x`;
            this.elements.comboText.style.color = this.gameManager.comboCount >= this.gameManager.comboTarget ? '#2ecc71' : '#f1c40f';
        } else {
            this.elements.comboText.textContent = 'Combo: 0x';
            this.elements.comboText.style.color = '#95a5a6';
        }
    }
    
    /**
     * Update skill cooldown indicators
     */
    updateSkillCooldowns() {
        const player = this.gameManager.game.player;
        if (!player) return;
        
        // Update dodge cooldown
        const dodgeElement = document.querySelector('.skill-cooldown');
        const dodgeSkill = document.getElementById('dodge-skill');
        
        if (dodgeElement && dodgeSkill) {
            // Check if player has dodge ability (component-based or original)
            const canDodge = player.movement?.canDodge ?? player.canDodge ?? true;
            const dodgeTimer = player.movement?.dodgeTimer ?? player.dodgeTimer ?? 0;
            const dodgeCooldown = player.movement?.dodgeCooldown ?? player.dodgeCooldown ?? 2;
            
            if (!canDodge && dodgeTimer > 0) {
                const cooldownPercent = (dodgeTimer / dodgeCooldown) * 100;
                dodgeElement.style.height = `${100 - cooldownPercent}%`;
                dodgeSkill.classList.remove('skill-ready');
            } else {
                dodgeElement.style.height = '0%';
                dodgeSkill.classList.add('skill-ready');
            }
        }
    }
    
    /**
     * Update minimap
     */
    updateMinimap() {
        const now = Date.now();
        const interval = (this.gameManager.lowQuality || 
                         (window.performanceManager && window.performanceManager.performanceMode !== 'normal'))
            ? this.minimapUpdateIntervalLow : this.minimapUpdateInterval;
            
        if (now - this.lastMinimapUpdate < interval) return;
        this.lastMinimapUpdate = now;
        
        if (!this.minimap.ctx || !this.gameManager.game.player) return;
        
        const ctx = this.minimap.ctx;
        const player = this.gameManager.game.player;
        
        // Clear minimap
        ctx.clearRect(0, 0, this.minimap.width, this.minimap.height);
        
        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.minimap.width, this.minimap.height);
        
        // Draw border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.minimap.width, this.minimap.height);
        
        // Calculate minimap center (player position)
        const centerX = this.minimap.width / 2;
        const centerY = this.minimap.height / 2;
        
        // Draw entities relative to player
        this.drawMinimapEntities(ctx, player, centerX, centerY);
        
        // Draw player (always at center)
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Draw entities on minimap
     */
    drawMinimapEntities(ctx, player, centerX, centerY) {
        const game = this.gameManager.game;
        const scale = this.minimap.scale;
        const maxDistance = Math.min(this.minimap.width, this.minimap.height) / (2 * scale);
        
        // Draw enemies
        if (game.enemies) {
            game.enemies.forEach(enemy => {
                if (enemy.isDead) return;
                
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= maxDistance) {
                    const x = centerX + dx * scale;
                    const y = centerY + dy * scale;
                    
                    // Different colors for different enemy types
                    if (enemy.isBoss || enemy.isMegaBoss) {
                        ctx.fillStyle = enemy.isMegaBoss ? '#8e44ad' : '#c0392b';
                        ctx.beginPath();
                        ctx.arc(x, y, 4, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillStyle = enemy.isElite ? '#f1c40f' : '#e74c3c';
                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });
        }
        
        // Draw XP orbs
        if (game.xpOrbs) {
            ctx.fillStyle = '#2ecc71';
            game.xpOrbs.forEach(orb => {
                if (orb.isDead) return;
                
                const dx = orb.x - player.x;
                const dy = orb.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= maxDistance) {
                    const x = centerX + dx * scale;
                    const y = centerY + dy * scale;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
    
    /**
     * Toggle sound system
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled.toString());
        
        if (window.audioSystem) {
            window.audioSystem.setEnabled(this.soundEnabled);
        }
        
        this.updateSoundButton();
    }
    
    /**
     * Update sound button display
     */
    updateSoundButton() {
        if (this.elements.soundButton) {
            this.elements.soundButton.textContent = this.soundEnabled ? '🔊' : '🔇';
            this.elements.soundButton.title = this.soundEnabled ? 'Disable Sound' : 'Enable Sound';
        }
    }
    
    /**
     * Update pause button display
     */
    updatePauseButton() {
        if (this.elements.pauseButton) {
            const isPaused = this.gameManager.game.isPaused;
            this.elements.pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
        }
    }
    
    /**
     * Show level up screen
     */
    showLevelUpScreen() {
        const levelUpContainer = document.getElementById('level-up-container');
        if (levelUpContainer) {
            levelUpContainer.classList.remove('hidden');
            
            // Pause the game
            this.gameManager.game.isPaused = true;
            
            // Generate upgrade options
            this.generateUpgradeOptions();
        }
    }
    
    /**
     * Hide level up screen
     */
    hideLevelUpScreen() {
        const levelUpContainer = document.getElementById('level-up-container');
        if (levelUpContainer) {
            levelUpContainer.classList.add('hidden');
            
            // Resume the game
            this.gameManager.game.isPaused = false;
        }
    }
    
    /**
     * Generate upgrade options for level up
     */
    generateUpgradeOptions() {
        const upgradeOptions = document.getElementById('upgrade-options');
        if (!upgradeOptions) return;
        
        // Clear existing options
        upgradeOptions.innerHTML = '';
        
        // Get available upgrades from upgrade system
        if (window.upgradeSystem && window.upgradeSystem.getRandomUpgrades) {
            const upgrades = window.upgradeSystem.getRandomUpgrades(3);
            
            upgrades.forEach((upgrade, index) => {
                const optionElement = this.createUpgradeOption(upgrade, index + 1);
                upgradeOptions.appendChild(optionElement);
            });
        }
    }
    
    /**
     * Create upgrade option element
     */
    createUpgradeOption(upgrade, keyNumber) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'upgrade-option';
        optionDiv.setAttribute('data-rarity', upgrade.rarity || 'common');
        
        // Add click handler
        optionDiv.addEventListener('click', () => {
            this.selectUpgrade(upgrade);
        });
        
        // Add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === keyNumber.toString()) {
                this.selectUpgrade(upgrade);
            }
        });
        
        // Create content
        const icon = document.createElement('div');
        icon.className = 'upgrade-icon';
        icon.textContent = upgrade.icon || '⚡';
        
        const title = document.createElement('h3');
        title.textContent = upgrade.name;
        
        const description = document.createElement('p');
        description.textContent = upgrade.description;
        
        const rarity = document.createElement('div');
        rarity.className = 'upgrade-rarity';
        rarity.textContent = upgrade.rarity || 'common';
        
        optionDiv.appendChild(icon);
        optionDiv.appendChild(title);
        optionDiv.appendChild(description);
        optionDiv.appendChild(rarity);
        
        return optionDiv;
    }
    
    /**
     * Select an upgrade
     */
    selectUpgrade(upgrade) {
        // Apply upgrade to player
        if (this.gameManager.game.player && this.gameManager.game.player.applyUpgrade) {
            this.gameManager.game.player.applyUpgrade(upgrade);
        }
        
        // Hide level up screen
        this.hideLevelUpScreen();
        
        // Play upgrade sound
        if (window.audioSystem) {
            window.audioSystem.play('upgrade', 0.5);
        }
    }
    
    /**
     * Show game over screen
     */
    showGameOverScreen() {
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
            
            // Update final stats
            this.updateGameOverStats();
        }
    }
    
    /**
     * Update game over statistics
     */
    updateGameOverStats() {
        const finalScore = document.getElementById('final-score');
        const finalTime = document.getElementById('final-time');
        const finalLevel = document.getElementById('final-level');
        
        if (finalScore) {
            finalScore.textContent = this.gameManager.killCount;
        }
        
        if (finalTime) {
            const minutes = Math.floor(this.gameManager.gameTime / 60);
            const seconds = Math.floor(this.gameManager.gameTime % 60);
            finalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (finalLevel && this.gameManager.game.player) {
            finalLevel.textContent = this.gameManager.game.player.level;
        }
    }
    
    /**
     * Get UI state for debugging
     */
    getUIState() {
        return {
            uiUpdateInterval: this.uiUpdateIntervalCurrent,
            soundEnabled: this.soundEnabled,
            minimapEnabled: !this.elements.minimapContainer?.classList.contains('hidden'),
            elementsLoaded: Object.keys(this.elements).filter(key => this.elements[key] !== null).length
        };
    }
}

// Make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}

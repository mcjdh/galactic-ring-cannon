/**
 * UI Manager - Handles all user interface updates and interactions
 * Extracted from GameManager for better organization
 */
class UIManager {
    constructor() {
        // UI update throttling
        this.uiUpdateTimer = 0;
        this.uiUpdateIntervalNormal = 0.25; // seconds
        this.uiUpdateIntervalLow = 0.5;
        this.uiUpdateIntervalCritical = 1.0;
        this.uiUpdateIntervalCurrent = this.uiUpdateIntervalNormal;
        
        // Minimap properties
        this.lastMinimapUpdate = 0;
        this.minimapUpdateInterval = 100; // milliseconds
        this.minimapUpdateIntervalLow = 250; // milliseconds for low-quality mode
        this.minimapScale = 0.15;
        
        // Boss tracking
        this.activeBosses = new Map();
        this.bossActive = false;
        
        // Floating text system (now delegated to FloatingTextSystem.js)
        
        // UI elements cache
        this.elements = {};
        
        (window.logger?.log || console.log)('🎨 UI Manager initialized');
    }
    
    /**
     * Initialize all UI elements and event listeners
     */
    initialize() {
        this.initializeUI();
        this.initializePauseControls();
        this.initializeMinimap();
        this.cacheUIElements();
        (window.logger?.log || console.log)('🎨 UI Manager fully initialized');
    }
    
    /**
     * Cache commonly accessed UI elements for performance
     */
    cacheUIElements() {
        this.elements = {
            healthBar: document.getElementById('health-bar'),
            xpBar: document.getElementById('xp-bar'),
            timerDisplay: document.getElementById('timer-display'),
            scoreDisplay: document.getElementById('score-display'),
            enemyCounter: document.getElementById('enemy-counter'),
            starTokenDisplay: document.getElementById('star-token-display'),
            levelDisplay: document.getElementById('level-display'),
            comboFill: document.getElementById('combo-fill'),
            comboText: document.getElementById('combo-text'),
            minimapContainer: document.getElementById('minimap-container'),
            bossHealthContainer: document.getElementById('boss-health-container')
        };
    }
    
    /**
     * Initialize base UI elements
     */
    initializeUI() {
        // Initialize health bar
        const healthBar = document.getElementById('health-bar');
        if (healthBar) {
            healthBar.style.setProperty('--health-width', '100%');
        }
        
        // Initialize XP bar
        const xpBar = document.getElementById('xp-bar');
        if (xpBar) {
            xpBar.style.setProperty('--xp-width', '0%');
        }
        
        // Create timer display
        this.createOrUpdateElement('timer-display', 'div', '00:00');
        
        // Create score display
        this.createOrUpdateElement('score-display', 'div', 'Kills: 0');
        
        // Create enemy counter display
        this.createOrUpdateElement('enemy-counter', 'div', 'Enemies: 0');
        
        // Create star token display
        const starTokens = this.loadStarTokens();
        this.createOrUpdateElement('star-token-display', 'div', `⭐ ${starTokens}`);
        
        // Add boss health bar (initially hidden) - prevent duplicates
        if (!document.getElementById('boss-health-container')) {
            const bossHealthBarContainer = document.createElement('div');
            bossHealthBarContainer.id = 'boss-health-container';
            bossHealthBarContainer.className = 'hidden';
            bossHealthBarContainer.innerHTML = `
                <div class="boss-name">BOSS</div>
                <div id="boss-health-bar"></div>
            `;
            document.getElementById('game-container').appendChild(bossHealthBarContainer);
        }
    }
    
    /**
     * Initialize pause menu controls
     */
    initializePauseControls() {
        const pauseButton = document.getElementById('pause-button');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                if (window.gameManager && window.gameManager.game) {
                    window.gameManager.game.togglePause();
                }
            });
        }
        
        const resumeButton = document.getElementById('resume-button');
        if (resumeButton) {
            resumeButton.addEventListener('click', () => {
                if (window.gameManager && window.gameManager.game) {
                    window.gameManager.game.resumeGame();
                }
            });
        }
        
        const restartButtonPause = document.getElementById('restart-button-pause');
        if (restartButtonPause) {
            restartButtonPause.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        const returnButton = document.getElementById('return-button-pause');
        if (returnButton) {
            returnButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
    
    /**
     * Initialize minimap canvas
     */
    initializeMinimap() {
        const minimapContainer = document.getElementById('minimap-container');
        if (!minimapContainer) return;
        
        let minimap = document.getElementById('minimap');
        if (!minimap) {
            minimap = document.createElement('canvas');
            minimap.id = 'minimap';
            minimap.width = 150;
            minimap.height = 150;
            minimapContainer.appendChild(minimap);
        }
        
        this.minimap = minimap;
        this.minimapCtx = minimap.getContext('2d');
        this.minimapCtx.imageSmoothingEnabled = false; // Pixel-perfect rendering
    }
    
    /**
     * Helper to create or update UI elements
     */
    createOrUpdateElement(id, tagName, textContent) {
        let element = document.getElementById(id);
        if (!element) {
            element = document.createElement(tagName);
            element.id = id;
            document.getElementById('game-container').appendChild(element);
        }
        element.textContent = textContent;
        return element;
    }
    
    /**
     * Load star tokens from localStorage
     */
    loadStarTokens() {
        return parseInt(localStorage.getItem('metaStars') || '0');
    }
    
    /**
     * Update all UI elements (called periodically)
     */
    updateUI(gameTime, killCount, game) {
        // Update timer
        const totalSeconds = Math.floor(gameTime);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = `${minutes}:${seconds}`;
        }
        
        // Update score
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = `Kills: ${killCount}`;
        }
        
        // Update skill cooldowns
        this.updateSkillCooldowns(game);
        
        // Update minimap (skip in low-quality mode)
        const lowQuality = window.gameManager?.lowQuality || false;
        if (!lowQuality) {
            this.updateMinimap(game);
        }
        
        // Update enemy counter
        const enemyCount = game.enemies ? game.enemies.length : 0;
        if (this.elements.enemyCounter) {
            this.elements.enemyCounter.textContent = `Enemies: ${enemyCount}`;
        }
        
        // Update combo bar
        this.updateComboUI(window.gameManager?.comboCount || 0, window.gameManager?.comboTarget || 100);
        
        // Update boss UI
        this.updateBossUI(game);
        
        // Check for nearby enemies for minimap alert
        this.updateMinimapAlert(game);
    }
    
    /**
     * Update skill cooldown indicators
     */
    updateSkillCooldowns(game) {
        if (!game.player) return;
        
        // Update dodge cooldown
        const dodgeElement = document.querySelector('.skill-cooldown');
        const dodgeSkill = document.getElementById('dodge-skill');
        
        if (dodgeElement && dodgeSkill) {
            if (!game.player.canDodge) {
                const cooldownPercent = (game.player.dodgeTimer / game.player.dodgeCooldown) * 100;
                dodgeElement.style.height = `${100 - cooldownPercent}%`;
                dodgeSkill.classList.remove('skill-ready');
            } else {
                dodgeElement.style.height = '0%';
                dodgeSkill.classList.add('skill-ready');
            }
        }
    }
    
    /**
     * Update minimap display
     */
    updateMinimap(game) {
        if (!game.player || !this.minimap) return;
        
        // Throttle minimap updates for performance
        const now = Date.now();
        const interval = (window.gameManager?.lowQuality || (window.performanceManager?.mode !== 'normal'))
            ? this.minimapUpdateIntervalLow : this.minimapUpdateInterval;
        if (now - this.lastMinimapUpdate < interval) {
            return;
        }
        this.lastMinimapUpdate = now;
        
        // Clear minimap
        this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.minimapCtx.fillRect(0, 0, this.minimap.width, this.minimap.height);
        
        // Center position on player
        const centerX = this.minimap.width / 2;
        const centerY = this.minimap.height / 2;
        
        // Draw player on minimap
        this.minimapCtx.fillStyle = '#3498db';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        this.minimapCtx.fill();
        
        // Draw enemies on minimap
        this.drawEnemiesOnMinimap(game, centerX, centerY);
        
        // Draw XP orbs on minimap
        this.drawXPOrbsOnMinimap(game, centerX, centerY);
    }
    
    /**
     * Draw enemies on minimap
     */
    drawEnemiesOnMinimap(game, centerX, centerY) {
        let bossFound = false;
        let nearestBoss = null;
        let minBossDistance = Infinity;
        
        const simpleMarkers = window.gameManager?.lowQuality || (window.performanceManager?.mode === 'critical');
        
        game.enemies.forEach(enemy => {
            // Calculate relative position
            const relX = (enemy.x - game.player.x) * this.minimapScale + centerX;
            const relY = (enemy.y - game.player.y) * this.minimapScale + centerY;
            
            // Track boss
            if (enemy.isBoss) {
                bossFound = true;
                const dx = enemy.x - game.player.x;
                const dy = enemy.y - game.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minBossDistance) {
                    minBossDistance = distance;
                    nearestBoss = enemy;
                }
            }
            
            // Only draw if within minimap bounds
            if (relX >= 0 && relX <= this.minimap.width && relY >= 0 && relY <= this.minimap.height) {
                // Color by enemy type
                switch (enemy.enemyType) {
                    case 'boss':
                        this.minimapCtx.fillStyle = '#f1c40f'; // Yellow for bosses
                        break;
                    case 'exploder':
                        this.minimapCtx.fillStyle = '#d35400'; // Orange for exploders
                        break;
                    default:
                        this.minimapCtx.fillStyle = '#e74c3c'; // Red for regular enemies
                }
                
                const dotSize = enemy.isBoss ? 6 : 3;
                if (simpleMarkers) {
                    // Simple rectangle markers in constrained modes
                    this.minimapCtx.fillRect(relX - 1, relY - 1, dotSize, dotSize);
                } else {
                    this.minimapCtx.beginPath();
                    this.minimapCtx.arc(relX, relY, dotSize, 0, Math.PI * 2);
                    this.minimapCtx.fill();
                    // Subtle glow
                    this.minimapCtx.beginPath();
                    this.minimapCtx.arc(relX, relY, dotSize + 2, 0, Math.PI * 2);
                    this.minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    this.minimapCtx.fill();
                }
            }
        });
    }
    
    /**
     * Draw XP orbs on minimap
     */
    drawXPOrbsOnMinimap(game, centerX, centerY) {
        if (!game.xpOrbs) return;
        
        game.xpOrbs.forEach(orb => {
            const relX = (orb.x - game.player.x) * this.minimapScale + centerX;
            const relY = (orb.y - game.player.y) * this.minimapScale + centerY;
            
            // Only draw if within minimap bounds
            if (relX >= 0 && relX <= this.minimap.width && relY >= 0 && relY <= this.minimap.height) {
                this.minimapCtx.fillStyle = '#00ff00'; // Green for XP orbs
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(relX, relY, 2, 0, Math.PI * 2);
                this.minimapCtx.fill();
            }
        });
    }
    
    /**
     * Update combo UI elements
     */
    updateComboUI(comboCount, comboTarget) {
        // Update combo bar fill
        if (this.elements.comboFill) {
            const ratio = Math.min(comboCount / comboTarget, 1);
            this.elements.comboFill.style.width = `${ratio * 100}%`;
        }
        
        if (this.elements.comboText) {
            this.elements.comboText.textContent = comboCount;
        }
    }
    
    /**
     * Update minimap alert state based on nearby enemies
     */
    updateMinimapAlert(game) {
        if (!this.elements.minimapContainer || !game.player) return;
        
        let nearbyEnemyCount = 0;
        const alertDistance = 300;
        const sqAlertDist = alertDistance * alertDistance;
        
        game.enemies.forEach(enemy => {
            const dx = enemy.x - game.player.x;
            const dy = enemy.y - game.player.y;
            if (dx * dx + dy * dy < sqAlertDist) {
                nearbyEnemyCount++;
            }
        });
        
        if (nearbyEnemyCount > 0) {
            this.elements.minimapContainer.classList.add('minimap-alert');
        } else {
            this.elements.minimapContainer.classList.remove('minimap-alert');
        }
    }
    
    /**
     * Update boss UI and health bars
     */
    updateBossUI(game) {
        if (!this.bossActive || !game) return;
        
        // Update boss list from current enemies
        const currentBosses = game.enemies.filter(enemy => enemy.isBoss);
        
        // Remove health bars for defeated bosses
        for (const [bossId, boss] of this.activeBosses) {
            if (!currentBosses.includes(boss)) {
                const bossEntry = document.getElementById(`boss-entry-${bossId}`);
                if (bossEntry) {
                    bossEntry.remove();
                }
                this.activeBosses.delete(bossId);
            }
        }
        
        // Update remaining boss health bars
        currentBosses.forEach(boss => {
            const healthBar = document.getElementById(`boss-health-${boss.id}`);
            if (healthBar) {
                const healthPercent = (boss.health / boss.maxHealth) * 100;
                healthBar.style.setProperty('--boss-health-width', `${healthPercent}%`);
                
                // Update critical state
                if (healthPercent < 30) {
                    healthBar.classList.add('critical');
                } else {
                    healthBar.classList.remove('critical');
                }
                
                // Check phase transitions
                if (boss.hasPhases && boss.phaseThresholds) {
                    const healthRatio = boss.health / boss.maxHealth;
                    for (const threshold of boss.phaseThresholds) {
                        if (Math.abs(healthRatio - threshold) < 0.01) {
                            healthBar.classList.add('phase-transition');
                            setTimeout(() => {
                                if (healthBar) healthBar.classList.remove('phase-transition');
                            }, 300);
                            break;
                        }
                    }
                }
            }
        });
        
        // Update boss indicators on minimap
        this.updateBossIndicators(game);
    }
    
    /**
     * Initialize boss indicators on minimap
     */
    initializeBossIndicators() {
        // Create boss indicators container if it doesn't exist
        let indicatorsContainer = document.querySelector('.boss-indicators');
        if (!indicatorsContainer) {
            indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'boss-indicators';
            if (this.elements.minimapContainer) {
                this.elements.minimapContainer.appendChild(indicatorsContainer);
            }
        }
        
        // Clear existing indicators
        indicatorsContainer.innerHTML = '';
        
        // Create indicator for each boss
        this.activeBosses.forEach((boss, id) => {
            // Create indicator container
            const indicator = document.createElement('div');
            indicator.className = `boss-indicator ${boss.isMegaBoss ? 'mega' : ''}`;
            indicator.id = `boss-indicator-${id}`;
            
            // Create distance label
            const distanceLabel = document.createElement('div');
            distanceLabel.className = 'boss-distance-label';
            distanceLabel.id = `boss-distance-${id}`;
            
            indicator.appendChild(distanceLabel);
            indicatorsContainer.appendChild(indicator);
        });
    }
    
    /**
     * Update boss indicators on minimap
     */
    updateBossIndicators(game) {
        if (!game.player) return;
        
        this.activeBosses.forEach((boss, id) => {
            const indicator = document.getElementById(`boss-indicator-${id}`);
            const distanceLabel = document.getElementById(`boss-distance-${id}`);
            
            if (indicator && distanceLabel) {
                // Calculate angle and distance to boss
                const dx = boss.x - game.player.x;
                const dy = boss.y - game.player.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Convert distance to a more readable format (in "meters")
                const displayDistance = Math.round(distance / 10); // Scale down for more reasonable numbers
                
                // Position indicator on minimap
                const minimapRadius = this.minimap ? this.minimap.width / 2 : 75;
                const scale = Math.min(1, minimapRadius / distance);
                
                // Update distance label
                distanceLabel.textContent = `${displayDistance}m`;
                
                // Update indicator position and visibility
                if (scale < 1) {
                    // Boss is outside minimap, show direction indicator
                    indicator.style.display = 'block';
                    const indicatorX = Math.cos(angle) * (minimapRadius - 10);
                    const indicatorY = Math.sin(angle) * (minimapRadius - 10);
                    indicator.style.transform = `translate(${indicatorX}px, ${indicatorY}px)`;
                } else {
                    // Boss is on minimap, hide direction indicator
                    indicator.style.display = 'none';
                }
            }
        });
    }
    
    /**
     * Show game over screen
     */
    showGameOver(gameTime, killCount, gameStats, player, highestCombo, xpCollected) {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over';
        
        const totalSeconds = Math.floor(gameTime);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        
        // Get difficulty level based on time
        let difficultyLabel = "Beginner";
        
        if (totalSeconds >= 600) { // 10+ minutes
            difficultyLabel = "Legendary!";
        } else if (totalSeconds >= 480) { // 8+ minutes
            difficultyLabel = "Master";
        } else if (totalSeconds >= 360) { // 6+ minutes
            difficultyLabel = "Expert";
        } else if (totalSeconds >= 240) { // 4+ minutes
            difficultyLabel = "Veteran";
        } else if (totalSeconds >= 120) { // 2+ minutes
            difficultyLabel = "Skilled";
        }
        
        // Calculate meta star tokens earned this run
        const earnedStars = Math.floor(killCount / 50) + (gameStats.bossesSpawned || 0);
        gameOverDiv.innerHTML = `
            <h1>Game Over</h1>
            <p>Difficulty reached: <span class="stats-highlight">${difficultyLabel}</span></p>
            <p>You survived for <span class="stats-highlight">${minutes}:${seconds}</span></p>
            <p>Kills: <span class="stats-highlight">${killCount}</span></p>
            <p>Level reached: <span class="stats-highlight">${player.level}</span></p>
            <p>XP collected: <span class="stats-highlight">${xpCollected}</span></p>
            <p>Stars earned: <span class="stats-highlight">${earnedStars}</span></p>
            <button id="restart-button">Play Again</button>
        `;
        
        // Add additional stats
        const difficultyFactor = window.gameManager?.difficultyFactor || 1;
        const difficultyInfo = document.createElement('p');
        difficultyInfo.innerHTML = `Max Difficulty: <span class="stats-highlight">x${difficultyFactor.toFixed(1)}</span>`;
        gameOverDiv.insertBefore(difficultyInfo, gameOverDiv.querySelector('button'));
        
        const enemyInfo = document.createElement('p');
        enemyInfo.innerHTML = `Max enemies at once: <span class="stats-highlight">${gameStats.highestEnemyCount}</span>`;
        gameOverDiv.insertBefore(enemyInfo, gameOverDiv.querySelector('button'));
        
        const comboInfo = document.createElement('p');
        comboInfo.innerHTML = `Highest Combo: <span class="stats-highlight">${highestCombo}</span>`;
        gameOverDiv.insertBefore(comboInfo, gameOverDiv.querySelector('button'));
        
        document.getElementById('game-container').appendChild(gameOverDiv);
        
        // Add restart button functionality
        document.getElementById('restart-button').addEventListener('click', () => {
            window.location.reload();
        });
        
        // Show tips based on performance
        if (player.level < 5) {
            const tipElement = document.createElement('p');
            tipElement.className = 'game-over-tip';
            tipElement.textContent = 'Tip: Try to focus on increasing your attack speed and damage early on';
            gameOverDiv.appendChild(tipElement);
        }
    }
    
    /**
     * Show win screen
     */
    showWinScreen() {
        const winDiv = document.createElement('div');
        winDiv.id = 'win-screen';
        winDiv.innerHTML = `
            <h1>🎉 VICTORY! 🎉</h1>
            <p>You have successfully defeated the Galactic Ring Cannon!</p>
            <p>The galaxy is safe once more thanks to your heroic efforts.</p>
            <button id="play-again-button">Play Again</button>
            <button id="endless-mode-button">Endless Mode</button>
        `;
        
        document.getElementById('game-container').appendChild(winDiv);
        
        // Add button functionality
        document.getElementById('play-again-button').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('endless-mode-button').addEventListener('click', () => {
            if (window.gameManager) {
                window.gameManager.startEndlessMode();
            }
        });
    }
    
    // 🤖 RESONANT NOTE FOR ALL CODING AGENTS:
    // Floating text functionality consolidated into FloatingTextSystem.js
    // This UIManager now delegates to the shared FloatingTextSystem to avoid duplication
    
    /**
     * Get or create shared floating text system
     */
    _getFloatingTextSystem() {
        if (!window.floatingTextSystem && window.FloatingTextSystem) {
            window.floatingTextSystem = new window.FloatingTextSystem();
        }
        return window.floatingTextSystem;
    }
    
    // Legacy method - now delegates to FloatingTextSystem
    _spawnText(entry) {
        const system = this._getFloatingTextSystem();
        if (system && system.spawn) {
            system.spawn(entry);
        }
    }
    
    // Legacy method - now delegates to FloatingTextSystem
    _updateTexts(deltaTime) {
        const system = this._getFloatingTextSystem();
        if (system && system.update) {
            system.update(deltaTime);
        }
    }
    
    // Legacy method - now delegates to FloatingTextSystem
    _renderTexts(ctx) {
        const system = this._getFloatingTextSystem();
        if (system && system.render) {
            system.render(ctx);
        }
    }
    
    /**
     * Show floating text at world coordinates
     */
    showFloatingText(text, x, y, color = 'white', size = 16) {
        this._spawnText({ text, color, size, x, y });
    }
    
    /**
     * Update floating text system (call each frame)
     */
    updateFloatingTexts(deltaTime) {
        this._updateTexts(deltaTime);
    }
    
    /**
     * Render floating text system (call each frame)
     */
    renderFloatingTexts(ctx) {
        this._renderTexts(ctx);
    }
    
    /**
     * Set UI update interval based on performance mode
     */
    setPerformanceMode(mode) {
        switch (mode) {
            case 'critical':
                this.uiUpdateIntervalCurrent = this.uiUpdateIntervalCritical;
                break;
            case 'low':
                this.uiUpdateIntervalCurrent = this.uiUpdateIntervalLow;
                break;
            default:
                this.uiUpdateIntervalCurrent = this.uiUpdateIntervalNormal;
        }
    }
    
    /**
     * Check if UI should be updated this frame
     */
    shouldUpdateUI(deltaTime) {
        this.uiUpdateTimer += deltaTime;
        if (this.uiUpdateTimer >= this.uiUpdateIntervalCurrent) {
            this.uiUpdateTimer = 0;
            return true;
        }
        return false;
    }
    
    /**
     * Add boss to tracking
     */
    addBoss(boss) {
        this.activeBosses.set(boss.id, boss);
        this.bossActive = true;
        this.initializeBossIndicators();
    }
    
    /**
     * Remove boss from tracking
     */
    removeBoss(bossId) {
        this.activeBosses.delete(bossId);
        if (this.activeBosses.size === 0) {
            this.bossActive = false;
        }
    }
    
    /**
     * Update star token display
     */
    updateStarTokens(stars) {
        if (this.elements.starTokenDisplay) {
            this.elements.starTokenDisplay.textContent = `⭐ ${stars}`;
        }
    }
    
    /**
     * Update player health display
     */
    updateHealth(health, maxHealth) {
        if (this.elements.healthBar) {
            const healthPercent = Math.max(0, (health / maxHealth) * 100);
            this.elements.healthBar.style.setProperty('--health-width', `${healthPercent}%`);
        }
    }
    
    /**
     * Update player XP display
     */
    updateXP(xp, xpToNext) {
        if (this.elements.xpBar) {
            const xpPercent = (xp / xpToNext) * 100;
            this.elements.xpBar.style.setProperty('--xp-width', `${xpPercent}%`);
        }
    }
    
    /**
     * Update player level display
     */
    updateLevel(level) {
        if (this.elements.levelDisplay) {
            this.elements.levelDisplay.textContent = `Level: ${level}`;
        }
    }
    
    /**
     * Clean up UI manager
     */
    destroy() {
        // Floating text system cleared via FloatingTextSystem
        
        // Clear boss tracking
        this.activeBosses.clear();
        this.bossActive = false;
        
        (window.logger?.log || console.log)('🎨 UI Manager destroyed');
    }
}

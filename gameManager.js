class GameManager {
    constructor() {
        // Initialize game systems
        this.game = new GameEngine();
        this.enemySpawner = new EnemySpawner(this.game);
        this.gameTime = 0;
        this.gameOver = false;
        this.gameWon = false; // Add explicit win state flag
        this.winScreenDisplayed = false; // Flag to prevent duplicate win screens
        
        // Game stats
        this.killCount = 0;
        this.xpCollected = 0;
        
        // Initialize UI
        this.initializeUI();
        
        // Timer for updating UI elements
        this.uiUpdateTimer = 0;
        
        // Particles system
        this.particles = [];
        
        // Initialize pause button
        this.initializePauseControls();
        
        // Set up pause key handling
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Initialize minimap
        this.initializeMinimap();
        
        // Add sound toggle button
        this.addSoundButton();

        // Dynamic difficulty scaling system - adjusted for 3-minute runs
        this.difficultyFactor = 1.0;
        this.difficultyTimer = 0;
        this.difficultyInterval = 20; // Increase difficulty every 20 seconds (down from 45)
        this.maxDifficultyFactor = 4.0; // Cap difficulty scaling (down from 5.0)
        
        // Track game progression stats
        this.gameStats = {
            highestEnemyCount: 0,
            totalEnemiesSpawned: 0,
            bossesSpawned: 0
        };

        // Add combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboTimeout = 0.8; // seconds before combo resets (shorter for faster gameplay)
        this.comboTarget = 8; // Lower combo target for faster progression
        this.highestCombo = 0;
        
        // Critical XP chance
        this.critXpChance = 0.15; // 15% chance for critical XP drops (up from 10%)
        
        // Screen shake effect
        this.screenShakeAmount = 0;
        this.screenShakeDuration = 0;
        this.screenShakeTimer = 0;

        // Boss mode tracking
        this.bossActive = false;
        this.activeBosses = new Map();
        this.bossHealthBarVisible = false;

        // Track if mega boss has appeared
        this.megaBossTracked = false;
        // Performance: cap maximum particles to prevent overload (reduced for lower-end devices)
        this.maxParticles = 150;
        // Endless mode and quality settings from URL params
        const urlParams = new URLSearchParams(window.location.search);
        this.endlessMode = urlParams.get('mode') === 'endless';
        // Low-quality mode: skip heavy visual effects when '?quality=low'
        this.lowQuality = urlParams.get('quality') === 'low';
        // Toggle low-quality mode at runtime with 'L' key
        window.addEventListener('keydown', e => {
            if (e.key === 'l' || e.key === 'L') {
                this.lowQuality = !this.lowQuality;
                console.log('Low Quality Mode:', this.lowQuality);
                // Hide or show minimap in low-quality mode
                const minimapContainer = document.getElementById('minimap-container');
                if (minimapContainer) {
                    minimapContainer.classList.toggle('hidden', this.lowQuality);
                }
            }
        });
        
        // Initialize achievement tracking
        this.enemiesKilled = 0;
        this.bossesKilled = 0;
        this.dodgesPerformed = 0;
        this.perfectDodges = 0;
        this.gameStartTime = 0;
        this.currentWave = 0;
        this.lastKillCount = 0;
    }
    
    initializeUI() {
        // Initialize health bar
        const healthBar = document.getElementById('health-bar');
        healthBar.style.setProperty('--health-width', '100%');
        
        // Initialize XP bar
        const xpBar = document.getElementById('xp-bar');
        xpBar.style.setProperty('--xp-width', '0%');
        
        // Create timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'timer-display';
        timerDisplay.textContent = '00:00';
        document.getElementById('game-container').appendChild(timerDisplay);
        
        // Create score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'score-display';
        scoreDisplay.textContent = 'Kills: 0';
        document.getElementById('game-container').appendChild(scoreDisplay);
        
        // Add enemy counter display
        const enemyCounter = document.createElement('div');
        enemyCounter.id = 'enemy-counter';
        enemyCounter.textContent = 'Enemies: 0';
        document.getElementById('game-container').appendChild(enemyCounter);
        // Meta progression: display star tokens
        this.loadStarTokens();
        const starDisplay = document.createElement('div');
        starDisplay.id = 'star-token-display';
        starDisplay.textContent = '⭐ ' + this.metaStars;
        document.getElementById('game-container').appendChild(starDisplay);
        this.starDisplayElement = starDisplay;        // Add boss health bar (initially hidden) - prevent duplicates
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
    
    initializePauseControls() {
        // Add pause button functionality
        document.getElementById('pause-button').addEventListener('click', () => {
            this.game.togglePause();
        });
        
        // Add resume button functionality
        document.getElementById('resume-button').addEventListener('click', () => {
            this.game.resumeGame();
        });
        
        // Add restart button functionality from pause menu
        document.getElementById('restart-button-pause').addEventListener('click', () => {
            window.location.reload();
        });
        // Add return to main menu button functionality
        document.getElementById('return-button-pause').addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    startGame() {
        // Load and apply meta upgrades
        this.loadMetaUpgrades();
        // Create player at center of screen with meta boosts
        const player = new Player(0, 0);
        // Mercury upgrades
        if (this.meta_mercury_speed) {
            player.speed += this.meta_mercury_speed * 20;
        }
        if (this.meta_mercury_dodge_cd) {
            player.dodgeCooldown = Math.max(0, player.dodgeCooldown - this.meta_mercury_dodge_cd * 0.1);
        }
        // Venus upgrades
        if (this.meta_venus_hp) {
            player.maxHealth += this.meta_venus_hp * 10;
            player.health += this.meta_venus_hp * 10;
        }
        if (this.meta_venus_regen) {
            player.regeneration += this.meta_venus_regen * 0.5;
        }
        // Mars upgrades
        if (this.meta_mars_damage) {
            player.attackDamage *= 1 + this.meta_mars_damage * 0.05;
        }
        if (this.meta_mars_attack_speed) {
            player.attackSpeed *= 1 + this.meta_mars_attack_speed * 0.05;
            player.attackCooldown = 1 / player.attackSpeed;
        }
        // Saturn upgrades
        if (this.meta_saturn_magnet) {
            player.magnetRange += this.meta_saturn_magnet * 25;
        }
        if (this.meta_saturn_extra_projectile) {
            player.projectileCount += this.meta_saturn_extra_projectile;
        }
        // Neptune upgrades
        if (this.meta_neptune_crit) {
            player.critChance += this.meta_neptune_crit * 0.01;
        }
        if (this.meta_neptune_aoe_boost) {
            player.aoeDamageMultiplier += this.meta_neptune_aoe_boost * 0.1;
        }
        // Pluto upgrades
        if (this.meta_pluto_damage_reduction) {
            player.damageReduction += this.meta_pluto_damage_reduction * 0.05;
        }
        if (this.meta_pluto_start_level) {
            player.level += this.meta_pluto_start_level;
        }
        // Jupiter star drop and XP gain handled in respective systems
        this.game.addEntity(player);
        
        // Update UI elements with initial values
        document.getElementById('level-display').textContent = `Level: ${this.game.player.level}`;
        
        // Start the game loop
        this.game.start();
        
        // Reset achievement tracking
        this.enemiesKilled = 0;
        this.bossesKilled = 0;
        this.dodgesPerformed = 0;
        this.perfectDodges = 0;
        this.gameStartTime = Date.now();
        this.currentWave = 0;
    }
    
    update(deltaTime) {
        // Check for win condition first
        if (this.gameWon && !this.winScreenDisplayed) {
            console.log("Game won but win screen not displayed, showing now");
            this.showWinScreen();
            return;
        }

        // Only update if game is not over and not won
        if (this.gameOver || this.gameWon) {
            return;
        }
        
        // Check if mega boss exists and was just defeated (skip if endless mode)
        if (!this.endlessMode && this.checkMegaBossDefeated()) {
            console.log("Mega boss defeated detected in update cycle");
            this.gameWon = true;
            this.gameOver = true; // Explicitly set gameOver too

            // Ensure achievement is awarded when win condition met
            if (achievementSystem) {
                achievementSystem.onMegaBossDefeated();
            }

            if (!this.winScreenDisplayed) {
                this.showWinScreen();
            }
            return; // Stop further updates once won
        }
        
        this.gameTime += deltaTime;
          // Update difficulty scaling with improved progression
        this.difficultyTimer += deltaTime;
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.difficultyTimer = 0;
            
            // More balanced difficulty scaling based on game time and mode
            const gameMinutes = this.gameTime / 60;
            let difficultyIncrease = 1.12; // Reduced from 1.15 for better balance
            
            // Adaptive scaling based on game mode and progress
            if (this.endlessMode) {
                // Endless mode: slower scaling in early game, faster later
                difficultyIncrease = gameMinutes < 3 ? 1.08 : 1.15;
            } else {
                // Normal mode: consistent moderate scaling
                difficultyIncrease = 1.10;
            }
            
            // Apply player performance-based adjustment
            if (this.game.player) {
                const playerHealthPercentage = this.game.player.health / this.game.player.maxHealth;
                // If player is struggling (low health), reduce difficulty increase
                if (playerHealthPercentage < 0.3) {
                    difficultyIncrease *= 0.85; // Reduce scaling when player is low on health
                }
                // If player is doing well (high level), increase scaling slightly
                if (this.game.player.level > 10) {
                    difficultyIncrease *= 1.05;
                }
            }
            
            this.difficultyFactor = Math.min(this.maxDifficultyFactor, 
                this.difficultyFactor * difficultyIncrease);
            
            // Scale enemy spawning based on difficulty
            this.updateDifficultyScaling();
            
            // Display difficulty increase notification for significant thresholds
            if (Math.floor(this.difficultyFactor * 10) % 5 === 0) { // every 0.5 increase
                this.showFloatingText(
                    `Difficulty Increased! (x${this.difficultyFactor.toFixed(1)})`, 
                    this.game.player.x, this.game.player.y - 70,
                    "#e74c3c", 20
                );
                
                // Add screen shake for dramatic effect
                if (this.addScreenShake) {
                    this.addScreenShake(3, 0.3);
                }
            }
        }
        
        // Update enemy spawner
        this.enemySpawner.update(deltaTime);
        
        // Update particles (skip in low-quality mode)
        if (this.lowQuality) {
            // Clear particles immediately
            this.particles.length = 0;
        } else {
            this.updateParticles(deltaTime);
        }
        
        // Update UI periodically (every 0.25 seconds)
        this.uiUpdateTimer += deltaTime;
        if (this.uiUpdateTimer >= 0.25) {
            this.uiUpdateTimer = 0;
            this.updateUI();
        }
        
        // Check if player is dead
        if (this.game.player && this.game.player.isDead) {
            this.gameOver = true;
            this.showGameOver();
        }
        
        // Check boss mode status
        if (this.bossActive) {
            // Get current boss enemies
            const currentBosses = this.game.enemies.filter(enemy => enemy.isBoss);
            
            // Check if all tracked bosses are dead or removed
            let allBossesDead = true;
            for (const [bossId, boss] of this.activeBosses) {
                if (!boss.isDead && currentBosses.includes(boss)) {
                    allBossesDead = false;
                    break;
                }
            }
            
            if (allBossesDead) {
                this.deactivateBossMode();
            }
        }
        
        // Check for new bosses and activate boss mode if needed
        const bosses = this.game.enemies.filter(enemy => enemy.isBoss);
        if (bosses.length > 0 && !this.bossActive) {
            this.activateBossMode();
        }
        
        // Handle sound toggle (M key)
        if (this.game.keys && this.game.keys['m']) {
            // Would implement sound toggle if sound system was added
            this.game.keys['m'] = false; // Reset to prevent multiple toggles
            
            // Visual feedback for toggling sound (would be replaced with actual logic)
            this.showFloatingText("Sound toggled!", 
                                 this.game.player.x, 
                                 this.game.player.y - 50, 
                                 "#3498db", 
                                 20);
        }

        // Update combo timer
        if (this.comboCount > 0) {
            this.comboTimer += deltaTime;
            if (this.comboTimer >= this.comboTimeout) {
                if (this.comboCount >= this.comboTarget) {
                    // Give bonus XP for high combos when they end
                    const bonusXp = Math.floor(this.comboCount * 2.5);
                    if (this.game.player) {
                        this.game.player.addXP(bonusXp);
                        this.showCombatText(`++${bonusXp}`, 
                            this.game.player.x, this.game.player.y - 80, 
                            'xpBonus', 20);
                    }
                }
                
                // Track highest combo before resetting
                if (!this.highestCombo) {
                    this.highestCombo = 0;
                }
                this.highestCombo = Math.max(this.highestCombo, this.comboCount);
                
                this.comboCount = 0;
            }
        }
        
        // Update screen shake
        if (this.screenShakeDuration > 0) {
            this.screenShakeDuration -= deltaTime;
        } else {
            this.screenShakeAmount = 0;
        }

        // Update boss health bar if active
        this.updateBossUI();
        
        // Check survival time achievement
        if (this.gameStartTime > 0) {
            const survivalTime = (Date.now() - this.gameStartTime) / 1000;
            achievementSystem.updateAchievement('survivor', survivalTime);
        }
        
        // Check endless mode achievement
        if (this.endlessMode) {
            achievementSystem.updateAchievement('endless_champion', this.currentWave);
        }

        // Update untouchable achievement tracking
        if (!this.gameOver && !this.gameWon && achievementSystem) {
            achievementSystem.updateUntouchable(deltaTime);
        }

        // Update kill streak tracking with timestamp
        if (this.killCount > this.lastKillCount) {
            achievementSystem.onEnemyKilled(Date.now());
            this.lastKillCount = this.killCount;
        }
    }
    
    updateUI() {
        // Update timer
        const totalSeconds = Math.floor(this.gameTime);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;
        
        // Update score
        document.getElementById('score-display').textContent = `Kills: ${this.killCount}`;
        
        // Update skill cooldown indicator
        this.updateSkillCooldowns();
        
        // Update minimap (skip in low-quality mode)
        if (!this.lowQuality) {
            this.updateMinimap();
        }
        
        // Update enemy counter
        const enemyCount = this.game.enemies ? this.game.enemies.length : 0;
        document.getElementById('enemy-counter').textContent = `Enemies: ${enemyCount}`;
        // Update combo bar fill
        const comboFill = document.getElementById('combo-fill');
        if (comboFill) {
            const ratio = Math.min(this.comboCount / this.comboTarget, 1);
            comboFill.style.width = `${ratio * 100}%`;
        }
        const comboText = document.getElementById('combo-text');
        if (comboText) {
            comboText.textContent = this.comboCount;
        }
        
        // Check for nearby enemies for minimap alert
        const minimapContainer = document.getElementById('minimap-container');
        if (minimapContainer && this.game.player) {
            let nearbyEnemyCount = 0;
            const alertDistance = 300;
            const sqAlertDist = alertDistance * alertDistance;
            this.game.enemies.forEach(enemy => {
                const dx = enemy.x - this.game.player.x;
                const dy = enemy.y - this.game.player.y;
                if (dx * dx + dy * dy < sqAlertDist) {
                    nearbyEnemyCount++;
                }
            });
            if (nearbyEnemyCount > 0) {
                minimapContainer.classList.add('minimap-alert');
            } else {
                minimapContainer.classList.remove('minimap-alert');
            }
        }
    }
    
    showGameOver() {
        // Create explosion effect at player position
        if (this.game.player) {
            this.createExplosion(this.game.player.x, this.game.player.y, 80, '#e74c3c');
        }
        
        // Create game over UI
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over';
        
        const totalSeconds = Math.floor(this.gameTime);
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
        const earnedStars = Math.floor(this.killCount / 50) + (this.gameStats.bossesSpawned || 0);
        gameOverDiv.innerHTML = `
            <h1>Game Over</h1>
            <p>Difficulty reached: <span class="stats-highlight">${difficultyLabel}</span></p>
            <p>You survived for <span class="stats-highlight">${minutes}:${seconds}</span></p>
            <p>Kills: <span class="stats-highlight">${this.killCount}</span></p>
            <p>Level reached: <span class="stats-highlight">${this.game.player.level}</span></p>
            <p>XP collected: <span class=\"stats-highlight\">${this.xpCollected}</span></p>
            <p>Stars earned: <span class=\"stats-highlight\">${earnedStars}</span></p>
            <button id=\"restart-button\">Play Again</button>
        `;

        // Add difficulty factor to game over stats
        const difficultyInfo = document.createElement('p');
        difficultyInfo.innerHTML = `Max Difficulty: <span class="stats-highlight">x${this.difficultyFactor.toFixed(1)}</span>`;
        gameOverDiv.insertBefore(difficultyInfo, gameOverDiv.querySelector('button'));
        
        // Add max enemy count to stats
        const enemyInfo = document.createElement('p');
        enemyInfo.innerHTML = `Max enemies at once: <span class="stats-highlight">${this.gameStats.highestEnemyCount}</span>`;
        gameOverDiv.insertBefore(enemyInfo, gameOverDiv.querySelector('button'));
        // Add highest combo achieved
        const comboInfo = document.createElement('p');
        comboInfo.innerHTML = `Highest Combo: <span class="stats-highlight">${this.highestCombo}</span>`;
        gameOverDiv.insertBefore(comboInfo, gameOverDiv.querySelector('button'));
        
        document.getElementById('game-container').appendChild(gameOverDiv);
        // Award and display star tokens
        this.earnStarTokens(earnedStars);
        
        // Add restart button functionality
        document.getElementById('restart-button').addEventListener('click', () => {
            window.location.reload();
        });
        
        // Show tips based on performance
        if (this.game.player.level < 5) {
            const tipElement = document.createElement('p');
            tipElement.className = 'game-over-tip';
            tipElement.textContent = 'Tip: Try to focus on increasing your attack speed and damage early on';
            gameOverDiv.appendChild(tipElement);
        }
    }
    
    // Increment kill count when enemy is killed
    incrementKills() {
        this.killCount++;
        // Update combo progress on each kill
        this.comboCount = (this.comboCount || 0) + 1;
        this.comboTimer = 0;

        // Track achievement for first kill
        achievementSystem.updateAchievement('first_kill', this.killCount);
        
        // Track combo achievement
        achievementSystem.updateAchievement('combo_master', this.comboCount);

        return this.killCount;
    }
    
    // Track XP collected
    addXpCollected(amount) {
        this.xpCollected += amount;
        achievementSystem.updateAchievement('star_collector', this.metaStars);
        return this.xpCollected;
    }
    
    // Show floating text (damage numbers, XP gained, etc.)
    showFloatingText(text, x, y, color = 'white', size = 16) {
        // Convert game coordinates to screen coordinates
        const cameraX = -this.game.player.x + this.game.canvas.width / 2;
        const cameraY = -this.game.player.y + this.game.canvas.height / 2;
        
        const screenX = x + cameraX;
        const screenY = y + cameraY;
        
        const textElement = document.createElement('div');
        textElement.className = 'floating-text';
        textElement.textContent = text;
        textElement.style.left = `${screenX}px`;
        textElement.style.top = `${screenY}px`;
        textElement.style.color = color;
        textElement.style.fontSize = `${size}px`;
        
        document.getElementById('game-container').appendChild(textElement);
        
        // Remove element after animation completes
        setTimeout(() => {
            textElement.remove();
        }, 1000);
    }
      updateParticles(deltaTime) {
        // Enforce particle limit to prevent memory issues
        const maxParticles = this.maxParticles || 150;
        
        // If we exceed the limit, remove the oldest particles first
        if (this.particles.length > maxParticles) {
            const excessCount = this.particles.length - maxParticles;
            this.particles.splice(0, excessCount);
        }
        
        const deadParticles = [];
        
        // Update particles and collect dead ones for reuse
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (!particle) {
                this.particles.splice(i, 1);
                continue;
            }
            
            if (typeof particle.update === 'function') {
                particle.update(deltaTime);
            }
            
            // Check if particle is dead
            if (particle.isDead || (particle.age !== undefined && particle.lifetime !== undefined && particle.age >= particle.lifetime)) {
                deadParticles.push(particle);
                this.particles.splice(i, 1);
            }
        }
        
        // Maintain particle pool size limit
        if (!this.particlePool) {
            this.particlePool = [];
        }
        
        const maxPoolSize = 50; // Reasonable pool size
        const availablePoolSlots = maxPoolSize - this.particlePool.length;
        
        // Add dead particles to pool (up to limit)
        for (let i = 0; i < Math.min(deadParticles.length, availablePoolSlots); i++) {
            const particle = deadParticles[i];
            // Reset particle for reuse
            if (particle) {
                particle.isDead = false;
                particle.age = 0;
                this.particlePool.push(particle);
            }
        }
    }
    
    createExplosion(x, y, radius, color) {
        // Use object pooling for explosion particles
        const particleCount = Math.min(Math.floor(radius * 0.8), 50); // Cap particle count
        
        for (let i = 0; i < particleCount; i++) {
            let particle;
            if (this.particlePool.length > 0) {
                particle = this.particlePool.pop();
                // Reset particle properties
                particle.x = x;
                particle.y = y;
                particle.isDead = false;
                particle.age = 0;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 100;
                const size = 2 + Math.random() * 6;
                const lifetime = 0.5 + Math.random() * 0.5;
                
                particle = new Particle(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    size,
                    color,
                    lifetime
                );
            }
            
            this.particles.push(particle);
        }
        
        // Add shockwave effect with reduced complexity
        const shockwave = new ShockwaveParticle(x, y, radius * 1.5, color, 0.5);
        this.particles.push(shockwave);
    }
    
    createHitEffect(x, y, amount) {
        // Use object pooling for hit particles
        const particleCount = Math.min(10, Math.floor(amount / 5));
        
        for (let i = 0; i < particleCount; i++) {
            let particle;
            if (this.particlePool.length > 0) {
                particle = this.particlePool.pop();
                // Reset particle properties
                particle.x = x;
                particle.y = y;
                particle.isDead = false;
                particle.age = 0;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const speed = 30 + Math.random() * 70;
                const size = 1 + Math.random() * 3;
                const lifetime = 0.3 + Math.random() * 0.3;
                
                particle = new Particle(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    size,
                    '#e74c3c',
                    lifetime
                );
            }
            
            this.particles.push(particle);
        }
    }
    
    createLevelUpEffect(x, y) {
        // Use object pooling for level up particles
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            let particle;
            if (this.particlePool.length > 0) {
                particle = this.particlePool.pop();
                // Reset particle properties
                particle.x = x;
                particle.y = y;
                particle.isDead = false;
                particle.age = 0;
            } else {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 50 + Math.random() * 50;
                const size = 2 + Math.random() * 4;
                const lifetime = 1 + Math.random() * 0.5;
                
                particle = new Particle(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    size,
                    '#f39c12',
                    lifetime
                );
            }
            
            this.particles.push(particle);
        }
        
        // Add shockwave effect with reduced complexity
        const shockwave = new ShockwaveParticle(x, y, 100, '#f39c12', 0.7);
        this.particles.push(shockwave);
    }
    
    renderParticles(ctx) {
        // Apply screen shake if active
        if (this.screenShakeAmount > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShakeAmount;
            const shakeY = (Math.random() - 0.5) * this.screenShakeAmount;
            ctx.translate(shakeX, shakeY);
        }
        
        // Batch render particles by type
        const particleGroups = new Map();
        
        for (const particle of this.particles) {
            const type = particle.constructor.name;
            if (!particleGroups.has(type)) {
                particleGroups.set(type, []);
            }
            particleGroups.get(type).push(particle);
        }
        
        // Render each group
        for (const [type, group] of particleGroups) {
            for (const particle of group) {
                particle.render(ctx);
            }
        }
    }
    
    handleKeyDown(e) {
        // Prevent spacebar from triggering dodge when menus are active
        if (e.key === ' ' && (this.game.isPaused || (upgradeSystem && upgradeSystem.isLevelUpActive()))) {
            e.preventDefault();
        }
        
        // Toggle sound with 'M' key
        if (e.key === 'm' || e.key === 'M') {
            const soundButton = document.getElementById('sound-button');
            if (soundButton) {
                soundButton.click(); // Trigger the sound button click
            }
        }
    }
    
    // Add method to check if any UI menus are active
    isMenuActive() {
        return this.game.isPaused || (upgradeSystem && upgradeSystem.isLevelUpActive());
    }
      initializeMinimap() {
        this.minimap = document.getElementById('minimap');
        this.minimapCtx = this.minimap.getContext('2d');
        this.minimap.width = 200; // Increased size
        this.minimap.height = 200;
        this.minimapScale = 0.15; // Increased scale for better visibility
        this.minimapContainer = document.getElementById('minimap-container');
        
        // Add minimap throttling for performance
        this.lastMinimapUpdate = 0;
        this.minimapUpdateInterval = 50; // Update every 50ms (20 FPS)
        
        // Add boss direction indicator
        const bossIndicator = document.createElement('div');
        bossIndicator.id = 'boss-direction';
        bossIndicator.className = 'hidden';
        this.minimapContainer.appendChild(bossIndicator);
        
        // Add boss distance display
        const bossDistance = document.createElement('div');
        bossDistance.id = 'boss-distance';
        bossDistance.className = 'hidden';
        this.minimapContainer.appendChild(bossDistance);
    }
    
    addSoundButton() {
        const soundButton = document.createElement('button');
        soundButton.id = 'sound-button';
        soundButton.className = 'control-button';
        soundButton.innerHTML = '🔊';
        document.getElementById('game-container').appendChild(soundButton);
        
        soundButton.addEventListener('click', () => {
            const isMuted = audioSystem.toggleMute();
            soundButton.innerHTML = isMuted ? '🔇' : '🔊';
            this.showFloatingText(
                isMuted ? "Sound Off" : "Sound On", 
                this.game.player.x, 
                this.game.player.y - 50,
                "#3498db",
                20
            );
        });
    }
    
    updateSkillCooldowns() {
        if (!this.game.player) return;
        
        // Update dodge cooldown
        const dodgeElement = document.querySelector('.skill-cooldown');
        const dodgeSkill = document.getElementById('dodge-skill');
        
        if (dodgeElement && dodgeSkill) {
            if (!this.game.player.canDodge) {
                const cooldownPercent = (this.game.player.dodgeTimer / this.game.player.dodgeCooldown) * 100;
                dodgeElement.style.height = `${100 - cooldownPercent}%`;
                dodgeSkill.classList.remove('skill-ready');
            } else {
                dodgeElement.style.height = '0%';
                dodgeSkill.classList.add('skill-ready');
            }
        }
    }
      updateMinimap() {
        if (!this.game.player) return;
        
        // Throttle minimap updates for performance
        const now = Date.now();
        if (now - this.lastMinimapUpdate < this.minimapUpdateInterval) {
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
        let bossFound = false;
        let nearestBoss = null;
        let minBossDistance = Infinity;
        
        this.game.enemies.forEach(enemy => {
            // Calculate relative position
            const relX = (enemy.x - this.game.player.x) * this.minimapScale + centerX;
            const relY = (enemy.y - this.game.player.y) * this.minimapScale + centerY;
            
            // Track boss
            if (enemy.isBoss) {
                bossFound = true;
                const dx = enemy.x - this.game.player.x;
                const dy = enemy.y - this.game.player.y;
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
                
                const dotSize = enemy.isBoss ? 6 : 3; // Increased size for better visibility
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(relX, relY, dotSize, 0, Math.PI * 2);
                this.minimapCtx.fill();
                
                // Add glow effect for enemies
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(relX, relY, dotSize + 2, 0, Math.PI * 2);
                this.minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.minimapCtx.fill();
            }
        });
        
        // Draw XP orbs on minimap
        this.game.xpOrbs.forEach(orb => {
            const relX = (orb.x - this.game.player.x) * this.minimapScale + centerX;
            const relY = (orb.y - this.game.player.y) * this.minimapScale + centerY;
            
            if (relX >= 0 && relX <= this.minimap.width && relY >= 0 && relY <= this.minimap.height) {
                this.minimapCtx.fillStyle = '#2ecc71'; // Green for XP orbs
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(relX, relY, 2, 0, Math.PI * 2);
                this.minimapCtx.fill();
                
                // Add glow effect for XP orbs
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(relX, relY, 4, 0, Math.PI * 2);
                this.minimapCtx.fillStyle = 'rgba(46, 204, 113, 0.2)';
                this.minimapCtx.fill();
            }
        });
        
        // Update boss tracking
        const bossDirection = document.getElementById('boss-direction');
        const bossDistance = document.getElementById('boss-distance');
        
        if (bossFound && nearestBoss) {
            // Show boss direction indicator
            bossDirection.classList.remove('hidden');
            bossDistance.classList.remove('hidden');
            
            // Calculate angle to boss
            const dx = nearestBoss.x - this.game.player.x;
            const dy = nearestBoss.y - this.game.player.y;
            const angle = Math.atan2(dy, dx);
            
            // Update direction indicator
            bossDirection.style.transform = `rotate(${angle}rad)`;
            
            // Update distance display
            const distance = Math.sqrt(dx * dx + dy * dy);
            bossDistance.textContent = `${Math.round(distance)}px`;
            
            // Add alert effect if boss is close
            if (distance < 300) {
                this.minimapContainer.classList.add('minimap-alert');
            } else {
                this.minimapContainer.classList.remove('minimap-alert');
            }
        } else {
            bossDirection.classList.add('hidden');
            bossDistance.classList.add('hidden');
        }
        
        // Add border highlight when enemies are close
        let nearbyEnemyCount = 0;
        const alertDistance = 300;
        const sqAlertDist = alertDistance * alertDistance;
        
        this.game.enemies.forEach(enemy => {
            const dx = enemy.x - this.game.player.x;
            const dy = enemy.y - this.game.player.y;
            if (dx * dx + dy * dy < sqAlertDist) {
                nearbyEnemyCount++;
            }
        });
        
        if (nearbyEnemyCount > 0) {
            this.minimapContainer.classList.add('minimap-alert');
        } else {
            this.minimapContainer.classList.remove('minimap-alert');
        }
    }

    updateDifficultyScaling() {
        if (!this.enemySpawner) return;
        
        // Dynamically scale max enemies based on difficulty and player level
        const playerLevelFactor = this.game.player ? 
            (1 + this.game.player.level / 15) : 1; // 6.7% more enemies per level (more balanced)
            
        // More balanced time-based enemy scaling for both modes
        const gameMinutes = this.gameTime / 60;
        const timeBasedLimit = Math.min(450, Math.floor(45 + (gameMinutes * 25))); // +25 enemies per minute
        
        // Early game is more approachable, late game more challenging
        const earlyStageFactor = Math.min(1, gameMinutes / 2.5); // Reaches max effect after 2.5 minutes
        
        // Calculate new max enemies - combines base value, difficulty scaling, time and level factors
        const newMaxEnemies = Math.floor(
            Math.min(550, // Higher upper limit for endless mode
                (40 + // Balanced base value
                (this.difficultyFactor * 30) + // Less impact from difficulty
                (Math.pow(gameMinutes, 1.2) * 15)) * // More balanced time scaling
                playerLevelFactor * // Player level factor
                (0.75 + (0.25 * earlyStageFactor)) // Smoother early game ramp-up
            )
        );
        
        this.enemySpawner.maxEnemies = Math.max(newMaxEnemies, timeBasedLimit);
        
        // Track highest enemy count for stats
        this.gameStats.highestEnemyCount = Math.max(
            this.gameStats.highestEnemyCount, 
            this.enemySpawner.maxEnemies
        );
        
        // Dynamic spawn rate scaling with diminishing returns at higher levels
        const baseSpawnRate = 1.1 + (this.difficultyFactor * 0.8); // More balanced base spawn rate
        const spawnRateCap = 10.0; // Lower cap for better control
        
        this.enemySpawner.spawnRate = Math.min(
            spawnRateCap,
            baseSpawnRate * (1 + Math.pow(gameMinutes / 10, 0.7)) // More balanced scaling
        );
        this.enemySpawner.spawnCooldown = 1 / this.enemySpawner.spawnRate;
        
        // Adjust elite chance based on time and difficulty with better scaling
        if (this.enemySpawner.eliteChance !== undefined) {
            const baseEliteChance = 0.06; // Start at 6% (more balanced)
            const maxEliteChance = 0.40; // Cap at 40% (more balanced)
            const eliteScaling = this.difficultyFactor * 0.07; // More balanced elite scaling
            
            this.enemySpawner.eliteChance = Math.min(
                maxEliteChance, 
                baseEliteChance + eliteScaling + (gameMinutes * 0.012) // Additional 1.2% per minute
            );
        }
        
        // Adjust wave interval to make waves more frequent later with better progression
        if (this.enemySpawner.waveInterval !== undefined) {
            const minWaveInterval = 12; // Minimum 12 seconds between waves (more balanced)
            
            this.enemySpawner.waveInterval = Math.max(
                minWaveInterval,
                35 - (this.difficultyFactor * 3.5) - (gameMinutes * 0.6) // More balanced wave timing
            );
        }
        
        // Make bosses more frequent at higher difficulties with better scaling
        if (this.enemySpawner.bossInterval !== undefined) {
            const minBossInterval = 40; // Minimum 40 seconds between bosses (more balanced)
            
            this.enemySpawner.bossInterval = Math.max(
                minBossInterval,
                55 - (this.difficultyFactor * 7) - (gameMinutes * 1.0) // More balanced boss timing
            );
        }
        
        // Add dynamic enemy health multiplier based on time to ensure challenge increases
        if (this.enemySpawner.enemyHealthMultiplier === undefined) {
            this.enemySpawner.enemyHealthMultiplier = 1.0;
        }
        
        // Increase enemy health multiplier over time with better scaling
        this.enemySpawner.enemyHealthMultiplier = 1.0 + 
            (this.difficultyFactor * 0.2) + // Less impact from difficulty
            (Math.min(2.0, gameMinutes / 10) * 0.5); // More balanced time scaling
    }
    
    // Add a helper method for creating special combat effects
    createSpecialEffect(type, x, y, size, color) {
        switch (type) {
            case 'lightning':
                // Create a lightning strike effect
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 50 + Math.random() * 150;
                    const distance = Math.random() * size;
                    const particle = new Particle(
                        x + Math.cos(angle) * (distance * 0.2), // Cluster closer to center
                        y + Math.sin(angle) * (distance * 0.2),
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        2 + Math.random() * 3,
                        color || '#3498db',
                        0.2 + Math.random() * 0.2
                    );
                    this.particles.push(particle);
                }
                
                // Create central flash
                const flash = new Particle(
                    x, y,
                    0, 0,
                    size * 0.5,
                    color || '#3498db',
                    0.15
                );
                this.particles.push(flash);
                break;
            
            case 'ricochet':
                // Create a bounce effect - particles flying outward
                for (let i = 0; i < 10; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 60 + Math.random() * 120;
                    const particle = new Particle(
                        x,
                        y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        2 + Math.random() * 3,
                        color || '#f39c12',
                        0.2 + Math.random() * 0.2
                    );
                    this.particles.push(particle);
                }
                
                // Create a small flash
                const bounceFlash = new Particle(
                    x, y,
                    0, 0,
                    size * 0.6,
                    color || '#f39c12',
                    0.1
                );
                this.particles.push(bounceFlash);
                break;

            case 'spread':
                // Create spread attack effect
                for (let i = 0; i < 15; i++) {
                    const angle = -Math.PI/8 + (Math.PI/4) * (i/14);
                    const speed = 80 + Math.random() * 40;
                    const particle = new Particle(
                        x, y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        3 + Math.random() * 2,
                        color || '#9b59b6',
                        0.3 + Math.random() * 0.2
                    );
                    this.particles.push(particle);
                }
                break;
                
            case 'circle':
                // Create circle attack effect
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2;
                    const speed = 70 + Math.random() * 30;
                    const particle = new Particle(
                        x, y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        3 + Math.random() * 2,
                        color || '#9b59b6',
                        0.4
                    );
                    this.particles.push(particle);
                }
                break;
                
            case 'random':
                // Create random attack effect
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 50 + Math.random() * 100;
                    const particle = new Particle(
                        x, y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        2 + Math.random() * 3,
                        color || '#9b59b6',
                        0.2 + Math.random() * 0.3
                    );
                    this.particles.push(particle);
                }
                break;
                
            case 'bossPhase':
                // Create boss phase transition effect (more dramatic)
                // Central explosion
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 100 + Math.random() * 200;
                    const particle = new Particle(
                        x, y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        3 + Math.random() * 5,
                        color || '#e74c3c',
                        0.4 + Math.random() * 0.3
                    );
                    this.particles.push(particle);
                }
                
                // Add shockwave
                const shockwave = new ShockwaveParticle(
                    x, y, 
                    size * 2, 
                    color || '#e74c3c',
                    0.8
                );
                this.particles.push(shockwave);
                
                // Add screen shake
                this.addScreenShake(8, 0.5);
                break;
        }
    }

    // Add screen shake method
    addScreenShake(amount, duration) {
        this.screenShakeAmount = amount;
        this.screenShakeDuration = duration;
    }

    activateBossMode() {
        try {
            this.bossActive = true;
            
            // Find all bosses
            const bosses = this.game.enemies.filter(enemy => enemy.isBoss);
            
            // Clear old boss entries
            this.activeBosses.clear();
            
            // Add each boss to tracking with unique IDs
            bosses.forEach(boss => {
                // Ensure boss has an ID
                if (!boss.id) {
                    boss.id = Math.random().toString(36).substr(2, 9);
                }
                this.activeBosses.set(boss.id, boss);
            });
            
            // Show boss health bars
            const bossHealthContainer = document.getElementById('boss-health-container');
            if (bossHealthContainer) {
                bossHealthContainer.classList.remove('hidden');
                this.bossHealthBarVisible = true;
                
                // Clear existing health bars
                bossHealthContainer.innerHTML = '';
                
                // Create health bar for each boss
                bosses.forEach(boss => {
                    const bossEntry = document.createElement('div');
                    bossEntry.className = 'boss-health-entry';
                    bossEntry.id = `boss-entry-${boss.id}`;
                    
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'boss-name';
                    nameDiv.innerHTML = `${boss.isMegaBoss ? 'MEGA BOSS' : 'BOSS'} 
                        <span class="boss-type-indicator ${boss.isMegaBoss ? 'mega' : ''}">${boss.isMegaBoss ? '★★★' : '★'}</span>`;
                    
                    const healthBar = document.createElement('div');
                    healthBar.className = `boss-health-bar ${boss.isMegaBoss ? 'mega' : ''}`;
                    healthBar.id = `boss-health-${boss.id}`;
                    
                    bossEntry.appendChild(nameDiv);
                    bossEntry.appendChild(healthBar);
                    bossHealthContainer.appendChild(bossEntry);
                });
            }
            
            // Add screen effect for boss presence
            this.addScreenShake(4, 0.5);
            
            // Play boss music and start boss theme
            if (audioSystem) {
                audioSystem.play('boss', 0.8);
                audioSystem.playBossTheme(0.2);
            }
            
            // Add pulsing border effect to screen
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.classList.add('boss-active');
            }
            
            // Initialize boss indicators on minimap
            this.initializeBossIndicators();
        } catch (error) {
            console.error('Error in activateBossMode:', error);
        }
    }
    
    deactivateBossMode() {
        // Only deactivate if no bosses remain
        const remainingBosses = this.game.enemies.filter(enemy => enemy.isBoss);
        if (remainingBosses.length > 0) return;
        
        this.bossActive = false;
        this.activeBosses.clear();
        
        // Hide boss health bars
        const bossHealthContainer = document.getElementById('boss-health-container');
        if (bossHealthContainer) {
            bossHealthContainer.classList.add('hidden');
            this.bossHealthBarVisible = false;
        }
        
        // Remove boss presence effect
        document.getElementById('game-container').classList.remove('boss-active');
        
        // Player gets a short invulnerability period after defeating all bosses
        if (this.game.player && !this.game.player.isDead) {
            this.game.player.isInvulnerable = true;
            this.game.player.invulnerabilityTimer = 2.0; // 2 seconds of safety
            
            // Heal player a bit more after defeating all bosses
            const healAmount = this.game.player.maxHealth * 0.05;
            this.game.player.heal(healAmount);
        }
        
        // Stop boss theme when all bosses are defeated
        audioSystem.stopBossTheme();
        
        // Clear boss indicators
        this.clearBossIndicators();
    }
    
    updateBossUI() {
        if (!this.bossActive) return;
        
        // Update boss list from current enemies
        const currentBosses = this.game.enemies.filter(enemy => enemy.isBoss);
        
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
        this.updateBossIndicators();
    }
    
    initializeBossIndicators() {
        // Create boss indicators container if it doesn't exist
        let indicatorsContainer = document.querySelector('.boss-indicators');
        if (!indicatorsContainer) {
            indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'boss-indicators';
            document.getElementById('minimap-container').appendChild(indicatorsContainer);
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
    
    updateBossIndicators() {
        if (!this.game.player) return;
        
        this.activeBosses.forEach((boss, id) => {
            const indicator = document.getElementById(`boss-indicator-${id}`);
            const distanceLabel = document.getElementById(`boss-distance-${id}`);
            
            if (indicator && distanceLabel) {
                // Calculate angle and distance to boss
                const dx = boss.x - this.game.player.x;
                const dy = boss.y - this.game.player.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Convert distance to a more readable format (in "meters")
                const displayDistance = Math.round(distance / 10); // Scale down for more reasonable numbers
                
                // Position indicator on minimap
                const minimapRadius = this.minimap.width / 2;
                const scale = Math.min(1, minimapRadius / distance);
                
                // Calculate position, keeping indicator within minimap bounds
                let x = minimapRadius + (dx * this.minimapScale * scale);
                let y = minimapRadius + (dy * this.minimapScale * scale);
                
                // Clamp positions to minimap bounds with small margin
                const margin = 10;
                x = Math.max(margin, Math.min(this.minimap.width - margin, x));
                y = Math.max(margin, Math.min(this.minimap.height - margin, y));
                
                // Update indicator position
                indicator.style.left = `${x}px`;
                indicator.style.top = `${y}px`;
                
                // Update distance label
                distanceLabel.textContent = displayDistance;
                
                // Add alert effect if boss is close
                if (distance < 300) {
                    indicator.classList.add('alert');
                    // Make distance label more prominent when close
                    distanceLabel.style.color = '#e74c3c';
                    distanceLabel.style.fontWeight = 'bold';
                } else {
                    indicator.classList.remove('alert');
                    distanceLabel.style.color = '#fff';
                    distanceLabel.style.fontWeight = 'normal';
                }
                
                // Special effects for mega boss
                if (boss.isMegaBoss) {
                    indicator.classList.add('mega');
                    // Add pulsing glow effect to distance label for mega boss
                    distanceLabel.style.textShadow = '0 0 8px rgba(155, 89, 182, 0.8)';
                }
            }
        });
    }
    
    clearBossIndicators() {
        const indicatorsContainer = document.querySelector('.boss-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.innerHTML = '';
        }
    }    // Show win screen method
    showWinScreen() {
        console.log("Showing win screen called!");

        // Prevent multiple win screens with stronger validation
        if (this.winScreenDisplayed || this.gameWon) {
            console.log("Win screen already displayed or game already won, not showing again");
            return false;
        }
        
        // Check if win screen element already exists
        const existingWinScreen = document.getElementById('win-screen');
        if (existingWinScreen) {
            console.log("Win screen element already exists, not creating another");
            return false;
        }
        
        // Flag states immediately to prevent race conditions
        this.gameWon = true;
        this.gameOver = true;
        this.winScreenDisplayed = true;
        
        console.log("Win screen flags set, displaying screen now");
        
        // Pause the game immediately
        if (this.game) {
            this.game.isPaused = true;
        }
        
        // Stop enemy spawning completely with safety checks
        if (this.enemySpawner) {
            this.enemySpawner.spawnRate = 0;
            this.enemySpawner.maxEnemies = 0;
            this.enemySpawner.wavesEnabled = false;
            this.enemySpawner.bossInterval = Number.MAX_VALUE; // Prevent more bosses
        }
        
        // Create massive victory explosion effect at player position
        if (this.game && this.game.player) {
            this.createSpecialEffect('bossPhase', this.game.player.x, this.game.player.y, 150, '#f1c40f');
            this.addScreenShake(8, 1.0);
        }
        
        // Create win screen UI (with slight delay to ensure it displays properly)
        setTimeout(() => {
            // Double-check we haven't already created the win screen
            if (document.getElementById('win-screen')) {
                return;
            }
            
            const winDiv = document.createElement('div');
            winDiv.id = 'win-screen';
            
            // Rest of the win screen creation code remains the same
            const totalSeconds = Math.floor(this.gameTime);
            const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const seconds = (totalSeconds % 60).toString().padStart(2, '0');
            
            // Calculate score based on various factors with safety checks
            const timeScore = Math.floor(totalSeconds * 10);
            const killScore = this.killCount * 100;
            const levelScore = (this.game?.player?.level || 0) * 500;
            const bossScore = (this.gameStats?.bossesSpawned || 0) * 1000;
            const totalScore = timeScore + killScore + levelScore + bossScore;
            // Calculate meta star tokens earned this run
            const earnedStars = Math.floor(this.killCount / 50) + (this.gameStats.bossesSpawned || 0);
            
            // Get player upgrades for display
            const upgrades = this.game.player.upgrades || [];
            let upgradeList = '';
            const upgradeCounts = {};
            
            upgrades.forEach(upgrade => {
                const name = upgrade.displayName || upgrade.name;
                if (!upgradeCounts[name]) {
                    upgradeCounts[name] = 1;
                } else {
                    upgradeCounts[name]++;
                }
            });
            
            // Create upgrade list HTML
            for (const [name, count] of Object.entries(upgradeCounts)) {
                upgradeList += `<li>${name}${count > 1 ? ` x${count}` : ''}</li>`;
            }
            
            // Set victory content with mega boss defeat message
            winDiv.innerHTML = `
                <h1>VICTORY!</h1>
                <h2>You've Defeated the Mega Boss!</h2>
                <p>Final Score: <span class="stats-highlight">${totalScore}</span></p>
                <p>Survived for: <span class="stats-highlight">${minutes}:${seconds}</span></p>
                <p>Level reached: <span class="stats-highlight">${this.game.player.level}</span></p>
                <p>Enemies defeated: <span class="stats-highlight">${this.killCount}</span></p>
                <p>Bosses conquered: <span class="stats-highlight">${this.gameStats.bossesSpawned || 0}</span></p>
                <p>Stars earned: <span class="stats-highlight">${earnedStars}</span></p>
                <p>Highest Combo: <span class="stats-highlight">${this.highestCombo}</span></p>
                <div class="upgrades-container">
                    <h3>Your Build</h3>
                    <ul class="upgrade-list">
                        ${upgradeList}
                    </ul>
                </div>
                <button id="play-again-button">Play Again</button>
                <p class="victory-message">Congratulations on your victory over the Mega Boss!</p>
            `;
            
            document.getElementById('game-container').appendChild(winDiv);
            // Award and display star tokens
            this.earnStarTokens(earnedStars);
            console.log("Win screen DOM element added");
            
            // Add play again button functionality
            document.getElementById('play-again-button').addEventListener('click', () => {
                window.location.reload();
            });
            
            // Play victory sound
            if (audioSystem && audioSystem.play) {
                audioSystem.play('levelUp', 0.8); // Use level up sound as victory sound
            }
        }, 100); // Short delay to ensure DOM is ready
    }

    // Add helper method to check if mega boss was defeated
    checkMegaBossDefeated() {
        // Endless mode: never end game from mega boss defeat
        if (this.endlessMode) {
            return false;
        }
        // No enemies in game yet
        if (!this.game || !this.game.enemies) {
            return false;
        }
        
        // Check if mega boss exists in tracking but not in enemies array (was defeated)
        if (this.megaBossTracked && !this.game.enemies.some(enemy => enemy.isMegaBoss)) {
            return true;
        }
        
        // Start tracking if mega boss appears
        const hasMegaBoss = this.game.enemies.some(enemy => enemy.isMegaBoss);
        if (hasMegaBoss) {
            this.megaBossTracked = true;
        }
        
        return false;
    }

    // Meta progression: persistent star tokens across runs
    loadStarTokens() {
        this.metaStars = parseInt(localStorage.getItem('starTokens') || '0', 10);
    }

    saveStarTokens() {
        localStorage.setItem('starTokens', this.metaStars);
    }
    
    // Meta progression: persistent upgrades across runs
    loadMetaUpgrades() {
        this.meta_mercury_speed = parseInt(localStorage.getItem('meta_mercury_speed') || '0', 10);
        this.meta_mercury_dodge_cd = parseInt(localStorage.getItem('meta_mercury_dodge_cd') || '0', 10);
        this.meta_venus_hp = parseInt(localStorage.getItem('meta_venus_hp') || '0', 10);
        this.meta_venus_regen = parseInt(localStorage.getItem('meta_venus_regen') || '0', 10);
        this.meta_mars_damage = parseInt(localStorage.getItem('meta_mars_damage') || '0', 10);
        this.meta_mars_attack_speed = parseInt(localStorage.getItem('meta_mars_attack_speed') || '0', 10);
        this.meta_jupiter_xp_gain = parseInt(localStorage.getItem('meta_jupiter_xp_gain') || '0', 10);
        this.meta_jupiter_star_drop = parseInt(localStorage.getItem('meta_jupiter_star_drop') || '0', 10);
        this.meta_saturn_magnet = parseInt(localStorage.getItem('meta_saturn_magnet') || '0', 10);
        this.meta_saturn_extra_projectile = parseInt(localStorage.getItem('meta_saturn_extra_projectile') || '0', 10);
        this.meta_neptune_crit = parseInt(localStorage.getItem('meta_neptune_crit') || '0', 10);
        this.meta_neptune_aoe_boost = parseInt(localStorage.getItem('meta_neptune_aoe_boost') || '0', 10);
        this.meta_pluto_damage_reduction = parseInt(localStorage.getItem('meta_pluto_damage_reduction') || '0', 10);
        this.meta_pluto_start_level = parseInt(localStorage.getItem('meta_pluto_start_level') || '0', 10);
    }

    updateStarDisplay() {
        if (this.starDisplayElement) {
            this.starDisplayElement.textContent = '⭐ ' + this.metaStars;
        }
    }

    earnStarTokens(amount) {
        if (amount <= 0) return;
        this.metaStars += amount;
        this.saveStarTokens();
        this.updateStarDisplay();
        
        // Update star collector achievement
        if (achievementSystem) {
            achievementSystem.updateAchievement('star_collector', this.metaStars);
        }
        
        if (this.game && this.game.player) {
            this.showFloatingText('+' + amount + ' ⭐', this.game.player.x, this.game.player.y - 60, '#f1c40f', 20);
        }
    }
    
    onEnemyKilled(enemy) {
        this.enemiesKilled++;
        achievementSystem.updateAchievement('first_kill', this.enemiesKilled);
        
        if (enemy.isBoss) {
            this.bossesKilled++;
            achievementSystem.updateAchievement('boss_slayer', this.bossesKilled);
            
            if (enemy.isMegaBoss) {
                achievementSystem.onMegaBossDefeated();
            }
        }

        // Track elite kills
        if (enemy.isElite) {
            achievementSystem.onEliteKilled();
        }

        // Track kill streak
        achievementSystem.onEnemyKilled(Date.now());
    }
    
    onPlayerLevelUp(level) {
        if (achievementSystem) {
            achievementSystem.updateAchievement('level_up', level);
        }
    }
    
    onStarCollected(count) {
        this.earnStarTokens(count);
        achievementSystem.updateAchievement('star_collector', count);
    }
    
    onDodge(wasPerfect = false) {
        this.dodgesPerformed++;
        achievementSystem.updateAchievement('dodge_master', this.dodgesPerformed);
        
        if (wasPerfect) {
            this.perfectDodges++;
            achievementSystem.updateAchievement('perfect_dodge', this.perfectDodges);
        }
    }
    
    onComboUpdate(combo) {
        this.comboCount = combo;
        achievementSystem.updateAchievement('combo_master', combo);
    }

    // Update player damage tracking
    onPlayerDamaged() {
        if (achievementSystem) {
            achievementSystem.onPlayerDamaged();
        }
    }

    // Track wave completion
    onWaveCompleted(waveNumber) {
        if (achievementSystem) {
            achievementSystem.onWaveCompleted(waveNumber);
            achievementSystem.updateAchievement('wave_master', waveNumber);
            
            // Also update endless champion achievement
            if (this.endlessMode) {
                achievementSystem.updateAchievement('endless_champion', waveNumber);
            }
        }
    }

    // Track critical hits
    onCriticalHit() {
        if (achievementSystem) {
            achievementSystem.onCriticalHit();
        }
    }

    // Track chain lightning hits
    onChainLightningHit(hitCount) {
        if (achievementSystem) {
            achievementSystem.onChainLightningHit(hitCount);
        }
    }

    // Track ricochet hits
    onRicochetHit(hitCount) {
        if (achievementSystem) {
            achievementSystem.onRicochetHit(hitCount);
        }
    }

    // Track orbital projectile count
    onOrbitalCountChanged(count) {
        if (achievementSystem) {
            achievementSystem.onOrbitalCountChanged(count);
        }
    }

    // Track vendor upgrade maxed
    onUpgradeMaxed(upgradeId) {
        if (achievementSystem) {
            achievementSystem.onUpgradeMaxed();
            achievementSystem.updateAchievement('max_upgrade', 1);
        }
    }

    // Effect symbols for different shot types
    static EFFECT_SYMBOLS = {
        chain: '⚡', // lightning bolt for chain effect
        critical: '✧', // sparkle for crits
        explosive: '💥', // explosion for explosive shots
        ricochet: '↺', // circular arrow for ricochet
        pierce: '⟶', // arrow for piercing
        frost: '❄', // snowflake for frost shots
        poison: '☠', // skull for poison
        fire: '🔥', // fire for burning
        vampiric: '🩸', // blood drop for life steal
        orbital: '☄', // comet for orbital shots
        split: '⋔', // fork symbol for split shots
        homing: '⟲', // curved arrow for homing shots
        combo: '✦', // star for combo hits
        xp: '✧',          // regular XP
        xpBonus: '⭐',    // bonus XP
        xpCrit: '✯',      // critical XP
        levelUp: '☆',     // level up
    };

    // Show floating combat text with effects
    showCombatText(text, x, y, effect = null, size = 16) {
        let displayText = text;
        let color = 'white';
        
        // Add effect symbol if specified
        if (effect && GameManager.EFFECT_SYMBOLS[effect]) {
            const symbol = GameManager.EFFECT_SYMBOLS[effect];
            
            // Set color based on effect type
            switch(effect) {
                case 'chain':
                    color = '#3498db'; // blue
                    displayText = `${symbol} ${text}`;
                    break;
                case 'critical':
                    color = '#e74c3c'; // red
                    displayText = `${symbol} ${text} ${symbol}`;
                    break;
                case 'explosive':
                    color = '#e67e22'; // orange
                    displayText = `${symbol} ${text}`;
                    break;
                case 'ricochet':
                    color = '#f1c40f'; // yellow
                    displayText = `${symbol} ${text}`;
                    break;
                case 'pierce':
                    color = '#9b59b6'; // purple
                    displayText = `${symbol} ${text}`;
                    break;
                case 'frost':
                    color = '#00f7ff'; // cyan
                    displayText = `${symbol} ${text}`;
                    break;
                case 'poison':
                    color = '#2ecc71'; // green
                    displayText = `${symbol} ${text}`;
                    break;
                case 'fire':
                    color = '#e74c3c'; // red
                    displayText = `${symbol} ${text}`;
                    break;
                case 'vampiric':
                    color = '#c0392b'; // dark red
                    displayText = `${symbol} ${text}`;
                    break;
                case 'orbital':
                    color = '#3498db'; // blue
                    displayText = `${symbol} ${text}`;
                    break;
                case 'split':
                    color = '#f39c12'; // orange
                    displayText = `${symbol} ${text}`;
                    break;
                case 'homing':
                    color = '#1abc9c'; // turquoise
                    displayText = `${symbol} ${text}`;
                    break;
                case 'combo':
                    color = '#f1c40f'; // yellow
                    displayText = `${symbol}${text}${symbol}`;
                    break;
                case 'xp':
                    color = '#f39c12'; // orange
                    displayText = `${symbol} ${text}`;
                    break;
                case 'xpBonus':
                    color = '#2ecc71'; // green
                    displayText = `${symbol} ${text}`;
                    break;
                case 'xpCrit':
                    color = '#e74c3c'; // red
                    displayText = `${symbol} ${text}`;
                    break;
                case 'levelUp':
                    color = '#9b59b6'; // purple
                    displayText = `${symbol} ${text}`;
                    break;
                default:
                    displayText = `${text}`;
            }
        }

        // Create the floating text element
        const textElement = document.createElement('div');
        textElement.className = 'floating-text';
        textElement.textContent = displayText;
        
        // Convert game coordinates to screen coordinates
        const cameraX = -this.game.player.x + this.game.canvas.width / 2;
        const cameraY = -this.game.player.y + this.game.canvas.height / 2;
        
        const screenX = x + cameraX;
        const screenY = y + cameraY;
        
        // Apply styles
        textElement.style.left = `${screenX}px`;
        textElement.style.top = `${screenY}px`;
        textElement.style.color = color;
        textElement.style.fontSize = `${size}px`;
        
        // Add special class for effect animations if needed
        if (effect) {
            textElement.classList.add(`effect-${effect}`);
        }
        
        document.getElementById('game-container').appendChild(textElement);
        
        // Remove element after animation completes
        setTimeout(() => {
            textElement.remove();
        }, 1000);
    }
}

// Particle class for visual effects
class Particle {
    constructor(x, y, vx, vy, size, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.initialSize = size;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;
        this.isDead = false;
        
        // Optional: gravity effect
        this.hasGravity = false;
        this.gravity = 50;
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        if (this.hasGravity) {
            this.vy += this.gravity * deltaTime;
        }
        
        // Fade out and shrink as they age
        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.isDead = true;
        }
    }
    
    render(ctx) {
        const lifePercent = 1 - (this.age / this.lifetime);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.initialSize * lifePercent, 0, Math.PI * 2);
        
        // Make particles fade out
        const alpha = lifePercent;
        ctx.fillStyle = this.makeColorWithAlpha(this.color, alpha);
        ctx.fill();
    }
    
    makeColorWithAlpha(color, alpha) {
        // Handle hex colors
        if (color.startsWith('#')) {
            // Convert hex to RGB
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // Already rgba or similar
        return color;
    }
}

// Shockwave effect
class ShockwaveParticle {
    constructor(x, y, size, color, lifetime) {
        this.x = x;
        this.y = y;
        this.size = 1;
        this.maxSize = size;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;
        this.isDead = false;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.size = (this.age / this.lifetime) * this.maxSize;
        
        if (this.age >= this.lifetime) {
            this.isDead = true;
        }
    }
    
    render(ctx) {
        const lifePercent = 1 - (this.age / this.lifetime);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        // Make particles fade out
        const alpha = lifePercent * 0.5;
        ctx.strokeStyle = this.makeColorWithAlpha(this.color, alpha);
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    makeColorWithAlpha(color, alpha) {
        // Handle hex colors
        if (color.startsWith('#')) {
            // Convert hex to RGB
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // Already rgba or similar
        return color;
    }
}

// Instead, modify the existing XPOrb class in enemy.js
// Add this override to increase XP values
const OriginalXPOrb = XPOrb;

// Override the XPOrb constructor with a new version that increases XP values
XPOrb = function(x, y, value) {
    // Increase early XP values by ~15% to match faster progression
    return new OriginalXPOrb(x, y, Math.ceil(value * 1.15));
};

// Make sure the prototype chain is maintained
XPOrb.prototype = OriginalXPOrb.prototype;
XPOrb.prototype.constructor = XPOrb;

// Create global upgrade system instance
const upgradeSystem = new UpgradeSystem();

// In the UpgradeSystem class (via patch to the global instance)
upgradeSystem.getRandomUpgrades = function(count) {
    // Get all available upgrades that player can select
    const availableUpgrades = this.availableUpgrades.filter(upgrade => {
        // Exclude any non-stackable upgrade already selected
        if (!upgrade.stackable && this.isUpgradeSelected(upgrade.id)) {
            return false;
        }
        // Allow stackable upgrades to appear multiple times
        if (upgrade.stackable === true) {
            // For stackable upgrades, we don't exclude them even if already selected
            // Check if required upgrades are met
            if (upgrade.requires) {
                return upgrade.requires.every(reqId => this.isUpgradeSelected(reqId));
            }
            return true;
        }
        
        // Exclude already selected one-time upgrades
        if (upgrade.type === 'piercing' && this.isUpgradeSelected('piercing_shot')) {
            return false;
        }
        
        // Check if required upgrades are met
        if (upgrade.requires) {
            return upgrade.requires.every(reqId => this.isUpgradeSelected(reqId));
        }
        
        // If special type is aoe, check if player already has it
        if (upgrade.specialType === 'aoe' && this.isUpgradeSelected('aoe_attack')) {
            return false;
        }
        
        return true;
    });
    
    // Weight upgrades by rarity
    const weightedOptions = [];
    availableUpgrades.forEach(upgrade => {
        const rarity = upgrade.rarity || 'common';
        let weight;
        
        switch (rarity) {
            case 'common': weight = 100; break;
            case 'uncommon': weight = 50; break;
            case 'rare': weight = 25; break;
            case 'epic': weight = 10; break;
            default: weight = 10;
        }
        
        // Add weighted copies to the pool
        for (let i = 0; i < weight; i++) {
            weightedOptions.push(upgrade);
        }
    });
    
    // Shuffle and select unique upgrades
    const shuffled = this.shuffleArray([...weightedOptions]);
    const selected = [];
    const selectedIds = new Set();
    
    for (const upgrade of shuffled) {
        // For stackable upgrades, we want to still ensure variety in options
        // by not offering the same upgrade twice in one level-up choice
        if (!selectedIds.has(upgrade.id)) {
            selected.push(upgrade);
            selectedIds.add(upgrade.id);
            
            if (selected.length >= count) {
                break;
            }
        }
    }
    
    return selected;
};

// Update this method inside the UpgradeSystem class or apply this to upgradeSystem global instance
upgradeSystem.renderUpgradeOption = function(upgrade, index) {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'upgrade-option';
    optionDiv.dataset.index = index;
    
    // Add stacking visual indicator if this is a stacked upgrade
    if (upgrade.isStacked) {
        optionDiv.classList.add('stacked-upgrade');
    }
    
    // Use different colors based on rarity
    const rarityColors = {
        common: '#95a5a6',
        uncommon: '#2ecc71',
        rare: '#3498db',
        epic: '#9b59b6',
        legendary: '#f39c12'
    };
    
    const rarityColor = rarityColors[upgrade.rarity || 'common'];
    
    // Create visual elements
    optionDiv.innerHTML = `
        <div class="upgrade-header" style="border-bottom: 2px solid ${rarityColor}">
            <span class="upgrade-name">${upgrade.displayName || upgrade.name}</span>
            <span class="upgrade-rarity" style="color: ${rarityColor}">${upgrade.rarity || 'common'}</span>
        </div>
        <div class="upgrade-description">${upgrade.description || ''}</div>
        <div class="upgrade-key-hint">${index + 1}</div>
        ${upgrade.isStacked ? '<div class="stack-indicator">UPGRADE</div>' : ''}
    `;
    
    // Add click handler to select this upgrade
    optionDiv.addEventListener('click', () => {
        this.selectUpgrade(index);
    });
    
    // If stacked, add gleaming animation
    if (upgrade.isStacked) {
        optionDiv.style.animation = 'stackGlow 1.5s infinite alternate';
    }
    
    return optionDiv;
};

// Create global game manager instance
const gameManager = new GameManager();

// Add update function to game loop
const originalUpdate = gameManager.game.update;
gameManager.game.update = function(deltaTime) {
    originalUpdate.call(gameManager.game, deltaTime);
    gameManager.update(deltaTime);
};


// Override enemy die method to track kills and show floating text
Enemy.prototype.die = function() {
    this.isDead = true;
    
    // Create XP orb and increment kill count
    const orb = new XPOrb(this.x, this.y, this.xpValue);
    gameManager.game.addEntity(orb);
    const kills = gameManager.incrementKills();
    
    // Show floating kill text with effect
    gameManager.showCombatText('+1', this.x, this.y - 30, 'combo', 16);
    
    // Show milestone messages
    if (kills % 50 === 0) {
        gameManager.showCombatText(`${kills} KILLS!`, gameManager.game.player.x, 
                                    gameManager.game.player.y - 50, 'critical', 24);
    }
    
    // Play appropriate death sound and award star token on boss kill
    if (this.isBoss) {
        audioSystem.play('boss', 0.8);
        // Award 1 star token per boss defeated
        if (gameManager && typeof gameManager.earnStarTokens === 'function') {
            gameManager.earnStarTokens(1);
            // Extra star if Jupiter star drop upgrade is purchased
            const extra = parseInt(localStorage.getItem('meta_jupiter_star_drop') || '0', 10);
            if (extra > 0) {
                gameManager.earnStarTokens(extra);
            }
        }
    } else {
        audioSystem.play('enemyDeath', 0.3);
    }

    // Reset and increment combo
    if (gameManager) {
        gameManager.comboTimer = 0;
        gameManager.comboCount++;
        
        // Show combo counter for 3+ combos
        if (gameManager.comboCount >= 3) {
            gameManager.showFloatingText(`${gameManager.comboCount}x COMBO!`, 
                                       this.x, this.y - 50, '#f1c40f', 18);
            
            // Add minor screen shake for high combos
            if (gameManager.comboCount >= 5 && gameManager.comboCount % 5 === 0) {
                gameManager.addScreenShake(3, 0.2);
            }
        }
    }
    
    // Chance for critical XP drop (2-3x normal value)
    let xpValue = this.xpValue;
    if (gameManager && Math.random() < gameManager.critXpChance) {
        const multiplier = Math.random() < 0.3 ? 3 : 2;
        xpValue = Math.floor(this.xpValue * multiplier);
        
        // Create critical XP orb with visual distinction
        const critOrb = new XPOrb(this.x, this.y, xpValue);
        critOrb.isCritical = true;
        critOrb.pulseRate = 5; // Faster pulse for critical orbs
        critOrb.color = '#f39c12'; // Orange for critical XP
        critOrb.radius *= 1.5; // Bigger size
        gameManager.game.addEntity(critOrb);
        
        // Show critical XP text with ++ notation
        gameManager.showCombatText(`++${xpValue}`, this.x, this.y - 40, 'xpCrit', 18);
    } else {
        // Create normal XP orb
        const orb = new XPOrb(this.x, this.y, xpValue);
        gameManager.game.addEntity(orb);
    }
};

// Override player addXP method to track XP collected and show floating text
Player.prototype.addXP = function(amount) {
    this.xp += amount;
    gameManager.addXpCollected(amount);
    
    // Apply XP multiplier if it exists (from meta upgrades)
    if (this.xpMultiplier && this.xpMultiplier > 1) {
        const bonus = Math.floor(amount * (this.xpMultiplier - 1));
        if (bonus > 0) {
            // Show bonus XP with ++ notation
            gameManager.showCombatText(`++${bonus}`, this.x, this.y - 35, 'xpBonus', 16);
            this.xp += bonus;
            gameManager.addXpCollected(bonus);
        }
        // Show base XP gain
        gameManager.showCombatText(`+${amount}`, this.x, this.y - 50, 'xp', 14);
    } else {
        // Show regular XP gain
        gameManager.showCombatText(`+${amount}`, this.x, this.y - 40, 'xp', 14);
    }
    
    // Update XP bar
    const xpBar = document.getElementById('xp-bar');
    const xpPercentage = (this.xp / this.xpToNextLevel) * 100;
    xpBar.style.setProperty('--xp-width', `${Math.min(100, xpPercentage)}%`);
    
    // Check if player leveled up
    if (this.xp >= this.xpToNextLevel) {
        this.levelUp();
    }
    
    // Play pickup sound
    audioSystem.play('pickup', 0.2);
};

// Override player takeDamage method to show damage numbers and update health bar
Player.prototype.takeDamage = function(amount) {
    if (this.isInvulnerable) return;
    
    // Apply damage reduction if present
    if (this.damageReduction && this.damageReduction > 0) {
        amount = amount * (1 - this.damageReduction);
    }
    
    // Apply dodge chance
    if (this.dodgeChance && Math.random() < this.dodgeChance) {
        gameManager.showCombatText('DODGE!', this.x, this.y - 20, 'ricochet', 18);
        return;
    }
    
    this.health = Math.max(0, this.health - amount);
    
    // Show damage text with effect
    gameManager.showCombatText(`-${Math.round(amount)}`, this.x, this.y - 20, 'critical', 18);
    
    // Update health bar
    const healthBar = document.getElementById('health-bar');
    const healthPercentage = (this.health / this.maxHealth) * 100;
    healthBar.style.setProperty('--health-width', `${healthPercentage}%`);
    
    // Trigger invulnerability
    this.isInvulnerable = true;
    this.invulnerabilityTimer = this.invulnerabilityTime;
    
    // Check if player died
    if (this.health <= 0) {
        this.isDead = true;
    }
    
    // Play hit sound
    audioSystem.play('playerHit', 0.5);
};

// Override the original GameEngine.render to incorporate low-quality mode
const originalGameEngineRender = GameEngine.prototype.render;
GameEngine.prototype.render = function() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set camera to follow player
    this.ctx.save();
    if (this.player) {
        const cameraX = -this.player.x + this.canvas.width / 2;
        const cameraY = -this.player.y + this.canvas.height / 2;
        this.ctx.translate(cameraX, cameraY);
    }

    // Render particles below entities if not in low-quality mode
    if (gameManager && gameManager.particles && !gameManager.lowQuality) {
        gameManager.renderParticles(this.ctx);
    }

    // Render all entities
    if (gameManager && gameManager.lowQuality) {
        // Low-quality: draw in insertion order
        for (let i = 0, len = this.entities.length; i < len; i++) {
            this.entities[i].render(this.ctx);
        }
    } else {
        // Normal-quality: sort by y for proper layering
        [...this.entities].sort((a, b) => a.y - b.y).forEach(entity => {
            entity.render(this.ctx);
        });
    }

    this.ctx.restore();
};

// Override Enemy takeDamage method to create particle effect
const originalEnemyTakeDamage = Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage = function(amount) {
    // Create hit particles
    gameManager.createHitEffect(this.x, this.y, amount);
    
    // Call original method
    originalEnemyTakeDamage.call(this, amount);
    
    // Play hit sound
    audioSystem.play('hit', 0.2);
};

// Override Player levelUp method to create particles
const originalPlayerLevelUp = Player.prototype.levelUp;
Player.prototype.levelUp = function() {
    // Create level up effect
    gameManager.createLevelUpEffect(this.x, this.y);
    
    // Call original method
    originalPlayerLevelUp.call(this);
    
    // Play level up sound
    audioSystem.play('levelUp', 0.6);
};

// Override player takeDamage to incorporate damage reduction
Player.prototype.takeDamage = function(amount) {
    if (this.isInvulnerable) return;
    
    // Apply damage reduction if present
    if (this.damageReduction && this.damageReduction > 0) {
        amount = amount * (1 - this.damageReduction);
    }
    
    // Apply dodge chance
    if (this.dodgeChance && Math.random() < this.dodgeChance) {
        gameManager.showCombatText('DODGE!', this.x, this.y - 20, 'ricochet', 18);
        return;
    }
    
    this.health = Math.max(0, this.health - amount);
    
    // Show damage text with effect
    gameManager.showCombatText(`-${Math.round(amount)}`, this.x, this.y - 20, 'critical', 18);
    
    // Update health bar
    const healthBar = document.getElementById('health-bar');
    const healthPercentage = (this.health / this.maxHealth) * 100;
    healthBar.style.setProperty('--health-width', `${healthPercentage}%`);
    
    // Trigger invulnerability
    this.isInvulnerable = true;
    this.invulnerabilityTimer = this.invulnerabilityTime;
    
    // Check if player died
    if (this.health <= 0) {
        this.isDead = true;
    }
    
    // Play hit sound
    audioSystem.play('playerHit', 0.5);
};

// Override player doDodge method to add sound
const originalPlayerDoDodge = Player.prototype.doDodge;
Player.prototype.doDodge = function() {
    if (!this.canDodge || this.isDodging) return;
    
    originalPlayerDoDodge.call(this);
    
    // Play dodge sound
    audioSystem.play('dodge', 0.7);
};

// ADD THIS AT THE BOTTOM OF THE FILE

// Play shooting sound when player fires
Player.prototype.fireSound = function() {
    audioSystem.play('shoot', 0.3);
};

// Override Enemy.prototype.createBossDeathEffect to properly trigger the win screen
Enemy.prototype.createBossDeathEffect = function() {
    // Boss death creates many XP orbs
    for (let i = 0; i < 15; i++) { // Increased from 10 to 15
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100; // Increased from 80
        
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;
        
        const orbValue = Math.random() < 0.3 ? 40 : 20; // 30% chance for double value
        const orb = new XPOrb(x, y, orbValue);
        
        // Make boss XP orbs more attractive
        orb.color = Math.random() < 0.5 ? '#f1c40f' : '#e67e22';
        gameManager.game.addEntity(orb);
    }
    
    // Visual explosion
    gameManager.createExplosion(this.x, this.y, 120, '#c0392b'); // Bigger explosion (100 -> 120)
    
    // Add screen shake for boss defeat
    if (gameManager.addScreenShake) {
        gameManager.addScreenShake(10, 0.7);
    }
    
    // Heal player when defeating a boss (15% of max health)
    if (gameManager.game.player) {
        const healAmount = gameManager.game.player.maxHealth * 0.15;
        gameManager.game.player.heal(healAmount);
        gameManager.showFloatingText(`BOSS BONUS: +${Math.round(healAmount)} HP`, 
            gameManager.game.player.x, 
            gameManager.game.player.y - 70, 
            "#2ecc71", 
            22);
    }
    
    // Show message
    gameManager.showFloatingText("BOSS DEFEATED!", 
                               gameManager.game.player.x, 
                               gameManager.game.player.y - 50, 
                               "#f1c40f", 
                               30);
                               
    // Check if this was a mega boss
    if (this.isMegaBoss) {
        // Immediately flag game as complete
        if (gameManager) {
            gameManager.gameWon = true;
            
            // Show win screen after defeating the mega boss with increased delay for reliability
            setTimeout(() => {
                if (gameManager && !gameManager.winScreenDisplayed) {
                    gameManager.showWinScreen();
                }
            }, 1500);
        }
    }
};

// Remove the duplicate showWinScreen method at the bottom and use the proper one
GameManager.prototype.showWinScreen = function() {
    console.log("Showing win screen called!");

    // Prevent multiple win screens
    if (this.winScreenDisplayed) {
        console.log("Win screen already displayed, not showing again");
        return;
    }
    
    // Flag states immediately to prevent race conditions
    this.gameWon = true;
    this.gameOver = true;
    this.winScreenDisplayed = true;
    
    console.log("Win screen flags set, displaying screen now");
    
    // Pause the game immediately
    if (this.game) {
        this.game.isPaused = true;
    }
    
    // Create massive victory explosion effect at player position
    if (this.game.player) {
        this.createSpecialEffect('bossPhase', this.game.player.x, this.game.player.y, 150, '#f1c40f');
        this.addScreenShake(8, 1.0);
    }
    
    // Create win screen UI
    const winDiv = document.createElement('div');
    winDiv.id = 'win-screen';
    
    // Rest of the win screen creation code remains the same
    const totalSeconds = Math.floor(this.gameTime);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    
    // Calculate score based on various factors
    const timeScore = Math.floor(totalSeconds * 10);
    const killScore = this.killCount * 100;
    const levelScore = this.game.player.level * 500;
    const bossScore = (this.gameStats.bossesSpawned || 0) * 1000;
    const totalScore = timeScore + killScore + levelScore + bossScore;
    
    // Get player upgrades for display
    const upgrades = this.game.player.upgrades || [];
    let upgradeList = '';
    const upgradeCounts = {};
    
    upgrades.forEach(upgrade => {
        const name = upgrade.displayName || upgrade.name;
        if (!upgradeCounts[name]) {
            upgradeCounts[name] = 1;
        } else {
            upgradeCounts[name]++;
        }
    });
    
    // Create upgrade list HTML
    for (const [name, count] of Object.entries(upgradeCounts)) {
        upgradeList += `<li>${name}${count > 1 ? ` x${count}` : ''}</li>`;
    }
    
    // Set victory content with mega boss defeat message
    winDiv.innerHTML = `
        <h1>VICTORY!</h1>
        <h2>You've Defeated the Mega Boss!</h2>
        <p>Final Score: <span class="stats-highlight">${totalScore}</span></p>
        <p>Survived for: <span class="stats-highlight">${minutes}:${seconds}</span></p>
        <p>Level reached: <span class="stats-highlight">${this.game.player.level}</span></p>
        <p>Enemies defeated: <span class="stats-highlight">${this.killCount}</span></p>
        <p>Bosses conquered: <span class="stats-highlight">${this.gameStats.bossesSpawned || 0}</span></p>
        <p>Highest Combo: <span class="stats-highlight">${this.highestCombo}</span></p>
        <div class="upgrades-container">
            <h3>Your Build</h3>
            <ul class="upgrade-list">
                ${upgradeList}
            </ul>
        </div>
        <button id="play-again-button">Play Again</button>
        <p class="victory-message">Congratulations on your victory over the Mega Boss!</p>
    `;
    
    document.getElementById('game-container').appendChild(winDiv);
    console.log("Win screen DOM element added");
    
    // Add play again button functionality
    document.getElementById('play-again-button').addEventListener('click', () => {
        window.location.reload();
    });
    
    // Play victory sound
    if (audioSystem && audioSystem.play) {
        audioSystem.play('levelUp', 0.8); // Use level up sound as victory sound
    }
    
    // Ensure enemies stop spawning after victory
    if (this.enemySpawner) {
        this.enemySpawner.spawnRate = 0;
        this.enemySpawner.maxEnemies = 0;
    }
};
/**
 * 🌊 GAME MANAGER BRIDGE - Compatibility layer for script-based loading
 * This bridges the ES6 module-based refactored code with the script-tag based HTML
 * Provides a working game manager until the full module system is integrated
 */

class GameManagerBridge {
    constructor() {
        (window.logger?.log || console.log)('🌊 GameManager Bridge initializing...');
        
        // Core game systems
        this.game = null;
        this.enemySpawner = null;
        
        // Game state
        this.gameTime = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.winScreenDisplayed = false;
        this.endScreenShown = false;
        this.isPaused = false;
        this.running = false;
        
        // Game mode settings
        this.endlessMode = false;
        this.lowQuality = false;
        this.difficultyFactor = 1.0;
        this.metaStars = parseInt(localStorage.getItem('starTokens') || '0', 10);
        
        // Performance settings
        this.maxParticles = 150;
        this.particles = [];
        this.particlePool = [];
        this.particleReductionFactor = 1.0;

        // Reference to gameManager's effects manager (don't create duplicate!)
        this.effects = null; // Will be set to gameManager.effectsManager if available
        // UI manager (DOM HUD)
        this.uiManager = null;
        
        // Combat text system
        this.combatTexts = [];
        this.combatTextPool = [];
        
        // Statistics
        this.killCount = 0;
        this.xpCollected = 0;
        this.damageDealt = 0;
        this.combos = 0;
        this.highestCombo = 0;
        this.currentCombo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 3.0;
        
        // Screen shake
        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };

        // Minimap system
        this.minimapSystem = null;
        
        (window.logger?.log || console.log)('🌊 GameManager Bridge ready');
    }

    /**
     * Minimap: initialize canvas refs and context
     */
    initializeMinimap() {
        this.setupMinimap();
    }

    /**
     * Minimap: render periodically
     */
    renderMinimap() {
        if (!this.minimapSystem) {
            this.setupMinimap();
        }
        this.minimapSystem?.update();
    }

    // Prefer pooled particles with graceful fallback
    _spawnParticleViaPoolOrFallback(x, y, vx, vy, size, color, life, type = 'basic') {
        try {
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({ x, y, vx, vy, size, color, life, type });
                return true;
            }
            if (typeof this.tryAddParticle === 'function') {
                const particle = new Particle(x, y, vx, vy, size, color, life);
                return this.tryAddParticle(particle);
            }
        } catch (e) {
            (window.logger?.warn || console.warn)('Particle spawn failed in GameManagerBridge', e);
        }
        return false;
    }
    
    /**
     * Initialize the game systems
     */
    initGameEngine() {
        (window.logger?.log || console.log)('🎮 Initializing game engine...');
        
        try {
            // Create game engine
            this.game = new GameEngine();
        
            // Create enemy spawner
            if (typeof EnemySpawner !== 'undefined') {
                this.enemySpawner = new EnemySpawner(this.game);
                (window.logger?.log || console.log)('✅ Enemy spawner created');
            } else {
                (window.logger?.warn || console.warn)('⚠️ EnemySpawner not available');
            }
        
            // Create player
            if (typeof Player !== 'undefined') {
                this.game.player = new Player(400, 300);
                this.game.addEntity(this.game.player);
                (window.logger?.log || console.log)('✅ Player created and added');
            } else {
                (window.logger?.error || console.error)('❌ Player class not available');
                return false;
            }
        
            // Initialize minimap after core systems
            this.setupMinimap();

            // Initialize UI Manager for HUD (timer, bars, boss UI)
            if (typeof window.UIManager !== 'undefined') {
                this.uiManager = new window.UIManager(this);
                (window.logger?.log || console.log)('✅ UIManager initialized');
            }

            // Initialize Effects Manager for particles, screen shake, etc.
            if (typeof window.EffectsManager !== 'undefined') {
                this.effectsManager = new window.EffectsManager(this);
                (window.logger?.log || console.log)('✅ EffectsManager initialized');
            } else {
                (window.logger?.warn || console.warn)('⚠️ EffectsManager not available');
            }

            (window.logger?.log || console.log)('✅ Game engine initialized successfully');
            return true;
            
        } catch (error) {
            (window.logger?.error || console.error)('❌ Failed to initialize game engine:', error);
            return false;
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        (window.logger?.log || console.log)('🚀 Starting game...');
        
        // Initialize engine if not done
        if (!this.game) {
            (window.logger?.log || console.log)('🔧 Game engine not initialized, creating...');
            if (!this.initGameEngine()) {
                (window.logger?.error || console.error)('❌ Cannot start game - engine initialization failed');
                alert('Failed to initialize game engine. Please refresh the page.');
                return;
            }
        }
        
        // Reset game state
        this.resetGameState();
        
        // Start the game engine
        if (this.game && typeof this.game.start === 'function') {
            (window.logger?.log || console.log)('▶️ Starting game engine...');
            this.game.start();
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.isPaused = false;
            }
            this.running = true;
            (window.logger?.log || console.log)('✅ Game started successfully!');
            (window.logger?.log || console.log)('🎮 Player position:', this.game.player ? `${this.game.player.x}, ${this.game.player.y}` : 'No player');
            (window.logger?.log || console.log)('🎨 Canvas size:', this.game.canvas ? `${this.game.canvas.width}x${this.game.canvas.height}` : 'No canvas');
        } else {
            (window.logger?.error || console.error)('❌ Game engine start method not available');
            (window.logger?.log || console.log)('Available methods:', Object.getOwnPropertyNames(this.game || {}));
            alert('Game engine is not ready. Please refresh the page.');
        }
    }
    
    /**
     * Reset game state for new game
     */
    resetGameState() {
        this.gameTime = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.winScreenDisplayed = false;
        this.endScreenShown = false;
        this.isPaused = false;
        
        // Reset statistics
        this.killCount = 0;
        this.xpCollected = 0;
        this.damageDealt = 0;
        this.combos = 0;
        this.highestCombo = 0;
        this.currentCombo = 0;
        this.comboTimer = 0;
        
        // Clear effects
        this.particles = [];
        this.combatTexts = [];
        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };

        this.minimapSystem?.reset?.();

        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        if (this.enemySpawner && typeof this.enemySpawner.reset === 'function') {
            this.enemySpawner.reset();
        }

        (window.logger?.log || console.log)('🔄 Game state reset');
    }

    setupMinimap() {
        if (!this.game || typeof MinimapSystem === 'undefined') {
            return;
        }

        if (!this.minimapSystem) {
            this.minimapSystem = new MinimapSystem(this.game, {
                width: 150,
                height: 150,
                scale: 0.12,
                updateInterval: 100,
                containerId: 'minimap-container',
                canvasId: 'minimap'
            });
            this.minimapSystem.initialize();
        } else {
            this.minimapSystem.setGame(this.game);
            this.minimapSystem.initialize();
        }
    }
    
    /**
     * Increment kill count when enemy dies
     */
    incrementKills() {
        this.killCount++;
        (window.logger?.log || console.log)(`💀 Kill count: ${this.killCount}`);
        
        // Update combo system
    this.currentCombo++;
    // Use seconds consistently; reset timer on each kill
    this.comboTimer = 0;
        
        if (this.currentCombo > this.highestCombo) {
            this.highestCombo = this.currentCombo;
        }
        
        // Show combo text at higher combos using UnifiedUIManager
        if (this.currentCombo >= 5) {
            if (this.game.unifiedUI) {
                this.game.unifiedUI.addComboText(this.currentCombo, 
                    this.game.player.x, this.game.player.y - 50);
            } else {
                // Fallback to old system
                this.showCombatText(`${this.currentCombo}x COMBO!`, 
                    this.game.player.x, this.game.player.y - 50, 'combo', 18);
            }
        }
    }
    
    /**
     * Handle boss death
     */
    onBossKilled() {
        (window.logger?.log || console.log)('👑 Boss killed!');
        
        // Add screen shake for dramatic effect (duration in seconds for bridge)
        this.addScreenShake(20, 1.0);
        
        // Show boss kill text
        if (this.game && this.game.player) {
            this.showCombatText('BOSS DEFEATED!', 
                this.game.canvas.width / 2, this.game.canvas.height / 2, 'critical', 32);
        }
        
        // Play victory sound if available
        if (window.audioSystem && window.audioSystem.play) {
            window.audioSystem.play('bossKilled', 0.6);
        }

        // Update boss HUD tracking
        if (this.uiManager && typeof this.uiManager.removeBoss === 'function') {
            try { this.uiManager.removeBoss(this._lastBossId || null); } catch (_) {}
        }

        if (!this.endlessMode && !this.gameWon) {
            this.onGameWon();
        }
    }
    
    /**
     * Main update loop - called by GameEngine
     */
    update(deltaTime) {
        if (!this.running || this.gameOver || this.isPaused) {
            return;
        }

        // Update game time
        this.gameTime += deltaTime;

        // Update timer display
        this.updateTimerDisplay();

        // Update boss countdown
        this.updateBossCountdown();

        // Update HUD periodically
        if (this.uiManager && typeof this.uiManager.update === 'function') {
            this.uiManager.update(deltaTime);
        }

        // Update effects manager (particles, screen shake, floating text)
        if (this.effectsManager && typeof this.effectsManager.update === 'function') {
            try {
                this.effectsManager.update(deltaTime);
            } catch (error) {
                (window.logger?.error || console.error)('ERROR in effectsManager.update():', error);
                // Disable effectsManager to prevent continuous errors
                this.effectsManager = null;
            }
        } else {
            // Fallback to local systems if effectsManager not available
            this.updateCombatTexts(deltaTime);
            this.updateParticles(deltaTime);
            this.updateScreenShake(deltaTime);
        }

        // Update enemy spawner
        if (this.enemySpawner) {
            this.enemySpawner.update(deltaTime);
        }

        // Update combo system
        this.updateComboSystem(deltaTime);

        // Check win/lose conditions
        this.checkGameConditions();
    }
    
    /**
     * Check game win/lose conditions
     */
    checkGameConditions() {
        if (!this.game || !this.game.player) return;
        
        // Check lose condition
        if (this.game.player.isDead && !this.gameOver) {
            this.onGameOver();
        }
        
    }
    
    /**
     * Handle game over
     */
    onGameOver() {
        (window.logger?.log || console.log)('💀 Game Over');
        this.gameOver = true;
        this.running = false;
        
        // Create death effect
        if (this.game.player) {
            this.createExplosion(this.game.player.x, this.game.player.y, 100, '#e74c3c');
            this.addScreenShake(15, 1.5);
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
        (window.logger?.log || console.log)('🏆 Victory!');
        this.gameWon = true;
        this.running = false;

        // Award bonus stars
        this.earnStarTokens(10);

        // Create victory effect
        if (this.game.player) {
            this.createLevelUpEffect(this.game.player.x, this.game.player.y);
            this.showFloatingText('VICTORY!', this.game.player.x, this.game.player.y - 50, '#f1c40f', 36);
        }

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
    }

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
        return [
            { label: 'Enemies Defeated', value: this.killCount },
            { label: 'Highest Combo', value: `${this.highestCombo || 0}x` },
            { label: 'Survival Time', value: this.formatTime(this.gameTime) },
            { label: 'Star Tokens', value: this.metaStars }
        ];
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

        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        this.running = false;
        this.gameOver = true;
        this.gameWon = false;
        this.endScreenShown = false;

        if (this.game) {
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            }
            if (typeof this.game.prepareNewRun === 'function') {
                this.game.prepareNewRun();
            }
            this.game.isPaused = true;
        }

        this.updateStarDisplay();

        const bossCountdown = document.getElementById('boss-countdown');
        if (bossCountdown) bossCountdown.classList.add('hidden');
    }

    resumeRun() {
        if (window.resultScreen && typeof window.resultScreen.hide === 'function') {
            window.resultScreen.hide();
        }

        this.endScreenShown = false;
        this.gameWon = false;
        this.gameOver = false;
        this.running = true;

        if (this.game) {
            if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.isPaused = false;
            }
        }

        this.updateStarDisplay();
    }
    
    /**
     * Combat Text System
     */
    updateCombatTexts(deltaTime) {
        for (let i = this.combatTexts.length - 1; i >= 0; i--) {
            const text = this.combatTexts[i];
            text.age += deltaTime;
            text.y -= 30 * deltaTime; // Float upward
            text.opacity = Math.max(0, 1 - (text.age / text.lifetime));
            
            if (text.age >= text.lifetime) {
                this.combatTextPool.push(text);
                this.combatTexts.splice(i, 1);
            }
        }
    }
    
    showFloatingText(text, x, y, color = '#ffffff', size = 16) {
        // Prefer unified UI when available for consistent world-space text rendering
        if (this.game && this.game.unifiedUI && typeof this.game.unifiedUI.addFloatingText === 'function') {
            this.game.unifiedUI.addFloatingText(text, x, y, { color, size });
            return;
        }
        
        // Fallback to internal combat text pool
        let textObj = this.combatTextPool.pop();
        if (!textObj) {
            textObj = {
                text: '',
                x: 0,
                y: 0,
                color: '#ffffff',
                size: 16,
                age: 0,
                lifetime: 2.0,
                opacity: 1.0
            };
        }
        
        textObj.text = text;
        textObj.x = x;
        textObj.y = y;
        textObj.color = color;
        textObj.size = size;
        textObj.age = 0;
        textObj.opacity = 1.0;
        textObj.lifetime = 2.0;
        
        this.combatTexts.push(textObj);
    }
    
    showCombatText(text, x, y, type, size = 16) {
        const colors = {
            'damage': '#e74c3c',
            'critical': '#f1c40f',
            'heal': '#2ecc71',
            'xp': '#9b59b6',
            'combo': '#3498db'
        };
        
        this.showFloatingText(text, x, y, colors[type] || '#ffffff', size);
    }
    
    // Alias for backward compatibility
    addCombatText(text, x, y, color, size) {
        this.showFloatingText(text, x, y, color, size);
    }
    
    /**
     * Render combat texts
     */
    _renderTexts(ctx) {
        for (const text of this.combatTexts) {
            ctx.save();
            ctx.globalAlpha = text.opacity;
            ctx.fillStyle = text.color;
            ctx.font = `bold ${text.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            // Outline for better visibility
            ctx.strokeText(text.text, text.x, text.y);
            ctx.fillText(text.text, text.x, text.y);
            
            ctx.restore();
        }
    }
    
    /**
     * Particle System
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (!particle) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update particle
            if (typeof particle.update === 'function') {
                particle.update(deltaTime);
            } else {
                // Basic particle update
                particle.x += (particle.vx || 0) * deltaTime;
                particle.y += (particle.vy || 0) * deltaTime;
                particle.age = (particle.age || 0) + deltaTime;
                
                if (particle.lifetime && particle.age >= particle.lifetime) {
                    particle.isDead = true;
                }
            }
            
            // Remove dead particles
            if (particle.isDead || (particle.age && particle.lifetime && particle.age >= particle.lifetime)) {
                this.particlePool.push(particle);
                this.particles.splice(i, 1);
            }
        }
        
        // Enforce particle limit
        if (this.particles.length > this.maxParticles) {
            const excess = this.particles.length - this.maxParticles;
            for (let i = 0; i < excess; i++) {
                const particle = this.particles.shift();
                if (particle) this.particlePool.push(particle);
            }
        }
    }
    
    tryAddParticle(particle) {
        if (!particle || this.lowQuality) return false;
        
        if (this.particles.length >= this.maxParticles) {
            return false;
        }
        
        this.particles.push(particle);
        return true;
    }
    
    renderParticles(ctx) {
        for (const particle of this.particles) {
            if (particle && typeof particle.render === 'function') {
                particle.render(ctx);
            }
        }
    }
    
    /**
     * Screen Shake System
     */
    updateScreenShake(deltaTime) {
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime;
            
            if (this.screenShake.duration <= 0) {
                this.screenShake.x = 0;
                this.screenShake.y = 0;
                this.screenShake.intensity = 0;
            } else {
                const intensity = this.screenShake.intensity * (this.screenShake.duration / this.screenShake.maxDuration);
                this.screenShake.x = (Math.random() - 0.5) * intensity;
                this.screenShake.y = (Math.random() - 0.5) * intensity;
            }
        }
    }
    
    addScreenShake(intensity, duration) {
        if (this.lowQuality) return;

        // Delegate to effectsManager if available for unified screen shake
        const effectsManager = window.gameManager?.effectsManager || this.effects;
        if (effectsManager && typeof effectsManager.addScreenShake === 'function') {
            effectsManager.addScreenShake(intensity, duration);
            return;
        }

        // Fallback to local screen shake
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.maxDuration = duration;
    }
    
    /**
     * Combo System
     */
    updateComboSystem(deltaTime) {
        if (this.currentCombo > 0) {
            this.comboTimer += deltaTime;
            
            if (this.comboTimer >= this.comboTimeout) {
                this.currentCombo = 0;
                this.comboTimer = 0;
            }
        }
    }
    
    incrementCombo() {
        this.currentCombo++;
        this.comboTimer = 0;
        
        if (this.currentCombo > this.highestCombo) {
            this.highestCombo = this.currentCombo;
        }
        
        // Update combo display
        const comboText = document.getElementById('combo-text');
        if (comboText) {
            comboText.textContent = this.currentCombo;
        }
        
        return this.currentCombo;
    }
    
    /**
     * Event handlers
     */
    onEnemyDied(enemy) {
        this.incrementKills();
        
        // Create death effect
        this.createHitEffect(enemy.x, enemy.y, enemy.maxHealth || 50);
        
        // Show kill combo
        if (this.currentCombo > 1) {
            this.showCombatText(`${this.currentCombo}x COMBO!`, enemy.x, enemy.y - 40, 'combo', 18);
        }
        
        // Milestone messages
        if (this.killCount % 25 === 0) {
            if (this.game && this.game.player) {
                this.showCombatText(`${this.killCount} KILLS!`, this.game.player.x, this.game.player.y - 50, 'critical', 24);
            }
        }
    }
    
    onPlayerLevelUp(level) {
        (window.logger?.log || console.log)('🆙 Player leveled up to', level);
        
        if (this.game && this.game.player) {
            this.createLevelUpEffect(this.game.player.x, this.game.player.y);
            this.addScreenShake(3, 0.5);
        }
    }
    
    onXpCollected(amount) {
        this.xpCollected += amount;
    }
    
    /**
     * Effect creation methods
     */
    createHitEffect(x, y, damage = 50) {
        if (this.lowQuality) return;
        // Use gameManager's effectsManager for proper rendering
        const effectsManager = window.gameManager?.effectsManager || this.effects;
        if (effectsManager && typeof effectsManager.createHitEffect === 'function') {
            effectsManager.createHitEffect(x, y, damage);
            return;
        }
        if (window.ParticleHelpers && window.ParticleHelpers.createHitEffect) {
            window.ParticleHelpers.createHitEffect(x, y, damage);
            return;
        }
        const particleCount = Math.min(8, Math.floor(damage / 10));
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 3,
                    color: '#e74c3c',
                    life: 0.3 + Math.random() * 0.3,
                    type: 'spark'
                });
            } else {
                const particle = new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    2 + Math.random() * 3,
                    '#e74c3c',
                    0.3 + Math.random() * 0.3
                );
                this.tryAddParticle(particle);
            }
        }
    }
    
    createExplosion(x, y, radius, color) {
        if (this.lowQuality) return;
        // Use gameManager's effectsManager for proper rendering
        const effectsManager = window.gameManager?.effectsManager || this.effects;
        if (effectsManager && typeof effectsManager.createExplosion === 'function') {
            effectsManager.createExplosion(x, y, radius, color);
            return;
        }
        if (window.ParticleHelpers && window.ParticleHelpers.createExplosion) {
            window.ParticleHelpers.createExplosion(x, y, radius, color);
            this.addScreenShake(radius / 10, 0.5);
            return;
        }
        const particleCount = Math.min(20, radius / 5);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 5,
                    color,
                    life: 0.5 + Math.random() * 0.5,
                    type: 'spark'
                });
            } else {
                const particle = new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    3 + Math.random() * 5,
                    color,
                    0.5 + Math.random() * 0.5
                );
                this.tryAddParticle(particle);
            }
        }
        this.addScreenShake(radius / 10, 0.5);
    }
    
    createLevelUpEffect(x, y) {
        if (this.lowQuality) return;
        // Use gameManager's effectsManager for proper rendering
        const effectsManager = window.gameManager?.effectsManager || this.effects;
        if (effectsManager && typeof effectsManager.createLevelUpEffect === 'function') {
            effectsManager.createLevelUpEffect(x, y);
            return;
        }
        if (window.ParticleHelpers && window.ParticleHelpers.createLevelUpEffect) {
            window.ParticleHelpers.createLevelUpEffect(x, y);
            return;
        }
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const speed = 80 + Math.random() * 40;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: '#f1c40f',
                    life: 0.8 + Math.random() * 0.4,
                    type: 'spark'
                });
            } else {
                const particle = new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    3 + Math.random() * 3,
                    '#f1c40f',
                    0.8 + Math.random() * 0.4
                );
                this.tryAddParticle(particle);
            }
        }
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
        if (!this.enemySpawner) {
            return;
        }

        const bossCountdownElement = document.getElementById('boss-countdown');

        if (bossCountdownElement) {
            if (typeof this.enemySpawner.isBossAlive === 'function' && this.enemySpawner.isBossAlive()) {
                bossCountdownElement.classList.remove('hidden');
                bossCountdownElement.style.color = '#f1c40f';
                bossCountdownElement.style.animation = 'pulse 1.5s infinite';
                bossCountdownElement.textContent = 'Boss active!';
                return;
            }

            const timeUntilBoss = this.enemySpawner.bossInterval - this.enemySpawner.bossTimer;

            // Debug once per second
            const currentSecond = Math.floor(this.gameTime);
            if (currentSecond !== this._lastBossDebugSecond) {
                this._lastBossDebugSecond = currentSecond;
            if (window.debugManager?.enabled) {
                console.log(`[Boss Countdown] Timer: ${this.enemySpawner.bossTimer.toFixed(1)}s, Interval: ${this.enemySpawner.bossInterval}s, Time until: ${timeUntilBoss.toFixed(1)}s`);
            }
            }

            // Show different messages based on time until boss
            if (timeUntilBoss > 0) {
                bossCountdownElement.classList.remove('hidden');

                if (timeUntilBoss <= 10) {
                    // Urgent countdown - red pulsing
                    bossCountdownElement.style.color = '#e74c3c';
                    bossCountdownElement.style.animation = 'pulse 1s infinite';
                    bossCountdownElement.textContent = `Boss in: ${Math.ceil(timeUntilBoss)}s`;
                } else if (timeUntilBoss <= 30) {
                    // Warning - orange, no animation
                    bossCountdownElement.style.color = '#f39c12';
                    bossCountdownElement.style.animation = 'none';
                    bossCountdownElement.textContent = `Boss approaching: ${Math.ceil(timeUntilBoss)}s`;
                } else {
                    // Info - white, no animation
                    bossCountdownElement.style.color = '#ecf0f1';
                    bossCountdownElement.style.animation = 'none';
                    const minutes = Math.floor(timeUntilBoss / 60);
                    const seconds = Math.floor(timeUntilBoss % 60);
                    if (minutes > 0) {
                        bossCountdownElement.textContent = `Next boss: ${minutes}m ${seconds}s`;
                    } else {
                        bossCountdownElement.textContent = `Next boss: ${seconds}s`;
                    }
                }
            } else {
                bossCountdownElement.classList.add('hidden');
            }
        } else {
            console.log('[GameManagerBridge] Boss countdown element not found');
        }
    }

    /**
     * Star token management
     */
    earnStarTokens(amount) {
        this.metaStars += amount;
        this.saveStarTokens();
        this.updateStarDisplay();
    }
    
    saveStarTokens() {
        localStorage.setItem('starTokens', this.metaStars.toString());
    }
    
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
     * Handle when a meta upgrade is maxed out
     */
    onUpgradeMaxed(upgradeId) {
        (window.logger?.log || console.log)('Meta upgrade maxed:', upgradeId);
        // Could trigger achievements or other effects here
    }
    
    /**
     * Check if any menus are active (for input handling)
     */
    isMenuActive() {
        const levelUpContainer = document.getElementById('level-up-container');
        return levelUpContainer && !levelUpContainer.classList.contains('hidden');
    }
    
    onPlayerDamaged() {
        // Handle player taking damage (for achievements)
        (window.logger?.log || console.log)('Player took damage');
    }
    
    addXpCollected(amount) {
        this.xpCollected += amount;
    }
    
    onDodge(wasPerfect) {
        if (wasPerfect) {
            this.showFloatingText('PERFECT DODGE!', this.game.player.x, this.game.player.y - 30, '#3498db', 18);
        }
    }
    
    onChainLightningHit(chainCount) {
        if (chainCount >= 3) {
            this.showFloatingText(`${chainCount} CHAIN!`, this.game.player.x, this.game.player.y - 40, '#74b9ff', 16);
        }
    }
    
    onRicochetHit(bounceCount) {
        if (bounceCount >= 2) {
            this.showFloatingText(`${bounceCount} BOUNCES!`, this.game.player.x, this.game.player.y - 40, '#f39c12', 16);
        }
    }
    
    onOrbitalCountChanged(count) {
        // Handle orbital projectile count changes
    }
    
    createSpecialEffect(type, x, y, size, color) {
        switch (type) {
            case 'lightning':
                this.createLightningEffect(x, y, size);
                break;
            case 'circle':
                this.createCircleEffect(x, y, size, color);
                break;
            case 'bossPhase':
                this.createExplosion(x, y, size, color);
                break;
            case 'random':
                this.createRandomEffect(x, y, size, color);
                break;
            case 'ricochet':
                this.createRicochetEffect(x, y, size, color);
                break;
        }
    }
    
    createLightningEffect(x, y, range) {
        // Simple lightning effect
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * range;
            this._spawnParticleViaPoolOrFallback(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                0,
                0,
                3,
                '#74b9ff',
                0.3,
                'spark'
            );
        }
    }
    
    createCircleEffect(x, y, size, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this._spawnParticleViaPoolOrFallback(
                x + Math.cos(angle) * size,
                y + Math.sin(angle) * size,
                0,
                0,
                2,
                color,
                0.5,
                'basic'
            );
        }
    }
    
    createRandomEffect(x, y, size, color) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this._spawnParticleViaPoolOrFallback(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 3,
                color,
                0.4 + Math.random() * 0.4,
                'spark'
            );
        }
    }
    
    createRicochetEffect(x, y, range, color) {
        // Create arc effect
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 0.5;
            const distance = range * 0.5;
            this._spawnParticleViaPoolOrFallback(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                0,
                0,
                2,
                color,
                0.4,
                'basic'
            );
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.GameManagerBridge = GameManagerBridge;
}

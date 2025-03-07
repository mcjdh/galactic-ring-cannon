class GameManager {
    constructor() {
        // Initialize game systems
        this.game = new GameEngine();
        this.enemySpawner = new EnemySpawner(this.game);
        this.gameTime = 0;
        this.gameOver = false;
        
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
        
        // Add mini-tutorial text that fades away after a few seconds
        const tutorialTip = document.createElement('div');
        tutorialTip.className = 'overlay-message tutorial-tip';
        tutorialTip.innerHTML = 'Use WASD or Arrow Keys to move<br><span class="tutorial-subtip">Defeat enemies to gain XP and level up</span>';
        document.getElementById('game-container').appendChild(tutorialTip);
        
        // Hide tutorial after 5 seconds
        setTimeout(() => {
            tutorialTip.style.opacity = '0';
            setTimeout(() => tutorialTip.remove(), 1000);
        }, 5000);
        
        // Add enemy counter display
        const enemyCounter = document.createElement('div');
        enemyCounter.id = 'enemy-counter';
        enemyCounter.textContent = 'Enemies: 0';
        document.getElementById('game-container').appendChild(enemyCounter);
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
    }
    
    startGame() {
        // Create player at center of screen
        this.game.addEntity(new Player(0, 0));
        
        // Update UI elements with initial values
        document.getElementById('level-display').textContent = `Level: ${this.game.player.level}`;
        
        // Start the game loop
        this.game.start();
    }
    
    update(deltaTime) {
        // Only update if game is not over
        if (this.gameOver) return;
        
        this.gameTime += deltaTime;
        
        // Update enemy spawner
        this.enemySpawner.update(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
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
        
        // Update minimap
        this.updateMinimap();
        
        // Update enemy counter
        const enemyCount = this.game.enemies ? this.game.enemies.length : 0;
        document.getElementById('enemy-counter').textContent = `Enemies: ${enemyCount}`;
        
        // Check for nearby enemies for minimap alert
        const minimapContainer = document.getElementById('minimap-container');
        if (minimapContainer && this.game.player) {
            let nearbyEnemyCount = 0;
            const alertDistance = 300;
            
            this.game.enemies.forEach(enemy => {
                const dx = enemy.x - this.game.player.x;
                const dy = enemy.y - this.game.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < alertDistance) {
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
        
        gameOverDiv.innerHTML = `
            <h1>Game Over</h1>
            <p>Difficulty reached: <span class="stats-highlight">${difficultyLabel}</span></p>
            <p>You survived for <span class="stats-highlight">${minutes}:${seconds}</span></p>
            <p>Kills: <span class="stats-highlight">${this.killCount}</span></p>
            <p>Level reached: <span class="stats-highlight">${this.game.player.level}</span></p>
            <p>XP collected: <span class="stats-highlight">${this.xpCollected}</span></p>
            <button id="restart-button">Play Again</button>
        `;
        
        document.getElementById('game-container').appendChild(gameOverDiv);
        
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
        return this.killCount;
    }
    
    // Track XP collected
    addXpCollected(amount) {
        this.xpCollected += amount;
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
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            
            if (this.particles[i].isDead) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    renderParticles(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    createExplosion(x, y, radius, color) {
        // Create particle explosion effect
        const particleCount = Math.floor(radius * 0.8);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const size = 2 + Math.random() * 6;
            const lifetime = 0.5 + Math.random() * 0.5;
            
            const particle = new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                color,
                lifetime
            );
            
            this.particles.push(particle);
        }
        
        // Add shockwave effect
        const shockwave = new ShockwaveParticle(x, y, radius * 1.5, color, 0.5);
        this.particles.push(shockwave);
    }
    
    // Create blood particles when an enemy is hit
    createHitEffect(x, y, amount) {
        const particleCount = Math.min(10, Math.floor(amount / 5));
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 70;
            const size = 1 + Math.random() * 3;
            const lifetime = 0.3 + Math.random() * 0.3;
            
            const particle = new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#e74c3c',
                lifetime
            );
            
            this.particles.push(particle);
        }
    }
    
    // Create level up effect
    createLevelUpEffect(x, y) {
        // Spiral particles
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const size = 2 + Math.random() * 4;
            const lifetime = 1 + Math.random() * 0.5;
            
            const particle = new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#f39c12',
                lifetime
            );
            
            this.particles.push(particle);
        }
        
        // Shockwave effect
        const shockwave = new ShockwaveParticle(x, y, 100, '#f39c12', 0.7);
        this.particles.push(shockwave);
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
        this.minimap.width = 150;
        this.minimap.height = 150;
        this.minimapScale = 0.1; // 1/10th scale of the game world
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
        
        // Clear minimap
        this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.minimapCtx.fillRect(0, 0, this.minimap.width, this.minimap.height);
        
        // Center position on player
        const centerX = this.minimap.width / 2;
        const centerY = this.minimap.height / 2;
        
        // Draw player on minimap
        this.minimapCtx.fillStyle = '#3498db';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        this.minimapCtx.fill();
        
        // Draw enemies on minimap
        this.game.enemies.forEach(enemy => {
            // Calculate relative position
            const relX = (enemy.x - this.game.player.x) * this.minimapScale + centerX;
            const relY = (enemy.y - this.game.player.y) * this.minimapScale + centerY;
            
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
                
                const dotSize = enemy.isBoss ? 4 : 2;
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(relX, relY, dotSize, 0, Math.PI * 2);
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
                this.minimapCtx.arc(relX, relY, 1, 0, Math.PI * 2);
                this.minimapCtx.fill();
            }
        });
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

// Create global game manager instance
const gameManager = new GameManager();

// Add update function to game loop
const originalUpdate = gameManager.game.update;
gameManager.game.update = function(deltaTime) {
    originalUpdate.call(gameManager.game, deltaTime);
    gameManager.update(deltaTime);
};

// Start the game when page loads
window.addEventListener('load', () => {
    gameManager.startGame();
});

// Override enemy die method to track kills and show floating text
Enemy.prototype.die = function() {
    this.isDead = true;
    
    // Create XP orb and increment kill count
    const orb = new XPOrb(this.x, this.y, this.xpValue);
    gameManager.game.addEntity(orb);
    const kills = gameManager.incrementKills();
    
    // Show floating kill text
    gameManager.showFloatingText(`+1`, this.x, this.y - 30, '#e74c3c', 16);
    
    // Show milestone messages
    if (kills % 50 === 0) {
        gameManager.showFloatingText(`${kills} KILLS!`, gameManager.game.player.x, 
                                    gameManager.game.player.y - 50, '#f39c12', 24);
    }
    
    // Play appropriate death sound
    if (this.isBoss) {
        audioSystem.play('boss', 0.8);
    } else {
        audioSystem.play('enemyDeath', 0.3);
    }
};

// Override player addXP method to track XP collected and show floating text
Player.prototype.addXP = function(amount) {
    this.xp += amount;
    gameManager.addXpCollected(amount);
    
    // Show floating XP text
    gameManager.showFloatingText(`+${amount} XP`, this.x, this.y - 40, '#2ecc71', 14);
    
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
        gameManager.showFloatingText(`DODGE!`, this.x, this.y - 20, '#3498db', 18);
        return;
    }
    
    this.health = Math.max(0, this.health - amount);
    
    // Show damage text
    gameManager.showFloatingText(`-${Math.round(amount)}`, this.x, this.y - 20, '#e74c3c', 18);
    
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

// Override the original update and render methods of GameEngine
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
    
    // Render particles below entities
    if (gameManager && gameManager.particles) {
        gameManager.renderParticles(this.ctx);
    }
    
    // Render all entities
    // Sort entities by y position for proper layering
    [...this.entities].sort((a, b) => a.y - b.y).forEach(entity => {
        entity.render(this.ctx);
    });
    
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
        gameManager.showFloatingText(`DODGE!`, this.x, this.y - 20, '#3498db', 18);
        return;
    }
    
    this.health = Math.max(0, this.health - amount);
    
    // Show damage text
    gameManager.showFloatingText(`-${Math.round(amount)}`, this.x, this.y - 20, '#e74c3c', 18);
    
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

// Override player fireProjectile to add sound
const originalPlayerFireProjectile = Player.prototype.fireProjectile;
Player.prototype.fireProjectile = function(game, angle) {
    originalPlayerFireProjectile.call(this, game, angle);
    
    // Play shooting sound
    audioSystem.play('shoot', 0.3);
};

// Override player attack method to include AOE sound
const originalPlayerAttack = Player.prototype.attack;
Player.prototype.attack = function(game) {
    // Call the original method
    originalPlayerAttack.call(this, game);
    
    // Add sound effect for basic attack types
    if (this.attackType === 'basic' || this.attackType === 'spread') {
        audioSystem.play('shoot', 0.3);
    }
};

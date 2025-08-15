// 🤖 RESONANT NOTE: This DebugManager is being simplified since Logger.js handles logging
// Keeping only essential debug/cheat functionality, removing redundant logging features

/**
 * Simplified Debug Manager - Essential cheats and overlay only
 * @class DebugManager
 */
class DebugManager {
    constructor() {
        this.enabled = false;
        this.overlay = null;
        this.stats = {
            entities: 0,
            particles: 0,
            fps: 0,
            memory: 0
        };
        
        this.cheats = {
            godMode: false,
            unlimitedXP: false,
            killAllEnemies: false,
            spawnBoss: false,
            maxLevel: false
        };
        
        this.init();
    }
    
    init() {
        // Check if debug mode should be enabled
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug') === 'true' || 
                         localStorage.getItem('debugMode') === 'true';
        
        if (debugMode) {
            this.enable();
        }
        
        // Add hotkeys
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleKeyDown(e) {
        if (!this.enabled) return;
        
        // Debug hotkeys (Ctrl + key)
        if (e.ctrlKey) {
            switch (e.key) {
                case 'd':
                    e.preventDefault();
                    this.toggle();
                    break;
                case 'g':
                    e.preventDefault();
                    this.toggleGodMode();
                    break;
                case 'x':
                    e.preventDefault();
                    this.giveXP(1000);
                    break;
                case 'k':
                    e.preventDefault();
                    this.killAllEnemies();
                    break;
                case 'b':
                    e.preventDefault();
                    this.spawnBoss();
                    break;
                case 'l':
                    e.preventDefault();
                    this.levelUp();
                    break;
                case 's':
                    e.preventDefault();
                    this.giveStars(100);
                    break;
            }
        }
    }
    
    enable() {
        this.enabled = true;
        localStorage.setItem('debugMode', 'true');
        this.createOverlay();
    }
    
    disable() {
        this.enabled = false;
        localStorage.setItem('debugMode', 'false');
        this.removeOverlay();
    }
    
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    // Add cleanup method to prevent memory leaks
    cleanup() {
        this.disable();
        this.removeOverlay();
        if (this.overlayInterval) {
            clearInterval(this.overlayInterval);
            this.overlayInterval = null;
        }
    }
    
    createOverlay() {
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'debug-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 15px;
            border: 1px solid #00ff00;
            border-radius: 5px;
            z-index: 10001;
            max-width: 300px;
            white-space: pre-line;
        `;
        
        document.body.appendChild(this.overlay);
        this.updateOverlay();
        
        // Update overlay every 100ms
        this.overlayInterval = setInterval(() => {
            this.updateOverlay();
        }, 100);
    }
    
    removeOverlay() {
        if (this.overlay) {
            // Safety check to ensure element is still in DOM
            if (this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.overlay = null;
        }
        
        if (this.overlayInterval) {
            clearInterval(this.overlayInterval);
            this.overlayInterval = null;
        }
    }
    
    updateOverlay() {
        if (!this.overlay) return;
        
        // Get current game stats
        const gameManager = window.gameManager;
        const game = gameManager?.game;
        const player = game?.player;
        
        this.stats.entities = (game?.enemies?.length || 0) + 
                              (game?.projectiles?.length || 0) + 
                              (game?.xpOrbs?.length || 0);
        this.stats.particles = gameManager?.particles?.length || 0;
        this.stats.fps = window.performanceManager?.fps || 0;
        this.stats.memory = window.performanceManager?.memoryUsage || 0;
        
        const content = `DEBUG MODE
FPS: ${this.stats.fps}
Memory: ${this.stats.memory.toFixed(1)} MB
Entities: ${this.stats.entities}
Particles: ${this.stats.particles}
${player ? `
Player:
  Level: ${player.level || 1}
  Health: ${Math.floor(player.health || 0)}/${Math.floor(player.maxHealth || 100)}
  XP: ${Math.floor(player.experience || 0)}/${Math.floor(player.experienceToNext || 100)}
  Position: (${Math.floor(player.x || 0)}, ${Math.floor(player.y || 0)})
` : ''}
${gameManager ? `
Game:
  Time: ${Math.floor(gameManager.gameTime || 0)}s
  Kills: ${gameManager.killCount || 0}
  Difficulty: x${(gameManager.difficultyFactor || 1).toFixed(1)}
  Combo: ${gameManager.comboCount || 0}x
` : ''}
Cheats:
  God Mode: ${this.cheats.godMode ? 'ON' : 'OFF'}
  
Commands:
  Ctrl+D: Toggle overlay
  Ctrl+G: God mode
  Ctrl+X: Give XP
  Ctrl+K: Kill enemies
  Ctrl+B: Spawn boss
  Ctrl+L: Level up
  Ctrl+S: Give stars`;
        
        this.overlay.textContent = content;
    }
    
    // Cheat functions
    toggleGodMode() {
        this.cheats.godMode = !this.cheats.godMode;
        const player = window.gameManager?.game?.player;
        if (player) {
            if (this.cheats.godMode) {
                player.originalTakeDamage = player.takeDamage;
                player.takeDamage = () => {}; // No damage
                player.health = player.maxHealth;
            } else {
                player.takeDamage = player.originalTakeDamage;
            }
        }
    }
    
    giveXP(amount) {
        const player = window.gameManager?.game?.player;
        if (player && typeof player.addExperience === 'function') {
            player.addExperience(amount);
            (window.logger?.log || (() => {}))(`✨ Gave ${amount} XP to player`);
        } else {
            (window.logger?.warn || (() => {}))('⚠️ Player not found or addExperience method not available');
        }
    }
    
    giveStars(amount) {
        const gameManager = window.gameManager;
        if (gameManager && typeof gameManager.earnStarTokens === 'function') {
            gameManager.earnStarTokens(amount);
            (window.logger?.log || (() => {}))(`⭐ Gave ${amount} star tokens`);
        } else {
            (window.logger?.warn || (() => {}))('⚠️ GameManager not found or earnStarTokens method not available');
        }
    }
    
    killAllEnemies() {
        const enemies = window.gameManager?.game?.enemies;
        if (enemies && Array.isArray(enemies)) {
            let killed = 0;
            enemies.forEach(enemy => {
                if (enemy && !enemy.isDead && typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(enemy.health + 1000);
                    killed++;
                }
            });
            (window.logger?.log || (() => {}))(`🗡️ Killed ${killed} enemies`);
        } else {
            (window.logger?.warn || (() => {}))('⚠️ No enemies found or enemies array not available');
        }
    }
    
    spawnBoss() {
        const gameManager = window.gameManager;
        if (gameManager && gameManager.activateBossMode) {
            gameManager.activateBossMode();
        }
    }
    
    levelUp() {
        const player = window.gameManager?.game?.player;
        if (player) {
            const xpNeeded = player.experienceToNext - player.experience;
            player.addExperience(xpNeeded);
        }
    }
    
    // Static initialization
    static init() {
        if (!window.debugManager) {
            window.debugManager = new DebugManager();
        }
        return window.debugManager;
    }
}

// Auto-initialize
const debugManager = new DebugManager();

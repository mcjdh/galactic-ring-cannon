/**
 * Main Game Entry Point - ES6 Module Version
 * Galactic Ring: Cannon
 */

// Import utilities
import { MathUtils } from './utils/MathUtils.mjs';
import { CollisionUtils } from './utils/CollisionUtils.mjs';
import { debugManager } from './utils/debug.mjs';

// Import systems (will be converted)
// import { AudioSystem } from './systems/AudioSystem.mjs';
// import { PerformanceManager } from './systems/PerformanceManager.mjs';
// import { UpgradeSystem } from './systems/UpgradeSystem.mjs';
// import { AchievementSystem } from './systems/AchievementSystem.mjs';

// Import entities (will be converted)
// import { Particle } from './entities/Particle.mjs';
// import { Projectile } from './entities/Projectile.mjs';
// import { DamageZone } from './entities/DamageZone.mjs';
// import { Enemy } from './entities/Enemy.mjs';
// import { Player } from './entities/Player.mjs';

// Import core (will be converted)
// import { GameEngine } from './core/GameEngine.mjs';
// import { GameManager } from './core/GameManager.mjs';

// Import UI (will be converted)
// import { UIEnhancements } from './ui/UIEnhancements.mjs';

// Game configuration
import gameConfig from '../config/gameConfig.js';

/**
 * Initialize the game
 */
export function initializeGame() {
    console.log('🚀 Galactic Ring: Cannon - ES6 Module Version');
    console.log('📊 Game Configuration:', gameConfig);
    
    // Make utilities available globally for backward compatibility
    window.MathUtils = MathUtils;
    window.CollisionUtils = CollisionUtils;
    window.debugManager = debugManager;
    
    // Initialize debug manager
    if (debugManager) {
        console.log('🛠️ Debug utilities loaded');
    }
    
    // For now, load the existing game files as fallback
    // This will be replaced as we convert each module
    loadFallbackScripts();
}

/**
 * Load existing script files as fallback during transition
 */
function loadFallbackScripts() {
    const scripts = [
        './systems/audio.js',
        './systems/performance.js',
        './entities/particle.js',
        './entities/projectile.js',
        './entities/damageZone.js',
        './entities/enemy.js',
        './entities/player.js',
        './systems/upgrades.js',
        './systems/achievements.js',
        './core/gameEngine.js',
        './core/gameManager.js',
        './ui/uiEnhancements.js'
    ];
    
    let loadedCount = 0;
    const totalScripts = scripts.length;
    
    scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            loadedCount++;
            console.log(`📜 Loaded ${src} (${loadedCount}/${totalScripts})`);
            
            if (loadedCount === totalScripts) {
                startGame();
            }
        };
        script.onerror = (error) => {
            console.error(`❌ Failed to load ${src}:`, error);
        };
        document.head.appendChild(script);
    });
}

/**
 * Start the game after all dependencies are loaded
 */
function startGame() {
    console.log('🎮 All game modules loaded, starting game...');
    
    // Initialize existing game systems
    if (typeof UIEnhancements !== 'undefined') {
        window.uiEnhancements = new UIEnhancements();
    }
    
    if (typeof AchievementSystem !== 'undefined') {
        window.achievementSystem = new AchievementSystem();
    }
    
    // Initialize game loading sequence
    initializeGameLoading();
}

/**
 * Initialize game loading sequence
 */
function initializeGameLoading() {
    // Game tips
    const tips = [
        "Use WASD or Arrow Keys to move",
        "Enemies drop XP orbs when defeated",
        "Collect XP to level up and choose upgrades",
        "Press SPACE to dodge incoming enemies",
        "Bosses appear every 3 minutes",
        "Watch out for explosive enemies!",
        "Ranged enemies will shoot projectiles at you",
        "The game gets harder over time",
        "Piercing projectiles can hit multiple enemies",
        "Press P or ESC to pause the game",
        "The minimap shows nearby enemies and XP orbs"
    ];
    
    // Simple loading simulation with random tips
    window.addEventListener('load', () => {
        // Display random tip
        const tipElem = document.getElementById('loading-tip');
        if (tipElem) {
            tipElem.textContent = "Tip: " + tips[Math.floor(Math.random() * tips.length)];
        }
        
        const loadingBar = document.getElementById('loading-progress');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += 5;
            if (loadingBar) {
                loadingBar.style.width = `${progress}%`;
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    const loadingScreen = document.getElementById('loading-screen');
                    const mainMenu = document.getElementById('main-menu');
                    
                    if (loadingScreen) loadingScreen.classList.add('hidden');
                    if (mainMenu) {
                        mainMenu.classList.remove('hidden');
                        // Update star count in main menu
                        const starDisplay = document.getElementById('star-menu-display');
                        if (starDisplay && typeof gameManager !== 'undefined') {
                            starDisplay.textContent = '⭐ ' + gameManager.metaStars;
                        }
                    }
                }, 500);
            }
        }, 100);
    });
    
    console.log('✅ Game initialization complete');
}

// Export for use in other modules
export { gameConfig, MathUtils, CollisionUtils, debugManager };

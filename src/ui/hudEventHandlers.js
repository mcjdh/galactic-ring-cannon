/**
 * HUD Event Handlers
 * Listens to GameState events and updates DOM accordingly
 * This decouples the game engine from direct DOM manipulation
 */

class HUDEventHandlers {
    constructor(gameState) {
        if (!gameState) {
            throw new Error('HUDEventHandlers requires a gameState instance');
        }
        
        this.gameState = gameState;
        this._isDestroyed = false;
        this._boundHandlers = {
            gameReset: () => this.handleGameReset(),
            playerCreated: (data) => this.handlePlayerCreated(data)
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.gameState || typeof this.gameState.on !== 'function') {
            return;
        }
        
        // Listen for game reset events
        this.gameState.on('gameReset', this._boundHandlers.gameReset);

        // Listen for player creation events
        this.gameState.on('playerCreated', this._boundHandlers.playerCreated);
    }

    /**
     * Handle game reset - reset UI elements
     */
    handleGameReset() {
        // Skip if destroyed or in non-browser environment (testing)
        if (this._isDestroyed || typeof document === 'undefined') return;

        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');

        // Safe logging with fallback
        const log = window.logger?.log || console.log;
        log('[H] HUD reset on game reset');
    }

    /**
     * Handle player creation - update HUD with baseline stats
     */
    handlePlayerCreated(data) {
        // Skip if destroyed or in non-browser environment (testing)
        if (this._isDestroyed || typeof document === 'undefined') return;

        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) levelDisplay.textContent = 'Level: 1';

        const xpBar = document.getElementById('xp-bar');
        if (xpBar) xpBar.style.setProperty('--xp-width', '0%');

        const healthBar = document.getElementById('health-bar');
        if (healthBar) healthBar.style.setProperty('--health-width', '100%');

        // Safe logging with fallback
        const log = window.logger?.log || console.log;
        log('[H] HUD updated for new player');
    }

    /**
     * Cleanup event listeners to prevent memory leaks
     */
    cleanup() {
        if (this._isDestroyed) return;
        this._isDestroyed = true;
        
        if (this.gameState && typeof this.gameState.off === 'function' && this._boundHandlers) {
            this.gameState.off('gameReset', this._boundHandlers.gameReset);
            this.gameState.off('playerCreated', this._boundHandlers.playerCreated);
        }
        this._boundHandlers = null;
        this.gameState = null;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.HUDEventHandlers = HUDEventHandlers;
}

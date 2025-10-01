/**
 * HUD Event Handlers
 * Listens to GameState events and updates DOM accordingly
 * This decouples the game engine from direct DOM manipulation
 */

class HUDEventHandlers {
    constructor(gameState) {
        this.gameState = gameState;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for game reset events
        this.gameState.on('gameReset', () => this.handleGameReset());

        // Listen for player creation events
        this.gameState.on('playerCreated', (data) => this.handlePlayerCreated(data));
    }

    /**
     * Handle game reset - reset UI elements
     */
    handleGameReset() {
        // Skip in non-browser environment (testing)
        if (typeof document === 'undefined') return;

        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');

        (window.logger?.log || console.log)('🎨 HUD reset on game reset');
    }

    /**
     * Handle player creation - update HUD with baseline stats
     */
    handlePlayerCreated(data) {
        // Skip in non-browser environment (testing)
        if (typeof document === 'undefined') return;

        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) levelDisplay.textContent = 'Level: 1';

        const xpBar = document.getElementById('xp-bar');
        if (xpBar) xpBar.style.setProperty('--xp-width', '0%');

        const healthBar = document.getElementById('health-bar');
        if (healthBar) healthBar.style.setProperty('--health-width', '100%');

        (window.logger?.log || console.log)('🎨 HUD updated for new player');
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        // Could implement off() if needed
        // For now, GameState doesn't track listeners for removal
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.HUDEventHandlers = HUDEventHandlers;
}

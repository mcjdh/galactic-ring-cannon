/**
 * Player Upgrades System - Handles upgrade application logic
 * Extracted from player.js to reduce file size and improve maintainability
 */
class PlayerUpgrades {
    static apply(player, upgrade) {
        if (!player || typeof player.applyUpgrade !== 'function') {
            console.warn('PlayerUpgrades.apply called without valid player');
            return;
        }

        player.applyUpgrade(upgrade);
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.PlayerUpgrades = PlayerUpgrades;
    window.PlayerUpgrades = PlayerUpgrades;
}

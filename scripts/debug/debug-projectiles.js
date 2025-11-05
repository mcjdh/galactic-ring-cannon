/**
 * Debug utility for projectile piercing and ricochet mechanics
 *
 * To enable debugging, paste this into browser console:
 * window.debugProjectiles = true;
 *
 * To disable:
 * window.debugProjectiles = false;
 */

// Enable debug logging for projectiles
if (typeof window !== 'undefined') {
    window.debugProjectiles = false;

    // Utility functions to help with debugging
    window.enableProjectileDebug = () => {
        window.debugProjectiles = true;
        console.log('🎯 Projectile debugging enabled! You will see detailed logs for piercing/ricochet mechanics.');
    };

    window.disableProjectileDebug = () => {
        window.debugProjectiles = false;
        console.log('🔇 Projectile debugging disabled.');
    };

    // Quick test function
    window.testProjectileDebug = () => {
        console.log('Testing projectile debug system...');
        console.log('debugProjectiles enabled:', window.debugProjectiles);
        console.log('CollisionSystem available:', typeof window.CollisionSystem !== 'undefined');

        if (window.gameManager && window.gameManager.engine && window.gameManager.engine.projectiles) {
            console.log('Active projectiles:', window.gameManager.engine.projectiles.length);
            const piercingProjectiles = window.gameManager.engine.projectiles.filter(p => p.piercing > 0);
            console.log('Piercing projectiles:', piercingProjectiles.length);
        }
    };

    // Auto-start debugging if user has piercing upgrades
    window.autoEnableProjectileDebug = () => {
        if (window.gameManager && window.gameManager.player && window.gameManager.player.combat) {
            const piercing = window.gameManager.player.combat.piercing;
            if (piercing > 0) {
                window.debugProjectiles = true;
                console.log(`🎯 Auto-enabled projectile debugging - player has ${piercing} piercing!`);
                return true;
            }
        }
        return false;
    };

    console.log('🛠️ Projectile debug utilities loaded. Use:');
    console.log('  window.enableProjectileDebug()     - Enable detailed logging');
    console.log('  window.disableProjectileDebug()    - Disable logging');
    console.log('  window.testProjectileDebug()       - Check system status');
    console.log('  window.autoEnableProjectileDebug() - Auto-enable if player has piercing');
}
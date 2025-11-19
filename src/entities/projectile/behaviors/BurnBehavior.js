/**
 * BurnBehavior - Applies burn status to enemies on hit
 */
class BurnBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile);
        this.damage = config.damage || 5;
        this.duration = config.duration || 3.0;
        this.chance = config.chance || 1.0;
    }

    /**
     * Handle collision with enemy
     */
    handleCollision(target, engine) {
        // Check chance
        if (Math.random() > this.chance) return false;

        // Apply burn effect
        if (target && target.statusEffects) {
            target.statusEffects.applyEffect('burn', {
                damage: this.damage
            }, this.duration);

            // Visual feedback for application
            if (window.gameManager?.showFloatingText) {
                window.gameManager.showFloatingText(
                    'IGNITE!',
                    target.x,
                    target.y - 40,
                    '#e67e22',
                    12
                );
            }
        }

        return false; // Don't destroy projectile (unless other behaviors say so)
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.BurnBehavior = BurnBehavior;
}

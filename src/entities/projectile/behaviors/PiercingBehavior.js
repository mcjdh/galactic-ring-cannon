/**
 * PiercingBehavior - Allows projectile to pass through multiple enemies
 * Prevents death until piercing charges are exhausted
 */
class PiercingBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        // Piercing charges - how many enemies can be pierced through
        this.charges = config.charges || 1;
        this.maxCharges = this.charges;
    }

    /**
     * Piercing prevents death by consuming charges
     */
    preventsDeath(target, engine) {
        if (this.charges > 0) {
            this.charges--;

            if (window.debugProjectiles) {
                console.log(`[PiercingBehavior] Projectile ${this.projectile.id} pierced enemy. Charges: ${this.charges + 1} -> ${this.charges}`);
            }

            return true; // Prevent death
        }

        if (window.debugProjectiles) {
            console.log(`[PiercingBehavior] Projectile ${this.projectile.id} piercing exhausted`);
        }

        return false; // No charges left, allow death
    }

    /**
     * Restore piercing charges (called by ricochet)
     */
    restoreCharges(amount) {
        this.charges = Math.min(this.maxCharges, this.charges + amount);

        if (window.debugProjectiles) {
            console.log(`[PiercingBehavior] Restored ${amount} piercing charges. Total: ${this.charges}`);
        }
    }

    /**
     * Check if charges are exhausted
     */
    isExhausted() {
        return this.charges <= 0;
    }

    /**
     * Get current charges
     */
    getCharges() {
        return this.charges;
    }
}
/**
 * WeaponBase - Base class for all weapon types
 * 
 * Provides shared fire rate calculation logic, cooldown management,
 * and lifecycle hooks. Eliminates code duplication across weapon files.
 * 
 * WHY FIRE RATE CLAMPS TO 0.1:
 * - Division by zero protection: fireRate=0 causes cooldown=Infinity, softlocking weapon
 * - Edge cases: combat.attackSpeed can be 0 during initialization or after debuffs
 * - Definition errors: Malformed weapon definitions could have fireRate=0 or undefined
 * - The 0.1 minimum ensures weapons fire at most every 10 seconds (safe floor)
 */
class WeaponBase {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;
    }

    /**
     * Get base attack speed from combat system or definition fallback
     * Override in subclass if weapon has special default fire rate
     */
    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || this.definition.fireRate || 1;
    }

    /**
     * Get fire rate from weapon definition with validation
     */
    _getDefinitionFireRate() {
        const fireRate = this.definition?.fireRate;
        if (typeof fireRate !== 'number' || fireRate <= 0) {
            return this._getBaseAttackSpeed();
        }
        return fireRate;
    }

    /**
     * Compute effective fire rate combining player stats and weapon modifier
     * 
     * Formula: playerRate * (weaponRate / baseRate)
     * - Normalizes weapon rate as a multiplier against baseline
     * - Preserves player upgrades while applying weapon modifier
     */
    _computeEffectiveFireRate() {
        // SAFETY: All Math.max(0.1, x) calls prevent division by zero
        // and ensure minimum fire rate even with broken/missing data
        const playerRate = Math.max(0.1, this.combat?.attackSpeed || 1);
        const baseRate = Math.max(0.1, this._getBaseAttackSpeed());
        const weaponRate = Math.max(0.1, this._getDefinitionFireRate());

        const normalizedModifier = weaponRate / baseRate;
        return Math.max(0.05, playerRate * normalizedModifier);
    }

    /**
     * Recalculate cooldown from fire rate, preserving timer progress
     * @param {boolean} preserveProgress - Whether to scale timer proportionally
     */
    _recalculateCooldown(preserveProgress = true) {
        const fireRate = this._computeEffectiveFireRate();
        // [FIX] Enforce minimum fire rate to prevent Infinity cooldown softlock
        // This is the final safety net - fireRate should never be 0 at this point
        // but we double-check to prevent 1/0 = Infinity
        const safeFireRate = Math.max(0.1, fireRate);
        const newCooldown = 1 / safeFireRate;

        if (preserveProgress && this.cooldown > 0 && Number.isFinite(this.cooldown)) {
            const progress = Math.min(1, this.timer / this.cooldown);
            this.cooldown = newCooldown;
            this.timer = progress * this.cooldown;
        } else {
            this.cooldown = newCooldown;
            this.timer = Math.min(this.timer, this.cooldown);
        }

        // Sync legacy combat fields for debugging/UI
        this.combat.attackCooldown = this.cooldown;
        this._needsRecalc = false;
    }

    /**
     * Standard update loop for timer-based weapons
     * Override fire() method in subclass to implement weapon behavior
     */
    update(deltaTime, game) {
        if (this._needsRecalc) {
            this._recalculateCooldown(true);
        }

        if (!Number.isFinite(this.cooldown) || this.cooldown <= 0) {
            return;
        }

        this.timer += deltaTime;
        this.combat.attackTimer = this.timer;

        if (this.timer >= this.cooldown) {
            this.timer -= this.cooldown;
            const fired = this.fire(game);
            if (fired && this._playFireSound) {
                this._playFireSound();
            }
        }
    }

    /**
     * Fire the weapon - MUST be overridden by subclass
     * @param {Game} game - Game instance
     * @returns {boolean} Whether the weapon successfully fired
     */
    fire(game) {
        throw new Error('WeaponBase.fire() must be overridden by subclass');
    }

    /**
     * Called when weapon is equipped
     */
    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
    }

    /**
     * Called when weapon is unequipped
     */
    onUnequip() {
        // Override in subclass if cleanup needed
    }

    /**
     * Called when player combat stats change (upgrades, abilities, etc.)
     */
    onCombatStatsChanged() {
        this._needsRecalc = true;
    }

    /**
     * Force immediate fire, resetting timer
     */
    fireImmediate(game) {
        this.timer = 0;
        return this.fire(game);
    }

    /**
     * Get current cooldown value
     */
    getCooldown() {
        return this.cooldown;
    }

    /**
     * Get current timer value
     */
    getTimer() {
        return this.timer;
    }

    /**
     * Get cooldown progress as percentage (0-1)
     */
    getCooldownProgress() {
        if (!this.cooldown || this.cooldown <= 0) return 0;
        return Math.min(1, this.timer / this.cooldown);
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.WeaponBase = WeaponBase;
}

/**
 * PulseCannonWeapon - baseline volley weapon mirroring the legacy behavior.
 */
class PulseCannonWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;
    }

    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || this.definition.fireRate || 1;
    }

    _getDefinitionFireRate() {
        const fireRate = this.definition?.fireRate;
        if (typeof fireRate !== 'number' || fireRate <= 0) {
            return this._getBaseAttackSpeed();
        }
        return fireRate;
    }

    _computeEffectiveFireRate() {
        const playerRate = Math.max(0.1, this.combat?.attackSpeed || 1);
        const baseRate = Math.max(0.1, this._getBaseAttackSpeed());
        const weaponRate = Math.max(0.1, this._getDefinitionFireRate());

        const normalizedModifier = weaponRate / baseRate;
        return Math.max(0.05, playerRate * normalizedModifier);
    }

    _recalculateCooldown(preserveProgress = true) {
        const fireRate = this._computeEffectiveFireRate();
        const newCooldown = fireRate > 0 ? 1 / fireRate : Infinity;

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

    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
    }

    onCombatStatsChanged() {
        this._needsRecalc = true;
    }

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
            if (!fired) {
                // Match legacy behavior: if no target, reset timer so we retry quickly.
                this.timer = 0;
            }
        }
    }

    fire(game) {
        if (!game) return false;

        const nearestEnemy = this.combat.findNearestEnemy();
        if (!nearestEnemy) return false;

        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        const baseAngle = Math.atan2(dy, dx);

        if (window.audioSystem?.playBossBeat) {
            window.audioSystem.playBossBeat();
        }

        // Build overrides - use additionalProjectiles if template specifies count
        const overrides = {
            spreadDegrees: this.definition?.projectileTemplate?.spreadDegrees,
            damageMultiplier: this.definition?.projectileTemplate?.damageMultiplier,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier,
            applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false
        };

        // If template defines projectile count, add it to player's count instead of replacing
        const templateCount = this.definition?.projectileTemplate?.count;
        if (templateCount !== undefined && templateCount > 1) {
            overrides.additionalProjectiles = templateCount - 1;
        }

        this.combat.fireProjectile(game, baseAngle, overrides);

        return true;
    }

    fireImmediate(game) {
        // Reset timer so cadence feels consistent with manual triggers
        this.timer = 0;
        return this.fire(game);
    }

    getCooldown() {
        return this.cooldown;
    }

    getTimer() {
        return this.timer;
    }

    applyUpgrade(upgrade) {
        // Pulse cannon currently relies on core combat stats; specific upgrades
        // can be handled in future iterations here.
        switch (upgrade.type) {
            case 'attackSpeed':
            case 'attackDamage':
            case 'projectileCount':
            case 'projectileSpread':
            case 'piercing':
            case 'projectileSpeed':
            case 'critChance':
            case 'critDamage':
                this._needsRecalc = true;
                break;
            default:
                break;
        }
    }
}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Weapons = window.Game.Weapons || {};
    if (typeof window.Game.Weapons.registerType === 'function') {
        window.Game.Weapons.registerType('pulse_cannon', PulseCannonWeapon);
    }
}

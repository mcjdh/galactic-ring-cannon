/**
 * PulseCannonWeapon - baseline volley weapon mirroring the legacy behavior.
 * Extends WeaponBase for shared fire rate logic.
 */

// Get base class from window.Game namespace
const WeaponBaseClass = (typeof window !== 'undefined' && window.Game?.WeaponBase) || class {
    constructor(opts) { Object.assign(this, opts); this.timer = 0; this.cooldown = 1; }
    _computeEffectiveFireRate() { return Math.max(0.1, this.combat?.attackSpeed || 1); }
    _recalculateCooldown() { this.cooldown = 1 / this._computeEffectiveFireRate(); }
    update(dt, game) { this.timer += dt; if (this.timer >= this.cooldown) { this.timer -= this.cooldown; this.fire(game); } }
    onEquip() { this.timer = 0; }
    onCombatStatsChanged() { this._needsRecalc = true; }
};

class PulseCannonWeapon extends WeaponBaseClass {
    constructor(opts) {
        super(opts);
    }

    update(deltaTime, game) {
        // Use base class update, but handle retry-on-no-target
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

        // Build overrides
        const overrides = {
            // Don't set spreadDegrees - let fireProjectile calculate it automatically
            // based on projectile count (allows split shot to fan correctly)
            damageMultiplier: this.definition?.projectileTemplate?.damageMultiplier,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier,
            applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false
        };

        // Pulse Cannon doesn't add extra projectiles - it relies on player's projectileCount
        // This allows Split Shot upgrades to work properly with automatic spread!

        this.combat.fireProjectile(game, baseAngle, overrides);

        this._createMuzzleFlash(baseAngle);

        return true;
    }

    _createMuzzleFlash(angle) {
        const ParticleHelpers = window.Game?.ParticleHelpers;
        if (ParticleHelpers?.createMuzzleFlash) {
            ParticleHelpers.createMuzzleFlash(this.player.x, this.player.y, angle, {
                color: '#ffffff',
                count: 1,
                speed: 80,
                speedVariance: 40,
                life: 0.15
            });
        }
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

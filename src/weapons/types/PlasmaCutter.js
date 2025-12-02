/**
 * PlasmaCutterWeapon - Fast-firing energy beam that shreds through enemies.
 * Extends WeaponBase for shared fire rate/cooldown logic.
 * Designed for the Cybernetic Berserker character.
 *
 * Core mechanics:
 * - Fast fire rate, moderate damage per shot
 * - Enhanced crit scaling
 * - Natural piercing capability
 * - Scales with Berserker passive (handled in PlayerCombat.js)
 */
class PlasmaCutterWeapon extends window.Game.WeaponBase {
    constructor({ player, combat, definition, manager }) {
        super({ player, combat, definition, manager });
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

        // Plasma Cutter: Fast, precise shots
        const baseDamageMult = this.definition?.projectileTemplate?.damageMultiplier || 0.8;

        // Build overrides
        const overrides = {
            damageMultiplier: baseDamageMult,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier || 1.5,
            applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false
        };

        this.combat.fireProjectile(game, baseAngle, overrides);

        this._createMuzzleFlash(baseAngle);

        return true;
    }

    _createMuzzleFlash(angle) {
        const ParticleHelpers = window.Game?.ParticleHelpers;
        if (ParticleHelpers?.createMuzzleFlash) {
            ParticleHelpers.createMuzzleFlash(this.player.x, this.player.y, angle, {
                color: '#00ffcc', // Cyan/Plasma
                count: 1,
                speed: 100,
                speedVariance: 50,
                size: 2,
                sizeVariance: 2,
                life: 0.15
            });
        }
    }

    applyUpgrade(upgrade) {
        // Recalculate on any combat stat changes
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
        window.Game.Weapons.registerType('plasma_cutter', PlasmaCutterWeapon);
    }
}

/**
 * SanguineLanceWeapon - Fast-firing vampiric weapon that synergizes with lifesteal.
 * Extends WeaponBase for shared fire rate/cooldown logic.
 * Designed for the Crimson Reaver character.
 *
 * Core mechanics:
 * - Fast fire rate for consistent healing
 * - Natural piercing for multi-target lifesteal
 * - Crimson visual effects
 */
class SanguineLanceWeapon extends window.Game.WeaponBase {
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

        // Sanguine Lance: Fast crimson bolts
        const baseDamageMult = this.definition?.projectileTemplate?.damageMultiplier || 1.05;

        const overrides = {
            damageMultiplier: baseDamageMult,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier || 1.1,
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
                color: '#e74c3c', // Crimson
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
        window.Game.Weapons.registerType('sanguine_lance', SanguineLanceWeapon);
    }
}

/**
 * SingularityCannonWeapon - Heavy void weapon that creates gravity wells.
 * Extends WeaponBase for shared fire rate/cooldown logic.
 * Designed for the Void Warden character.
 *
 * Core mechanics:
 * - Slow fire rate, high damage
 * - Slow projectile speed for area control
 * - Creates gravity wells (handled via abilities)
 */
class SingularityCannonWeapon extends window.Game.WeaponBase {
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

        // Singularity Cannon: Slow, heavy void orbs
        const baseDamageMult = this.definition?.projectileTemplate?.damageMultiplier || 1.2;

        // [FIX] Ensure gravity well is enabled by default for Singularity Cannon if not explicitly disabled
        const template = this.definition?.projectileTemplate;
        const shouldCreateGravityWell = template?.gravityWell !== false;

        const overrides = {
            damageMultiplier: baseDamageMult,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier || 0.85,
            applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false,
            weaponId: this.definition?.id || 'singularity_cannon',
            onProjectileSpawn: (projectile) => {
                if (shouldCreateGravityWell && projectile) {
                    projectile.createsGravityWell = true;
                }
            }
        };

        this.combat.fireProjectile(game, baseAngle, overrides);

        this._createMuzzleFlash(baseAngle);

        return true;
    }

    _createMuzzleFlash(angle) {
        const ParticleHelpers = window.Game?.ParticleHelpers;
        if (ParticleHelpers?.createMuzzleFlash) {
            ParticleHelpers.createMuzzleFlash(this.player.x, this.player.y, angle, {
                color: '#9b59b6', // Purple/Void
                count: 1,
                speed: 60,
                speedVariance: 30,
                size: 3,
                sizeVariance: 2,
                life: 0.25
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
        window.Game.Weapons.registerType('singularity_cannon', SingularityCannonWeapon);
    }
}

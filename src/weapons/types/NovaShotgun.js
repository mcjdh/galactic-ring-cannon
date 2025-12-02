/**
 * NovaShotgunWeapon - wide cone burst weapon favoring close-range combat.
 * Extends WeaponBase for shared fire rate/cooldown logic.
 */
class NovaShotgunWeapon extends window.Game.WeaponBase {
    constructor({ player, combat, definition, manager }) {
        super({ player, combat, definition, manager });

        const template = this.definition.projectileTemplate || {};
        this.baseProjectileCount = template.count || 5;
        this.baseSpread = template.spreadDegrees || 50;
        this.baseDamageMultiplier = template.damageMultiplier || 0.75;
        this.baseSpeedMultiplier = template.speedMultiplier || 0.9;

        this.additionalProjectiles = 0;
        this.spreadAdjustment = 0;
        this.damageModifier = 1;
        this.forceExplosive = false;
        this.soundVolume = 0.35;
    }

    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || this.definition.fireRate || 0.8;
    }

    onEquip() {
        super.onEquip();
        this.combat.hasSpreadAttack = true;
    }

    onUnequip() {
        super.onUnequip();
        this.combat.hasSpreadAttack = this.combat.projectileCount > 1;
    }

    fire(game) {
        if (!game) return false;

        const rangeLimit = (this.combat.attackRange || 300) * 0.8;
        const nearestEnemy = game.findClosestEnemy?.(
            this.player.x,
            this.player.y,
            {
                maxRadius: rangeLimit,
                includeDead: false
            }
        );

        if (!nearestEnemy) {
            // fallback to full range search
            return this._fireAtAnyTarget(game);
        }

        const angle = Math.atan2(nearestEnemy.y - this.player.y, nearestEnemy.x - this.player.x);

        this._emitShot(game, angle);
        return true;
    }

    _fireAtAnyTarget(game) {
        const nearestEnemy = this.combat.findNearestEnemy();
        if (!nearestEnemy) return false;
        const angle = Math.atan2(nearestEnemy.y - this.player.y, nearestEnemy.x - this.player.x);
        this._emitShot(game, angle);
        return true;
    }

    _emitShot(game, baseAngle) {
        // Calculate weapon's additional projectiles (base is usually 5-7 for shotgun)
        const weaponAdditional = Math.max(0, this.baseProjectileCount - 1 + this.additionalProjectiles);
        const spread = Math.max(10, this.baseSpread + this.spreadAdjustment);
        const damageMultiplier = this.baseDamageMultiplier * this.damageModifier;
        const speedMultiplier = this.baseSpeedMultiplier;

        const forcedSpecials = [];
        if (this.forceExplosive) {
            forcedSpecials.push('explosive');
        }

        this.combat.fireProjectile(game, baseAngle, {
            additionalProjectiles: weaponAdditional, // Add to player's count instead of replacing
            spreadDegrees: spread,
            damageMultiplier,
            speedMultiplier,
            forcedSpecialTypes: forcedSpecials,
            soundKey: 'shotgun' in (window.audioSystem?.sounds || {}) ? 'shotgun' : 'shoot',
            soundVolume: this.soundVolume
        });

        this._createMuzzleFlash(baseAngle);
    }

    _createMuzzleFlash(angle) {
        const ParticleHelpers = window.Game?.ParticleHelpers;
        if (ParticleHelpers?.createMuzzleFlash) {
            // Determine color based on state
            const color = this.forceExplosive ? '#e74c3c' : '#f39c12';
            
            ParticleHelpers.createMuzzleFlash(this.player.x, this.player.y, angle, {
                color: color,
                secondaryColor: '#ffffff',
                count: 12,
                spread: 0.6,
                speed: 180,
                speedVariance: 120,
                size: 3,
                sizeVariance: 2,
                life: 0.25
            });
        }
    }

    applyUpgrade(upgrade) {
        if (!upgrade) return;

        if (upgrade.weaponTags && !upgrade.weaponTags.includes('shotgun')) {
            return;
        }

        switch (upgrade.id) {
            case 'nova_choke':
                this.spreadAdjustment -= upgrade.spreadReduction || 10;
                this.damageModifier *= upgrade.damageBonus || 1.2;
                break;
            case 'nova_scatter_flex':
                this.additionalProjectiles += upgrade.additionalProjectiles || 2;
                this.spreadAdjustment += upgrade.spreadIncrease || 5;
                break;
            case 'nova_frag_rounds':
                this.forceExplosive = true;
                this.damageModifier *= upgrade.damagePenalty || 0.9;
                break;
            default:
                this._needsRecalc = true;
                break;
        }
    }
}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Weapons = window.Game.Weapons || {};
    if (typeof window.Game.Weapons.registerType === 'function') {
        window.Game.Weapons.registerType('nova_shotgun', NovaShotgunWeapon);
    }
}

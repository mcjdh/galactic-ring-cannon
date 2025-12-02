/**
 * ArcBurstWeapon - rapid chaining volley weapon.
 * Extends WeaponBase for shared fire rate/cooldown logic.
 */
class ArcBurstWeapon extends window.Game.WeaponBase {
    constructor({ player, combat, definition, manager }) {
        super({ player, combat, definition, manager });

        const template = this.definition.projectileTemplate || {};
        this.baseProjectileCount = template.count || 2;
        this.baseSpread = template.spreadDegrees || 10;
        this.baseDamageMultiplier = template.damageMultiplier || 0.9;
        this.baseSpeedMultiplier = template.speedMultiplier || 1.0;

        this.soundVolume = 0.28;
    }

    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || this.definition.fireRate || 1.5;
    }

    _ensureChainBaseline() {
        const abilities = this.player?.abilities;
        if (!abilities) return;
        
        // Enable chain lightning for this weapon
        if (!abilities.hasChainLightning) {
            abilities.hasChainLightning = true;
        }
        
        // Set baseline chain stats - but don't override better player upgrades
        // This allows Arc weapon to work with ricochet/explosive upgrades nicely
        abilities.chainChance = Math.max(abilities.chainChance || 0, 0.5);
        abilities.chainDamage = Math.max(abilities.chainDamage || 0, 0.85);
        abilities.chainRange = Math.max(abilities.chainRange || 0, 240);
        abilities.maxChains = Math.max(abilities.maxChains || 0, 2);
        
        // NOTE: Chain range is intentionally smaller than ricochet range (320)
        // This ensures ricochet can find targets even when chain can't
        // Ricochet attempts first in new priority system, so this works great!
    }

    onEquip() {
        super.onEquip();
        this._ensureChainBaseline();
    }

    fire(game) {
        if (!game) return false;

        const maxRadius = this.combat.attackRange || 320;
        const nearestEnemy = game.findClosestEnemy?.(
            this.player.x,
            this.player.y,
            {
                maxRadius,
                includeDead: false
            }
        );

        if (!nearestEnemy) return false;

        const angle = Math.atan2(nearestEnemy.y - this.player.y, nearestEnemy.x - this.player.x);

        this._ensureChainBaseline();

        this.combat.fireProjectile(game, angle, {
            additionalProjectiles: this.baseProjectileCount - 1, // Add to player's count (base is 2, so add 1)
            spreadDegrees: this.baseSpread,
            damageMultiplier: this.baseDamageMultiplier,
            speedMultiplier: this.baseSpeedMultiplier,
            forcedSpecialTypes: ['chain'],
            soundKey: 'shoot',
            soundVolume: this.soundVolume
        });

        this._createMuzzleFlash(angle);

        return true;
    }

    _createMuzzleFlash(angle) {
        const ParticleHelpers = window.Game?.ParticleHelpers;
        if (ParticleHelpers?.createMuzzleFlash) {
            ParticleHelpers.createMuzzleFlash(this.player.x, this.player.y, angle, {
                color: '#3498db',
                secondaryColor: '#ffffff',
                count: 6,
                spread: 0.5,
                speed: 150,
                speedVariance: 100,
                size: 2,
                sizeVariance: 2,
                life: 0.2
            });
        }
    }

    applyUpgrade(upgrade) {
        if (!upgrade) return;
        if (upgrade.weaponTags && !upgrade.weaponTags.includes('chain')) {
            return;
        }
        if (upgrade.type === 'weaponModifier' && upgrade.weaponTags?.includes('chain')) {
            if (upgrade.additionalProjectiles) {
                this.baseProjectileCount += upgrade.additionalProjectiles;
            }
            if (upgrade.spreadIncrease) {
                this.baseSpread += upgrade.spreadIncrease;
            }
            if (upgrade.spreadReduction) {
                this.baseSpread = Math.max(2, this.baseSpread - upgrade.spreadReduction);
            }
            if (upgrade.damageBonus) {
                this.baseDamageMultiplier *= upgrade.damageBonus;
            }
            if (upgrade.damagePenalty) {
                this.baseDamageMultiplier *= upgrade.damagePenalty;
            }
            this._needsRecalc = true;
        }
    }
}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Weapons = window.Game.Weapons || {};
    if (typeof window.Game.Weapons.registerType === 'function') {
        window.Game.Weapons.registerType('arc_burst', ArcBurstWeapon);
    }
}

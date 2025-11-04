/**
 * ArcBurstWeapon - rapid chaining volley weapon.
 */
class ArcBurstWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;

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

    _getDefinitionFireRate() {
        const rate = this.definition?.fireRate;
        if (typeof rate !== 'number' || rate <= 0) {
            return this._getBaseAttackSpeed();
        }
        return rate;
    }

    _computeEffectiveFireRate() {
        const playerRate = Math.max(0.1, this.combat?.attackSpeed || 1);
        const baseRate = Math.max(0.1, this._getBaseAttackSpeed());
        const weaponRate = Math.max(0.1, this._getDefinitionFireRate());
        return Math.max(0.05, playerRate * (weaponRate / baseRate));
    }

    _ensureChainBaseline() {
        const abilities = this.player?.abilities;
        if (!abilities) return;
        if (!abilities.hasChainLightning) {
            abilities.hasChainLightning = true;
        }
        abilities.chainChance = Math.max(abilities.chainChance || 0, 0.5);
        abilities.chainDamage = Math.max(abilities.chainDamage || 0, 0.85);
        abilities.chainRange = Math.max(abilities.chainRange || 0, 240);
        abilities.maxChains = Math.max(abilities.maxChains || 0, 2);
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

        this.combat.attackCooldown = this.cooldown;
        this._needsRecalc = false;
    }

    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
        this._ensureChainBaseline();
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
                this.timer = 0;
            }
        }
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

        return true;
    }

    fireImmediate(game) {
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

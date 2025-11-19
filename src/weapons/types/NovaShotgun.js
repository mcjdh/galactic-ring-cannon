/**
 * NovaShotgunWeapon - wide cone burst weapon favoring close-range combat.
 */
class NovaShotgunWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;

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
        const weaponRate = Math.max(0.05, this._getDefinitionFireRate());
        const normalizedModifier = weaponRate / baseRate;
        return Math.max(0.05, playerRate * normalizedModifier);
    }

    _recalculateCooldown(preserveProgress = true) {
        const fireRate = this._computeEffectiveFireRate();
        // [FIX] Enforce minimum fire rate to prevent Infinity cooldown softlock
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

        this.combat.attackCooldown = this.cooldown;
        this._needsRecalc = false;
    }

    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
        this.combat.hasSpreadAttack = true;
    }

    onUnequip() {
        // Restore state as needed
        this.combat.hasSpreadAttack = this.combat.projectileCount > 1;
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
        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();
        if (stats?.lowQuality) return;

        const count = helpers?.calculateSpawnCount?.(12) ?? 12;
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.6;
            const speed = 180 + Math.random() * 120;
            const vx = Math.cos(angle + spread) * speed;
            const vy = Math.sin(angle + spread) * speed;
            this.player.spawnParticle(
                this.player.x,
                this.player.y,
                vx,
                vy,
                3 + Math.random() * 2,
                '#f39c12',
                0.25,
                'spark'
            );
        }
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

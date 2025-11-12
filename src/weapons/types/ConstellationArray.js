/**
 * ConstellationArrayWeapon - orbit-focused radial barrage weapon.
 */
class ConstellationArrayWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;
        this.lastTargetAngle = 0;
        this.rotationOffset = 0;
        this.focusAngle = 0;

        const template = this.definition.projectileTemplate || {};
        const volley = this.definition.volley || {};
        this.baseDamageMultiplier = template.damageMultiplier || 0.85;
        this.baseSpeedMultiplier = template.speedMultiplier || 1.0;
        this.minVolley = Math.max(1, volley.min || template.count || 3);
        this.maxVolley = Math.max(this.minVolley, volley.max || 8);
        this._baseOrbitVolley = Math.max(this.minVolley, template.count || this.minVolley);
        this.rotationSpeed = (Math.PI / 10);
        this.passiveSpinSpeed = Math.PI / 16;
        this.focusBlendClose = 0.5;
        this.focusBlendFar = 0.15;
        this.soundVolume = 0.22;
    }

    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || 1;
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
        const orbitCount = Math.max(0, this.player?.abilities?.orbitCount || 0);
        const orbitDelta = Math.max(0, orbitCount - this.minVolley);
        const orbitBonus = 1 + Math.min(0.6, orbitDelta * 0.08);
        return Math.max(0.05, playerRate * (weaponRate / baseRate) * orbitBonus);
    }

    _advanceRotation(deltaTime) {
        const spin = this.passiveSpinSpeed * deltaTime;
        this.rotationOffset = (this.rotationOffset + spin) % (Math.PI * 2);
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

    _ensureOrbitBaseline() {
        const abilities = this.player?.abilities;
        if (!abilities) {
            return;
        }

        if (!abilities.hasOrbitalAttack) {
            abilities.hasOrbitalAttack = true;
        }
        if (abilities.orbitCount == null || abilities.orbitCount < this.minVolley) {
            abilities.orbitCount = this.minVolley;
        }
        if (!abilities.orbitDamage || abilities.orbitDamage <= 0) {
            abilities.orbitDamage = 0.5;
        }
        if (!abilities.orbitSpeed || abilities.orbitSpeed <= 0) {
            abilities.orbitSpeed = 2.0;
        }
        if (!abilities.orbitRadius || abilities.orbitRadius <= 0) {
            abilities.orbitRadius = 100;
        }

        const fallbackRange =
            this.player?.combat?.attackRange ||
            window.GAME_CONSTANTS?.PLAYER?.BASE_ATTACK_RANGE ||
            320;
        const desiredRange = Math.max(fallbackRange, abilities.orbitRadius + 80);
        abilities.maxOrbitalRange = Math.max(abilities.maxOrbitalRange || 0, desiredRange);

        this._baseOrbitVolley = Math.max(this.minVolley, abilities.orbitCount || this._baseOrbitVolley || this.minVolley);
    }

    _getMaxTargetRange() {
        const abilityRange = this.player?.abilities?.maxOrbitalRange || 0;
        const configured = this.definition?.maxRange || 0;
        const combatRange = this.combat?.attackRange || 0;
        const fallback = window.GAME_CONSTANTS?.PLAYER?.BASE_ATTACK_RANGE || 320;
        return Math.max(abilityRange, configured, combatRange, fallback);
    }

    _resolveVolleyCount() {
        const abilityCount = Math.round(this.player?.abilities?.orbitCount || 0);
        const fallbackCount = Math.max(
            this.minVolley,
            this._baseOrbitVolley || this.definition?.projectileTemplate?.count || this.minVolley
        );
        const baseCount = abilityCount > 0 ? abilityCount : fallbackCount;
        const candidate = Math.max(this.minVolley, baseCount);
        return Math.max(1, Math.min(this.maxVolley, candidate));
    }

    _resolveTargetAngle(game) {
        const maxRange = this._getMaxTargetRange();
        const detectionRadius = maxRange;

        const nearestEnemy = typeof this.combat.findNearestEnemy === 'function'
            ? this.combat.findNearestEnemy()
            : game?.findClosestEnemy?.(
                this.player.x,
                this.player.y,
                {
                    includeDead: false,
                    maxRadius: detectionRadius,
                    useSpatialGrid: true
                }
            );

        if (!nearestEnemy) {
            return null;
        }

        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        this._distanceToLastTarget = Math.hypot(dx, dy);

        if (this._distanceToLastTarget > maxRange) {
            return null;
        }

        const angle = Math.atan2(nearestEnemy.y - this.player.y, nearestEnemy.x - this.player.x);
        this.lastTargetAngle = angle;
        return angle;
    }

    _spawnOrbitalBurstEffect(volleyCount) {
        if (!this.player?.spawnParticle) {
            return;
        }

        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();
        if (stats?.lowQuality) {
            return;
        }

        const radius = 42;
        const FastMath = window.Game?.FastMath;
        for (let i = 0; i < volleyCount; i++) {
            const angle = this.rotationOffset + (i / volleyCount) * Math.PI * 2;
            const trig = FastMath ? FastMath.sincos(angle) : { sin: Math.sin(angle), cos: Math.cos(angle) };
            const vx = trig.cos * 160;
            const vy = trig.sin * 160;
            const x = this.player.x + trig.cos * radius;
            const y = this.player.y + trig.sin * radius;
            this.player.spawnParticle(
                x,
                y,
                vx,
                vy,
                3,
                '#aef3ff',
                0.25,
                'spark'
            );
        }
    }

    _playFireSound() {
        if (window.audioSystem?.play) {
            window.audioSystem.play('shoot', this.soundVolume);
        }
    }

    onEquip() {
        this._ensureOrbitBaseline();
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

        this._advanceRotation(deltaTime);

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
        if (!game) {
            return false;
        }

        const volleyCount = this._resolveVolleyCount();
        if (volleyCount <= 0) {
            return false;
        }

        const maxTargetRange = this._getMaxTargetRange();
        const focusAngle = this._resolveTargetAngle(game);
        const hasTarget = focusAngle != null && Number.isFinite(focusAngle);

        if (!hasTarget) {
            // Stay ready but don't fire blindly when nothing is in range
            return false;
        }

        const distance = this._distanceToLastTarget || 1;
        const blend = distance < 240 ? this.focusBlendClose : this.focusBlendFar;
        this.focusAngle = Number.isFinite(this.focusAngle)
            ? this._blendAngles(this.focusAngle, focusAngle, blend)
            : focusAngle;

        const targetedCount = Math.max(1, Math.floor(volleyCount * 0.7));
        const radialCount = Math.max(0, volleyCount - targetedCount);

        const bonusScaling = Math.max(0, volleyCount - this.minVolley);
        const damageMultiplier = this.baseDamageMultiplier * (1 + Math.min(0.25, bonusScaling * 0.04));
        const speedMultiplier = this.baseSpeedMultiplier + Math.min(0.25, bonusScaling * 0.03);

        const shotAngles = [];
        if (targetedCount > 0 && Number.isFinite(this.focusAngle)) {
            const targetedSpread = targetedCount > 1
                ? Math.min(Math.PI / 3, 0.15 + targetedCount * 0.06)
                : 0;

            for (let i = 0; i < targetedCount; i++) {
                let offset = 0;
                if (targetedCount > 1) {
                    const t = i / (targetedCount - 1);
                    offset = -targetedSpread / 2 + targetedSpread * t;
                }
                shotAngles.push(this.focusAngle + offset);
            }
        }

        const radialStep = (Math.PI * 2) / Math.max(1, radialCount || volleyCount);
        for (let i = 0; i < radialCount; i++) {
            shotAngles.push(this.rotationOffset + i * radialStep);
        }

        if (shotAngles.length === 0) {
            const fallbackStep = (Math.PI * 2) / volleyCount;
            for (let i = 0; i < volleyCount; i++) {
                shotAngles.push(this.rotationOffset + i * fallbackStep);
            }
        }

        shotAngles.forEach(angle => {
            const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
            this.combat.fireProjectile(game, normalized, {
                damageMultiplier,
                speedMultiplier,
                spreadDegrees: 0,
                applyBehaviors: true,
                maxDistance: maxTargetRange
            });
        });

        this.rotationOffset = (this.rotationOffset + this.rotationSpeed) % (Math.PI * 2);
        this._spawnOrbitalBurstEffect(volleyCount);
        this._playFireSound();
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
        if (!upgrade) {
            return;
        }

        if (upgrade.weaponTags && !upgrade.weaponTags.includes('orbit')) {
            return;
        }

        if (upgrade.type === 'weaponModifier') {
            if (upgrade.additionalProjectiles) {
                this.maxVolley = Math.min(12, this.maxVolley + upgrade.additionalProjectiles);
            }
            if (upgrade.damageBonus) {
                this.baseDamageMultiplier *= upgrade.damageBonus;
            }
            if (upgrade.speedBonus) {
                this.baseSpeedMultiplier *= upgrade.speedBonus;
            }
            return;
        }

        switch (upgrade.type) {
            case 'attackSpeed':
            case 'attackDamage':
            case 'projectileCount':
            case 'projectileSpeed':
                this._needsRecalc = true;
                break;
            default:
                break;
        }
    }

    _blendAngles(a, b, t) {
        if (!Number.isFinite(a)) {
            return b || 0;
        }
        if (!Number.isFinite(b)) {
            return a || 0;
        }
        const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
        return (a + diff * t) % (Math.PI * 2);
    }
}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Weapons = window.Game.Weapons || {};
    if (typeof window.Game.Weapons.registerType === 'function') {
        window.Game.Weapons.registerType('constellation_array', ConstellationArrayWeapon);
    }
}

/**
 * VoidScytheWeapon - Death harvester weapon that fires in sweeping arc patterns.
 * Creates a reaping effect by rotating the firing arc over time.
 */
class VoidScytheWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;

        // Scythe-specific rotation state
        this.sweepAngle = 0;          // Current sweep rotation
        this.sweepDirection = 1;      // 1 for clockwise, -1 for counter-clockwise
        this.sweepSpeed = Math.PI / 2; // Radians per second
        this.arcSpread = 60;  // 60-degree arc spread

        // Weapon stats from definition
        const template = this.definition.projectileTemplate || {};
        this.baseDamageMultiplier = template.damageMultiplier || 1.0;
        this.baseSpeedMultiplier = template.speedMultiplier || 1.0;
        this.baseProjectileCount = template.count || 3;
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

        this.combat.attackCooldown = this.cooldown;
        this._needsRecalc = false;
    }

    _advanceSweep(deltaTime) {
        // Continuously sweep the arc angle back and forth
        this.sweepAngle += this.sweepSpeed * this.sweepDirection * deltaTime;

        // Reverse direction at sweep limits to create a pendulum effect
        const maxSweep = Math.PI / 2; // 90 degrees each way
        if (Math.abs(this.sweepAngle) > maxSweep) {
            this.sweepDirection *= -1;
            this.sweepAngle = Math.sign(this.sweepAngle) * maxSweep;
        }
    }

    _spawnScytheTrailEffect(centerAngle, arcCount) {
        if (!this.player?.spawnParticle) {
            return;
        }

        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();
        if (stats?.lowQuality) {
            return;
        }

        // Create a trailing void effect along the arc
        const radius = 30;
        for (let i = 0; i < arcCount; i++) {
            const progress = i / Math.max(1, arcCount - 1);
            const angle = centerAngle - this.arcSpread / 2 + this.arcSpread * progress;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const x = this.player.x + cos * radius;
            const y = this.player.y + sin * radius;
            const vx = cos * 80;
            const vy = sin * 80;

            this.player.spawnParticle(
                x,
                y,
                vx,
                vy,
                2.5,
                '#9945ff', // Purple void color
                0.3,
                'spark'
            );
        }
    }

    _playFireSound() {
        if (window.audioSystem?.play) {
            window.audioSystem.play('shoot', 0.25);
        }
    }

    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
        this.sweepAngle = 0;
        this.sweepDirection = 1;
    }

    onUnequip() {
        // Clean up if needed
    }

    onCombatStatsChanged() {
        this._needsRecalc = true;
    }

    update(deltaTime, game) {
        if (this._needsRecalc) {
            this._recalculateCooldown(true);
        }

        // Advance the sweep animation
        this._advanceSweep(deltaTime);

        if (!Number.isFinite(this.cooldown) || this.cooldown <= 0) {
            return;
        }

        this.timer += deltaTime;
        this.combat.attackTimer = this.timer;

        if (this.timer >= this.cooldown) {
            this.timer -= this.cooldown;
            const fired = this.fire(game);
            if (!fired) {
                // No target found, reset timer for quick retry
                this.timer = 0;
            }
        }
    }

    fire(game) {
        if (!game) return false;

        const nearestEnemy = this.combat.findNearestEnemy();
        if (!nearestEnemy) return false;

        // Calculate base angle to nearest enemy
        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        const targetAngle = Math.atan2(dy, dx);

        // Apply sweep offset to create reaping motion
        const centerAngle = targetAngle + this.sweepAngle;

        // Fire projectiles in an arc formation (like a scythe swing)
        this.combat.fireProjectile(game, centerAngle, {
            damageMultiplier: this.baseDamageMultiplier,
            speedMultiplier: this.baseSpeedMultiplier,
            spreadDegrees: this.arcSpread,
            applyBehaviors: true,
            additionalProjectiles: this.baseProjectileCount - 1
        });

        // Visual effects
        this._spawnScytheTrailEffect(centerAngle, Math.min(8, this.baseProjectileCount));
        this._playFireSound();

        return true;
    }

    fireImmediate(game) {
        // Reset timer for consistent cadence
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

        // Void Scythe synergizes with explosive and support paths
        if (upgrade.weaponTags &&
            !upgrade.weaponTags.includes('reaper') &&
            !upgrade.weaponTags.includes('explosive') &&
            !upgrade.weaponTags.includes('support')) {
            return;
        }

        // Handle weapon-specific modifiers
        if (upgrade.type === 'weaponModifier') {
            if (upgrade.additionalProjectiles) {
                this.baseProjectileCount += upgrade.additionalProjectiles;
            }
            if (upgrade.damageBonus) {
                this.baseDamageMultiplier *= upgrade.damageBonus;
            }
            if (upgrade.speedBonus) {
                this.baseSpeedMultiplier *= upgrade.speedBonus;
            }
            if (upgrade.arcSpreadBonus) {
                this.arcSpread *= upgrade.arcSpreadBonus;
            }
            return;
        }

        // Handle standard upgrade types
        switch (upgrade.type) {
            case 'attackSpeed':
            case 'attackDamage':
            case 'projectileCount':
            case 'projectileSpread':
            case 'piercing':
            case 'projectileSpeed':
            case 'critChance':
            case 'critDamage':
            case 'explosive':
            case 'lifesteal':
                this._needsRecalc = true;
                break;
            default:
                break;
        }
    }
}

// Register the weapon type
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Weapons = window.Game.Weapons || {};
    if (typeof window.Game.Weapons.registerType === 'function') {
        window.Game.Weapons.registerType('void_scythe', VoidScytheWeapon);
    }
}

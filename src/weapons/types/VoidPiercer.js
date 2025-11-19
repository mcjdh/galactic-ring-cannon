/**
 * VoidPiercerWeapon - High-damage precision rifle that excels at critical hits
 * and penetrating shots. Designed for the Void Reaver character.
 *
 * Core mechanics:
 * - Slower fire rate, higher damage per shot
 * - Enhanced critical hit scaling
 * - Long-range precision targeting
 * - Natural piercing capability
 * - Scales with low health (via character passive)
 */
class VoidPiercerWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;
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
        let effectiveRate = Math.max(0.05, playerRate * normalizedModifier);

        // Void Reaver passive: gain attack speed as health decreases
        if (this.player?.stats) {
            const healthPercent = this.player.stats.health / this.player.stats.maxHealth;
            // Below 50% health, gain up to 30% attack speed bonus
            if (healthPercent < 0.5) {
                const lowHealthBonus = 1 + ((0.5 - healthPercent) * 0.6); // 0-30% bonus
                effectiveRate *= lowHealthBonus;
            }
        }

        return effectiveRate;
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

        // Sync legacy combat fields for debugging/UI
        this.combat.attackCooldown = this.cooldown;
        this._needsRecalc = false;
    }

    onEquip() {
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

        if (!Number.isFinite(this.cooldown) || this.cooldown <= 0) {
            return;
        }

        this.timer += deltaTime;
        this.combat.attackTimer = this.timer;

        if (this.timer >= this.cooldown) {
            this.timer -= this.cooldown;
            const fired = this.fire(game);
            if (!fired) {
                // If no target, reset timer for quick retry
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

        // Enhanced damage based on low health (Void Reaver passive)
        let damageBonus = 1.0;
        if (this.player?.stats) {
            const healthPercent = this.player.stats.health / this.player.stats.maxHealth;
            // Below 50% health, gain up to 40% damage bonus
            if (healthPercent < 0.5) {
                damageBonus = 1 + ((0.5 - healthPercent) * 0.8); // 0-40% bonus
            }
        }

        const baseDamageMult = this.definition?.projectileTemplate?.damageMultiplier || 1.0;
        const finalDamageMult = baseDamageMult * damageBonus;

        // Build overrides with enhanced critical hit scaling
        const overrides = {
            damageMultiplier: finalDamageMult,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier || 1.3,
            applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false,
            // Void Piercer benefits more from crits
            critDamageBonus: 0.15 // +15% crit damage for this weapon
        };

        this.combat.fireProjectile(game, baseAngle, overrides);

        return true;
    }

    fireImmediate(game) {
        // Reset timer so cadence feels consistent with manual triggers
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
        window.Game.Weapons.registerType('void_piercer', VoidPiercerWeapon);
    }
}

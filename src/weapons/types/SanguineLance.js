/**
 * SanguineLanceWeapon - Fast-firing vampiric weapon that synergizes with lifesteal.
 * Designed for the Crimson Reaver character.
 *
 * Core mechanics:
 * - Fast fire rate for consistent healing
 * - Natural piercing for multi-target lifesteal
 * - Crimson visual effects
 */
class SanguineLanceWeapon {
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
        if (!window.optimizedParticles) return;
        
        const pool = window.optimizedParticles;
        const poolPressure = pool.activeParticles.length / pool.maxParticles;
        const isHighLoad = poolPressure > 0.7;

        if (isHighLoad && Math.random() > 0.5) return;

        const speed = 100 + Math.random() * 50;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        pool.spawnParticle({
            x: this.player.x,
            y: this.player.y,
            vx,
            vy,
            size: 2 + Math.random() * 2,
            color: '#e74c3c', // Crimson
            life: 0.15,
            type: 'spark'
        });
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

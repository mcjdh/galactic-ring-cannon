/**
 * PhantomRepeaterWeapon - A ricochet-focused twin projectile weapon
 *
 * The Phantom Striker's signature weapon that fires dual void-charged projectiles
 * designed to bounce between enemies. Works in synergy with the character's
 * guaranteed ricochet ability.
 *
 * Features:
 * - Fires 2 projectiles with slight spread
 * - Medium-fast fire rate (1.05 shots/sec)
 * - Balanced damage output
 * - Optimized for ricochet builds
 */
class PhantomRepeaterWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;

        // Phantom-specific properties
        this.baseProjectileCount = 2; // Twin projectiles
        this.baseSpread = 10;         // Slight spread for coverage
    }

    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || this.definition.fireRate || 1.05;
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

        // Sync legacy combat fields for debugging/UI
        this.combat.attackCooldown = this.cooldown;
        this._needsRecalc = false;
    }

    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
    }

    onUnequip() {
        // Cleanup if needed
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
                // If no target, reset timer to retry quickly
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

        // Play sound effect
        if (window.audioSystem?.playBossBeat) {
            window.audioSystem.playBossBeat();
        }

        // Create phantom particle effect at firing position
        this._createPhantomMuzzleFlash(game);

        // Build overrides for projectile properties
        const overrides = {
            damageMultiplier: this.definition?.projectileTemplate?.damageMultiplier || 1.0,
            speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier || 1.05,
            applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false
        };

        // Fire the twin projectiles
        // The weapon's projectile count in definition is handled by combat system
        this.combat.fireProjectile(game, baseAngle, overrides);

        return true;
    }

    /**
     * Create a ghostly muzzle flash effect unique to Phantom Repeater
     */
    _createPhantomMuzzleFlash(game) {
        if (!game?.particleEngine) return;

        const x = this.player.x;
        const y = this.player.y;
        const particleCount = 8;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 120 + Math.random() * 80;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            game.particleEngine.emit({
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                color: '#da70d6',  // Violet/phantom color
                radius: 3,
                life: 0.3,
                alpha: 0.8,
                decay: 0.95,
                glow: true
            });
        }
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
        // Handle ricochet-specific upgrades
        switch (upgrade.id) {
            case 'phantom_phase':
                // Weapon-specific upgrade: enhanced ricochet range
                if (this.player?.abilities) {
                    this.player.abilities.ricochetRange *= 1.3;
                }
                break;

            case 'void_amplifier':
                // Weapon-specific upgrade: ricochet damage bonus
                if (this.player?.abilities) {
                    this.player.abilities.ricochetDamage *= 1.15;
                }
                break;

            default:
                break;
        }

        // Mark for recalculation on combat stat changes
        switch (upgrade.type) {
            case 'attackSpeed':
            case 'attackDamage':
            case 'projectileCount':
            case 'projectileSpread':
            case 'piercing':
            case 'projectileSpeed':
            case 'critChance':
            case 'critDamage':
            case 'ricochet':
                this._needsRecalc = true;
                break;
            default:
                break;
        }
    }
}

// Register the weapon type globally
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Weapons = window.Game.Weapons || {};
    if (typeof window.Game.Weapons.registerType === 'function') {
        window.Game.Weapons.registerType('phantom_repeater', PhantomRepeaterWeapon);
    }
}

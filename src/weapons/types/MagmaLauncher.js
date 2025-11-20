/**
 * MagmaLauncherWeapon - Explosive fire weapon that lobs magma charges.
 * Creates burning and explosive effects.
 */
class MagmaLauncherWeapon {
    constructor({ player, combat, definition, manager }) {
        this.player = player;
        this.combat = combat;
        this.definition = definition || {};
        this.manager = manager;

        this.timer = 0;
        this.cooldown = 0;
        this._needsRecalc = true;

        // Weapon stats from definition
        const template = this.definition.projectileTemplate || {};
        this.baseDamageMultiplier = template.damageMultiplier || 1.5;
        this.baseSpeedMultiplier = template.speedMultiplier || 0.8;
        this.baseProjectileCount = template.count || 1;
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



    _playFireSound() {
        if (window.audioSystem?.play) {
            window.audioSystem.play('shoot', 0.25);
        }
    }

    onEquip() {
        this._needsRecalc = true;
        this.timer = 0;
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

        // Fire magma charge
        this.combat.fireProjectile(game, targetAngle, {
            damageMultiplier: this.baseDamageMultiplier,
            speedMultiplier: this.baseSpeedMultiplier,
            color: '#ff4500', // Magma orange
            type: 'magma',
            applyBehaviors: true,
            additionalProjectiles: this.baseProjectileCount - 1,
            // [FIX] Use onProjectileSpawn to add BurnBehavior (onHit doesn't exist in fireProjectile API)
            onProjectileSpawn: (projectile) => {
                const BurnBehaviorClass = window.BurnBehavior;
                if (projectile?.behaviorManager?.addBehavior && typeof BurnBehaviorClass === 'function') {
                    projectile.behaviorManager.addBehavior(new BurnBehaviorClass(projectile, {
                        damage: 5 * this.baseDamageMultiplier,
                        duration: 3,
                        chance: 1.0  // Always apply burn on hit
                    }));
                } else {
                    // Log error if BurnBehavior is missing - helps debug load failures
                    if (!projectile?.behaviorManager) {
                        window.logger.error('[MagmaLauncher] Projectile missing behaviorManager - burn effect disabled');
                    } else if (typeof BurnBehaviorClass !== 'function') {
                        window.logger.error('[MagmaLauncher] BurnBehavior class not loaded - burn effect disabled. Check if BurnBehavior.js loaded correctly.');
                    }
                }
            }
        });

        // Visual effects
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

        // Magma Launcher synergizes with explosive and fire paths
        if (upgrade.weaponTags &&
            !upgrade.weaponTags.includes('fire') &&
            !upgrade.weaponTags.includes('explosive') &&
            !upgrade.weaponTags.includes('heavy')) {
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
        window.Game.Weapons.registerType('magma_launcher', MagmaLauncherWeapon);
    }
}

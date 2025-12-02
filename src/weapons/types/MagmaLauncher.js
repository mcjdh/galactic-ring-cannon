/**
 * MagmaLauncherWeapon - Explosive fire weapon that lobs magma charges.
 * Extends WeaponBase for shared fire rate/cooldown logic.
 * Creates burning and explosive effects.
 */
class MagmaLauncherWeapon extends window.Game.WeaponBase {
    constructor({ player, combat, definition, manager }) {
        super({ player, combat, definition, manager });

        // Weapon stats from definition
        const template = this.definition.projectileTemplate || {};
        this.baseDamageMultiplier = template.damageMultiplier || 1.5;
        this.baseSpeedMultiplier = template.speedMultiplier || 0.8;
        this.baseProjectileCount = template.count || 1;
    }

    _playFireSound() {
        if (window.audioSystem?.play) {
            window.audioSystem.play('shoot', 0.25);
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
                    // [TELEMETRY] Track BurnBehavior failures for debugging
                    // Increment counter to know how often this happens in production
                    if (!MagmaLauncherWeapon._burnFailures) {
                        MagmaLauncherWeapon._burnFailures = { noBehaviorManager: 0, noBurnClass: 0 };
                    }
                    
                    if (!projectile?.behaviorManager) {
                        MagmaLauncherWeapon._burnFailures.noBehaviorManager++;
                        // Only log first few errors to avoid spam
                        if (MagmaLauncherWeapon._burnFailures.noBehaviorManager <= 3) {
                            window.logger.error('[MagmaLauncher] Projectile missing behaviorManager - burn effect disabled');
                        }
                    } else if (typeof BurnBehaviorClass !== 'function') {
                        MagmaLauncherWeapon._burnFailures.noBurnClass++;
                        if (MagmaLauncherWeapon._burnFailures.noBurnClass <= 3) {
                            window.logger.error('[MagmaLauncher] BurnBehavior class not loaded - burn effect disabled. Check if BurnBehavior.js loaded correctly.');
                        }
                    }
                }
            }
        });

        // Visual effects
        this._playFireSound();
        this._createMuzzleFlash(targetAngle);

        return true;
    }

    _createMuzzleFlash(angle) {
        const ParticleHelpers = window.Game?.ParticleHelpers;
        if (ParticleHelpers?.createMuzzleFlash) {
            // Magma flash is heavier, more smoke
            ParticleHelpers.createMuzzleFlash(this.player.x, this.player.y, angle, {
                color: '#ff4500',
                secondaryColor: '#2d3436', // Dark smoke
                count: 8,
                spread: 0.4,
                speed: 100,
                speedVariance: 80,
                size: 4,
                sizeVariance: 3,
                life: 0.4
            });
        }
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

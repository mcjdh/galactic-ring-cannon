/**
 * PhantomRepeaterWeapon - A ricochet-focused twin projectile weapon
 * Extends WeaponBase for shared fire rate/cooldown logic.
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
class PhantomRepeaterWeapon extends window.Game.WeaponBase {
    constructor({ player, combat, definition, manager }) {
        super({ player, combat, definition, manager });

        // Phantom-specific properties
        this.baseProjectileCount = 2; // Twin projectiles
        this.baseSpread = 10;         // Slight spread for coverage
    }

    _getBaseAttackSpeed() {
        return this.combat?.baseAttackSpeed || this.definition.fireRate || 1.05;
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

            if (window.optimizedParticles) {
                window.optimizedParticles.spawnParticle({
                    x,
                    y,
                    vx,
                    vy,
                    color: '#da70d6',  // Violet/phantom color
                    size: 3,
                    life: 0.3,
                    alpha: 0.8,
                    decay: 0.95,
                    glow: true
                });
            }
        }
    }

    applyUpgrade(upgrade) {
        if (!upgrade) return;

        const abilities = this.player?.abilities;
        if (abilities) {
            switch (upgrade.id) {
                case 'phantom_phase': {
                    const baseRange = Math.max(abilities.ricochetRange || 280, 1);
                    if (typeof upgrade.rangeMultiplier === 'number') {
                        abilities.ricochetRange = baseRange * upgrade.rangeMultiplier;
                    }
                    if (typeof upgrade.rangeBonus === 'number') {
                        abilities.ricochetRange = (abilities.ricochetRange || baseRange) + upgrade.rangeBonus;
                    }
                    if (typeof upgrade.bonusBounces === 'number') {
                        abilities.ricochetBounces += upgrade.bonusBounces;
                    }
                    if (typeof upgrade.chanceBonus === 'number') {
                        const currentChance = abilities.ricochetChance || 0.45;
                        abilities.ricochetChance = Math.min(0.99, currentChance + upgrade.chanceBonus);
                    }
                    break;
                }

                case 'void_amplifier': {
                    if (typeof upgrade.damageMultiplier === 'number') {
                        const currentDamage = abilities.ricochetDamage || 0.8;
                        abilities.ricochetDamage = currentDamage * upgrade.damageMultiplier;
                    }
                    if (typeof upgrade.damageAdd === 'number') {
                        abilities.ricochetDamage = (abilities.ricochetDamage || 0.8) + upgrade.damageAdd;
                    }
                    if (typeof upgrade.finalExplosionDamage === 'number') {
                        abilities.ricochetFinalExplosionDamage = Math.max(
                            abilities.ricochetFinalExplosionDamage || 0,
                            upgrade.finalExplosionDamage
                        );
                    }
                    if (typeof upgrade.finalExplosionRadius === 'number') {
                        abilities.ricochetFinalExplosionRadius = Math.max(
                            abilities.ricochetFinalExplosionRadius || 0,
                            upgrade.finalExplosionRadius
                        );
                    }
                    break;
                }

                case 'spectral_echoes': {
                    if (typeof upgrade.echoChance === 'number') {
                        abilities.ricochetEchoChance = Math.min(
                            0.95,
                            (abilities.ricochetEchoChance || 0) + upgrade.echoChance
                        );
                    }
                    if (typeof upgrade.echoBounces === 'number') {
                        abilities.ricochetEchoBounces = Math.max(
                            abilities.ricochetEchoBounces || 0,
                            upgrade.echoBounces
                        );
                    }
                    if (typeof upgrade.bonusBounces === 'number') {
                        abilities.ricochetBounces += upgrade.bonusBounces;
                    }
                    break;
                }

                default:
                    break;
            }
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

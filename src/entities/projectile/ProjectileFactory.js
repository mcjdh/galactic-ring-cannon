/**
 * ProjectileFactory - Creates projectiles with upgrades applied
 * This is the single place where player upgrades get converted to projectile behaviors
 *
 * 🌊 RESONANT PATTERN: All upgrade → behavior mapping happens here
 * No more scattered configuration logic!
 */
class ProjectileFactory {
    /**
     * Create a projectile with all player upgrades applied
     *
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} vx - X velocity
     * @param {number} vy - Y velocity
     * @param {number} damage - Base damage
     * @param {boolean} isCrit - Is critical hit
     * @param {object} player - Player object with abilities/stats
     * @returns {Projectile} - Fully configured projectile
     */
    static create(x, y, vx, vy, damage, isCrit, player) {
        // Create base projectile
        const projectile = new Projectile(x, y, vx, vy, damage, isCrit);

        // Apply crit bonuses
        if (isCrit) {
            projectile.vx *= 1.15;
            projectile.vy *= 1.15;
        }

        // Apply lifesteal
        if (player.stats && player.stats.lifestealAmount > 0) {
            projectile.lifesteal = player.stats.lifestealAmount;
            if (isCrit && player.stats.lifestealCritMultiplier > 1) {
                projectile.lifesteal *= player.stats.lifestealCritMultiplier;
            }
        }

        // Add behaviors based on player abilities
        this._applyBehaviors(projectile, player);

        return projectile;
    }

    /**
     * Apply all player ability behaviors to projectile
     */
    static _applyBehaviors(projectile, player) {
        const abilities = player.abilities;
        if (!abilities) return;

        const combat = player.combat;

        // Piercing Behavior
        if (combat && typeof combat.piercing === 'number' && combat.piercing > 0) {
            const piercingBehavior = new PiercingBehavior(projectile, {
                charges: combat.piercing
            });
            projectile.behaviorManager.addBehavior(piercingBehavior);
        }

        // Chain Lightning Behavior (chance-based)
        if (abilities.hasChainLightning && Math.random() < (abilities.chainChance || 0.4)) {
            const chainBehavior = new ChainBehavior(projectile, {
                maxChains: abilities.maxChains || 2,
                range: abilities.chainRange || 180,
                damageMultiplier: abilities.chainDamage || 0.75
            });
            projectile.behaviorManager.addBehavior(chainBehavior);
        }

        // Explosive Behavior (chance-based)
        if (abilities.hasExplosiveShots && Math.random() < (abilities.explosiveChance || 0.3)) {
            const explosiveBehavior = new ExplosiveBehavior(projectile, {
                radius: abilities.explosionRadius || 90,
                damageMultiplier: abilities.explosionDamage || 0.85
            });
            projectile.behaviorManager.addBehavior(explosiveBehavior);
        }

        // Ricochet Behavior (chance-based)
        if (abilities.hasRicochet && Math.random() < (abilities.ricochetChance || 0.25)) {
            const ricochetBehavior = new RicochetBehavior(projectile, {
                bounces: abilities.ricochetBounces || 2,
                range: abilities.ricochetRange || 180,
                damageMultiplier: 0.8
            });
            projectile.behaviorManager.addBehavior(ricochetBehavior);
        }

        // Homing Behavior (chance-based)
        if (abilities.hasHomingShots && Math.random() < (abilities.homingChance || 0.2)) {
            const homingBehavior = new HomingBehavior(projectile, {
                turnSpeed: abilities.homingTurnSpeed || 2.0,
                range: 250
            });
            projectile.behaviorManager.addBehavior(homingBehavior);
        }
    }

    /**
     * Create multiple projectiles for multi-shot/volley
     */
    static createVolley(x, y, baseAngle, count, spread, speed, damage, isCrit, player) {
        const projectiles = [];

        for (let i = 0; i < count; i++) {
            // Calculate angle for this projectile
            let angle;
            if (count === 1) {
                angle = baseAngle;
            } else if (count === 2) {
                angle = baseAngle + (i === 0 ? -spread / 2 : spread / 2);
            } else {
                angle = baseAngle - spread / 2 + (spread * i) / (count - 1);
            }

            // Calculate velocity
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            // Create projectile with upgrades
            const projectile = this.create(x, y, vx, vy, damage, isCrit, player);
            projectiles.push(projectile);
        }

        return projectiles;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.ProjectileFactory = ProjectileFactory;
}

/**
 * ProjectileFactory - Creates projectiles with upgrades applied
 * This is the single place where player upgrades get converted to projectile behaviors
 *
 * 🌊 RESONANT PATTERN: All upgrade → behavior mapping happens here
 * No more scattered configuration logic!
 * 
 * ⚠️ CRITICAL: This factory MUST be used for all player projectile creation!
 * Using 'new Projectile()' directly will bypass behavior attachment (burn, chain, etc.)
 * See docs/CRITICAL_BUG_PROJECTILE_FACTORY_BYPASS.md for details.
 */
class ProjectileFactory {
    /**
     * Create a projectile with all player upgrades applied
     *
     * Supports both the legacy signature `(x, y, vx, vy, damage, isCrit, player)`
     * and the modern config signature `(x, y, config, player, ownerId)`.
     */
    static create(x, y, vxOrConfig, vy, damage, isCrit, player, ownerId = 'player') {
        const {
            config,
            resolvedPlayer,
            resolvedOwner
        } = this._normalizeInputs(vxOrConfig, vy, damage, isCrit, player, ownerId);

        let projectile;
        if (window.projectilePool) {
            projectile = window.projectilePool.acquire(x, y, config, resolvedOwner);
        } else {
            projectile = new Projectile(x, y, config, resolvedOwner);
        }

        this._applyCritModifiers(projectile, config);
        this._applyLifesteal(projectile, resolvedPlayer, config);
        this._applyBehaviors(projectile, resolvedPlayer, {
            applyBehaviors: config.applyBehaviors !== false,
            forcedSpecialTypes: config.forcedSpecialTypes || []
        });

        return projectile;
    }

    static _applyBehaviors(projectile, player, options = {}) {
        const abilities = player?.abilities || {};
        const combat = player?.combat;

        const forcedTypes = new Set();
        if (Array.isArray(options.forcedSpecialTypes)) {
            for (const type of options.forcedSpecialTypes) {
                if (typeof type === 'string') {
                    forcedTypes.add(type.toLowerCase());
                }
            }
        }
        const allowBehaviors = options.applyBehaviors !== false;
        const shouldApply = (type, condition) => {
            if (forcedTypes.has(type)) {
                return true;
            }
            // Check if behavior already exists (prevent duplication from pooling/reset)
            if (projectile.behaviorManager.hasBehavior(type)) {
                return false;
            }
            return allowBehaviors && condition;
        };

        if (combat && typeof combat.piercing === 'number' && combat.piercing > 0) {
            const charges = Math.max(0, combat.piercing);
            if (charges > 0) {
                const piercingBehavior = new PiercingBehavior(projectile, { charges });
                projectile.behaviorManager.addBehavior(piercingBehavior);
            }
        }

        const chainChance = typeof abilities.chainChance === 'number' ? abilities.chainChance : 0.4;
        const chainCondition = abilities.hasChainLightning && Math.random() < chainChance;
        if (shouldApply('chain', chainCondition)) {
            const chainConfig = {
                maxChains: Math.max(abilities.maxChains || 0, 2),
                range: Math.max(abilities.chainRange || 0, 240),
                damageMultiplier: (typeof abilities.chainDamage === 'number' && abilities.chainDamage > 0)
                    ? abilities.chainDamage
                    : 0.8,
                used: 0
            };
            const chainBehavior = new ChainBehavior(projectile, chainConfig);
            projectile.behaviorManager.addBehavior(chainBehavior);
            projectile.hasChainLightning = true;
            projectile.chainData = { ...chainConfig };
            if (projectile.specialType === 'chain') {
                projectile.special = { ...chainConfig };
            }
        }

        const explosiveChance = typeof abilities.explosiveChance === 'number' ? abilities.explosiveChance : 0.3;
        const explosiveCondition = abilities.hasExplosiveShots && Math.random() < explosiveChance;
        if (shouldApply('explosive', explosiveCondition)) {
            const explosiveConfig = {
                radius: abilities.explosionRadius || 100,
                damageMultiplier: abilities.explosionDamage > 0 ? abilities.explosionDamage : 0.9,
                exploded: false
            };
            const explosiveBehavior = new ExplosiveBehavior(projectile, explosiveConfig);
            projectile.behaviorManager.addBehavior(explosiveBehavior);
            projectile.hasExplosive = true;
            projectile.explosiveData = { ...explosiveConfig };
        }

        const ricochetChance = typeof abilities.ricochetChance === 'number' ? abilities.ricochetChance : 0.25;
        const ricochetHasGuarantee = abilities.hasGuaranteedRicochet === true;
        const ricochetCondition = ricochetHasGuarantee
            ? (abilities.hasRicochet || ricochetHasGuarantee)
            : (abilities.hasRicochet && Math.random() < ricochetChance);
        if (shouldApply('ricochet', ricochetCondition)) {
            const ricochetConfig = {
                bounces: Math.max(abilities.ricochetBounces || 0, 2),
                range: Math.max(abilities.ricochetRange || 0, 320),
                damageMultiplier: Math.min(1, Math.max(abilities.ricochetDamage || 0.85, 0.5)),
                used: 0
            };
            const ricochetBehavior = new RicochetBehavior(projectile, ricochetConfig);
            projectile.behaviorManager.addBehavior(ricochetBehavior);
            projectile.hasRicochet = true;
            projectile.ricochetData = { ...ricochetConfig };
            if (projectile.specialType === 'ricochet') {
                projectile.special = { ...ricochetConfig };
            }
        }

        const homingChance = typeof abilities.homingChance === 'number' ? abilities.homingChance : 0.2;
        const homingCondition = abilities.hasHomingShots && Math.random() < homingChance;
        if (shouldApply('homing', homingCondition)) {
            const homingConfig = {
                turnSpeed: Math.max(abilities.homingTurnSpeed || 0, 3),
                range: Math.max(abilities.homingRange || 0, 250)
            };
            const homingBehavior = new HomingBehavior(projectile, homingConfig);
            projectile.behaviorManager.addBehavior(homingBehavior);
            projectile.hasHoming = true;
            projectile.homingData = { ...homingConfig };
            if (projectile.specialType === 'homing' && projectile.special) {
                projectile.special.range = Math.max(projectile.special.range, homingConfig.range);
                projectile.special.turnSpeed = Math.max(projectile.special.turnSpeed, homingConfig.turnSpeed);
            }
        }

        if (shouldApply('burn', abilities.hasBurn)) {
            const burnBehavior = new BurnBehavior(projectile, {
                damage: abilities.burnDamage || 5,
                duration: abilities.burnDuration || 3.0,
                chance: abilities.burnChance || 0.2,
                explosionDamage: abilities.burnExplosionDamage || 0,
                explosionRadius: abilities.burnExplosionRadius || 0
            });
            projectile.behaviorManager.addBehavior(burnBehavior);
        }
    }

    static _applyCritModifiers(projectile, config) {
        if (!config.isCrit) return;
        projectile.vx *= 1.15;
        projectile.vy *= 1.15;
        projectile.radius *= 1.3;
        if (projectile.config) {
            projectile.config.radius = projectile.radius;
        }
    }

    static _applyLifesteal(projectile, player, config) {
        const stats = player?.stats;
        const streakBonuses = stats?.getKillStreakBonuses?.() || { lifesteal: 0 };
        const baseLifesteal = typeof config.lifesteal === 'number'
            ? config.lifesteal
            : (stats?.lifestealAmount || 0);
        let totalLifesteal = baseLifesteal + (streakBonuses.lifesteal || 0);

        const critMultiplier = config.lifestealCritMultiplier || stats?.lifestealCritMultiplier || 1;
        if (config.isCrit && critMultiplier > 1) {
            totalLifesteal *= critMultiplier;
        }

        if (totalLifesteal > 0) {
            projectile.lifesteal = totalLifesteal;
            if (projectile.config) {
                projectile.config.lifesteal = totalLifesteal;
            }
            if (window.debugManager?.debugMode) {
                window.logger.log(`[ProjectileFactory] Lifesteal applied: ${totalLifesteal.toFixed(3)} (Base: ${baseLifesteal}, Streak: ${streakBonuses.lifesteal || 0})`);
            }
        } else {
            projectile.lifesteal = 0;
            if (projectile.config) {
                projectile.config.lifesteal = 0;
            }
        }
    }

    static _normalizeInputs(vxOrConfig, vy, damage, isCrit, player, ownerId) {
        let config;
        let resolvedPlayer = player;
        let resolvedOwner = ownerId || 'player';

        if (typeof vxOrConfig === 'object' && vxOrConfig !== null) {
            config = { ...vxOrConfig };
            resolvedPlayer = vy || player;
            resolvedOwner = damage || ownerId || 'player';
        } else {
            config = {
                vx: vxOrConfig,
                vy: vy,
                damage: damage,
                isCrit: isCrit
            };
        }

        if (!Number.isFinite(config.vx)) config.vx = 0;
        if (!Number.isFinite(config.vy)) config.vy = 0;
        if (!Number.isFinite(config.damage)) config.damage = 0;
        config.isCrit = !!config.isCrit;

        if (!Array.isArray(config.forcedSpecialTypes)) {
            config.forcedSpecialTypes = [];
        } else {
            config.forcedSpecialTypes = [...config.forcedSpecialTypes];
        }

        if (config.specialType == null && config.forcedSpecialTypes.length > 0) {
            config.specialType = config.forcedSpecialTypes[0];
        }

        if (!resolvedPlayer && window.gameEngine?.player) {
            resolvedPlayer = window.gameEngine.player;
        }
        if (!resolvedOwner) {
            resolvedOwner = 'player';
        }

        return { config, resolvedPlayer, resolvedOwner };
    }

    static createVolley(x, y, baseAngle, count, spread, speed, damage, isCrit, player) {
        const projectiles = [];

        for (let i = 0; i < count; i++) {
            let angle;
            if (count === 1) {
                angle = baseAngle;
            } else if (count === 2) {
                angle = baseAngle + (i === 0 ? -spread / 2 : spread / 2);
            } else {
                angle = baseAngle - spread / 2 + (spread * i) / (count - 1);
            }

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const projectile = this.create(x, y, {
                vx,
                vy,
                damage,
                isCrit
            }, player);
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

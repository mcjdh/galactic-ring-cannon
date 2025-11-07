class PlayerCombat {
    constructor(player) {
        this.player = player;

        const PLAYER_CONSTANTS = window.GAME_CONSTANTS?.PLAYER || {};

        // Attack properties
        this.attackSpeed = PLAYER_CONSTANTS.BASE_ATTACK_SPEED || 1.2;
        this.attackDamage = PLAYER_CONSTANTS.BASE_ATTACK_DAMAGE || 25;
        this.attackRange = PLAYER_CONSTANTS.BASE_ATTACK_RANGE || 300;
        this.attackTimer = 0;
        this.attackCooldown = this.attackSpeed > 0 ? 1 / this.attackSpeed : 1;
        this.baseAttackSpeed = this.attackSpeed;

        // Attack type flags
        this.hasBasicAttack = true;
        this.hasSpreadAttack = false;
        this.hasAOEAttack = false;

        // Projectile properties
        this.projectileSpeed = PLAYER_CONSTANTS.BASE_PROJECTILE_SPEED || 450;
        this.projectileCount = 1;
        this.projectileSpread = 0;
        this.piercing = 0;
        this.critChance = PLAYER_CONSTANTS.BASE_CRIT_CHANCE || 0.10;
        this.critMultiplier = PLAYER_CONSTANTS.BASE_CRIT_MULTIPLIER || 2.2;

        // AOE attack properties
        this.aoeAttackCooldown = PLAYER_CONSTANTS.AOE_ATTACK_COOLDOWN || 2.0;
        this.aoeAttackTimer = 0;
        this.aoeAttackRange = PLAYER_CONSTANTS.AOE_ATTACK_RANGE || 150;
        this.aoeDamageMultiplier = PLAYER_CONSTANTS.AOE_DAMAGE_MULTIPLIER || 0.6;

        // Mathematical balance constants for upgrade scaling
        this.BALANCE = {
            // Diminishing returns scaling factors
            ATTACK_SPEED_SCALING: 0.9,   // Each stack reduces effectiveness by 10%
            DAMAGE_SCALING: 0.95,        // Gradual diminishing for damage
            CRIT_SOFT_CAP: 0.8,         // 80% maximum crit chance
            MAX_PROJECTILE_SPEED: 1200,  // Prevent infinite speed exploits

            // Stack thresholds for different scaling behavior
            HIGH_STACK_THRESHOLD: 5,     // After 5 stacks, apply stronger diminishing
            EXTREME_STACK_THRESHOLD: 10, // After 10 stacks, cap further scaling
        };

        const WeaponManagerClass = (typeof window !== 'undefined' && window.Game?.WeaponManager) || null;
        this.weaponManager = WeaponManagerClass ? new WeaponManagerClass(player, this) : null;
        if (!this.weaponManager && window.debugManager?.debugMode) {
            window.logger.warn('[PlayerCombat] WeaponManager not available. Using legacy combat loop.');
        }
    }

    update(deltaTime, game) {
        if (this.weaponManager) {
            this.weaponManager.update(deltaTime, game);
        } else {
            this.updateAttackCooldown();
            this._legacyHandlePrimaryAttack(deltaTime, game);
        }

        this._updateAOEAttack(deltaTime, game);
    }

    updateAttackCooldown() {
        // Prevent division by zero and ensure minimum cooldown
        const safeAttackSpeed = Math.max(this.attackSpeed, 0.1);
        const newCooldown = 1 / safeAttackSpeed;
        if (this.attackCooldown !== newCooldown && this.attackCooldown > 0) {
            // Scale current timer proportionally to maintain timing consistency
            const timerProgress = this.attackTimer / this.attackCooldown;
            this.attackCooldown = newCooldown;
            this.attackTimer = timerProgress * this.attackCooldown;
        } else if (this.attackCooldown <= 0) {
            // Initialize with safe default
            this.attackCooldown = newCooldown;
        }
    }

    _legacyHandlePrimaryAttack(deltaTime, game) {
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            if (window.audioSystem?.playBossBeat) {
                window.audioSystem.playBossBeat();
            }
            this.attack(game);
        }
    }

    _updateAOEAttack(deltaTime, game) {
        if (this.hasAOEAttack) {
            this.aoeAttackTimer += deltaTime;
            if (this.aoeAttackTimer >= this.aoeAttackCooldown) {
                this.aoeAttackTimer = 0;
                this.executeAOEAttack(game);
            }
        }
    }

    attack(game) {
        if (this.weaponManager) {
            return this.weaponManager.fireImmediate(game);
        }
        return this._legacyAttack(game);
    }

    _legacyAttack(game) {
        if (!game) return;

        const nearestEnemy = game.findClosestEnemy?.(
            this.player.x,
            this.player.y,
            {
                maxRadius: this.attackRange,
                includeDead: false
            }
        );

        if (!nearestEnemy) return;

        // Calculate direction to enemy
        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        const baseAngle = Math.atan2(dy, dx);

        // Fire a volley; multi-shot handling is inside fireProjectile()
        this.fireProjectile(game, baseAngle);
    }

    executeAOEAttack(game) {
        if (!game) return;
        const enemies = game.getEnemiesWithinRadius?.(
            this.player.x,
            this.player.y,
            this.aoeAttackRange,
            {
                includeDead: false
            }
        ) ?? [];

        if (enemies.length === 0) return;

        // Create visual effect for AOE attack
        this.createAOEEffect();

        // Create AOE damage around player (optimized for loop)
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const isCrit = Math.random() < this.critChance;
            const baseDamage = this.attackDamage * this.aoeDamageMultiplier;
            const damage = isCrit ? baseDamage * this.critMultiplier : baseDamage;

            enemy.takeDamage(damage);

            if (isCrit) {
                window.gameManager?.statsManager?.trackSpecialEvent?.('critical_hit');
                const gm = window.gameManager || window.gameManagerBridge;
                if (gm?.showFloatingText) {
                    gm.showFloatingText(`CRIT! ${Math.round(damage)}`, enemy.x, enemy.y - 20, '#f1c40f', 16);
                }
            }
        }

        // Play AOE attack sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('aoeAttack', 0.4);
        }
    }

    createAOEEffect() {
        // Visual effect for AOE attack
        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();
        if (stats?.lowQuality) return;

        const particleCount = helpers?.calculateSpawnCount?.(24)
            ?? Math.floor(24 * Math.min(window.gameManager?.particleReductionFactor || 1, 1));

        if (particleCount <= 0) return;
        const radius = this.aoeAttackRange;
        const FastMath = window.Game?.FastMath;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            // Use FastMath.sincos for 5x speedup on ARM (called multiple times per attack)
            const { sin, cos } = FastMath ? FastMath.sincos(angle) : { sin: Math.sin(angle), cos: Math.cos(angle) };
            const x = this.player.x + cos * radius;
            const y = this.player.y + sin * radius;
            this.player.spawnParticle(
                this.player.x,
                this.player.y,
                cos * 300,
                sin * 300,
                3 + Math.random() * 3,
                '#3498db',
                0.3,
                'spark'
            );
        }
    }

    findNearestEnemy() {
        const game = window.gameEngine || window.gameManager?.game;
        return game?.findClosestEnemy?.(
            this.player.x,
            this.player.y,
            {
                includeDead: false,
                maxRadius: this.attackRange,
                useSpatialGrid: true
            }
        ) ?? null;
    }

    fireProjectile(game, angle, overrides = {}) {
        // Clean split shot implementation - consistent math for any projectile count
        let projectileCount;
        if (overrides.projectileCount !== undefined) {
            // Legacy: Direct override (replaces player's count)
            projectileCount = Math.max(1, Math.floor(overrides.projectileCount));
        } else if (overrides.additionalProjectiles !== undefined) {
            // New: Add to player's count (weapons should use this)
            const baseCount = Math.max(1, Math.floor(this.projectileCount || 1));
            projectileCount = baseCount + Math.max(0, Math.floor(overrides.additionalProjectiles));
        } else {
            // Default: Use player's projectile count
            projectileCount = Math.max(1, Math.floor(this.projectileCount || 1));
        }

        const speedMultiplier = overrides.speedMultiplier !== undefined ? overrides.speedMultiplier : 1;
        const baseSpeedStat = this.projectileSpeed || 450;
        const baseSpeed = Math.max(50, baseSpeedStat * speedMultiplier);

        // Calculate total spread arc - default based on projectile count for good visuals
        let totalSpreadRadians = 0;
        let spreadDegrees = overrides.spreadDegrees;
        if (spreadDegrees === undefined) {
            if (projectileCount > 1) {
                // Calculate smart default: more projectiles = wider spread
                spreadDegrees = Math.min(60, 20 + (projectileCount * 8));
            } else {
                spreadDegrees = 0;
            }
        }
        // Add player's spread upgrades to the base spread (always additive, never replaces)
        if (this.projectileSpread > 0) {
            spreadDegrees += this.projectileSpread;
        }
        if (projectileCount > 1 && spreadDegrees > 0) {
            totalSpreadRadians = (spreadDegrees * Math.PI) / 180;
        }

        const damageMultiplier = overrides.damageMultiplier !== undefined ? overrides.damageMultiplier : 1;
        const piercingBase = overrides.piercingOverride !== undefined
            ? overrides.piercingOverride
            : this.piercing || 0;

        // Setup special effects configuration (each projectile rolls independently)
        const allowBehaviors = overrides.applyBehaviors !== undefined ? overrides.applyBehaviors : true;
        const forcedSpecialTypes = Array.isArray(overrides.forcedSpecialTypes) ? overrides.forcedSpecialTypes : [];

        // Fire projectiles using clean, consistent distribution
        for (let i = 0; i < projectileCount; i++) {
            const projectileAngle = this._calculateProjectileAngle(angle, i, projectileCount, totalSpreadRadians);
            const vx = Math.cos(projectileAngle) * baseSpeed;
            const vy = Math.sin(projectileAngle) * baseSpeed;

            // Calculate damage and crit for this projectile (each projectile can crit independently)
            const isCrit = Math.random() < (this.critChance || 0);
            const baseDamage = this.attackDamage * damageMultiplier;
            const damage = isCrit ? baseDamage * (this.critMultiplier || 2) : baseDamage;

            // Determine special effects for THIS projectile (independent roll per projectile)
            let projectileSpecialTypes = allowBehaviors ? this._determineSpecialTypesForShot() : [];
            if (forcedSpecialTypes.length > 0) {
                const merged = new Set(projectileSpecialTypes);
                forcedSpecialTypes.forEach(type => merged.add(type));
                projectileSpecialTypes = Array.from(merged);
            }
            const primaryType = projectileSpecialTypes[0] || null;

            // Debug logging for piercing value tracing
            if (window.debugProjectiles && piercingBase > 0) {
                console.log(`[PlayerCombat] Spawning projectile with piercing. base = ${piercingBase}`);
            }

            // Spawn the projectile - robust by design, no fallbacks needed
            const projectile = game.spawnProjectile(
                this.player.x,
                this.player.y,
                vx,
                vy,
                damage,
                piercingBase,
                isCrit,
                primaryType
            );

            if (projectile) {
                // Track projectile fired for statistics
                window.gameManager?.statsManager?.trackProjectileFired?.();
                
                if (isCrit) {
                    window.gameManager?.statsManager?.trackSpecialEvent?.('critical_hit');
                }
                if (window.debugProjectiles) {
                    console.log(`[PlayerCombat] Projectile ${projectile.id} spawned with piercing = ${projectile.piercing}`);
                }
                if (allowBehaviors || forcedSpecialTypes.length > 0) {
                    this._configureProjectileFromUpgrades(projectile, projectileSpecialTypes, damage, isCrit);
                }

                // NOTE: Piercing handled by new BehaviorManager system via setters
                // Old piercing normalization code kept for backwards compatibility
                const basePiercing = Number.isFinite(piercingBase) ? Math.max(0, piercingBase) : 0;
                if (projectile.piercing !== basePiercing) {
                    if (window.debugProjectiles) {
                        console.log(`[PlayerCombat] Normalizing projectile ${projectile.id} piercing: ${projectile.piercing} -> ${basePiercing}`);
                    }
                    projectile.piercing = basePiercing;
                }

                if (projectile.piercing > 0) {
                    projectile.originalPiercing = projectile.piercing;
                } else {
                    projectile.originalPiercing = 0;
                }

                // Apply ALL special types as properties (not just primary - EACH PROJECTILE ROLLS INDEPENDENTLY)
                if (projectileSpecialTypes.includes('chain')) {
                    projectile.hasChainLightning = true;
                }
                if (projectileSpecialTypes.includes('explosive')) {
                    projectile.hasExplosive = true;
                }
                if (projectileSpecialTypes.includes('ricochet')) {
                    projectile.hasRicochet = true;
                }
                if (projectileSpecialTypes.includes('homing')) {
                    projectile.hasHoming = true;
                }
            }
        }

        // Single sound effect per volley
        const soundKey = overrides.soundKey !== undefined ? overrides.soundKey : 'shoot';
        const soundVolume = overrides.soundVolume !== undefined ? overrides.soundVolume : 0.3;
        if (soundKey && window.audioSystem?.play) {
            window.audioSystem.play(soundKey, soundVolume);
        }
    }

    _calculateProjectileAngle(baseAngle, projectileIndex, totalProjectiles, totalSpread) {
        // Single, consistent formula that works for any projectile count:
        // Distribute projectiles evenly across the total spread arc

        if (totalProjectiles === 1) {
            return baseAngle; // Single shot goes straight
        }

        if (totalProjectiles === 2) {
            // Two projectiles: one left, one right of center
            return baseAngle + (projectileIndex === 0 ? -totalSpread/2 : totalSpread/2);
        }

        // For 3+ projectiles: distribute evenly from -spread/2 to +spread/2
        // This ensures odd counts have one projectile going straight
        const spreadPerGap = totalSpread / (totalProjectiles - 1);
        const offsetFromCenter = (projectileIndex - (totalProjectiles - 1) / 2) * spreadPerGap;

        return baseAngle + offsetFromCenter;
    }

    _determineSpecialTypesForShot() {
        const types = [];
        const abilities = this.player.abilities;

        // Use configurable chance values for consistent upgrade behavior
        if (abilities && abilities.hasChainLightning && Math.random() < (abilities.chainChance || 0.4)) {
            types.push('chain');
        }
        if (abilities && abilities.hasExplosiveShots && Math.random() < (abilities.explosiveChance || 0.3)) {
            types.push('explosive');
        }
        if (abilities && abilities.hasRicochet && Math.random() < (abilities.ricochetChance || 0.25)) {
            types.push('ricochet');
        }
        if (abilities && abilities.hasHomingShots && Math.random() < (abilities.homingChance || 0.2)) {
            types.push('homing');
        }

        return types;
    }

    _configureProjectileFromUpgrades(projectile, specialTypes, damage, isCrit) {
        // Note: Projectiles only support one special type at a time
        // Multiple special types in a volley are handled by consistent volley-wide application
        // The primary type is already set during projectile creation

        // Crit visual/speed boost
        if (isCrit) {
            projectile.radius *= 1.3;
            projectile.vx *= 1.15;
            projectile.vy *= 1.15;
        }

        // Lifesteal
        const stats = this.player.stats;
        if (stats && stats.lifestealAmount > 0) {
            projectile.lifesteal = stats.lifestealAmount;
            if (isCrit && stats.lifestealCritMultiplier > 1) {
                projectile.lifesteal *= stats.lifestealCritMultiplier;
            }
        }

        // Scale special types from player stats
        const abilities = this.player.abilities;
        for (const type of specialTypes) {
            switch (type) {
                case 'chain': {
                    if (!abilities) break;
                    const chainData = (projectile.specialType === 'chain' && projectile.special)
                        ? { ...projectile.special }
                        : (projectile.chainData ? { ...projectile.chainData } : { used: 0 });

                    chainData.maxChains = Math.max(chainData.maxChains || 0, abilities.maxChains || 2);
                    chainData.range = Math.max(chainData.range || 0, abilities.chainRange || 240);
                    const dmgMultiplier = (typeof abilities.chainDamage === 'number' && abilities.chainDamage > 0)
                        ? abilities.chainDamage
                        : 0.8;
                    chainData.damageMultiplier = dmgMultiplier;

                    projectile.hasChainLightning = true;
                    if (projectile.specialType === 'chain') {
                        projectile.special = chainData;
                    }
                    projectile.chainData = chainData;
                    break;
                }
                case 'explosive': {
                    if (!abilities) break;
                    const radius = abilities.explosionRadius || 70;  // INCREASED from 90
                    const damageMultiplier = abilities.explosionDamage > 0 ? abilities.explosionDamage : 0.6;  // INCREASED from 0.85
                    projectile.hasExplosive = true;
                    projectile.explosiveData = {
                        radius,
                        damageMultiplier,
                        exploded: false
                    };
                    break;
                }
                case 'ricochet': {
                    if (!abilities) break;
                    const ricochetData = (projectile.specialType === 'ricochet' && projectile.special)
                        ? { ...projectile.special }
                        : (projectile.ricochetData ? { ...projectile.ricochetData } : { used: 0 });

                    ricochetData.bounces = Math.max(ricochetData.bounces || 0, abilities.ricochetBounces || 2);
                    ricochetData.range = Math.max(ricochetData.range || 0, abilities.ricochetRange || 320);  // INCREASED from 260
                    // Damage multiplier dictates how much damage is retained per bounce
                    ricochetData.damageMultiplier = Math.min(1, Math.max(abilities.ricochetDamage || 0.85, 0.5));

                    projectile.hasRicochet = true;
                    if (projectile.specialType === 'ricochet') {
                        projectile.special = ricochetData;
                    }
                    projectile.ricochetData = ricochetData;
                    break;
                }
                case 'homing': {
                    if (!abilities) break;
                    projectile.hasHoming = true;
                    if (projectile.specialType === 'homing' && projectile.special) {
                        projectile.special.range = Math.max(projectile.special.range, abilities.homingRange || projectile.special.range);
                        projectile.special.turnSpeed = Math.max(projectile.special.turnSpeed, abilities.homingTurnSpeed || projectile.special.turnSpeed);
                    } else {
                        projectile.homingData = {
                            range: abilities.homingRange || 250,
                            turnSpeed: abilities.homingTurnSpeed || 3
                        };
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    // Helper method to apply crit damage with diminishing returns
    applyScaledCritDamage(baseCritDamageIncrease) {
        let scaledCritDamageIncrease = baseCritDamageIncrease;

        // Apply diminishing returns if crit multiplier gets very high
        if (this.critMultiplier > 4.0) {
            const excessMultiplier = (this.critMultiplier - 4.0) / 2.0;
            scaledCritDamageIncrease *= Math.max(0.3, 1 - excessMultiplier);
        }

        this.critMultiplier += scaledCritDamageIncrease;
    }

    // Upgrade application for combat-related upgrades
    applyCombatUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'attackSpeed':
                // Mathematically sound scaling with diminishing returns
                const baseIncrease = upgrade.multiplier - 1; // e.g., 1.15 -> 0.15
                const scalingFactor = Math.pow(0.9, upgrade.stackCount - 1); // Diminishing returns
                const adjustedIncrease = baseIncrease * scalingFactor;
                this.attackSpeed *= (1 + adjustedIncrease);
                // Don't update cooldown here - let updateAttackCooldown handle it
                break;

            case 'attackDamage':
                // Mathematical scaling with gradual diminishing returns
                const baseDamageIncrease = upgrade.multiplier - 1;
                const damageScaling = Math.pow(0.95, upgrade.stackCount - 1); // Gradual diminishing
                const adjustedDamageIncrease = baseDamageIncrease * damageScaling;
                this.attackDamage *= (1 + adjustedDamageIncrease);
                break;

            case 'projectileCount':
                // Clean projectile count upgrade - just add to the count
                this.projectileCount += upgrade.value;

                // Enable spread attack flag for UI/effects
                if (this.projectileCount > 1) {
                    this.hasSpreadAttack = true;
                }

                // Show upgrade feedback
                const gm = window.gameManager || window.gameManagerBridge;
                if (gm?.showFloatingText) {
                    gm.showFloatingText(
                        `Split Shot: ${this.projectileCount} projectiles`,
                        this.player.x, this.player.y - 60, '#f39c12', 16
                    );
                }
                break;

            case 'projectileSpread':
                this.projectileSpread += upgrade.value;
                break;

            case 'piercing':
                const oldPiercing = this.piercing;
                this.piercing += upgrade.value || 1; // Add piercing count
                if (window.debugProjectiles) {
                    console.log(`[PlayerCombat] Piercing upgrade applied: ${oldPiercing} -> ${this.piercing} (added ${upgrade.value || 1})`);
                }
                break;

            case 'projectileSpeed':
                // Apply scaling with soft cap to prevent infinite speed
                const currentSpeed = this.projectileSpeed;
                const baseSpeedIncrease = upgrade.multiplier - 1;
                let scaledIncrease = baseSpeedIncrease;

                // Apply diminishing returns for high speeds
                if (currentSpeed > 600) {
                    const speedRatio = currentSpeed / this.BALANCE.MAX_PROJECTILE_SPEED;
                    scaledIncrease *= Math.max(0.1, 1 - speedRatio);
                }

                this.projectileSpeed = Math.min(
                    this.BALANCE.MAX_PROJECTILE_SPEED,
                    currentSpeed * (1 + scaledIncrease)
                );
                break;

            case 'critChance':
                // Mathematical crit chance scaling with configurable soft cap
                const currentCrit = this.critChance;
                const baseCritIncrease = upgrade.value;
                const softCap = this.BALANCE.CRIT_SOFT_CAP;

                // Use exponential decay as we approach the soft cap
                const distanceFromCap = Math.max(0, softCap - currentCrit);
                const critScalingFactor = distanceFromCap / softCap;
                const adjustedCritIncrease = baseCritIncrease * critScalingFactor;

                this.critChance = Math.min(softCap, currentCrit + adjustedCritIncrease);

                // Also apply crit damage bonus if this upgrade provides it (dual-stat upgrade)
                if (upgrade.critDamageBonus && typeof upgrade.critDamageBonus === 'number') {
                    const critDamageBonusValue = upgrade.critDamageBonus;
                    this.applyScaledCritDamage(critDamageBonusValue);
                }
                break;

            case 'critDamage':
                // Crit damage with gradual diminishing returns for extreme values
                const baseCritDamageIncrease = upgrade.value;
                this.applyScaledCritDamage(baseCritDamageIncrease);
                break;

            case 'attackRange':
                // Attack range scaling - improves enemy detection for auto-targeting
                // Synergizes with ricochet (320), chain (240), explosive (70) by increasing search area
                const rangeMultiplier = upgrade.multiplier || 1.0;
                this.attackRange *= rangeMultiplier;

                // Show upgrade feedback with new range
                const gmRange = window.gameManager || window.gameManagerBridge;
                if (gmRange?.showFloatingText) {
                    gmRange.showFloatingText(
                        `Detection Range: ${Math.round(this.attackRange)}`,
                        this.player.x, this.player.y - 60, '#00d2ff', 16
                    );
                }
                break;
        }

        if (this.weaponManager) {
            this.weaponManager.notifyCombatStatChange();
        }
    }

    // Render AOE attack range indicator
    renderAOEIndicator(ctx) {
        if (this.hasAOEAttack) {
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.aoeAttackRange, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
        }
    }

    // Get debug information
    getDebugInfo() {
        return {
            attackSpeed: this.attackSpeed,
            attackDamage: this.attackDamage,
            attackRange: this.attackRange,
            projectileCount: this.projectileCount,
            projectileSpeed: this.projectileSpeed,
            critChance: this.critChance,
            critMultiplier: this.critMultiplier,
            hasAOEAttack: this.hasAOEAttack,
            hasSpreadAttack: this.hasSpreadAttack,
            // Balance information
            rangeScaling: `${(this.attackRange / (window.GAME_CONSTANTS?.PLAYER?.BASE_ATTACK_RANGE || 300) * 100).toFixed(0)}%`,
            speedScaling: `${(this.projectileSpeed / (window.GAME_CONSTANTS?.PLAYER?.BASE_PROJECTILE_SPEED || 450) * 100).toFixed(0)}%`,
            critCapUtilization: `${(this.critChance / this.BALANCE.CRIT_SOFT_CAP * 100).toFixed(0)}%`,
            attackCooldown: this.attackCooldown.toFixed(3),
            activeWeapon: this.weaponManager?.getActiveWeaponId?.() || 'legacy'
        };
    }
}

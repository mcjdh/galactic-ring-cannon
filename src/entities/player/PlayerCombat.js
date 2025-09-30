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
    }

    update(deltaTime, game) {
        // Update attack cooldown dynamically in case attack speed changed
        this.updateAttackCooldown();
        this.handleAttacks(deltaTime, game);
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

    handleAttacks(deltaTime, game) {
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            if (window.audioSystem?.playBossBeat) {
                window.audioSystem.playBossBeat();
            }
            this.attack(game);
        }

        // Handle AOE attack cooldown
        if (this.hasAOEAttack) {
            this.aoeAttackTimer += deltaTime;
            if (this.aoeAttackTimer >= this.aoeAttackCooldown) {
                this.aoeAttackTimer = 0;
                this.executeAOEAttack(game);
            }
        }
    }

    attack(game) {
        if (!game) return;
        const enemies = game.getEnemies?.() ?? game.enemies ?? [];
        if (!Array.isArray(enemies) || enemies.length === 0) return;

        // Find closest enemy for reference
        const nearestEnemy = this.findNearestEnemy(enemies);
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
        const enemies = game.getEnemies?.() ?? game.enemies ?? [];
        if (!Array.isArray(enemies) || enemies.length === 0) return;

        // Create visual effect for AOE attack
        this.createAOEEffect();

        // Create AOE damage around player
        enemies.forEach(enemy => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.aoeAttackRange) {
                const isCrit = Math.random() < this.critChance;
                const baseDamage = this.attackDamage * this.aoeDamageMultiplier;
                const damage = isCrit ?
                    baseDamage * this.critMultiplier :
                    baseDamage;

                enemy.takeDamage(damage);

                if (isCrit) {
                    const gm = window.gameManager || window.gameManagerBridge;
                    if (gm?.showFloatingText) {
                        gm.showFloatingText(`CRIT! ${Math.round(damage)}`, enemy.x, enemy.y - 20, '#f1c40f', 16);
                    }
                }
            }
        });

        // Play AOE attack sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('aoeAttack', 0.4);
        }
    }

    createAOEEffect() {
        // Visual effect for AOE attack
        const gm = window.gameManager;
        if (!gm || gm.lowQuality) return;
        const factor = (gm.particleReductionFactor || 1.0);
        const baseCount = 24;
        const particleCount = window.MathUtils ?
            window.MathUtils.budget(baseCount, factor, gm.maxParticles || 150, gm.particles?.length || 0) :
            Math.floor(baseCount * Math.min(factor || 1, 1));
        if (particleCount <= 0) return;
        const radius = this.aoeAttackRange;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const x = this.player.x + Math.cos(angle) * radius;
            const y = this.player.y + Math.sin(angle) * radius;
            this.player.spawnParticle(
                this.player.x,
                this.player.y,
                Math.cos(angle) * 300,
                Math.sin(angle) * 300,
                3 + Math.random() * 3,
                '#3498db',
                0.3,
                'spark'
            );
        }
    }

    findNearestEnemy(enemies) {
        if (!enemies?.length) return null;

        let nearestEnemy = null;
        let shortestDistanceSquared = Infinity;

        // Try spatial grid first for better performance with many enemies
        const game = window.gameEngine || window.gameManager?.game;
        if (game?.spatialGrid && game.gridSize > 0) {
            const gridSize = game.gridSize;
            const gx = Math.floor(this.player.x / gridSize);
            const gy = Math.floor(this.player.y / gridSize);

            // Check a 3x3 area around the player
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cell = game.spatialGrid.get(`${gx + dx},${gy + dy}`);
                    if (!cell) continue;

                    for (const enemy of cell) {
                        if (enemy?.isDead || enemy?.type !== 'enemy') continue;

                        const ddx = enemy.x - this.player.x;
                        const ddy = enemy.y - this.player.y;
                        const distanceSquared = ddx * ddx + ddy * ddy;

                        if (distanceSquared < shortestDistanceSquared) {
                            shortestDistanceSquared = distanceSquared;
                            nearestEnemy = enemy;
                        }
                    }
                }
            }
        }

        // If spatial grid didn't find anything, do linear search
        if (!nearestEnemy) {
            for (const enemy of enemies) {
                if (enemy?.isDead) continue;

                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared < shortestDistanceSquared) {
                    shortestDistanceSquared = distanceSquared;
                    nearestEnemy = enemy;
                }
            }
        }

        return nearestEnemy;
    }

    fireProjectile(game, angle) {
        // Clean split shot implementation - consistent math for any projectile count
        const projectileCount = Math.max(1, Math.floor(this.projectileCount || 1));
        const baseSpeed = Math.max(50, this.projectileSpeed || 450);

        // Calculate total spread arc - default based on projectile count for good visuals
        let totalSpreadRadians = 0;
        if (projectileCount > 1) {
            // Use explicitly set spread if available, otherwise calculate smart default
            let spreadDegrees;
            if (this.projectileSpread > 0) {
                // Use the explicitly set spread (from upgrades like "Wide Spread")
                spreadDegrees = this.projectileSpread;
            } else {
                // Calculate smart default: more projectiles = wider spread
                spreadDegrees = Math.min(60, 20 + (projectileCount * 8));
            }
            totalSpreadRadians = (spreadDegrees * Math.PI) / 180;
        }

        // Determine special effects ONCE per volley for consistency
        const volleySpecialTypes = this._determineSpecialTypesForShot();
        const primaryType = volleySpecialTypes[0] || null;

        // Fire projectiles using clean, consistent distribution
        for (let i = 0; i < projectileCount; i++) {
            const projectileAngle = this._calculateProjectileAngle(angle, i, projectileCount, totalSpreadRadians);
            const vx = Math.cos(projectileAngle) * baseSpeed;
            const vy = Math.sin(projectileAngle) * baseSpeed;

            // Calculate damage and crit for this projectile (each projectile can crit independently)
            const isCrit = Math.random() < (this.critChance || 0);
            const damage = isCrit ? this.attackDamage * (this.critMultiplier || 2) : this.attackDamage;

            // Debug logging for piercing value tracing
            if (window.debugProjectiles && this.piercing > 0) {
                console.log(`[PlayerCombat] Spawning projectile with piercing. this.piercing = ${this.piercing}`);
            }

            // Spawn the projectile - robust by design, no fallbacks needed
            const projectile = game.spawnProjectile(
                this.player.x, this.player.y, vx, vy, damage, this.piercing || 0, isCrit, primaryType
            );

            if (projectile) {
                if (window.debugProjectiles) {
                    console.log(`[PlayerCombat] Projectile ${projectile.id} spawned with piercing = ${projectile.piercing}`);
                }
                this._configureProjectileFromUpgrades(projectile, volleySpecialTypes, damage, isCrit);

                // NOTE: Piercing handled by new BehaviorManager system via setters
                // Old piercing normalization code kept for backwards compatibility
                const basePiercing = Number.isFinite(this.piercing) ? Math.max(0, this.piercing) : 0;
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

                // Apply ALL special types as properties (not just primary)
                if (volleySpecialTypes.includes('chain')) {
                    projectile.hasChainLightning = true;
                }
                if (volleySpecialTypes.includes('explosive')) {
                    projectile.hasExplosive = true;
                }
                if (volleySpecialTypes.includes('ricochet')) {
                    projectile.hasRicochet = true;
                }
                if (volleySpecialTypes.includes('homing')) {
                    projectile.hasHoming = true;
                }
            }
        }

        // Single sound effect per volley
        if (window.audioSystem?.play) {
            window.audioSystem.play('shoot', 0.3);
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
                    const radius = abilities.explosionRadius || 90;
                    const damageMultiplier = abilities.explosionDamage > 0 ? abilities.explosionDamage : 0.85;
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
                    ricochetData.range = Math.max(ricochetData.range || 0, abilities.ricochetRange || 260);
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
                break;

            case 'critDamage':
                // Crit damage with gradual diminishing returns for extreme values
                const baseCritDamageIncrease = upgrade.value;
                let scaledCritIncrease = baseCritDamageIncrease;

                // Apply diminishing returns if crit multiplier gets very high
                if (this.critMultiplier > 4.0) {
                    const excessMultiplier = (this.critMultiplier - 4.0) / 2.0; // Scale factor
                    scaledCritIncrease *= Math.max(0.3, 1 - excessMultiplier);
                }

                this.critMultiplier += scaledCritIncrease;
                break;
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
            speedScaling: `${(this.projectileSpeed / (window.GAME_CONSTANTS?.PLAYER?.BASE_PROJECTILE_SPEED || 450) * 100).toFixed(0)}%`,
            critCapUtilization: `${(this.critChance / this.BALANCE.CRIT_SOFT_CAP * 100).toFixed(0)}%`,
            attackCooldown: this.attackCooldown.toFixed(3)
        };
    }
}

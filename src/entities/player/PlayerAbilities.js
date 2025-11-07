class PlayerAbilities {
    constructor(player) {
        this.player = player;

        // Orbital attack properties
        this.hasOrbitalAttack = false;
        this.orbitProjectiles = [];
        this.orbitCount = 0;
        this.orbitDamage = 0;
        this.orbitSpeed = 0;
        this.orbitRadius = 0;
        this.orbitAngle = 0;
        this.collisionRadius = player?.radius ?? 20;

        // Chain lightning properties
        this.hasChainLightning = false;
        this.chainChance = 0.0;
        this.chainDamage = 0.0;
        this.chainRange = 0.0;
        this.maxChains = 0;

        // Explosion properties
        this.hasExplosiveShots = false;
        this.explosiveChance = 0.3; // 30% chance when ability is acquired
        this.explosionRadius = 0;
        this.explosionDamage = 0;
        this.explosionChainChance = 0;

        // Ricochet properties
        this.hasRicochet = false;
        this.ricochetChance = 0.4; // Baseline 40% chance once unlocked
        this.ricochetBounces = 0;
        this.ricochetRange = 0;
        this.ricochetDamage = 0;

        // Homing projectile properties
        this.hasHomingShots = false;
        this.homingChance = 0.2; // 20% chance when ability is acquired
        this.homingTurnSpeed = 3.0;
        this.homingRange = 250;

        // Chain recursion depth protection
        this._chainDepth = 0;
    }

    update(deltaTime, game) {
        // Keep collision radius in sync with player size
        if (this.player && typeof this.player.radius === 'number') {
            this.collisionRadius = this.player.radius;
        }
        this.updateOrbitalAttacks(deltaTime, game);
    }

    updateOrbitalAttacks(deltaTime, game) {
        if (!this.hasOrbitalAttack || this.orbitCount <= 0) return;

        // Validate required modules exist
        if (!this.player?.combat || !this.player?.stats) {
            window.logger.warn('Player combat or stats module not initialized');
            return;
        }

        // Update orbit angle based on orbit speed
        this.orbitAngle += this.orbitSpeed * deltaTime;
        if (this.orbitAngle >= Math.PI * 2) {
            this.orbitAngle -= Math.PI * 2;
        }

        // Update orbital projectile positions
        const angleStep = (Math.PI * 2) / this.orbitCount;

        // Create orbit projectiles if they don't exist
        if (this.orbitProjectiles.length !== this.orbitCount) {
            this.orbitProjectiles = [];
            for (let i = 0; i < this.orbitCount; i++) {
                this.orbitProjectiles.push({
                    angle: this.orbitAngle + (i * angleStep),
                    x: 0,
                    y: 0,
                    hitEnemies: new Set(),
                    cooldown: 0
                });
            }
        }

        // Update orbit positions and check for collisions
        const FastMath = window.Game?.FastMath;
        for (let i = 0; i < Math.min(this.orbitProjectiles.length, this.orbitCount); i++) {
            const orb = this.orbitProjectiles[i];
            if (!orb || typeof orb !== 'object') continue;

            orb.angle = this.orbitAngle + (i * angleStep);
            // Use FastMath.sincos for 5x speedup on ARM (called every frame for each orbital)
            const { sin, cos } = FastMath ? FastMath.sincos(orb.angle) : { sin: Math.sin(orb.angle), cos: Math.cos(orb.angle) };
            orb.x = this.player.x + cos * this.orbitRadius;
            orb.y = this.player.y + sin * this.orbitRadius;

            // Reduce cooldown for orbital hits
            if (orb.cooldown > 0) {
                orb.cooldown -= deltaTime;
            }

            // Reset hit enemies when projectile has moved enough
            if (i === 0 && Math.abs(orb.angle % (Math.PI / 4)) < 0.05) {
                for (const orbProjectile of this.orbitProjectiles) {
                    orbProjectile.hitEnemies.clear();
                    orbProjectile.cooldown = 0;
                }
            }

            // Check for enemy collisions
            const searchRadius = this.collisionRadius + 60;
            const candidates = game?.getEnemiesWithinRadius?.(
                orb.x,
                orb.y,
                searchRadius,
                { includeDead: false }
            ) ?? [];

            if (candidates.length === 0) continue;

            for (const enemy of candidates) {
                if (!enemy || enemy.isDead || orb.hitEnemies.has(enemy.id) || orb.cooldown > 0) continue;

                const dx = enemy.x - orb.x;
                const dy = enemy.y - orb.y;
                const distanceSquared = dx * dx + dy * dy;
                const collisionRadius = enemy.radius + 10;

                if (distanceSquared < collisionRadius * collisionRadius) {
                    // Calculate damage
                    let damage = this.player.combat.attackDamage * this.orbitDamage;
                    const isCrit = Math.random() < this.player.combat.critChance;
                    if (isCrit) {
                        damage *= this.player.combat.critMultiplier;
                    }

                    const gm = window.gameManager || window.gameManagerBridge;

                    // Apply damage to enemy (metadata keeps damage numbers single-sourced)
                    enemy.takeDamage(damage, {
                        isCritical: isCrit,
                        label: 'Orbit'
                    });

                    // Apply lifesteal if player has it
                    if (this.player.stats.lifestealAmount > 0) {
                        const healAmount = damage * this.player.stats.lifestealAmount *
                            (isCrit ? this.player.stats.lifestealCritMultiplier : 1);
                        this.player.stats.heal(healAmount);
                    }

                    // Add to set of hit enemies for this orbit with cooldown
                    orb.hitEnemies.add(enemy.id);
                    orb.cooldown = 0.1;

                    // Create hit effect
                    if (gm?.createHitEffect) {
                        gm.createHitEffect(enemy.x, enemy.y);
                    }

                    // Play hit sound
                    if (window.audioSystem?.play) {
                        window.audioSystem.play('hit', 0.2);
                    }
                }
            }
        }

        // Track orbital count for achievement
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm) {
            gm.onOrbitalCountChanged?.(this.orbitCount);
        }
    }

    processChainLightning(startEnemy, baseDamage, chainsLeft, hitEnemies = new Set()) {
        // Enhanced safety checks to prevent infinite loops
        if (chainsLeft <= 0 || !startEnemy || hitEnemies.size > 20) return;

        // Validate required modules exist
        if (!this.player?.combat || !this.player?.stats) {
            window.logger.warn('Player combat or stats module not initialized');
            return;
        }

        // Add recursion depth limit as backup safety
        this._chainDepth++;
        if (this._chainDepth > 10) {
            this._chainDepth = 0;
            return;
        }

        // Validate start enemy
        if (!startEnemy || startEnemy.isDead || typeof startEnemy.x !== 'number' || typeof startEnemy.y !== 'number') {
            this._chainDepth = Math.max(0, this._chainDepth - 1);
            return;
        }

        // Find closest enemy that hasn't been hit
        let closestEnemy = null;
        let closestDistance = this.chainRange || 150;

        const gameManager = window.gameManager || window.gameManagerBridge;
        const enemies = gameManager?.game?.enemies || [];
        if (!Array.isArray(enemies) || enemies.length === 0) {
            this._chainDepth = Math.max(0, this._chainDepth - 1);
            return;
        }

        for (const enemy of enemies) {
            if (!enemy || hitEnemies.has(enemy.id) || enemy.isDead ||
                typeof enemy.x !== 'number' || typeof enemy.y !== 'number') continue;

            const dx = enemy.x - startEnemy.x;
            const dy = enemy.y - startEnemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance && distance > 0) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        // If we found an enemy to chain to
        if (closestEnemy && !hitEnemies.has(closestEnemy.id)) {
            // Calculate damage for chain hit
            const chainDamage = baseDamage * this.chainDamage;
            const isCrit = Math.random() < this.player.combat.critChance;
            const finalDamage = isCrit ? chainDamage * this.player.combat.critMultiplier : chainDamage;

            // Create lightning visual effect
            this.createLightningEffect(startEnemy, closestEnemy);

            // Apply damage to enemy
            closestEnemy.takeDamage(finalDamage);

            // Display damage number
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm && typeof gm.showFloatingText === 'function') {
                if (isCrit) {
                    gm.showFloatingText(`CHAIN CRIT! ${Math.round(finalDamage)}`,
                        closestEnemy.x, closestEnemy.y - 20, '#3498db', 16);
                } else {
                    gm.showFloatingText(`CHAIN ${Math.round(finalDamage)}`,
                        closestEnemy.x, closestEnemy.y - 20, '#3498db', 14);
                }
            }

            // Apply lifesteal if player has it
            if (this.player.stats.lifestealAmount > 0) {
                const healAmount = finalDamage * this.player.stats.lifestealAmount *
                    (isCrit ? this.player.stats.lifestealCritMultiplier : 1);
                this.player.stats.heal(healAmount);
            }

            // Add to hit enemies
            hitEnemies.add(closestEnemy.id);

            // Track chain hits for achievement
            if (gm) {
                gm.onChainLightningHit?.(hitEnemies.size);
            }

            // Continue chain with safety checks
            if (chainsLeft > 1 && hitEnemies.size < 15) {
                this.processChainLightning(closestEnemy, baseDamage, chainsLeft - 1, hitEnemies);
            }
        }

        // Reset recursion depth counter
        this._chainDepth = Math.max(0, this._chainDepth - 1);
    }

    processRicochet(sourceX, sourceY, damage, bouncesLeft, hitEnemies = new Set()) {
        if (bouncesLeft <= 0 || hitEnemies.size > 15) return;

        // Validate required modules exist
        if (!this.player?.combat || !this.player?.stats) {
            window.logger.warn('Player combat or stats module not initialized');
            return;
        }

        // Safety checks for parameters
        if (typeof sourceX !== 'number' || typeof sourceY !== 'number' ||
            typeof damage !== 'number' || damage <= 0) {
            return;
        }

        const gameManager = window.gameManager || window.gameManagerBridge;
        const enemies = gameManager?.game?.enemies || [];
        if (!Array.isArray(enemies) || enemies.length === 0) return;

        // Find closest enemy that hasn't been hit
        let closestEnemy = null;
        let closestDistance = this.ricochetRange || 200;

        for (const enemy of enemies) {
            if (!enemy || hitEnemies.has(enemy.id) || enemy.isDead ||
                typeof enemy.x !== 'number' || typeof enemy.y !== 'number') continue;

            const dx = enemy.x - sourceX;
            const dy = enemy.y - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        // If we found an enemy to ricochet to
        if (closestEnemy) {
            const critChance = this.player.combat.critChance || 0;
            const critMultiplier = this.player.combat.critMultiplier || 1;
            const ricochetDamageMultiplier = this.ricochetDamage || 0.5;

            const isCrit = Math.random() < critChance;
            const ricochetDamage = damage * ricochetDamageMultiplier *
                (isCrit ? critMultiplier : 1);

            // Create ricochet visual effect
            this.createRicochetEffect(sourceX, sourceY, closestEnemy.x, closestEnemy.y);

            // Apply damage to enemy
            closestEnemy.takeDamage(ricochetDamage);

            // Display damage number with ricochet indicator
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm && typeof gm.showFloatingText === 'function') {
                if (isCrit) {
                    gm.showFloatingText(`BOUNCE CRIT! ${Math.round(ricochetDamage)}`,
                        closestEnemy.x, closestEnemy.y - 20, '#f39c12', 16);
                } else {
                    gm.showFloatingText(`BOUNCE ${Math.round(ricochetDamage)}`,
                        closestEnemy.x, closestEnemy.y - 20, '#f39c12', 14);
                }
            }

            // Apply lifesteal if player has it
            if (this.player.stats.lifestealAmount > 0) {
                const healAmount = ricochetDamage * this.player.stats.lifestealAmount *
                    (isCrit ? this.player.stats.lifestealCritMultiplier : 1);
                this.player.stats.heal(healAmount);
            }

            // Add to hit enemies
            hitEnemies.add(closestEnemy.id);

            // Track ricochet hits for achievement
            if (gm) {
                gm.onRicochetHit?.(hitEnemies.size);
            }

            // Continue ricochet
            this.processRicochet(
                closestEnemy.x, closestEnemy.y,
                damage,
                bouncesLeft - 1,
                hitEnemies
            );
        }
    }

    createLightningEffect(from, to) {
        const gm = window.gameManager || window.gameManagerBridge;
        if (!gm || gm.lowQuality) return;

        const factor = (gm.particleReductionFactor || 1.0);
        const segments = Math.max(3, Math.floor(8 * factor));
        const baseX = from.x;
        const baseY = from.y;
        const targetX = to.x;
        const targetY = to.y;

        // Add initial spark effect at the source
        for (let i = 0, n = Math.max(0, Math.floor(5 * factor)); i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            const size = 2 + Math.random() * 2;
            this.player.spawnParticle(
                baseX,
                baseY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#81ecec',
                0.15,
                'spark'
            );
        }

        // Calculate main lightning path
        let prevX = baseX;
        let prevY = baseY;
        const points = [];

        for (let i = 1; i <= segments; i++) {
            const ratio = i / segments;
            const straightX = baseX + (targetX - baseX) * ratio;
            const straightY = baseY + (targetY - baseY) * ratio;

            // Add randomness to path
            const randomness = 30 * (1 - ratio);
            const x = straightX + (Math.random() * randomness * 2 - randomness);
            const y = straightY + (Math.random() * randomness * 2 - randomness);

            // Draw lightning segment
            this.player.spawnParticle(
                prevX,
                prevY,
                (x - prevX) * 12,
                (y - prevY) * 12,
                4,
                '#74b9ff',
                0.2,
                'spark'
            );

            points.push({x, y});
            prevX = x;
            prevY = y;
        }

        // Create impact flash at target
        this.player.spawnParticle(
            to.x,
            to.y,
            0,
            0,
            18,
            '#74b9ff',
            0.2,
            'basic'
        );

        // Play lightning sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('hit', 0.3);
        }
    }

    createRicochetEffect(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const gm = window.gameManager || window.gameManagerBridge;
        if (gm && gm.lowQuality) return;

        const factor = gm ? (gm.particleReductionFactor || 1.0) : 1.0;
        const baseParticles = Math.floor(distance / 10);
        const MathUtils = window.Game?.MathUtils;
        const particleCount = MathUtils ?
            Math.max(0, Math.floor(MathUtils.clamp(baseParticles, 0, 15) * factor)) :
            Math.max(0, Math.floor(Math.min(Math.max(baseParticles, 0), 15) * factor));

        if (particleCount <= 0) return;

        for (let i = 0; i < particleCount; i++) {
            const ratio = i / particleCount;
            const x = fromX + dx * ratio;
            const y = fromY + dy * ratio;

            this.player.spawnParticle(
                x,
                y,
                0,
                0,
                3 * (1 - ratio),
                '#f39c12',
                0.2 + ratio * 0.1,
                'spark'
            );
        }

        // Create impact flash at destination
        this.player.spawnParticle(
            toX,
            toY,
            0,
            0,
            12,
            '#e67e22',
            0.2,
            'basic'
        );

        // Play ricochet sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('hit', 0.25);
        }
    }

    // Apply special ability upgrades
    applyAbilityUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'special':
                if (upgrade.specialType === 'orbit') {
                    this.hasOrbitalAttack = true;
                    this.orbitCount += upgrade.value || 1;
                    this.orbitDamage = upgrade.damage || 0.4;
                    this.orbitSpeed = upgrade.orbitSpeed || 2;
                    this.orbitRadius = upgrade.orbitRadius || 80;
                } else if (upgrade.specialType === 'chain') {
                    this.hasChainLightning = true;
                    this.chainChance = Math.min(0.85, Math.max(this.chainChance, upgrade.value || 0.5));
                    this.chainDamage = Math.max(this.chainDamage, upgrade.chainDamage || 0.85);
                    this.chainRange = Math.max(this.chainRange, upgrade.chainRange || 240);
                    this.maxChains = Math.max(this.maxChains, upgrade.maxChains || 2);
                } else if (upgrade.specialType === 'explosion') {
                    this.hasExplosiveShots = true;
                    this.explosiveChance = upgrade.explosiveChance || this.explosiveChance || 0.3;
                    this.explosionRadius = upgrade.explosionRadius || 70;  // INCREASED from 60
                    this.explosionDamage = upgrade.explosionDamage || 0.6;  // INCREASED from 0.5
                } else if (upgrade.specialType === 'ricochet') {
                    this.hasRicochet = true;
                    this.ricochetChance = Math.min(0.9, Math.max(this.ricochetChance, upgrade.ricochetChance || 0.45));
                    this.ricochetBounces = Math.max(this.ricochetBounces, upgrade.bounces || 2);
                    this.ricochetRange = Math.max(this.ricochetRange, upgrade.bounceRange || 320);  // INCREASED from 260
                    this.ricochetDamage = Math.max(this.ricochetDamage, upgrade.bounceDamage || 0.85);
                } else if (upgrade.specialType === 'aoe') {
                    // Validate combat module exists before modifying
                    if (this.player?.combat) {
                        this.player.combat.hasAOEAttack = true;
                        this.player.combat.aoeAttackRange = Math.max(150, this.player.combat.aoeAttackRange);
                        this.player.combat.aoeAttackTimer = this.player.combat.aoeAttackCooldown;
                    } else {
                        window.logger.warn('Cannot apply AOE upgrade: player combat module not initialized');
                    }
                }
                break;

            case 'orbit':
                this.orbitCount += upgrade.value || 1;
                break;

            case 'orbitDamage':
                this.orbitDamage *= upgrade.multiplier || 1;
                break;

            case 'orbitSpeed':
                this.orbitSpeed *= upgrade.multiplier || 1;
                break;

            case 'orbitSize':
                this.orbitRadius += upgrade.value || 0;
                break;

            case 'chain':
                if (upgrade.value) {
                    this.chainChance = Math.min(0.9, Math.max(this.chainChance, upgrade.value));
                }
                if (upgrade.maxChains) this.maxChains = Math.max(this.maxChains, upgrade.maxChains);
                if (upgrade.rangeBonus) {
                    this.chainRange = Math.max(this.chainRange, 1);
                    this.chainRange += upgrade.rangeBonus;
                }
                break;

            case 'chainDamage':
                if (upgrade.value) {
                    this.chainDamage = Math.max(this.chainDamage, upgrade.value);
                }
                break;

            case 'chainRange':
                if (this.chainRange <= 0) {
                    this.chainRange = 240; // sensible default before scaling
                }
                this.chainRange *= upgrade.multiplier || 1;
                break;

            case 'explosionSize':
                this.explosionRadius *= upgrade.multiplier || 1;
                if (upgrade.chanceBonus) {
                    this.explosiveChance = Math.min(0.95, (this.explosiveChance || 0.3) + upgrade.chanceBonus);
                }
                break;

            case 'explosionDamage':
                this.explosionDamage = upgrade.value || this.explosionDamage;
                if (upgrade.chanceBonus) {
                    this.explosiveChance = Math.min(0.95, (this.explosiveChance || 0.3) + upgrade.chanceBonus);
                }
                break;

            case 'explosionChain':
                this.explosionChainChance = upgrade.value || 0;
                break;

            case 'ricochetBounces':
                this.ricochetBounces += upgrade.value || 1;
                if (upgrade.rangeBonus) {
                    this.ricochetRange = Math.max(this.ricochetRange, 0) + upgrade.rangeBonus;
                }
                if (upgrade.chanceBonus) {
                    this.ricochetChance = Math.min(0.95, this.ricochetChance + upgrade.chanceBonus);
                }
                break;

            case 'ricochetDamage':
                if (upgrade.value) {
                    this.ricochetDamage = Math.max(this.ricochetDamage, upgrade.value);
                }
                if (upgrade.chanceBonus) {
                    this.ricochetChance = Math.min(0.95, (this.ricochetChance || 0.45) + upgrade.chanceBonus);
                }
                break;
        }
    }

    // Render orbital attack visualization
    renderOrbitalAttacks(ctx) {
        if (this.hasOrbitalAttack && this.orbitProjectiles.length > 0) {
            // Draw orbit path (faintly)
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.orbitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw each orbital projectile
            for (const orb of this.orbitProjectiles) {
                // Draw the orbital projectile
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#3498db';
                ctx.fill();

                // Draw glow effect
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, 12, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                ctx.fill();
            }
        }
    }

    // Get debug information
    getDebugInfo() {
        return {
            hasOrbitalAttack: this.hasOrbitalAttack,
            orbitCount: this.orbitCount,
            hasChainLightning: this.hasChainLightning,
            chainChance: this.chainChance,
            hasExplosiveShots: this.hasExplosiveShots,
            hasRicochet: this.hasRicochet,
            hasHomingShots: this.hasHomingShots
        };
    }
}

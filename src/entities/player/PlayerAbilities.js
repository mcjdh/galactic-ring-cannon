class PlayerAbilities {
    constructor(player) {
        this.player = player;

        // Orbital attack properties
        const globalScope = typeof window !== 'undefined' ? window : globalThis;
        const PLAYER_CONSTANTS = globalScope?.GAME_CONSTANTS?.PLAYER || {};
        this.hasOrbitalAttack = false;
        this.orbitProjectiles = [];
        this.orbitCount = 0;
        this.orbitDamage = 0;
        this.orbitSpeed = 0;
        this.orbitRadius = 0;
        this.orbitAngle = 0;
        this.maxOrbitalRange = PLAYER_CONSTANTS.BASE_ATTACK_RANGE || 320;
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

        // Burn properties
        this.hasBurn = false;
        this.burnChance = 0;
        this.burnDamage = 0;
        this.burnDuration = 0;
        this.burnExplosionDamage = 0;
        this.burnExplosionRadius = 0;
        this.bloodLashDamage = 0;
        this.bloodLashRange = 0;
        this.bloodLashChance = 0;
        this.bloodNovaDamage = 0;
        this.bloodNovaRadius = 0;

        // Ricochet properties
        this.hasRicochet = false;
        this.ricochetChance = 0.4; // Baseline 40% chance once unlocked
        this.ricochetBounces = 0;
        this.ricochetRange = 0;
        this.ricochetDamage = 0;
        this.ricochetFinalExplosionDamage = 0;
        this.ricochetFinalExplosionRadius = 0;
        this.ricochetEchoChance = 0;
        this.ricochetEchoBounces = 0;

        // Homing projectile properties
        this.hasHomingShots = false;
        this.homingChance = 0.2; // 20% chance when ability is acquired
        this.homingTurnSpeed = 3.0;
        this.homingRange = 250;

        // Gravity well properties (Void Reaver specialty)
        this.hasGravityWells = false;
        this.gravityWellRadius = 150;
        this.gravityWellDuration = 2.5;
        this.gravityWellSlowAmount = 0.4;
        this.gravityWellPullStrength = 0.3;
        this.gravityWellDamageMultiplier = 0.15;

        // Shield properties (Aegis Vanguard specialty)
        this.hasShield = false;
        this.shieldBaseCapacity = 0;    // Initial capacity when first acquired (for adaptive armor tracking)
        this.shieldMaxCapacity = 0;
        this.shieldCurrent = 0;
        this.shieldRechargeTime = 5.0;  // Time in seconds to recharge after break (reduced from 6s for better feel)
        this.shieldRechargeTimer = 0;   // Current recharge countdown
        this.shieldBroken = false;      // Whether shield is currently broken
        this.shieldReflectChance = 0;   // Chance to reflect damage back
        this.shieldExplosionDamage = 0; // Damage dealt when shield breaks
        this.shieldExplosionRadius = 0; // Radius of explosion on shield break
        this.shieldAdaptiveGrowth = 0;  // Growth rate for adaptive armor
        this.shieldAdaptiveMax = 0;     // Max growth cap
        this.shieldDamageBlocked = 0;   // Total damage blocked (for adaptive armor)
        this.shieldDamageReflected = 0; // Total damage reflected (for achievements)
        this.shieldHitFlash = 0;        // Visual flash timer when shield is hit
        this.shieldTimeWithoutBreak = 0; // Time shield has been active without breaking (for achievements)
        this.shieldTimeUpdateTimer = 0; // Timer for throttling achievement updates (updates once per second)

        // Chain recursion depth protection
        this._chainDepth = 0;
    }

    update(deltaTime, game) {
        // Keep collision radius in sync with player size
        if (this.player && typeof this.player.radius === 'number') {
            this.collisionRadius = this.player.radius;
        }
        this.updateOrbitalAttacks(deltaTime, game);
        this.updateShield(deltaTime, game);
    }

    updateShield(deltaTime, game) {
        if (!this.hasShield) return;
        const achievementSystem = window.achievementSystem || window.gameManager?.achievementSystem || window.gameManagerBridge?.achievementSystem;

        // Decay hit flash
        if (this.shieldHitFlash > 0) {
            this.shieldHitFlash -= deltaTime * 5;  // Fast decay
            if (this.shieldHitFlash < 0) this.shieldHitFlash = 0;
        }

        // Track time without shield breaking (for achievements)
        if (!this.shieldBroken && this.shieldCurrent > 0) {
            this.shieldTimeWithoutBreak += deltaTime;
            this.shieldTimeUpdateTimer += deltaTime;

            // Throttle achievement update to once per second to reduce overhead
            if (this.shieldTimeUpdateTimer >= 1.0) {
                if (achievementSystem?.updateShieldTimeWithoutBreak) {
                    achievementSystem.updateShieldTimeWithoutBreak(this.shieldTimeWithoutBreak);
                }
                this.shieldTimeUpdateTimer = 0;
            }
        }

        // If shield is broken, count down recharge timer
        if (this.shieldBroken) {
            this.shieldRechargeTimer -= deltaTime;

            if (this.shieldRechargeTimer <= 0) {
                // Shield recharged!
                this.shieldBroken = false;
                this.shieldCurrent = this.shieldMaxCapacity;
                this.shieldRechargeTimer = 0;

                // Visual/audio feedback for shield recharge
                if (window.optimizedParticles) {
                    this.createShieldRechargeEffect();
                }
                if (window.audioSystem?.play) {
                    window.audioSystem.play('shieldRecharge', 0.4);
                }
            }
        }
    }

    /**
     * Absorb damage with shield
     * Returns the amount of damage that penetrated the shield (overflow)
     */
    absorbDamage(incomingDamage) {
        if (!this.hasShield || this.shieldBroken || this.shieldCurrent <= 0) {
            // If shield is recharging and player takes damage, restart recharge timer
            if (this.hasShield && this.shieldBroken && this.shieldRechargeTimer > 0) {
                this.shieldRechargeTimer = this.shieldRechargeTime;
                console.log(`[Shield] Recharge interrupted by damage! Timer reset to ${this.shieldRechargeTime}s`);
            }
            return incomingDamage; // Shield can't help, return full damage
        }

        const damageBlocked = Math.min(incomingDamage, this.shieldCurrent);
        const damagePenetrated = incomingDamage - damageBlocked;

        this.shieldCurrent -= damageBlocked;
        this.shieldDamageBlocked += damageBlocked;

        console.log(`[Shield] Absorbed ${damageBlocked.toFixed(1)} damage, ${this.shieldCurrent.toFixed(1)}/${this.shieldMaxCapacity} remaining`);

        // Trigger visual hit flash
        if (damageBlocked > 0) {
            this.shieldHitFlash = 1.0;  // Full flash intensity
        }

        // Play shield hit sound when damage absorbed
        if (damageBlocked > 0 && window.audioSystem?.play) {
            window.audioSystem.play('shieldHit', 0.4);
        }

        const achievementSystem = window.achievementSystem || window.gameManager?.achievementSystem || window.gameManagerBridge?.achievementSystem;

        // Check for adaptive armor growth
        if (this.shieldAdaptiveGrowth > 0 && this.shieldAdaptiveMax > 0) {
            const growthIncrement = Math.floor(this.shieldDamageBlocked / 100) * this.shieldAdaptiveGrowth;
            const currentGrowth = this.shieldMaxCapacity - this.shieldBaseCapacity; // Use tracked base capacity
            const newGrowth = Math.min(growthIncrement, this.shieldAdaptiveMax);

            if (newGrowth > currentGrowth) {
                const added = newGrowth - currentGrowth;
                this.shieldMaxCapacity += added;
                console.log(`[Shield] Adaptive armor grew! +${added} max capacity (total growth: ${newGrowth}/${this.shieldAdaptiveMax})`);
                // Visual feedback for shield evolution
                if (window.optimizedParticles) {
                    this.createShieldEvolveEffect();
                }

                // Check achievement for max adaptive armor
                if (newGrowth >= this.shieldAdaptiveMax) {
                    if (achievementSystem?.updateAchievement) {
                        achievementSystem.updateAchievement('adaptive_evolution', 1);
                    }
                }
            }
        }

        // Check for energy reflection
        if (this.shieldReflectChance > 0 && Math.random() < this.shieldReflectChance) {
            console.log(`[Shield] Energy reflection triggered!`);
            const reflectedDamage = this.reflectDamage(damageBlocked);

            if (reflectedDamage > 0) {
                this.shieldDamageReflected += reflectedDamage;
                // Actual reflected hits are tracked via EnemyStats to ensure accuracy
            } else {
                // No enemies in range – award half the blocked damage as dispersed energy
                const fallback = damageBlocked * 0.5;
                if (fallback > 0) {
                    this.shieldDamageReflected += fallback;
                }
            }
        }

        // Update total damage blocked achievement (pass increment, not total)
        if (achievementSystem?.updateShieldDamageBlocked) {
            achievementSystem.updateShieldDamageBlocked(damageBlocked); // ✅ Pass increment
        }

        // Shield broke?
        if (this.shieldCurrent <= 0) {
            this.shieldCurrent = 0;
            this.shieldBroken = true;
            this.shieldRechargeTimer = this.shieldRechargeTime;

            console.log(`[Shield] Shield broke! Recharging in ${this.shieldRechargeTime}s. Explosion: ${this.shieldExplosionDamage > 0}`);

            // Reset time without break counter
            this.shieldTimeWithoutBreak = 0;

            // Aegis Protocol: Shield explosion on break
            if (this.shieldExplosionDamage > 0 && this.shieldExplosionRadius > 0) {
                this.triggerShieldExplosion();
            }

            // Visual/audio feedback for shield break
            if (window.optimizedParticles) {
                this.createShieldBreakEffect();
            }
            if (window.audioSystem?.play) {
                window.audioSystem.play('shieldBreak', 0.6);
            }
        }

        return damagePenetrated;
    }

    /**
     * Reflect damage back to nearby enemies
     * Returns the total damage reflected to all enemies
     */
    reflectDamage(damageAmount) {
        const gm = window.gameManager || window.gameManagerBridge;
        const game = gm?.game;
        if (!game || !Array.isArray(game.enemies)) return 0;

        const reflectionDamage = damageAmount * 0.5; // Reflect 50% of blocked damage
        const reflectionRadius = 200;  // Increased from 150 for better area coverage

        // Find enemies in range
        const nearbyEnemies = game.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist <= reflectionRadius;
        });

        // Damage them
        let totalReflected = 0;
        nearbyEnemies.forEach(enemy => {
            if (enemy.takeDamage) {
                enemy.takeDamage(reflectionDamage, { label: 'reflected', showText: true });
                totalReflected += reflectionDamage;
            }
        });

        // Visual effect for reflection
        if (window.optimizedParticles && nearbyEnemies.length > 0) {
            this.createReflectionEffect();
        }

        return totalReflected;
    }

    /**
     * Trigger shield explosion (Aegis Protocol)
     */
    triggerShieldExplosion() {
        const gm = window.gameManager || window.gameManagerBridge;
        const game = gm?.game;
        if (!game || !Array.isArray(game.enemies)) return;

        const enemies = game.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist <= this.shieldExplosionRadius;
        });

        if (enemies.length > 0) {
            console.log(`[Shield] Aegis Protocol triggered! Damaging ${enemies.length} enemies for ${this.shieldExplosionDamage} each`);
        }

        enemies.forEach(enemy => {
            if (enemy.takeDamage) {
                enemy.takeDamage(this.shieldExplosionDamage, { label: 'AEGIS', showText: true, isCritical: false });
            }
        });

        // Visual explosion effect - ENHANCED with expanding rings and screen shake!
        if (window.optimizedParticles) {
            this.createShieldBurstEffect();
        }

        // Screen shake for impact
        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(8, 0.4);  // Strong shake for powerful explosion
        }

        if (window.audioSystem?.play) {
            window.audioSystem.play('explosion', 0.7);  // Louder explosion
        }
    }

    // Shield visual effects
    createShieldRechargeEffect() {
        // Converging energy spiraling into shield
        const segments = 32;
        const radius = (this.player.radius || 20) + 20;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = this.player.x + Math.cos(angle) * radius;
            const y = this.player.y + Math.sin(angle) * radius;

            window.optimizedParticles.spawnParticle({
                x, y,
                vx: Math.cos(angle) * -40,  // Inward motion
                vy: Math.sin(angle) * -40,
                size: 3,
                color: '#00ffff',
                life: 0.7,
                type: 'spark'
            });

            // Additional sparkle layer
            if (i % 2 === 0) {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * -30,
                    vy: Math.sin(angle) * -30,
                    size: 2,
                    color: '#88ffff',
                    life: 0.5,
                    type: 'spark'
                });
            }
        }
    }

    createShieldBreakEffect() {
        // Shattering glass effect with expanding fragments
        const segments = 48;  // More fragments for dramatic effect
        const radius = (this.player.radius || 20) + 15;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = this.player.x + Math.cos(angle) * radius;
            const y = this.player.y + Math.sin(angle) * radius;
            const speed = 120 + Math.random() * 80;

            window.optimizedParticles.spawnParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                color: i % 3 === 0 ? '#ff00ff' : (i % 3 === 1 ? '#ff00aa' : '#aa00ff'),
                life: 0.8 + Math.random() * 0.4,
                type: 'spark'
            });
        }

        // Screen shake for impact
        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(4, 0.25);
        }
    }

    createShieldBurstEffect() {
        // Expanding ring waves for powerful visual
        const ringCount = 3;
        const radius = this.shieldExplosionRadius;

        // Capture player position (player moves during setTimeout delays)
        const playerX = this.player.x;
        const playerY = this.player.y;

        for (let ring = 0; ring < ringCount; ring++) {
            const delay = ring * 50; // Stagger rings
            const segments = 36;

            setTimeout(() => {
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const x = playerX + Math.cos(angle) * (radius * 0.3);
                    const y = playerY + Math.sin(angle) * (radius * 0.3);

                    window.optimizedParticles.spawnParticle({
                        x, y,
                        vx: Math.cos(angle) * (200 + ring * 50),  // Faster outer rings
                        vy: Math.sin(angle) * (200 + ring * 50),
                        size: 6 - ring,  // Smaller for outer rings
                        color: ring === 0 ? '#00ffff' : (ring === 1 ? '#00aaff' : '#0088ff'),
                        life: 0.8 - ring * 0.15,
                        type: 'explosion'
                    });
                }
            }, delay);
        }

        // Central explosion burst
        const burstParticles = 24;
        for (let i = 0; i < burstParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;

            window.optimizedParticles.spawnParticle({
                x: playerX,
                y: playerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 3,
                color: '#ffffff',
                life: 0.6 + Math.random() * 0.4,
                type: 'spark'
            });
        }
    }

    createReflectionEffect() {
        // Lightning-like reflection bolts radiating outward
        const segments = 24;
        const radius = (this.player.radius || 20) + 12;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = this.player.x + Math.cos(angle) * radius;
            const y = this.player.y + Math.sin(angle) * radius;

            // Double particle trail for lightning effect
            for (let j = 0; j < 2; j++) {
                const offset = (j - 0.5) * 0.2;
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle + offset) * (100 + j * 20),
                    vy: Math.sin(angle + offset) * (100 + j * 20),
                    size: 4 - j,
                    color: j === 0 ? '#ff00ff' : '#ff88ff',
                    life: 0.6,
                    type: 'spark'
                });
            }
        }

        // Small screen shake
        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(2, 0.15);
        }
    }

    createShieldEvolveEffect() {
        const segments = 20;
        const radius = (this.player.radius || 20) + 18;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = this.player.x + Math.cos(angle) * radius;
            const y = this.player.y + Math.sin(angle) * radius;
            window.optimizedParticles.spawnParticle({
                x, y,
                vx: 0,
                vy: -40,
                size: 4,
                color: '#00ff00',
                life: 1.0,
                type: 'spark'
            });
        }
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

        const maxShotDistance =
            this.maxOrbitalRange ||
            this.player?.combat?.attackRange ||
            window.GAME_CONSTANTS?.PLAYER?.BASE_ATTACK_RANGE ||
            320;

        const detectionRadius = Math.max(this.orbitRadius + 40, maxShotDistance);

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
            const searchRadius = detectionRadius;
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

                const distanceFromPlayer = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (distanceFromPlayer > maxShotDistance) continue;

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
                        this.onLifesteal(healAmount);
                        // Track lifesteal healing for achievements
                        window.achievementSystem?.onLifestealHeal?.(healAmount);
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
                this.onLifesteal(healAmount);
                // Track lifesteal healing for achievements
                window.achievementSystem?.onLifestealHeal?.(healAmount);
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
                this.onLifesteal(healAmount);
                // Track lifesteal healing for achievements
                window.achievementSystem?.onLifestealHeal?.(healAmount);
            }

            // Add to hit enemies
            hitEnemies.add(closestEnemy.id);

            // Track ricochet hits for achievement
            if (gm) {
                gm.onRicochetHit?.(hitEnemies.size);
            }

            const nextBounces = Math.max(0, bouncesLeft - 1);
            if (nextBounces > 0) {
                this.processRicochet(
                    closestEnemy.x, closestEnemy.y,
                    damage,
                    nextBounces,
                    hitEnemies
                );
            } else {
                this._handleRicochetFinale(closestEnemy, damage, hitEnemies);
            }
        }
    }

    _handleRicochetFinale(targetEnemy, baseDamage, previousHits = new Set()) {
        if (!targetEnemy) return;

        const gm = window.gameManager || window.gameManagerBridge;
        const game = gm?.game;

        if (this.ricochetFinalExplosionDamage > 0 && game?.getEnemiesWithinRadius) {
            const radius = Math.max(20, this.ricochetFinalExplosionRadius || 90);
            const damage = this.ricochetFinalExplosionDamage;
            const enemies = game.getEnemiesWithinRadius(targetEnemy.x, targetEnemy.y, radius, {
                includeDead: false
            }) || [];

            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;
                enemy.takeDamage(damage);
            }

            gm?.createExplosion?.(targetEnemy.x, targetEnemy.y, radius, '#c27bff');
        }

        if (
            this.ricochetEchoChance > 0 &&
            this.ricochetEchoBounces > 0 &&
            Math.random() < this.ricochetEchoChance
        ) {
            const echoSet = new Set();
            if (targetEnemy?.id) {
                echoSet.add(targetEnemy.id);
            }
            this.processRicochet(
                targetEnemy.x,
                targetEnemy.y,
                baseDamage,
                this.ricochetEchoBounces,
                echoSet
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

            points.push({ x, y });
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

    onHeal(healedAmount = 0, overflowAmount = 0) {
        if (!(overflowAmount > 0 && this.bloodNovaDamage > 0)) {
            return;
        }

        const gm = window.gameManager || window.gameManagerBridge;
        const game = gm?.game;
        const radius = this.bloodNovaRadius || 110;
        const damage = this.bloodNovaDamage;

        if (game?.getEnemiesWithinRadius) {
            const enemies = game.getEnemiesWithinRadius(this.player.x, this.player.y, radius, {
                includeDead: false
            }) || [];

            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;
                if (typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(damage);
                }
            }
        } else if (Array.isArray(game?.enemies)) {
            for (const enemy of game.enemies) {
                if (!enemy || enemy.isDead) continue;
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                if ((dx * dx + dy * dy) <= radius * radius) {
                    enemy.takeDamage(damage);
                }
            }
        }

        gm?.createExplosion?.(this.player.x, this.player.y, radius, '#c0392b');
    }

    onLifesteal(amount = 0) {
        if (!(amount > 0 && this.bloodLashDamage > 0)) {
            return;
        }
        const chance = this.bloodLashChance || 1;
        if (Math.random() > chance) {
            return;
        }

        const gm = window.gameManager || window.gameManagerBridge;
        const game = gm?.game;
        const range = this.bloodLashRange || 240;

        let target = game?.findClosestEnemy?.(
            this.player.x,
            this.player.y,
            {
                maxRadius: range,
                includeDead: false
            }
        ) ?? null;

        if (!target && game?.getEnemiesWithinRadius) {
            const enemies = game.getEnemiesWithinRadius(this.player.x, this.player.y, range, {
                includeDead: false
            }) || [];
            target = enemies[0] || null;
        }

        if (!target || typeof target.takeDamage !== 'function') {
            return;
        }

        target.takeDamage(this.bloodLashDamage);
        gm?.createHitEffect?.(target.x, target.y, this.bloodLashDamage);

        if (window.optimizedParticles) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                window.optimizedParticles.spawnParticle({
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(angle) * 60,
                    vy: Math.sin(angle) * 60,
                    size: 3 + Math.random() * 2,
                    color: '#ff1744',
                    life: 0.35 + Math.random() * 0.15,
                    type: 'spark'
                });
            }
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
                    const desiredRange = Math.max(
                        this.orbitRadius + 80,
                        upgrade.orbitRange || this.player?.combat?.attackRange || this.maxOrbitalRange || 320
                    );
                    this.maxOrbitalRange = Math.max(this.maxOrbitalRange || 0, desiredRange);
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
                } else if (upgrade.specialType === 'shield') {
                    // NEW: Shield ability (Aegis Vanguard specialty)
                    this.hasShield = true;
                    this.shieldBaseCapacity = upgrade.shieldCapacity || 75; // Track base for adaptive armor
                    this.shieldMaxCapacity = this.shieldBaseCapacity;
                    this.shieldCurrent = this.shieldMaxCapacity;
                    this.shieldRechargeTime = upgrade.shieldRechargeTime || 6.0;
                    this.shieldBroken = false;
                    this.shieldRechargeTimer = 0;
                    console.log(`[Shield] Initialized with base capacity: ${this.shieldBaseCapacity}`);
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
                if (upgrade.rangeBonus) {
                    this.maxOrbitalRange = Math.max(this.maxOrbitalRange || 0, this.orbitRadius + upgrade.rangeBonus);
                } else {
                    this.maxOrbitalRange = Math.max(this.maxOrbitalRange || 0, this.orbitRadius + 80);
                }
                break;

            case 'orbitRange':
                if (upgrade.value) {
                    this.maxOrbitalRange = Math.max(this.maxOrbitalRange || 0, upgrade.value);
                }
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

            case 'burn':
                this.hasBurn = true;
                if (typeof upgrade.burnChance === 'number') {
                    this.burnChance = Math.max(0, Math.min(0.99, upgrade.burnChance));
                }
                if (typeof upgrade.chanceBonus === 'number') {
                    const baseChance = this.burnChance || 0;
                    this.burnChance = Math.max(0, Math.min(0.99, baseChance + upgrade.chanceBonus));
                }
                if (typeof upgrade.burnDamage === 'number') {
                    this.burnDamage = upgrade.burnDamage;
                }
                if (typeof upgrade.damageBonus === 'number') {
                    this.burnDamage += upgrade.damageBonus;
                }
                if (typeof upgrade.damageMultiplier === 'number') {
                    this.burnDamage *= upgrade.damageMultiplier;
                }
                if (typeof upgrade.burnDuration === 'number') {
                    this.burnDuration = upgrade.burnDuration;
                }
                if (typeof upgrade.durationBonus === 'number') {
                    this.burnDuration += upgrade.durationBonus;
                }
                if (typeof upgrade.explosionDamage === 'number') {
                    this.burnExplosionDamage = Math.max(this.burnExplosionDamage || 0, upgrade.explosionDamage);
                }
                if (typeof upgrade.explosionRadius === 'number') {
                    this.burnExplosionRadius = Math.max(this.burnExplosionRadius || 0, upgrade.explosionRadius);
                }
                break;

            case 'burnDamage':
                this.hasBurn = true;
                if (typeof upgrade.damageMultiplier === 'number') {
                    this.burnDamage *= upgrade.damageMultiplier;
                }
                if (typeof upgrade.damageBonus === 'number') {
                    this.burnDamage += upgrade.damageBonus;
                }
                if (typeof upgrade.durationBonus === 'number') {
                    this.burnDuration += upgrade.durationBonus;
                }
                if (typeof upgrade.explosionDamage === 'number') {
                    this.burnExplosionDamage = Math.max(this.burnExplosionDamage || 0, upgrade.explosionDamage);
                }
                if (typeof upgrade.explosionRadius === 'number') {
                    this.burnExplosionRadius = Math.max(this.burnExplosionRadius || 0, upgrade.explosionRadius);
                }
                break;

            case 'gravityWell': {
                this.hasGravityWells = true;
                if (typeof upgrade.radiusMultiplier === 'number') {
                    this.gravityWellRadius *= Math.max(0, upgrade.radiusMultiplier);
                }
                if (typeof upgrade.radiusBonus === 'number') {
                    this.gravityWellRadius += upgrade.radiusBonus;
                }
                if (typeof upgrade.durationMultiplier === 'number') {
                    this.gravityWellDuration *= Math.max(0, upgrade.durationMultiplier);
                }
                if (typeof upgrade.durationBonus === 'number') {
                    this.gravityWellDuration += upgrade.durationBonus;
                }
                if (typeof upgrade.slowBonus === 'number') {
                    this.gravityWellSlowAmount = Math.min(0.95, this.gravityWellSlowAmount + upgrade.slowBonus);
                }
                if (typeof upgrade.pullBonus === 'number') {
                    this.gravityWellPullStrength = Math.max(0, this.gravityWellPullStrength + upgrade.pullBonus);
                }
                if (typeof upgrade.damageMultiplier === 'number') {
                    this.gravityWellDamageMultiplier *= Math.max(0, upgrade.damageMultiplier);
                }
                if (typeof upgrade.damageAdd === 'number') {
                    this.gravityWellDamageMultiplier = Math.max(0, this.gravityWellDamageMultiplier + upgrade.damageAdd);
                }
                break;
            }

            case 'bloodLash': {
                if (typeof upgrade.damage === 'number') {
                    this.bloodLashDamage = Math.max(this.bloodLashDamage, upgrade.damage);
                }
                if (typeof upgrade.range === 'number') {
                    this.bloodLashRange = Math.max(this.bloodLashRange, upgrade.range);
                }
                if (typeof upgrade.chance === 'number') {
                    this.bloodLashChance = Math.min(1, Math.max(this.bloodLashChance || 0, upgrade.chance));
                } else if (!this.bloodLashChance) {
                    this.bloodLashChance = 1;
                }
                break;
            }

            case 'bloodNova': {
                if (typeof upgrade.damage === 'number') {
                    this.bloodNovaDamage = Math.max(this.bloodNovaDamage, upgrade.damage);
                }
                if (typeof upgrade.radius === 'number') {
                    this.bloodNovaRadius = Math.max(this.bloodNovaRadius, upgrade.radius);
                }
                break;
            }

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

            // Shield upgrade types
            case 'shieldCapacity':
                if (upgrade.value) {
                    const oldCapacity = this.shieldMaxCapacity;
                    this.shieldMaxCapacity += upgrade.value;
                    this.shieldCurrent = Math.min(this.shieldCurrent + upgrade.value, this.shieldMaxCapacity);
                    // Do not update shieldBaseCapacity here; it should remain at the original value
                    console.log(`[Shield] Capacity: ${oldCapacity} → ${this.shieldMaxCapacity} (+${upgrade.value})`);
                }
                if (upgrade.rechargeBonus) {
                    const oldTime = this.shieldRechargeTime;
                    this.shieldRechargeTime *= (1 - upgrade.rechargeBonus);
                    console.log(`[Shield] Recharge time: ${oldTime.toFixed(2)}s → ${this.shieldRechargeTime.toFixed(2)}s (${(upgrade.rechargeBonus * 100).toFixed(0)}% faster)`);
                }
                break;

            case 'shieldReflection':
                this.shieldReflectChance = Math.min(0.75, (this.shieldReflectChance || 0) + (upgrade.value || 0.35));
                break;

            case 'shieldAdaptive':
                this.shieldAdaptiveGrowth = upgrade.growthRate || 2;
                this.shieldAdaptiveMax = upgrade.maxGrowth || 50;
                break;

            case 'shieldRecharge':
                if (upgrade.value) {
                    const oldTime = this.shieldRechargeTime;
                    this.shieldRechargeTime *= (1 - upgrade.value);
                    console.log(`[Shield] Recharge time: ${oldTime.toFixed(2)}s → ${this.shieldRechargeTime.toFixed(2)}s (${(upgrade.value * 100).toFixed(0)}% faster)`);
                }
                break;

            case 'shieldExplosion':
                this.shieldExplosionDamage = upgrade.explosionDamage || 60;
                this.shieldExplosionRadius = upgrade.explosionRadius || 120;
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

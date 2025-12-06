/**
 * EnemyAbilities Component
 * [A] RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all special abilities: dash, teleport, phase, range attacks, boss abilities, etc.
 */

// Constants for damage zone abilities
const TELEGRAPH_DURATION_MS = 700; // Match the 0.7 second telegraph duration

// [OPTIMIZATION] Cached FastMath reference (unique name to avoid global collision)
const _getEnemyAbilitiesFastMath = () => window.FastMath || window.Game?.FastMath;

// Constants for visual effects
const BOSS_DEATH_RING_COUNT = 3;
const BOSS_DEATH_PARTICLES_PER_RING = 40;
const BOSS_DEATH_RING_DELAY_MS = 50;
const BOSS_DEATH_SOUND_DELAY_MS = 150;

class EnemyAbilities {
    constructor(enemy) {
        this.enemy = enemy;

        // Range attack system
        this.canRangeAttack = false;
        this.rangeAttackCooldown = 3.0;
        this.rangeAttackTimer = 0;
        this.projectileSpeed = 200;
        this.projectileDamage = 5;

        // Dash ability
        this.canDash = false;
        this.dashCooldown = 5.0;
        this.dashTimer = 0;
        this.dashSpeed = 400;
        this.dashDuration = 0.5;
        this.isDashing = false;
        this.dashDirection = { x: 0, y: 0 };

        // Teleport ability
        this.canTeleport = false;
        this.teleportCooldown = 4.0;
        this.teleportTimer = 0;
        this.teleportRange = 200;

        // Phase ability (phantom enemies)
        this.canPhase = false;
        this.phaseTimer = 0;
        this.phaseDuration = 2.0;
        this.phaseInvisibleDuration = 1.5;
        this.isVisible = true;

        // Shield ability
        this.hasShield = false;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 3.0;
        this.shieldCooldown = 8.0;
        this.shieldReflection = 0.3;

        // Boss-specific abilities
        this.canSpawnMinions = false;
        this.spawnMinionCooldown = 8.0;
        this.spawnMinionTimer = 0;
        this.minionCount = 2;
        this.minionTypes = ['basic', 'fast'];

        this.canCreateDamageZones = false;
        this.damageZoneTimer = 0;
        this.damageZoneCooldown = 6.0;

        // Death effects
        this.deathEffect = 'normal';
        this.explosionRadius = 80;
        this.explosionDamage = 30;

        // Healing ability
        this.canHeal = false;
        this.healCooldown = 3.0;
        this.healTimer = 0;
        this.healAmount = 20;
        this.healRange = 150;
    }

    /**
     * Update all abilities
     */
    update(deltaTime, game) {
        // Update cooldown timers
        this.updateCooldowns(deltaTime);

        // Update active abilities
        this.updateActiveAbilities(deltaTime, game);

        // Handle automatic ability usage
        this.handleAutomaticAbilities(deltaTime, game);
    }

    /**
     * Update all cooldown timers
     */
    updateCooldowns(deltaTime) {
        if (this.rangeAttackTimer > 0) {
            this.rangeAttackTimer -= deltaTime;
        }

        if (this.dashTimer > 0) {
            this.dashTimer -= deltaTime;
        }

        if (this.teleportTimer > 0) {
            this.teleportTimer -= deltaTime;
        }

        if (this.spawnMinionTimer > 0) {
            this.spawnMinionTimer -= deltaTime;
        }

        if (this.damageZoneTimer > 0) {
            this.damageZoneTimer -= deltaTime;
        }

        if (this.healTimer > 0) {
            this.healTimer -= deltaTime;
        }
    }

    /**
     * Update currently active abilities
     */
    updateActiveAbilities(deltaTime, game) {
        // Handle active dash
        if (this.isDashing) {
            this.updateDash(deltaTime);
        }

        // Handle phase ability
        if (this.canPhase) {
            this.updatePhase(deltaTime);
        }

        // Handle active shield
        if (this.hasShield) {
            this.updateShield(deltaTime);
        }
    }

    /**
     * Handle abilities that trigger automatically
     */
    handleAutomaticAbilities(deltaTime, game) {
        // Boss minion spawning
        if (this.canSpawnMinions && this.spawnMinionTimer <= 0) {
            this.spawnMinions(game);
            this.spawnMinionTimer = this.spawnMinionCooldown;
        }

        // Boss damage zones
        if (this.canCreateDamageZones && this.damageZoneTimer <= 0) {
            this.createDamageZone(game);
            this.damageZoneTimer = this.damageZoneCooldown;
        }

        // Healer healing
        if (this.canHeal && this.healTimer <= 0) {
            this.healNearbyEnemies(game);
            this.healTimer = this.healCooldown;
        }
    }

    /**
     * Perform attack based on current pattern
     */
    performAttack(game, target, attackPattern = 0) {
        if (!target || !game) return;

        // Boss enemies have special attack patterns
        if (this.enemy.isBoss && this.enemy.attackPatterns) {
            const pattern = this.enemy.attackPatterns[attackPattern] || this.enemy.attackPatterns[0];

            switch (pattern.name) {
                case 'spread':
                    this.performSpreadAttack(game, target, pattern.projectiles || 3);
                    break;
                case 'circle':
                    this.performCircleAttack(game, target, pattern.projectiles || 8);
                    break;
                case 'random':
                    this.performRandomAttack(game, target, pattern.projectiles || 5);
                    break;
                default:
                    this.performBasicRangeAttack(game, target);
                    break;
            }
        } else if (this.canRangeAttack && this.rangeAttackTimer <= 0) {
            // Regular ranged attack
            this.performBasicRangeAttack(game, target);
            this.rangeAttackTimer = this.rangeAttackCooldown;
        }
    }

    /**
     * Basic ranged attack
     */
    performBasicRangeAttack(game, target) {
        if (!game.spawnEnemyProjectile) return;

        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const angle = Math.atan2(dy, dx);

        game.spawnEnemyProjectile(
            this.enemy.x,
            this.enemy.y,
            Math.cos(angle) * this.projectileSpeed,
            Math.sin(angle) * this.projectileSpeed,
            this.projectileDamage
        );

        // Create muzzle flash effect
        this.createMuzzleFlash(angle);
    }

    /**
     * Spread attack pattern (boss ability)
     */
    performSpreadAttack(game, target, projectileCount) {
        if (!game.spawnEnemyProjectile) return;

        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const baseAngle = Math.atan2(dy, dx);
        const spreadAngle = Math.PI / 4; // 45 degree spread

        for (let i = 0; i < projectileCount; i++) {
            const angle = baseAngle - spreadAngle / 2 + (spreadAngle / (projectileCount - 1)) * i;

            game.spawnEnemyProjectile(
                this.enemy.x,
                this.enemy.y,
                Math.cos(angle) * this.projectileSpeed,
                Math.sin(angle) * this.projectileSpeed,
                this.projectileDamage
            );
        }

        // Create enhanced muzzle flash for spread attack
        this.createSpreadMuzzleFlash(baseAngle, spreadAngle);

        if (window.audioSystem?.playBossAttackSound) {
            window.audioSystem.playBossAttackSound(0.5, 0);
        }
    }

    /**
     * Circle attack pattern (boss ability)
     */
    performCircleAttack(game, target, projectileCount) {
        if (!game.spawnEnemyProjectile) return;

        const angleStep = (Math.PI * 2) / projectileCount;

        for (let i = 0; i < projectileCount; i++) {
            const angle = angleStep * i;

            game.spawnEnemyProjectile(
                this.enemy.x,
                this.enemy.y,
                Math.cos(angle) * this.projectileSpeed,
                Math.sin(angle) * this.projectileSpeed,
                this.projectileDamage
            );
        }

        // Create circular muzzle flash effect
        this.createCircularMuzzleFlash();

        if (window.audioSystem?.playBossChargeSound) {
            window.audioSystem.playBossChargeSound(0.6, 0);
        }
    }

    /**
     * Random attack pattern (boss ability)
     */
    performRandomAttack(game, target, projectileCount) {
        if (!game.spawnEnemyProjectile) return;

        for (let i = 0; i < projectileCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = this.projectileSpeed * (0.8 + Math.random() * 0.4); // Vary speed

            game.spawnEnemyProjectile(
                this.enemy.x,
                this.enemy.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.projectileDamage
            );
        }

        // Create chaotic muzzle flash effect
        this.createChaoticMuzzleFlash();
    }

    /**
     * Dash ability
     */
    startDash(target) {
        if (!this.canDash || this.dashTimer > 0 || this.isDashing) return false;

        // Calculate dash direction towards target
        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const FM = _getEnemyAbilitiesFastMath();
        const distance = FM ? FM.sqrt(dx * dx + dy * dy) : Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.dashDirection.x = dx / distance;
            this.dashDirection.y = dy / distance;
        } else {
            this.dashDirection.x = 1;
            this.dashDirection.y = 0;
        }

        this.isDashing = true;
        this.dashTimer = this.dashCooldown;

        // Create dash effect
        this.createDashEffect();

        return true;
    }

    /**
     * Update dash movement
     */
    updateDash(deltaTime) {
        if (!this.isDashing) return;

        // Track remaining dash time separately to preserve configured duration
        if (this._dashTimeRemaining === undefined) {
            this._dashTimeRemaining = this.dashDuration;
        }

        this._dashTimeRemaining -= deltaTime;

        if (this._dashTimeRemaining <= 0) {
            this.isDashing = false;
            this._dashTimeRemaining = undefined; // Reset for next dash
        }
    }

    /**
     * Teleport ability
     */
    performTeleport(target) {
        if (!this.canTeleport || this.teleportTimer > 0) return false;

        // Teleport to a position near the target
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * this.teleportRange;

        const newX = target.x + Math.cos(angle) * distance;
        const newY = target.y + Math.sin(angle) * distance;

        // Create teleport out effect
        this.createTeleportEffect(this.enemy.x, this.enemy.y);

        // Move enemy
        this.enemy.x = newX;
        this.enemy.y = newY;

        // Create teleport in effect
        this.createTeleportEffect(newX, newY);

        this.teleportTimer = this.teleportCooldown;

        return true;
    }

    /**
     * Update phase ability (phantom enemies)
     */
    updatePhase(deltaTime) {
        this.phaseTimer += deltaTime;

        const cycleDuration = this.phaseDuration + this.phaseInvisibleDuration;
        const cycleTime = this.phaseTimer % cycleDuration;

        if (cycleTime < this.phaseDuration) {
            this.isVisible = true;
        } else {
            this.isVisible = false;
        }
    }

    /**
     * Update shield ability
     */
    updateShield(deltaTime) {
        if (this.shieldActive) {
            this.shieldTimer += deltaTime;

            if (this.shieldTimer >= this.shieldDuration) {
                this.shieldActive = false;
                this.shieldTimer = 0;
            }
        } else {
            this.shieldTimer += deltaTime;

            if (this.shieldTimer >= this.shieldCooldown) {
                this.activateShield();
            }
        }
    }

    /**
     * Activate shield
     */
    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = 0;

        // Create shield activation effect
        this.createShieldEffect();
    }

    /**
     * Spawn minions (boss ability)
     */
    spawnMinions(game) {
        if (!this.canSpawnMinions || !game.addEntity) return;

        // Check if we have a max minion limit and count current minions
        if (this.maxMinionsAlive > 0) {
            // Count how many minions from this summoner are still alive
            let currentMinions = 0;
            if (game.enemies && Array.isArray(game.enemies)) {
                currentMinions = game.enemies.filter(e =>
                    e.summonedBy === this.enemy && !e.isDead
                ).length;
            }

            // Don't spawn if we're at the limit
            if (currentMinions >= this.maxMinionsAlive) {
                return;
            }

            // Spawn fewer minions if we're close to the limit
            const spawnCount = Math.min(this.minionCount, this.maxMinionsAlive - currentMinions);
            if (spawnCount <= 0) return;

            for (let i = 0; i < spawnCount; i++) {
                this.spawnSingleMinion(game, i, spawnCount);
            }
        } else {
            // No limit, spawn normally
            for (let i = 0; i < this.minionCount; i++) {
                this.spawnSingleMinion(game, i, this.minionCount);
            }
        }

        // Create minion spawn effect
        this.createMinionSpawnEffect();

        // Show floating text with different styling for summoners
        if (window.gameManager) {
            const isSummoner = this.enemy.enemyType === 'summoner';
            const textColor = isSummoner ?
                (window.GAME_CONSTANTS?.COLORS?.SUMMONER_TEXT || 'rgba(187, 107, 217, 0.9)') :
                '#e74c3c';
            const message = isSummoner ? 'SUMMONING!' : 'MINIONS SUMMONED!';

            window.gameManager.showFloatingText(
                message,
                this.enemy.x,
                this.enemy.y - 40,
                textColor,
                20
            );
        }
    }

    /**
     * Spawn a single minion
     */
    spawnSingleMinion(game, index, totalCount) {
        const angle = (index / totalCount) * Math.PI * 2;
        const distance = 80 + Math.random() * 40;

        const x = this.enemy.x + Math.cos(angle) * distance;
        const y = this.enemy.y + Math.sin(angle) * distance;

        // Pick random minion type
        const minionType = this.minionTypes[Math.floor(Math.random() * this.minionTypes.length)];

        const minion = new Enemy(x, y, minionType);

        // Track which summoner created this minion
        minion.summonedBy = this.enemy;

        // Scale minion based on boss difficulty (or summoner difficulty for non-boss summoners)
        if (window.gameManager && window.gameManager.difficultyFactor) {
            const scaling = this.enemy.isBoss
                ? window.gameManager.difficultyFactor * 0.7 // Boss minions are weaker
                : window.gameManager.difficultyFactor * 0.5; // Summoner minions are even weaker
            minion.maxHealth = Math.ceil(minion.maxHealth * scaling);
            minion.health = minion.maxHealth;
            minion.damage = Math.ceil(minion.damage * scaling);
        }

        game.addEntity(minion);
    }

    /**
     * Create damage zone (boss ability) - ENHANCED VERSION
     */
    createDamageZone(game) {
        if (!this.canCreateDamageZones || !game.addEntity) return;
        if (!game.player || game.player.isDead) return;

        const DamageZone = window.Game?.DamageZone;
        const DamageZoneTelegraph = window.Game?.DamageZoneTelegraph;
        const Patterns = window.Game?.DamageZonePatterns;

        if (!DamageZone || !DamageZoneTelegraph || !Patterns) return;

        // Determine boss phase (based on health percentage)
        const healthPercent = this.enemy.health / this.enemy.maxHealth;
        const isMegaBoss = this.enemy.isMegaBoss;

        // Select pattern based on boss phase and type
        let pattern, zoneCount, zoneType;

        if (healthPercent > 0.7) {
            // Phase 1: Easy patterns, standard zones
            pattern = Math.random() < 0.5 ? 'predictive' : 'scatter';
            zoneCount = 1;
            zoneType = 'standard';
        } else if (healthPercent > 0.4) {
            // Phase 2: More aggressive, introduce burst zones
            pattern = this._selectRandomPattern(['predictive', 'scatter', 'chase', 'cluster']);
            zoneCount = isMegaBoss ? 2 : 1;
            zoneType = Math.random() < 0.3 ? 'burst' : 'standard';
        } else if (healthPercent > 0.15) {
            // Phase 3: Complex patterns, more zones, persistent types
            pattern = this._selectRandomPattern(['spiral', 'barrier', 'scatter', 'ring']);
            zoneCount = isMegaBoss ? 4 : 3;
            zoneType = this._selectRandomPattern(['standard', 'burst', 'persistent', 'expanding']);
        } else {
            // Phase 4: FINAL PHASE - Maximum chaos, corrupted zones
            pattern = this._selectRandomPattern(['spiral', 'barrier', 'ring', 'scatter']);
            zoneCount = isMegaBoss ? 6 : 4;
            zoneType = this._selectRandomPattern(['burst', 'expanding', 'corrupted']);
        }

        // Get positions from pattern
        const positions = Patterns[pattern]?.(game, this.enemy, zoneCount) || [];

        if (positions.length === 0) return;

        // Zone type specific parameters
        const zoneParams = this._getDamageZoneParams(zoneType);

        // Spawn telegraphs first, then zones after delay
        positions.forEach((pos, index) => {
            // Spawn telegraph
            const telegraph = new DamageZoneTelegraph(
                pos.x,
                pos.y,
                zoneParams.radius,
                0.7, // warning duration
                zoneType
            );
            game.addEntity(telegraph);

            // Schedule zone spawn after telegraph
            setTimeout(() => {
                if (this.enemy.isDead) return; // Don't spawn if boss died

                const zone = new DamageZone(
                    pos.x,
                    pos.y,
                    zoneParams.radius,
                    this.enemy.damage * zoneParams.damageMultiplier,
                    zoneParams.duration,
                    zoneType
                );
                game.addEntity(zone);

                // Create spawn effect
                this.createDamageZoneSpawnEffect(pos.x, pos.y, zoneType);
            }, TELEGRAPH_DURATION_MS);
        });

        // Show floating text for special patterns
        if (window.gameManager && (zoneCount >= 3 || zoneType === 'corrupted')) {
            const messages = {
                corrupted: 'CORRUPTED ZONES!',
                barrier: 'ZONE BARRIER!',
                spiral: 'SPIRAL ATTACK!',
                ring: 'ZONE RING!'
            };
            const message = messages[zoneType] || messages[pattern] || 'DANGER ZONES!';

            window.gameManager.showFloatingText(
                message,
                this.enemy.x,
                this.enemy.y - 40,
                zoneType === 'corrupted' ? '#8e44ad' : '#e74c3c',
                20
            );
        }

        if (window.audioSystem?.playBossChargeSound) {
            window.audioSystem.playBossChargeSound(0.7, 0);
        }
    }

    /**
     * Helper method to select a random pattern from an array of patterns.
     *
     * @param {Array<string>} patterns - Array of pattern names to choose from.
     * @returns {string} A randomly selected pattern name.
     */
    _selectRandomPattern(patterns) {
        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    /**
     * Returns configuration parameters for a damage zone based on the specified type.
     *
     * @param {string} zoneType - The type of damage zone. Valid values are:
     *   'standard', 'burst', 'persistent', 'expanding', 'corrupted'.
     *   If an invalid value is provided, falls back to 'standard'.
     * @returns {{radius: number, duration: number, damageMultiplier: number}} An object containing:
     *   - radius: The radius of the zone in pixels.
     *   - duration: The duration of the zone in seconds.
     *   - damageMultiplier: The damage multiplier applied within the zone.
     */
    _getDamageZoneParams(zoneType) {
        const params = {
            standard: {
                radius: 60,
                duration: 3.0,
                damageMultiplier: 0.8
            },
            burst: {
                radius: 50,
                duration: 1.5,
                damageMultiplier: 1.2
            },
            persistent: {
                radius: 70,
                duration: 6.0,
                damageMultiplier: 0.4
            },
            expanding: {
                radius: 40, // starts small
                duration: 4.0,
                damageMultiplier: 0.7
            },
            corrupted: {
                radius: 65,
                duration: 3.5,
                damageMultiplier: 0.9
            }
        };

        return params[zoneType] || params.standard;
    }

    /**
     * Creates particle effects when a damage zone spawns.
     *
     * The visual effect varies depending on the zone type:
     * - "standard": Red sparks in a circular burst.
     * - "burst": Orange sparks with higher speed.
     * - "persistent": Darker red sparks.
     * - "expanding": Orange sparks.
     * - "corrupted": Purple sparks and additional smoke particles.
     *
     * @param {number} x - The x-coordinate of the zone's center.
     * @param {number} y - The y-coordinate of the zone's center.
     * @param {string} zoneType - The type of the damage zone ("standard", "burst", "persistent", "expanding", or "corrupted").
     */
    createDamageZoneSpawnEffect(x, y, zoneType) {
        try {
            if (!window.optimizedParticles) return;

            // Use shared color constants from window.Game namespace
            const colors = window.Game?.DAMAGE_ZONE_TYPE_COLORS;
            if (!colors) {
                window.logger.warn('DamageZone colors not available - damageZone.js may not be loaded');
                return;
            }

            const color = colors[zoneType] || colors.standard;
            const segments = zoneType === 'corrupted' ? 32 : 24;

            // Burst effect on spawn
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const speed = zoneType === 'burst' ? 180 : 120;

                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random(),
                    color: color,
                    life: 0.5,
                    type: 'spark'
                });
            }

            // Additional effect for corrupted zones
            if (zoneType === 'corrupted') {
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    window.optimizedParticles.spawnParticle({
                        x: x,
                        y: y,
                        vx: Math.cos(angle) * 60,
                        vy: Math.sin(angle) * 60,
                        size: 3,
                        color: '#5b2c6f',
                        life: 0.8,
                        type: 'smoke'
                    });
                }
            }
        } catch (_) { /* no-op */ }
    }

    /**
     * Handle death effects
     */
    onDeath(game) {
        switch (this.deathEffect) {
            case 'explosion':
                this.createDeathExplosion(game);
                break;
            case 'poison':
                this.createPoisonCloud(game);
                break;
            case 'split':
                this.createSplitEffect(game);
                break;
            case 'boss_explosion':
                this.createBossDeathEffect(game);
                break;
            case 'normal':
            default:
                this.createNormalDeathEffect();
                break;
        }
    }

    /**
     * Create death explosion
     */
    createDeathExplosion(game) {
        const allEnemies = game?.getEnemies?.() ?? [];
        if (!allEnemies.length) return;

        // Damage nearby enemies and player
        const nearbyEntities = [];

        // Check player
        const FM = _getEnemyAbilitiesFastMath();
        if (game.player) {
            const dx = game.player.x - this.enemy.x;
            const dy = game.player.y - this.enemy.y;
            const distance = FM ? FM.sqrt(dx * dx + dy * dy) : Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.explosionRadius) {
                nearbyEntities.push({ entity: game.player, distance });
            }
        }

        // Check other enemies
        const enemies = game?.getEnemiesWithinRadius?.(
            this.enemy.x,
            this.enemy.y,
            this.explosionRadius,
            {
                includeDead: false,
                predicate: (enemy) => enemy !== this.enemy
            }
        ) ?? [];

        enemies.forEach(enemy => {
            const dx = enemy.x - this.enemy.x;
            const dy = enemy.y - this.enemy.y;
            const distance = FM ? FM.sqrt(dx * dx + dy * dy) : Math.sqrt(dx * dx + dy * dy);

            nearbyEntities.push({ entity: enemy, distance });
        });

        // Apply damage
        nearbyEntities.forEach(({ entity, distance }) => {
            const damageMultiplier = 1 - (distance / this.explosionRadius);
            const damage = this.explosionDamage * damageMultiplier;

            if (entity.takeDamage) {
                entity.takeDamage(damage);
            }
        });

        // Create explosion effect
        const helpers = window.Game?.ParticleHelpers;
        if (helpers && typeof helpers.createExplosion === 'function') {
            helpers.createExplosion(
                this.enemy.x,
                this.enemy.y,
                this.explosionRadius,
                '#ff6b35'
            );
        }

        // Play explosion sound
        if (window.audioSystem) {
            window.audioSystem.play('explosion', 0.6);
        }
    }

    /**
     * Create split effect - spawn smaller enemies
     */
    createSplitEffect(game) {
        if (!game || !game.addEntity) return;

        const splitCount = this.splitCount || 3;
        const splitType = this.splitType || 'fast';

        // Spawn smaller enemies in a circle around the death position
        for (let i = 0; i < splitCount; i++) {
            const angle = (i / splitCount) * Math.PI * 2;
            const distance = 40 + Math.random() * 20;

            const x = this.enemy.x + Math.cos(angle) * distance;
            const y = this.enemy.y + Math.sin(angle) * distance;

            // Create smaller enemy
            const splitEnemy = new Enemy(x, y, splitType);

            // Make them slightly weaker than normal
            splitEnemy.maxHealth = Math.floor(splitEnemy.maxHealth * 0.6);
            splitEnemy.health = splitEnemy.maxHealth;
            splitEnemy.damage = Math.floor(splitEnemy.damage * 0.7);

            // Give them a slight outward velocity
            if (splitEnemy.movement) {
                splitEnemy.velocityX = Math.cos(angle) * 150;
                splitEnemy.velocityY = Math.sin(angle) * 150;
            }

            game.addEntity(splitEnemy);
        }

        // Create split effect particles
        const helpers = window.Game?.ParticleHelpers;
        if (helpers && typeof helpers.createExplosion === 'function') {
            helpers.createExplosion(
                this.enemy.x,
                this.enemy.y,
                50,
                '#9b59b6'  // Purple to match splitter color
            );
        }

        // Play split sound
        if (window.audioSystem) {
            window.audioSystem.play('hit', 0.4);
        }
    }

    /**
     * Create spectacular boss death effect
     */
    createBossDeathEffect(game) {
        if (!game) return;

        // Create massive multi-ring explosion
        if (window.optimizedParticles) {
            // Store coordinates to avoid stale reference after delay
            const enemyX = this.enemy.x;
            const enemyY = this.enemy.y;

            // Large outer ring
            for (let ring = 0; ring < BOSS_DEATH_RING_COUNT; ring++) {
                const particlesInRing = BOSS_DEATH_PARTICLES_PER_RING;
                const delay = ring * BOSS_DEATH_RING_DELAY_MS;  // Delayed rings for wave effect

                setTimeout(() => {
                    for (let i = 0; i < particlesInRing; i++) {
                        const angle = (i / particlesInRing) * Math.PI * 2;
                        const speed = 150 + ring * 50 + Math.random() * 80;

                        window.optimizedParticles.spawnParticle({
                            x: enemyX,
                            y: enemyY,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: 6 + Math.random() * 4,
                            color: ring === 0 ? '#ff0000' : ring === 1 ? '#ff6b35' : '#ffd700',
                            life: 1.5 + Math.random() * 0.8
                        });
                    }
                }, delay);
            }

            // Central explosion burst
            for (let i = 0; i < 60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 200;

                window.optimizedParticles.spawnParticle({
                    x: enemyX + (Math.random() - 0.5) * 30,
                    y: enemyY + (Math.random() - 0.5) * 30,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 4 + Math.random() * 5,
                    color: ['#ff0000', '#ff6b35', '#ffd700', '#fff'][Math.floor(Math.random() * 4)],
                    life: 1.2 + Math.random() * 1.0
                });
            }
        }

        // Create boss explosion effect with ParticleHelpers
        const helpers = window.Game?.ParticleHelpers;
        if (helpers && typeof helpers.createExplosion === 'function') {
            helpers.createExplosion(
                this.enemy.x,
                this.enemy.y,
                120,  // Large radius
                '#ff0000'
            );
        }

        // Massive screen shake
        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(8, 0.5);
        }

        // Play boss death sound
        if (window.audioSystem) {
            window.audioSystem.play('explosion', 0.9);
            // Add a second delayed explosion sound for extra impact
            setTimeout(() => {
                if (window.audioSystem) {
                    window.audioSystem.play('explosion', 0.7);
                }
            }, BOSS_DEATH_SOUND_DELAY_MS);
        }
    }

    /**
     * Heal nearby enemies
     */
    healNearbyEnemies(game) {
        if (!game || !game.getEnemiesWithinRadius) return;

        // Find damaged enemies within range
        const nearbyEnemies = game.getEnemiesWithinRadius(
            this.enemy.x,
            this.enemy.y,
            this.healRange,
            {
                includeDead: false,
                predicate: (enemy) => enemy !== this.enemy && enemy.health < enemy.maxHealth
            }
        );

        if (nearbyEnemies.length === 0) return;

        // Sort by health (prioritize most damaged)
        nearbyEnemies.sort((a, b) => {
            const aHealthPercent = a.health / a.maxHealth;
            const bHealthPercent = b.health / b.maxHealth;
            return aHealthPercent - bHealthPercent;
        });

        // Heal the most damaged enemy
        const targetEnemy = nearbyEnemies[0];
        const healAmount = Math.min(this.healAmount, targetEnemy.maxHealth - targetEnemy.health);
        targetEnemy.health += healAmount;

        // Create healing effect particles
        if (window.optimizedParticles) {
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const speed = 60 + Math.random() * 30;
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x,
                    y: this.enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random(),
                    color: '#2ecc71',  // Green healing particles
                    life: 0.6
                });
            }

            // Particles on the healed enemy
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 40;
                window.optimizedParticles.spawnParticle({
                    x: targetEnemy.x,
                    y: targetEnemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 30,  // Float upward
                    size: 3,
                    color: '#2ecc71',
                    life: 0.8
                });
            }
        }

        // Show floating heal text
        if (window.gameManager?.showFloatingText) {
            window.gameManager.showFloatingText(
                `+${Math.round(healAmount)}`,
                targetEnemy.x,
                targetEnemy.y - 20,
                '#2ecc71',
                16
            );
        }

        // Play heal sound
        if (window.audioSystem) {
            window.audioSystem.play('hit', 0.3, 1.5);  // Higher pitch for heal sound
        }
    }

    /**
     * Visual effect methods
     */
    createMinionSpawnEffect() {
        try {
            if (!window.optimizedParticles) return;

            // Different effect for summoners vs bosses
            const isSummoner = this.enemy.enemyType === 'summoner';
            const particleColor = isSummoner ?
                (window.GAME_CONSTANTS?.COLORS?.SUMMONER_TEXT || 'rgba(187, 107, 217, 0.9)') :
                '#e74c3c';
            const count = isSummoner ? 20 : 12; // More particles for summoners

            // Burst effect
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const speed = 120 + Math.random() * 60;
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x + Math.cos(angle) * 10,
                    y: this.enemy.y + Math.sin(angle) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: isSummoner ? 3 + Math.random() * 2 : 2 + Math.random() * 2,
                    color: particleColor,
                    life: isSummoner ? 0.8 : 0.5,
                    type: 'spark'
                });
            }

            // Add a pulsing ring effect for summoners
            if (isSummoner) {
                const ringSegments = 16;
                const ringRadius = 30;
                for (let i = 0; i < ringSegments; i++) {
                    const angle = (i / ringSegments) * Math.PI * 2;
                    const px = this.enemy.x + Math.cos(angle) * ringRadius;
                    const py = this.enemy.y + Math.sin(angle) * ringRadius;
                    window.optimizedParticles.spawnParticle({
                        x: px,
                        y: py,
                        vx: Math.cos(angle) * 40,
                        vy: Math.sin(angle) * 40,
                        size: 2,
                        color: 'rgba(147, 87, 177, 0.7)',
                        life: 0.6,
                        type: 'spark'
                    });
                }
            }
        } catch (_) { /* no-op */ }
    }

    createMuzzleFlash(angle) {
        if (window.optimizedParticles) {
            for (let i = 0; i < 3; i++) {
                const spread = (Math.random() - 0.5) * 0.3;
                const flashAngle = angle + spread;
                const speed = 150 + Math.random() * 100;

                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x + Math.cos(angle) * 20,
                    y: this.enemy.y + Math.sin(angle) * 20,
                    vx: Math.cos(flashAngle) * speed,
                    vy: Math.sin(flashAngle) * speed,
                    size: 2 + Math.random() * 2,
                    color: '#f39c12',
                    life: 0.2,
                    type: 'spark'
                });
            }
        }
    }

    createDashEffect() {
        if (window.optimizedParticles) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 40;

                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x,
                    y: this.enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 2,
                    color: this.enemy.color,
                    life: 0.5,
                    type: 'spark'
                });
            }
        }
    }

    // Visual helpers for ranged attacks
    createSpreadMuzzleFlash(baseAngle, spreadAngle) {
        if (!window.optimizedParticles) return;
        const count = 5;
        for (let i = 0; i < count; i++) {
            const t = (i / (count - 1)) - 0.5;
            const a = baseAngle + t * spreadAngle;
            const speed = 140 + Math.random() * 80;
            window.optimizedParticles.spawnParticle({
                x: this.enemy.x + Math.cos(baseAngle) * 18,
                y: this.enemy.y + Math.sin(baseAngle) * 18,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                size: 2 + Math.random() * 2,
                color: '#f39c12',
                life: 0.2,
                type: 'spark'
            });
        }
    }

    createCircularMuzzleFlash() {
        if (!window.optimizedParticles) return;
        const segments = 10;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const speed = 120 + Math.random() * 60;
            window.optimizedParticles.spawnParticle({
                x: this.enemy.x,
                y: this.enemy.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2,
                color: '#f39c12',
                life: 0.2,
                type: 'spark'
            });
        }
    }

    createChaoticMuzzleFlash() {
        if (!window.optimizedParticles) return;
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 120;
            window.optimizedParticles.spawnParticle({
                x: this.enemy.x,
                y: this.enemy.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2,
                color: '#f39c12',
                life: 0.18,
                type: 'spark'
            });
        }
    }

    createTeleportEffect(x, y) {
        if (window.optimizedParticles) {
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const speed = 120 + Math.random() * 60;

                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 2,
                    color: '#9b59b6',
                    life: 0.8,
                    type: 'spark'
                });
            }
        }
    }

    createNormalDeathEffect() {
        if (window.optimizedParticles) {
            for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 60 + Math.random() * 80;

                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x,
                    y: this.enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 3,
                    color: this.enemy.color,
                    life: 0.6,
                    type: 'spark'
                });
            }
        }
    }

    createShieldEffect() {
        try {
            if (!window.optimizedParticles) return;
            const segments = 20;
            const radius = (this.enemy.radius || 15) + 10;
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = this.enemy.x + Math.cos(angle) * radius;
                const y = this.enemy.y + Math.sin(angle) * radius;
                window.optimizedParticles.spawnParticle({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20,
                    size: 2,
                    color: '#3498db',
                    life: 0.4,
                    type: 'spark'
                });
            }
        } catch (_) { /* no-op */ }
    }

    /**
     * Configure abilities for specific enemy type
     */
    configureForEnemyType(enemyType) {
        switch (enemyType) {
            case 'ranged':
                this.canRangeAttack = true;
                this.rangeAttackCooldown = 3.0;
                break;
            case 'dasher':
                this.canDash = true;
                this.dashCooldown = 5.0;
                this.dashSpeed = 400;
                break;
            case 'teleporter':
                this.canTeleport = true;
                this.teleportCooldown = 4.0;
                break;
            case 'phantom':
                this.canPhase = true;
                this.phaseDuration = 2.0;
                this.phaseInvisibleDuration = 1.5;
                break;
            case 'shielder':
                this.hasShield = true;
                this.shieldReflection = 0.3;
                break;
            case 'exploder':
                this.deathEffect = 'explosion';
                this.explosionRadius = 80;
                this.explosionDamage = 30;
                break;
            case 'splitter':
                this.deathEffect = 'split';
                this.splitCount = 3;
                this.splitType = 'fast';
                break;
            case 'healer':
                this.canHeal = true;
                this.healCooldown = 3.0;
                this.healAmount = 20;
                this.healRange = 150;
                break;
            case 'boss':
                this.canRangeAttack = true;
                this.canSpawnMinions = true;
                this.canCreateDamageZones = true;
                this.hasShield = true;
                this.rangeAttackCooldown = 2.0;
                this.spawnMinionCooldown = 8.0;
                this.damageZoneCooldown = 6.0;
                this.deathEffect = 'boss_explosion';  // Special boss death effect
                break;
        }
    }

    /**
     * Get current abilities state
     */
    getAbilitiesState() {
        return {
            canRangeAttack: this.canRangeAttack,
            rangeAttackReady: this.rangeAttackTimer <= 0,
            canDash: this.canDash,
            dashReady: this.dashTimer <= 0,
            isDashing: this.isDashing,
            canTeleport: this.canTeleport,
            teleportReady: this.teleportTimer <= 0,
            isVisible: this.isVisible,
            shieldActive: this.shieldActive,
            deathEffect: this.deathEffect
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemyAbilities = EnemyAbilities;
}

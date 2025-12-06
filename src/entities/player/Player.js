class Player {
    constructor(x, y) {
        // Core position and identity
        this.x = x;
        this.y = y;
        this.type = 'player';

        // Get constants reference once for better performance
        const PLAYER_CONSTANTS = window.GAME_CONSTANTS?.PLAYER || {};
        const COLORS = window.GAME_CONSTANTS?.COLORS || {};

        this.radius = PLAYER_CONSTANTS.RADIUS || 20;
        const defaultColor = COLORS.PLAYER || '#3498db';
        this.color = defaultColor;
        this.glowColor = '#00ffff';
        this.trailColor = this.glowColor;

        const activeGameState =
            window.gameManager?.state ||
            window.gameManager?.game?.state ||
            null;
        this.gameState = activeGameState || null;

        const characterDefinitions = Array.isArray(window.CHARACTER_DEFINITIONS)
            ? window.CHARACTER_DEFINITIONS
            : [];
        const defaultCharacterId = characterDefinitions[0]?.id || 'aegis_vanguard';

        const selectedCharacterId =
            (activeGameState?.getSelectedCharacter?.() ||
                activeGameState?.flow?.selectedCharacter ||
                defaultCharacterId);

        const resolvedCharacter = this.resolveCharacterDefinition(selectedCharacterId);
        const characterId = resolvedCharacter?.id || defaultCharacterId;

        const defaultWeaponId = 'pulse_cannon';
        let selectedWeaponId =
            resolvedCharacter?.weaponId ||
            activeGameState?.getSelectedWeapon?.() ||
            activeGameState?.flow?.selectedWeapon ||
            defaultWeaponId;

        if (resolvedCharacter?.weaponId) {
            selectedWeaponId = resolvedCharacter.weaponId;
        }

        activeGameState?.setSelectedCharacter?.(characterId);
        activeGameState?.setSelectedWeapon?.(selectedWeaponId);

        this.characterId = characterId;
        this.characterDefinition = resolvedCharacter || null;
        this.startingWeapon = selectedWeaponId;

        const classColorsTable = window.GAME_CONSTANTS?.PLAYER?.CLASS_COLORS || {};
        const palette = classColorsTable[this.characterId] || classColorsTable.default || { core: defaultColor, glow: '#00ffff' };
        this.color = palette.core || defaultColor;
        this.glowColor = palette.glow || '#00ffff';
        this.trailColor = palette.glow || this.color;

        // Initialize modular systems
        this.stats = new PlayerStats(this);
        this.movement = new PlayerMovement(this);
        this.combat = new PlayerCombat(this);
        this.abilities = new PlayerAbilities(this);
        this.renderer = new PlayerRenderer(this);

        // Upgrade tracking
        this.upgrades = [];

        if (this.characterDefinition) {
            this.applyCharacterDefinition(this.characterDefinition);
        }

        // Apply meta upgrades from Star Vendor
        this.applyMetaUpgrades();
    }

    /**
     * Apply meta upgrades from Star Vendor (persistent upgrades)
     */
    applyMetaUpgrades() {
        // Safe localStorage access using centralized StorageManager
        const getMetaLevel = (id) => {
            const StorageManager = window.StorageManager;
            if (!StorageManager || typeof StorageManager.getInt !== 'function') {
                return 0;
            }

            try {
                return StorageManager.getInt(`meta_${id}`, 0);
            } catch (error) {
                window.logger?.warn?.('[Player] Failed to read meta upgrade level', { id, error });
                return 0;
            }
        };

        // Enhanced Firepower - Starting damage boost
        const damageLevel = getMetaLevel('starting_damage');
        if (damageLevel > 0 && this.combat && typeof this.combat.attackDamage === 'number') {
            const damageBonus = Math.max(1, Math.min(3, 1 + (damageLevel * 0.25))); // 25% per level, capped at 3x
            this.combat.attackDamage *= damageBonus;
        }

        // Reinforced Hull - Starting health boost
        const healthLevel = getMetaLevel('starting_health');
        if (healthLevel > 0 && this.stats && typeof this.stats.maxHealth === 'number') {
            const healthBonus = Math.max(1, Math.min(3, 1 + (healthLevel * 0.20))); // 20% per level, capped at 3x
            this.stats.maxHealth *= healthBonus;
            this.stats.health = this.stats.maxHealth; // Set current health to new max
        }

        // Ion Thrusters - Starting speed boost
        const speedLevel = getMetaLevel('starting_speed');
        if (speedLevel > 0 && this.movement && typeof this.movement.speed === 'number') {
            const speedBonus = Math.max(1, Math.min(2.5, 1 + (speedLevel * 0.15))); // 15% per level, capped at 2.5x
            this.movement.speed *= speedBonus;
        }

        // Chain Lightning Mastery - Improved chain lightning
        const chainLevel = getMetaLevel('chain_upgrade');
        if (chainLevel > 0 && this.abilities) {
            this.abilities.maxChains = Math.max(this.abilities.maxChains || 2, 2 + Math.min(chainLevel, 5)); // Cap at +5 chains
        }
    }

    resolveCharacterDefinition(characterId) {
        const definitions = Array.isArray(window.CHARACTER_DEFINITIONS)
            ? window.CHARACTER_DEFINITIONS
            : [];
        if (!definitions.length) return null;

        const cloneDefinition = (def) => {
            if (!def) return null;
            return {
                ...def,
                highlights: Array.isArray(def.highlights) ? [...def.highlights] : undefined,
                modifiers: def.modifiers ? JSON.parse(JSON.stringify(def.modifiers)) : undefined
            };
        };

        const isUnlocked = (def) => this.isCharacterUnlocked(def);
        const unlockedPool = definitions.filter(isUnlocked);

        if (characterId) {
            const match = definitions.find(def => def.id === characterId);
            if (match && isUnlocked(match)) {
                return cloneDefinition(match);
            }
        }

        const fallback = unlockedPool[0] || definitions[0];
        return cloneDefinition(fallback);
    }

    applyCharacterDefinition(definition) {
        if (!definition) return;
        const mods = definition.modifiers || {};

        const statsMods = mods.stats || {};
        if (this.stats) {
            if (typeof statsMods.healthMultiplier === 'number' && statsMods.healthMultiplier > 0) {
                this.stats.maxHealth *= statsMods.healthMultiplier;
            }
            if (typeof statsMods.flatHealth === 'number') {
                this.stats.maxHealth += statsMods.flatHealth;
            }
            if (typeof this.stats.maxHealth === 'number') {
                this.stats.maxHealth = Math.max(1, this.stats.maxHealth);
                this.stats.health = this.stats.maxHealth;
            }
            if (typeof statsMods.regeneration === 'number') {
                this.stats.regeneration += statsMods.regeneration;
            }
            if (typeof statsMods.damageReduction === 'number') {
                const newReduction = (this.stats.damageReduction || 0) + statsMods.damageReduction;
                this.stats.damageReduction = Math.min(0.8, Math.max(0, newReduction));
            }
            if (typeof statsMods.lifesteal === 'number') {
                this.stats.lifestealAmount += statsMods.lifesteal;
            }
        }

        const combatMods = mods.combat || {};
        if (this.combat) {
            if (typeof combatMods.attackSpeedMultiplier === 'number' && combatMods.attackSpeedMultiplier > 0) {
                this.combat.attackSpeed *= combatMods.attackSpeedMultiplier;
            }
            if (typeof combatMods.attackDamageMultiplier === 'number' && combatMods.attackDamageMultiplier > 0) {
                this.combat.attackDamage *= combatMods.attackDamageMultiplier;
            }
            if (typeof combatMods.projectileSpeedMultiplier === 'number' && combatMods.projectileSpeedMultiplier > 0) {
                this.combat.projectileSpeed *= combatMods.projectileSpeedMultiplier;
            }
            if (typeof combatMods.piercing === 'number') {
                this.combat.piercing = Math.max(this.combat.piercing || 0, combatMods.piercing);
            }
            if (typeof combatMods.critChanceBonus === 'number') {
                const newCrit = (this.combat.critChance || 0) + combatMods.critChanceBonus;
                this.combat.critChance = Math.min(0.95, Math.max(0, newCrit));
            }
        }

        const movementMods = mods.movement || {};
        if (this.movement) {
            if (typeof movementMods.speedMultiplier === 'number' && movementMods.speedMultiplier > 0) {
                this.movement.speed *= movementMods.speedMultiplier;
            }
            if (typeof movementMods.dodgeCooldownMultiplier === 'number' && movementMods.dodgeCooldownMultiplier > 0) {
                this.movement.dodgeCooldown *= movementMods.dodgeCooldownMultiplier;
                this.movement.dodgeCooldown = Math.max(0.4, this.movement.dodgeCooldown);
            }
            if (typeof movementMods.magnetRangeBonus === 'number') {
                this.movement.magnetRange += movementMods.magnetRangeBonus;
                this.movement.magnetRange = Math.max(40, this.movement.magnetRange);
            }
        }

        const abilityMods = mods.abilities || {};
        if (this.abilities) {
            if (abilityMods.chainLightning) {
                const chain = abilityMods.chainLightning;
                this.abilities.hasChainLightning = true;
                if (typeof chain.baseChance === 'number') {
                    this.abilities.chainChance = Math.max(this.abilities.chainChance || 0, chain.baseChance);
                }
                if (typeof chain.damageMultiplier === 'number') {
                    this.abilities.chainDamage = Math.max(this.abilities.chainDamage || 0, chain.damageMultiplier);
                }
                if (typeof chain.range === 'number') {
                    this.abilities.chainRange = Math.max(this.abilities.chainRange || 0, chain.range);
                }
                if (typeof chain.maxChains === 'number') {
                    this.abilities.maxChains = Math.max(this.abilities.maxChains || 0, chain.maxChains);
                }
            }

            // NEW: Orbital ability modifiers
            if (abilityMods.orbital) {
                const orbital = abilityMods.orbital;

                // Grant starter orbital(s)
                if (typeof orbital.starterCount === 'number' && orbital.starterCount > 0) {
                    this.abilities.hasOrbitalAttack = true;
                    this.abilities.orbitCount = orbital.starterCount;

                    // Set orbital base stats (will be used when orbits are created)
                    if (!this.abilities.orbitDamage) {
                        this.abilities.orbitDamage = 0.5; // Base orbital damage multiplier
                    }
                    if (!this.abilities.orbitSpeed) {
                        this.abilities.orbitSpeed = 2.0; // Base orbital rotation speed
                    }
                    if (!this.abilities.orbitRadius) {
                        this.abilities.orbitRadius = 100; // Base orbital radius
                    }
                    if (!this.abilities.maxOrbitalRange) {
                        const baseRange = window.GAME_CONSTANTS?.PLAYER?.BASE_ATTACK_RANGE || 320;
                        this.abilities.maxOrbitalRange = Math.max(baseRange, this.abilities.orbitRadius + 80);
                    }
                }

                // Apply orbital stat multipliers
                if (typeof orbital.damageMultiplier === 'number' && this.abilities.orbitDamage) {
                    this.abilities.orbitDamage *= orbital.damageMultiplier;
                }
                if (typeof orbital.speedMultiplier === 'number' && this.abilities.orbitSpeed) {
                    this.abilities.orbitSpeed *= orbital.speedMultiplier;
                }
                if (typeof orbital.radiusMultiplier === 'number' && this.abilities.orbitRadius) {
                    this.abilities.orbitRadius *= orbital.radiusMultiplier;
                }
            }

            // NEW: Shield ability modifiers
            if (abilityMods.shield) {
                const shield = abilityMods.shield;

                // Grant starter shield
                if (typeof shield.starterCapacity === 'number' && shield.starterCapacity > 0) {
                    this.abilities.initializeShield?.(shield.starterCapacity, shield.rechargeTime);
                }

                // Apply shield stat multipliers
                if (typeof shield.capacityMultiplier === 'number' && this.abilities.shieldMaxCapacity) {
                    this.abilities.shieldMaxCapacity *= shield.capacityMultiplier;
                    this.abilities.shieldCurrent = this.abilities.shieldMaxCapacity; // Refill on capacity increase
                }
                if (typeof shield.rechargeTime === 'number') {
                    this.abilities.shieldRechargeTime = shield.rechargeTime;
                }
                if (typeof shield.rechargeMultiplier === 'number' && this.abilities.shieldRechargeTime) {
                    this.abilities.shieldRechargeTime /= shield.rechargeMultiplier; // Higher multiplier = faster recharge
                }
            }

            // NEW: Explosive ability modifiers (Eclipse Reaper)
            if (abilityMods.explosive) {
                const explosive = abilityMods.explosive;

                // Grant explosive ability
                if (typeof explosive.baseChance === 'number' && explosive.baseChance > 0) {
                    this.abilities.hasExplosiveShots = true;
                    this.abilities.explosiveChance = Math.max(this.abilities.explosiveChance || 0, explosive.baseChance);

                    // Set base explosion stats if not already set
                    if (!this.abilities.explosionRadius || this.abilities.explosionRadius <= 0) {
                        this.abilities.explosionRadius = 70; // Base explosion radius
                    }
                    if (!this.abilities.explosionDamage || this.abilities.explosionDamage <= 0) {
                        this.abilities.explosionDamage = 0.6; // Base explosion damage multiplier
                    }
                }

                // Apply explosive stat multipliers
                if (typeof explosive.damageMultiplier === 'number' && this.abilities.explosionDamage) {
                    this.abilities.explosionDamage *= explosive.damageMultiplier;
                }
                if (typeof explosive.radiusMultiplier === 'number' && this.abilities.explosionRadius) {
                    this.abilities.explosionRadius *= explosive.radiusMultiplier;
                }
            }

            // NEW: Berserker ability modifiers (Cybernetic Berserker)
            if (
                abilityMods.hasBerserker ||
                abilityMods.berserker ||
                typeof abilityMods.berserkerScaling === 'number'
            ) {
                this.abilities.hasBerserker = true;
                const berserker = abilityMods.berserker || {};
                const scalingSource = berserker.scaling ?? abilityMods.berserkerScaling;
                if (typeof scalingSource === 'number') {
                    this.abilities.berserkerScaling = Math.max(this.abilities.berserkerScaling || 0, scalingSource);
                }
                if (typeof berserker.critBonus === 'number') {
                    this.abilities.berserkerCritBonus = Math.max(this.abilities.berserkerCritBonus || 0, berserker.critBonus);
                }
            }

            // NEW: Burn ability modifiers (Inferno Juggernaut)
            const legacyBurn = (abilityMods.hasBurn || abilityMods.burnChance !== undefined ||
                abilityMods.burnDamage !== undefined || abilityMods.burnDuration !== undefined)
                ? {
                    enabled: abilityMods.hasBurn !== false,
                    chance: abilityMods.burnChance,
                    damage: abilityMods.burnDamage,
                    duration: abilityMods.burnDuration,
                    explosionDamage: abilityMods.burnExplosionDamage,
                    explosionRadius: abilityMods.burnExplosionRadius
                }
                : null;

            const burnMods = abilityMods.burn || legacyBurn;
            if (burnMods) {
                if (burnMods.enabled !== false) {
                    this.abilities.hasBurn = true;
                }
                if (typeof burnMods.chance === 'number') {
                    this.abilities.burnChance = Math.max(0, Math.min(0.99, burnMods.chance));
                }
                if (typeof burnMods.damage === 'number') {
                    this.abilities.burnDamage = burnMods.damage;
                }
                if (typeof burnMods.duration === 'number') {
                    this.abilities.burnDuration = burnMods.duration;
                }
                if (typeof burnMods.explosionDamage === 'number') {
                    this.abilities.burnExplosionDamage = Math.max(
                        this.abilities.burnExplosionDamage || 0,
                        burnMods.explosionDamage
                    );
                }
                if (typeof burnMods.explosionRadius === 'number') {
                    this.abilities.burnExplosionRadius = Math.max(
                        this.abilities.burnExplosionRadius || 0,
                        burnMods.explosionRadius
                    );
                }
            }

            // NEW: Gravity well ability modifiers (Void Reaver)
            if (abilityMods.gravityWell) {
                const gravityWell = abilityMods.gravityWell;

                // Enable gravity wells
                if (gravityWell.enabled) {
                    this.abilities.hasGravityWells = true;
                }

                // Apply gravity well stat modifiers
                if (typeof gravityWell.wellRadius === 'number') {
                    this.abilities.gravityWellRadius = gravityWell.wellRadius;
                }
                if (typeof gravityWell.wellDuration === 'number') {
                    this.abilities.gravityWellDuration = gravityWell.wellDuration;
                }
                if (typeof gravityWell.slowAmount === 'number') {
                    this.abilities.gravityWellSlowAmount = gravityWell.slowAmount;
                }
                if (typeof gravityWell.pullStrength === 'number') {
                    this.abilities.gravityWellPullStrength = gravityWell.pullStrength;
                }
                if (typeof gravityWell.damageMultiplier === 'number') {
                    this.abilities.gravityWellDamageMultiplier = gravityWell.damageMultiplier;
                }
            }

            // NEW: Ricochet ability modifiers (Phantom Striker)
            if (abilityMods.ricochet) {
                const ricochet = abilityMods.ricochet;

                // Grant guaranteed ricochet
                if (ricochet.guaranteed || (typeof ricochet.baseBounces === 'number' && ricochet.baseBounces > 0)) {
                    this.abilities.hasGuaranteedRicochet = true;
                    this.abilities.ricochetBounces = ricochet.baseBounces || 2;

                    // Set ricochet base stats
                    if (!this.abilities.ricochetDamage) {
                        this.abilities.ricochetDamage = 0.8; // Base ricochet damage multiplier
                    }
                    if (!this.abilities.ricochetRange) {
                        this.abilities.ricochetRange = 280; // Base ricochet search range
                    }
                }

                // Apply ricochet stat multipliers
                if (typeof ricochet.damageMultiplier === 'number') {
                    this.abilities.ricochetDamage = ricochet.damageMultiplier;
                }
                if (typeof ricochet.range === 'number') {
                    this.abilities.ricochetRange = ricochet.range;

                }
            }
        }

        this.characterHighlights = Array.isArray(definition.highlights)
            ? [...definition.highlights]
            : [];

        if (typeof this.stats._updateHealthBarUI === 'function') {
            this.stats._updateHealthBarUI();
        }
        this.stats.updateXPBar();
        this.combat.updateAttackCooldown?.();
        this.combat.weaponManager?.notifyCombatStatChange();
    }

    // Main update method coordinates all systems
    update(deltaTime, game) {
        // Don't update anything if player is dead
        if (this.isDead) return;

        this.stats.update(deltaTime);
        this.movement.update(deltaTime, game);
        this.combat.update(deltaTime, game);
        this.abilities.update(deltaTime, game);
    }

    // Render method delegates to renderer
    render(ctx) {
        this.renderer.render(ctx);
    }

    // Particle spawning utility
    spawnParticle(x, y, vx = 0, vy = 0, size = 2, color = '#ffffff', life = 1, type = 'basic') {
        // Clean particle spawning - use the best system available
        if (window.optimizedParticles?.spawnParticle) {
            window.optimizedParticles.spawnParticle({ x, y, vx, vy, size, color, life, type });
        } else if (window.gameManager?.addParticleViaEffectsManager && typeof Particle !== 'undefined') {
            const particle = new Particle(x, y, vx, vy, size, color, life);
            window.gameManager.addParticleViaEffectsManager(particle);
        }
    }

    isCharacterUnlocked(definition) {
        if (!definition?.unlockRequirement) {
            return true;
        }
        return this.isRequirementSatisfied(definition.unlockRequirement);
    }

    isRequirementSatisfied(requirement) {
        if (!requirement) {
            return true;
        }

        const ids = this.normalizeRequirementIds(requirement);
        if (!ids.length) {
            return true;
        }

        return ids.every(id => this.isAchievementUnlocked(id));
    }

    normalizeRequirementIds(requirement) {
        if (!requirement) {
            return [];
        }
        if (Array.isArray(requirement.ids) && requirement.ids.length) {
            return requirement.ids.filter(Boolean);
        }
        if (typeof requirement.id === 'string' && requirement.id.trim()) {
            return [requirement.id.trim()];
        }
        return [];
    }

    isAchievementUnlocked(achievementId) {
        if (typeof achievementId !== 'string' || !achievementId.trim()) {
            return false;
        }
        const id = achievementId.trim();

        if (this.gameState?.isAchievementUnlocked?.(id)) {
            return true;
        }

        const metaAchievements = this.gameState?.meta?.achievements;
        if (metaAchievements instanceof Set && metaAchievements.has(id)) {
            return true;
        }

        const achievementSystem = window.achievementSystem;
        if (achievementSystem?.achievements?.[id]?.unlocked) {
            return true;
        }

        return false;
    }

    // === STAT DELEGATION METHODS ===
    heal(amount) { return this.stats.heal(amount); }
    addXP(amount) { return this.stats.addXP(amount); }
    addExperience(amount) { return this.stats.addExperience(amount); }
    takeDamage(amount) { return this.stats.takeDamage(amount); }
    levelUp() { return this.stats.levelUp(); }
    updateXPBar() { return this.stats.updateXPBar(); }

    // === MOVEMENT DELEGATION METHODS ===
    handleMovement(deltaTime, game) { return this.movement.handleMovement(deltaTime, game); }
    handleDodge(deltaTime, game) { return this.movement.handleDodge(deltaTime, game); }
    doDodge() { return this.movement.doDodge(); }
    createTrailParticle(x, y) { return this.movement.createTrailParticle(x, y); }

    // === COMBAT DELEGATION METHODS ===
    attack(game) { return this.combat.attack(game); }
    fireProjectile(game, angle) { return this.combat.fireProjectile(game, angle); }
    executeAOEAttack(game) { return this.combat.executeAOEAttack(game); }
    createAOEEffect() { return this.combat.createAOEEffect(); }
    findNearestEnemy() { return this.combat.findNearestEnemy(); }

    // === ABILITY DELEGATION METHODS ===
    updateOrbitalAttacks(deltaTime, game) { return this.abilities.updateOrbitalAttacks(deltaTime, game); }
    processChainLightning(startEnemy, baseDamage, chainsLeft, hitEnemies) {
        return this.abilities.processChainLightning(startEnemy, baseDamage, chainsLeft, hitEnemies);
    }
    processRicochet(sourceX, sourceY, damage, bouncesLeft, hitEnemies) {
        return this.abilities.processRicochet(sourceX, sourceY, damage, bouncesLeft, hitEnemies);
    }
    createLightningEffect(from, to) { return this.abilities.createLightningEffect(from, to); }
    createRicochetEffect(fromX, fromY, toX, toY) { return this.abilities.createRicochetEffect(fromX, fromY, toX, toY); }

    // === RENDERER DELEGATION METHODS ===
    createUpgradeStackEffect() { return this.renderer.createUpgradeStackEffect(); }

    // === PROPERTY ACCESSORS FOR BACKWARD COMPATIBILITY ===
    // Stats properties
    get health() { return this.stats.health; }
    set health(value) { this.stats.health = value; }
    get maxHealth() { return this.stats.maxHealth; }
    set maxHealth(value) { this.stats.maxHealth = value; }
    get xp() { return this.stats.xp; }
    set xp(value) { this.stats.xp = value; }
    get level() { return this.stats.level; }
    set level(value) { this.stats.level = value; }
    get isDead() { return this.stats.isDead; }
    set isDead(value) { this.stats.isDead = value; }
    get isInvulnerable() { return this.stats.isInvulnerable; }
    set isInvulnerable(value) { this.stats.isInvulnerable = value; }
    get killStreak() { return this.stats.killStreak; }
    set killStreak(value) { this.stats.killStreak = value; }
    get regeneration() { return this.stats.regeneration; }
    set regeneration(value) { this.stats.regeneration = value; }
    get damageReduction() { return this.stats.damageReduction; }
    set damageReduction(value) { this.stats.damageReduction = value; }
    get lifestealAmount() { return this.stats.lifestealAmount; }
    set lifestealAmount(value) { this.stats.lifestealAmount = value; }

    // Movement properties
    get speed() { return this.movement.speed; }
    set speed(value) { this.movement.speed = value; }
    get isDodging() { return this.movement.isDodging; }
    set isDodging(value) { this.movement.isDodging = value; }
    get canDodge() { return this.movement.canDodge; }
    set canDodge(value) { this.movement.canDodge = value; }
    get isMoving() { return this.movement.isMoving; }
    get magnetRange() { return this.movement.magnetRange; }
    set magnetRange(value) { this.movement.magnetRange = value; }

    // Combat properties
    get attackSpeed() { return this.combat.attackSpeed; }
    set attackSpeed(value) { this.combat.attackSpeed = value; }
    get attackDamage() { return this.combat.attackDamage; }
    set attackDamage(value) { this.combat.attackDamage = value; }
    get attackRange() { return this.combat.attackRange; }
    set attackRange(value) { this.combat.attackRange = value; }
    get projectileCount() { return this.combat.projectileCount; }
    set projectileCount(value) { this.combat.projectileCount = value; }
    get projectileSpeed() { return this.combat.projectileSpeed; }
    set projectileSpeed(value) { this.combat.projectileSpeed = value; }
    get projectileSpread() { return this.combat.projectileSpread; }
    set projectileSpread(value) { this.combat.projectileSpread = value; }
    get piercing() { return this.combat.piercing; }
    set piercing(value) { this.combat.piercing = value; }
    get critChance() { return this.combat.critChance; }
    set critChance(value) { this.combat.critChance = value; }
    get critMultiplier() { return this.combat.critMultiplier; }
    set critMultiplier(value) { this.combat.critMultiplier = value; }
    get hasAOEAttack() { return this.combat.hasAOEAttack; }
    set hasAOEAttack(value) { this.combat.hasAOEAttack = value; }
    get hasSpreadAttack() { return this.combat.hasSpreadAttack; }
    set hasSpreadAttack(value) { this.combat.hasSpreadAttack = value; }
    get hasBasicAttack() { return this.combat.hasBasicAttack; }
    set hasBasicAttack(value) { this.combat.hasBasicAttack = value; }

    // Ability properties
    get hasOrbitalAttack() { return this.abilities.hasOrbitalAttack; }
    set hasOrbitalAttack(value) { this.abilities.hasOrbitalAttack = value; }
    get orbitProjectiles() { return this.abilities.orbitProjectiles; }
    get hasChainLightning() { return this.abilities.hasChainLightning; }
    set hasChainLightning(value) { this.abilities.hasChainLightning = value; }
    get hasExplosiveShots() { return this.abilities.hasExplosiveShots; }
    set hasExplosiveShots(value) { this.abilities.hasExplosiveShots = value; }
    get hasRicochet() { return this.abilities.hasRicochet; }
    set hasRicochet(value) { this.abilities.hasRicochet = value; }
    get hasHomingShots() { return this.abilities.hasHomingShots; }
    set hasHomingShots(value) { this.abilities.hasHomingShots = value; }

    // Ability detail properties
    get orbitCount() { return this.abilities.orbitCount; }
    set orbitCount(value) { this.abilities.orbitCount = value; }
    get chainChance() { return this.abilities.chainChance; }
    set chainChance(value) { this.abilities.chainChance = value; }
    get chainDamage() { return this.abilities.chainDamage; }
    set chainDamage(value) { this.abilities.chainDamage = value; }
    get chainRange() { return this.abilities.chainRange; }
    set chainRange(value) { this.abilities.chainRange = value; }
    get maxChains() { return this.abilities.maxChains; }
    set maxChains(value) { this.abilities.maxChains = value; }
    get explosionRadius() { return this.abilities.explosionRadius; }
    set explosionRadius(value) { this.abilities.explosionRadius = value; }
    get explosionDamage() { return this.abilities.explosionDamage; }
    set explosionDamage(value) { this.abilities.explosionDamage = value; }
    get ricochetBounces() { return this.abilities.ricochetBounces; }
    set ricochetBounces(value) { this.abilities.ricochetBounces = value; }
    get ricochetRange() { return this.abilities.ricochetRange; }
    set ricochetRange(value) { this.abilities.ricochetRange = value; }
    get ricochetDamage() { return this.abilities.ricochetDamage; }
    set ricochetDamage(value) { this.abilities.ricochetDamage = value; }

    /**
     * Apply upgrade to player, routing to appropriate component systems.
     *
     * This is the second of two clones in the upgrade flow:
     * 1. UpgradeSystem clones to protect UPGRADE_DEFINITIONS
     * 2. Player clones HERE to protect UpgradeSystem.selectedUpgrades
     *
     * Why clone again?
     * - We mutate the upgrade by adding stackCount/tier metadata
     * - If we didn't clone, we'd corrupt UpgradeSystem.selectedUpgrades array
     * - That array is used for synergy detection, combo tracking, build paths
     *
     * Both clones serve different purposes:
     * - UpgradeSystem.selectedUpgrades: Tracks chosen upgrades for selection logic
     * - player.upgrades: Stores upgrade history with stack data for UI/diminishing returns
     *
     * @param {Object} upgrade - Upgrade instance from UpgradeSystem (already cloned once)
     */
    applyUpgrade(upgrade) {
        // Clone upgrade to protect UpgradeSystem.selectedUpgrades from mutations
        // We add stackCount/tier metadata which would corrupt the tracking array
        let upgradeInstance;
        if (typeof structuredClone === 'function') {
            try {
                upgradeInstance = structuredClone(upgrade);
            } catch (e) {
                // Fallback to JSON clone if structuredClone fails
                upgradeInstance = JSON.parse(JSON.stringify(upgrade));
            }
        } else {
            upgradeInstance = JSON.parse(JSON.stringify(upgrade));
        }

        const existingStacks = this.upgrades.filter(existing => existing.id === upgradeInstance.id).length;
        const newStackCount = existingStacks + 1;
        const tiers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

        upgradeInstance.stackCount = newStackCount;
        upgradeInstance.tier = tiers[Math.min(newStackCount - 1, tiers.length - 1)];

        const isUpgradeStacked = newStackCount > 1;

        this.upgrades.push(upgradeInstance);

        // Route upgrade to appropriate system
        // Route upgrade to appropriate system using centralized handlers
        if (window.UpgradeHandlers) {
            window.UpgradeHandlers.apply(this, upgradeInstance);
        } else {
            window.logger?.error('CRITICAL: UpgradeHandlers system not loaded!');
        }

        if (this.combat.weaponManager) {
            this.combat.weaponManager.applyUpgrade(upgradeInstance);
        }

        // Show upgrade feedback
        if (isUpgradeStacked) {
            const tierText = upgradeInstance.tier ? ` ${upgradeInstance.tier}` : '';
            if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
                window.gameManager.showFloatingText(
                    `${upgradeInstance.name}${tierText} upgraded!`,
                    this.x,
                    this.y - 30,
                    '#e67e22',
                    18
                );
            }
            this.renderer.createUpgradeStackEffect();
        } else {
            if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
                window.gameManager.showFloatingText(
                    `${upgradeInstance.name} acquired!`,
                    this.x,
                    this.y - 30,
                    '#3498db',
                    18
                );
            }
        }
    }

    // Utility method for distance calculation
    distanceTo(other) {
        if (!other || typeof other.x !== 'number' || typeof other.y !== 'number') {
            return Infinity;
        }
        if (typeof this.x !== 'number' || typeof this.y !== 'number') {
            return Infinity;
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Comprehensive debug information
    getDebugInfo() {
        return {
            position: { x: this.x, y: this.y },
            stats: this.stats.getDebugInfo(),
            movement: this.movement.getDebugInfo(),
            combat: this.combat.getDebugInfo(),
            abilities: this.abilities.getDebugInfo(),
            renderer: this.renderer.getDebugInfo()
        };
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.Player = Player;
}

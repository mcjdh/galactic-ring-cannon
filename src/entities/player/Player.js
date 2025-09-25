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
        this.color = COLORS.PLAYER || '#3498db';

        // Initialize modular systems
        this.stats = new PlayerStats(this);
        this.movement = new PlayerMovement(this);
        this.combat = new PlayerCombat(this);
        this.abilities = new PlayerAbilities(this);
        this.renderer = new PlayerRenderer(this);

        // Upgrade tracking
        this.upgrades = [];

        // Apply meta upgrades from Star Vendor
        this.applyMetaUpgrades();
    }

    /**
     * Apply meta upgrades from Star Vendor (persistent upgrades)
     */
    applyMetaUpgrades() {
        const getMetaLevel = (id) => parseInt(localStorage.getItem(`meta_${id}`) || '0', 10);

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

    // Main update method coordinates all systems
    update(deltaTime, game) {
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
        } else if (window.gameManager?.tryAddParticle && typeof Particle !== 'undefined') {
            const particle = new Particle(x, y, vx, vy, size, color, life);
            window.gameManager.tryAddParticle(particle);
        }
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
    findNearestEnemy(enemies) { return this.combat.findNearestEnemy(enemies); }

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

    // Unified upgrade system
    applyUpgrade(upgrade) {
        // Track if this is a stacked upgrade
        const isUpgradeStacked = this.upgrades.some(existing =>
            existing.id === upgrade.id && existing.stackCount);

        // Initialize stack count
        if (!upgrade.stackCount) {
            upgrade.stackCount = 1;
            upgrade.tier = 'I';
        } else {
            upgrade.stackCount++;

            // Set tier indicator based on stack count
            const tiers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            upgrade.tier = tiers[Math.min(upgrade.stackCount - 1, tiers.length - 1)];
        }

        this.upgrades.push(upgrade);

        // Route upgrade to appropriate system
        switch (upgrade.type) {
            // Stats upgrades
            case 'maxHealth':
            case 'regeneration':
            case 'damageReduction':
            case 'lifesteal':
            case 'lifestealCrit':
            case 'lifestealAOE':
                this.stats.applyStatsUpgrade(upgrade);
                break;

            // Movement upgrades
            case 'speed':
            case 'magnet':
            case 'dodgeCooldown':
            case 'dodgeDuration':
            case 'dodgeInvulnerability':
                this.movement.applyMovementUpgrade(upgrade);
                break;

            // Combat upgrades
            case 'attackSpeed':
            case 'attackDamage':
            case 'projectileCount':
            case 'projectileSpread':
            case 'piercing':
            case 'projectileSpeed':
            case 'critChance':
            case 'critDamage':
                this.combat.applyCombatUpgrade(upgrade);
                break;

            // Ability upgrades
            case 'special':
            case 'orbit':
            case 'orbitDamage':
            case 'orbitSpeed':
            case 'orbitSize':
            case 'chain':
            case 'chainDamage':
            case 'chainRange':
            case 'explosionSize':
            case 'explosionDamage':
            case 'explosionChain':
            case 'ricochetBounces':
            case 'ricochetDamage':
                this.abilities.applyAbilityUpgrade(upgrade);
                break;
        }

        // Show upgrade feedback
        if (isUpgradeStacked) {
            const tierText = upgrade.tier ? ` ${upgrade.tier}` : '';
            if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
                window.gameManager.showFloatingText(
                    `${upgrade.name}${tierText} upgraded!`,
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
                    `${upgrade.name} acquired!`,
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
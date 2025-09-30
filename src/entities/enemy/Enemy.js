/**
 * Enemy Class - Modern Component-Based Architecture
 * 🌊 RESONANT NOTE: Refactored to use type system for plug-and-play enemy types
 *
 * Architecture:
 * - EnemyTypeRegistry: Maps type strings to configuration classes
 * - Enemy types in types/: Self-contained enemy definitions
 * - EnemyStats: Handles damage, death, XP drops
 * - EnemyRenderer: Handles all visual rendering
 * - Components (AI/Abilities/Movement): Shared behavior systems
 *
 * Adding new enemy types:
 * 1. Create new class in types/ extending EnemyTypeBase
 * 2. Register in EnemyTypeRegistry
 * 3. Done! No changes to core Enemy class needed
 */

class Enemy {
    constructor(x, y, type = 'basic') {
        // Core enemy properties
        this.x = x;
        this.y = y;
        this.type = 'enemy';
        this.enemyType = type;
        this.id = Math.random().toString(36).substr(2, 9);

        // Initialize default properties (will be overridden by type config)
        this.radius = 15;
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.xpValue = 10;
        this.isDead = false;
        this.color = '#e74c3c';
        this.baseSpeed = 90;

        // Boss properties
        this.isBoss = false;
        this.isMegaBoss = false;
        this.isElite = false;
        this.glowColor = null;

        // Combat properties
        this.damageReduction = 0;
        this.damageResistance = 0;
        this.deflectChance = 0;

        // Phase system for bosses
        this.hasPhases = false;
        this.currentPhase = 1;
        this.phaseThresholds = [0.7, 0.4, 0.15];

        // Attack patterns for bosses
        this.attackPatterns = [];
        this.currentAttackPattern = 0;

        // Visual properties
        this.renderEffects = [];
        this.pulseTimer = 0;
        this.pulseIntensity = 1.0;
        this.damageFlashTimer = 0;
        this.deathTimer = 0;
        this.opacity = 1.0;

        // Collision properties
        this.collidedThisFrame = false;
        this.collisionCooldown = 0;
        this.lastCollisionTime = 0;

        // Target direction for movement (set by AI, used by movement)
        this.targetDirection = { x: 0, y: 0 };

        // Initialize components using composition
        this.ai = new EnemyAI(this);
        this.abilities = new EnemyAbilities(this);
        this.movement = new EnemyMovement(this);

        // Configure based on enemy type using type system
        this.configureEnemyType(type);
    }

    /**
     * Configure enemy using the type system
     * This replaces the massive switch statement with pluggable type classes
     */
    configureEnemyType(type) {
        // Get type class from registry
        const TypeClass = EnemyTypeRegistry.getType(type);

        // Apply type configuration
        TypeClass.configure(this);

        // Configure components
        TypeClass.configureAI(this);
        TypeClass.configureAbilities(this);
        TypeClass.configureMovement(this);
    }

    /**
     * Main update loop - delegates to components
     */
    update(deltaTime, game) {
        // Skip update if dead
        if (this.isDead) return;

        // Update collision cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        }

        // Reset collision flag
        this.collidedThisFrame = false;

        // Update components
        this.ai.update(deltaTime, game);
        this.abilities.update(deltaTime, game);
        this.movement.update(deltaTime, game);

        // Update boss-specific mechanics
        if (this.isBoss) {
            this.updateBossSpecifics(deltaTime, game);
        }

        // Update visual effects
        EnemyStats.updateVisualEffects(this, deltaTime);
    }

    /**
     * Update boss-specific mechanics
     */
    updateBossSpecifics(deltaTime, game) {
        // Handle phase transitions
        if (this.hasPhases && Array.isArray(this.phaseThresholds) && this.phaseThresholds.length > 0) {
            const healthPercent = this.health / (this.maxHealth || 1);
            let newPhase = 1;

            for (let i = 0; i < this.phaseThresholds.length; i++) {
                if (healthPercent <= this.phaseThresholds[i]) {
                    newPhase = i + 2;
                    break;
                }
            }

            if (newPhase !== this.currentPhase) {
                this.onPhaseChange(newPhase, game);
                this.currentPhase = newPhase;
            }
        }
    }

    /**
     * Handle phase changes
     */
    onPhaseChange(newPhase, game) {
        // Create phase change visual effect
        this.createPhaseChangeEffect();

        // Show phase change text
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm) {
            gm.showFloatingText(
                `PHASE ${newPhase}!`,
                this.x,
                this.y - 50,
                '#ff6b35',
                28
            );
        }

        // Update attack pattern based on phase
        if (this.attackPatterns.length > 0) {
            const patternsPerPhase = Math.ceil(this.attackPatterns.length / 4);
            const basePattern = (newPhase - 1) * patternsPerPhase;
            this.currentAttackPattern = Math.min(basePattern, this.attackPatterns.length - 1);
        }
    }

    /**
     * Take damage - delegates to EnemyStats
     */
    takeDamage(amount, options = {}) {
        EnemyStats.takeDamage(this, amount, options);
    }

    /**
     * Handle enemy death - delegates to EnemyStats
     */
    die() {
        EnemyStats.die(this);
    }

    /**
     * Callback when taking damage (can be overridden by enemy types)
     */
    onTakeDamage(amount) {
        // Override in enemy type classes for special behavior
    }

    /**
     * Setup attack patterns for boss enemies
     */
    setupBossAttackPatterns() {
        this.attackPatterns = [
            { name: "basic", cooldown: 2.0 },
            { name: "spread", cooldown: 1.8, projectiles: 3 },
            { name: "circle", cooldown: 1.5, projectiles: 8 },
            { name: "random", cooldown: 1.0, projectiles: 5 }
        ];
    }

    /**
     * Create phase change particle effect
     */
    createPhaseChangeEffect() {
        if (window.optimizedParticles) {
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const speed = 150 + Math.random() * 100;

                window.optimizedParticles.spawnParticle({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 4 + Math.random() * 3,
                    color: '#ff6b35',
                    life: 1.0,
                    type: 'spark'
                });
            }
        }
    }

    /**
     * Create death effect
     */
    createDeathEffect() {
        // Death effect is handled by abilities component
        this.abilities.onDeath(window.gameManager?.game);
    }

    /**
     * Render the enemy - delegates to EnemyRenderer
     */
    render(ctx) {
        EnemyRenderer.render(this, ctx);
    }

    /**
     * Get comprehensive enemy state for debugging/UI
     */
    getState() {
        return {
            // Core properties
            x: this.x,
            y: this.y,
            health: this.health,
            maxHealth: this.maxHealth,
            enemyType: this.enemyType,
            isDead: this.isDead,
            isBoss: this.isBoss,
            isElite: this.isElite,
            currentPhase: this.currentPhase,

            // Component states
            ai: this.ai.getAIState(),
            abilities: this.abilities.getAbilitiesState(),
            movement: this.movement.getMovementState()
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
}

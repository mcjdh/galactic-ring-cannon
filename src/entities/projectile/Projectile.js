/**
 * Projectile Class - Modern Behavior-Based Architecture
 * 🌊 RESONANT NOTE: Refactored from 571 LOC monolith to clean composition
 *
 * Architecture:
 * - BehaviorManager: Handles all upgrade logic (piercing, ricochet, explosive, etc.)
 * - ProjectileRenderer: Handles all visual rendering
 * - Projectile: Just core state and coordination
 *
 * Adding new behavior types:
 * 1. Create new behavior class in behaviors/ extending ProjectileBehaviorBase
 * 2. Register in ProjectileFactory
 * 3. Done! No changes to core Projectile class needed
 */

class Projectile {
    constructor(x, y, vxOrConfig, vyOrOwnerId, damage, piercingOrCrit = 0, isCrit = false, specialType = null) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;

        // Check for new config-based signature: (x, y, config, ownerId)
        if (typeof vxOrConfig === 'object' && vxOrConfig !== null) {
            const config = vxOrConfig;
            const ownerId = vyOrOwnerId;

            this.vx = config.vx || 0;
            this.vy = config.vy || 0;
            this.damage = config.damage || 10;
            this.piercing = config.piercing || 0;
            this.isCrit = config.isCrit || false;
            this.ownerId = ownerId;

            // Handle legacy flags in config
            this.specialType = config.specialType || null;

            // Store config for reset
            this.config = config;
        } else {
            // Legacy signature: (x, y, vx, vy, damage, piercing, isCrit, specialType)
            this.vx = vxOrConfig;
            this.vy = vyOrOwnerId;
            this.damage = damage;

            if (typeof piercingOrCrit === 'boolean') {
                this.isCrit = piercingOrCrit;
                this.piercing = 0;
            } else {
                this.piercing = piercingOrCrit || 0;
                this.isCrit = isCrit || false;
                this.specialType = specialType;
            }

            // Construct config object for future resets
            this.config = {
                vx: this.vx,
                vy: this.vy,
                damage: this.damage,
                piercing: this.piercing,
                isCrit: this.isCrit,
                specialType: this.specialType
            };
        }

        this.radius = this.isCrit ? 6.5 : 5;
        this.type = 'projectile';
        this.isDead = false;
        this.rangeLimit = null;
        this.distanceTraveled = 0;

        // Lifetime management
        this.initialSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.calculateLifetime();
        this.age = 0;

        // Hit tracking (for piercing)
        this.hitEnemies = new Set();

        // Visual trail - using circular buffer for performance
        this.maxTrailLength = 5;
        this.trail = new Array(this.maxTrailLength);
        this.trailIndex = 0;
        this.trailCount = 0;

        // Behavior system - THIS is where all upgrade logic lives now!
        // Wrap in try-catch to handle missing BehaviorManager class gracefully
        try {
            const BehaviorManagerClass = window.ProjectileBehaviorManager ||
                (window.Game && window.Game.ProjectileBehaviorManager) ||
                (typeof ProjectileBehaviorManager !== 'undefined' ? ProjectileBehaviorManager : undefined);

            if (typeof BehaviorManagerClass === 'function') {
                this.behaviorManager = new BehaviorManagerClass(this);
            } else {
                throw new Error('ProjectileBehaviorManager class not found');
            }
        } catch (error) {
            // Fallback: Create a minimal stub manager if BehaviorManager fails
            // [FIX] Always log error to ensure visibility of silent failures
            window.logger.error(`[Projectile ${this.id}] Failed to create BehaviorManager:`, error);

            if (window.logger?.isDebugEnabled?.('projectiles')) {
                window.logger.warn(`[Projectile ${this.id}] Failed to create BehaviorManager:`, error.message);
            }
            this.behaviorManager = this._createFallbackBehaviorManager();
        }

        // If created with old system (has piercing param), add piercing behavior
        if (this.piercing > 0) {
            try {
                if (typeof PiercingBehavior === 'function') {
                    const piercingBehavior = new PiercingBehavior(this, { charges: this.piercing });
                    this.behaviorManager.addBehavior(piercingBehavior);
                    if (window.logger?.isDebugEnabled?.('projectiles')) {
                        window.logger.log(`[Projectile ${this.id}] Created with piercing=${this.piercing}, added PiercingBehavior`);
                    }
                }
            } catch (error) {
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.warn(`[Projectile ${this.id}] Failed to add PiercingBehavior:`, error.message);
                }
            }
        }

        if (window.logger?.isDebugEnabled?.('projectiles')) {
            window.logger.log(`[Projectile ${this.id}] Created. BehaviorManager:`, this.behaviorManager);
        }

        // Backwards compatibility: Track old flag properties for conversion to behaviors
        this._oldFlags = {
            hasChainLightning: false,
            hasExplosive: false,
            hasRicochet: false,
            hasHoming: false
        };

        // Lifesteal (applied directly, not a behavior for simplicity)
        this.lifesteal = 0;
        this.sourcePlayer = null;
        this.createsGravityWell = false;
    }

    /**
     * Create a minimal fallback behavior manager if the real one fails to instantiate
     * This ensures projectiles can still function even if behavior system is broken
     */
    _createFallbackBehaviorManager() {
        return {
            behaviors: [],
            addBehavior: function () {
                // Stub - do nothing
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.warn('[Projectile] Fallback manager: addBehavior called (no-op)');
                }
            },
            hasBehavior: function () { return false; },
            update: function () { /* no-op */ },
            handleCollision: function (target, engine) {
                // Basic collision handling - just mark hit and die
                if (this.projectile && this.projectile.hitEnemies) {
                    this.projectile.hitEnemies.add(target.id);
                }
                return true; // Projectile should die after hit
            },
            getState: function () { return { behaviors: [], isFallback: true }; },
            projectile: this
        };
    }

    /**
     * Backwards compatibility: Intercept old flag setters and convert to behaviors
     * These trigger immediately if data is already set, or defer until data arrives
     */
    set hasChainLightning(value) {
        this._oldFlags.hasChainLightning = value;
        this._tryAddBehaviorFromFlag('chain');
    }

    get hasChainLightning() {
        return this._oldFlags.hasChainLightning || this.behaviorManager.hasBehavior('chain');
    }

    set hasExplosive(value) {
        this._oldFlags.hasExplosive = value;
        this._tryAddBehaviorFromFlag('explosive');
    }

    get hasExplosive() {
        return this._oldFlags.hasExplosive || this.behaviorManager.hasBehavior('explosive');
    }

    set hasRicochet(value) {
        this._oldFlags.hasRicochet = value;
        this._tryAddBehaviorFromFlag('ricochet');
    }

    get hasRicochet() {
        return this._oldFlags.hasRicochet || this.behaviorManager.hasBehavior('ricochet');
    }

    set hasHoming(value) {
        this._oldFlags.hasHoming = value;
        this._tryAddBehaviorFromFlag('homing');
    }

    get hasHoming() {
        return this._oldFlags.hasHoming || this.behaviorManager.hasBehavior('homing');
    }

    // Allow old code to set data properties - these trigger behavior creation
    set chainData(data) {
        this._chainData = data;
        this._tryAddBehaviorFromFlag('chain');
    }
    get chainData() { return this._chainData; }

    set explosiveData(data) {
        this._explosiveData = data;
        this._tryAddBehaviorFromFlag('explosive');
    }
    get explosiveData() { return this._explosiveData; }

    set ricochetData(data) {
        this._ricochetData = data;
        this._tryAddBehaviorFromFlag('ricochet');
    }
    get ricochetData() { return this._ricochetData; }

    set homingData(data) {
        this._homingData = data;
        this._tryAddBehaviorFromFlag('homing');
    }
    get homingData() { return this._homingData; }

    /**
     * Try to add behavior if both flag and data are set
     */
    _tryAddBehaviorFromFlag(type) {
        const flagMap = {
            'chain': 'hasChainLightning',
            'explosive': 'hasExplosive',
            'ricochet': 'hasRicochet',
            'homing': 'hasHoming'
        };

        const dataMap = {
            'chain': '_chainData',
            'explosive': '_explosiveData',
            'ricochet': '_ricochetData',
            'homing': '_homingData'
        };

        const behaviorMap = {
            'chain': ChainBehavior,
            'explosive': ExplosiveBehavior,
            'ricochet': RicochetBehavior,
            'homing': HomingBehavior
        };

        // Check if flag is set and data exists
        const hasFlag = this._oldFlags[flagMap[type]];
        const hasData = this[dataMap[type]];

        if (hasFlag && hasData) {
            // Don't add if already has this behavior
            if (this.behaviorManager.hasBehavior(type)) {
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.log(`[Projectile ${this.id}] ${type} behavior already exists, skipping`);
                }
                return;
            }

            // Check if behavior class exists
            const BehaviorClass = behaviorMap[type];
            if (typeof BehaviorClass !== 'function') {
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.warn(`[Projectile ${this.id}] ${type} behavior class not found!`);
                }
                return;
            }

            // Create and add behavior
            try {
                const behavior = new BehaviorClass(this, this[dataMap[type]]);
                this.behaviorManager.addBehavior(behavior);

                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.log(`[Projectile ${this.id}] Added ${type} behavior from old flags. Data:`, this[dataMap[type]]);
                }
            } catch (error) {
                if (window.logger?.isDebugEnabled?.('projectiles')) {
                    window.logger.error(`[Projectile ${this.id}] Failed to add ${type} behavior:`, error);
                }
            }
        } else if (window.logger?.isDebugEnabled?.('projectiles')) {
            window.logger.log(`[Projectile ${this.id}] Not adding ${type} behavior. hasFlag: ${hasFlag}, hasData: ${hasData}`);
        }
    }

    /**
     * Calculate lifetime based on speed and expected travel distance
     */
    calculateLifetime() {
        const ENEMIES = window.GAME_CONSTANTS?.ENEMIES || {};
        const maxSpawnDistance = ENEMIES.SPAWN_DISTANCE_MAX || 800;
        const screenDiagonal = 1400;
        const maxTravelDistance = screenDiagonal + maxSpawnDistance + 200;

        const speed = Math.max(this.initialSpeed, 10);
        const baseLifetime = (maxTravelDistance / speed) + 1.0;

        // Behaviors may extend lifetime (handled by behaviors themselves if needed)
        this.lifetime = Math.max(2.0, Math.min(8.0, baseLifetime));
    }

    /**
     * Main update loop
     */
    update(deltaTime, game) {
        this.age += deltaTime;

        // Check lifetime
        if (this.age >= this.lifetime) {
            this._destroy(game, { cause: 'lifetime' });
            return;
        }

        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        if (Number.isFinite(this.rangeLimit) && this.rangeLimit > 0) {
            const deltaDistance = Math.hypot(this.vx * deltaTime, this.vy * deltaTime);
            this.distanceTraveled += deltaDistance;
            if (this.distanceTraveled >= this.rangeLimit) {
                this._destroy(game, { cause: 'rangeLimit' });
                return;
            }
        }

        // Update trail using circular buffer (O(1) instead of O(n))
        this.trail[this.trailIndex] = { x: this.x, y: this.y };
        this.trailIndex = (this.trailIndex + 1) % this.maxTrailLength;
        this.trailCount = Math.min(this.trailCount + 1, this.maxTrailLength);

        // Update all behaviors (e.g., homing)
        this.behaviorManager.update(deltaTime, game);
    }

    /**
     * Check if hit should be processed (for backwards compatibility)
     */
    hit(enemy) {
        // Already hit this enemy? Skip
        if (this.hitEnemies.has(enemy.id)) {
            if (window.logger?.isDebugEnabled?.('projectiles')) {
                window.logger.log(`[Projectile ${this.id}] Already hit enemy ${enemy.id}, skipping`);
            }
            return false;
        }

        return true; // Hit is valid
    }

    /**
     * Handle collision with enemy
     * Delegates to behavior manager for all upgrade logic
     */
    handleCollision(target, engine) {
        const shouldDie = this.behaviorManager.handleCollision(target, engine);

        // Handle lifesteal (percentage of damage dealt)
        if (this.lifesteal > 0 && engine?.player) {
            // Fix: Calculate lifesteal based on damage dealt, not just the raw percentage value
            // this.lifesteal is a percentage (e.g. 0.05 for 5%), so we multiply by damage
            const healAmount = this.damage * this.lifesteal;
            const player = engine.player;

            if (player.stats && typeof player.stats.heal === 'function') {
                player.stats.heal(healAmount);
                player.abilities?.onLifesteal?.(healAmount);
                // Track lifesteal for Grim Harvest and Crimson Pact achievements
                if (window.achievementSystem && typeof window.achievementSystem.onLifestealHealing === 'function') {
                    window.achievementSystem.onLifestealHealing(healAmount);
                }

                // Debug logging for lifesteal tracking
                if (window.logger?.debug) {
                    window.logger.log(`[Projectile] Lifesteal: ${healAmount.toFixed(2)} HP (${(this.lifesteal * 100).toFixed(1)}% of ${this.damage})`);
                }
            }
        }

        if (shouldDie) {
            this._destroy(engine, { cause: 'collision', target });
        }
    }

    /**
     * Check if projectile is offscreen (for cleanup)
     */
    isOffScreen(game) {
        if (!game || !game.canvas) return false;

        const margin = 100;
        const canvas = game.canvas;

        return (
            this.x < -margin ||
            this.x > canvas.width + margin ||
            this.y < -margin ||
            this.y > canvas.height + margin
        );
    }

    /**
     * Render projectile - delegates to renderer
     */
    render(ctx) {
        ProjectileRenderer.render(this, ctx);
    }

    _destroy(engine, context = {}) {
        if (this.isDead) {
            return;
        }
        this.behaviorManager.onDestroy(engine, context);
        this._maybeSpawnGravityWell(engine, context);
        this.isDead = true;
    }

    _maybeSpawnGravityWell(engine) {
        if (!this.createsGravityWell || !engine?.addEntity) {
            return;
        }

        const player = this.sourcePlayer || engine.player;
        if (!player?.abilities?.hasGravityWells) {
            return;
        }

        const GravityWellClass = window.Game?.GravityWell;
        if (typeof GravityWellClass !== 'function') {
            return;
        }

        const radius = player.abilities.gravityWellRadius || 150;
        const duration = player.abilities.gravityWellDuration || 2.5;
        const slowAmount = Number.isFinite(player.abilities.gravityWellSlowAmount)
            ? player.abilities.gravityWellSlowAmount
            : 0.4;
        const pullStrength = Number.isFinite(player.abilities.gravityWellPullStrength)
            ? player.abilities.gravityWellPullStrength
            : 0.3;
        const damageMultiplier = Number.isFinite(player.abilities.gravityWellDamageMultiplier)
            ? player.abilities.gravityWellDamageMultiplier
            : 0.15;

        try {
            const well = new GravityWellClass({
                x: this.x,
                y: this.y,
                radius,
                duration,
                slowAmount,
                pullStrength,
                damageMultiplier,
                baseDamage: this.damage,
                sourcePlayer: player
            });
            engine.addEntity(well);
            this._createGravityWellSpawnFx();
        } catch (error) {
            if (window.logger?.isDebugEnabled?.('projectiles')) {
                window.logger.error('Failed to create GravityWell:', error);
            }
        }
    }

    _createGravityWellSpawnFx() {
        if (!window.optimizedParticles) {
            return;
        }

        const burst = 24;
        for (let i = 0; i < burst; i++) {
            const angle = (Math.PI * 2 * i) / burst;
            const speed = 80 + Math.random() * 120;
            window.optimizedParticles.spawnParticle({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 3,
                color: i % 2 === 0 ? '#d5c4ff' : '#7f8cfc',
                life: 0.6 + Math.random() * 0.2,
                type: 'spark'
            });
        }

        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(4, 0.25);
        }
    }

    /**
     * Get state for debugging
     */
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            damage: this.damage,
            isCrit: this.isCrit,
            isDead: this.isDead,
            age: this.age,
            lifetime: this.lifetime,
            behaviors: this.behaviorManager.getState()
        };
    }
    /**
     * Reset projectile state for pooling
     * This is CRITICAL for preventing "ghost" behaviors on recycled projectiles
     */
    reset(x, y, config, ownerId) {
        // 1. Reset Core Physics
        this.x = x;
        this.y = y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.rotation = 0;
        this.distanceTraveled = 0;
        this.isDead = false;
        this.active = true;

        // 2. Reset Identity & Config
        this.id = Math.random().toString(36).substr(2, 9);
        this.ownerId = ownerId;
        this.type = 'projectile';
        this.config = config || {};

        // 3. Reset Stats
        this.damage = config.damage || 10;
        this.speed = config.speed || 10;
        this.radius = config.radius || 5;
        this.maxDistance = config.range || 1000;
        this.piercing = config.piercing || 0;
        this.originalPiercing = this.piercing;
        this.knockback = config.knockback || 0;
        this.lifesteal = config.lifesteal || 0;
        this.isCrit = config.isCrit || false;

        // 4. Reset Collections
        this.hitEnemies.clear();

        // 5. Reset Trail
        // We don't reallocate the array, just reset indices
        this.trailIndex = 0;
        this.trailCount = 0;
        // Optional: Clear trail data to prevent visual artifacts
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i] = null;
        }

        // 6. Reset Behaviors & Legacy Flags
        // This is the most important part!
        if (this.behaviorManager) {
            // Clear existing behaviors
            this.behaviorManager.behaviors = [];

            // CRITICAL: Reset legacy flags and data to prevent "ghost" upgrades
            this._oldFlags = {
                hasChainLightning: false,
                hasExplosive: false,
                hasRicochet: false,
                hasHoming: false
            };
            this._chainData = null;
            this._explosiveData = null;
            this._ricochetData = null;
            this._homingData = null;
            this._burnData = null;

            // Re-initialize behaviors from config
            // We can reuse the existing manager instance

            // Handle legacy flags -> behaviors conversion again
            this._resetBehaviorsFromConfig(config);
        }
    }

    /**
     * Helper to re-apply behaviors from config during reset
     */
    _resetBehaviorsFromConfig(config) {
        // Re-run the behavior initialization logic
        // This duplicates some constructor logic but is necessary for pooling

        // 1. Explicit behaviors from config
        if (config.behaviors && Array.isArray(config.behaviors)) {
            config.behaviors.forEach(b => this.behaviorManager.addBehavior(b));
        }

        // 2. Legacy flags from config
        // 2. Legacy flags from config
        if (config.hasChainLightning) {
            this._oldFlags.hasChainLightning = true;
            this._chainData = config.chainData;
            this._tryAddBehaviorFromFlag('chain');
        }
        if (config.hasExplosive) {
            this._oldFlags.hasExplosive = true;
            this._explosiveData = config.explosiveData;
            this._tryAddBehaviorFromFlag('explosive');
        }
        if (config.hasRicochet) {
            this._oldFlags.hasRicochet = true;
            this._ricochetData = config.ricochetData;
            this._tryAddBehaviorFromFlag('ricochet');
        }
        if (config.hasHoming) {
            this._oldFlags.hasHoming = true;
            this._homingData = config.homingData;
            this._tryAddBehaviorFromFlag('homing');
        }
        if (config.hasBurn) {
            // Burn doesn't have a legacy flag in _oldFlags but we handle it for consistency
            this._burnData = config.burnData;
            this._tryAddBehaviorFromFlag('burn');
        }

        // 3. Special types
        if (config.specialType) {
            this._tryAddBehaviorFromFlag(config.specialType, config.specialData);
        }

        // 4. Piercing behavior
        if (this.piercing > 0) {
            this._tryAddBehaviorFromFlag('piercing', { piercing: this.piercing });
        }

        // 5. Gravity Well
        this.createsGravityWell = !!config.createsGravityWell;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Projectile = Projectile;
    window.Game = window.Game || {};
    window.Game.Projectile = Projectile;
}

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
    constructor(x, y, vx, vy, damage, piercingOrCrit = 0, isCrit = false, specialType = null) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;

        // Handle backwards compatibility: old signature had piercing as 6th param
        // New signature has isCrit as 6th param
        if (typeof piercingOrCrit === 'boolean') {
            // New signature: (x, y, vx, vy, damage, isCrit)
            this.isCrit = piercingOrCrit;
            this.piercing = 0; // No piercing in new system (handled by behaviors)
        } else {
            // Old signature: (x, y, vx, vy, damage, piercing, isCrit, specialType)
            this.piercing = piercingOrCrit || 0;
            this.isCrit = isCrit || false;
            this.specialType = specialType;
        }

        this.radius = this.isCrit ? 6.5 : 5;
        this.type = 'projectile';
        this.isDead = false;
        this.rangeLimit = null;
        this.distanceTraveled = 0;

        // Lifetime management
        this.initialSpeed = Math.sqrt(vx * vx + vy * vy);
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
            if (typeof ProjectileBehaviorManager === 'function') {
                this.behaviorManager = new ProjectileBehaviorManager(this);
            } else {
                throw new Error('ProjectileBehaviorManager class not found');
            }
        } catch (error) {
            // Fallback: Create a minimal stub manager if BehaviorManager fails
            if (window.debugProjectiles) {
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
                    if (window.debugProjectiles) {
                        console.log(`[Projectile ${this.id}] Created with piercing=${this.piercing}, added PiercingBehavior`);
                    }
                }
            } catch (error) {
                if (window.debugProjectiles) {
                    window.logger.warn(`[Projectile ${this.id}] Failed to add PiercingBehavior:`, error.message);
                }
            }
        }

        if (window.debugProjectiles) {
            console.log(`[Projectile ${this.id}] Created. BehaviorManager:`, this.behaviorManager);
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
    }

    /**
     * Create a minimal fallback behavior manager if the real one fails to instantiate
     * This ensures projectiles can still function even if behavior system is broken
     */
    _createFallbackBehaviorManager() {
        return {
            behaviors: [],
            addBehavior: function() {
                // Stub - do nothing
                if (window.debugProjectiles) {
                    window.logger.warn('[Projectile] Fallback manager: addBehavior called (no-op)');
                }
            },
            hasBehavior: function() { return false; },
            update: function() { /* no-op */ },
            handleCollision: function(target, engine) {
                // Basic collision handling - just mark hit and die
                if (this.projectile && this.projectile.hitEnemies) {
                    this.projectile.hitEnemies.add(target.id);
                }
                return true; // Projectile should die after hit
            },
            getState: function() { return { behaviors: [], isFallback: true }; },
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
                if (window.debugProjectiles) {
                    console.log(`[Projectile ${this.id}] ${type} behavior already exists, skipping`);
                }
                return;
            }

            // Check if behavior class exists
            const BehaviorClass = behaviorMap[type];
            if (typeof BehaviorClass !== 'function') {
                if (window.debugProjectiles) {
                    window.logger.warn(`[Projectile ${this.id}] ${type} behavior class not found!`);
                }
                return;
            }

            // Create and add behavior
            try {
                const behavior = new BehaviorClass(this, this[dataMap[type]]);
                this.behaviorManager.addBehavior(behavior);

                if (window.debugProjectiles) {
                    console.log(`[Projectile ${this.id}] Added ${type} behavior from old flags. Data:`, this[dataMap[type]]);
                }
            } catch (error) {
                if (window.debugProjectiles) {
                    window.logger.error(`[Projectile ${this.id}] Failed to add ${type} behavior:`, error);
                }
            }
        } else if (window.debugProjectiles) {
            console.log(`[Projectile ${this.id}] Not adding ${type} behavior. hasFlag: ${hasFlag}, hasData: ${hasData}`);
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
            this.behaviorManager.onDestroy(game);
            this.isDead = true;
            return;
        }

        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        if (Number.isFinite(this.rangeLimit) && this.rangeLimit > 0) {
            const deltaDistance = Math.hypot(this.vx * deltaTime, this.vy * deltaTime);
            this.distanceTraveled += deltaDistance;
            if (this.distanceTraveled >= this.rangeLimit) {
                this.behaviorManager.onDestroy(game);
                this.isDead = true;
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
            if (window.debugProjectiles) {
                console.log(`[Projectile ${this.id}] Already hit enemy ${enemy.id}, skipping`);
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

        // Handle lifesteal (simple direct property)
        if (this.lifesteal > 0 && engine?.player) {
            const healAmount = this.lifesteal;
            const player = engine.player;

            if (player.stats && typeof player.stats.heal === 'function') {
                player.stats.heal(healAmount);
                // Track lifesteal for Grim Harvest and Crimson Pact achievements
                if (window.achievementSystem && typeof window.achievementSystem.onLifestealHealing === 'function') {
                    window.achievementSystem.onLifestealHealing(healAmount);
                }
            }
        }

        if (shouldDie) {
            this.behaviorManager.onDestroy(engine);
            this.isDead = true;
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
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.Projectile = Projectile;
}

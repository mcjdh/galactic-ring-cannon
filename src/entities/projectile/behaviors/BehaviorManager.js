/**
 * BehaviorManager - Handles projectile behavior composition and interaction rules
 *
 * This is the single source of truth for how behaviors interact:
 * - Piercing prevents death until charges exhausted
 * - Ricochet can save projectile from death
 * - Chain lightning triggers on hit
 * - Explosive triggers on death
 * - Homing updates trajectory each frame
 */
class ProjectileBehaviorManager {
    constructor(projectile) {
        this.projectile = projectile;
        this.behaviors = [];
    }

    /**
     * Add a behavior to the projectile
     */
    addBehavior(behavior) {
        if (!(behavior instanceof ProjectileBehaviorBase)) {
            window.logger.error('Cannot add non-behavior to projectile:', behavior);
            return;
        }

        this.behaviors.push(behavior);
        behavior.onAdd();
    }

    /**
     * Remove a behavior by type
     */
    removeBehavior(type) {
        const index = this.behaviors.findIndex(b => b.getType() === type.toLowerCase());
        if (index !== -1) {
            const behavior = this.behaviors[index];
            behavior.onRemove();
            this.behaviors.splice(index, 1);
        }
    }

    /**
     * Check if projectile has a specific behavior
     */
    hasBehavior(type) {
        return this.behaviors.some(b => b.enabled && b.getType() === type.toLowerCase());
    }

    /**
     * Get a specific behavior by type
     */
    getBehavior(type) {
        return this.behaviors.find(b => b.getType() === type.toLowerCase());
    }

    /**
     * Get all behaviors of a specific type
     */
    getBehaviors(type) {
        if (type) {
            return this.behaviors.filter(b => b.enabled && b.getType() === type.toLowerCase());
        }
        return this.behaviors.filter(b => b.enabled);
    }

    /**
     * Update all behaviors (called each frame)
     */
    update(deltaTime, game) {
        for (const behavior of this.behaviors) {
            if (behavior.enabled) {
                behavior.update(deltaTime, game);
            }
        }
    }

    /**
     * Handle collision with enemy
     * This is THE core interaction logic for all projectile behaviors
     *
     * 🎮 IMPROVED GAME FEEL: "Ricochet First" Priority System
     * 
     * Design Philosophy:
     * - Ricochet on EVERY hit if possible (most fun, keeps action flowing)
     * - Piercing as FALLBACK when no ricochet target available
     * - Makes upgrades feel ADDITIVE rather than replacements
     * - Prevents pierced projectiles flying offscreen (explosive triggers reliably)
     *
     * Order of operations:
     * 1. Apply damage to target
     * 2. Trigger on-hit effects (chain lightning)
     * 3. Try Ricochet FIRST (if has bounces + valid target)
     *    → Success: Bounce to new enemy, keep piercing charges
     *    → Fail: No target, continue to step 4
     * 4. Try Piercing as fallback (if has charges)
     *    → Success: Pass through enemy
     *    → Fail: Charges exhausted, projectile dies
     * 5. Trigger on-death effects (explosive)
     *
     * @returns {boolean} - True if projectile should die
     */
    handleCollision(target, engine) {
        // Track if this enemy was already hit (for piercing)
        if (this.projectile.hitEnemies) {
            if (this.projectile.hitEnemies.has(target.id)) {
                return false; // Already hit this enemy
            }
            this.projectile.hitEnemies.add(target.id);
        }

        // 1. Apply damage
        if (typeof target.takeDamage === 'function') {
            target.takeDamage(this.projectile.damage);
        }

        // 2. Trigger on-hit effects (chain lightning, lifesteal, etc.)
        for (const behavior of this.behaviors) {
            if (behavior.enabled) {
                behavior.onHit(target, engine);
            }
        }

        // 3. TRY RICOCHET FIRST (new priority system!)
        // This makes ricochet always attempt on every hit, keeping action flowing
        // Ricochet only "costs" a bounce if it actually succeeds
        let shouldDie = true;
        let deathPreventedBy = null;

        const ricochetBehavior = this.getBehavior('ricochet');
        if (ricochetBehavior && ricochetBehavior.enabled) {
            // Try ricochet - it will return true if it successfully bounces
            const ricocheted = ricochetBehavior.onDeath(target, engine);
            if (ricocheted) {
                shouldDie = false;
                deathPreventedBy = 'ricochet';
                
                if (window.debugProjectiles) {
                    console.log(`[BehaviorManager] Ricochet succeeded on initial hit - projectile continues!`);
                }
                
                // Ricochet succeeded! Don't check other behaviors
                return shouldDie;
            }
        }

        // 4. PIERCING AS FALLBACK
        // Only use piercing if ricochet didn't work (no valid target or no bounces)
        // This prevents projectiles flying offscreen after piercing through enemies
        const piercingBehavior = this.getBehavior('piercing');
        if (piercingBehavior && piercingBehavior.enabled) {
            const pierced = piercingBehavior.preventsDeath(target, engine);
            if (pierced) {
                shouldDie = false;
                deathPreventedBy = 'piercing';
                
                if (window.debugProjectiles) {
                    console.log(`[BehaviorManager] Piercing prevented death (ricochet unavailable)`);
                }
                
                return shouldDie;
            }
        }

        // 5. Check other behaviors (if any custom ones added later)
        // This maintains extensibility
        for (const behavior of this.behaviors) {
            if (behavior.enabled) {
                const behaviorType = behavior.getType();
                
                // Skip ricochet and piercing (already handled with priority)
                if (behaviorType === 'ricochet' || behaviorType === 'piercing') {
                    continue;
                }
                
                // Try other preventsDeath behaviors
                if (behavior.preventsDeath(target, engine)) {
                    shouldDie = false;
                    deathPreventedBy = behaviorType;
                    break;
                }
            }
        }

        // Note: Explosive and other death effects trigger when shouldDie=true
        // in Projectile.handleCollision() which sets isDead=true

        return shouldDie;
    }

    /**
     * Get state for debugging
     */
    getState() {
        return {
            behaviorCount: this.behaviors.length,
            behaviors: this.behaviors.map(b => ({
                type: b.getType(),
                enabled: b.enabled,
                config: b.config
            }))
        };
    }
}
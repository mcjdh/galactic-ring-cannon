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
            console.error('Cannot add non-behavior to projectile:', behavior);
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
     * Order of operations:
     * 1. Apply damage to target
     * 2. Trigger on-hit effects (chain lightning)
     * 3. Check death prevention (piercing)
     * 4. Try death recovery (ricochet)
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

        // 3. Check if any behavior prevents death (e.g., piercing)
        let shouldDie = true;
        for (const behavior of this.behaviors) {
            if (behavior.enabled && behavior.preventsDeath(target, engine)) {
                shouldDie = false;
                break; // First one wins
            }
        }

        // 4. If dying, give behaviors a chance to prevent it (e.g., ricochet)
        if (shouldDie) {
            for (const behavior of this.behaviors) {
                if (behavior.enabled) {
                    const prevented = behavior.onDeath(target, engine);
                    if (prevented) {
                        shouldDie = false;
                        break; // First successful prevention wins
                    }
                }
            }
        }

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
/**
 * ProjectilePool - High-performance object pool for projectiles
 * Eliminates Garbage Collection (GC) stutters by recycling projectile instances.
 */
class ProjectilePool {
    constructor(initialSize = 200) {
        this.pool = [];
        this.activeProjectiles = new Set();

        // Pre-allocate pool
        this._expandPool(initialSize);

        window.logger.info(`[ProjectilePool] Initialized with ${initialSize} projectiles`);
    }

    /**
     * Expand the pool by creating new instances
     */
    _expandPool(count) {
        // We need the Projectile class to be available
        const ProjectileClass = window.Projectile || (window.Game && window.Game.Projectile);

        if (!ProjectileClass) {
            window.logger.warn('[ProjectilePool] Projectile class not found during expansion, will retry on acquire');
            return;
        }

        for (let i = 0; i < count; i++) {
            // Create a "blank" projectile - config will be applied on acquire
            // We pass a dummy ID initially, it will be overwritten
            const p = new ProjectileClass(0, 0, {}, 'pool_init');
            p._poolStatus = 'free';
            this.pool.push(p);
        }
    }

    /**
     * Acquire a projectile from the pool
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {Object} config - Projectile configuration
     * @param {string} ownerId - ID of the entity firing the projectile
     * @returns {Projectile} The configured projectile
     */
    acquire(x, y, config, ownerId) {
        let projectile;

        if (this.pool.length > 0) {
            projectile = this.pool.pop();
        } else {
            // Pool empty, create new instance
            const ProjectileClass = window.Projectile || (window.Game && window.Game.Projectile);
            if (ProjectileClass) {
                projectile = new ProjectileClass(x, y, config, ownerId);
                // Don't push to pool here, it's returned directly
            } else {
                window.logger.error('[ProjectilePool] Cannot create projectile: Class not found');
                return null;
            }
        }

        // Reset and configure
        if (projectile) {
            // Ensure reset method exists (it might not if Projectile.js hasn't been updated yet)
            if (typeof projectile.reset === 'function') {
                projectile.reset(x, y, config, ownerId);
            } else {
                // Fallback for safety if reset() isn't available yet
                // This effectively re-initializes critical properties
                projectile.x = x;
                projectile.y = y;
                projectile.active = true;
                projectile.isDead = false;
                // We assume the caller might do more setup if reset is missing, 
                // but reset() is the intended path.
            }

            projectile._poolStatus = 'active';
            this.activeProjectiles.add(projectile);
        }

        return projectile;
    }

    /**
     * Release a projectile back to the pool
     * @param {Projectile} projectile - The projectile to release
     */
    release(projectile) {
        if (!projectile) return;

        // Prevent double-free
        if (projectile._poolStatus === 'free') {
            return;
        }

        // Mark as free
        projectile._poolStatus = 'free';
        projectile.active = false;
        projectile.isDead = true; // Ensure it stays dead

        // Remove from active set
        this.activeProjectiles.delete(projectile);

        // Add back to pool
        this.pool.push(projectile);
    }

    /**
     * Clear the pool (e.g. on level change)
     */
    clear() {
        this.pool.length = 0;
        this.activeProjectiles.clear();
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            free: this.pool.length,
            active: this.activeProjectiles.size,
            total: this.pool.length + this.activeProjectiles.size
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.ProjectilePool = ProjectilePool;
    window.Game = window.Game || {};
    window.Game.ProjectilePool = ProjectilePool;

    // Initialize global instance
    window.projectilePool = new ProjectilePool();
}

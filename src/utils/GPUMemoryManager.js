/**
 * [Pi] GPU Memory Manager for Raspberry Pi 5
 * Monitors and manages sprite cache sizes to prevent GPU memory exhaustion
 * 
 * Pi5 has ~256MB GPU memory shared with system
 * Each sprite cache entry can be 4-16KB depending on size
 * Target: Keep total sprite caches under 2MB (500 sprites max)
 */

class GPUMemoryManager {
    constructor() {
        this.enabled = false;
        this.monitoringInterval = null;
        this.checkIntervalMs = 5000; // Check every 5 seconds

        // Memory pressure thresholds - INCREASED for Universal Performance
        // We assume modern hardware (including Pi5) can handle more than 50 sprites.
        // Elastic system: We let caches grow large, but trim them if they get HUGE.
        this.thresholds = {
            low: 500,      // < 500 sprites: no action needed
            medium: 1000,  // 500-1000 sprites: monitor
            high: 1500,    // 1000-1500 sprites: start reducing
            critical: 2000 // > 2000 sprites: aggressive cleanup
        };

        // Track cleanup history
        this.lastCleanupTime = 0;
        this.cleanupCooldown = 10000; // Don't cleanup more than once per 10s
        this.totalCleanups = 0;

        // Auto-enable on Pi5
        if (typeof window !== 'undefined' && window.isRaspberryPi) {
            this.enable();
        }
    }

    /**
     * Enable GPU memory monitoring
     */
    enable() {
        if (this.enabled) return;

        this.enabled = true;
        window.logger?.info?.('[Pi] GPU Memory Manager enabled');

        // Start monitoring interval
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryPressure();
        }, this.checkIntervalMs);
    }

    /**
     * Disable GPU memory monitoring
     */
    disable() {
        if (!this.enabled) return;

        this.enabled = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        window.logger?.info?.('[Pi] GPU Memory Manager disabled');
    }

    /**
     * Check current GPU memory pressure based on sprite cache sizes
     */
    checkMemoryPressure() {
        if (!this.enabled) return;

        const stats = this.getSpriteStats();
        const totalSprites = stats.totalSprites;

        // Determine pressure level
        let pressureLevel = 'low';
        if (totalSprites >= this.thresholds.critical) {
            pressureLevel = 'critical';
        } else if (totalSprites >= this.thresholds.high) {
            pressureLevel = 'high';
        } else if (totalSprites >= this.thresholds.medium) {
            pressureLevel = 'medium';
        }

        // Take action based on pressure
        if (pressureLevel === 'critical') {
            window.logger?.warn?.(`!! GPU Memory CRITICAL: ${totalSprites} sprites cached`);
            this.aggressiveCleanup();
        } else if (pressureLevel === 'high') {
            window.logger?.warn?.(`! GPU Memory HIGH: ${totalSprites} sprites cached`);
            this.moderateCleanup();
        } else if (pressureLevel === 'medium') {
            window.logger?.info?.(`🟡 GPU Memory MEDIUM: ${totalSprites} sprites cached`);
        }

        return { pressureLevel, stats };
    }

    /**
     * Get statistics about all sprite caches
     */
    getSpriteStats() {
        const stats = {
            projectileBody: 0,
            projectileGlow: 0,
            projectileCrit: 0,
            nebula: 0,
            totalSprites: 0,
            estimatedMemoryKB: 0
        };

        // ProjectileRenderer caches
        if (typeof ProjectileRenderer !== 'undefined') {
            stats.projectileBody = ProjectileRenderer._bodySpriteCache?.size || 0;
            stats.projectileGlow = ProjectileRenderer._glowSpriteCache?.size || 0;
            stats.projectileCrit = ProjectileRenderer._critGlowCache?.size || 0;
        }

        // CosmicBackground shape sprite cache
        if (typeof window !== 'undefined' && window.cosmicBackground) {
            stats.cosmicShapes = window.cosmicBackground.shapeSpriteCache?.size || 0;
        }

        stats.totalSprites = stats.projectileBody + stats.projectileGlow +
            stats.projectileCrit + (stats.cosmicShapes || 0);

        // Estimate memory usage (rough approximation)
        // Small sprites ~4KB, large sprites ~16KB, average ~8KB
        stats.estimatedMemoryKB = stats.totalSprites * 8;

        return stats;
    }

    /**
     * Moderate cleanup - reduce caches by 30%
     */
    moderateCleanup() {
        const now = performance.now();
        if (now - this.lastCleanupTime < this.cleanupCooldown) {
            return; // Too soon since last cleanup
        }

        this.lastCleanupTime = now;
        this.totalCleanups++;

        // Reduce ProjectileRenderer caches
        if (typeof ProjectileRenderer !== 'undefined') {
            // We don't permanently lower limits, just prune current excess
            // But if we are consistently high, we might want to lower limits?
            // For now, just prune to a "safe" level (e.g. 70% of current usage)

            if (typeof ProjectileRenderer.pruneCaches === 'function') {
                // Temporarily enforce stricter limits to trigger cleanup
                // Then restore? No, let's just rely on the limits we set.
                // If we are here, we exceeded thresholds.

                // Let's try to trim to the 'medium' threshold
                const currentBodyLimit = ProjectileRenderer._BODY_CACHE_LIMIT;
                const target = Math.floor(currentBodyLimit * 0.7);

                if (typeof ProjectileRenderer.setCacheLimits === 'function') {
                    ProjectileRenderer.setCacheLimits({
                        body: target,
                        glow: Math.floor(target * 0.6),
                        crit: Math.floor(target * 0.3)
                    });
                    ProjectileRenderer.pruneCaches();
                }
            }
        }

        // [R] FIX: Don't clean nebula cache - only 8 sprites, essential for background consistency
        // Nebulae are pre-warmed and should never be cleaned to prevent pop-in

        window.logger?.info?.('🧹 Moderate GPU memory cleanup complete (nebulae protected)');
    }

    /**
     * Aggressive cleanup - reduce caches by 60%
     */
    aggressiveCleanup() {
        const now = performance.now();
        this.lastCleanupTime = now;
        this.totalCleanups++;

        // Reduce ProjectileRenderer caches by 60%
        if (typeof ProjectileRenderer !== 'undefined') {
            if (typeof ProjectileRenderer.setCacheLimits === 'function') {
                // Cut limits in half
                const currentBodyLimit = ProjectileRenderer._BODY_CACHE_LIMIT;
                const target = Math.floor(currentBodyLimit * 0.4);

                ProjectileRenderer.setCacheLimits({
                    body: target,
                    glow: Math.floor(target * 0.6),
                    crit: Math.floor(target * 0.3)
                });
                ProjectileRenderer.pruneCaches();
            }
        }

        // [R] FIX: Don't clean nebula cache even in aggressive mode
        // Only 8 nebula sprites total (~64KB), essential for smooth background

        window.logger?.info?.('🧹 Aggressive GPU memory cleanup complete (nebulae protected)');
    }

    /**
     * Force clear all sprite caches (emergency)
     */
    clearAllCaches() {
        if (typeof ProjectileRenderer !== 'undefined' &&
            typeof ProjectileRenderer.clearSpriteCache === 'function') {
            ProjectileRenderer.clearSpriteCache();
        }

        if (typeof window !== 'undefined' && window.cosmicBackground) {
            if (typeof window.cosmicBackground.clearCaches === 'function') {
                window.cosmicBackground.clearCaches();
            } else {
                window.cosmicBackground.shapeSpriteCache?.clear();
            }
            window.logger?.info?.('🧹 Cleared CosmicBackground sprite cache');
        }

        this.lastCleanupTime = performance.now();
        this.totalCleanups++;

        window.logger?.info?.('🧹 All sprite caches cleared (emergency cleanup)');
    }

    /**
     * Get current memory status for debugging
     */
    getStatus() {
        const stats = this.getSpriteStats();
        const pressureCheck = this.enabled ? this.checkMemoryPressure() : null;

        return {
            enabled: this.enabled,
            pressureLevel: pressureCheck?.pressureLevel || (this.enabled ? 'low' : 'disabled'),
            ...stats,
            totalCleanups: this.totalCleanups,
            timeSinceLastCleanup: typeof performance !== 'undefined'
                ? performance.now() - this.lastCleanupTime
                : null
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.gpuMemoryManager = new GPUMemoryManager();

    // Expose to Game namespace
    if (!window.Game) window.Game = {};
    window.Game.GPUMemoryManager = GPUMemoryManager;

    // Add console commands for debugging
    window.gpuStatus = () => {
        const status = window.gpuMemoryManager.getStatus();
        window.logger?.log?.('[Pi] GPU Memory Status:', status);
        return status;
    };

    window.gpuCleanup = () => {
        window.gpuMemoryManager.clearAllCaches();
    };
}

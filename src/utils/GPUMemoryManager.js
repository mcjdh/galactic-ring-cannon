/**
 * 🍓 GPU Memory Manager for Raspberry Pi 5
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
        
        // Memory pressure thresholds
        this.thresholds = {
            low: 50,      // < 50 sprites: no action needed
            medium: 100,  // 50-100 sprites: monitor
            high: 150,    // 100-150 sprites: start reducing
            critical: 200 // > 200 sprites: aggressive cleanup
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
        console.log('🍓 GPU Memory Manager enabled');
        
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
        console.log('🍓 GPU Memory Manager disabled');
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
            console.warn(`🔴 GPU Memory CRITICAL: ${totalSprites} sprites cached`);
            this.aggressiveCleanup();
        } else if (pressureLevel === 'high') {
            console.warn(`🟠 GPU Memory HIGH: ${totalSprites} sprites cached`);
            this.moderateCleanup();
        } else if (pressureLevel === 'medium') {
            if (window.debugMode || window.performanceProfiler?.verbose) {
                console.log(`🟡 GPU Memory MEDIUM: ${totalSprites} sprites cached`);
            }
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
        
        // CosmicBackground nebula cache
        if (typeof window !== 'undefined' && window.cosmicBackground) {
            stats.nebula = window.cosmicBackground._nebulaSpriteCache?.size || 0;
        }
        
        stats.totalSprites = stats.projectileBody + stats.projectileGlow + 
                            stats.projectileCrit + stats.nebula;
        
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
        
        // Reduce ProjectileRenderer caches by 30%
        if (typeof ProjectileRenderer !== 'undefined') {
            if (typeof ProjectileRenderer.reduceCacheSizes === 'function') {
                ProjectileRenderer.reduceCacheSizes(0.7); // Keep 70%
            }
        }
        
        // 🎨 FIX: Don't clean nebula cache - only 8 sprites, essential for background consistency
        // Nebulae are pre-warmed and should never be cleaned to prevent pop-in
        
        console.log('🧹 Moderate GPU memory cleanup complete (nebulae protected)');
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
            if (typeof ProjectileRenderer.reduceCacheSizes === 'function') {
                ProjectileRenderer.reduceCacheSizes(0.4); // Keep only 40%
            }
        }
        
        // 🎨 FIX: Don't clean nebula cache even in aggressive mode
        // Only 8 nebula sprites total (~64KB), essential for smooth background
        
        console.log('🧹 Aggressive GPU memory cleanup complete (nebulae protected)');
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
            window.cosmicBackground._nebulaSpriteCache?.clear();
            console.log('🧹 Cleared CosmicBackground sprite cache');
        }
        
        this.lastCleanupTime = performance.now();
        this.totalCleanups++;
        
        console.log('🧹 All sprite caches cleared (emergency cleanup)');
    }
    
    /**
     * Get current memory status for debugging
     */
    getStatus() {
        const stats = this.getSpriteStats();
        const pressureCheck = this.checkMemoryPressure();
        
        return {
            enabled: this.enabled,
            pressureLevel: pressureCheck.pressureLevel,
            ...stats,
            totalCleanups: this.totalCleanups,
            timeSinceLastCleanup: performance.now() - this.lastCleanupTime
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
        console.log('🍓 GPU Memory Status:', status);
        return status;
    };
    
    window.gpuCleanup = () => {
        window.gpuMemoryManager.clearAllCaches();
    };
}

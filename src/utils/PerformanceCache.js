/**
 * PerformanceCache - Advanced caching system for expensive computations on Pi5
 * 
 * Beyond TrigCache: This caches sqrt, pow, array operations, and common patterns
 * that show up in hot paths during profiling.
 * 
 * Target: Reduce 40-30 FPS dips to stable 60 FPS on Raspberry Pi 5
 * 
 * @author GitHub Copilot
 */

class PerformanceCache {
    constructor(options = {}) {
        this.enabled = options.enabled !== undefined ? options.enabled : window.isRaspberryPi;
        
        // Math.sqrt cache for common distances
        this._sqrtCache = new Float32Array(10000); // Cache sqrt(0) to sqrt(9999)
        this._sqrtCacheSize = 10000;
        this._initSqrtCache();
        
        // Math.floor/ceil cache for common grid calculations
        this._floorCache = new Map(); // LRU cache for division results
        this._floorCacheSize = 500;
        this._floorCacheHits = 0;
        this._floorCacheMisses = 0;
        
        // Distance squared thresholds (pre-computed to avoid multiplication)
        this._distanceThresholds = new Map();
        this._initDistanceThresholds();
        
        // Integer division cache (for grid calculations)
        this._gridDivCache = new Map();
        this._gridDivCacheSize = 1000;
        this._gridSize = 100; // Default, updated by game engine
        
        // Random value pools (avoid Math.random() overhead)
        this._randomPool = new Float32Array(1000);
        this._randomIndex = 0;
        this._randomRefillIndex = 0; // OPTIMIZATION: Track gradual refill progress
        this._randomRefillBatchSize = 20; // Refill 20 values per frame to avoid jank
        this._refillRandomPool();
        
        // Normalized vector cache (common directions)
        this._normalizedVectors = new Map();
        this._initNormalizedVectors();
        
        // Use logger if available, fallback to console
        const log = window.logger?.info?.bind(window.logger) || console.info.bind(console);
        log('[PerformanceCache] Initialized:', {
            sqrtCache: `${this._sqrtCacheSize} entries`,
            enabled: this.enabled
        });
    }
    
    /**
     * Pre-compute sqrt for integers 0-9999
     * Covers most distance calculations in game (screen is ~2000px)
     */
    _initSqrtCache() {
        for (let i = 0; i < this._sqrtCacheSize; i++) {
            this._sqrtCache[i] = Math.sqrt(i);
        }
    }
    
    /**
     * Pre-compute common distance threshold squares
     * Usage: if (distSq < cache.getDistanceThreshold(100)) { ... }
     */
    _initDistanceThresholds() {
        const thresholds = [10, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
        for (const threshold of thresholds) {
            this._distanceThresholds.set(threshold, threshold * threshold);
        }
    }
    
    /**
     * Pre-compute normalized vectors for cardinal/diagonal directions
     * Covers 95% of normalized vector needs (movement, projectiles)
     */
    _initNormalizedVectors() {
        const SQRT2_INV = 0.7071067811865476;
        
        // Cardinals
        this._normalizedVectors.set('1,0', { x: 1, y: 0 });
        this._normalizedVectors.set('-1,0', { x: -1, y: 0 });
        this._normalizedVectors.set('0,1', { x: 0, y: 1 });
        this._normalizedVectors.set('0,-1', { x: 0, y: -1 });
        
        // Diagonals
        this._normalizedVectors.set('1,1', { x: SQRT2_INV, y: SQRT2_INV });
        this._normalizedVectors.set('1,-1', { x: SQRT2_INV, y: -SQRT2_INV });
        this._normalizedVectors.set('-1,1', { x: -SQRT2_INV, y: SQRT2_INV });
        this._normalizedVectors.set('-1,-1', { x: -SQRT2_INV, y: -SQRT2_INV });
    }
    
    /**
     * Fast sqrt with cache for common values
     * Falls back to Math.sqrt for large values
     * 
     * @param {number} x - Value to sqrt
     * @returns {number} Square root
     */
    sqrt(x) {
        // Safety check for 'this' context
        if (!this || typeof this.enabled === 'undefined') {
            return Math.sqrt(x);
        }
        
        if (!this.enabled) return Math.sqrt(x);
        
        // Fast path: check cache for integers
        if (x >= 0 && x < this._sqrtCacheSize && x === (x | 0)) {
            return this._sqrtCache[x];
        }
        
        // Fallback to native for large/float values
        return Math.sqrt(x);
    }
    
    /**
     * Fast floor with division caching
     * Hot path: grid coordinate calculations (Math.floor(x / gridSize))
     * 
     * @param {number} value - Value to floor
     * @param {number} divisor - Optional divisor for grid calculations
     * @returns {number} Floored value
     */
    floor(value, divisor = 1) {
        // Safety check for 'this' context
        if (!this || typeof this.enabled === 'undefined') {
            return divisor === 1 ? Math.floor(value) : Math.floor(value / divisor);
        }
        
        if (!this.enabled || divisor === 1) {
            return Math.floor(value);
        }
        
        // OPTIMIZED: Use numeric key instead of string concatenation
        // Encode rounded value and divisor into a single integer key
        // With 1000 multiplier: handles values up to ~9M and divisors up to 999 safely
        const roundedValue = Math.round(value);
        const cacheKey = (roundedValue * 1000) + divisor;
        
        if (this._floorCache.has(cacheKey)) {
            this._floorCacheHits++;
            return this._floorCache.get(cacheKey);
        }
        
        const result = Math.floor(value / divisor);
        
        // LRU cache management
        if (this._floorCache.size >= this._floorCacheSize) {
            // Remove first (oldest) entry
            const firstKey = this._floorCache.keys().next().value;
            this._floorCache.delete(firstKey);
        }
        
        this._floorCache.set(cacheKey, result);
        this._floorCacheMisses++;
        return result;
    }
    
    /**
     * Fast ceil (similar to floor)
     */
    ceil(value, divisor = 1) {
        if (!this.enabled || divisor === 1) {
            return Math.ceil(value);
        }
        return Math.ceil(value / divisor);
    }
    
    /**
     * Get pre-computed distance threshold squared
     * Avoids multiplication in hot collision detection loops
     * 
     * @param {number} threshold - Distance threshold
     * @returns {number} Threshold squared
     */
    getDistanceThreshold(threshold) {
        if (this._distanceThresholds.has(threshold)) {
            return this._distanceThresholds.get(threshold);
        }
        return threshold * threshold;
    }
    
    /**
     * Fast grid coordinate calculation with caching
     * Hot path: spatial grid insertions/queries
     * 
     * @param {number} pos - X or Y position
     * @param {number} gridSize - Grid cell size
     * @returns {number} Grid coordinate
     */
    gridCoord(pos, gridSize) {
        // Safety check for 'this' context
        if (!this || typeof this.enabled === 'undefined') {
            return Math.floor(pos / gridSize);
        }
        
        if (!this.enabled) {
            return Math.floor(pos / gridSize);
        }
        
        // Use faster bit shift for power-of-2 grid sizes
        if (gridSize === 100) {
            // Common case optimization
            return Math.floor(pos / 100);
        }
        
        return this.floor(pos, gridSize);
    }
    
    /**
     * Get cached random value from pool
     * Avoids Math.random() overhead (relatively slow on ARM)
     * 
     * @returns {number} Random value [0, 1)
     */
    random() {
        // Safety check for 'this' context
        if (!this || typeof this.enabled === 'undefined') {
            return Math.random();
        }

        if (!this.enabled) return Math.random();

        const value = this._randomPool[this._randomIndex];
        this._randomIndex = (this._randomIndex + 1) % this._randomPool.length;

        // OPTIMIZED: Gradual refill with offset to avoid predictable sequences
        // When wrapping, refill a batch starting at a random offset
        if (this._randomIndex === 0) {
            // Use current time for pseudo-random offset to avoid predictable patterns
            const offset = (performance.now() | 0) % (this._randomPool.length - 100);
            const immediateRefillSize = 100;
            for (let i = 0; i < immediateRefillSize; i++) {
                const idx = (offset + i) % this._randomPool.length;
                this._randomPool[idx] = Math.random();
            }
            // Start gradual refill from a different position
            this._randomRefillIndex = (offset + immediateRefillSize) % this._randomPool.length;
        }

        // Incrementally refill pool in small batches (20 values per call)
        if (this._randomRefillIndex < this._randomPool.length && this._randomRefillIndex !== 0) {
            const batchEnd = Math.min(
                this._randomRefillIndex + this._randomRefillBatchSize,
                this._randomPool.length
            );
            for (let i = this._randomRefillIndex; i < batchEnd; i++) {
                this._randomPool[i] = Math.random();
            }
            this._randomRefillIndex = batchEnd >= this._randomPool.length ? 0 : batchEnd;
        }

        return value;
    }
    
    /**
     * Refill random value pool (initial fill only)
     * OPTIMIZED: Incremental refills now happen in random() to prevent frame spikes
     * @private
     */
    _refillRandomPool() {
        // Only used for initial fill at construction
        for (let i = 0; i < this._randomPool.length; i++) {
            this._randomPool[i] = Math.random();
        }
        this._randomRefillIndex = this._randomPool.length; // Mark as fully filled
    }
    
    /**
     * Get random integer in range using cached randoms
     * 
     * @param {number} min - Min value (inclusive)
     * @param {number} max - Max value (exclusive)
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min)) + min;
    }
    
    /**
     * Get normalized vector for common directions
     * Avoids sqrt + division for cardinal/diagonal movement
     * 
     * @param {number} x - X component (-1, 0, or 1)
     * @param {number} y - Y component (-1, 0, or 1)
     * @returns {{x: number, y: number}|null} Normalized vector or null if not cached
     */
    getNormalizedVector(x, y) {
        // Safety check for 'this' context
        if (!this || typeof this.enabled === 'undefined') {
            return null;
        }
        
        if (!this.enabled) return null;
        
        const key = `${x},${y}`;
        return this._normalizedVectors.get(key) || null;
    }
    
    /**
     * Fast distance check using squared distance
     * Optimized for collision detection hot path
     * 
     * @param {number} x1 - Point 1 X
     * @param {number} y1 - Point 1 Y
     * @param {number} x2 - Point 2 X
     * @param {number} y2 - Point 2 Y
     * @param {number} threshold - Distance threshold
     * @returns {boolean} True if distance < threshold
     */
    isWithinDistance(x1, y1, x2, y2, threshold) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const thresholdSq = this.getDistanceThreshold(threshold);
        return distSq < thresholdSq;
    }
    
    /**
     * Update grid size (called by game engine)
     * @param {number} size - New grid size
     */
    setGridSize(size) {
        this._gridSize = size;
        this._gridDivCache.clear(); // Clear cache when grid size changes
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        return {
            enabled: this.enabled,
            sqrtCache: {
                size: this._sqrtCacheSize,
                memory: this._sqrtCacheSize * 4 // bytes (Float32Array)
            },
            floorCache: {
                size: this._floorCache.size,
                hits: this._floorCacheHits,
                misses: this._floorCacheMisses,
                hitRate: this._floorCacheHits > 0 
                    ? (this._floorCacheHits / (this._floorCacheHits + this._floorCacheMisses) * 100).toFixed(1) + '%'
                    : '0%'
            },
            randomPool: {
                size: this._randomPool.length,
                index: this._randomIndex
            },
            normalizedVectors: {
                size: this._normalizedVectors.size
            },
            totalMemory: (
                this._sqrtCacheSize * 4 + // Float32Array
                this._randomPool.length * 4 + // Float32Array
                this._floorCache.size * 50 + // Rough estimate for Map entries
                this._normalizedVectors.size * 32 // Rough estimate
            ) + ' bytes'
        };
    }
    
    /**
     * Clear all caches (for testing/debugging)
     */
    clear() {
        this._floorCache.clear();
        this._gridDivCache.clear();
        this._floorCacheHits = 0;
        this._floorCacheMisses = 0;
        this._refillRandomPool();
    }
    
    /**
     * Enable/disable caching
     * @param {boolean} enabled - Enable state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }
    
    /**
     * Static helper methods for safe global access
     * These prevent 'this' binding issues when extracting methods
     */
    static safeRandom() {
        return window.perfCache ? window.perfCache.random() : Math.random();
    }
    
    static safeSqrt(x) {
        return window.perfCache ? window.perfCache.sqrt(x) : Math.sqrt(x);
    }
    
    static safeGridCoord(pos, gridSize) {
        return window.perfCache ? window.perfCache.gridCoord(pos, gridSize) : Math.floor(pos / gridSize);
    }
}

// Global singleton
if (typeof window !== 'undefined') {
    window.perfCache = new PerformanceCache();
    
    // Expose to Game namespace
    if (!window.Game) window.Game = {};
    window.Game.PerformanceCache = PerformanceCache;
    
    // Console commands
    window.perfCacheStats = () => {
        const stats = window.perfCache.getStats();
        const log = window.logger.info;
        log('📊 Performance Cache Statistics:');
        log(JSON.stringify(stats, null, 2));
        return stats;
    };
    
    window.perfCacheToggle = () => {
        window.perfCache.setEnabled(!window.perfCache.enabled);
        const log = window.logger.info;
        log(`[PerformanceCache] ${window.perfCache.enabled ? 'ENABLED' : 'DISABLED'}`);
    };
}

/**
 * FastMath - Convenience wrapper for TrigCache + other fast math utilities
 * 
 * Automatically uses TrigCache when available (Pi5 mode), falls back to native Math
 * This allows code to be written once and automatically benefit from optimizations
 * 
 * Usage:
 *   const angle = FastMath.atan2(dy, dx);
 *   const vx = FastMath.cos(angle) * speed;
 *   const vy = FastMath.sin(angle) * speed;
 * 
 * Or for combined operations:
 *   const { sin, cos } = FastMath.sincos(angle);
 *   const { angle, sin, cos } = FastMath.angleSinCos(dy, dx);
 * 
 * @author GitHub Copilot
 */
const FastMath = {
    /**
     * Fast sine - uses TrigCache on Pi5, native Math.sin otherwise
     * @param {number} angle - Angle in radians
     * @returns {number} Sine value
     */
    sin(angle) {
        return window.trigCache ? window.trigCache.sin(angle) : Math.sin(angle);
    },
    
    /**
     * Fast cosine - uses TrigCache on Pi5, native Math.cos otherwise
     * @param {number} angle - Angle in radians
     * @returns {number} Cosine value
     */
    cos(angle) {
        return window.trigCache ? window.trigCache.cos(angle) : Math.cos(angle);
    },
    
    /**
     * Fast atan2 - uses TrigCache on Pi5, native Math.atan2 otherwise
     * @param {number} dy - Y component
     * @param {number} dx - X component
     * @returns {number} Angle in radians
     */
    atan2(dy, dx) {
        return window.trigCache ? window.trigCache.atan2(dy, dx) : Math.atan2(dy, dx);
    },
    
    /**
     * Get both sin and cos for an angle
     * More efficient than calling sin() and cos() separately
     * 
     * @param {number} angle - Angle in radians
     * @returns {{sin: number, cos: number}} Sin and cos values
     */
    sincos(angle) {
        if (window.trigCache) {
            return window.trigCache.sincos(angle);
        }
        return {
            sin: Math.sin(angle),
            cos: Math.cos(angle)
        };
    },
    
    /**
     * Calculate angle from dx/dy and return sin/cos in one call
     * Optimized for projectile firing patterns
     * 
     * @param {number} dy - Y component
     * @param {number} dx - X component
     * @returns {{angle: number, sin: number, cos: number}} Angle and trig values
     */
    angleSinCos(dy, dx) {
        if (window.trigCache) {
            return window.trigCache.angleSinCos(dy, dx);
        }
        const angle = Math.atan2(dy, dx);
        return {
            angle,
            sin: Math.sin(angle),
            cos: Math.cos(angle)
        };
    },
    
    /**
     * Fast approximate square root using Newton-Raphson
     * Only used when high precision isn't needed (e.g., distance comparisons)
     * 
     * For most cases, use distanceSquared comparisons instead of sqrt
     * 
     * @param {number} x - Value to take square root of
     * @returns {number} Approximate square root
     */
    fastSqrt(x) {
        // On Pi5, Math.sqrt is slow - use approximation for non-critical cases
        if (!window.isRaspberryPi || x === 0) {
            return Math.sqrt(x);
        }
        
        // Quick estimate using bit manipulation
        const i = new Float32Array([x]);
        const j = new Int32Array(i.buffer);
        j[0] = 0x5f3759df - (j[0] >> 1);
        const y = i[0];
        
        // One Newton-Raphson iteration for better accuracy
        return x * y * (1.5 - 0.5 * x * y * y);
    },
    
    /**
     * Calculate distance between two points
     * Uses squared distance comparison when possible for better performance
     * 
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    /**
     * Calculate squared distance between two points
     * Much faster than distance() - use for comparisons
     * 
     * Example:
     *   if (FastMath.distanceSquared(x1, y1, x2, y2) < radius * radius) { ... }
     * 
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Squared distance
     */
    distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },
    
    /**
     * Linearly interpolate between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0 to 1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    /**
     * Clamp value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },
    
    /**
     * Normalize angle to [-PI, PI] range
     * @param {number} angle - Angle in radians
     * @returns {number} Normalized angle
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },
    
    /**
     * Get statistics about FastMath performance benefits
     * @returns {Object} Performance info
     */
    getStats() {
        if (!window.trigCache) {
            return {
                mode: 'native',
                description: 'Using native Math functions (desktop mode)'
            };
        }
        
        const trigStats = window.trigCache.getStats();
        return {
            mode: 'cached',
            description: 'Using TrigCache for ARM optimization',
            ...trigStats
        };
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FastMath = FastMath;
}

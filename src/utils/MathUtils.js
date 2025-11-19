// Mathematical utility functions for game calculations
const MathUtils = {
    /**
     * Calculate distance between two points
     * Delegates to FastMath for optimization if available
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance between points
     */
    distance(x1, y1, x2, y2) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.distance(x1, y1, x2, y2);
        }
        // Validate all inputs are numbers
        if (!Number.isFinite(x1) || !Number.isFinite(y1) ||
            !Number.isFinite(x2) || !Number.isFinite(y2)) {
            return Infinity; // Return large distance for invalid inputs
        }
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Linear interpolation between two values
     */
    lerp(a, b, t) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.lerp(a, b, t);
        }
        return a + (b - a) * t;
    },

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.clamp(value, min, max);
        }
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Simplified budget calculation - replaces complex nested Math operations
     * @param {number} baseAmount - Base amount to calculate
     * @param {number} factor - Reduction factor (0-1)
     * @param {number} maxAllowed - Maximum allowed amount
     * @param {number} currentUsed - Currently used amount
     * @returns {number} Safe budget amount
     */
    budget(baseAmount, factor = 1, maxAllowed = 100, currentUsed = 0) {
        // Validate inputs to prevent NaN or invalid calculations
        if (!Number.isFinite(baseAmount) || baseAmount < 0) baseAmount = 0;
        if (!Number.isFinite(factor) || factor < 0) factor = 0;
        if (!Number.isFinite(maxAllowed) || maxAllowed < 0) maxAllowed = 100;
        if (!Number.isFinite(currentUsed) || currentUsed < 0) currentUsed = 0;

        // Clamp factor between 0 and 1
        factor = this.clamp(factor, 0, 1);

        const available = Math.max(0, maxAllowed - currentUsed);
        return Math.min(baseAmount * factor, available);
    },

    /**
     * Generate random number in range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    random(min, max) {
        // Validate inputs
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return 0; // Fallback for invalid inputs
        }
        if (min > max) {
            // Swap if min > max
            [min, max] = [max, min];
        }
        return Math.random() * (max - min) + min;
    },

    /**
     * Generate random integer in range
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        // Validate inputs
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return 0; // Fallback for invalid inputs
        }
        if (min > max) {
            // Swap if min > max
            [min, max] = [max, min];
        }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Calculate squared distance (faster than distance)
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Squared distance
     */
    distanceSquared(x1, y1, x2, y2) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.distanceSquared(x1, y1, x2, y2);
        }
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    /**
     * Normalize a vector
     * @param {Object} vector - Vector with x, y properties
     * @returns {Object} Normalized vector
     */
    normalizeVector(vector) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.normalize(vector.x, vector.y);
        }
        // Validate input
        if (!vector || typeof vector !== 'object' ||
            !Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
            return { x: 0, y: 0 }; // Return zero vector for invalid input
        }

        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (length === 0 || !Number.isFinite(length)) return { x: 0, y: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length
        };
    },

    /**
     * Calculate angle between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Angle in radians
     */
    angleBetween(x1, y1, x2, y2) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.atan2(y2 - y1, x2 - x1);
        }
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    toRadians(degrees) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.degToRad(degrees);
        }
        return degrees * Math.PI / 180;
    },

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    toDegrees(radians) {
        if (typeof window !== 'undefined' && window.FastMath) {
            return window.FastMath.radToDeg(radians);
        }
        return radians * 180 / Math.PI;
    },

    /**
     * Check if value is within range
     * @param {number} value - Value to check
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {boolean} True if in range
     */
    inRange(value, min, max) {
        return value >= min && value <= max;
    },

    /**
     * Wrap value around min/max range
     * @param {number} value - Value to wrap
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Wrapped value
     */
    wrap(value, min, max) {
        const range = max - min;
        if (range <= 0) return min;

        const result = ((value - min) % range + range) % range + min;
        return result;
    },

    /**
     * Smooth step interpolation
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smooth stepped value
     */
    smoothStep(edge0, edge1, x) {
        x = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * (3 - 2 * x);
    },

    /**
     * Calculate if point is inside circle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} radius - Circle radius
     * @returns {boolean} True if inside circle
     */
    pointInCircle(px, py, cx, cy, radius) {
        return this.distanceSquared(px, py, cx, cy) <= radius * radius;
    },

    /**
     * Calculate if point is inside rectangle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} rx - Rectangle X
     * @param {number} ry - Rectangle Y
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @returns {boolean} True if inside rectangle
     */
    pointInRect(px, py, rx, ry, width, height) {
        return px >= rx && px <= rx + width && py >= ry && py <= ry + height;
    },

    /**
     * Format game time to MM:SS string - eliminates duplicate time formatting code
     * @param {number} totalSeconds - Total seconds to format
     * @returns {string} Formatted time string (MM:SS)
     */
    formatTime(totalSeconds) {
        const seconds = Math.floor(totalSeconds);
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    },

    /**
     * Generate consistent particle angle and speed - eliminates duplicate particle creation
     * @returns {Object} Object with angle and speed properties
     */
    randomParticleMotion() {
        if (typeof window !== 'undefined' && window.FastMath) {
            return {
                angle: window.FastMath.randomAngle(),
                speed: 50 + Math.random() * 100
            };
        }
        return {
            angle: Math.random() * Math.PI * 2,
            speed: 50 + Math.random() * 100
        };
    }
};

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.MathUtils = MathUtils;
}

// Export for Node.js (tests) while keeping browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathUtils;
}

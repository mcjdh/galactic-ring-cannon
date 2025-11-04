/**
 * FastMath - Convenience wrapper for TrigCache + other fast math utilities.
 * Automatically uses cached trig functions on Raspberry Pi while preserving
 * native Math fallbacks for other platforms.
 */

const NativeTrig = {
    sin: Math.sin.bind(Math),
    cos: Math.cos.bind(Math),
    atan2: Math.atan2.bind(Math)
};

const FastMath = {
    _globalsInstalled: false,
    _nativeMath: NativeTrig,

    /**
     * Fast sine - uses TrigCache on Pi5, native Math.sin otherwise.
     */
    sin(angle) {
        return window.trigCache ? window.trigCache.sin(angle) : NativeTrig.sin(angle);
    },

    /**
     * Fast cosine - uses TrigCache on Pi5, native Math.cos otherwise.
     */
    cos(angle) {
        return window.trigCache ? window.trigCache.cos(angle) : NativeTrig.cos(angle);
    },

    /**
     * Fast atan2 - uses TrigCache on Pi5, native Math.atan2 otherwise.
     */
    atan2(dy, dx) {
        return window.trigCache ? window.trigCache.atan2(dy, dx) : NativeTrig.atan2(dy, dx);
    },

    /**
     * Get both sin and cos for an angle with a single lookup.
     */
    sincos(angle) {
        if (window.trigCache) {
            return window.trigCache.sincos(angle);
        }
        return {
            sin: NativeTrig.sin(angle),
            cos: NativeTrig.cos(angle)
        };
    },

    /**
     * Compute angle plus sin/cos using cached lookups when available.
     */
    angleSinCos(dy, dx) {
        if (window.trigCache) {
            return window.trigCache.angleSinCos(dy, dx);
        }
        const angle = NativeTrig.atan2(dy, dx);
        return {
            angle,
            sin: NativeTrig.sin(angle),
            cos: NativeTrig.cos(angle)
        };
    },

    /**
     * Fast approximate square root using Newton-Raphson for Pi mode.
     */
    fastSqrt(x) {
        if (!window.isRaspberryPi || x === 0) {
            return Math.sqrt(x);
        }

        const i = new Float32Array([x]);
        const j = new Int32Array(i.buffer);
        j[0] = 0x5f3759df - (j[0] >> 1);
        const y = i[0];
        return x * y * (1.5 - 0.5 * x * y * y);
    },

    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

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
    },

    installGlobals() {
        if (this._globalsInstalled) {
            return;
        }

        if (typeof window !== 'undefined' && typeof window.initTrigCache === 'function' && !window.trigCache) {
            window.trigCache = window.initTrigCache();
        }

        Math.sin = this.sin.bind(this);
        Math.cos = this.cos.bind(this);
        Math.atan2 = this.atan2.bind(this);
        this._globalsInstalled = true;
    },

    restoreGlobals() {
        if (!this._globalsInstalled) {
            return;
        }
        Math.sin = this._nativeMath.sin;
        Math.cos = this._nativeMath.cos;
        Math.atan2 = this._nativeMath.atan2;
        this._globalsInstalled = false;
    }
};

if (typeof window !== 'undefined') {
    window.FastMath = FastMath;
}

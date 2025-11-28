/**
 * MovementPatternCache
 * 
 * Trades RAM for fewer trig/random calls per frame.
 * Used by EnemyMovement and other systems requiring high-performance math lookups.
 */
const MovementPatternCache = (() => {
    const TABLE_SIZE = 4096;
    const TABLE_MASK = TABLE_SIZE - 1;
    const TWO_PI = Math.PI * 2;
    const INV_TWO_PI = 1 / TWO_PI;

    const sinTable = new Float32Array(TABLE_SIZE);
    const cosTable = new Float32Array(TABLE_SIZE);
    const randomTable = new Float32Array(TABLE_SIZE);
    const vectorTable = new Float32Array(TABLE_SIZE * 2);

    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = (i / TABLE_SIZE) * TWO_PI;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        sinTable[i] = sin;
        cosTable[i] = cos;
        randomTable[i] = Math.random();
        vectorTable[i * 2] = cos;
        vectorTable[i * 2 + 1] = sin;
    }

    let randomIndex = 0;
    let vectorIndex = 0;

    const hasPerfCache = () => typeof window !== 'undefined' && window.perfCache;

    const normalizeAngle = (angle) => {
        if (!Number.isFinite(angle)) return 0;
        let normalized = angle % TWO_PI;
        if (normalized < 0) normalized += TWO_PI;
        return normalized;
    };

    const getIndex = (angle) => {
        const normalized = normalizeAngle(angle);
        const scaled = normalized * INV_TWO_PI * TABLE_SIZE;
        return scaled & TABLE_MASK;
    };

    const sin = (angle) => sinTable[getIndex(angle)];
    const cos = (angle) => cosTable[getIndex(angle)];
    const sincos = (angle) => {
        const idx = getIndex(angle);
        return { sin: sinTable[idx], cos: cosTable[idx] };
    };

    const nextRandom = () => {
        if (hasPerfCache()) {
            return window.perfCache.random();
        }
        const value = randomTable[randomIndex];
        randomIndex = (randomIndex + 1) & TABLE_MASK;
        return value;
    };

    const randomRange = (min, max) => min + nextRandom() * (max - min);
    const randomAngle = () => nextRandom() * TWO_PI;

    const sampleUnitVector = () => {
        vectorIndex = (vectorIndex + 1) & TABLE_MASK;
        const base = vectorIndex << 1;
        return {
            x: vectorTable[base],
            y: vectorTable[base + 1]
        };
    };

    const fastSqrt = (value) => {
        if (value <= 0) return 0;
        return hasPerfCache() ? window.perfCache.sqrt(value) : Math.sqrt(value);
    };

    const fastMagnitude = (x, y) => fastSqrt(x * x + y * y);

    return {
        sin,
        cos,
        sincos,
        random: nextRandom,
        randomRange,
        randomAngle,
        sampleUnitVector,
        fastMagnitude,
        fastSqrt,
        normalizeAngle,
        TWO_PI
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.MovementPatternCache = MovementPatternCache;
}
if (typeof module !== 'undefined') {
    module.exports = MovementPatternCache;
}

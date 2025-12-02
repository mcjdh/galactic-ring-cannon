/**
 * Shared Test Utilities
 * Common mocks and stubs for testing
 */

/**
 * Create a mock localStorage implementation
 * @param {boolean} shouldFail - Whether operations should throw errors
 * @returns {object} Mock localStorage object
 */
function createMockLocalStorage(shouldFail = false) {
    const store = new Map();
    
    // Create a proxy to make stored keys enumerable like real localStorage
    const mockStorage = new Proxy({}, {
        get(target, prop) {
            if (prop === 'getItem') {
                return (key) => {
                    if (shouldFail) throw new Error('localStorage unavailable');
                    return store.has(key) ? store.get(key) : null;
                };
            }
            if (prop === 'setItem') {
                return (key, value) => {
                    if (shouldFail) throw new Error('localStorage unavailable');
                    store.set(key, String(value));
                    // Make the key enumerable
                    target[key] = String(value);
                };
            }
            if (prop === 'removeItem') {
                return (key) => {
                    if (shouldFail) throw new Error('localStorage unavailable');
                    store.delete(key);
                    delete target[key];
                };
            }
            if (prop === 'clear') {
                return () => {
                    if (shouldFail) throw new Error('localStorage unavailable');
                    store.clear();
                    // Clear all enumerable properties
                    Object.keys(target).forEach(key => delete target[key]);
                };
            }
            if (prop === 'key') {
                return (index) => {
                    if (shouldFail) throw new Error('localStorage unavailable');
                    const keys = Array.from(store.keys());
                    return keys[index] || null;
                };
            }
            if (prop === 'length') {
                if (shouldFail) return 0;
                return store.size;
            }
            // Return the actual stored value for direct property access
            return target[prop];
        },
        set(target, prop, value) {
            if (!shouldFail) {
                store.set(prop, String(value));
            }
            target[prop] = value;
            return true;
        }
    });
    
    return mockStorage;
}

/**
 * Create a StorageManager stub with mock localStorage
 * @param {object} localStorage - Mock localStorage instance
 * @returns {object} StorageManager stub
 */
function createStorageManagerStub(localStorage) {
    return {
        getBoolean(key, defaultValue = false) {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return value === 'true' || value === '1';
        },
        getItem(key, defaultValue = null) {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        },
        setItem(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                return false;
            }
        },
        removeItem(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        },
        getInt(key, defaultValue = 0) {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
        },
        getFloat(key, defaultValue = 0.0) {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        },
        getJSON(key, defaultValue = null) {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            try {
                return JSON.parse(value);
            } catch (e) {
                return defaultValue;
            }
        },
        setJSON(key, value) {
            try {
                const json = JSON.stringify(value);
                localStorage.setItem(key, json);
                return true;
            } catch (e) {
                return false;
            }
        },
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                return false;
            }
        },
        keys() {
            try {
                return Object.keys(localStorage);
            } catch (e) {
                return [];
            }
        },
        hasKey(key) {
            try {
                return localStorage.getItem(key) !== null;
            } catch (e) {
                return false;
            }
        },
        isAvailable() {
            try {
                const test = '__storage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        }
    };
}

/**
 * Create a mock Canvas 2D context for testing rendering code
 * @returns {object} Mock context object
 */
function createMockCanvasContext() {
    return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        shadowBlur: 0,
        shadowColor: '',
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        _operations: [],
        
        // Drawing methods
        fillRect() { this._operations.push('fillRect'); },
        strokeRect() { this._operations.push('strokeRect'); },
        clearRect() { this._operations.push('clearRect'); },
        beginPath() { this._operations.push('beginPath'); },
        closePath() { this._operations.push('closePath'); },
        moveTo() { this._operations.push('moveTo'); },
        lineTo() { this._operations.push('lineTo'); },
        stroke() { this._operations.push('stroke'); },
        fill() { this._operations.push('fill'); },
        arc() { this._operations.push('arc'); },
        ellipse() { this._operations.push('ellipse'); },
        rect() { this._operations.push('rect'); },
        quadraticCurveTo() { this._operations.push('quadraticCurveTo'); },
        bezierCurveTo() { this._operations.push('bezierCurveTo'); },
        
        // State methods
        save() { this._operations.push('save'); },
        restore() { this._operations.push('restore'); },
        translate() { this._operations.push('translate'); },
        rotate() { this._operations.push('rotate'); },
        scale() { this._operations.push('scale'); },
        setTransform() { this._operations.push('setTransform'); },
        resetTransform() { this._operations.push('resetTransform'); },
        
        // Image methods
        drawImage() { this._operations.push('drawImage'); },
        createLinearGradient() { return { addColorStop: () => {} }; },
        createRadialGradient() { return { addColorStop: () => {} }; },
        getImageData() { return { data: new Uint8ClampedArray(4) }; },
        putImageData() { this._operations.push('putImageData'); },
        
        // Text methods
        measureText() { return { width: 10 }; },
        fillText() { this._operations.push('fillText'); },
        strokeText() { this._operations.push('strokeText'); },
        
        // Line dash
        setLineDash() { this._operations.push('setLineDash'); },
        getLineDash() { return []; },
        
        // Helpers for testing
        getOperationCount() { return this._operations.length; },
        getOperations() { return [...this._operations]; },
        reset() { this._operations = []; }
    };
}

/**
 * Create a mock Canvas element for testing
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {object} Mock canvas object
 */
function createMockCanvas(width = 800, height = 600) {
    const ctx = createMockCanvasContext();
    return {
        width,
        height,
        style: {},
        getContext: (type) => type === '2d' ? ctx : null,
        getBoundingClientRect: () => ({ left: 0, top: 0, width, height })
    };
}

/**
 * Create a mock window.Game.FastMath for testing
 * @returns {object} Mock FastMath object
 */
function createMockFastMath() {
    return {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        atan2: Math.atan2,
        sqrt: Math.sqrt,
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round,
        distance: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
        distanceSquared: (x1, y1, x2, y2) => (x2-x1)**2 + (y2-y1)**2,
        distanceFast: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
        lerp: (a, b, t) => a + (b - a) * t,
        clamp: (val, min, max) => Math.min(Math.max(val, min), max),
        degToRad: (deg) => deg * Math.PI / 180,
        radToDeg: (rad) => rad * 180 / Math.PI,
        normalizeAngle: (angle) => {
            while (angle > Math.PI) angle -= Math.PI * 2;
            while (angle < -Math.PI) angle += Math.PI * 2;
            return angle;
        }
    };
}

/**
 * Create a mock logger for testing
 * @param {boolean} captureMessages - Whether to capture messages for assertions
 * @returns {object} Mock logger object
 */
function createMockLogger(captureMessages = false) {
    const messages = { log: [], warn: [], error: [], info: [] };
    
    const capture = (level) => (...args) => {
        if (captureMessages) {
            messages[level].push(args.join(' '));
        }
    };
    
    return {
        log: capture('log'),
        warn: capture('warn'),
        error: capture('error'),
        info: capture('info'),
        getMessages: () => messages,
        clearMessages: () => {
            messages.log = [];
            messages.warn = [];
            messages.error = [];
            messages.info = [];
        }
    };
}

/**
 * Setup common global mocks for Node.js test environment
 */
function setupGlobalMocks() {
    global.window = global.window || {};
    global.window.Game = global.window.Game || {};
    global.window.Game.FastMath = createMockFastMath();
    global.window.logger = createMockLogger();
    global.window.gameManager = { lowQuality: false };
    global.performance = global.performance || { now: () => Date.now() };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createMockLocalStorage,
        createStorageManagerStub,
        createMockCanvasContext,
        createMockCanvas,
        createMockFastMath,
        createMockLogger,
        setupGlobalMocks
    };
}

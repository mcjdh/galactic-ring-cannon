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

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createMockLocalStorage,
        createStorageManagerStub
    };
}

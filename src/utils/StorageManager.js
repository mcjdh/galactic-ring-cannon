/**
 * Centralized Storage Manager
 * Provides safe localStorage access with consistent error handling
 * Handles cases where localStorage may be unavailable (private browsing, etc.)
 */

class StorageManager {
    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is available
     */
    static isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get item from localStorage with fallback
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key not found or error occurs
     * @returns {string|null} Stored value or default
     */
    static getItem(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn(`Failed to get localStorage item "${key}":`, e);
            }
            return defaultValue;
        }
    }

    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @returns {boolean} True if successful
     */
    static setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn(`Failed to set localStorage item "${key}":`, e);
            }
            return false;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} True if successful
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn(`Failed to remove localStorage item "${key}":`, e);
            }
            return false;
        }
    }

    /**
     * Get integer value from localStorage
     * @param {string} key - Storage key
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Parsed integer value
     */
    static getInt(key, defaultValue = 0) {
        const value = this.getItem(key);
        if (value === null) return defaultValue;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Get float value from localStorage
     * @param {string} key - Storage key
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Parsed float value
     */
    static getFloat(key, defaultValue = 0.0) {
        const value = this.getItem(key);
        if (value === null) return defaultValue;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Get boolean value from localStorage
     * @param {string} key - Storage key
     * @param {boolean} defaultValue - Default value if not found
     * @returns {boolean} Boolean value
     */
    static getBoolean(key, defaultValue = false) {
        const value = this.getItem(key);
        if (value === null) return defaultValue;
        return value === 'true' || value === '1';
    }

    /**
     * Get JSON value from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found or invalid JSON
     * @returns {*} Parsed JSON value
     */
    static getJSON(key, defaultValue = null) {
        const value = this.getItem(key);
        if (value === null) return defaultValue;
        try {
            return JSON.parse(value);
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn(`Failed to parse JSON from localStorage key "${key}":`, e);
            }
            return defaultValue;
        }
    }

    /**
     * Set JSON value in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store as JSON
     * @returns {boolean} True if successful
     */
    static setJSON(key, value) {
        try {
            const json = JSON.stringify(value);
            return this.setItem(key, json);
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn(`Failed to stringify JSON for localStorage key "${key}":`, e);
            }
            return false;
        }
    }

    /**
     * Clear all items from localStorage
     * @returns {boolean} True if successful
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn('Failed to clear localStorage:', e);
            }
            return false;
        }
    }

    /**
     * Get all keys from localStorage
     * @returns {string[]} Array of keys
     */
    static keys() {
        try {
            return Object.keys(localStorage);
        } catch (e) {
            if (window.LoggerUtils) {
                window.LoggerUtils.warn('Failed to get localStorage keys:', e);
            }
            return [];
        }
    }

    /**
     * Check if key exists in localStorage
     * @param {string} key - Storage key
     * @returns {boolean} True if key exists
     */
    static hasKey(key) {
        try {
            return localStorage.getItem(key) !== null;
        } catch (e) {
            return false;
        }
    }
}

// Export to window for use in other modules
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

/**
 * Simple URL parameter utility to consolidate scattered parameter handling
 */
class URLParams {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
    }

    get(key, defaultValue = null) {
        return this.params.get(key) || defaultValue;
    }

    getBoolean(key, defaultValue = false) {
        const value = this.params.get(key);
        if (value === null) return defaultValue;
        // Treat 'true', '1', or empty string (just ?key) as truthy
        if (value === 'true' || value === '1' || value === '') return true;
        // Treat 'false' or '0' as falsy
        if (value === 'false' || value === '0') return false;
        return defaultValue;
    }

    /**
     * Get integer parameter value
     * @param {string} key - Parameter name
     * @param {number} defaultValue - Default if not found or invalid
     * @returns {number} Parsed integer value
     */
    getInt(key, defaultValue = 0) {
        const value = this.params.get(key);
        if (value === null) return defaultValue;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Get float parameter value
     * @param {string} key - Parameter name
     * @param {number} defaultValue - Default if not found or invalid
     * @returns {number} Parsed float value
     */
    getFloat(key, defaultValue = 0) {
        const value = this.params.get(key);
        if (value === null) return defaultValue;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    has(key) {
        return this.params.has(key);
    }
}

// Create global instance
const urlParams = new URLParams();

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.urlParams = urlParams;
    window.urlParams = urlParams;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLParams;
}

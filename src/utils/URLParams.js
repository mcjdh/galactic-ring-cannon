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
        return value === 'true' || (value !== null && value !== 'false' && defaultValue);
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

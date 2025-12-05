/**
 * Unified Logging System
 *
 * Production-safe logging utility with support for debug categories.
 *
 * Debug modes:
 * - ?debug=true in URL
 * - localStorage.setItem('debug', 'true')
 * - window.DEBUG = true
 *
 * Categories allow fine-grained control over debug output:
 * - logger.enableCategory('projectiles')  // Only show projectile logs
 * - logger.enableCategory('*')            // Show all categories
 *
 * In production, only errors and warnings are logged.
 * In debug mode, all logs are visible (or filtered by category).
 *
 * Usage:
 *   window.logger.log('message')              // Debug-only messages
 *   window.logger.log('projectiles', 'msg')   // Category-specific debug
 *   window.logger.info('message')             // Debug-only info
 *   window.logger.warn('message')             // Always shown
 *   window.logger.error('message')            // Always shown
 */
class Logger {
    constructor() {
        // Determine if debug mode is enabled
        this.debug = this._shouldEnableDebug();

        // Debug categories - allows fine-grained debug control
        // When empty, all categories are allowed (if debug=true)
        // When populated, only listed categories are shown
        this.enabledCategories = new Set();

        // Load saved categories from localStorage
        this._loadCategories();

        // Bind methods so they can be safely passed as callbacks
        this.log = this.log.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
        this.info = this.info.bind(this);
        this.setDebug = this.setDebug.bind(this);
        this.enableCategory = this.enableCategory.bind(this);
        this.disableCategory = this.disableCategory.bind(this);
        this.isDebugEnabled = this.isDebugEnabled.bind(this);
    }

    _shouldEnableDebug() {
        // Check URL parameter
        if (typeof window !== 'undefined' && window.location?.search?.includes('debug=true')) {
            return true;
        }

        // Check localStorage (persists across sessions)
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true') {
                return true;
            }
        } catch (e) {
            // localStorage might not be available
        }

        // Check global flag
        if (typeof window !== 'undefined' && window.DEBUG === true) {
            return true;
        }

        // Default to false (production mode)
        return false;
    }

    _loadCategories() {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('debug_categories');
                if (saved) {
                    const categories = JSON.parse(saved);
                    categories.forEach(cat => this.enabledCategories.add(cat));
                }
            }
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    _saveCategories() {
        try {
            if (typeof localStorage !== 'undefined') {
                const categories = Array.from(this.enabledCategories);
                localStorage.setItem('debug_categories', JSON.stringify(categories));
            }
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    /**
     * Check if debug is enabled for a specific category
     * @param {string} category - Category name (e.g., 'projectiles', 'enemies')
     * @returns {boolean}
     */
    isDebugEnabled(category) {
        if (!this.debug) return false;

        // If no categories specified, all are enabled
        if (this.enabledCategories.size === 0) return true;

        // Check for wildcard
        if (this.enabledCategories.has('*')) return true;

        // Check specific category
        return this.enabledCategories.has(category);
    }

    /**
     * Enable debug logging for a specific category
     * @param {string} category - Category name or '*' for all
     */
    enableCategory(category) {
        this.enabledCategories.add(category);
        this._saveCategories();
        console.log(`# Debug category "${category}" enabled`);
    }

    /**
     * Disable debug logging for a specific category
     * @param {string} category - Category name
     */
    disableCategory(category) {
        this.enabledCategories.delete(category);
        this._saveCategories();
        console.log(`# Debug category "${category}" disabled`);
    }

    /**
     * Programmatically enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebug(enabled) {
        this.debug = Boolean(enabled);
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('debug', this.debug ? 'true' : 'false');
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        console.log(`# Debug mode ${this.debug ? 'enabled' : 'disabled'}`);
    }

    /**
     * Clear all category filters (show all debug logs when debug=true)
     */
    clearCategories() {
        this.enabledCategories.clear();
        this._saveCategories();
        console.log(`# All debug category filters cleared`);
    }

    /**
     * List enabled debug categories
     */
    listCategories() {
        if (this.enabledCategories.size === 0) {
            console.log('# No category filters (all categories enabled)');
        } else {
            console.log('# Enabled categories:', Array.from(this.enabledCategories).join(', '));
        }
    }

    // Known debug categories for categorized logging
    // Object lookup is slightly faster than Set.has() for small sets
    static KNOWN_CATEGORIES = {
        projectiles: true, enemies: true, systems: true, physics: true, audio: true,
        particles: true, weapons: true, spawner: true, formations: true, ai: true,
        input: true, render: true, collision: true, effects: true, ui: true, state: true
    };

    log(...args) {
        // Support both:
        // logger.log('message')
        // logger.log('category', 'message', ...)

        if (!this.debug) return;

        // Check if first arg is a known category (not just any single word)
        if (typeof args[0] === 'string' && args.length > 1 && Logger.KNOWN_CATEGORIES[args[0]]) {
            const category = args[0];
            const rest = args.slice(1);

            // Check category filter
            if (this.enabledCategories.size > 0 &&
                !this.enabledCategories.has('*') &&
                !this.enabledCategories.has(category)) {
                return; // Category filtered out
            }

            console.log(`[${category}]`, ...rest);
        } else {
            // Regular log without category
            console.log(...args);
        }
    }

    warn(...args) {
        // Warnings always visible (important for debugging issues)
        console.warn(...args);
    }

    error(...args) {
        // Errors always visible (critical for debugging)
        console.error(...args);
    }

    info(...args) {
        // Info logs only in debug mode (similar to log)
        if (this.debug) {
            console.info(...args);
        }
    }

    setDebug(enabled) {
        this.debug = enabled;
        // Persist to localStorage
        try {
            if (typeof localStorage !== 'undefined') {
                if (enabled) {
                    localStorage.setItem('debug', 'true');
                } else {
                    localStorage.removeItem('debug');
                }
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        console.log(`# Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Create global logger instance
const logger = new Logger();

// Make globally available
if (typeof window !== 'undefined') {
    const legacyProjectileFlag = (typeof window.debugProjectiles === 'boolean') ? window.debugProjectiles : null;
    const legacyEnemiesFlag = (typeof window.debugEnemies === 'boolean') ? window.debugEnemies : null;
    const legacySystemsFlag = (typeof window.debugSystems === 'boolean') ? window.debugSystems : null;

    window.Game = window.Game || {};
    window.Game.logger = logger;
    window.logger = logger;

    // Add convenience methods to window for easy debugging
    window.toggleDebug = function() {
        logger.setDebug(!logger.debug);
        return logger.debug;
    };

    window.enableDebugCategory = function(category) {
        if (!logger.debug) {
            console.log('# Enable debug mode first: window.toggleDebug()');
            return;
        }
        logger.enableCategory(category);
    };

    window.disableDebugCategory = function(category) {
        logger.disableCategory(category);
    };

    window.listDebugCategories = function() {
        logger.listCategories();
    };

    window.clearDebugCategories = function() {
        logger.clearCategories();
    };

    // Convenience: Set up common debug category presets
    const debugProjectilesFn = function(enabled = true) {
        if (enabled) {
            if (!logger.debug) logger.setDebug(true);
            logger.enableCategory('projectiles');
        } else {
            logger.disableCategory('projectiles');
        }
    };
    window.debugProjectiles = debugProjectilesFn;

    const debugEnemiesFn = function(enabled = true) {
        if (enabled) {
            if (!logger.debug) logger.setDebug(true);
            logger.enableCategory('enemies');
        } else {
            logger.disableCategory('enemies');
        }
    };
    window.debugEnemies = debugEnemiesFn;

    const debugSystemsFn = function(enabled = true) {
        if (enabled) {
            if (!logger.debug) logger.setDebug(true);
            logger.enableCategory('systems');
        } else {
            logger.disableCategory('systems');
        }
    };
    window.debugSystems = debugSystemsFn;

    // Boolean-compatible accessors for legacy usage (e.g., window.debugProjectiles = true)
    const makeCategoryAccessor = (fn) => ({
        configurable: true,
        get() { return fn; },
        set(value) { fn(!!value); },
        enumerable: true
    });

    Object.defineProperty(window, 'debugProjectiles', makeCategoryAccessor(debugProjectilesFn));
    Object.defineProperty(window, 'debugEnemies', makeCategoryAccessor(debugEnemiesFn));
    Object.defineProperty(window, 'debugSystems', makeCategoryAccessor(debugSystemsFn));

    // Log initial state and helpful hints
    if (logger.debug) {
        console.log('# Debug mode is ENABLED');
        if (logger.enabledCategories.size > 0) {
            console.log(`# Active categories: ${Array.from(logger.enabledCategories).join(', ')}`);
        } else {
            console.log('# All categories enabled (no filters)');
        }
        console.log('# Commands: window.toggleDebug(), window.enableDebugCategory("name"), window.listDebugCategories()');
    } else {
        // Show helpful hint for users who open console
        console.log('%c? Debug Mode Available', 'color: #3498db; font-size: 14px; font-weight: bold;');
        console.log('%cEnable verbose logging with any of these methods:', 'color: #95a5a6; font-size: 12px;');
        console.log('%c  • window.toggleDebug()%c           - Toggle on/off', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
        console.log('%c  • window.debugProjectiles()%c      - Debug projectile system', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
        console.log('%c  • window.debugEnemies()%c          - Debug enemy system', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
        console.log('%c  • ?debug=true%c                    - Add to URL', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
    }

    // Backwards compatibility: Define window.debugMode as alias to logger.debug
    Object.defineProperty(window, 'debugMode', {
        get: () => logger.debug,
        set: (value) => logger.setDebug(value)
    });

    // Apply any legacy boolean flags that were set before logger initialization
    if (legacyProjectileFlag === true) {
        debugProjectilesFn(true);
    }
    if (legacyEnemiesFlag === true) {
        debugEnemiesFn(true);
    }
    if (legacySystemsFlag === true) {
        debugSystemsFn(true);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}

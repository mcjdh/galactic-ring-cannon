/**
 * Production-safe logging utility to replace scattered console.log statements
 *
 * Debug modes:
 * - ?debug=true in URL
 * - localStorage.setItem('debug', 'true')
 * - window.DEBUG = true
 *
 * In production, only errors and warnings are logged.
 * In debug mode, all logs are visible.
 */
class Logger {
    constructor() {
        // Determine if debug mode is enabled
        this.debug = this._shouldEnableDebug();

        // Bind methods so they can be safely passed as callbacks
        this.log = this.log.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
        this.info = this.info.bind(this);
        this.setDebug = this.setDebug.bind(this);
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

    log(message, ...args) {
        // Only log in debug mode
        if (this.debug) {
            console.log(`[LOG] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        // Warnings always visible (important for debugging issues)
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message, ...args) {
        // Errors always visible (critical for debugging)
        console.error(`[ERROR] ${message}`, ...args);
    }

    info(message, ...args) {
        // Info logs only in debug mode (similar to log)
        if (this.debug) {
            console.info(`[INFO] ${message}`, ...args);
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
        console.log(`🔧 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Create global logger instance
const logger = new Logger();

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.logger = logger;
    window.logger = logger;

    // Add convenience method to window for easy debugging
    // Usage: window.toggleDebug()
    window.toggleDebug = function() {
        logger.setDebug(!logger.debug);
        return logger.debug;
    };

    // Log initial state and helpful hints
    if (logger.debug) {
        console.log('🔧 Debug mode is ENABLED. Use window.toggleDebug() to disable or localStorage.removeItem("debug")');
    } else {
        // Show helpful hint for users who open console
        console.log('%c💡 Debug Mode Available', 'color: #3498db; font-size: 14px; font-weight: bold;');
        console.log('%cEnable verbose logging with any of these methods:', 'color: #95a5a6; font-size: 12px;');
        console.log('%c  • window.toggleDebug()%c           - Toggle on/off', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
        console.log('%c  • ?debug=true%c                    - Add to URL', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
        console.log('%c  • localStorage.setItem("debug", "true")%c - Persist across sessions', 'color: #2ecc71; font-weight: bold;', 'color: #7f8c8d;');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}

/**
 * Simple logging utility to replace scattered console.log statements
 * Allows easy toggling of debug output
 */
class Logger {
    constructor(enableDebug = false) {
        this.debug = enableDebug;
        // Bind methods so they can be safely passed as callbacks
        this.log = this.log.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
        this.info = this.info.bind(this);
        this.setDebug = this.setDebug.bind(this);
    }

    log(message, ...args) {
        if (this.debug) {
            console.log(`[LOG] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }

    info(message, ...args) {
        console.info(`[INFO] ${message}`, ...args);
    }

    setDebug(enabled) {
        this.debug = enabled;
    }
}

// Create global logger instance
const logger = new Logger(window.location.search.includes('debug=true'));

// Make globally available
if (typeof window !== 'undefined') {
    window.logger = logger;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}

/**
 * Centralized Logger Utility
 * Provides consistent logging interface with fallback to console
 * Handles cases where window.logger may not be available
 */

/**
 * Get the appropriate logger instance
 * Falls back to console if window.logger is not available
 * @returns {Object} Logger instance with log, warn, error methods
 */
function getLogger() {
    // Check if we're in a browser environment with window.logger
    if (typeof window !== 'undefined' && window.logger) {
        return window.logger;
    }
    // Fallback to console
    return console;
}

/**
 * Log an info message
 * @param {...any} args - Arguments to log
 */
function log(...args) {
    getLogger().log(...args);
}

/**
 * Log a warning message
 * @param {...any} args - Arguments to log
 */
function warn(...args) {
    getLogger().warn(...args);
}

/**
 * Log an error message
 * @param {...any} args - Arguments to log
 */
function error(...args) {
    getLogger().error(...args);
}

/**
 * Log a debug message (if logger supports it)
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
    const logger = getLogger();
    if (logger.debug) {
        logger.debug(...args);
    } else {
        logger.log('[DEBUG]', ...args);
    }
}

/**
 * Log an info message (alias for log)
 * @param {...any} args - Arguments to log
 */
function info(...args) {
    const logger = getLogger();
    if (logger.info) {
        logger.info(...args);
    } else {
        logger.log(...args);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LoggerUtils = {
        getLogger,
        log,
        warn,
        error,
        debug,
        info
    };
}

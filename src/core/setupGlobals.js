(function() {
    let assigned = false;

    function log(...args) {
        window.LoggerUtils.log(...args);
    }

    function warn(...args) {
        window.LoggerUtils.warn(...args);
    }

    function error(...args) {
        window.LoggerUtils.error(...args);
    }

    function once(fn) {
        let called = false;
        return (...args) => {
            if (called) {
                return;
            }
            called = true;
            fn(...args);
        };
    }

    const namespace = window.Game || (window.Game = {});
    const registry = namespace.__registry || new Map();
    const watchers = namespace.__watchers || new Map();

    if (!namespace.__registry) {
        Object.defineProperty(namespace, '__registry', {
            value: registry,
            enumerable: false
        });
    }

    if (!namespace.__watchers) {
        Object.defineProperty(namespace, '__watchers', {
            value: watchers,
            enumerable: false
        });
    }

    function notify(name, value) {
        if (!watchers.has(name)) {
            return;
        }

        const callbacks = watchers.get(name).slice();
        watchers.delete(name);

        callbacks.forEach(callback => {
            try {
                callback(value);
            } catch (err) {
                error('Namespace watcher error for', name, err);
            }
        });
    }

    const reservedKeys = new Set(['register', 'has', 'resolve', 'require', 'whenReady']);

    if (typeof namespace.register !== 'function') {
        namespace.register = function register(name, value, options = {}) {
            if (!name || typeof name !== 'string') {
                error('Cannot register namespace entry without a string name', name);
                return value;
            }

            if (typeof value === 'undefined') {
                error(`Cannot register namespace entry "${name}" because value is undefined`);
                return value;
            }

            const existing = registry.get(name) ?? namespace[name];
            if (existing && existing !== value && !options?.silent) {
                warn(`Replacing window.Game.${name}`, existing, '→', value);
            }

            registry.set(name, value);
            namespace[name] = value;

            if (options?.aliases) {
                const aliases = Array.isArray(options.aliases) ? options.aliases : [options.aliases];
                aliases.forEach(alias => {
                    if (alias && typeof alias === 'string') {
                        window[alias] = value;
                    }
                });
            }

            notify(name, value);
            return value;
        };
    }

    if (typeof namespace.has !== 'function') {
        namespace.has = function has(name) {
            return registry.has(name) || typeof namespace[name] !== 'undefined';
        };
    }

    if (typeof namespace.resolve !== 'function') {
        namespace.resolve = function resolve(name) {
            return registry.get(name) ?? namespace[name];
        };
    }

    if (typeof namespace.require !== 'function') {
        namespace.require = function require(name) {
            const value = namespace.resolve(name);
            if (typeof value === 'undefined') {
                throw new Error(`window.Game "${name}" is not registered`);
            }
            return value;
        };
    }

    if (typeof namespace.whenReady !== 'function') {
        namespace.whenReady = function whenReady(dependencies, callback, options = {}) {
            const names = Array.isArray(dependencies) ? dependencies : [dependencies];
            const { checkInterval = 50, timeoutMs = 5000, silent = false } = options;
            const finish = once(() => {
                callback(...names.map(name => namespace.resolve(name)));
            });

            if (names.every(name => namespace.has(name))) {
                finish();
                return () => {};
            }

            const cleanupFns = [];

            names.forEach(name => {
                const listeners = watchers.get(name) || [];
                const listener = () => {
                    if (names.every(dep => namespace.has(dep))) {
                        cleanup();
                        finish();
                    }
                };

                listeners.push(listener);
                watchers.set(name, listeners);
                cleanupFns.push(() => {
                    const stored = watchers.get(name);
                    if (!stored) {
                        return;
                    }
                    const filtered = stored.filter(fn => fn !== listener);
                    if (filtered.length > 0) {
                        watchers.set(name, filtered);
                    } else {
                        watchers.delete(name);
                    }
                });
            });

            let intervalId = null;
            if (checkInterval > 0) {
                intervalId = window.setInterval(() => {
                    if (names.every(name => namespace.has(name))) {
                        cleanup();
                        finish();
                    }
                }, Math.max(10, checkInterval));
                cleanupFns.push(() => window.clearInterval(intervalId));
            }

            let timeoutId = null;
            if (timeoutMs > 0) {
                timeoutId = window.setTimeout(() => {
                    cleanup();
                    if (!silent) {
                        warn('Namespace readiness timeout:', names.join(', '));
                    }
                }, timeoutMs);
                cleanupFns.push(() => window.clearTimeout(timeoutId));
            }

            function cleanup() {
                while (cleanupFns.length > 0) {
                    const fn = cleanupFns.pop();
                    try {
                        fn();
                    } catch (err) {
                        error('Namespace readiness cleanup error', err);
                    }
                }
            }

            return () => cleanup();
        };
    }

    function backfillNamespaceEntries() {
        Object.keys(namespace).forEach(key => {
            if (key.startsWith('__')) {
                return;
            }
            if (reservedKeys.has(key)) {
                return;
            }
            if (registry.has(key)) {
                return;
            }

            const value = namespace[key];
            if (typeof value === 'undefined') {
                return;
            }

            try {
                namespace.register(key, value, { silent: true });
            } catch (err) {
                warn('Failed to backfill namespace entry', key, err);
            }
        });
    }

    backfillNamespaceEntries();

    function assignGlobals() {
        if (assigned) {
            return true;
        }

        const coreReady = typeof Player !== 'undefined'
            && typeof GameEngine !== 'undefined'
            && typeof Particle !== 'undefined';

        if (!coreReady) {
            return false;
        }

        log('All scripts loaded. Checking class availability...');
        log('Player class available:', typeof Player !== 'undefined');
        log('GameEngine class available:', typeof GameEngine !== 'undefined');
        log('Enemy class available:', typeof Enemy !== 'undefined');
        log('Projectile class available:', typeof Projectile !== 'undefined');

        try {
            const testPlayer = new Player(0, 0);
            log('Player instantiation test: SUCCESS');
            if (typeof testPlayer.destroy === 'function') {
                testPlayer.destroy();
            }
        } catch (e) {
            error('Player instantiation test: FAILED', e);
        }

        namespace.register('Player', Player);
        namespace.register('GameEngine', GameEngine);
        if (typeof Enemy !== 'undefined') namespace.register('Enemy', Enemy);
        if (typeof Projectile !== 'undefined') namespace.register('Projectile', Projectile);
        if (typeof XPOrb !== 'undefined') namespace.register('XPOrb', XPOrb);
        if (typeof Particle !== 'undefined') namespace.register('Particle', Particle);

        log('Class references set on window.Game namespace');
        assigned = true;
        return true;
    }

    function attemptAssign() {
        if (!assignGlobals()) {
            window.addEventListener('load', assignGlobals, { once: true });
        }
    }

    if (document.readyState === 'complete') {
        assignGlobals();
    } else if (document.readyState === 'interactive') {
        setTimeout(attemptAssign, 0);
    } else {
        document.addEventListener('DOMContentLoaded', attemptAssign, { once: true });
    }

    window.addEventListener('load', assignGlobals, { once: true });
})();

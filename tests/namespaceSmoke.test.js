#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function main() {
    const eventListeners = new Map();

    const windowStub = {
        logger: {
            log() {},
            warn() {},
            error() {}
        },
        addEventListener(event, handler) {
            const list = eventListeners.get(event) || [];
            list.push(handler);
            eventListeners.set(event, list);
        },
        removeEventListener(event, handler) {
            if (!eventListeners.has(event)) {
                return;
            }
            const filtered = eventListeners.get(event).filter(listener => listener !== handler);
            if (filtered.length > 0) {
                eventListeners.set(event, filtered);
            } else {
                eventListeners.delete(event);
            }
        }
    };

    windowStub.window = windowStub;
    windowStub.setTimeout = setTimeout;
    windowStub.clearTimeout = clearTimeout;
    windowStub.setInterval = setInterval;
    windowStub.clearInterval = clearInterval;

    const documentStub = {
        readyState: 'complete',
        addEventListener(event, handler) {
            const key = `document:${event}`;
            const list = eventListeners.get(key) || [];
            list.push(handler);
            eventListeners.set(key, list);
        }
    };

    global.window = windowStub;
    global.document = documentStub;

    const setupGlobalsPath = path.join(__dirname, '..', 'src', 'core', 'setupGlobals.js');
    const setupGlobalsSource = fs.readFileSync(setupGlobalsPath, 'utf8');
    vm.runInThisContext(setupGlobalsSource, { filename: 'setupGlobals.js' });

    const { Game } = window;
    if (!Game) {
        throw new Error('window.Game namespace was not created');
    }

    ['register', 'has', 'resolve', 'require', 'whenReady'].forEach(method => {
        if (typeof Game[method] !== 'function') {
            throw new Error(`window.Game.${method} is not available`);
        }
    });

    Game.register('TestSystem', { id: 1 });
    if (!Game.has('TestSystem')) {
        throw new Error('Game.has failed to report registered system');
    }
    if (Game.resolve('TestSystem').id !== 1) {
        throw new Error('Game.resolve returned unexpected value');
    }
    if (Game.require('TestSystem').id !== 1) {
        throw new Error('Game.require returned unexpected value');
    }

    await new Promise((resolve, reject) => {
        Game.whenReady('LaterSystem', value => {
            try {
                if (!value || value.name !== 'later') {
                    throw new Error('whenReady delivered incorrect payload');
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        }, { timeoutMs: 200, checkInterval: 0 });

        Game.register('LaterSystem', { name: 'later' });
    });

    console.log('Namespace smoke test passed');
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});

const { createMockLocalStorage, createStorageManagerStub } = require('./testUtils.js');

// Mock dependencies
const windowStub = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => { },
    removeEventListener: () => { },
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: () => { },
    performance: { now: () => Date.now() },
    Game: {},
    logger: { log: () => { }, warn: () => { }, error: () => { } }
};

global.window = windowStub;
global.document = {
    getElementById: () => ({
        getContext: () => ({
            clearRect: () => { },
            save: () => { },
            restore: () => { },
            translate: () => { },
            rotate: () => { },
            scale: () => { },
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            stroke: () => { },
            fill: () => { },
            arc: () => { },
            closePath: () => { }
        }),
        width: 1024,
        height: 768,
        style: {}
    }),
    createElement: () => ({
        style: {},
        appendChild: () => { },
        classList: { add: () => { }, remove: () => { } }
    }),
    body: { appendChild: () => { }, removeChild: () => { } }
};

// Load GameEngine
require('../src/core/gameEngine.js');
const GameEngine = window.Game.GameEngine;

async function runTests() {
    console.log('Running GameEngine Tests...');
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (e) {
            console.error(`❌ ${name}: ${e.message}`);
            failed++;
        }
    };

    await test('GameEngine initializes correctly', () => {
        const engine = new GameEngine();
        if (!engine) throw new Error('Failed to create GameEngine instance');
        if (!engine.state) throw new Error('GameEngine missing state');
    });

    await test('GameEngine handles start and stop', () => {
        const engine = new GameEngine();
        engine.start();
        if (!engine.isRunning) throw new Error('Engine should be running after start()');

        engine.stop();
        if (engine.isRunning) throw new Error('Engine should not be running after stop()');
    });

    await test('GameEngine spawns projectiles', () => {
        const engine = new GameEngine();
        // Mock player
        engine.player = { x: 0, y: 0, stats: { damage: 10 } };

        const projectile = engine.spawnProjectile(0, 0, 1, 0, 'default', 10, 10, 100);

        if (!projectile) throw new Error('Failed to spawn projectile');
        if (engine.projectiles.length !== 1) throw new Error('Projectile not added to engine list');
    });

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

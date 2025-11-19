// Verification test for Projectile Pooling state corruption
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
    logger: { log: () => { }, warn: () => { }, error: () => { }, info: () => { } },
    GAME_CONSTANTS: {
        ENEMIES: { SPAWN_DISTANCE_MAX: 800 }
    }
};

global.window = windowStub;

// Load Real Dependencies
// We need to load them in specific order to satisfy dependencies
require('../src/entities/projectile/behaviors/BehaviorBase.js');
// Ensure base class is globally available for subclasses that extend it
global.ProjectileBehaviorBase = window.ProjectileBehaviorBase;

require('../src/entities/projectile/behaviors/BehaviorManager.js');
require('../src/entities/projectile/behaviors/ChainBehavior.js'); // Load a specific behavior for testing
require('../src/entities/projectile/Projectile.js');
require('../src/entities/projectile/ProjectilePool.js');

const Projectile = window.Projectile;
const ProjectilePool = window.ProjectilePool;
const ProjectileBehaviorManager = window.ProjectileBehaviorManager;

async function runTests() {
    console.log('Running Projectile Pooling Verification Tests...');
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

    await test('Pool initializes correctly', () => {
        const pool = new ProjectilePool(10);
        if (pool.pool.length !== 10) throw new Error(`Expected pool size 10, got ${pool.pool.length}`);
    });

    await test('Acquired projectile has clean state', () => {
        const pool = new ProjectilePool(5);
        const p = pool.acquire(100, 100, { vx: 10, vy: 0 }, 'player');

        if (!p) throw new Error('Failed to acquire projectile');
        if (p.x !== 100 || p.y !== 100) throw new Error('Position not set correctly');
        if (p.behaviorManager.behaviors.length !== 0) throw new Error('New projectile should have 0 behaviors');
    });

    await test('Recycled projectile clears old behaviors', () => {
        const pool = new ProjectilePool(1);

        // 1. Acquire and add behavior
        const p1 = pool.acquire(0, 0, { vx: 10, vy: 0 }, 'player');
        // Manually add a behavior (simulating Factory)
        // We need to mock the behavior class if ChainBehavior isn't fully loaded or requires more deps
        // But we loaded ChainBehavior.js, let's see if it works. 
        // If ChainBehavior fails, we can use a mock behavior.

        // Mock behavior for simplicity and isolation
        class MockBehavior extends ProjectileBehaviorBase {
            getType() { return 'mock_behavior'; }
        }
        const mockBehavior = new MockBehavior(p1);
        p1.behaviorManager.addBehavior(mockBehavior);

        if (!p1.behaviorManager.hasBehavior('mock_behavior')) {
            throw new Error('Failed to add mock behavior to p1');
        }

        // 2. Release
        pool.release(p1);

        // 3. Acquire again (should be same instance)
        const p2 = pool.acquire(100, 100, { vx: 5, vy: 5 }, 'player');

        if (p1 !== p2) throw new Error('Pool did not recycle the instance');

        // 4. Verify clean state
        if (p2.behaviorManager.hasBehavior('mock_behavior')) {
            throw new Error('CRITICAL: Recycled projectile retained old behaviors! Ghost behavior detected.');
        }

        if (p2.behaviorManager.behaviors.length !== 0) {
            throw new Error(`CRITICAL: Recycled projectile has ${p2.behaviorManager.behaviors.length} behaviors, expected 0`);
        }
    });

    await test('Recycled projectile clears legacy flags', () => {
        const pool = new ProjectilePool(1);
        const p1 = pool.acquire(0, 0, { vx: 10 }, 'player');

        // Set legacy flag (which triggers behavior addition in the setter)
        // We need to be careful: Projectile.js setters might try to instantiate real behaviors
        // which might fail if dependencies aren't met.
        // For this test, we just want to check if _oldFlags are reset.

        p1._oldFlags.hasChainLightning = true;

        pool.release(p1);

        const p2 = pool.acquire(0, 0, { vx: 10 }, 'player');

        if (p2._oldFlags.hasChainLightning) {
            throw new Error('CRITICAL: Recycled projectile retained legacy flag hasChainLightning');
        }
    });

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

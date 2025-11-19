// Mock dependencies
const windowStub = {
    Game: {},
    logger: { log: () => { }, warn: () => { }, error: () => { } }
};
global.window = windowStub;

// Load dependencies
// Load Real Dependencies
require('../src/entities/projectile/behaviors/BehaviorBase.js');
global.ProjectileBehaviorBase = window.ProjectileBehaviorBase;
require('../src/entities/projectile/behaviors/BehaviorManager.js');
const ProjectileBehaviorManager = window.ProjectileBehaviorManager;

async function runTests() {
    console.log('Running ProjectileBehavior Tests...');
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

    await test('Manager initializes correctly', () => {
        const projectile = { id: 1 };
        const manager = new ProjectileBehaviorManager(projectile);
        if (manager.projectile !== projectile) throw new Error('Manager not linked to projectile');
    });

    await test('Manager adds and checks behaviors', () => {
        const projectile = { id: 1 };
        const manager = new ProjectileBehaviorManager(projectile);

        class MockRicochetBehavior extends ProjectileBehaviorBase {
            getType() { return 'ricochet'; }
        }
        const behavior = new MockRicochetBehavior(projectile, { count: 2 });
        manager.addBehavior(behavior);

        if (!manager.hasBehavior('ricochet')) throw new Error('Behavior not added');
        const retrieved = manager.getBehavior('ricochet');
        if (retrieved.config.count !== 2) throw new Error('Behavior config mismatch');
    });

    await test('Manager removes behaviors', () => {
        const projectile = { id: 1 };
        const manager = new ProjectileBehaviorManager(projectile);

        class MockHomingBehavior extends ProjectileBehaviorBase {
            getType() { return 'homing'; }
        }
        const behavior = new MockHomingBehavior(projectile, { strength: 1 });
        manager.addBehavior(behavior);
        manager.removeBehavior('homing');

        if (manager.hasBehavior('homing')) throw new Error('Behavior not removed');
    });

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

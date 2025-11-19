// Mock dependencies
const windowStub = {
    Game: {},
    logger: { log: () => { }, warn: () => { }, error: () => { } }
};
global.window = windowStub;

// Load dependencies
require('../src/entities/ProjectileBehavior.js');
const ProjectileBehaviorManager = window.Game.ProjectileBehaviorManager;

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

        manager.addBehavior('ricochet', { count: 2 });

        if (!manager.hasBehavior('ricochet')) throw new Error('Behavior not added');
        const config = manager.getBehaviorConfig('ricochet');
        if (config.count !== 2) throw new Error('Behavior config mismatch');
    });

    await test('Manager removes behaviors', () => {
        const projectile = { id: 1 };
        const manager = new ProjectileBehaviorManager(projectile);

        manager.addBehavior('homing', { strength: 1 });
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

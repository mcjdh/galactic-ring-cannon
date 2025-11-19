// Test for ProjectileFactory behavior duplication
const { createMockLocalStorage } = require('./testUtils.js');

// Mock dependencies
const windowStub = {
    Game: {},
    logger: { log: () => { }, warn: () => { }, error: () => { }, info: () => { } },
    GAME_CONSTANTS: { ENEMIES: { SPAWN_DISTANCE_MAX: 800 } }
};
global.window = windowStub;

// Load Dependencies
require('../src/entities/projectile/behaviors/BehaviorBase.js');
global.ProjectileBehaviorBase = window.ProjectileBehaviorBase;
require('../src/entities/projectile/behaviors/BehaviorManager.js');
require('../src/entities/projectile/behaviors/ChainBehavior.js');
global.ChainBehavior = window.ChainBehavior;
require('../src/entities/projectile/behaviors/ExplosiveBehavior.js');
global.ExplosiveBehavior = window.ExplosiveBehavior;
require('../src/entities/projectile/behaviors/RicochetBehavior.js');
global.RicochetBehavior = window.RicochetBehavior;
require('../src/entities/projectile/behaviors/HomingBehavior.js');
global.HomingBehavior = window.HomingBehavior;
require('../src/entities/projectile/behaviors/BurnBehavior.js');
global.BurnBehavior = window.BurnBehavior;
require('../src/entities/projectile/behaviors/PiercingBehavior.js');
global.PiercingBehavior = window.PiercingBehavior;
require('../src/entities/projectile/Projectile.js');
require('../src/entities/projectile/ProjectilePool.js');
require('../src/entities/projectile/ProjectileFactory.js');

const ProjectileFactory = window.Game.ProjectileFactory;
const ProjectilePool = window.ProjectilePool;

async function runTests() {
    console.log('Running ProjectileFactory Tests...');
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

    await test('Factory does not duplicate behaviors', () => {
        // Setup: Projectile with chain lightning config
        const config = {
            vx: 10,
            hasChainLightning: true, // This will trigger addition in reset()
            chainData: { maxChains: 2 }
        };

        // Setup: Player with chain lightning ability
        const player = {
            abilities: {
                hasChainLightning: true,
                chainChance: 1.0 // Always trigger
            }
        };

        // 1. Create projectile (uses pool internally if available)
        // Note: ProjectileFactory.create calls pool.acquire -> reset() -> _resetBehaviorsFromConfig
        // Then it calls _applyBehaviors which checks player abilities
        const p = ProjectileFactory.create(0, 0, config, player, 'player');

        // 2. Check behaviors
        const chainBehaviors = p.behaviorManager.getBehaviors('chain');

        if (chainBehaviors.length === 0) {
            throw new Error('Chain behavior missing');
        }

        if (chainBehaviors.length > 1) {
            throw new Error(`Duplicate chain behaviors detected! Count: ${chainBehaviors.length}`);
        }
    });

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

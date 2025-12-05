/**
 * Player Shield Tests
 *
 * Verifies shield initialization and adaptive armor growth work when the shield
 * comes from character data (not just upgrades).
 */

// Minimal global stubs
global.window = {
    GAME_CONSTANTS: { PLAYER: {} },
    Game: {},
    logger: { log: () => {}, warn: () => {}, error: () => {} },
    optimizedParticles: { spawnParticle: () => {} },
    audioSystem: { play: () => {} }
};

const fs = require('fs');
const path = require('path');
const abilitiesCode = fs.readFileSync(
    path.join(__dirname, '../src/entities/player/PlayerAbilities.js'),
    'utf8'
);
const PlayerAbilities = eval(`${abilitiesCode}; PlayerAbilities;`);

const createMockPlayer = () => ({
    x: 0,
    y: 0,
    radius: 20,
    stats: {
        lifestealAmount: 0,
        lifestealCritMultiplier: 1,
        heal: () => {}
    },
    combat: {
        attackDamage: 10,
        critMultiplier: 2,
        getEffectiveCritChance: () => 0
    },
    spawnParticle: () => {}
});

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running Player Shield Tests...\n');

    try {
        const abilities = new PlayerAbilities(createMockPlayer());
        abilities.initializeShield(120, 5);

        if (
            abilities.hasShield &&
            abilities.shieldBaseCapacity === 120 &&
            abilities.shieldMaxCapacity === 120 &&
            abilities.shieldCurrent === 120 &&
            abilities.shieldRechargeTime === 5
        ) {
            console.log('✅ initializeShield sets base/max/current/recharge');
            passed++;
        } else {
            throw new Error('Shield initialization values incorrect');
        }
    } catch (error) {
        console.error('❌ initializeShield failed:', error.message);
        failed++;
    }

    try {
        const abilities = new PlayerAbilities(createMockPlayer());
        abilities.initializeShield(100);
        abilities.shieldAdaptiveGrowth = 5;
        abilities.shieldAdaptiveMax = 20;

        // Block enough damage to trigger one adaptive growth tick
        abilities.absorbDamage(100);

        if (abilities.shieldBaseCapacity === 100 && abilities.shieldMaxCapacity === 105) {
            console.log('✅ Adaptive armor grows from character-granted shield');
            passed++;
        } else {
            throw new Error(`Base ${abilities.shieldBaseCapacity}, Max ${abilities.shieldMaxCapacity}`);
        }
    } catch (error) {
        console.error('❌ Adaptive armor growth failed:', error.message);
        failed++;
    }

    if (failed > 0) {
        process.exitCode = 1;
    }

    console.log(`\nPassed: ${passed}, Failed: ${failed}`);
};

try {
    runTests();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}

#!/usr/bin/env node

/**
 * Regression tests for AchievementSystem edge cases.
 * Focus: lifetime achievement persistence and shield fractional tracking.
 */

const { createMockLocalStorage, createStorageManagerStub } = require('./testUtils.js');

function createDocumentStub() {
    const emptyElement = () => ({
        className: '',
        classList: { add() {}, remove() {} },
        style: {},
        appendChild() {},
        removeChild() {},
        setAttribute() {},
        textContent: ''
    });

    return {
        createElement: emptyElement,
        body: {
            appendChild() {},
            removeChild() {}
        },
        getElementById() {
            return null;
        },
        addEventListener() {},
        removeEventListener() {}
    };
}

function setupGlobalEnvironment() {
    const localStorage = createMockLocalStorage();
    const StorageManager = createStorageManagerStub(localStorage);

    const windowStub = {
        Game: {},
        logger: {
            log() {},
            warn() {},
            error() {}
        },
        StorageManager,
        localStorage,
        addEventListener() {},
        removeEventListener() {}
    };

    windowStub.window = windowStub;

    global.window = windowStub;
    global.document = createDocumentStub();
    global.localStorage = localStorage;

    require('../src/config/achievements.config.js');
    require('../src/systems/achievements.js');

    return windowStub;
}

const windowStub = setupGlobalEnvironment();
const AchievementSystem = windowStub.Game.AchievementSystem;

if (!AchievementSystem) {
    console.error('! AchievementSystem failed to load');
    process.exit(1);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createSystem() {
    window.StorageManager.clear();
    return new AchievementSystem();
}

function testLifetimeProgressDoesNotRegress() {
    const system = createSystem();

    // Simulate prior progress saved on disk
    system.achievements.cosmic_veteran.progress = 500;
    system.achievements.galactic_explorer.progress = 1500;
    system.achievements.trigger_happy.progress = 1200;

    // Incoming stats snapshot is lower (e.g., game restarted after crash)
    system.updateLifetimeAchievements({
        totalDamageDealt: 100,
        distanceTraveled: 200,
        projectilesFired: 300
    });

    assert(system.achievements.cosmic_veteran.progress === 500,
        'cosmic_veteran progress regressed when stats decreased');
    assert(system.achievements.galactic_explorer.progress === 1500,
        'galactic_explorer progress regressed when stats decreased');
    assert(system.achievements.trigger_happy.progress === 1200,
        'trigger_happy progress regressed when stats decreased');

    // Higher snapshot should still advance progress
    system.updateLifetimeAchievements({
        totalDamageDealt: 600,
        distanceTraveled: 2200,
        projectilesFired: 1800
    });

    assert(system.achievements.cosmic_veteran.progress === 600,
        'cosmic_veteran did not advance with higher stats');
    assert(system.achievements.galactic_explorer.progress === 2200,
        'galactic_explorer did not advance with higher stats');
    assert(system.achievements.trigger_happy.progress === 1800,
        'trigger_happy did not advance with higher stats');
}

function testShieldFractionalProgressAccumulates() {
    const system = createSystem();

    const increments = [0.6, 0.4, 0.5, 0.5];
    const total = increments.reduce((sum, value) => sum + value, 0);

    increments.forEach(value => {
        system.updateShieldDamageBlocked(value);
    });

    const blocked = system.achievements.unbreakable.progress;

    assert(blocked > 0, 'Shield damage blocked progress never increased for fractional values');

    const epsilon = 1e-6;
    assert(Math.abs(blocked - total) < epsilon,
        `Shield damage blocked progress expected ${total}, got ${blocked}`);
}

function testStormSurgeTracksBestHitCluster() {
    const system = createSystem();

    system.onStormSurgeHit(5);
    assert(system.achievements.storm_surge.progress === 5,
        'Storm Surge should record initial burst size');

    system.onStormSurgeHit(2);
    assert(system.achievements.storm_surge.progress === 5,
        'Storm Surge should not regress when later burst is smaller');

    system.onStormSurgeHit(9);
    const expectedProgress = Math.min(9, system.achievements.storm_surge.target);
    assert(system.achievements.storm_surge.progress === expectedProgress,
        'Storm Surge should capture new best burst (capped at target)');
}

function testGalacticExplorerStoresIntegerProgress() {
    const system = createSystem();

    system.updateLifetimeAchievements({ distanceTraveled: 123.9 });
    assert(system.achievements.galactic_explorer.progress === 123,
        'Galactic Explorer progress should floor to integer');

    system.updateLifetimeAchievements({ distanceTraveled: 123.2 });
    assert(system.achievements.galactic_explorer.progress === 123,
        'Galactic Explorer progress should not regress when snapshot decreases');
}

function runTests() {
    const tests = [
        ['Lifetime achievements do not regress with smaller stats snapshot', testLifetimeProgressDoesNotRegress],
        ['Shield achievements accumulate fractional increments', testShieldFractionalProgressAccumulates],
        ['Storm Surge captures the largest simultaneous hit count', testStormSurgeTracksBestHitCluster],
        ['Galactic Explorer stores integer progress values', testGalacticExplorerStoresIntegerProgress]
    ];

    let failures = 0;
    tests.forEach(([name, fn]) => {
        try {
            fn();
            console.log(`+ ${name}`);
        } catch (error) {
            failures++;
            console.error(`! ${name}: ${error.message}`);
            console.error(error);
        }
    });

    if (failures > 0) {
        process.exitCode = 1;
    } else {
        console.log('AchievementSystem regression suite passed');
    }
}

runTests();

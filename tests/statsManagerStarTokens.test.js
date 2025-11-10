#!/usr/bin/env node

/**
 * Regression tests for StatsManager star token synchronization.
 * Focus: ensure earn/spend logic defers to GameState and stays consistent.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { createMockLocalStorage, createStorageManagerStub } = require('./testUtils.js');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function loadStatsManager() {
    if (global.StatsManager) {
        return global.StatsManager;
    }

    const filePath = path.join(__dirname, '../src/core/systems/StatsManager.js');
    const contents = fs.readFileSync(filePath, 'utf8');
    const wrapped = `${contents}\n;global.StatsManager = window?.Game?.StatsManager || (typeof StatsManager !== 'undefined' ? StatsManager : global.StatsManager);`;
    vm.runInThisContext(wrapped, { filename: 'StatsManager.js' });

    if (!global.StatsManager) {
        throw new Error('StatsManager failed to load');
    }
    return global.StatsManager;
}

function createMockState(initialTokens = 0) {
    return {
        meta: {
            starTokens: initialTokens,
            totalStarsEarned: 0
        },
        earnStarTokens(amount) {
            this.meta.starTokens += amount;
            this.meta.totalStarsEarned += amount;
        },
        spendStarTokens(amount) {
            if (this.meta.starTokens >= amount) {
                this.meta.starTokens -= amount;
                return true;
            }
            return false;
        }
    };
}

function createGameManagerStub(state, achievementSystem) {
    let starDisplayUpdates = 0;
    let saveCalls = 0;
    const effectsManager = {
        entries: [],
        showCombatText(text, x, y) {
            this.entries.push({ text, x, y });
        }
    };

    const game = {
        state,
        player: { x: 0, y: 0 },
        enemies: [],
        getEnemies() {
            return [];
        }
    };

    return {
        game,
        achievementSystem,
        effectsManager,
        enemySpawner: null,
        metaStars: state.meta.starTokens,
        gameTime: 0,
        updateStarDisplay() {
            starDisplayUpdates++;
        },
        saveStarTokens() {
            saveCalls++;
        },
        get updateStarDisplayCount() {
            return starDisplayUpdates;
        },
        get saveStarTokenCount() {
            return saveCalls;
        }
    };
}

function createTestRig({ initialTokens = 0 } = {}) {
    const localStorage = createMockLocalStorage();
    const StorageManager = createStorageManagerStub(localStorage);

    const windowStub = {
        logger: {
            log() {},
            warn() {},
            error() {}
        },
        StorageManager,
        GAME_CONSTANTS: {
            COMBO: { TIMEOUT: 0.8, TARGET: 8, MAX_MULTIPLIER: 2.5 }
        },
        Game: {},
        achievementSystem: {
            updateAchievementCalls: [],
            updateAchievement(key, value) {
                this.updateAchievementCalls.push({ key, value });
            }
        }
    };

    windowStub.window = windowStub;
    global.window = windowStub;
    global.document = { getElementById() { return null; } };
    global.localStorage = localStorage;

    const StatsManager = loadStatsManager();
    const state = createMockState(initialTokens);
    const gameManager = createGameManagerStub(state, windowStub.achievementSystem);
    const statsManager = new StatsManager(gameManager);
    gameManager.statsManager = statsManager;

    return { statsManager, state, windowStub, gameManager };
}

function testEarnStarTokensSyncsWithGameState() {
    const { statsManager, state, windowStub, gameManager } = createTestRig({ initialTokens: 10 });
    statsManager.earnStarTokens(5);

    assert(state.meta.starTokens === 15, 'GameState meta star tokens did not increase');
    assert(statsManager.starTokens === 15, 'StatsManager starTokens out of sync with state');
    assert(statsManager.starTokensEarned === 5, 'starTokensEarned did not track awarded amount');
    assert(gameManager.metaStars === 15, 'GameManager metaStars not updated');
    assert(gameManager.updateStarDisplayCount === 1, 'updateStarDisplay not invoked');

    const metaCalls = windowStub.achievementSystem.updateAchievementCalls.filter(call => call.key === 'meta_star_collector');
    assert(metaCalls.length > 0, 'meta_star_collector was never updated');
    const lastCall = metaCalls[metaCalls.length - 1];
    assert(lastCall.value === 15, 'meta_star_collector progress did not reflect new total');
}

function testEarnStarTokensIgnoresInvalidValues() {
    const { statsManager, state, windowStub } = createTestRig({ initialTokens: 3 });

    statsManager.earnStarTokens(0);
    statsManager.earnStarTokens(-2);
    statsManager.earnStarTokens(Number.NaN);

    assert(state.meta.starTokens === 3, 'Invalid inputs should not change GameState tokens');
    assert(statsManager.starTokensEarned === 0, 'Invalid inputs should not change starTokensEarned');
    assert(windowStub.achievementSystem.updateAchievementCalls.length === 0,
        'Invalid inputs should not update achievements');
}

function testSpendStarTokensUsesGameState() {
    const { statsManager, state, gameManager } = createTestRig({ initialTokens: 6 });

    const result = statsManager.spendStarTokens(4);
    assert(result === true, 'spendStarTokens should succeed when GameState permits');
    assert(state.meta.starTokens === 2, 'GameState star tokens did not decrease');
    assert(statsManager.starTokens === 2, 'StatsManager starTokens out of sync after spending');
    assert(gameManager.metaStars === 2, 'GameManager metaStars not updated after spending');
    assert(gameManager.updateStarDisplayCount === 1, 'updateStarDisplay not called on spend');
}

function testSpendStarTokensFailsGracefully() {
    const { statsManager, state, gameManager } = createTestRig({ initialTokens: 2 });

    const result = statsManager.spendStarTokens(5);
    assert(result === false, 'spendStarTokens should fail if GameState rejects the spend');
    assert(state.meta.starTokens === 2, 'Failed spend should not change GameState tokens');
    assert(statsManager.starTokens === 2, 'Failed spend should not change StatsManager tokens');
    assert(gameManager.updateStarDisplayCount === 0, 'UI should not update when spend fails');
}

function runTests() {
    const tests = [
        ['Earn star tokens syncs with GameState', testEarnStarTokensSyncsWithGameState],
        ['Invalid star token awards are ignored', testEarnStarTokensIgnoresInvalidValues],
        ['Spending star tokens uses GameState authority', testSpendStarTokensUsesGameState],
        ['Spending star tokens fails gracefully when insufficient', testSpendStarTokensFailsGracefully]
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
        console.log('StatsManager star token regression suite passed');
    }
}

runTests();

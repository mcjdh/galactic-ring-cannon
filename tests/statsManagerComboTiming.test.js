#!/usr/bin/env node

/**
 * Regression: StatsManager should defer combo timing to GameState.
 * Ensures the combo timer is not decremented twice per frame and
 * that GameState's rebalanced timeout is not overwritten.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { GameState } = require('../src/core/GameState.js');
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

function setupEnvironment() {
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
        achievementSystem: {
            updateAchievement() {},
            updateLifetimeAchievements() {},
            onLevelReached() {},
            updateUntouchable() {},
            updateTankCommander() {},
            updateEdgeWalker() {}
        },
        Game: {}
    };

    windowStub.window = windowStub;
    global.window = windowStub;
    global.document = { getElementById() { return null; } };
    global.localStorage = localStorage;

    return { windowStub };
}

function createGameManager(state) {
    const player = { health: 100, maxHealth: 100, level: 5, x: 0, y: 0 };
    return {
        game: {
            state,
            player,
            enemies: [],
            getEnemies() {
                return [];
            }
        },
        gameTime: 0,
        difficultyManager: null,
        enemySpawner: null,
        effectsManager: null
    };
}

function testComboTimerRespectsGameState() {
    setupEnvironment();
    const state = new GameState();
    state.combo.count = 3;
    state.combo.timer = 1.2; // Rebalanced combo window in GameState

    const StatsManager = loadStatsManager();
    const statsManager = new StatsManager(createGameManager(state));

    assert(Math.abs(state.combo.timeout - 1.2) < 1e-6,
        `GameState combo timeout should remain 1.2s, got ${state.combo.timeout}`);

    statsManager.update(0.5);
    assert(Math.abs(state.combo.timer - 0.7) < 1e-6,
        `Combo timer should decrement once per update (expected 0.7, got ${state.combo.timer})`);

    statsManager.update(0.5);
    assert(Math.abs(state.combo.timer - 0.2) < 1e-6,
        `Combo timer should continue counting down without double decrement (expected 0.2, got ${state.combo.timer})`);

    statsManager.update(0.5);
    assert(state.combo.count === 0, 'Combo should reset when the timer expires');
    assert(state.combo.timer === 0, 'Combo timer should reset to 0 after expiration');
}

function run() {
    const tests = [
        ['StatsManager defers combo timing to GameState', testComboTimerRespectsGameState]
    ];

    let failures = 0;
    tests.forEach(([name, fn]) => {
        try {
            fn();
            console.log(`+ ${name}`);
        } catch (error) {
            failures++;
            console.error(`! ${name}: ${error.message}`);
        }
    });

    if (failures > 0) {
        process.exitCode = 1;
    } else {
        console.log('StatsManager combo timing regression suite passed');
    }
}

run();

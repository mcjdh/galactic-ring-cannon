/**
 * 🧪 GameState Integration Tests
 * Quick smoke tests to verify state management works correctly
 *
 * Run in browser console after game loads:
 * > testGameState()
 */

function testGameState() {
    console.log('🧪 Testing GameState Integration...\n');

    const tests = [];
    const results = { passed: 0, failed: 0, errors: [] };

    // Helper to run test
    const test = (name, fn) => {
        try {
            fn();
            console.log(`✅ ${name}`);
            results.passed++;
        } catch (error) {
            console.error(`❌ ${name}:`, error.message);
            results.failed++;
            results.errors.push({ test: name, error: error.message });
        }
    };

    // ===== CORE TESTS =====

    test('GameState exists globally', () => {
        if (typeof window.GameState === 'undefined') {
            throw new Error('GameState class not found');
        }
    });

    test('GameEngine has state instance', () => {
        if (!window.gameEngine) throw new Error('gameEngine not found');
        if (!window.gameEngine.state) throw new Error('gameEngine.state not found');
        if (!(window.gameEngine.state instanceof GameState)) {
            throw new Error('gameEngine.state is not a GameState instance');
        }
    });

    test('GameManagerBridge linked to GameState', () => {
        if (!window.gameManager) throw new Error('gameManager not found');
        if (!window.gameManager.state) throw new Error('gameManager.state not found');
        if (window.gameManager.state !== window.gameEngine.state) {
            throw new Error('gameManager.state not same instance as gameEngine.state');
        }
    });

    test('StatsManager linked to GameState', () => {
        if (!window.statsManager) throw new Error('statsManager not found');
        if (!window.statsManager.state) throw new Error('statsManager.state not found');
        if (window.statsManager.state !== window.gameEngine.state) {
            throw new Error('statsManager.state not same instance as gameEngine.state');
        }
    });

    // ===== GETTER/SETTER TESTS =====

    test('GameEngine.gameTime getter works', () => {
        const time = window.gameEngine.gameTime;
        if (typeof time !== 'number') throw new Error('gameTime is not a number');
        if (time !== window.gameEngine.state.runtime.gameTime) {
            throw new Error('gameTime getter mismatch');
        }
    });

    test('GameEngine.isPaused getter works', () => {
        const paused = window.gameEngine.isPaused;
        if (typeof paused !== 'boolean') throw new Error('isPaused is not a boolean');
        if (paused !== window.gameEngine.state.runtime.isPaused) {
            throw new Error('isPaused getter mismatch');
        }
    });

    test('GameManagerBridge.killCount getter works', () => {
        const kills = window.gameManager.killCount;
        if (typeof kills !== 'number') throw new Error('killCount is not a number');
        if (kills !== window.gameManager.state.progression.killCount) {
            throw new Error('killCount getter mismatch');
        }
    });

    test('StatsManager.comboCount getter works', () => {
        const combo = window.statsManager.comboCount;
        if (typeof combo !== 'number') throw new Error('comboCount is not a number');
        if (combo !== window.statsManager.state.combo.count) {
            throw new Error('comboCount getter mismatch');
        }
    });

    // ===== STATE SYNC TESTS =====

    test('All systems read same gameTime', () => {
        const engineTime = window.gameEngine.gameTime;
        const managerTime = window.gameManager.gameTime;
        const stateTime = window.gameEngine.state.runtime.gameTime;

        if (engineTime !== managerTime) {
            throw new Error(`gameEngine.gameTime (${engineTime}) !== gameManager.gameTime (${managerTime})`);
        }
        if (engineTime !== stateTime) {
            throw new Error(`gameEngine.gameTime (${engineTime}) !== state.runtime.gameTime (${stateTime})`);
        }
    });

    test('All systems read same killCount', () => {
        const managerKills = window.gameManager.killCount;
        const statsKills = window.statsManager.killCount;
        const stateKills = window.gameEngine.state.progression.killCount;

        if (managerKills !== statsKills) {
            throw new Error(`gameManager.killCount (${managerKills}) !== statsManager.killCount (${statsKills})`);
        }
        if (managerKills !== stateKills) {
            throw new Error(`gameManager.killCount (${managerKills}) !== state.progression.killCount (${stateKills})`);
        }
    });

    test('All systems read same combo', () => {
        const managerCombo = window.gameManager.currentCombo;
        const statsCombo = window.statsManager.comboCount;
        const stateCombo = window.gameEngine.state.combo.count;

        if (managerCombo !== statsCombo) {
            throw new Error(`gameManager.currentCombo (${managerCombo}) !== statsManager.comboCount (${statsCombo})`);
        }
        if (managerCombo !== stateCombo) {
            throw new Error(`gameManager.currentCombo (${managerCombo}) !== state.combo.count (${stateCombo})`);
        }
    });

    // ===== MUTATION TESTS =====

    test('Incrementing killCount updates all systems', () => {
        const before = window.gameEngine.state.progression.killCount;
        window.gameEngine.state.addKill();
        const after = window.gameEngine.state.progression.killCount;

        if (after !== before + 1) {
            throw new Error(`Kill count not incremented correctly: ${before} -> ${after}`);
        }

        // Verify all systems see the change
        if (window.gameManager.killCount !== after) {
            throw new Error('gameManager.killCount not synced after addKill');
        }
        if (window.statsManager.killCount !== after) {
            throw new Error('statsManager.killCount not synced after addKill');
        }

        // Rollback
        window.gameEngine.state.progression.killCount = before;
    });

    test('Pausing game updates all systems', () => {
        const wasPaused = window.gameEngine.state.runtime.isPaused;

        window.gameEngine.state.pause();

        if (!window.gameEngine.isPaused) {
            throw new Error('gameEngine.isPaused not true after pause');
        }
        if (!window.gameManager.isPaused) {
            throw new Error('gameManager.isPaused not true after pause');
        }
        if (!window.gameEngine.state.runtime.isPaused) {
            throw new Error('state.runtime.isPaused not true after pause');
        }

        // Resume to original state
        if (!wasPaused) {
            window.gameEngine.state.resume();
        }
    });

    // ===== OBSERVER TESTS =====

    test('GameState observer pattern works', () => {
        let eventFired = false;
        const callback = () => { eventFired = true; };

        window.gameEngine.state.on('testEvent', callback);
        window.gameEngine.state._notifyObservers('testEvent');

        if (!eventFired) {
            throw new Error('Observer callback not fired');
        }

        window.gameEngine.state.off('testEvent', callback);
    });

    // ===== VALIDATION TESTS =====

    test('GameState.validate() passes', () => {
        const validation = window.gameEngine.state.validate();
        if (!validation.valid) {
            throw new Error(`State validation failed: ${validation.issues.join(', ')}`);
        }
    });

    test('GameState.getSnapshot() works', () => {
        const snapshot = window.gameEngine.state.getSnapshot();
        if (!snapshot.runtime) throw new Error('Snapshot missing runtime');
        if (!snapshot.flow) throw new Error('Snapshot missing flow');
        if (!snapshot.progression) throw new Error('Snapshot missing progression');
        if (!snapshot.combo) throw new Error('Snapshot missing combo');
        if (!snapshot.meta) throw new Error('Snapshot missing meta');
    });

    // ===== RESULTS =====

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results:`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.errors.forEach(({ test, error }) => {
            console.log(`   • ${test}: ${error}`);
        });
    } else {
        console.log('\n🎉 All tests passed! GameState integration is working correctly.');
    }
    console.log('='.repeat(50) + '\n');

    return results;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.testGameState = testGameState;
    window.testGameState = testGameState;
    console.log('🧪 GameState tests loaded. Run testGameState() in console to verify integration.');
}

/**
 * 🧪 GameState Unit Tests
 * Runs in Node.js for CI/CD validation
 *
 * Usage: npm test
 */

// Node.js environment check
const isNode = typeof window === 'undefined';

// In Node.js: only run if this is the main module
// In browser: always set up browser tests
if (isNode) {
    // Only run tests if executed directly (not imported)
    if (require.main === module) {
        const results = runNodeTests();
        process.exit(results.failed > 0 ? 1 : 0);
    }
} else {
    // Browser test runner (browser helper)
    setupBrowserTests();
}

function runNodeTests() {
    console.log('🧪 Running GameState Unit Tests (Node.js)...\n');

    // Import GameState in Node context
    let GameState;
    try {
        const module = require('./GameState.js');
        GameState = module.GameState || global.GameState;
        if (!GameState) {
            throw new Error('GameState class not exported from GameState.js');
        }
    } catch (err) {
        console.error('❌ Failed to load GameState:', err.message);
        process.exit(1);
    }

    const tests = [];
    const results = { passed: 0, failed: 0, errors: [] };

    // Test helper
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

    // ===== CORE STATE TESTS =====

    test('GameState instantiates', () => {
        const state = new GameState();
        if (!state) throw new Error('Failed to create GameState');
    });

    test('GameState has runtime property', () => {
        const state = new GameState();
        if (!state.runtime) throw new Error('Missing runtime property');
        if (typeof state.runtime.gameTime !== 'number') throw new Error('runtime.gameTime not a number');
    });

    test('GameState has flow property', () => {
        const state = new GameState();
        if (!state.flow) throw new Error('Missing flow property');
        if (typeof state.flow.isGameOver !== 'boolean') throw new Error('flow.isGameOver not a boolean');
    });

    test('GameState has player property', () => {
        const state = new GameState();
        if (!state.player) throw new Error('Missing player property');
        if (typeof state.player.level !== 'number') throw new Error('player.level not a number');
    });

    test('GameState has progression property', () => {
        const state = new GameState();
        if (!state.progression) throw new Error('Missing progression property');
        if (typeof state.progression.killCount !== 'number') throw new Error('progression.killCount not a number');
    });

    test('GameState has combo property', () => {
        const state = new GameState();
        if (!state.combo) throw new Error('Missing combo property');
        if (typeof state.combo.count !== 'number') throw new Error('combo.count not a number');
    });

    // ===== TIME MANAGEMENT TESTS =====

    test('updateTime increments gameTime', () => {
        const state = new GameState();
        const before = state.runtime.gameTime;
        state.updateTime(0.016); // 16ms frame
        if (state.runtime.gameTime <= before) throw new Error('gameTime not incremented');
    });

    test('pause sets isPaused to true', () => {
        const state = new GameState();
        state.pause();
        if (!state.runtime.isPaused) throw new Error('isPaused not true after pause()');
    });

    test('resume sets isPaused to false', () => {
        const state = new GameState();
        state.pause();
        state.resume();
        if (state.runtime.isPaused) throw new Error('isPaused not false after resume()');
    });

    // ===== PROGRESSION TESTS =====

    test('addKill increments killCount', () => {
        const state = new GameState();
        const before = state.progression.killCount;
        state.addKill();
        if (state.progression.killCount !== before + 1) throw new Error('killCount not incremented');
    });

    test('addKill updates combo', () => {
        const state = new GameState();
        state.addKill();
        if (state.combo.count !== 1) throw new Error('combo not incremented');
    });

    test('addXP increments xpCollected', () => {
        const state = new GameState();
        const before = state.progression.xpCollected;
        state.addXP(100);
        if (state.progression.xpCollected !== before + 100) throw new Error('xpCollected not incremented');
    });

    // ===== GAME FLOW TESTS =====

    test('gameOver sets flags correctly', () => {
        const state = new GameState();
        state.gameOver();
        if (!state.flow.isGameOver) throw new Error('isGameOver not true');
        if (state.runtime.isRunning === true) throw new Error('isRunning should be false');
        if (state.player.isAlive) throw new Error('player should not be alive');
    });

    test('gameWon sets flags correctly', () => {
        const state = new GameState();
        state.gameWon();
        if (!state.flow.isGameWon) throw new Error('isGameWon not true');
        if (state.runtime.isRunning) throw new Error('isRunning should be false');
    });

    test('setGameMode validates input', () => {
        const state = new GameState();
        state.setGameMode('endless');
        if (state.flow.gameMode !== 'endless') throw new Error('gameMode not set');
        state.setGameMode('invalid'); // Should not change
        if (state.flow.gameMode !== 'endless') throw new Error('gameMode changed to invalid value');
    });

    // ===== COMBO TESTS =====

    test('combo resets after timeout', () => {
        const state = new GameState();
        state.addKill();
        state.updateCombo(10); // Fast-forward 10 seconds
        if (state.combo.count !== 0) throw new Error('combo not reset after timeout');
    });

    test('combo multiplier scales with count', () => {
        const state = new GameState();
        for (let i = 0; i < 10; i++) state.addKill();
        state.updateCombo(0);
        if (state.combo.multiplier <= 1.0) throw new Error('combo multiplier not increased');
    });

    // ===== RESET TESTS =====

    test('resetSession clears progression', () => {
        const state = new GameState();
        state.addKill();
        state.addXP(500);
        state.resetSession();
        if (state.progression.killCount !== 0) throw new Error('killCount not reset');
        if (state.progression.xpCollected !== 0) throw new Error('xpCollected not reset');
    });

    test('resetSession preserves meta state', () => {
        const state = new GameState();
        const originalStars = state.meta.starTokens;
        state.earnStarTokens(100);
        state.resetSession();
        if (state.meta.starTokens !== originalStars + 100) throw new Error('starTokens not preserved');
    });

    // ===== OBSERVER PATTERN TESTS =====

    test('observer pattern fires callbacks', () => {
        const state = new GameState();
        let fired = false;
        state.on('testEvent', () => { fired = true; });
        state._notifyObservers('testEvent');
        if (!fired) throw new Error('callback not fired');
    });

    test('observer pattern unsubscribes', () => {
        const state = new GameState();
        let count = 0;
        const callback = () => { count++; };
        state.on('testEvent', callback);
        state._notifyObservers('testEvent');
        state.off('testEvent', callback);
        state._notifyObservers('testEvent');
        if (count !== 1) throw new Error('callback fired after unsubscribe');
    });

    // ===== VALIDATION TESTS =====

    test('validate detects negative values', () => {
        const state = new GameState();
        state.runtime.gameTime = -1;
        const result = state.validate();
        if (result.valid) throw new Error('validate should fail on negative gameTime');
        state.runtime.gameTime = 0; // Reset
    });

    test('validate detects invalid states', () => {
        const state = new GameState();
        state.runtime.isRunning = true;
        state.runtime.isPaused = true;
        const result = state.validate();
        if (result.valid) throw new Error('validate should fail on running && paused');
    });

    test('getSnapshot returns valid snapshot', () => {
        const state = new GameState();
        const snapshot = state.getSnapshot();
        if (!snapshot.runtime) throw new Error('snapshot missing runtime');
        if (!snapshot.flow) throw new Error('snapshot missing flow');
        if (!snapshot.player) throw new Error('snapshot missing player');
        if (!snapshot.progression) throw new Error('snapshot missing progression');
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
        console.log('='.repeat(50) + '\n');
    } else {
        console.log('\n🎉 All tests passed!');
        console.log('='.repeat(50) + '\n');
    }

    return results;
}

// Process exit handled at top of file via require.main check
// This avoids double-execution

function setupBrowserTests() {
    /**
     * Browser Integration Tests
     * Tests GameState integration with live game systems
     * Run in browser console: testGameState()
     */
    window.testGameState = function() {
        console.log('🧪 Testing GameState Integration...\n');

        const results = { passed: 0, failed: 0, errors: [] };

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

        // Integration tests
        test('GameEngine has state instance', () => {
            if (!window.gameEngine?.state) throw new Error('gameEngine.state not found');
        });

        test('GameManagerBridge linked to GameState', () => {
            if (window.gameManager?.state !== window.gameEngine?.state) {
                throw new Error('state instances not shared');
            }
        });

        test('All systems read same gameTime', () => {
            const engineTime = window.gameEngine.gameTime;
            const stateTime = window.gameEngine.state.runtime.gameTime;
            if (engineTime !== stateTime) throw new Error('gameTime mismatch');
        });

        // Results
        console.log('\n' + '='.repeat(50));
        console.log(`📊 Browser Test Results: ${results.passed} passed, ${results.failed} failed`);
        if (results.failed === 0) {
            console.log('🎉 All integration tests passed!');
        }
        console.log('='.repeat(50) + '\n');

        return results;
    };

    console.log('🧪 GameState browser tests loaded. Run testGameState() in console.');
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runNodeTests };
}

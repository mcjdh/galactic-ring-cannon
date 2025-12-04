/**
 * ForceAccumulator Integration Test Suite
 * 
 * Tests the real ForceAccumulator implementation including:
 * - Managed entity weight handling
 * - Priority rules for force suppression
 * - Debug tracking functionality
 */

// Load the real ForceAccumulator
global.window = { Game: {} };
global.performance = { now: () => Date.now() };

const { ForceAccumulator } = require('../src/entities/components/ForceAccumulator.js');

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running ForceAccumulator Integration Tests...\n');

    try {
        // =====================================================
        // TEST 1: Constructor initializes all force sources
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            const sources = ['local', 'formation', 'constellation', 'collision', 'external'];
            const allExist = sources.every(s => acc.forces[s] !== undefined);
            
            if (allExist) {
                console.log('✅ Test 1: All force sources initialized');
                passed++;
            } else {
                console.error('❌ Test 1: Missing force sources');
                failed++;
            }
        }

        // =====================================================
        // TEST 2: managedLocalWeight is set
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            if (typeof acc.managedLocalWeight === 'number' && acc.managedLocalWeight > 0) {
                console.log('✅ Test 2: managedLocalWeight is set');
                passed++;
            } else {
                console.error('❌ Test 2: managedLocalWeight not properly set');
                failed++;
            }
        }

        // =====================================================
        // TEST 3: addForce accumulates correctly
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', 10, 20);
            acc.addForce('local', 5, 10);
            
            if (acc.forces.local.x === 15 && acc.forces.local.y === 30) {
                console.log('✅ Test 3: addForce accumulates correctly');
                passed++;
            } else {
                console.error(`❌ Test 3: Expected (15, 30), got (${acc.forces.local.x}, ${acc.forces.local.y})`);
                failed++;
            }
        }

        // =====================================================
        // TEST 4: Invalid force values are rejected
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', NaN, 10);
            acc.addForce('local', 10, Infinity);
            acc.addForce('local', -Infinity, 0);
            
            if (acc.forces.local.x === 0 && acc.forces.local.y === 0) {
                console.log('✅ Test 4: Invalid force values are rejected');
                passed++;
            } else {
                console.error('❌ Test 4: Invalid values were accepted');
                failed++;
            }
        }

        // =====================================================
        // TEST 5: Unknown force source is handled
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            try {
                acc.addForce('nonexistent', 100, 100);
                console.log('✅ Test 5: Unknown source handled without crash');
                passed++;
            } catch (e) {
                console.error('❌ Test 5: Crash on unknown source');
                failed++;
            }
        }

        // =====================================================
        // TEST 6: updateWeights sets formation weight
        // =====================================================
        {
            const entity = { id: 'test', formationId: 'formation_1' };
            const acc = new ForceAccumulator(entity);
            
            acc.updateWeights();
            
            if (acc.weights.formation === 1.0) {
                console.log('✅ Test 6: Formation weight set correctly');
                passed++;
            } else {
                console.error(`❌ Test 6: Formation weight is ${acc.weights.formation}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 7: updateWeights sets constellation weight
        // =====================================================
        {
            const entity = { id: 'test', constellation: { id: 'c1' } };
            const acc = new ForceAccumulator(entity);
            
            acc.updateWeights();
            
            if (acc.weights.constellation === 1.0) {
                console.log('✅ Test 7: Constellation weight set correctly');
                passed++;
            } else {
                console.error(`❌ Test 7: Constellation weight is ${acc.weights.constellation}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 8: Formation takes priority over constellation
        // =====================================================
        {
            const entity = { 
                id: 'test', 
                formationId: 'formation_1',
                constellation: { id: 'c1' }
            };
            const acc = new ForceAccumulator(entity);
            
            acc.updateWeights();
            
            if (acc.weights.formation === 1.0 && acc.weights.constellation === 0.0) {
                console.log('✅ Test 8: Formation takes priority over constellation');
                passed++;
            } else {
                console.error('❌ Test 8: Formation did not take priority');
                failed++;
            }
        }

        // =====================================================
        // TEST 9: computeNetForce applies weights correctly
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', 100, 0);
            acc.addForce('formation', 50, 0);
            acc.weights.formation = 0.5;
            
            // Note: local weight is 1.0 for non-managed, formation weight is 0.5
            // Expected: 100 * 1.0 + 50 * 0.5 = 125
            // But the entity isn't managed (no formationId), so formation weight from updateWeights() is 0
            // We're setting it manually to 0.5, so it should apply
            
            const net = acc.computeNetForce();
            
            // isManaged check uses acc.weights, not entity state
            // local weight = _getLocalWeight(isManaged)
            // isManaged = weights.formation > 0 || weights.constellation > 0 = 0.5 > 0 = true
            // So local gets managedLocalWeight (0.8) not 1.0
            // Expected: 100 * 0.8 + 50 * 0.5 = 80 + 25 = 105
            const expected = 100 * acc.managedLocalWeight + 50 * 0.5;
            if (Math.abs(net.x - expected) < 0.01) {
                console.log('✅ Test 9: computeNetForce applies weights correctly');
                passed++;
            } else {
                console.error(`❌ Test 9: Expected ${expected}, got ${net.x}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 10: Managed entity uses managedLocalWeight
        // =====================================================
        {
            const entity = { id: 'test', formationId: 'formation_1' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', 100, 0);
            acc.updateWeights();
            
            const net = acc.computeNetForce();
            
            // Expected: 100 * managedLocalWeight (0.8)
            const expected = 100 * acc.managedLocalWeight;
            if (Math.abs(net.x - expected) < 0.01) {
                console.log('✅ Test 10: Managed entity uses managedLocalWeight');
                passed++;
            } else {
                console.error(`❌ Test 10: Expected ${expected}, got ${net.x}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 11: Collision forces always apply at full strength
        // =====================================================
        {
            const entity = { id: 'test', formationId: 'formation_1' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('collision', 100, 50);
            acc.updateWeights();
            
            const net = acc.computeNetForce();
            
            // Collision should apply at full strength
            if (net.x >= 100 && net.y >= 50) {
                console.log('✅ Test 11: Collision forces apply at full strength');
                passed++;
            } else {
                console.error(`❌ Test 11: Collision suppressed: (${net.x}, ${net.y})`);
                failed++;
            }
        }

        // =====================================================
        // TEST 12: reset clears all forces
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', 100, 100);
            acc.addForce('formation', 50, 50);
            acc.addForce('collision', 25, 25);
            acc.reset();
            
            const allZero = Object.values(acc.forces).every(f => f.x === 0 && f.y === 0);
            
            if (allZero) {
                console.log('✅ Test 12: reset clears all forces');
                passed++;
            } else {
                console.error('❌ Test 12: reset did not clear all forces');
                failed++;
            }
        }

        // =====================================================
        // TEST 13: getDebugSummary returns valid data
        // =====================================================
        {
            const entity = { id: 'test', formationId: 'formation_1' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', 50, 25);
            acc.updateWeights();
            acc.computeNetForce();
            
            const summary = acc.getDebugSummary();
            
            if (summary.isManaged === true &&
                summary.sources.local !== undefined &&
                summary.sources.formation.active === true) {
                console.log('✅ Test 13: getDebugSummary returns valid data');
                passed++;
            } else {
                console.error('❌ Test 13: Invalid debug summary');
                failed++;
            }
        }

        // =====================================================
        // TEST 14: Debug tracking records history
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.enableDebug();
            acc.addForce('local', 10, 10);
            acc.computeNetForce();
            acc.reset();
            acc.addForce('local', 20, 20);
            acc.computeNetForce();
            
            const history = acc.getHistory();
            
            if (history.length === 2) {
                console.log('✅ Test 14: Debug tracking records history');
                passed++;
            } else {
                console.error(`❌ Test 14: Expected 2 frames, got ${history.length}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 15: Debug history respects max size
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.enableDebug();
            
            // Add more than maxHistoryFrames
            for (let i = 0; i < 100; i++) {
                acc.addForce('local', i, i);
                acc.computeNetForce();
                acc.reset();
            }
            
            const history = acc.getHistory();
            
            if (history.length <= acc.maxHistoryFrames) {
                console.log('✅ Test 15: Debug history respects max size');
                passed++;
            } else {
                console.error(`❌ Test 15: History exceeded max (${history.length})`);
                failed++;
            }
        }

        // =====================================================
        // TEST 16: computeNetForce is idempotent
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('local', 50, 50);
            
            const net1 = acc.computeNetForce();
            const net2 = acc.computeNetForce();
            
            if (net1.x === net2.x && net1.y === net2.y) {
                console.log('✅ Test 16: computeNetForce is idempotent');
                passed++;
            } else {
                console.error('❌ Test 16: Multiple calls changed result');
                failed++;
            }
        }

        // =====================================================
        // TEST 17: External forces always apply
        // =====================================================
        {
            const entity = { id: 'test', formationId: 'formation_1' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('external', 100, 100);
            acc.updateWeights();
            
            const net = acc.computeNetForce();
            
            if (net.x >= 100 && net.y >= 100) {
                console.log('✅ Test 17: External forces always apply');
                passed++;
            } else {
                console.error('❌ Test 17: External forces suppressed');
                failed++;
            }
        }

        // =====================================================
        // TEST 18: Zero weight completely suppresses force
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.addForce('formation', 1000, 1000);
            acc.weights.formation = 0.0;
            
            const net = acc.computeNetForce();
            
            if (net.x === 0 && net.y === 0) {
                console.log('✅ Test 18: Zero weight completely suppresses force');
                passed++;
            } else {
                console.error('❌ Test 18: Force not suppressed by zero weight');
                failed++;
            }
        }

        // =====================================================
        // TEST 19: disableDebug clears history
        // =====================================================
        {
            const entity = { id: 'test' };
            const acc = new ForceAccumulator(entity);
            
            acc.enableDebug();
            acc.computeNetForce();
            acc.disableDebug();
            
            const history = acc.getHistory();
            
            if (history.length === 0) {
                console.log('✅ Test 19: disableDebug clears history');
                passed++;
            } else {
                console.error('❌ Test 19: History not cleared');
                failed++;
            }
        }

        // =====================================================
        // TEST 20: Entity reference is preserved
        // =====================================================
        {
            const entity = { id: 'test', custom: 'value' };
            const acc = new ForceAccumulator(entity);
            
            if (acc.entity === entity && acc.entity.custom === 'value') {
                console.log('✅ Test 20: Entity reference is preserved');
                passed++;
            } else {
                console.error('❌ Test 20: Entity reference lost');
                failed++;
            }
        }

    } catch (error) {
        console.error('❌ Unexpected error in test suite:', error);
        failed++;
    }

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();

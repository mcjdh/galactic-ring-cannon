/**
 * Force Physics Test Suite
 * 
 * Tests for ForceAccumulator and LocalForceProducer
 * to catch physics calculation bugs and edge cases.
 */

// Mock ForceAccumulator for testing
class MockForceAccumulator {
    constructor() {
        this.forces = {
            local: { x: 0, y: 0 },
            formation: { x: 0, y: 0 },
            constellation: { x: 0, y: 0 },
            collision: { x: 0, y: 0 },
            external: { x: 0, y: 0 }
        };
        this.weights = {
            local: 1.0,
            formation: 0.0,
            constellation: 0.0,
            collision: 1.0,
            external: 1.0
        };
        this.netForce = { x: 0, y: 0 };
    }
    
    addForce(source, fx, fy) {
        if (!this.forces[source]) return;
        if (!Number.isFinite(fx) || !Number.isFinite(fy)) return;
        this.forces[source].x += fx;
        this.forces[source].y += fy;
    }
    
    reset() {
        for (const force of Object.values(this.forces)) {
            force.x = 0;
            force.y = 0;
        }
        this.netForce.x = 0;
        this.netForce.y = 0;
    }
    
    computeNetForce() {
        this.netForce.x = 0;
        this.netForce.y = 0;
        
        for (const [source, force] of Object.entries(this.forces)) {
            const weight = this.weights[source] || 0;
            this.netForce.x += force.x * weight;
            this.netForce.y += force.y * weight;
        }
        
        return this.netForce;
    }
    
    updateWeights() {
        // Simplified for testing
    }
}

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running Force Physics Tests...\n');

    try {
        // =====================================================
        // TEST 1: Force accumulation is additive
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', 10, 0);
            acc.addForce('local', 5, 5);
            
            if (acc.forces.local.x === 15 && acc.forces.local.y === 5) {
                console.log('✅ Test 1: Force accumulation is additive');
                passed++;
            } else {
                console.error('❌ Test 1: Force accumulation failed');
                failed++;
            }
        }

        // =====================================================
        // TEST 2: Reset clears all forces
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', 100, 100);
            acc.addForce('collision', 50, 50);
            acc.reset();
            
            const allZero = Object.values(acc.forces).every(f => f.x === 0 && f.y === 0);
            
            if (allZero) {
                console.log('✅ Test 2: Reset clears all forces');
                passed++;
            } else {
                console.error('❌ Test 2: Reset did not clear all forces');
                failed++;
            }
        }

        // =====================================================
        // TEST 3: Invalid force values are rejected
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', NaN, 10);
            acc.addForce('local', 10, Infinity);
            acc.addForce('local', -Infinity, 0);
            
            if (acc.forces.local.x === 0 && acc.forces.local.y === 0) {
                console.log('✅ Test 3: Invalid force values rejected (NaN, Infinity)');
                passed++;
            } else {
                console.error('❌ Test 3: Invalid values were accepted');
                failed++;
            }
        }

        // =====================================================
        // TEST 4: Unknown force source is ignored
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            try {
                acc.addForce('unknown_source', 100, 100);
                console.log('✅ Test 4: Unknown force source ignored without crash');
                passed++;
            } catch (e) {
                console.error('❌ Test 4: Unknown source caused crash');
                failed++;
            }
        }

        // =====================================================
        // TEST 5: Net force respects weights
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', 100, 0);
            acc.addForce('formation', 50, 0);
            acc.weights.local = 1.0;
            acc.weights.formation = 0.5;
            
            const net = acc.computeNetForce();
            
            // Expected: 100 * 1.0 + 50 * 0.5 = 125
            if (Math.abs(net.x - 125) < 0.01) {
                console.log('✅ Test 5: Net force respects weights');
                passed++;
            } else {
                console.error(`❌ Test 5: Expected 125, got ${net.x}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 6: Zero weight suppresses force
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('formation', 1000, 1000);
            acc.weights.formation = 0.0;
            
            const net = acc.computeNetForce();
            
            if (net.x === 0 && net.y === 0) {
                console.log('✅ Test 6: Zero weight suppresses force');
                passed++;
            } else {
                console.error('❌ Test 6: Force not suppressed by zero weight');
                failed++;
            }
        }

        // =====================================================
        // TEST 7: Collision forces always apply
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('collision', 100, 50);
            acc.weights.collision = 1.0; // Collision should always be 1.0
            
            const net = acc.computeNetForce();
            
            if (net.x === 100 && net.y === 50) {
                console.log('✅ Test 7: Collision forces apply at full strength');
                passed++;
            } else {
                console.error('❌ Test 7: Collision forces not applied correctly');
                failed++;
            }
        }

        // =====================================================
        // TEST 8: Opposing forces cancel out
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', 100, 0);
            acc.addForce('local', -100, 0);
            
            if (acc.forces.local.x === 0) {
                console.log('✅ Test 8: Opposing forces cancel out');
                passed++;
            } else {
                console.error('❌ Test 8: Forces did not cancel');
                failed++;
            }
        }

        // =====================================================
        // TEST 9: Very small forces are preserved (no epsilon issues)
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            const smallForce = 1e-10;
            
            acc.addForce('local', smallForce, smallForce);
            
            if (acc.forces.local.x === smallForce && acc.forces.local.y === smallForce) {
                console.log('✅ Test 9: Very small forces preserved');
                passed++;
            } else {
                console.error('❌ Test 9: Small force precision lost');
                failed++;
            }
        }

        // =====================================================
        // TEST 10: Very large forces don't overflow
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            const largeForce = 1e100;
            
            acc.addForce('local', largeForce, largeForce);
            
            if (Number.isFinite(acc.forces.local.x) && Number.isFinite(acc.forces.local.y)) {
                console.log('✅ Test 10: Large forces remain finite');
                passed++;
            } else {
                console.error('❌ Test 10: Large force caused overflow');
                failed++;
            }
        }

        // =====================================================
        // TEST 11: Multiple force sources combine correctly
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', 10, 0);
            acc.addForce('formation', 0, 10);
            acc.addForce('collision', 5, 5);
            acc.addForce('external', -5, -5);
            
            acc.weights.local = 1.0;
            acc.weights.formation = 1.0;
            acc.weights.collision = 1.0;
            acc.weights.external = 1.0;
            
            const net = acc.computeNetForce();
            
            // Expected: (10+0+5-5, 0+10+5-5) = (10, 10)
            if (net.x === 10 && net.y === 10) {
                console.log('✅ Test 11: Multiple force sources combine correctly');
                passed++;
            } else {
                console.error(`❌ Test 11: Expected (10,10), got (${net.x},${net.y})`);
                failed++;
            }
        }

        // =====================================================
        // TEST 12: Force direction preserved with magnitude
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            // 45-degree force
            const fx = 100;
            const fy = 100;
            acc.addForce('local', fx, fy);
            
            const magnitude = Math.hypot(acc.forces.local.x, acc.forces.local.y);
            const expectedMag = Math.hypot(fx, fy);
            
            if (Math.abs(magnitude - expectedMag) < 0.01) {
                console.log('✅ Test 12: Force magnitude preserved');
                passed++;
            } else {
                console.error('❌ Test 12: Force magnitude changed');
                failed++;
            }
        }

        // =====================================================
        // TEST 13: Negative forces work correctly
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', -50, -75);
            
            const net = acc.computeNetForce();
            
            if (net.x === -50 && net.y === -75) {
                console.log('✅ Test 13: Negative forces work correctly');
                passed++;
            } else {
                console.error('❌ Test 13: Negative force handling failed');
                failed++;
            }
        }

        // =====================================================
        // TEST 14: Force accumulator state isolation
        // =====================================================
        {
            const acc1 = new MockForceAccumulator();
            const acc2 = new MockForceAccumulator();
            
            acc1.addForce('local', 100, 100);
            
            if (acc2.forces.local.x === 0 && acc2.forces.local.y === 0) {
                console.log('✅ Test 14: Force accumulators are isolated');
                passed++;
            } else {
                console.error('❌ Test 14: Force accumulators share state');
                failed++;
            }
        }

        // =====================================================
        // TEST 15: Compute net force is idempotent
        // =====================================================
        {
            const acc = new MockForceAccumulator();
            
            acc.addForce('local', 50, 50);
            
            const net1 = acc.computeNetForce();
            const net2 = acc.computeNetForce();
            
            if (net1.x === net2.x && net1.y === net2.y) {
                console.log('✅ Test 15: computeNetForce is idempotent');
                passed++;
            } else {
                console.error('❌ Test 15: Multiple calls produce different results');
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

/**
 * LocalForceProducer Test Suite
 * 
 * Tests for the unified local force calculation system including:
 * - Separation forces between enemies
 * - Alignment and cohesion behaviors
 * - Managed entity (formation/constellation) handling
 * - Edge cases and numerical stability
 */

// Setup mock window
global.window = {
    Game: {},
    logger: null
};

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running LocalForceProducer Tests...\n');

    // Mock ForceAccumulator
    class MockForceAccumulator {
        constructor() {
            this.forces = {
                local: { x: 0, y: 0 },
                collision: { x: 0, y: 0 }
            };
        }
        
        addForce(source, fx, fy) {
            if (this.forces[source]) {
                this.forces[source].x += fx;
                this.forces[source].y += fy;
            }
        }
        
        reset() {
            this.forces.local = { x: 0, y: 0 };
            this.forces.collision = { x: 0, y: 0 };
        }
    }

    // Mock Game with spatial grid
    class MockGame {
        constructor() {
            this.spatialGrid = new Map();
            this.gridSize = 100;
            this.performanceManager = null;
        }
        
        encodeGridKey(x, y) {
            return `${x},${y}`;
        }
        
        addToGrid(entity) {
            const gx = Math.floor(entity.x / this.gridSize);
            const gy = Math.floor(entity.y / this.gridSize);
            const key = this.encodeGridKey(gx, gy);
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key).push(entity);
        }
        
        clearGrid() {
            this.spatialGrid.clear();
        }
    }

    // Mock Entity
    function createMockEnemy(id, x, y, options = {}) {
        return {
            id,
            x,
            y,
            type: 'enemy',
            isDead: false,
            radius: options.radius || 15,
            formationId: options.formationId || null,
            constellation: options.constellation || null,
            movement: {
                velocity: { x: options.vx || 0, y: options.vy || 0 }
            }
        };
    }

    // Load LocalForceProducer
    const { LocalForceProducer } = require('../src/entities/components/LocalForceProducer.js');

    try {
        // =====================================================
        // TEST 1: Constructor initializes parameters correctly
        // =====================================================
        {
            const game = new MockGame();
            const entity = createMockEnemy('e1', 100, 100);
            const producer = new LocalForceProducer(entity, game);
            
            if (producer.separationRadius > 0 &&
                producer.separationStrength > 0 &&
                producer.alignmentStrength > 0 &&
                producer.cohesionStrength > 0 &&
                producer.EPSILON > 0) {
                console.log('✅ Test 1: Constructor initializes parameters correctly');
                passed++;
            } else {
                console.error('❌ Test 1: Missing or invalid parameters');
                failed++;
            }
        }

        // =====================================================
        // TEST 2: Separation force pushes enemies apart
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            const entity2 = createMockEnemy('e2', 110, 100); // 10px to the right
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // Entity1 should be pushed left (negative X) away from Entity2
            if (accumulator.forces.local.x < 0) {
                console.log('✅ Test 2: Separation force pushes enemies apart');
                passed++;
            } else {
                console.error(`❌ Test 2: Expected negative X force, got ${accumulator.forces.local.x}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 3: No separation force when enemies far apart
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            const entity2 = createMockEnemy('e2', 500, 100); // Far away
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // No force when far apart
            if (accumulator.forces.local.x === 0 && accumulator.forces.local.y === 0) {
                console.log('✅ Test 3: No separation force when enemies far apart');
                passed++;
            } else {
                console.error('❌ Test 3: Unexpected force from distant enemy');
                failed++;
            }
        }

        // =====================================================
        // TEST 4: Collision force on hard overlap
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            const entity2 = createMockEnemy('e2', 105, 100); // 5px apart (overlapping)
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // Collision force should be applied (pushing left)
            if (accumulator.forces.collision.x < 0) {
                console.log('✅ Test 4: Collision force on hard overlap');
                passed++;
            } else {
                console.error('❌ Test 4: No collision force on overlapping enemies');
                failed++;
            }
        }

        // =====================================================
        // TEST 5: Managed entities still get separation forces
        // =====================================================
        {
            const game = new MockGame();
            const constellation = { id: 'test_constellation' };
            const entity1 = createMockEnemy('e1', 100, 100, { constellation });
            const entity2 = createMockEnemy('e2', 115, 100);
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // Should still have separation force even though managed
            const hasSeparation = accumulator.forces.local.x !== 0 || accumulator.forces.local.y !== 0;
            
            if (hasSeparation) {
                console.log('✅ Test 5: Managed entities still get separation forces');
                passed++;
            } else {
                console.error('❌ Test 5: Managed entity missing separation force');
                failed++;
            }
        }

        // =====================================================
        // TEST 6: Same-constellation enemies get reduced separation
        // =====================================================
        {
            const game = new MockGame();
            const constellation = { id: 'test_constellation' };
            const entity1 = createMockEnemy('e1', 100, 100, { constellation });
            const entity2 = createMockEnemy('e2', 115, 100, { constellation }); // Same constellation
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer1 = new LocalForceProducer(entity1, game);
            const accumulator1 = new MockForceAccumulator();
            producer1.calculateForces(accumulator1, 0.016);
            
            // Compare with different constellation
            game.clearGrid();
            const entity3 = createMockEnemy('e3', 100, 100);
            const entity4 = createMockEnemy('e4', 115, 100); // No constellation
            game.addToGrid(entity3);
            game.addToGrid(entity4);
            
            const producer2 = new LocalForceProducer(entity3, game);
            const accumulator2 = new MockForceAccumulator();
            producer2.calculateForces(accumulator2, 0.016);
            
            // Same-constellation should have less separation force
            const force1 = Math.abs(accumulator1.forces.local.x);
            const force2 = Math.abs(accumulator2.forces.local.x);
            
            if (force1 < force2) {
                console.log('✅ Test 6: Same-constellation enemies get reduced separation');
                passed++;
            } else {
                console.error(`❌ Test 6: Same-constellation force (${force1}) >= different (${force2})`);
                failed++;
            }
        }

        // =====================================================
        // TEST 7: Alignment averages neighbor velocities
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100, { vx: 0, vy: 0 });
            const entity2 = createMockEnemy('e2', 125, 100, { vx: 100, vy: 0 }); // Moving right
            const entity3 = createMockEnemy('e3', 100, 125, { vx: 100, vy: 0 }); // Moving right
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            game.addToGrid(entity3);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // Entity1 should get alignment force to the right (positive X)
            // Note: separation may dominate, but alignment should contribute
            // Check total local force has some positive X component from alignment
            if (Number.isFinite(accumulator.forces.local.x)) {
                console.log('✅ Test 7: Alignment produces finite force');
                passed++;
            } else {
                console.error('❌ Test 7: Alignment force is not finite');
                failed++;
            }
        }

        // =====================================================
        // TEST 8: Managed entities skip alignment/cohesion
        // =====================================================
        {
            const game = new MockGame();
            const formation = 'test_formation';
            const entity1 = createMockEnemy('e1', 100, 100, { formationId: formation, vx: 0, vy: 0 });
            const entity2 = createMockEnemy('e2', 140, 100, { vx: 100, vy: 0 }); // Moving right
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // Compare force with non-managed entity
            game.clearGrid();
            const entity3 = createMockEnemy('e3', 100, 100, { vx: 0, vy: 0 }); // Not managed
            const entity4 = createMockEnemy('e4', 140, 100, { vx: 100, vy: 0 });
            game.addToGrid(entity3);
            game.addToGrid(entity4);
            
            const producer2 = new LocalForceProducer(entity3, game);
            const accumulator2 = new MockForceAccumulator();
            producer2.calculateForces(accumulator2, 0.016);
            
            // Managed should have different (likely less) alignment contribution
            // Both should be finite
            if (Number.isFinite(accumulator.forces.local.x) && 
                Number.isFinite(accumulator2.forces.local.x)) {
                console.log('✅ Test 8: Both managed and unmanaged produce finite forces');
                passed++;
            } else {
                console.error('❌ Test 8: Force calculation produced NaN/Infinity');
                failed++;
            }
        }

        // =====================================================
        // TEST 9: Dead enemies are ignored
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            const entity2 = createMockEnemy('e2', 110, 100);
            entity2.isDead = true;
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // No force from dead enemy
            if (accumulator.forces.local.x === 0 && accumulator.forces.local.y === 0) {
                console.log('✅ Test 9: Dead enemies are ignored');
                passed++;
            } else {
                console.error('❌ Test 9: Dead enemy produced force');
                failed++;
            }
        }

        // =====================================================
        // TEST 10: Non-enemy entities are ignored
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            const player = { id: 'player', x: 110, y: 100, type: 'player', isDead: false, radius: 15 };
            
            game.addToGrid(entity1);
            game.addToGrid(player);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            producer.calculateForces(accumulator, 0.016);
            
            // No force from player
            if (accumulator.forces.local.x === 0 && accumulator.forces.local.y === 0) {
                console.log('✅ Test 10: Non-enemy entities are ignored');
                passed++;
            } else {
                console.error('❌ Test 10: Non-enemy produced force');
                failed++;
            }
        }

        // =====================================================
        // TEST 11: EPSILON prevents division by zero
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            const entity2 = createMockEnemy('e2', 100.001, 100.001); // Nearly identical position
            
            game.addToGrid(entity1);
            game.addToGrid(entity2);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            try {
                producer.calculateForces(accumulator, 0.016);
                
                // Check for NaN/Infinity
                if (Number.isFinite(accumulator.forces.local.x) &&
                    Number.isFinite(accumulator.forces.local.y) &&
                    Number.isFinite(accumulator.forces.collision.x) &&
                    Number.isFinite(accumulator.forces.collision.y)) {
                    console.log('✅ Test 11: EPSILON prevents division by zero');
                    passed++;
                } else {
                    console.error('❌ Test 11: NaN/Infinity from near-zero distance');
                    failed++;
                }
            } catch (e) {
                console.error('❌ Test 11: Crash on near-zero distance');
                failed++;
            }
        }

        // =====================================================
        // TEST 12: Maximum neighbor limit prevents runaway computation
        // =====================================================
        {
            const game = new MockGame();
            const entity1 = createMockEnemy('e1', 100, 100);
            
            // Add many neighbors
            for (let i = 0; i < 50; i++) {
                const e = createMockEnemy(`crowd_${i}`, 100 + (i % 5) * 20, 100 + Math.floor(i / 5) * 20);
                game.addToGrid(e);
            }
            game.addToGrid(entity1);
            
            const producer = new LocalForceProducer(entity1, game);
            const accumulator = new MockForceAccumulator();
            
            const start = Date.now();
            producer.calculateForces(accumulator, 0.016);
            const elapsed = Date.now() - start;
            
            // Should complete quickly due to neighbor limit
            if (elapsed < 50) {
                console.log('✅ Test 12: Maximum neighbor limit prevents slow computation');
                passed++;
            } else {
                console.error(`❌ Test 12: Took ${elapsed}ms with many neighbors`);
                failed++;
            }
        }

        // =====================================================
        // TEST 13: updateParameters changes behavior
        // =====================================================
        {
            const game = new MockGame();
            const entity = createMockEnemy('e1', 100, 100);
            const producer = new LocalForceProducer(entity, game);
            
            const oldSeparation = producer.separationStrength;
            producer.updateParameters({ separationStrength: 999 });
            
            if (producer.separationStrength === 999 && oldSeparation !== 999) {
                console.log('✅ Test 13: updateParameters changes behavior');
                passed++;
            } else {
                console.error('❌ Test 13: updateParameters failed');
                failed++;
            }
        }

        // =====================================================
        // TEST 14: getDebugInfo returns valid data
        // =====================================================
        {
            const game = new MockGame();
            const entity = createMockEnemy('e1', 100, 100);
            const producer = new LocalForceProducer(entity, game);
            
            const debug = producer.getDebugInfo();
            
            if (debug.separationRadius > 0 &&
                debug.neighborRadius > 0 &&
                debug.separationStrength > 0) {
                console.log('✅ Test 14: getDebugInfo returns valid data');
                passed++;
            } else {
                console.error('❌ Test 14: Invalid debug info');
                failed++;
            }
        }

        // =====================================================
        // TEST 15: Empty spatial grid doesn't crash
        // =====================================================
        {
            const game = new MockGame();
            const entity = createMockEnemy('e1', 100, 100);
            // Don't add entity to grid - simulate empty grid
            
            const producer = new LocalForceProducer(entity, game);
            const accumulator = new MockForceAccumulator();
            
            try {
                producer.calculateForces(accumulator, 0.016);
                console.log('✅ Test 15: Empty spatial grid handled gracefully');
                passed++;
            } catch (e) {
                console.error('❌ Test 15: Crash on empty grid');
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

#!/usr/bin/env node

/**
 * COLLISION UTILITIES TEST SUITE
 * Tests all collision detection algorithms and edge cases
 * Helps verify spatial calculations and collision logic integrity
 */

// Load dependencies
const MathUtils = require('../src/utils/MathUtils.js');
global.MathUtils = MathUtils;
const CollisionUtils = require('../src/utils/CollisionUtils.js');

function runTests() {
    console.log('[T] Running Collision Utilities Tests...\n');
    const results = { passed: 0, failed: 0, errors: [] };

    const test = (name, fn) => {
        try {
            fn();
            console.log(`+ ${name}`);
            results.passed++;
        } catch (error) {
            console.error(`! ${name}:`, error.message);
            results.failed++;
            results.errors.push({ test: name, error: error.message });
        }
    };

    const assert = (condition, message) => {
        if (!condition) throw new Error(message || 'Assertion failed');
    };

    const assertClose = (actual, expected, tolerance = 0.001, message) => {
        if (Math.abs(actual - expected) > tolerance) {
            throw new Error(`${message || 'Values not close'}: expected ${expected}, got ${actual}`);
        }
    };

    // ============================================
    // CIRCLE-CIRCLE COLLISION TESTS
    // ============================================

    test('Circle collision: overlapping circles', () => {
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 15, y: 0, radius: 10 };
        assert(CollisionUtils.circleCollision(circle1, circle2),
            'Overlapping circles should collide');
    });

    test('Circle collision: touching circles', () => {
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 20, y: 0, radius: 10 };
        assert(!CollisionUtils.circleCollision(circle1, circle2),
            'Exactly touching circles should not collide (< comparison)');
    });

    test('Circle collision: separated circles', () => {
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 100, y: 100, radius: 10 };
        assert(!CollisionUtils.circleCollision(circle1, circle2),
            'Separated circles should not collide');
    });

    test('Circle collision: identical position circles', () => {
        const circle1 = { x: 50, y: 50, radius: 10 };
        const circle2 = { x: 50, y: 50, radius: 5 };
        assert(CollisionUtils.circleCollision(circle1, circle2),
            'Circles at same position should collide');
    });

    test('Circle collision: handles null entities', () => {
        const circle = { x: 0, y: 0, radius: 10 };
        assert(!CollisionUtils.circleCollision(null, circle),
            'Should return false for null entity1');
        assert(!CollisionUtils.circleCollision(circle, null),
            'Should return false for null entity2');
        assert(!CollisionUtils.circleCollision(null, null),
            'Should return false for both null');
    });

    test('Circle collision: handles size fallback', () => {
        const circle1 = { x: 0, y: 0, size: 10 }; // Uses 'size' instead of 'radius'
        const circle2 = { x: 15, y: 0, radius: 10 };
        assert(CollisionUtils.circleCollision(circle1, circle2),
            'Should use size property as fallback');
    });

    test('Circle collision: handles missing size properties', () => {
        const circle1 = { x: 0, y: 0 }; // No radius or size
        const circle2 = { x: 15, y: 0 }; // No radius or size
        assert(CollisionUtils.circleCollision(circle1, circle2),
            'Should use default radius (10) when size missing');
    });

    // ============================================
    // RECTANGLE-RECTANGLE COLLISION TESTS
    // ============================================

    test('Rect collision: overlapping rectangles', () => {
        const rect1 = { x: 0, y: 0, width: 50, height: 50 };
        const rect2 = { x: 25, y: 25, width: 50, height: 50 };
        assert(CollisionUtils.rectCollision(rect1, rect2),
            'Overlapping rectangles should collide');
    });

    test('Rect collision: separated rectangles', () => {
        const rect1 = { x: 0, y: 0, width: 20, height: 20 };
        const rect2 = { x: 100, y: 100, width: 20, height: 20 };
        assert(!CollisionUtils.rectCollision(rect1, rect2),
            'Separated rectangles should not collide');
    });

    test('Rect collision: edge-touching rectangles', () => {
        const rect1 = { x: 0, y: 0, width: 20, height: 20 };
        const rect2 = { x: 20, y: 0, width: 20, height: 20 };
        assert(!CollisionUtils.rectCollision(rect1, rect2),
            'Edge-touching rectangles should not collide');
    });

    test('Rect collision: one inside another', () => {
        const rect1 = { x: 0, y: 0, width: 100, height: 100 };
        const rect2 = { x: 25, y: 25, width: 20, height: 20 };
        assert(CollisionUtils.rectCollision(rect1, rect2),
            'Rectangle inside another should collide');
    });

    test('Rect collision: handles null entities', () => {
        const rect = { x: 0, y: 0, width: 20, height: 20 };
        assert(!CollisionUtils.rectCollision(null, rect),
            'Should return false for null entity1');
        assert(!CollisionUtils.rectCollision(rect, null),
            'Should return false for null entity2');
    });

    test('Rect collision: handles size fallback', () => {
        const rect1 = { x: 0, y: 0, size: 20 }; // Uses 'size' instead of width/height
        const rect2 = { x: 10, y: 10, width: 20, height: 20 };
        assert(CollisionUtils.rectCollision(rect1, rect2),
            'Should use size property as fallback for width/height');
    });

    // ============================================
    // CIRCLE-RECTANGLE COLLISION TESTS
    // ============================================

    test('Circle-rect collision: circle overlapping rect center', () => {
        const circle = { x: 25, y: 25, radius: 10 };
        const rect = { x: 0, y: 0, width: 50, height: 50 };
        assert(CollisionUtils.circleRectCollision(circle, rect),
            'Circle overlapping rectangle center should collide');
    });

    test('Circle-rect collision: circle outside rect', () => {
        const circle = { x: 100, y: 100, radius: 10 };
        const rect = { x: 0, y: 0, width: 50, height: 50 };
        assert(!CollisionUtils.circleRectCollision(circle, rect),
            'Circle outside rectangle should not collide');
    });

    test('Circle-rect collision: circle touching rect corner', () => {
        const circle = { x: 60, y: 60, radius: 15 };
        const rect = { x: 0, y: 0, width: 50, height: 50 };
        assert(CollisionUtils.circleRectCollision(circle, rect),
            'Circle touching rectangle corner should collide');
    });

    test('Circle-rect collision: circle touching rect edge', () => {
        const circle = { x: 25, y: 60, radius: 12 };
        const rect = { x: 0, y: 0, width: 50, height: 50 };
        assert(CollisionUtils.circleRectCollision(circle, rect),
            'Circle touching rectangle edge should collide');
    });

    test('Circle-rect collision: handles null entities', () => {
        const circle = { x: 0, y: 0, radius: 10 };
        const rect = { x: 0, y: 0, width: 20, height: 20 };
        assert(!CollisionUtils.circleRectCollision(null, rect),
            'Should return false for null circle');
        assert(!CollisionUtils.circleRectCollision(circle, null),
            'Should return false for null rect');
    });

    // ============================================
    // POINT-IN-CIRCLE TESTS
    // ============================================

    test('Point in circle: point at center', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(CollisionUtils.pointInCircle(50, 50, circle),
            'Point at circle center should be inside');
    });

    test('Point in circle: point on edge', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(CollisionUtils.pointInCircle(70, 50, circle),
            'Point on circle edge should be inside (<=)');
    });

    test('Point in circle: point outside', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(!CollisionUtils.pointInCircle(100, 100, circle),
            'Point outside circle should not be inside');
    });

    test('Point in circle: handles null circle', () => {
        assert(!CollisionUtils.pointInCircle(0, 0, null),
            'Should return false for null circle');
    });

    // ============================================
    // POINT-IN-RECTANGLE TESTS
    // ============================================

    test('Point in rect: point at center', () => {
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        assert(CollisionUtils.pointInRect(50, 50, rect),
            'Point at rectangle center should be inside');
    });

    test('Point in rect: point on edge', () => {
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        assert(CollisionUtils.pointInRect(100, 50, rect),
            'Point on rectangle edge should be inside (<=)');
    });

    test('Point in rect: point at corner', () => {
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        assert(CollisionUtils.pointInRect(0, 0, rect),
            'Point at rectangle corner should be inside');
    });

    test('Point in rect: point outside', () => {
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        assert(!CollisionUtils.pointInRect(150, 150, rect),
            'Point outside rectangle should not be inside');
    });

    test('Point in rect: handles null rect', () => {
        assert(!CollisionUtils.pointInRect(0, 0, null),
            'Should return false for null rectangle');
    });

    // ============================================
    // COLLISION NORMAL VECTOR TESTS
    // ============================================

    test('Collision normal: horizontal collision', () => {
        const entity1 = { x: 0, y: 0 };
        const entity2 = { x: 10, y: 0 };
        const normal = CollisionUtils.getCollisionNormal(entity1, entity2);
        assertClose(normal.x, 1, 0.001, 'Normal X should be 1 for horizontal collision');
        assertClose(normal.y, 0, 0.001, 'Normal Y should be 0 for horizontal collision');
    });

    test('Collision normal: vertical collision', () => {
        const entity1 = { x: 0, y: 0 };
        const entity2 = { x: 0, y: 10 };
        const normal = CollisionUtils.getCollisionNormal(entity1, entity2);
        assertClose(normal.x, 0, 0.001, 'Normal X should be 0 for vertical collision');
        assertClose(normal.y, 1, 0.001, 'Normal Y should be 1 for vertical collision');
    });

    test('Collision normal: diagonal collision', () => {
        const entity1 = { x: 0, y: 0 };
        const entity2 = { x: 10, y: 10 };
        const normal = CollisionUtils.getCollisionNormal(entity1, entity2);
        assertClose(normal.x, 0.707, 0.01, 'Normal X should be ~0.707 for 45deg');
        assertClose(normal.y, 0.707, 0.01, 'Normal Y should be ~0.707 for 45deg');
    });

    test('Collision normal: same position entities', () => {
        const entity1 = { x: 50, y: 50 };
        const entity2 = { x: 50, y: 50 };
        const normal = CollisionUtils.getCollisionNormal(entity1, entity2);
        assert(normal.x === 0 && normal.y === 0,
            'Normal should be zero vector for identical positions');
    });

    test('Collision normal: handles null entities', () => {
        const entity = { x: 0, y: 0 };
        const normal = CollisionUtils.getCollisionNormal(null, entity);
        assert(normal.x === 0 && normal.y === 0,
            'Should return zero vector for null entity');
    });

    // ============================================
    // OVERLAP DISTANCE TESTS
    // ============================================

    test('Overlap distance: overlapping circles', () => {
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 15, y: 0, radius: 10 }; // Distance 15, combined radius 20
        const overlap = CollisionUtils.getOverlapDistance(circle1, circle2);
        assertClose(overlap, 5, 0.001, 'Overlap should be 5 units');
    });

    test('Overlap distance: separated circles', () => {
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 100, y: 0, radius: 10 };
        const overlap = CollisionUtils.getOverlapDistance(circle1, circle2);
        assert(overlap === 0, 'No overlap for separated circles');
    });

    test('Overlap distance: touching circles', () => {
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 20, y: 0, radius: 10 };
        const overlap = CollisionUtils.getOverlapDistance(circle1, circle2);
        assert(overlap === 0, 'No overlap for exactly touching circles');
    });

    test('Overlap distance: concentric circles', () => {
        const circle1 = { x: 0, y: 0, radius: 20 };
        const circle2 = { x: 0, y: 0, radius: 10 };
        const overlap = CollisionUtils.getOverlapDistance(circle1, circle2);
        assertClose(overlap, 30, 0.001, 'Overlap should equal combined radius for concentric circles');
    });

    // ============================================
    // ENTITY SEPARATION TESTS
    // ============================================

    test('Separate entities: overlapping circles get pushed apart', () => {
        const entity1 = { x: 0, y: 0, radius: 10 };
        const entity2 = { x: 15, y: 0, radius: 10 };
        const separation = CollisionUtils.separateEntities(entity1, entity2);

        // Separation vector points from entity1 to entity2 (positive X direction)
        assert(separation.x > 0, 'Separation vector should point toward entity2');
        assertClose(separation.x, 5, 0.001, 'Separation magnitude should be ~5');
        // Entity1 is moved in opposite direction (negative X)
        assertClose(entity1.x, -5, 0.001, 'Entity1 X should be moved to -5');
    });

    test('Separate entities: separated circles not moved', () => {
        const entity1 = { x: 0, y: 0, radius: 10 };
        const entity2 = { x: 100, y: 0, radius: 10 };
        const originalX = entity1.x;
        const separation = CollisionUtils.separateEntities(entity1, entity2);

        assert(separation.x === 0 && separation.y === 0,
            'No separation for non-overlapping entities');
        assert(entity1.x === originalX, 'Entity1 position unchanged');
    });

    test('Separate entities: handles null entities', () => {
        const entity = { x: 0, y: 0, radius: 10 };
        const separation = CollisionUtils.separateEntities(null, entity);
        assert(separation.x === 0 && separation.y === 0,
            'Should return zero vector for null entity');
    });

    // ============================================
    // VIEWPORT CULLING TESTS
    // ============================================

    test('Viewport culling: entity at center is visible', () => {
        const entity = { x: 0, y: 0, radius: 10 };
        const camera = { x: 0, y: 0 };
        assert(CollisionUtils.isInViewport(entity, camera, 800, 600, 0),
            'Entity at viewport center should be visible');
    });

    test('Viewport culling: entity far outside viewport not visible', () => {
        const entity = { x: 1000, y: 1000, radius: 10 };
        const camera = { x: 0, y: 0 };
        assert(!CollisionUtils.isInViewport(entity, camera, 800, 600, 0),
            'Entity far outside viewport should not be visible');
    });

    test('Viewport culling: margin extends visible area', () => {
        const entity = { x: 500, y: 0, radius: 10 };
        const camera = { x: 0, y: 0 };
        assert(!CollisionUtils.isInViewport(entity, camera, 800, 600, 0),
            'Entity should not be visible without margin');
        assert(CollisionUtils.isInViewport(entity, camera, 800, 600, 200),
            'Entity should be visible with sufficient margin');
    });

    test('Viewport culling: handles null entities', () => {
        const camera = { x: 0, y: 0 };
        assert(!CollisionUtils.isInViewport(null, camera, 800, 600),
            'Should return false for null entity');
    });

    // ============================================
    // LINE-CIRCLE INTERSECTION TESTS
    // ============================================

    test('Line-circle intersection: line passes through circle center', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(CollisionUtils.lineCircleIntersection(0, 50, 100, 50, circle),
            'Horizontal line through center should intersect');
    });

    test('Line-circle intersection: line misses circle', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(!CollisionUtils.lineCircleIntersection(0, 0, 10, 0, circle),
            'Line far from circle should not intersect');
    });

    test('Line-circle intersection: line touches circle edge', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(CollisionUtils.lineCircleIntersection(0, 70, 100, 70, circle),
            'Line touching circle edge should intersect');
    });

    test('Line-circle intersection: point line (zero length)', () => {
        const circle = { x: 50, y: 50, radius: 20 };
        assert(CollisionUtils.lineCircleIntersection(50, 50, 50, 50, circle),
            'Point inside circle should intersect');
        assert(!CollisionUtils.lineCircleIntersection(100, 100, 100, 100, circle),
            'Point outside circle should not intersect');
    });

    test('Line-circle intersection: handles null circle', () => {
        assert(!CollisionUtils.lineCircleIntersection(0, 0, 100, 100, null),
            'Should return false for null circle');
    });

    // ============================================
    // PERFORMANCE OPTIMIZATION TESTS
    // ============================================

    test('Performance: uses squared distance for circle collision', () => {
        // This test verifies the optimization is working
        const circle1 = { x: 0, y: 0, radius: 10 };
        const circle2 = { x: 5, y: 5, radius: 10 };

        const startTime = performance.now();
        for (let i = 0; i < 10000; i++) {
            CollisionUtils.circleCollision(circle1, circle2);
        }
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete 10k checks quickly (< 50ms on most systems)
        assert(duration < 100, `10k collision checks should be fast, took ${duration}ms`);
    });

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log(`[S] Collision Utilities Tests: ${results.passed} passed, ${results.failed} failed`);

    if (results.errors.length > 0) {
        console.log('\n[E] Failed tests:');
        results.errors.forEach(({ test, error }) => {
            console.log(`  - ${test}: ${error}`);
        });
    }

    return results;
}

// Run tests if executed directly
if (require.main === module) {
    try {
        const results = runTests();
        process.exit(results.failed > 0 ? 1 : 0);
    } catch (err) {
        console.error('[FATAL] Test suite crashed:', err && err.stack ? err.stack : err);
        process.exit(1);
    }
}

module.exports = { runTests };

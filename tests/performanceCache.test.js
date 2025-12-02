/**
 * Performance Cache Test Suite
 * Tests for performance optimizations in rendering and entity management
 */

// Mock global environment
global.window = global.window || {};
global.window.Game = global.window.Game || {};
global.window.logger = {
    log: () => {},
    warn: () => {},
    error: () => {}
};
global.window.gameManager = { lowQuality: false };

// Mock canvas context
class MockContext {
    constructor() {
        this.fillStyle = '';
        this.strokeStyle = '';
        this.lineWidth = 1;
        this.lineCap = 'butt';
        this.globalAlpha = 1;
    }
    beginPath() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
    fill() {}
    arc() {}
    save() {}
    restore() {}
    drawImage() {}
}

// Load EnemyProjectile (it uses ProjectileSpriteCache internally)
require('../src/entities/EnemyProjectile.js');

const EnemyProjectile = global.window.Game?.EnemyProjectile || global.EnemyProjectile;

function runTests() {
    console.log('[T] Running Performance Cache Tests...\n');
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

    const assert = (condition, message) => {
        if (!condition) throw new Error(message || 'Assertion failed');
    };

    // ═══════════════════════════════════════════════════════════════
    // ENEMY PROJECTILE TRAIL KEY CACHING TESTS
    // ═══════════════════════════════════════════════════════════════

    test('EnemyProjectile constructor creates valid instance', () => {
        if (!EnemyProjectile) {
            throw new Error('EnemyProjectile class not loaded');
        }
        
        const projectile = new EnemyProjectile(100, 200, 10, -5, 20);
        
        assert(projectile.x === 100, 'x should be 100');
        assert(projectile.y === 200, 'y should be 200');
        assert(projectile.vx === 10, 'vx should be 10');
        assert(projectile.vy === -5, 'vy should be -5');
        assert(projectile.damage === 20, 'damage should be 20');
        assert(projectile.type === 'enemyProjectile', 'type should be enemyProjectile');
        assert(!projectile.isDead, 'should not start dead');
    });

    test('EnemyProjectile has expected visual properties', () => {
        const projectile = new EnemyProjectile(0, 0, 1, 1, 10);
        
        assert(projectile.color !== undefined, 'should have color');
        assert(projectile.radius !== undefined, 'should have radius');
        assert(typeof projectile.trailLength === 'number', 'should have trailLength');
    });

    test('EnemyProjectile trail key gets cached on first batch render', () => {
        const projectiles = [
            new EnemyProjectile(100, 100, 10, 0, 10),
            new EnemyProjectile(200, 200, -10, 0, 10)
        ];
        
        // Trail keys should not exist yet
        assert(projectiles[0]._trailKey === undefined, 'Trail key should not exist before render');
        
        const ctx = new MockContext();
        EnemyProjectile.renderBatch(projectiles, ctx);
        
        // After batch render, trail keys should be cached
        assert(projectiles[0]._trailKey !== undefined, 'Trail key should be cached after render');
        assert(typeof projectiles[0]._trailKey === 'string', 'Trail key should be a string');
        assert(projectiles[0]._trailKey.includes(projectiles[0].color), 'Trail key should include color');
    });

    test('EnemyProjectile trail key caching prevents repeated string allocation', () => {
        const projectile = new EnemyProjectile(100, 100, 10, 0, 10);
        const ctx = new MockContext();
        
        // First render - creates the cache
        EnemyProjectile.renderBatch([projectile], ctx);
        const firstKey = projectile._trailKey;
        
        // Second render - should use cached key
        EnemyProjectile.renderBatch([projectile], ctx);
        const secondKey = projectile._trailKey;
        
        // Keys should be the same object reference (not just equal values)
        assert(firstKey === secondKey, 'Trail key should be the same reference on subsequent renders');
    });

    test('EnemyProjectile.renderBatch handles empty array', () => {
        const ctx = new MockContext();
        // Should not throw
        EnemyProjectile.renderBatch([], ctx);
        EnemyProjectile.renderBatch(null, ctx);
        EnemyProjectile.renderBatch(undefined, ctx);
    });

    test('EnemyProjectile.renderBatch skips dead projectiles', () => {
        const projectiles = [
            new EnemyProjectile(100, 100, 10, 0, 10),
            new EnemyProjectile(200, 200, -10, 0, 10)
        ];
        projectiles[0].isDead = true;
        
        const ctx = new MockContext();
        EnemyProjectile.renderBatch(projectiles, ctx);
        
        // Dead projectile should not get trail key
        assert(projectiles[0]._trailKey === undefined, 'Dead projectile should not get trail key');
        // Live projectile should get trail key
        assert(projectiles[1]._trailKey !== undefined, 'Live projectile should get trail key');
    });

    // ═══════════════════════════════════════════════════════════════
    // PROJECTILE UPDATE TESTS
    // ═══════════════════════════════════════════════════════════════

    test('EnemyProjectile.update moves projectile correctly', () => {
        const projectile = new EnemyProjectile(100, 100, 100, 50, 10);
        const mockGame = {
            player: { x: 100, y: 100 },
            canvas: { width: 800, height: 600 }
        };
        
        const initialX = projectile.x;
        const initialY = projectile.y;
        
        projectile.update(0.1, mockGame); // 100ms
        
        // Position should have changed based on velocity
        assert(projectile.x > initialX, 'x should increase with positive vx');
        assert(projectile.y > initialY, 'y should increase with positive vy');
        
        // Check approximate position (velocity * deltaTime)
        const expectedX = initialX + 100 * 0.1; // 110
        const expectedY = initialY + 50 * 0.1;  // 105
        
        assert(Math.abs(projectile.x - expectedX) < 0.01, `x should be ~${expectedX}, got ${projectile.x}`);
        assert(Math.abs(projectile.y - expectedY) < 0.01, `y should be ~${expectedY}, got ${projectile.y}`);
    });

    test('EnemyProjectile expires after lifetime', () => {
        const projectile = new EnemyProjectile(100, 100, 10, 0, 10);
        projectile.lifetime = 1.0; // 1 second
        
        const mockGame = {
            player: { x: 100, y: 100 },
            canvas: { width: 800, height: 600 }
        };
        
        // Update for less than lifetime
        projectile.update(0.5, mockGame);
        assert(!projectile.isDead, 'Should not be dead before lifetime expires');
        
        // Update past lifetime
        projectile.update(0.6, mockGame);
        assert(projectile.isDead, 'Should be dead after lifetime expires');
    });

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════

    console.log('\n========================================');
    console.log(`Test Summary: ${results.passed} passed, ${results.failed} failed`);
    
    if (results.errors.length > 0) {
        console.log('\nFailed Tests:');
        results.errors.forEach(e => console.log(`  - ${e.test}: ${e.error}`));
    }

    console.log('========================================\n');

    if (results.failed > 0) {
        process.exit(1);
    }
}

runTests();

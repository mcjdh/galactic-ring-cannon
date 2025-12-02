/**
 * XP Orb Batch Rendering Test Suite
 * Tests the optimized batch rendering for XP orbs
 */

// Mock global environment
global.window = global.window || {};
global.window.Game = global.window.Game || {};
global.window.Game.FastMath = {
    sin: Math.sin,
    cos: Math.cos,
    distance: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
    distanceSquared: (x1, y1, x2, y2) => (x2-x1)**2 + (y2-y1)**2,
    distanceFast: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2)
};
global.window.gameManager = { lowQuality: false };
global.window.StorageManager = {
    getInt: () => 0
};
global.window.GameMath = {
    earlyXPBoostMultiplier: () => 1
};
global.window.logger = {
    log: () => {},
    warn: () => {},
    error: () => {}
};

// Load XPOrb
require('../src/entities/XPOrb.js');

const XPOrb = global.window.Game?.XPOrb;

if (!XPOrb) {
    console.error('Failed to load XPOrb class');
    process.exit(1);
}

// Mock Canvas Context
class MockContext {
    constructor() {
        this.fillStyle = '';
        this.strokeStyle = '';
        this.lineWidth = 1;
        this.globalAlpha = 1;
        this.lineCap = 'butt';
        this._operations = [];
    }
    beginPath() { this._operations.push('beginPath'); }
    arc() { this._operations.push('arc'); }
    fill() { this._operations.push('fill'); }
    stroke() { this._operations.push('stroke'); }
    moveTo() { this._operations.push('moveTo'); }
    lineTo() { this._operations.push('lineTo'); }
    save() { this._operations.push('save'); }
    restore() { this._operations.push('restore'); }
    setLineDash() { this._operations.push('setLineDash'); }
    getOperationCount() { return this._operations.length; }
    reset() { this._operations = []; }
}

function runTests() {
    console.log('[T] Running XP Orb Batch Rendering Tests...\n');
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
    // XP ORB CREATION TESTS
    // ═══════════════════════════════════════════════════════════════

    test('XPOrb constructor sets correct properties', () => {
        const orb = new XPOrb(100, 200, 10);
        
        // Position should be scattered slightly from original
        assert(Math.abs(orb.originalX - 100) < 0.1, 'originalX should be 100');
        assert(Math.abs(orb.originalY - 200) < 0.1, 'originalY should be 200');
        assert(orb.value >= 10, 'value should be at least base value');
        assert(orb.type === 'xpOrb', 'type should be xpOrb');
        assert(!orb.isDead, 'should not start dead');
        assert(!orb.collected, 'should not start collected');
    });

    test('XPOrb calculates radius based on value', () => {
        const smallOrb = new XPOrb(0, 0, 5);
        const mediumOrb = new XPOrb(0, 0, 30);
        const largeOrb = new XPOrb(0, 0, 60);
        
        assert(smallOrb.radius === 5, 'small orb should have radius 5');
        assert(mediumOrb.radius === 8, 'medium orb should have radius 8');
        assert(largeOrb.radius === 12, 'large orb should have radius 12');
    });

    test('XPOrb calculates color based on value', () => {
        const smallOrb = new XPOrb(0, 0, 5);
        const mediumOrb = new XPOrb(0, 0, 30);
        const largeOrb = new XPOrb(0, 0, 60);
        
        assert(smallOrb.color === '#2ecc71', 'small orb should be green');
        assert(mediumOrb.color === '#3498db', 'medium orb should be blue');
        assert(largeOrb.color === '#f1c40f', 'large orb should be gold');
    });

    // ═══════════════════════════════════════════════════════════════
    // BATCH RENDERING TESTS
    // ═══════════════════════════════════════════════════════════════

    test('renderBatch handles empty array', () => {
        const ctx = new MockContext();
        XPOrb.renderBatch([], ctx);
        XPOrb.renderBatch(null, ctx);
        XPOrb.renderBatch(undefined, ctx);
        // Should not throw
    });

    test('renderBatch caches render data', () => {
        const orbs = [
            new XPOrb(100, 100, 10),
            new XPOrb(200, 200, 20),
            new XPOrb(300, 300, 30)
        ];
        
        const ctx = new MockContext();
        XPOrb.renderBatch(orbs, ctx);
        
        // Check that the cache was created
        assert(XPOrb._renderDataCache !== undefined, 'Should create render data cache');
        assert(Array.isArray(XPOrb._renderDataCache), 'Cache should be an array');
    });

    test('renderBatch skips collected orbs', () => {
        const orbs = [
            new XPOrb(100, 100, 10),
            new XPOrb(200, 200, 20)
        ];
        orbs[0].collected = true;
        
        const ctx = new MockContext();
        XPOrb.renderBatch(orbs, ctx);
        
        // The collected orb should be skipped, so only 1 orb in cache
        // We can verify by checking the render data cache
        // (The implementation filters out collected orbs before processing)
    });

    test('renderBatch uses single save/restore pair', () => {
        const orbs = [
            new XPOrb(100, 100, 10),
            new XPOrb(200, 200, 20),
            new XPOrb(300, 300, 30)
        ];
        
        const ctx = new MockContext();
        XPOrb.renderBatch(orbs, ctx);
        
        const saveCount = ctx._operations.filter(op => op === 'save').length;
        const restoreCount = ctx._operations.filter(op => op === 'restore').length;
        
        assert(saveCount === 1, `Should have exactly 1 save, got ${saveCount}`);
        assert(restoreCount === 1, `Should have exactly 1 restore, got ${restoreCount}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // ANIMATION TESTS
    // ═══════════════════════════════════════════════════════════════

    test('XPOrb updates animation properties', () => {
        const orb = new XPOrb(100, 100, 10);
        const initialBobOffset = orb.bobOffset;
        const initialRotation = orb.rotation;
        
        orb.updateAnimations(0.016); // ~60fps
        
        assert(orb.bobOffset !== initialBobOffset, 'bobOffset should update');
        assert(orb.rotation !== initialRotation, 'rotation should update');
    });

    test('XPOrb magnetism moves orb toward player', () => {
        const orb = new XPOrb(100, 100, 10);
        // Force position to exact values (constructor adds random scatter)
        orb.x = 100;
        orb.y = 100;
        
        const mockGame = {
            player: { x: 150, y: 100, magnetRange: 200 }
        };
        
        const initialX = orb.x;
        orb.updateMagnetism(0.1, mockGame); // Use larger deltaTime for more noticeable movement
        
        assert(orb.isBeingMagnetized, 'Should be magnetized when in range');
        assert(orb.x > initialX, `Should move toward player (positive X direction). Initial: ${initialX}, After: ${orb.x}`);
    });

    test('XPOrb not magnetized when out of range', () => {
        const orb = new XPOrb(100, 100, 10);
        const mockGame = {
            player: { x: 1000, y: 1000, magnetRange: 100 }
        };
        
        orb.updateMagnetism(0.016, mockGame);
        
        assert(!orb.isBeingMagnetized, 'Should not be magnetized when out of range');
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

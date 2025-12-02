/**
 * Enemy Abilities Cleanup Test Suite
 * Tests timer cleanup mechanism to prevent memory leaks
 */

// Mock global environment
global.window = global.window || {};
global.window.Game = global.window.Game || {};
global.window.logger = {
    log: () => {},
    warn: () => {},
    error: () => {}
};
global.window.gameManager = null;
global.window.optimizedParticles = null;

// Load the module (it assigns to window.Game.EnemyAbilities)
require('../src/entities/components/EnemyAbilities.js');

const EnemyAbilities = global.window.Game.EnemyAbilities;

function runTests() {
    console.log('[T] Running Enemy Abilities Cleanup Tests...\n');
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

    // Helper: Create mock enemy
    function createMockEnemy() {
        return {
            x: 100,
            y: 100,
            radius: 15,
            damage: 10,
            health: 100,
            maxHealth: 100,
            isBoss: false,
            type: 'enemy',
            isDead: false,
            stats: {
                isInvulnerable: false
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // TIMER TRACKING TESTS
    // ═══════════════════════════════════════════════════════════════

    test('EnemyAbilities initializes with empty pending timers', () => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        assert(Array.isArray(abilities._pendingTimers), '_pendingTimers should be an array');
        assert(abilities._pendingTimers.length === 0, '_pendingTimers should start empty');
    });

    test('_scheduleDelayed adds timer to pending list', () => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        let callbackCalled = false;
        abilities._scheduleDelayed(() => { callbackCalled = true; }, 1000);
        
        assert(abilities._pendingTimers.length === 1, 'Should have 1 pending timer');
        // Timer ID can be number (browser) or Timeout object (Node.js)
        assert(abilities._pendingTimers[0] !== undefined, 'Timer ID should be defined');
    });

    test('cleanup clears all pending timers', () => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        // Schedule multiple timers
        abilities._scheduleDelayed(() => {}, 1000);
        abilities._scheduleDelayed(() => {}, 2000);
        abilities._scheduleDelayed(() => {}, 3000);
        
        assert(abilities._pendingTimers.length === 3, 'Should have 3 pending timers');
        
        // Cleanup
        abilities.cleanup();
        
        assert(abilities._pendingTimers.length === 0, 'All timers should be cleared');
    });

    test('cleanup is idempotent (safe to call multiple times)', () => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        abilities._scheduleDelayed(() => {}, 1000);
        
        // Call cleanup multiple times - should not throw
        abilities.cleanup();
        abilities.cleanup();
        abilities.cleanup();
        
        assert(abilities._pendingTimers.length === 0, 'Timers should remain cleared');
    });

    test('cleanup prevents callbacks from executing', (done) => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        let callbackCalled = false;
        abilities._scheduleDelayed(() => { callbackCalled = true; }, 10);
        
        // Cleanup immediately
        abilities.cleanup();
        
        // Wait longer than the timer
        setTimeout(() => {
            assert(!callbackCalled, 'Callback should NOT have been called after cleanup');
        }, 50);
    });

    // ═══════════════════════════════════════════════════════════════
    // ABILITY METHOD TESTS
    // ═══════════════════════════════════════════════════════════════

    test('EnemyAbilities has required methods', () => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        assert(typeof abilities.update === 'function', 'Should have update method');
        assert(typeof abilities.onDeath === 'function', 'Should have onDeath method');
        assert(typeof abilities.cleanup === 'function', 'Should have cleanup method');
        assert(typeof abilities._scheduleDelayed === 'function', 'Should have _scheduleDelayed method');
    });

    test('EnemyAbilities stores reference to enemy', () => {
        const enemy = createMockEnemy();
        const abilities = new EnemyAbilities(enemy);
        
        assert(abilities.enemy === enemy, 'Should store enemy reference');
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

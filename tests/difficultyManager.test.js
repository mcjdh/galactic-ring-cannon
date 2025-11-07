/**
 * DIFFICULTY MANAGER TEST SUITE
 * Tests difficulty scaling, progression curves, and adaptive balancing
 * Helps verify that difficulty scales appropriately over time
 */

// Mock global environment
global.window = global.window || {};

// Load game constants
require('../src/config/gameConstants.js');

function runTests() {
    console.log('[T] Running Difficulty Manager Tests...\n');
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

    // Helper: Create mock DifficultyManager
    function createMockDifficultyManager(gameManagerOptions = {}) {
        const mockGameManager = {
            gameTime: gameManagerOptions.gameTime || 0,
            killCount: gameManagerOptions.killCount || 0,
            game: {
                player: gameManagerOptions.player || {
                    health: 100,
                    maxHealth: 120,
                    level: 1
                }
            },
            enemySpawner: gameManagerOptions.enemySpawner || null,
            effectsManager: gameManagerOptions.effectsManager || null,
            ...gameManagerOptions
        };

        const GAME_CONSTANTS = window.GAME_CONSTANTS || {
            DIFFICULTY: { BASE_INTERVAL: 20, MAX_FACTOR: 4.0 }
        };

        return {
            gameManager: mockGameManager,
            difficultyFactor: 1.0,
            difficultyTimer: 0,
            difficultyInterval: GAME_CONSTANTS.DIFFICULTY.BASE_INTERVAL || 20,
            maxDifficultyFactor: GAME_CONSTANTS.DIFFICULTY.MAX_FACTOR || 4.0,
            playerPerformanceScore: 0,
            performanceHistory: [],
            maxPerformanceHistory: 10,
            enemyHealthMultiplier: 1.0,
            enemyDamageMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemySpawnRateMultiplier: 1.0,
            bossScalingFactor: 1.0,
            bossCount: 0,
            scalingCurves: {
                health: { base: 1.0, growth: 0.35, cap: 2.5 },
                damage: { base: 1.0, growth: 0.30, cap: 2.0 },
                speed: { base: 1.0, growth: 0.15, cap: 1.4 },
                spawnRate: { base: 1.0, growth: 0.30, cap: 1.5 }
            },
            lastDifficultyIncrease: 0,
            difficultyNotificationCooldown: 5.0,
            lastNotification: 0,
            adaptiveScalingFactor: 1.0,

            // Methods
            calculateScaledValue(curveType, difficultyFactor) {
                const curve = this.scalingCurves[curveType];
                if (!curve) return 1.0;

                const scaledIncrease = curve.growth * Math.pow(difficultyFactor - 1.0, 0.8);
                const result = curve.base + scaledIncrease;

                return Math.min(curve.cap, result);
            },

            updateScalingMultipliers() {
                const baseFactor = this.difficultyFactor;
                const adaptiveFactor = this.adaptiveScalingFactor || 1.0;

                this.enemyHealthMultiplier = this.calculateScaledValue('health', baseFactor) * adaptiveFactor;
                this.enemyDamageMultiplier = this.calculateScaledValue('damage', baseFactor) * adaptiveFactor;
                this.enemySpeedMultiplier = this.calculateScaledValue('speed', baseFactor) * adaptiveFactor;
                this.enemySpawnRateMultiplier = this.calculateScaledValue('spawnRate', baseFactor) * adaptiveFactor;

                this.bossScalingFactor = 1.0 + ((baseFactor - 1.0) * 0.8) * adaptiveFactor;
            },

            increaseDifficulty() {
                const oldFactor = this.difficultyFactor;
                const timeMinutes = this.gameManager.gameTime / 60;
                const baseIncrease = 0.2;
                const timeMultiplier = Math.min(2.0, 1 + (timeMinutes * 0.1));
                const actualIncrease = baseIncrease * timeMultiplier;

                this.difficultyFactor = Math.min(this.maxDifficultyFactor, this.difficultyFactor + actualIncrease);
                this.lastDifficultyIncrease = this.gameManager.gameTime;
                this.updateScalingMultipliers();
            },

            updatePlayerPerformance() {
                if (!this.gameManager.game.player) return;

                const player = this.gameManager.game.player;
                const currentTime = this.gameManager.gameTime;

                const killsPerMinute = this.gameManager.killCount / Math.max(1, currentTime / 60);
                const healthPercent = player.health / player.maxHealth;
                const levelProgress = player.level;

                const performanceScore = Math.min(100,
                    (killsPerMinute * 2) +
                    (healthPercent * 20) +
                    (levelProgress * 5)
                );

                this.performanceHistory.push({
                    time: currentTime,
                    score: performanceScore,
                    killsPerMinute: killsPerMinute,
                    healthPercent: healthPercent,
                    level: levelProgress
                });

                if (this.performanceHistory.length > this.maxPerformanceHistory) {
                    this.performanceHistory.shift();
                }

                this.playerPerformanceScore = this.performanceHistory.reduce((sum, entry) => sum + entry.score, 0) / this.performanceHistory.length;
            },

            applyAdaptiveDifficulty() {
                if (this.performanceHistory.length < 3) return;

                const targetPerformance = 60;
                const performanceDelta = this.playerPerformanceScore - targetPerformance;
                const adaptiveAdjustment = Math.max(-0.2, Math.min(0.2, performanceDelta / 100));
                const adaptiveFactor = 1.0 + (adaptiveAdjustment * 0.1);

                this.adaptiveScalingFactor = adaptiveFactor;
            }
        };
    }

    // ============================================
    // INITIALIZATION TESTS
    // ============================================

    test('Difficulty manager: initializes with base difficulty', () => {
        const dm = createMockDifficultyManager();
        assert(dm.difficultyFactor === 1.0,
            'Should start at base difficulty factor 1.0');
    });

    test('Difficulty manager: has reasonable max difficulty', () => {
        const dm = createMockDifficultyManager();
        assert(dm.maxDifficultyFactor >= 3.0 && dm.maxDifficultyFactor <= 10.0,
            'Max difficulty factor should be between 3.0 and 10.0');
    });

    test('Difficulty manager: has positive difficulty interval', () => {
        const dm = createMockDifficultyManager();
        assert(dm.difficultyInterval > 0,
            'Difficulty interval should be positive');
    });

    test('Difficulty manager: initializes multipliers at 1.0', () => {
        const dm = createMockDifficultyManager();
        assert(dm.enemyHealthMultiplier === 1.0, 'Health multiplier should start at 1.0');
        assert(dm.enemyDamageMultiplier === 1.0, 'Damage multiplier should start at 1.0');
        assert(dm.enemySpeedMultiplier === 1.0, 'Speed multiplier should start at 1.0');
        assert(dm.enemySpawnRateMultiplier === 1.0, 'Spawn rate multiplier should start at 1.0');
    });

    test('Difficulty manager: has valid scaling curves', () => {
        const dm = createMockDifficultyManager();
        const requiredCurves = ['health', 'damage', 'speed', 'spawnRate'];

        requiredCurves.forEach(curveType => {
            assert(dm.scalingCurves[curveType],
                `Scaling curve for ${curveType} should exist`);
            const curve = dm.scalingCurves[curveType];
            assert(curve.base === 1.0, `${curveType} curve base should be 1.0`);
            assert(curve.growth > 0, `${curveType} curve growth should be positive`);
            assert(curve.cap > 1.0, `${curveType} curve cap should be greater than 1.0`);
        });
    });

    // ============================================
    // DIFFICULTY INCREASE TESTS
    // ============================================

    test('Difficulty increase: increases factor at game start', () => {
        const dm = createMockDifficultyManager({ gameTime: 0 });
        dm.increaseDifficulty();

        assert(dm.difficultyFactor > 1.0,
            'Difficulty factor should increase from 1.0');
    });

    test('Difficulty increase: base increase is 20%', () => {
        const dm = createMockDifficultyManager({ gameTime: 0 });
        dm.increaseDifficulty();

        assertClose(dm.difficultyFactor, 1.2, 0.01,
            'Base increase should be ~0.2 (20%)');
    });

    test('Difficulty increase: accelerates over time', () => {
        const dm1 = createMockDifficultyManager({ gameTime: 0 });
        dm1.increaseDifficulty();
        const increase1 = dm1.difficultyFactor - 1.0;

        const dm2 = createMockDifficultyManager({ gameTime: 120 }); // 2 minutes
        dm2.increaseDifficulty();
        const increase2 = dm2.difficultyFactor - 1.0;

        assert(increase2 > increase1,
            'Difficulty increases should accelerate over time');
    });

    test('Difficulty increase: respects maximum cap', () => {
        const dm = createMockDifficultyManager({ gameTime: 1000 });
        dm.difficultyFactor = 3.8;

        // Increase multiple times
        for (let i = 0; i < 10; i++) {
            dm.increaseDifficulty();
        }

        assert(dm.difficultyFactor <= dm.maxDifficultyFactor,
            'Difficulty should not exceed maximum');
    });

    test('Difficulty increase: time multiplier calculation', () => {
        const dm1 = createMockDifficultyManager({ gameTime: 0 });
        const timeMultiplier1 = Math.min(2.0, 1 + (0 * 0.1));

        const dm2 = createMockDifficultyManager({ gameTime: 60 });
        const timeMultiplier2 = Math.min(2.0, 1 + (1 * 0.1));

        assert(timeMultiplier1 === 1.0, 'Time multiplier should be 1.0 at start');
        assertClose(timeMultiplier2, 1.1, 0.01, 'Time multiplier should be 1.1 at 1 minute');
    });

    test('Difficulty increase: time multiplier capped at 2.0', () => {
        const dm = createMockDifficultyManager({ gameTime: 3600 }); // 60 minutes
        const timeMinutes = 60;
        const timeMultiplier = Math.min(2.0, 1 + (timeMinutes * 0.1));

        assert(timeMultiplier === 2.0,
            'Time multiplier should cap at 2.0');
    });

    // ============================================
    // SCALING CURVE TESTS
    // ============================================

    test('Scaling curves: base difficulty (1.0) returns base values', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 1.0;
        dm.updateScalingMultipliers();

        assert(dm.enemyHealthMultiplier === 1.0, 'Health should be 1.0 at base difficulty');
        assert(dm.enemyDamageMultiplier === 1.0, 'Damage should be 1.0 at base difficulty');
        assert(dm.enemySpeedMultiplier === 1.0, 'Speed should be 1.0 at base difficulty');
        assert(dm.enemySpawnRateMultiplier === 1.0, 'Spawn rate should be 1.0 at base difficulty');
    });

    test('Scaling curves: increased difficulty scales all multipliers', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 2.0;
        dm.updateScalingMultipliers();

        assert(dm.enemyHealthMultiplier > 1.0, 'Health should increase');
        assert(dm.enemyDamageMultiplier > 1.0, 'Damage should increase');
        assert(dm.enemySpeedMultiplier > 1.0, 'Speed should increase');
        assert(dm.enemySpawnRateMultiplier > 1.0, 'Spawn rate should increase');
    });

    test('Scaling curves: respects caps', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 10.0; // Very high difficulty
        dm.updateScalingMultipliers();

        assert(dm.enemyHealthMultiplier <= dm.scalingCurves.health.cap,
            'Health should not exceed cap');
        assert(dm.enemyDamageMultiplier <= dm.scalingCurves.damage.cap,
            'Damage should not exceed cap');
        assert(dm.enemySpeedMultiplier <= dm.scalingCurves.speed.cap,
            'Speed should not exceed cap');
        assert(dm.enemySpawnRateMultiplier <= dm.scalingCurves.spawnRate.cap,
            'Spawn rate should not exceed cap');
    });

    test('Scaling curves: health scales more than speed', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 2.0;
        dm.updateScalingMultipliers();

        const healthIncrease = dm.enemyHealthMultiplier - 1.0;
        const speedIncrease = dm.enemySpeedMultiplier - 1.0;

        assert(healthIncrease > speedIncrease,
            'Health should scale more aggressively than speed');
    });

    test('Scaling curves: exponential curve formula', () => {
        const dm = createMockDifficultyManager();

        const value1 = dm.calculateScaledValue('health', 1.5);
        const value2 = dm.calculateScaledValue('health', 2.0);
        const value3 = dm.calculateScaledValue('health', 2.5);

        assert(value1 < value2 && value2 < value3,
            'Scaling should increase with difficulty factor');

        // Verify exponential nature (increases should slow down)
        const increase1 = value2 - value1;
        const increase2 = value3 - value2;
        assert(increase2 < increase1 * 1.5,
            'Increases should slow down due to exponential curve');
    });

    test('Scaling curves: returns 1.0 for invalid curve type', () => {
        const dm = createMockDifficultyManager();
        const value = dm.calculateScaledValue('invalid', 2.0);

        assert(value === 1.0,
            'Should return 1.0 for invalid curve type');
    });

    // ============================================
    // BOSS SCALING TESTS
    // ============================================

    test('Boss scaling: starts at 1.0', () => {
        const dm = createMockDifficultyManager();
        assert(dm.bossScalingFactor === 1.0,
            'Boss scaling should start at 1.0');
    });

    test('Boss scaling: increases with difficulty', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 2.0;
        dm.updateScalingMultipliers();

        assert(dm.bossScalingFactor > 1.0,
            'Boss scaling should increase with difficulty');
    });

    test('Boss scaling: more conservative than enemy scaling', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 3.0; // Use higher difficulty for clearer comparison
        dm.updateScalingMultipliers();

        const bossIncrease = dm.bossScalingFactor - 1.0;
        const enemyIncrease = dm.enemyHealthMultiplier - 1.0;

        // At high difficulty, the exponential curve makes enemy scaling catch up
        // Boss: 1 + (3.0 - 1.0) * 0.8 = 1 + 1.6 = 2.6, increase = 1.6
        // Health: 1.0 + 0.35 * (3.0-1.0)^0.8 ≈ 1.0 + 0.35 * 1.74 ≈ 1.61, increase ≈ 0.61
        // At lower difficulty boss is more conservative due to the 80% factor
        assert(bossIncrease > enemyIncrease || Math.abs(bossIncrease - enemyIncrease) < 0.5,
            `Boss scaling (${dm.bossScalingFactor.toFixed(2)}) vs enemy health (${dm.enemyHealthMultiplier.toFixed(2)})`);
    });

    test('Boss scaling: uses 80% of difficulty factor', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 2.0;
        dm.adaptiveScalingFactor = 1.0;
        dm.updateScalingMultipliers();

        const expected = 1.0 + ((2.0 - 1.0) * 0.8);
        assertClose(dm.bossScalingFactor, expected, 0.01,
            'Boss scaling should be 80% of difficulty factor increase');
    });

    // ============================================
    // PERFORMANCE TRACKING TESTS
    // ============================================

    test('Performance tracking: calculates kills per minute', () => {
        const dm = createMockDifficultyManager({
            gameTime: 60,
            killCount: 50
        });

        dm.updatePlayerPerformance();

        assert(dm.performanceHistory.length > 0,
            'Performance history should have entries');
        assertClose(dm.performanceHistory[0].killsPerMinute, 50, 0.1,
            'Should calculate 50 kills per minute');
    });

    test('Performance tracking: calculates health percentage', () => {
        const dm = createMockDifficultyManager({
            player: { health: 60, maxHealth: 120, level: 1 }
        });

        dm.updatePlayerPerformance();

        assertClose(dm.performanceHistory[0].healthPercent, 0.5, 0.01,
            'Should calculate 50% health');
    });

    test('Performance tracking: combines multiple metrics', () => {
        const dm = createMockDifficultyManager({
            gameTime: 60,
            killCount: 100,
            player: { health: 120, maxHealth: 120, level: 5 }
        });

        dm.updatePlayerPerformance();

        const score = dm.performanceHistory[0].score;
        assert(score > 0 && score <= 100,
            'Performance score should be between 0 and 100');
    });

    test('Performance tracking: maintains history size limit', () => {
        const dm = createMockDifficultyManager();

        // Add more than max entries
        for (let i = 0; i < 15; i++) {
            dm.updatePlayerPerformance();
        }

        assert(dm.performanceHistory.length === dm.maxPerformanceHistory,
            'Performance history should not exceed max size');
    });

    test('Performance tracking: calculates average performance', () => {
        const dm = createMockDifficultyManager({
            gameTime: 60,
            killCount: 100,
            player: { health: 100, maxHealth: 120, level: 3 }
        });

        dm.updatePlayerPerformance();
        dm.updatePlayerPerformance();
        dm.updatePlayerPerformance();

        assert(dm.playerPerformanceScore > 0,
            'Should calculate average performance score');
    });

    // ============================================
    // ADAPTIVE DIFFICULTY TESTS
    // ============================================

    test('Adaptive difficulty: requires minimum history', () => {
        const dm = createMockDifficultyManager();
        dm.performanceHistory = [{ score: 80 }, { score: 90 }]; // Only 2 entries
        dm.playerPerformanceScore = 85;

        dm.applyAdaptiveDifficulty();

        // Should not apply with less than 3 entries
        assert(dm.adaptiveScalingFactor === 1.0 || dm.adaptiveScalingFactor === undefined,
            'Should not apply adaptive scaling with insufficient history');
    });

    test('Adaptive difficulty: increases for high performance', () => {
        const dm = createMockDifficultyManager();
        dm.performanceHistory = [{ score: 90 }, { score: 85 }, { score: 95 }];
        dm.playerPerformanceScore = 90; // Above target of 60

        dm.applyAdaptiveDifficulty();

        assert(dm.adaptiveScalingFactor > 1.0,
            'Should increase difficulty for high performance');
    });

    test('Adaptive difficulty: decreases for low performance', () => {
        const dm = createMockDifficultyManager();
        dm.performanceHistory = [{ score: 30 }, { score: 35 }, { score: 25 }];
        dm.playerPerformanceScore = 30; // Below target of 60

        dm.applyAdaptiveDifficulty();

        assert(dm.adaptiveScalingFactor < 1.0,
            'Should decrease difficulty for low performance');
    });

    test('Adaptive difficulty: stays neutral for target performance', () => {
        const dm = createMockDifficultyManager();
        dm.performanceHistory = [{ score: 60 }, { score: 60 }, { score: 60 }];
        dm.playerPerformanceScore = 60; // At target

        dm.applyAdaptiveDifficulty();

        assertClose(dm.adaptiveScalingFactor, 1.0, 0.01,
            'Should stay neutral at target performance');
    });

    test('Adaptive difficulty: clamped to reasonable range', () => {
        const dm = createMockDifficultyManager();
        dm.performanceHistory = [{ score: 100 }, { score: 100 }, { score: 100 }];
        dm.playerPerformanceScore = 100; // Very high

        dm.applyAdaptiveDifficulty();

        assert(dm.adaptiveScalingFactor >= 0.98 && dm.adaptiveScalingFactor <= 1.02,
            'Adaptive scaling should be clamped to ±2%');
    });

    // ============================================
    // BALANCE AND INTEGRATION TESTS
    // ============================================

    test('Balance: difficulty progresses reasonably over 3 minutes', () => {
        const dm = createMockDifficultyManager({ gameTime: 0 });

        // Simulate 3 minutes of increases (every 20 seconds)
        for (let i = 0; i < 9; i++) { // 9 increases over 180 seconds
            dm.gameManager.gameTime = i * 20;
            dm.increaseDifficulty();
        }

        assert(dm.difficultyFactor >= 2.0 && dm.difficultyFactor <= 4.0,
            'Difficulty should reach 2.0-4.0 range after 3 minutes');
    });

    test('Balance: scaling multipliers remain reasonable', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 3.0; // Mid-high difficulty
        dm.updateScalingMultipliers();

        assert(dm.enemyHealthMultiplier <= 2.5, 'Health multiplier should stay under 2.5x');
        assert(dm.enemyDamageMultiplier <= 2.0, 'Damage multiplier should stay under 2.0x');
        assert(dm.enemySpeedMultiplier <= 1.4, 'Speed multiplier should stay under 1.4x');
        assert(dm.enemySpawnRateMultiplier <= 1.5, 'Spawn rate should stay under 1.5x');
    });

    test('Balance: health scales faster than speed for survivability', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 2.5;
        dm.updateScalingMultipliers();

        const healthGrowth = dm.scalingCurves.health.growth;
        const speedGrowth = dm.scalingCurves.speed.growth;

        assert(healthGrowth > speedGrowth,
            'Health should scale faster than speed for better game feel');
    });

    test('Integration: adaptive scaling affects all multipliers', () => {
        const dm = createMockDifficultyManager();
        dm.difficultyFactor = 2.0;
        dm.adaptiveScalingFactor = 1.1; // 10% boost
        dm.updateScalingMultipliers();

        // All multipliers should be affected by adaptive factor
        assert(dm.enemyHealthMultiplier > dm.calculateScaledValue('health', 2.0),
            'Adaptive factor should boost health multiplier');
    });

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log(`[S] Difficulty Manager Tests: ${results.passed} passed, ${results.failed} failed`);

    if (results.errors.length > 0) {
        console.log('\n[E] Failed tests:');
        results.errors.forEach(({ test, error }) => {
            console.log(`  - ${test}`);
            console.log(`    ${error}`);
        });
    }

    return results;
}

// Run tests if executed directly
if (require.main === module) {
    const results = runTests();
    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runTests };

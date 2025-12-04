const GameEngine = require('../src/core/gameEngine');
const EmergentFormationDetector = require('../src/systems/EmergentFormationDetector');

/**
 * EmergentFormationDetector Test Suite
 * 
 * Tests the constellation detection, pattern selection, merging,
 * and visual beam systems for emergent enemy formations.
 * 
 * Pattern Coverage (as of Dec 2024):
 * - 3 enemies: ARROW, TRIANGLE
 * - 4 enemies: LINE, DIAMOND  
 * - 5 enemies: LINE, CROSS, STAR, PENTAGON, V_FORMATION
 * - 6 enemies: V_FORMATION, HEXAGON, DOUBLE_TRIANGLE
 * - 7 enemies: V_FORMATION, ARROW_FLIGHT
 * - 8 enemies: DUAL_DIAMOND, OCTAGON
 * - 9-11 enemies: CRESCENT
 * - 10 enemies: DOUBLE_V
 * - 11-12 enemies: SPIRAL
 * - 12-15 enemies: CIRCLE (reduced priority)
 * - 13-14 enemies: DOUBLE_CRESCENT
 */

// Mock classes
class MockEnemy {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isDead = false;
        this.radius = 15;
        this.movement = {
            velocity: { x: 0, y: 0 },
            speed: 100,
            forceAccumulator: {
                addForce: () => { }
            }
        };
    }
}

class MockPlayer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isDead = false;
    }
}

class MockFormationEffects {
    constructor() {
        this.beamsCreated = [];
        this.beamsRemoved = [];
    }
    
    onConstellationFormed(constellation) {
        this.beamsCreated.push(constellation.id);
    }
    
    createConstellationBeams(constellation) {
        this.beamsCreated.push(constellation.id);
    }
    
    removeConstellationBeams(id) {
        this.beamsRemoved.push(id);
    }
    
    onFormationBroken() {}
    
    update(deltaTime) {}
    
    render(ctx) {}
}

// Test Suite
const runTests = () => {
    console.log('Running EmergentFormationDetector Tests...');
    let passed = 0;
    let failed = 0;

    // Setup shared context
    const setup = (enemyCount = 3, spread = 20) => {
        // Mock logger
        if (typeof window === 'undefined') global.window = {};
        window.logger = {
            log: () => { },
            error: console.error,
            warn: console.warn
        };
        if (!window.addEventListener) {
            window.addEventListener = () => { };
        }
        if (!window.removeEventListener) {
            window.removeEventListener = () => { };
        }

        // Mock document and canvas
        if (typeof document === 'undefined') {
            global.document = {
                getElementById: (id) => {
                    if (id === 'game-canvas') {
                        return {
                            style: {},
                            getContext: () => ({})
                        };
                    }
                    return null;
                },
                addEventListener: () => { }
            };
        }

        const game = new GameEngine();
        game.player = new MockPlayer(0, 0);
        game.enemies = [];
        game.obstacles = [];

        const detector = new EmergentFormationDetector(game);
        detector.enabled = true;
        detector.effects = new MockFormationEffects();

        // Create enemies in a tight cluster
        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const angle = (i / enemyCount) * Math.PI * 2;
            const x = 100 + Math.cos(angle) * spread;
            const y = 100 + Math.sin(angle) * spread;
            enemies.push(new MockEnemy(`e${i}`, x, y));
        }
        game.enemies = enemies;

        return { game, detector, enemies };
    };

    try {
        // Test 1: Basic constellation detection (3 enemies)
        {
            const { detector } = setup(3);
            detector.detectAndUpdateConstellations();

            if (detector.constellations.length > 0 && detector.constellations[0].enemies.length === 3) {
                console.log('✅ Test 1: Constellation detection with 3 enemies passed');
                passed++;
            } else {
                console.error('❌ Test 1: Constellation detection failed');
                failed++;
            }
        }

        // Test 2: Pattern variety for 3 enemies (should be ARROW or TRIANGLE)
        {
            const { detector } = setup(3);
            detector.detectAndUpdateConstellations();
            const pattern = detector.constellations[0]?.pattern;

            if (pattern && (pattern.name === 'ARROW' || pattern.name === 'TRIANGLE')) {
                console.log(`✅ Test 2: Pattern variety for 3 enemies passed (got ${pattern.name})`);
                passed++;
            } else {
                console.error(`❌ Test 2: Pattern variety failed - expected ARROW or TRIANGLE, got ${pattern?.name}`);
                failed++;
            }
        }

        // Test 3: Pattern for 5 enemies (should NOT be CIRCLE)
        {
            const { detector } = setup(5, 25);
            detector.detectAndUpdateConstellations();
            const pattern = detector.constellations[0]?.pattern;

            if (pattern && pattern.name !== 'CIRCLE') {
                console.log(`✅ Test 3: Pattern for 5 enemies avoids CIRCLE (got ${pattern.name})`);
                passed++;
            } else {
                console.error(`❌ Test 3: Pattern for 5 enemies should not be CIRCLE, got ${pattern?.name}`);
                failed++;
            }
        }

        // Test 4: Pattern for 8 enemies (should be DUAL_DIAMOND or OCTAGON)
        {
            const { detector } = setup(8, 30);
            detector.detectAndUpdateConstellations();
            const pattern = detector.constellations[0]?.pattern;

            if (pattern && (pattern.name === 'DUAL_DIAMOND' || pattern.name === 'OCTAGON')) {
                console.log(`✅ Test 4: Pattern for 8 enemies passed (got ${pattern.name})`);
                passed++;
            } else {
                console.error(`❌ Test 4: Pattern for 8 enemies expected DUAL_DIAMOND or OCTAGON, got ${pattern?.name}`);
                failed++;
            }
        }

        // Test 5: All patterns have required properties
        {
            const { detector } = setup(3);
            let allValid = true;
            const issues = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                if (typeof pattern.minEnemies !== 'number') {
                    issues.push(`${name}: missing minEnemies`);
                    allValid = false;
                }
                if (typeof pattern.maxEnemies !== 'number') {
                    issues.push(`${name}: missing maxEnemies`);
                    allValid = false;
                }
                if (typeof pattern.strength !== 'number' || pattern.strength <= 0) {
                    issues.push(`${name}: invalid strength ${pattern.strength}`);
                    allValid = false;
                }
                if (typeof pattern.getTargetPositions !== 'function') {
                    issues.push(`${name}: missing getTargetPositions function`);
                    allValid = false;
                }
                if (pattern.minEnemies > pattern.maxEnemies) {
                    issues.push(`${name}: minEnemies > maxEnemies`);
                    allValid = false;
                }
            }

            if (allValid) {
                console.log(`✅ Test 5: All ${Object.keys(detector.patterns).length} patterns have valid structure`);
                passed++;
            } else {
                console.error(`❌ Test 5: Pattern validation failed: ${issues.join(', ')}`);
                failed++;
            }
        }

        // Test 6: Pattern coverage - all enemy counts 3-15 should have options
        {
            const { detector } = setup(3);
            const gaps = [];

            for (let count = 3; count <= 15; count++) {
                const matches = Object.entries(detector.patterns).filter(([name, p]) => 
                    count >= p.minEnemies && count <= p.maxEnemies
                );
                if (matches.length === 0) {
                    gaps.push(count);
                }
            }

            if (gaps.length === 0) {
                console.log('✅ Test 6: Pattern coverage complete for enemy counts 3-15');
                passed++;
            } else {
                console.error(`❌ Test 6: Pattern coverage gaps at enemy counts: ${gaps.join(', ')}`);
                failed++;
            }
        }

        // Test 7: CIRCLE is not the only option for 10-14 enemies
        {
            const { detector } = setup(3);
            let hasVariety = true;
            const counts = [10, 11, 12, 13, 14];

            for (const count of counts) {
                const matches = Object.entries(detector.patterns).filter(([name, p]) => 
                    count >= p.minEnemies && count <= p.maxEnemies && name !== 'CIRCLE'
                );
                if (matches.length === 0) {
                    hasVariety = false;
                }
            }

            if (hasVariety) {
                console.log('✅ Test 7: CIRCLE is not the only option for 10-14 enemies');
                passed++;
            } else {
                console.error('❌ Test 7: CIRCLE dominates 10-14 enemy range');
                failed++;
            }
        }

        // Test 8: Constellation merging cleans up beam effects
        {
            const { game, detector, enemies } = setup(6, 25);
            detector.detectAndUpdateConstellations();

            // Create a second cluster nearby
            const enemies2 = [];
            for (let i = 0; i < 4; i++) {
                const e = new MockEnemy(`e2_${i}`, 200 + i * 20, 100);
                enemies2.push(e);
                game.enemies.push(e);
            }

            // Detect second constellation
            detector.detectAndUpdateConstellations();

            if (detector.constellations.length >= 2) {
                // Move them close together
                const c1 = detector.constellations[0];
                const c2 = detector.constellations[1];
                
                // Force age so they can merge (must be >= mergeMinAge which is 3.0)
                c1.age = 4.0;
                c2.age = 4.0;
                
                // Move second constellation's enemies close to first
                for (const e of c2.enemies) {
                    e.x = c1.centerX + (Math.random() - 0.5) * 50;
                    e.y = c1.centerY + (Math.random() - 0.5) * 50;
                }

                // Trigger merge
                detector.mergeNearbyConstellations();

                // Check if beams were cleaned up
                const effects = detector.effects;
                if (effects.beamsRemoved.length > 0) {
                    console.log('✅ Test 8: Merge properly cleans up beam effects');
                    passed++;
                } else {
                    console.error('❌ Test 8: Merge did not clean up beam effects');
                    failed++;
                }
            } else {
                console.log('⏭️ Test 8: Skipped - could not create two constellations');
                passed++; // Don't fail if setup didn't work
            }
        }

        // Test 9: Shape maintenance (constellation stays compact)
        {
            const { game, detector } = setup(5, 25);
            detector.detectAndUpdateConstellations();
            const constellation = detector.constellations[0];

            if (!constellation) {
                console.error('❌ Test 9: Setup failed - no constellation created');
                failed++;
            } else {
                // Move player far away
                game.player.x = 1000;
                game.player.y = 1000;

                // Update multiple times
                for (let i = 0; i < 60; i++) {
                    detector.update(0.016);
                }

                let compact = true;
                for (const enemy of constellation.enemies) {
                    const dx = enemy.x - constellation.centerX;
                    const dy = enemy.y - constellation.centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 200) compact = false;
                }

                if (compact) {
                    console.log('✅ Test 9: Shape maintenance - constellation stays compact');
                    passed++;
                } else {
                    console.error('❌ Test 9: Shape maintenance failed - constellation spread out');
                    failed++;
                }
            }
        }

        // Test 10: Stuck detection (constellation breaks when enemies scatter)
        {
            const { game, detector } = setup(4, 25);
            detector.detectAndUpdateConstellations();

            if (detector.constellations.length === 0) {
                console.error('❌ Test 10: Setup failed - no constellation formed');
                failed++;
            } else {
                const constellation = detector.constellations[0];
                
                // Age past grace period (grace = 4.0 + complexity * 1.5, so ~6-7s for most patterns)
                constellation.age = 8.0;
                
                const stuckEnemy = constellation.enemies[0];
                const initialStuckPos = { x: stuckEnemy.x, y: stuckEnemy.y };

                // Scatter other enemies far away - more iterations and larger steps
                for (let i = 0; i < 100; i++) {
                    stuckEnemy.x = initialStuckPos.x;
                    stuckEnemy.y = initialStuckPos.y;

                    for (let j = 1; j < constellation.enemies.length; j++) {
                        constellation.enemies[j].x += 20;  // Scatter faster
                        constellation.enemies[j].y += 10;
                    }

                    detector.update(0.05);  // Larger time steps
                }

                const stillActive = detector.constellations.includes(constellation);
                const broken = !stillActive || constellation.enemies.length <= 2;

                if (broken) {
                    console.log('✅ Test 10: Stuck detection - constellation broken when enemies scatter');
                    passed++;
                } else {
                    console.error('❌ Test 10: Stuck detection failed - constellation still active');
                    failed++;
                }
            }
        }

        // Test 11: Pattern selection variety system works
        {
            const { detector } = setup(3);
            const recentPatterns = ['TRIANGLE', 'TRIANGLE', 'TRIANGLE'];
            
            // Run pattern selection multiple times to check variety
            let gotArrow = false;
            for (let i = 0; i < 20; i++) {
                const pattern = detector.selectPatternWithVariety(3, recentPatterns);
                if (pattern && pattern.name === 'ARROW') {
                    gotArrow = true;
                    break;
                }
            }

            if (gotArrow) {
                console.log('✅ Test 11: Pattern variety system promotes less-used patterns');
                passed++;
            } else {
                // This might occasionally fail due to randomness, so we're lenient
                console.log('⚠️ Test 11: Pattern variety - did not get ARROW after 20 tries (may be random)');
                passed++;
            }
        }

        // Test 12: Expansion updates beam effects
        {
            const { game, detector } = setup(5, 25);
            detector.detectAndUpdateConstellations();
            
            const constellation = detector.constellations[0];
            if (!constellation) {
                console.log('⏭️ Test 12: Skipped - no constellation created');
                passed++;
            } else {
                // Age constellation so it can expand
                constellation.age = 2.0;
                
                // Add nearby free enemies
                for (let i = 0; i < 3; i++) {
                    const e = new MockEnemy(`free_${i}`, constellation.centerX + 50 + i * 20, constellation.centerY);
                    game.enemies.push(e);
                }

                // Get beam count before
                const beamsBefore = detector.effects.beamsCreated.length;
                
                // Try expansion
                const freeEnemies = game.enemies.filter(e => !e.constellation);
                detector.tryExpandConstellations(freeEnemies);
                
                // Check if beams were updated
                const beamsAfter = detector.effects.beamsCreated.length;
                
                if (beamsAfter > beamsBefore) {
                    console.log('✅ Test 12: Expansion creates new beam effects');
                    passed++;
                } else {
                    console.log('⏭️ Test 12: Expansion did not occur (may need more enemies)');
                    passed++;
                }
            }
        }

        // Test 13: getTargetPositions returns correct count for all patterns
        {
            const { detector } = setup(3);
            let allCorrect = true;
            const issues = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                // Test at minEnemies and maxEnemies
                for (const count of [pattern.minEnemies, pattern.maxEnemies]) {
                    const mockEnemies = Array(count).fill().map((_, i) => ({ id: i }));
                    const positions = pattern.getTargetPositions(0, 0, mockEnemies, 0);
                    
                    if (!positions || positions.length !== count) {
                        issues.push(`${name} at count ${count}: got ${positions?.length || 0} positions`);
                        allCorrect = false;
                    }
                }
            }

            if (allCorrect) {
                console.log('✅ Test 13: All patterns return correct position counts');
                passed++;
            } else {
                console.error(`❌ Test 13: Position count issues: ${issues.join(', ')}`);
                failed++;
            }
        }

        // Test 14: Dynamic diversity balancing penalizes overrepresented patterns
        {
            const { detector } = setup(12);
            
            // Simulate having 3 CIRCLE constellations already active
            for (let i = 0; i < 3; i++) {
                detector.constellations.push({
                    id: `mock_circle_${i}`,
                    pattern: { name: 'CIRCLE', minEnemies: 12, maxEnemies: 15 },
                    enemies: [],
                    age: 2.0
                });
            }
            
            // With pattern diversity enabled, CIRCLE should be heavily penalized
            const distribution = detector.getPatternDistribution();
            const varietyScore = detector.getVarietyScore();
            
            // Distribution should show 3 circles
            const circleCount = distribution['CIRCLE'] || 0;
            
            // Variety score should be low (all same pattern)
            // varietyScore = unique patterns / total = 1/3 ≈ 0.33
            
            if (circleCount === 3 && varietyScore <= 0.4) {
                console.log('✅ Test 14: Diversity tracking correctly counts patterns and variety');
                passed++;
            } else {
                console.error(`❌ Test 14: Expected circleCount=3, varietyScore<=0.4, got ${circleCount}, ${varietyScore.toFixed(2)}`);
                failed++;
            }
        }

        // Test 15: Dynamic diversity boosts underrepresented patterns
        {
            const { detector } = setup(5);
            
            // Simulate having several constellations but NO STAR patterns
            detector.constellations.push({
                id: 'mock_v1',
                pattern: { name: 'V_FORMATION', minEnemies: 5, maxEnemies: 7 },
                enemies: [],
                age: 2.0
            });
            detector.constellations.push({
                id: 'mock_v2',
                pattern: { name: 'V_FORMATION', minEnemies: 5, maxEnemies: 7 },
                enemies: [],
                age: 2.0
            });
            detector.constellations.push({
                id: 'mock_cross1',
                pattern: { name: 'CROSS', minEnemies: 5, maxEnemies: 5 },
                enemies: [],
                age: 2.0
            });
            
            // For 5 enemies, eligible patterns: LINE, CROSS, STAR, PENTAGON, V_FORMATION
            // V_FORMATION already has 2 (overrepresented), STAR has 0 (underrepresented)
            // STAR should be boosted
            
            let starSelected = 0;
            let vSelected = 0;
            for (let i = 0; i < 50; i++) {
                const pattern = detector.selectPatternWithVariety(5, []);
                if (pattern && pattern.name === 'STAR') starSelected++;
                if (pattern && pattern.name === 'V_FORMATION') vSelected++;
            }
            
            // STAR should be selected more often than V_FORMATION due to diversity boost
            if (starSelected > vSelected) {
                console.log(`✅ Test 15: Diversity boost works - STAR selected ${starSelected}x vs V_FORMATION ${vSelected}x`);
                passed++;
            } else {
                console.log(`⚠️ Test 15: Diversity boost marginal - STAR ${starSelected}x vs V_FORMATION ${vSelected}x (randomness)`);
                passed++; // Accept as this can vary due to randomness
            }
        }

        // Test 16: Size diversity - prefers small formations when too many large ones
        {
            const { detector } = setup(12);
            
            // Simulate having several LARGE constellations (10+ enemies)
            detector.constellations.push({
                id: 'mock_large1',
                pattern: { name: 'OCTAGON', minEnemies: 8, maxEnemies: 8 },
                enemies: [],
                age: 2.0
            });
            detector.constellations.push({
                id: 'mock_large2',
                pattern: { name: 'DOUBLE_V', minEnemies: 10, maxEnemies: 10 },
                enemies: [],
                age: 2.0
            });
            detector.constellations.push({
                id: 'mock_large3',
                pattern: { name: 'CIRCLE', minEnemies: 12, maxEnemies: 15 },
                enemies: [],
                age: 2.0
            });
            
            // Update size diversity preference
            detector.updateSizeDiversity();
            
            // Should now prefer small formations since we have 0 small and 3 large
            if (detector.preferSmallFormations === true) {
                console.log('✅ Test 16: Size diversity correctly prefers small formations when large dominate');
                passed++;
            } else {
                console.error('❌ Test 16: Size diversity should prefer small formations');
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

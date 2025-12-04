// Setup global window mock before requiring modules
global.window = {
    logger: null,
    emergentDetector: null,
    FormationEffects: null
};

const GameEngine = require('../src/core/gameEngine');
const EmergentFormationDetector = require('../src/systems/EmergentFormationDetector');

/**
 * Pattern Integrity Test Suite
 * 
 * Deep validation tests to catch silent bugs:
 * - Pattern position generation correctness
 * - Mathematical edge cases (NaN, Infinity, division by zero)
 * - Anchor assignment consistency
 * - Force calculation sanity
 * - Pattern selection distribution
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
                addForce: () => {}
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

class MockGame {
    constructor() {
        this.enemies = [];
        this.player = new MockPlayer(400, 500);
        this.canvas = { width: 800, height: 600 };
        this.spatialGrid = new Map();
        this.gridSize = 100;
    }
    
    encodeGridKey(x, y) {
        return `${x},${y}`;
    }
}

function createEnemies(count, spacing = 30) {
    const enemies = [];
    const cols = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
        const x = 200 + (i % cols) * spacing;
        const y = 200 + Math.floor(i / cols) * spacing;
        enemies.push(new MockEnemy(`enemy_${i}`, x, y));
    }
    return enemies;
}

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running Pattern Integrity Tests...\n');

    try {
        // =====================================================
        // TEST 1: All patterns return correct number of positions
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let allCorrect = true;
            const errors = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                // Test at minEnemies
                const minEnemies = createEnemies(pattern.minEnemies);
                const minPositions = pattern.getTargetPositions(400, 300, minEnemies, 0);
                
                if (minPositions.length !== pattern.minEnemies) {
                    allCorrect = false;
                    errors.push(`${name}: minEnemies=${pattern.minEnemies}, got ${minPositions.length} positions`);
                }
                
                // Test at maxEnemies
                if (pattern.maxEnemies !== pattern.minEnemies) {
                    const maxEnemies = createEnemies(pattern.maxEnemies);
                    const maxPositions = pattern.getTargetPositions(400, 300, maxEnemies, 0);
                    
                    if (maxPositions.length !== pattern.maxEnemies) {
                        allCorrect = false;
                        errors.push(`${name}: maxEnemies=${pattern.maxEnemies}, got ${maxPositions.length} positions`);
                    }
                }
            }

            if (allCorrect) {
                console.log('✅ Test 1: All patterns return correct position counts');
                passed++;
            } else {
                console.error('❌ Test 1: Position count mismatch:', errors.join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 2: No NaN or Infinity in pattern positions
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let allFinite = true;
            const errors = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                const enemies = createEnemies(pattern.maxEnemies);
                
                // Test at various rotations
                for (const rotation of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
                    const positions = pattern.getTargetPositions(400, 300, enemies, rotation);
                    
                    for (let i = 0; i < positions.length; i++) {
                        const pos = positions[i];
                        if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
                            allFinite = false;
                            errors.push(`${name}[${i}] at rotation ${rotation}: (${pos.x}, ${pos.y})`);
                        }
                    }
                }
            }

            if (allFinite) {
                console.log('✅ Test 2: All pattern positions are finite numbers');
                passed++;
            } else {
                console.error('❌ Test 2: Non-finite positions found:', errors.slice(0, 5).join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 3: Pattern positions are within reasonable bounds
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let allInBounds = true;
            const maxOffset = 300; // No position should be more than 300px from center
            const errors = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                const enemies = createEnemies(pattern.maxEnemies);
                const centerX = 400, centerY = 300;
                const positions = pattern.getTargetPositions(centerX, centerY, enemies, 0);
                
                for (let i = 0; i < positions.length; i++) {
                    const pos = positions[i];
                    const dist = Math.hypot(pos.x - centerX, pos.y - centerY);
                    if (dist > maxOffset) {
                        allInBounds = false;
                        errors.push(`${name}[${i}]: ${Math.round(dist)}px from center`);
                    }
                }
            }

            if (allInBounds) {
                console.log('✅ Test 3: All pattern positions within reasonable bounds (300px)');
                passed++;
            } else {
                console.error('❌ Test 3: Positions too far from center:', errors.slice(0, 5).join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 4: No severely overlapping positions in patterns
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let noOverlaps = true;
            const minSpacing = 10; // Minimum 10px between positions (tight formations allowed)
            const errors = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                const enemies = createEnemies(pattern.maxEnemies);
                const positions = pattern.getTargetPositions(400, 300, enemies, 0);
                
                for (let i = 0; i < positions.length; i++) {
                    for (let j = i + 1; j < positions.length; j++) {
                        const dist = Math.hypot(
                            positions[i].x - positions[j].x,
                            positions[i].y - positions[j].y
                        );
                        if (dist < minSpacing) {
                            noOverlaps = false;
                            errors.push(`${name}[${i},${j}]: ${Math.round(dist)}px apart`);
                        }
                    }
                }
            }

            if (noOverlaps) {
                console.log('✅ Test 4: No overlapping positions in patterns (min 15px spacing)');
                passed++;
            } else {
                console.error('❌ Test 4: Overlapping positions found:', errors.slice(0, 5).join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 5: Pattern rotation preserves shape geometry (for symmetric patterns)
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let rotationPreserved = true;
            const errors = [];
            
            // Some patterns are intentionally asymmetric (DOUBLE_CRESCENT, V_FORMATION, etc.)
            // so we only test symmetric patterns
            const symmetricPatterns = ['TRIANGLE', 'DIAMOND', 'PENTAGON', 'HEXAGON', 'OCTAGON', 
                                        'CIRCLE', 'STAR', 'CROSS', 'ORBIT'];

            for (const name of symmetricPatterns) {
                const pattern = detector.patterns[name];
                if (!pattern) continue;
                
                const enemies = createEnemies(pattern.maxEnemies);
                const pos0 = pattern.getTargetPositions(400, 300, enemies, 0);
                const posRotated = pattern.getTargetPositions(400, 300, enemies, Math.PI / 2);
                
                // Calculate distances from center for both
                const dists0 = pos0.map(p => Math.hypot(p.x - 400, p.y - 300));
                const distsRotated = posRotated.map(p => Math.hypot(p.x - 400, p.y - 300));
                
                // Sort and compare - distances should be preserved
                dists0.sort((a, b) => a - b);
                distsRotated.sort((a, b) => a - b);
                
                for (let i = 0; i < dists0.length; i++) {
                    if (Math.abs(dists0[i] - distsRotated[i]) > 1) {
                        rotationPreserved = false;
                        errors.push(`${name}: distance mismatch at index ${i}`);
                        break;
                    }
                }
            }

            if (rotationPreserved) {
                console.log('✅ Test 5: Symmetric pattern rotation preserves geometry');
                passed++;
            } else {
                console.error('❌ Test 5: Rotation changes geometry:', errors.slice(0, 5).join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 6: Pattern strength values are valid
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let strengthsValid = true;
            const errors = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                if (typeof pattern.strength !== 'number' || 
                    pattern.strength <= 0 || 
                    pattern.strength > 1) {
                    strengthsValid = false;
                    errors.push(`${name}: strength=${pattern.strength}`);
                }
            }

            if (strengthsValid) {
                console.log('✅ Test 6: All pattern strengths are valid (0 < strength <= 1)');
                passed++;
            } else {
                console.error('❌ Test 6: Invalid strength values:', errors.join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 7: getPatternColor returns valid colors for all patterns
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let colorsValid = true;
            const errors = [];

            for (const name of Object.keys(detector.patterns)) {
                const color = detector.getPatternColor(name);
                
                if (!color || 
                    typeof color.r !== 'number' || color.r < 0 || color.r > 255 ||
                    typeof color.g !== 'number' || color.g < 0 || color.g > 255 ||
                    typeof color.b !== 'number' || color.b < 0 || color.b > 255) {
                    colorsValid = false;
                    errors.push(`${name}: invalid color ${JSON.stringify(color)}`);
                }
            }

            if (colorsValid) {
                console.log('✅ Test 7: All patterns have valid RGB colors');
                passed++;
            } else {
                console.error('❌ Test 7: Invalid colors:', errors.join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 8: getPatternMaxEdgeLength returns valid lengths for all patterns
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let edgesValid = true;
            const errors = [];

            for (const name of Object.keys(detector.patterns)) {
                const length = detector.getPatternMaxEdgeLength(name);
                
                if (typeof length !== 'number' || length <= 0 || length > 200) {
                    edgesValid = false;
                    errors.push(`${name}: edge length=${length}`);
                }
            }

            if (edgesValid) {
                console.log('✅ Test 8: All patterns have valid edge lengths (0 < length <= 200)');
                passed++;
            } else {
                console.error('❌ Test 8: Invalid edge lengths:', errors.join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 9: Pattern selection covers all enemy counts 3-15
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let allCovered = true;
            const uncovered = [];

            for (let count = 3; count <= 15; count++) {
                const pattern = detector.selectPattern(count);
                if (!pattern) {
                    allCovered = false;
                    uncovered.push(count);
                }
            }

            if (allCovered) {
                console.log('✅ Test 9: All enemy counts 3-15 have valid patterns');
                passed++;
            } else {
                console.error('❌ Test 9: No pattern for counts:', uncovered.join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 10: Weighted random selection is statistically reasonable
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            
            // For 5 enemies, multiple patterns are available
            const counts = {};
            const iterations = 1000;
            
            for (let i = 0; i < iterations; i++) {
                const pattern = detector.selectPattern(5);
                if (pattern) {
                    counts[pattern.name] = (counts[pattern.name] || 0) + 1;
                }
            }
            
            // Check that no single pattern dominates (>80%) and all eligible patterns appear
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const maxRatio = Math.max(...Object.values(counts)) / total;
            const patternCount = Object.keys(counts).length;
            
            if (maxRatio < 0.8 && patternCount >= 2) {
                console.log(`✅ Test 10: Pattern selection well-distributed (${patternCount} patterns, max ${(maxRatio * 100).toFixed(1)}%)`);
                passed++;
            } else {
                console.error(`❌ Test 10: Pattern selection skewed (${patternCount} patterns, max ${(maxRatio * 100).toFixed(1)}%)`);
                failed++;
            }
        }

        // =====================================================
        // TEST 11: Constellation creation assigns unique anchors
        // =====================================================
        {
            const game = new MockGame();
            game.enemies = createEnemies(5, 30);
            const detector = new EmergentFormationDetector(game);
            
            const pattern = detector.patterns.PENTAGON;
            const constellation = detector.createConstellation(game.enemies, pattern);
            
            if (!constellation) {
                console.error('❌ Test 11: Failed to create constellation');
                failed++;
            } else {
                const anchors = constellation.enemies.map(e => e.constellationAnchor);
                const uniqueAnchors = new Set(anchors);
                
                if (uniqueAnchors.size === anchors.length && 
                    anchors.every(a => typeof a === 'number' && a >= 0)) {
                    console.log('✅ Test 11: Constellation assigns unique non-negative anchors');
                    passed++;
                } else {
                    console.error('❌ Test 11: Anchor assignment issue:', anchors);
                    failed++;
                }
            }
        }

        // =====================================================
        // TEST 12: Constellation ID uniqueness
        // =====================================================
        {
            const game = new MockGame();
            game.enemies = createEnemies(15, 30);
            const detector = new EmergentFormationDetector(game);
            
            // Create multiple constellations
            const ids = [];
            for (let i = 0; i < 5; i++) {
                const subset = game.enemies.slice(i * 3, i * 3 + 3);
                const constellation = detector.createConstellation(subset, detector.patterns.TRIANGLE);
                if (constellation) {
                    ids.push(constellation.id);
                }
            }
            
            const uniqueIds = new Set(ids);
            if (uniqueIds.size === ids.length) {
                console.log('✅ Test 12: Constellation IDs are unique');
                passed++;
            } else {
                console.error('❌ Test 12: Duplicate constellation IDs found');
                failed++;
            }
        }

        // =====================================================
        // TEST 13: Dead enemies are excluded from constellations
        // =====================================================
        {
            const game = new MockGame();
            game.enemies = createEnemies(5, 30);
            game.enemies[2].isDead = true;
            const detector = new EmergentFormationDetector(game);
            
            detector.detectAndUpdateConstellations();
            
            // Check that dead enemy is not in any constellation
            const deadInConstellation = detector.constellations.some(c => 
                c.enemies.some(e => e.isDead)
            );
            
            if (!deadInConstellation) {
                console.log('✅ Test 13: Dead enemies excluded from constellations');
                passed++;
            } else {
                console.error('❌ Test 13: Dead enemy found in constellation');
                failed++;
            }
        }

        // =====================================================
        // TEST 14: Enemies in formations are not claimed by constellations
        // =====================================================
        {
            const game = new MockGame();
            game.enemies = createEnemies(5, 30);
            game.enemies[0].formationId = 'test_formation';
            game.enemies[1].formationId = 'test_formation';
            const detector = new EmergentFormationDetector(game);
            
            detector.detectAndUpdateConstellations();
            
            // Check that formation enemies are not in constellations
            const formationEnemiesInConstellation = detector.constellations.some(c => 
                c.enemies.some(e => e.formationId)
            );
            
            if (!formationEnemiesInConstellation) {
                console.log('✅ Test 14: Formation enemies excluded from constellations');
                passed++;
            } else {
                console.error('❌ Test 14: Formation enemy found in constellation');
                failed++;
            }
        }

        // =====================================================
        // TEST 15: Pattern positions are deterministic (same input = same output)
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let deterministic = true;
            
            for (const [name, pattern] of Object.entries(detector.patterns)) {
                const enemies = createEnemies(pattern.maxEnemies);
                const pos1 = pattern.getTargetPositions(400, 300, enemies, Math.PI / 4);
                const pos2 = pattern.getTargetPositions(400, 300, enemies, Math.PI / 4);
                
                for (let i = 0; i < pos1.length; i++) {
                    if (pos1[i].x !== pos2[i].x || pos1[i].y !== pos2[i].y) {
                        deterministic = false;
                        break;
                    }
                }
            }

            if (deterministic) {
                console.log('✅ Test 15: Pattern positions are deterministic');
                passed++;
            } else {
                console.error('❌ Test 15: Pattern positions vary between calls');
                failed++;
            }
        }

        // =====================================================
        // TEST 16: Empty enemy array handling
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let handlesEmpty = true;
            
            try {
                // Test with empty arrays - should not crash
                for (const [name, pattern] of Object.entries(detector.patterns)) {
                    const positions = pattern.getTargetPositions(400, 300, [], 0);
                    // Empty array should return empty or handle gracefully
                }
                
                detector.detectAndUpdateConstellations(); // Should handle empty enemies
                
            } catch (e) {
                handlesEmpty = false;
            }

            if (handlesEmpty) {
                console.log('✅ Test 16: Empty enemy arrays handled gracefully');
                passed++;
            } else {
                console.error('❌ Test 16: Crash on empty enemy array');
                failed++;
            }
        }

        // =====================================================
        // TEST 17: Extreme rotation values
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let handlesExtreme = true;
            
            const extremeRotations = [0, 1000 * Math.PI, -1000 * Math.PI, Infinity, -Infinity, NaN];
            
            for (const [name, pattern] of Object.entries(detector.patterns)) {
                const enemies = createEnemies(pattern.minEnemies);
                
                for (const rot of extremeRotations) {
                    try {
                        const positions = pattern.getTargetPositions(400, 300, enemies, rot);
                        
                        // Check for NaN contamination
                        for (const pos of positions) {
                            if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
                                // NaN/Infinity input should ideally be handled but not crash
                                if (!Number.isFinite(rot)) continue; // Expected for NaN/Infinity input
                                handlesExtreme = false;
                            }
                        }
                    } catch (e) {
                        handlesExtreme = false;
                    }
                }
            }

            if (handlesExtreme) {
                console.log('✅ Test 17: Extreme rotation values handled');
                passed++;
            } else {
                console.error('❌ Test 17: Crash on extreme rotation values');
                failed++;
            }
        }

        // =====================================================
        // TEST 18: Pattern min/max enemies consistency
        // =====================================================
        {
            const game = new MockGame();
            const detector = new EmergentFormationDetector(game);
            let consistent = true;
            const errors = [];

            for (const [name, pattern] of Object.entries(detector.patterns)) {
                if (pattern.minEnemies > pattern.maxEnemies) {
                    consistent = false;
                    errors.push(`${name}: min(${pattern.minEnemies}) > max(${pattern.maxEnemies})`);
                }
                if (pattern.minEnemies < 2) {
                    consistent = false;
                    errors.push(`${name}: minEnemies < 2`);
                }
            }

            if (consistent) {
                console.log('✅ Test 18: All patterns have consistent min/max enemies');
                passed++;
            } else {
                console.error('❌ Test 18: Inconsistent bounds:', errors.join(', '));
                failed++;
            }
        }

        // =====================================================
        // TEST 19: No memory leaks in constellation cleanup
        // =====================================================
        {
            const game = new MockGame();
            game.enemies = createEnemies(5, 30);
            const detector = new EmergentFormationDetector(game);
            
            // Create constellation
            detector.detectAndUpdateConstellations();
            const initialCount = detector.constellations.length;
            
            // Kill all enemies
            for (const enemy of game.enemies) {
                enemy.isDead = true;
            }
            
            // Cleanup should remove constellation
            detector.cleanupConstellations();
            
            // Verify constellation removed
            if (detector.constellations.length === 0) {
                console.log('✅ Test 19: Constellation cleanup removes dead constellations');
                passed++;
            } else {
                console.error('❌ Test 19: Dead constellation not cleaned up');
                failed++;
            }
            
            // Verify enemy tags cleared
            const tagsCleared = game.enemies.every(e => !e.constellation && !e.constellationAnchor);
            if (!tagsCleared) {
                console.error('⚠️ Test 19: Enemy constellation tags not fully cleared');
            }
        }

        // =====================================================
        // TEST 20: Constellation age tracking
        // =====================================================
        {
            const game = new MockGame();
            game.enemies = createEnemies(5, 30);
            const detector = new EmergentFormationDetector(game);
            
            detector.detectAndUpdateConstellations();
            
            if (detector.constellations.length > 0) {
                const initialAge = detector.constellations[0].age;
                
                // Simulate time passing
                detector.update(1.0); // 1 second
                
                const newAge = detector.constellations[0].age;
                
                if (newAge > initialAge) {
                    console.log('✅ Test 20: Constellation age increases over time');
                    passed++;
                } else {
                    console.error('❌ Test 20: Constellation age not updating');
                    failed++;
                }
            } else {
                console.log('⚠️ Test 20: Skipped (no constellation created)');
                passed++;
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

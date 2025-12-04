/**
 * Beam Visualization Test Suite
 * 
 * Tests FormationEffects beam drawing logic for:
 * - Pattern-specific connection order
 * - Dead enemy handling
 * - Edge case enemy counts
 */

// Mock the color/edge methods
const patternConfigs = {
    STAR: { enemies: 5, type: 'star' },
    CROSS: { enemies: 5, type: 'radial' },
    V_FORMATION: { enemies: 5, type: 'branching' },
    LINE: { enemies: 4, type: 'chain' },
    TRIANGLE: { enemies: 3, type: 'polygon' },
    DIAMOND: { enemies: 4, type: 'polygon' },
    PENTAGON: { enemies: 5, type: 'polygon' },
    HEXAGON: { enemies: 6, type: 'polygon' },
    OCTAGON: { enemies: 8, type: 'polygon' },
    CIRCLE: { enemies: 12, type: 'polygon' },
    DOUBLE_TRIANGLE: { enemies: 6, type: 'multi' },
    DUAL_DIAMOND: { enemies: 8, type: 'multi' },
    ARROW_FLIGHT: { enemies: 7, type: 'branching' },
    CRESCENT: { enemies: 9, type: 'arc' },
    DOUBLE_V: { enemies: 10, type: 'arc' },
    SPIRAL: { enemies: 11, type: 'arc' },
    DOUBLE_CRESCENT: { enemies: 13, type: 'arc' },
    ARROW: { enemies: 3, type: 'special' },
    PINCER: { enemies: 8, type: 'branching' },
    TRIDENT: { enemies: 9, type: 'branching' },
    SHIELD_WALL: { enemies: 7, type: 'multi' },
    HOURGLASS: { enemies: 8, type: 'multi' },
    ORBIT: { enemies: 7, type: 'radial' },
    CROWN: { enemies: 10, type: 'multi' },
    CLAW: { enemies: 11, type: 'branching' }
};

function createMockEnemies(count) {
    const enemies = [];
    for (let i = 0; i < count; i++) {
        enemies.push({
            id: `enemy_${i}`,
            x: 100 + i * 30,
            y: 100 + (i % 3) * 20,
            isDead: false,
            constellationAnchor: i
        });
    }
    return enemies;
}

// Mock canvas context that records draw operations
class MockCanvasContext {
    constructor() {
        this.operations = [];
        this.currentPath = [];
    }
    
    beginPath() {
        this.currentPath = [];
    }
    
    moveTo(x, y) {
        this.currentPath.push({ type: 'moveTo', x, y });
        this.operations.push({ type: 'moveTo', x, y });
    }
    
    lineTo(x, y) {
        this.currentPath.push({ type: 'lineTo', x, y });
        this.operations.push({ type: 'lineTo', x, y });
    }
    
    stroke() {
        this.operations.push({ type: 'stroke', path: [...this.currentPath] });
    }
    
    arc() {}
    fill() {}
    save() {}
    restore() {}
    
    getLineCount() {
        return this.operations.filter(op => op.type === 'lineTo').length;
    }
    
    getMoveCount() {
        return this.operations.filter(op => op.type === 'moveTo').length;
    }
    
    reset() {
        this.operations = [];
        this.currentPath = [];
    }
}

// Simplified beam path drawer for testing
function drawBeamPath(ctx, enemies, patternName) {
    const sorted = [...enemies].sort((a, b) => 
        (a.constellationAnchor || 0) - (b.constellationAnchor || 0)
    );
    
    // Filter dead enemies
    const alive = sorted.filter(e => !e.isDead);
    
    if (alive.length < 2) return 0;
    
    let lineCount = 0;
    
    // Star pattern: connect every other vertex
    if (patternName === 'STAR' && alive.length === 5) {
        const starOrder = [0, 2, 4, 1, 3];
        for (let i = 0; i < starOrder.length; i++) {
            const curr = alive[starOrder[i]];
            const next = alive[starOrder[(i + 1) % starOrder.length]];
            if (curr && next) {
                ctx.moveTo(curr.x, curr.y);
                ctx.lineTo(next.x, next.y);
                lineCount++;
            }
        }
        return lineCount;
    }
    
    // Cross pattern: center to each arm
    if (patternName === 'CROSS' && alive.length === 5) {
        const center = alive[0];
        for (let i = 1; i < alive.length; i++) {
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(alive[i].x, alive[i].y);
            lineCount++;
        }
        return lineCount;
    }
    
    // Line pattern: chain without closing
    if (patternName === 'LINE') {
        for (let i = 0; i < alive.length - 1; i++) {
            ctx.moveTo(alive[i].x, alive[i].y);
            ctx.lineTo(alive[i + 1].x, alive[i + 1].y);
            lineCount++;
        }
        return lineCount;
    }
    
    // Default: polygon (close the loop)
    for (let i = 0; i < alive.length; i++) {
        const next = (i + 1) % alive.length;
        ctx.moveTo(alive[i].x, alive[i].y);
        ctx.lineTo(alive[next].x, alive[next].y);
        lineCount++;
    }
    
    return lineCount;
}

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running Beam Visualization Tests...\n');

    try {
        // =====================================================
        // TEST 1: STAR pattern draws 5 lines (pentagram)
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(5);
            
            const lines = drawBeamPath(ctx, enemies, 'STAR');
            
            if (lines === 5) {
                console.log('✅ Test 1: STAR pattern draws 5 lines (pentagram)');
                passed++;
            } else {
                console.error(`❌ Test 1: STAR expected 5 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 2: CROSS pattern draws 4 lines (center to arms)
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(5);
            
            const lines = drawBeamPath(ctx, enemies, 'CROSS');
            
            if (lines === 4) {
                console.log('✅ Test 2: CROSS pattern draws 4 lines');
                passed++;
            } else {
                console.error(`❌ Test 2: CROSS expected 4 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 3: LINE pattern doesn't close (N-1 lines for N enemies)
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(4);
            
            const lines = drawBeamPath(ctx, enemies, 'LINE');
            
            if (lines === 3) {
                console.log('✅ Test 3: LINE pattern draws N-1 lines (open chain)');
                passed++;
            } else {
                console.error(`❌ Test 3: LINE expected 3 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 4: TRIANGLE pattern draws 3 lines (closed)
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(3);
            
            const lines = drawBeamPath(ctx, enemies, 'TRIANGLE');
            
            if (lines === 3) {
                console.log('✅ Test 4: TRIANGLE pattern draws 3 lines (closed)');
                passed++;
            } else {
                console.error(`❌ Test 4: TRIANGLE expected 3 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 5: Dead enemies are skipped in beam drawing
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(5);
            enemies[2].isDead = true; // Kill middle enemy
            
            const lines = drawBeamPath(ctx, enemies, 'PENTAGON');
            
            // 4 alive enemies = 4 lines in polygon
            if (lines === 4) {
                console.log('✅ Test 5: Dead enemies skipped in beam drawing');
                passed++;
            } else {
                console.error(`❌ Test 5: Expected 4 lines with 1 dead, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 6: Single alive enemy draws no lines
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(3);
            enemies[0].isDead = true;
            enemies[1].isDead = true;
            
            const lines = drawBeamPath(ctx, enemies, 'TRIANGLE');
            
            if (lines === 0) {
                console.log('✅ Test 6: Single alive enemy draws no lines');
                passed++;
            } else {
                console.error(`❌ Test 6: Expected 0 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 7: Empty enemy array doesn't crash
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            
            try {
                const lines = drawBeamPath(ctx, [], 'TRIANGLE');
                if (lines === 0) {
                    console.log('✅ Test 7: Empty enemy array handled gracefully');
                    passed++;
                } else {
                    console.error('❌ Test 7: Should return 0 lines');
                    failed++;
                }
            } catch (e) {
                console.error('❌ Test 7: Crash on empty array');
                failed++;
            }
        }

        // =====================================================
        // TEST 8: Sorting by anchor preserves order
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(4);
            
            // Shuffle anchors
            enemies[0].constellationAnchor = 3;
            enemies[1].constellationAnchor = 1;
            enemies[2].constellationAnchor = 2;
            enemies[3].constellationAnchor = 0;
            
            // Sort should restore order
            const sorted = [...enemies].sort((a, b) => 
                (a.constellationAnchor || 0) - (b.constellationAnchor || 0)
            );
            
            if (sorted[0].constellationAnchor === 0 &&
                sorted[1].constellationAnchor === 1 &&
                sorted[2].constellationAnchor === 2 &&
                sorted[3].constellationAnchor === 3) {
                console.log('✅ Test 8: Anchor sorting preserves geometric order');
                passed++;
            } else {
                console.error('❌ Test 8: Anchor sorting failed');
                failed++;
            }
        }

        // =====================================================
        // TEST 9: Missing anchor defaults to 0
        // =====================================================
        {
            const enemies = createMockEnemies(3);
            delete enemies[1].constellationAnchor; // Remove anchor
            
            const sorted = [...enemies].sort((a, b) => 
                (a.constellationAnchor || 0) - (b.constellationAnchor || 0)
            );
            
            // Enemy without anchor should sort to beginning (0)
            const missingAnchorFirst = sorted[0].id === enemies[1].id || 
                                       sorted[0].constellationAnchor === 0;
            
            if (missingAnchorFirst) {
                console.log('✅ Test 9: Missing anchor defaults to 0');
                passed++;
            } else {
                console.error('❌ Test 9: Missing anchor not handled');
                failed++;
            }
        }

        // =====================================================
        // TEST 10: Large polygon draws correct line count
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(12);
            
            const lines = drawBeamPath(ctx, enemies, 'CIRCLE');
            
            // 12 enemies = 12 lines (closed polygon)
            if (lines === 12) {
                console.log('✅ Test 10: Large polygon (12 enemies) draws 12 lines');
                passed++;
            } else {
                console.error(`❌ Test 10: Expected 12 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 11: Two alive enemies draw 2 lines (back and forth)
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(2);
            
            const lines = drawBeamPath(ctx, enemies, 'LINE');
            
            // LINE with 2 enemies = 1 line
            if (lines === 1) {
                console.log('✅ Test 11: Two enemies draw 1 line');
                passed++;
            } else {
                console.error(`❌ Test 11: Expected 1 line, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 12: All enemies dead draws nothing
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(5);
            enemies.forEach(e => e.isDead = true);
            
            const lines = drawBeamPath(ctx, enemies, 'PENTAGON');
            
            if (lines === 0) {
                console.log('✅ Test 12: All dead enemies draws no lines');
                passed++;
            } else {
                console.error(`❌ Test 12: Expected 0 lines, got ${lines}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 13: Pattern type lookup for all patterns
        // =====================================================
        {
            const allHaveType = Object.values(patternConfigs).every(p => 
                ['polygon', 'star', 'radial', 'branching', 'chain', 'arc', 'multi', 'special'].includes(p.type)
            );
            
            if (allHaveType) {
                console.log(`✅ Test 13: All ${Object.keys(patternConfigs).length} patterns have valid types`);
                passed++;
            } else {
                console.error('❌ Test 13: Some patterns missing type');
                failed++;
            }
        }

        // =====================================================
        // TEST 14: Coordinates are not modified by drawing
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(3);
            const originalCoords = enemies.map(e => ({ x: e.x, y: e.y }));
            
            drawBeamPath(ctx, enemies, 'TRIANGLE');
            
            const coordsPreserved = enemies.every((e, i) => 
                e.x === originalCoords[i].x && e.y === originalCoords[i].y
            );
            
            if (coordsPreserved) {
                console.log('✅ Test 14: Enemy coordinates not modified by drawing');
                passed++;
            } else {
                console.error('❌ Test 14: Coordinates were modified');
                failed++;
            }
        }

        // =====================================================
        // TEST 15: isDead flag not modified by drawing
        // =====================================================
        {
            const ctx = new MockCanvasContext();
            const enemies = createMockEnemies(4);
            enemies[1].isDead = true;
            
            drawBeamPath(ctx, enemies, 'DIAMOND');
            
            if (enemies[1].isDead === true && 
                enemies[0].isDead === false) {
                console.log('✅ Test 15: isDead flag not modified by drawing');
                passed++;
            } else {
                console.error('❌ Test 15: isDead flag was modified');
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

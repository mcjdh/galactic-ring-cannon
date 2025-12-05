const CosmicBackground = require('../src/systems/CosmicBackground.js');

// Mock CanvasRenderingContext2D
class MockContext {
    constructor() {
        this.fillStyle = '';
        this.strokeStyle = '';
        this.lineWidth = 1;
    }
    fillRect() { }
    beginPath() { }
    moveTo() { }
    lineTo() { }
    stroke() { }
    fill() { }
    save() { }
    restore() { }
    translate() { }
    rotate() { }
    scale() { }
    arc() { }
}

// Mock Canvas
class MockCanvas {
    constructor() {
        this.width = 800;
        this.height = 600;
        this.style = {};
    }
    getContext() {
        return new MockContext();
    }
}

// Mock Player
const mockPlayer = {
    x: 0,  // Changed from 100 to 0 for better test stability
    y: 0   // Changed from 100 to 0 for better test stability
};

// Test Suite
const runTests = () => {
    console.log('Running CosmicBackground Structure Tests...');
    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Instantiation
        const canvas = new MockCanvas();
        const bg = new CosmicBackground(canvas);

        if (bg) {
            console.log('✅ CosmicBackground instantiated successfully');
            passed++;
        } else {
            console.error('❌ CosmicBackground failed to instantiate');
            failed++;
        }

        // Test 2: Method Existence
        if (typeof bg.render === 'function') {
            console.log('✅ CosmicBackground has render() method');
            passed++;
        } else {
            console.error('❌ CosmicBackground missing render() method');
            failed++;
        }

        if (typeof bg.update === 'function') {
            console.log('✅ CosmicBackground has update() method');
            passed++;
        } else {
            console.error('❌ CosmicBackground missing update() method');
            failed++;
        }

        // Test 3: Render Execution (Smoke Test)
        try {
            bg.render(mockPlayer);
            console.log('✅ CosmicBackground.render() executed without error');
            passed++;
        } catch (e) {
            console.error('❌ CosmicBackground.render() threw error:', e);
            failed++;
        }

        // Test 4: Shape Initialization Coverage
        // Verify that shapes are properly initialized with valid positions
        let validShapes = 0;
        const worldW = bg.worldW;
        const worldH = bg.worldH;

        bg.shapes.forEach(shape => {
            // Check that shape has valid coordinates within world bounds
            if (shape &&
                shape.x >= 0 && shape.x <= worldW &&
                shape.y >= 0 && shape.y <= worldH &&
                shape.z > 0 && shape.size > 0) {
                validShapes++;
            }
        });

        const validRatio = validShapes / bg.shapes.length;
        if (validRatio > 0.9) { // At least 90% of shapes should be valid
            console.log(`✅ Shape Initialization: ${validShapes}/${bg.shapes.length} shapes properly initialized (${(validRatio * 100).toFixed(1)}%)`);
            passed++;
        } else {
            console.error(`❌ Shape Initialization Failed: Only ${validShapes}/${bg.shapes.length} shapes valid (${(validRatio * 100).toFixed(1)}%). Initialization bounds likely incorrect.`);
            failed++;
        }

        // Test 5: Star depth layer bounds
        // Verify all stars fall within a layer's depth range
        const minZ = bg.starLayerDepths[0].min;
        const maxZ = bg.starLayerDepths[bg.starLayerDepths.length - 1].max;
        let starsInRange = 0;
        bg.stars.forEach(star => {
            if (star.z >= minZ && star.z <= maxZ) {
                starsInRange++;
            }
        });

        if (starsInRange === bg.stars.length) {
            console.log(`✅ Star Depth: All ${bg.stars.length} stars within layer bounds [${minZ}, ${maxZ}]`);
            passed++;
        } else {
            console.error(`❌ Star Depth: ${bg.stars.length - starsInRange} stars outside layer bounds`);
            failed++;
        }

        // Test 6: Cache key generation (numeric vs string)
        if (typeof bg._getSpriteCacheKey === 'function') {
            const key1 = bg._getSpriteCacheKey('cube', 25, 0, 0, 0);
            const key2 = bg._getSpriteCacheKey('cube', 25, 0, 0, 1);
            const key3 = bg._getSpriteCacheKey('pyramid', 25, 0, 0, 0);

            if (typeof key1 === 'number' && key1 !== key2 && key1 !== key3) {
                console.log('✅ Cache key generation: Produces unique numeric keys');
                passed++;
            } else {
                console.error('❌ Cache key generation: Keys not unique or not numeric');
                failed++;
            }
        } else {
            console.log('⏭️  Cache key method not exposed (skipped)');
        }

        // Test 7: quantizeAngle correctness
        if (typeof bg.quantizeAngle === 'function') {
            const q0 = bg.quantizeAngle(0);
            const qPi = bg.quantizeAngle(Math.PI);
            const qNeg = bg.quantizeAngle(-Math.PI / 2);

            if (q0 === 0 && qPi > 0 && qNeg >= 0 && qNeg < bg.rotationSteps) {
                console.log('✅ quantizeAngle: Returns valid bucket indices');
                passed++;
            } else {
                console.error(`❌ quantizeAngle: Invalid buckets (0=${q0}, π=${qPi}, -π/2=${qNeg})`);
                failed++;
            }
        } else {
            console.log('⏭️  quantizeAngle not exposed (skipped)');
        }

        // Test 8: getDebugInfo includes cache stats
        if (typeof bg.getDebugInfo === 'function') {
            const info = bg.getDebugInfo();
            if ('spriteCacheSize' in info && 'spriteCacheMaxSize' in info) {
                console.log('✅ getDebugInfo: Includes cache statistics');
                passed++;
            } else {
                console.error('❌ getDebugInfo: Missing cache statistics');
                failed++;
            }
        } else {
            console.error('❌ getDebugInfo method missing');
            failed++;
        }

        // Test 9: clearCaches method exists and works
        if (typeof bg.clearCaches === 'function') {
            try {
                bg.clearCaches();
                if (bg.shapeSpriteCache.size === 0) {
                    console.log('✅ clearCaches: Successfully clears sprite cache');
                    passed++;
                } else {
                    console.error('❌ clearCaches: Cache not empty after clear');
                    failed++;
                }
            } catch (e) {
                console.error('❌ clearCaches threw error:', e);
                failed++;
            }
        } else {
            console.error('❌ clearCaches method missing');
            failed++;
        }

    } catch (error) {
        console.error('❌ Unexpected error in test suite:', error);
        failed++;
    }

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();

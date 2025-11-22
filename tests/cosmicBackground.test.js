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

    } catch (error) {
        console.error('❌ Unexpected error in test suite:', error);
        failed++;
    }

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();

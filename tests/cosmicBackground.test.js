const CosmicBackground = require('../src/systems/CosmicBackground.js');

// Mock CanvasRenderingContext2D
class MockContext {
    constructor() {
        this.fillStyle = '';
        this.strokeStyle = '';
        this.lineWidth = 1;
    }
    fillRect() {}
    beginPath() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
    fill() {}
    save() {}
    restore() {}
    translate() {}
    rotate() {}
    scale() {}
    arc() {}
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
    x: 100,
    y: 100
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

        // Test 4: Visibility Coverage
        // Verify that shapes are distributed across the full worldW/worldH
        // and that at least some would be visible on screen.
        let visibleCount = 0;
        const worldW = bg.worldW;
        const worldH = bg.worldH;
        const offset = bg.worldPadding / 2;
        
        bg.shapes.forEach(shape => {
            // Simulate the render logic
            const parallaxFactor = Math.min(0.8, 1.0 / shape.z);
            let relX = (shape.x - mockPlayer.x * parallaxFactor) % worldW;
            let relY = (shape.y - mockPlayer.y * parallaxFactor) % worldH;
            
            if (relX < 0) relX += worldW;
            if (relY < 0) relY += worldH;
            
            const screenX = relX - offset;
            const screenY = relY - offset;
            
            // Check if within extended bounds (culling logic)
            const isVisible = !(screenX < -200 || screenX > canvas.width + 200 ||
                               screenY < -200 || screenY > canvas.height + 200);
            
            if (isVisible) visibleCount++;
        });

        if (visibleCount > 0) {
            console.log(`✅ Visibility Check: ${visibleCount}/${bg.shapes.length} shapes visible`);
            passed++;
        } else {
            console.error(`❌ Visibility Check Failed: 0/${bg.shapes.length} shapes visible. Initialization bounds likely incorrect.`);
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

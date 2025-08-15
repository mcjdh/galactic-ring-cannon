/**
 * Performance Test Script
 * Run this in the browser console to check for issues after fixes
 */

function runPerformanceTests() {
    console.log('🧪 Running Performance Tests...\n');
    
    const results = {
        collisionDetection: false,
        memoryLeaks: false,
        scriptLoading: false,
        errorHandling: false,
        particleBounds: false,
        dodgeSystem: false
    };
    
    // Test 1: Collision Detection Optimization
    try {
        if (window.gameEngine && window.gameEngine.checkCollisionsInCell) {
            const startTime = performance.now();
            // Create dummy entities for collision test
            const testEntities = [];
            for (let i = 0; i < 100; i++) {
                testEntities.push({
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    radius: 10,
                    isDead: false,
                    type: 'test'
                });
            }
            
            window.gameEngine.checkCollisionsInCell(testEntities);
            const endTime = performance.now();
            
            results.collisionDetection = (endTime - startTime) < 10; // Should be under 10ms for 100 entities
            console.log(`✓ Collision Detection: ${endTime - startTime}ms (${results.collisionDetection ? 'PASS' : 'FAIL'})`);
        }
    } catch (error) {
        console.error('✗ Collision Detection Test Failed:', error);
        results.collisionDetection = false;
    }
    
    // Test 2: Memory Leak Check (Spatial Grid)
    try {
        if (window.gameEngine && window.gameEngine.spatialGrid) {
            const initialSize = window.gameEngine.spatialGrid.size;
            
            // Simulate grid updates
            for (let i = 0; i < 10; i++) {
                window.gameEngine.updateSpatialGrid();
            }
            
            const finalSize = window.gameEngine.spatialGrid.size;
            results.memoryLeaks = finalSize <= initialSize * 2; // Should not grow excessively
            console.log(`✓ Spatial Grid Memory: ${initialSize} → ${finalSize} (${results.memoryLeaks ? 'PASS' : 'FAIL'})`);
        }
    } catch (error) {
        console.error('✗ Memory Leak Test Failed:', error);
        results.memoryLeaks = false;
    }
    
    // Test 3: Script Loading
    try {
        const requiredClasses = ['Player', 'Enemy', 'Projectile', 'GameEngine'];
        const loadedClasses = requiredClasses.filter(className => typeof window[className] !== 'undefined');
        results.scriptLoading = loadedClasses.length === requiredClasses.length;
        console.log(`✓ Script Loading: ${loadedClasses.length}/${requiredClasses.length} (${results.scriptLoading ? 'PASS' : 'FAIL'})`);
        
        if (!results.scriptLoading) {
            const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');
            console.warn('Missing classes:', missingClasses);
        }
    } catch (error) {
        console.error('✗ Script Loading Test Failed:', error);
        results.scriptLoading = false;
    }
    
    // Test 4: Error Handling in Projectile System
    try {
        if (window.gameEngine && window.gameEngine.spawnProjectile) {
            // Test invalid parameters
            const invalidProjectile = window.gameEngine.spawnProjectile(NaN, 0, 100, 100, 50);
            results.errorHandling = invalidProjectile === null; // Should return null for invalid params
            console.log(`✓ Error Handling: ${results.errorHandling ? 'PASS' : 'FAIL'}`);
        }
    } catch (error) {
        console.error('✗ Error Handling Test Failed:', error);
        results.errorHandling = false;
    }
    
    // Test 5: Particle Bounds Check
    try {
        if (typeof Particle !== 'undefined') {
            const testParticle = new Particle(5000, 5000, 100, 100, 5, '#ffffff', 1.0);
            testParticle.update(0.1);
            results.particleBounds = testParticle.isDead; // Should be dead due to bounds check
            console.log(`✓ Particle Bounds: ${results.particleBounds ? 'PASS' : 'FAIL'}`);
        }
    } catch (error) {
        console.error('✗ Particle Bounds Test Failed:', error);
        results.particleBounds = false;
    }
    
    // Test 6: Dodge System State Management
    try {
        if (typeof Player !== 'undefined') {
            const testPlayer = new Player(100, 100);
            
            // Test initial dodge state
            const initialState = testPlayer.canDodge && !testPlayer.isDodging;
            
            // Test dodge activation
            testPlayer.doDodge();
            const duringDodge = !testPlayer.canDodge && testPlayer.isDodging && testPlayer.isInvulnerable;
            
            results.dodgeSystem = initialState && duringDodge;
            console.log(`✓ Dodge System: ${results.dodgeSystem ? 'PASS' : 'FAIL'}`);
        }
    } catch (error) {
        console.error('✗ Dodge System Test Failed:', error);
        results.dodgeSystem = false;
    }
    
    // Summary
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Test Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All performance fixes are working correctly!');
    } else {
        console.warn('⚠️  Some issues may still exist. Check failed tests above.');
    }
    
    return results;
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.runPerformanceTests = runPerformanceTests;
    console.log('🧪 Performance test loaded. Run with: runPerformanceTests()');
}
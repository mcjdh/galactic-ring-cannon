/**
 * Hot Path Optimization Test Helpers
 * Console commands for testing performance cache effectiveness
 * 
 * Usage: Copy/paste into browser console
 */

// Quick performance comparison test
window.testPerformanceCache = function(iterations = 1000000) {
    console.log('🧪 Testing Performance Cache vs Native Math...\n');
    
    // Test 1: Math.sqrt
    console.log('Test 1: Math.sqrt performance');
    let start = performance.now();
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
        sum += Math.sqrt(i % 10000);
    }
    let nativeTime = performance.now() - start;
    console.log(`  Native Math.sqrt: ${nativeTime.toFixed(2)}ms`);
    
    if (window.perfCache) {
        start = performance.now();
        sum = 0;
        for (let i = 0; i < iterations; i++) {
            sum += window.perfCache.sqrt(i % 10000);
        }
        let cacheTime = performance.now() - start;
        console.log(`  Cached sqrt:      ${cacheTime.toFixed(2)}ms`);
        console.log(`  Speedup:          ${(nativeTime / cacheTime).toFixed(2)}x faster ✅\n`);
    } else {
        console.log('  ⚠️ PerformanceCache not available\n');
    }
    
    // Test 2: Math.random
    console.log('Test 2: Math.random performance');
    start = performance.now();
    sum = 0;
    for (let i = 0; i < iterations; i++) {
        sum += Math.random();
    }
    nativeTime = performance.now() - start;
    console.log(`  Native Math.random: ${nativeTime.toFixed(2)}ms`);
    
    if (window.perfCache) {
        start = performance.now();
        sum = 0;
        for (let i = 0; i < iterations; i++) {
            sum += window.perfCache.random();
        }
        let cacheTime = performance.now() - start;
        console.log(`  Cached random:      ${cacheTime.toFixed(2)}ms`);
        console.log(`  Speedup:            ${(nativeTime / cacheTime).toFixed(2)}x faster ✅\n`);
    } else {
        console.log('  ⚠️ PerformanceCache not available\n');
    }
    
    // Test 3: Grid coordinates
    console.log('Test 3: Grid coordinate performance');
    const gridSize = 100;
    start = performance.now();
    sum = 0;
    for (let i = 0; i < iterations; i++) {
        sum += Math.floor(i / gridSize);
    }
    nativeTime = performance.now() - start;
    console.log(`  Native Math.floor/div: ${nativeTime.toFixed(2)}ms`);
    
    if (window.perfCache) {
        start = performance.now();
        sum = 0;
        for (let i = 0; i < iterations; i++) {
            sum += window.perfCache.gridCoord(i, gridSize);
        }
        let cacheTime = performance.now() - start;
        console.log(`  Cached gridCoord:      ${cacheTime.toFixed(2)}ms`);
        console.log(`  Speedup:               ${(nativeTime / cacheTime).toFixed(2)}x faster ✅\n`);
    } else {
        console.log('  ⚠️ PerformanceCache not available\n');
    }
    
    console.log('Test complete! 🎯');
};

// FPS monitoring helper
window.monitorFPS = function(duration = 60) {
    console.log(`📊 Monitoring FPS for ${duration} seconds...`);
    
    const samples = [];
    const startTime = performance.now();
    let frameCount = 0;
    let lastTime = startTime;
    
    function measure() {
        const now = performance.now();
        const delta = now - lastTime;
        const fps = 1000 / delta;
        
        samples.push(fps);
        frameCount++;
        lastTime = now;
        
        if (now - startTime < duration * 1000) {
            requestAnimationFrame(measure);
        } else {
            // Calculate statistics
            samples.sort((a, b) => a - b);
            const min = samples[0];
            const max = samples[samples.length - 1];
            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
            const median = samples[Math.floor(samples.length / 2)];
            const p1 = samples[Math.floor(samples.length * 0.01)];
            const p99 = samples[Math.floor(samples.length * 0.99)];
            
            console.log('\n📊 FPS Statistics:');
            console.log(`  Duration:    ${duration}s`);
            console.log(`  Frames:      ${frameCount}`);
            console.log(`  Average FPS: ${avg.toFixed(1)}`);
            console.log(`  Median FPS:  ${median.toFixed(1)}`);
            console.log(`  Min FPS:     ${min.toFixed(1)}`);
            console.log(`  Max FPS:     ${max.toFixed(1)}`);
            console.log(`  1st %ile:    ${p1.toFixed(1)}`);
            console.log(`  99th %ile:   ${p99.toFixed(1)}`);
            
            if (min < 45) {
                console.log(`  ⚠️ WARNING: FPS dropped below 45 (${min.toFixed(1)})`);
            } else if (min < 50) {
                console.log(`  ⚠️ Minimum FPS: ${min.toFixed(1)} (target: 50+)`);
            } else {
                console.log(`  ✅ Minimum FPS: ${min.toFixed(1)} (excellent!)`);
            }
        }
    }
    
    requestAnimationFrame(measure);
};

// Cache effectiveness report
window.cacheReport = function() {
    if (!window.perfCache) {
        console.log('⚠️ PerformanceCache not available');
        return;
    }
    
    const stats = window.perfCache.getStats();
    
    console.log('\n📊 Performance Cache Report\n');
    console.log('════════════════════════════════════════\n');
    
    console.log('Cache Status:');
    console.log(`  Enabled:     ${stats.enabled ? '✅ YES' : '❌ NO'}`);
    console.log(`  Memory Used: ${stats.totalMemory} bytes\n`);
    
    console.log('sqrt Cache:');
    console.log(`  Size:   ${stats.sqrtCache.size} entries`);
    console.log(`  Memory: ${stats.sqrtCache.memory} bytes`);
    console.log(`  Range:  0 to ${Math.sqrt(stats.sqrtCache.size - 1).toFixed(1)}\n`);
    
    console.log('Grid Coordinate Cache:');
    console.log(`  Entries:  ${stats.floorCache.size}`);
    console.log(`  Hits:     ${stats.floorCache.hits}`);
    console.log(`  Misses:   ${stats.floorCache.misses}`);
    console.log(`  Hit Rate: ${stats.floorCache.hitRate}\n`);
    
    if (stats.floorCache.hits > 0) {
        const hitRate = parseFloat(stats.floorCache.hitRate);
        if (hitRate >= 85) {
            console.log('  ✅ Excellent hit rate!');
        } else if (hitRate >= 70) {
            console.log('  ⚠️ Good hit rate');
        } else {
            console.log('  ⚠️ Low hit rate (normal during startup)');
        }
    }
    
    console.log('\nRandom Pool:');
    console.log(`  Size:  ${stats.randomPool.size} values`);
    console.log(`  Index: ${stats.randomPool.index} (current position)\n`);
    
    console.log('Normalized Vectors:');
    console.log(`  Cached: ${stats.normalizedVectors.size} directions`);
    console.log(`  (Cardinal + Diagonal directions)\n`);
    
    console.log('════════════════════════════════════════\n');
    
    if (window.collisionCache) {
        const collStats = window.collisionCache.getStats();
        console.log('Collision Cache:');
        console.log(`  Radius Sums: ${collStats.radiusSumCacheSize} entries`);
        console.log(`  Memory:      ~5 KB\n`);
    }
};

// Quick comparison: Cache ON vs OFF
window.comparePerformance = function() {
    console.log('\n🔬 Performance Comparison Test\n');
    console.log('This will toggle the cache and compare FPS.');
    console.log('Make sure you are in active gameplay (heavy combat recommended).\n');
    
    let phase = 0;
    let resultsOn = null;
    let resultsOff = null;
    
    function runPhase() {
        if (phase === 0) {
            console.log('Phase 1: Testing WITH cache (30 seconds)...');
            if (window.perfCache) window.perfCache.setEnabled(true);
            
            const samples = [];
            const start = performance.now();
            let lastTime = start;
            
            function measure() {
                const now = performance.now();
                samples.push(1000 / (now - lastTime));
                lastTime = now;
                
                if (now - start < 30000) {
                    requestAnimationFrame(measure);
                } else {
                    resultsOn = {
                        avg: samples.reduce((a, b) => a + b, 0) / samples.length,
                        min: Math.min(...samples)
                    };
                    console.log(`  Avg FPS: ${resultsOn.avg.toFixed(1)}`);
                    console.log(`  Min FPS: ${resultsOn.min.toFixed(1)}\n`);
                    
                    phase = 1;
                    setTimeout(runPhase, 2000);
                }
            }
            requestAnimationFrame(measure);
            
        } else if (phase === 1) {
            console.log('Phase 2: Testing WITHOUT cache (30 seconds)...');
            if (window.perfCache) window.perfCache.setEnabled(false);
            
            const samples = [];
            const start = performance.now();
            let lastTime = start;
            
            function measure() {
                const now = performance.now();
                samples.push(1000 / (now - lastTime));
                lastTime = now;
                
                if (now - start < 30000) {
                    requestAnimationFrame(measure);
                } else {
                    resultsOff = {
                        avg: samples.reduce((a, b) => a + b, 0) / samples.length,
                        min: Math.min(...samples)
                    };
                    console.log(`  Avg FPS: ${resultsOff.avg.toFixed(1)}`);
                    console.log(`  Min FPS: ${resultsOff.min.toFixed(1)}\n`);
                    
                    // Re-enable cache
                    if (window.perfCache) window.perfCache.setEnabled(true);
                    
                    // Show results
                    console.log('════════════════════════════════════════');
                    console.log('📊 Comparison Results:\n');
                    console.log('WITH cache:');
                    console.log(`  Avg: ${resultsOn.avg.toFixed(1)} FPS`);
                    console.log(`  Min: ${resultsOn.min.toFixed(1)} FPS\n`);
                    console.log('WITHOUT cache:');
                    console.log(`  Avg: ${resultsOff.avg.toFixed(1)} FPS`);
                    console.log(`  Min: ${resultsOff.min.toFixed(1)} FPS\n`);
                    console.log('Improvement:');
                    console.log(`  Avg: +${(resultsOn.avg - resultsOff.avg).toFixed(1)} FPS`);
                    console.log(`  Min: +${(resultsOn.min - resultsOff.min).toFixed(1)} FPS\n`);
                    
                    if (resultsOn.avg > resultsOff.avg + 5) {
                        console.log('✅ Significant improvement with cache!');
                    } else {
                        console.log('⚠️ Minor improvement (test during heavy combat)');
                    }
                    console.log('════════════════════════════════════════\n');
                }
            }
            requestAnimationFrame(measure);
        }
    }
    
    runPhase();
};

// Print available commands
console.log('\n🎮 Hot Path Optimization Test Commands:\n');
console.log('  perfCacheStats()      - View cache statistics');
console.log('  perfCacheToggle()     - Enable/disable cache');
console.log('  testPerformanceCache() - Benchmark cache vs native');
console.log('  monitorFPS(60)        - Monitor FPS for 60 seconds');
console.log('  cacheReport()         - Detailed cache report');
console.log('  comparePerformance()  - A/B test cache ON vs OFF');
console.log('\n🎯 Quick test: cacheReport()\n');

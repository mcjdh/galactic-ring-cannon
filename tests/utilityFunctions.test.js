// Utility Functions Test Suite - Tests FastMath, TrigCache, and other utility calculations

function testUtilityFunctions() {
    console.log('\n=== Testing Utility Functions ===\n');

    // Test 1: FastMath is defined
    {
        if (!window.FastMath) {
            throw new Error('FastMath not found');
        }

        console.log('✓ FastMath is defined');
    }

    // Test 2: FastMath.distance calculates correctly
    {
        const dist = window.FastMath.distance(0, 0, 3, 4);

        if (Math.abs(dist - 5) > 0.01) {
            throw new Error(`Expected distance 5, got ${dist}`);
        }

        console.log('✓ FastMath.distance calculates correctly');
    }

    // Test 3: FastMath.distanceSquared calculates correctly
    {
        const distSq = window.FastMath.distanceSquared(0, 0, 3, 4);

        if (distSq !== 25) {
            throw new Error(`Expected distance squared 25, got ${distSq}`);
        }

        console.log('✓ FastMath.distanceSquared calculates correctly');
    }

    // Test 4: FastMath.lerp interpolates correctly
    {
        const result1 = window.FastMath.lerp(0, 10, 0.5);
        const result2 = window.FastMath.lerp(0, 10, 0);
        const result3 = window.FastMath.lerp(0, 10, 1);

        if (result1 !== 5) throw new Error('lerp at 0.5 should return midpoint');
        if (result2 !== 0) throw new Error('lerp at 0 should return start');
        if (result3 !== 10) throw new Error('lerp at 1 should return end');

        console.log('✓ FastMath.lerp interpolates correctly');
    }

    // Test 5: FastMath.clamp constrains values
    {
        const result1 = window.FastMath.clamp(5, 0, 10);
        const result2 = window.FastMath.clamp(-5, 0, 10);
        const result3 = window.FastMath.clamp(15, 0, 10);

        if (result1 !== 5) throw new Error('clamp should not modify value in range');
        if (result2 !== 0) throw new Error('clamp should constrain to min');
        if (result3 !== 10) throw new Error('clamp should constrain to max');

        console.log('✓ FastMath.clamp constrains values correctly');
    }

    // Test 6: FastMath.degToRad converts correctly
    {
        const radians = window.FastMath.degToRad(180);

        if (Math.abs(radians - Math.PI) > 0.001) {
            throw new Error(`Expected π, got ${radians}`);
        }

        console.log('✓ FastMath.degToRad converts correctly');
    }

    // Test 7: FastMath.radToDeg converts correctly
    {
        const degrees = window.FastMath.radToDeg(Math.PI);

        if (Math.abs(degrees - 180) > 0.001) {
            throw new Error(`Expected 180, got ${degrees}`);
        }

        console.log('✓ FastMath.radToDeg converts correctly');
    }

    // Test 8: FastMath.normalizeAngle normalizes to [-π, π]
    {
        const angle1 = window.FastMath.normalizeAngle(Math.PI * 3); // Should wrap to π
        const angle2 = window.FastMath.normalizeAngle(-Math.PI * 3); // Should wrap to -π
        const angle3 = window.FastMath.normalizeAngle(Math.PI / 2); // Already in range

        if (Math.abs(angle1 - Math.PI) > 0.001) {
            throw new Error('Failed to normalize 3π');
        }
        if (Math.abs(angle2 - (-Math.PI)) > 0.001) {
            throw new Error('Failed to normalize -3π');
        }
        if (Math.abs(angle3 - Math.PI / 2) > 0.001) {
            throw new Error('Should not modify angle already in range');
        }

        console.log('✓ FastMath.normalizeAngle normalizes correctly');
    }

    // Test 9: FastMath.normalize returns unit vector
    {
        const result = window.FastMath.normalize(3, 4);
        const magnitude = Math.sqrt(result.x * result.x + result.y * result.y);

        if (Math.abs(magnitude - 1.0) > 0.001) {
            throw new Error(`Normalized vector should have magnitude 1, got ${magnitude}`);
        }

        console.log('✓ FastMath.normalize returns unit vector');
    }

    // Test 10: FastMath.normalize handles zero vector
    {
        const result = window.FastMath.normalize(0, 0);

        if (result.x !== 0 || result.y !== 0) {
            throw new Error('Zero vector should normalize to zero vector');
        }

        console.log('✓ FastMath.normalize handles zero vector');
    }

    // Test 11: FastMath.normalizeDiagonal for axis-aligned vectors
    {
        const result1 = window.FastMath.normalizeDiagonal(1, 0);
        const result2 = window.FastMath.normalizeDiagonal(0, 1);

        if (result1.x !== 1 || result1.y !== 0) {
            throw new Error('Axis-aligned vector should remain unchanged');
        }
        if (result2.x !== 0 || result2.y !== 1) {
            throw new Error('Axis-aligned vector should remain unchanged');
        }

        console.log('✓ FastMath.normalizeDiagonal handles axis-aligned vectors');
    }

    // Test 12: FastMath.normalizeDiagonal for diagonal vectors
    {
        const result = window.FastMath.normalizeDiagonal(1, 1);
        const magnitude = Math.sqrt(result.x * result.x + result.y * result.y);

        if (Math.abs(magnitude - 1.0) > 0.001) {
            throw new Error(`Diagonal should be normalized to magnitude 1, got ${magnitude}`);
        }

        console.log('✓ FastMath.normalizeDiagonal normalizes diagonal correctly');
    }

    // Test 13: FastMath.distanceFast approximates distance
    {
        const exactDist = window.FastMath.distance(0, 0, 3, 4);
        const fastDist = window.FastMath.distanceFast(0, 0, 3, 4);

        const error = Math.abs(exactDist - fastDist) / exactDist;

        if (error > 0.05) { // Should be within 5% error
            throw new Error(`Fast distance error too high: ${(error * 100).toFixed(2)}%`);
        }

        console.log('✓ FastMath.distanceFast approximates distance within 5% error');
    }

    // Test 14: FastMath.isWithinDistance returns correct boolean
    {
        const result1 = window.FastMath.isWithinDistance(0, 0, 3, 4, 10);
        const result2 = window.FastMath.isWithinDistance(0, 0, 3, 4, 4);

        if (!result1) throw new Error('Should be within distance of 10');
        if (result2) throw new Error('Should not be within distance of 4');

        console.log('✓ FastMath.isWithinDistance returns correct boolean');
    }

    // Test 15: FastMath.budget validates inputs
    {
        const result1 = window.FastMath.budget(100, 0.5, 200, 0);
        const result2 = window.FastMath.budget(100, -1, 200, 0); // Invalid factor
        const result3 = window.FastMath.budget(-100, 0.5, 200, 0); // Invalid base

        if (result1 !== 50) throw new Error('Budget should be 50');
        if (result2 !== 0) throw new Error('Invalid factor should result in 0');
        if (result3 !== 0) throw new Error('Negative base should result in 0');

        console.log('✓ FastMath.budget validates inputs');
    }

    // Test 16: FastMath.budget respects available budget
    {
        const result = window.FastMath.budget(100, 1.0, 200, 150);

        // Available = 200 - 150 = 50
        // Requested = 100 * 1.0 = 100
        // Should return min(100, 50) = 50

        if (result !== 50) {
            throw new Error(`Expected 50, got ${result}`);
        }

        console.log('✓ FastMath.budget respects available budget');
    }

    // Test 17: FastMath.budget clamps factor to [0, 1]
    {
        const result = window.FastMath.budget(100, 2.0, 200, 0);

        if (result !== 100) {
            throw new Error('Factor > 1 should be clamped to 1');
        }

        console.log('✓ FastMath.budget clamps factor to [0, 1]');
    }

    // Test 18: FastMath.randomAngle returns value in [0, 2π]
    {
        for (let i = 0; i < 10; i++) {
            const angle = window.FastMath.randomAngle();

            if (angle < 0 || angle > Math.PI * 2) {
                throw new Error(`Random angle ${angle} outside [0, 2π] range`);
            }
        }

        console.log('✓ FastMath.randomAngle returns value in [0, 2π]');
    }

    // Test 19: FastMath.randomUnitVector returns unit vector
    {
        const vec = window.FastMath.randomUnitVector();
        const magnitude = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

        if (Math.abs(magnitude - 1.0) > 0.01) {
            throw new Error(`Random unit vector should have magnitude 1, got ${magnitude}`);
        }

        console.log('✓ FastMath.randomUnitVector returns unit vector');
    }

    // Test 20: FastMath.sin returns value in [-1, 1]
    {
        const result1 = window.FastMath.sin(0);
        const result2 = window.FastMath.sin(Math.PI / 2);
        const result3 = window.FastMath.sin(Math.PI);

        if (Math.abs(result1) > 0.1) throw new Error('sin(0) should be ~0');
        if (Math.abs(result2 - 1.0) > 0.1) throw new Error('sin(π/2) should be ~1');
        if (Math.abs(result3) > 0.1) throw new Error('sin(π) should be ~0');

        console.log('✓ FastMath.sin returns reasonable values');
    }

    // Test 21: FastMath.cos returns value in [-1, 1]
    {
        const result1 = window.FastMath.cos(0);
        const result2 = window.FastMath.cos(Math.PI / 2);
        const result3 = window.FastMath.cos(Math.PI);

        if (Math.abs(result1 - 1.0) > 0.1) throw new Error('cos(0) should be ~1');
        if (Math.abs(result2) > 0.1) throw new Error('cos(π/2) should be ~0');
        if (Math.abs(result3 - (-1.0)) > 0.1) throw new Error('cos(π) should be ~-1');

        console.log('✓ FastMath.cos returns reasonable values');
    }

    // Test 22: FastMath.sincos returns both values
    {
        const result = window.FastMath.sincos(Math.PI / 4); // 45 degrees

        if (!result.sin || !result.cos) {
            throw new Error('sincos should return object with sin and cos properties');
        }

        // sin(π/4) ≈ cos(π/4) ≈ 0.707
        if (Math.abs(result.sin - result.cos) > 0.1) {
            throw new Error('sin and cos of 45° should be approximately equal');
        }

        console.log('✓ FastMath.sincos returns both sin and cos values');
    }

    // Test 23: FastMath.atan2 returns angle in correct quadrant
    {
        const angle1 = window.FastMath.atan2(1, 1);   // Q1: ~45°
        const angle2 = window.FastMath.atan2(1, -1);  // Q2: ~135°
        const angle3 = window.FastMath.atan2(-1, -1); // Q3: ~-135°
        const angle4 = window.FastMath.atan2(-1, 1);  // Q4: ~-45°

        if (angle1 < 0 || angle1 > Math.PI / 2) throw new Error('Q1 angle incorrect');
        if (angle2 < Math.PI / 2 || angle2 > Math.PI) throw new Error('Q2 angle incorrect');
        if (angle3 < -Math.PI || angle3 > -Math.PI / 2) throw new Error('Q3 angle incorrect');
        if (angle4 < -Math.PI / 2 || angle4 > 0) throw new Error('Q4 angle incorrect');

        console.log('✓ FastMath.atan2 returns angle in correct quadrant');
    }

    // Test 24: FastMath.angleSinCos returns all three values
    {
        const result = window.FastMath.angleSinCos(1, 1);

        if (typeof result.angle !== 'number') throw new Error('Should return angle');
        if (typeof result.sin !== 'number') throw new Error('Should return sin');
        if (typeof result.cos !== 'number') throw new Error('Should return cos');

        console.log('✓ FastMath.angleSinCos returns angle, sin, and cos');
    }

    // Test 25: TrigCache initializes if available
    {
        if (typeof window.initTrigCache === 'function') {
            const cache = window.initTrigCache();

            if (!cache) {
                throw new Error('initTrigCache should return cache instance');
            }

            console.log('✓ TrigCache initializes correctly');
        } else {
            console.log('⚠ TrigCache not available (may be expected in test environment)');
        }
    }

    // Test 26: TrigCache.sin approximates Math.sin
    {
        if (window.trigCache) {
            const angle = Math.PI / 4;
            const cacheSin = window.trigCache.sin(angle);
            const mathSin = Math.sin(angle);

            const error = Math.abs(cacheSin - mathSin);

            if (error > 0.01) {
                throw new Error(`TrigCache.sin error too high: ${error}`);
            }

            console.log('✓ TrigCache.sin approximates Math.sin within 1% error');
        } else {
            console.log('⚠ TrigCache not initialized, skipping sin test');
        }
    }

    // Test 27: TrigCache.cos approximates Math.cos
    {
        if (window.trigCache) {
            const angle = Math.PI / 4;
            const cacheCos = window.trigCache.cos(angle);
            const mathCos = Math.cos(angle);

            const error = Math.abs(cacheCos - mathCos);

            if (error > 0.01) {
                throw new Error(`TrigCache.cos error too high: ${error}`);
            }

            console.log('✓ TrigCache.cos approximates Math.cos within 1% error');
        } else {
            console.log('⚠ TrigCache not initialized, skipping cos test');
        }
    }

    // Test 28: TrigCache handles negative angles
    {
        if (window.trigCache) {
            const result1 = window.trigCache.sin(-Math.PI / 2);
            const result2 = window.trigCache.cos(-Math.PI);

            // sin(-π/2) ≈ -1
            // cos(-π) ≈ -1

            if (Math.abs(result1 - (-1)) > 0.1) {
                throw new Error('TrigCache should handle negative angles for sin');
            }
            if (Math.abs(result2 - (-1)) > 0.1) {
                throw new Error('TrigCache should handle negative angles for cos');
            }

            console.log('✓ TrigCache handles negative angles');
        } else {
            console.log('⚠ TrigCache not initialized, skipping negative angle test');
        }
    }

    // Test 29: TrigCache.sincos returns both values
    {
        if (window.trigCache) {
            const result = window.trigCache.sincos(Math.PI / 3);

            if (!result.sin || !result.cos) {
                throw new Error('sincos should return object with sin and cos');
            }

            console.log('✓ TrigCache.sincos returns both values');
        } else {
            console.log('⚠ TrigCache not initialized, skipping sincos test');
        }
    }

    // Test 30: FastMath.getStats returns statistics
    {
        const stats = window.FastMath.getStats();

        if (!stats || typeof stats !== 'object') {
            throw new Error('getStats should return object');
        }
        if (!stats.mode) {
            throw new Error('Stats should include mode');
        }

        console.log('✓ FastMath.getStats returns statistics');
    }

    console.log('\n✅ All Utility Function tests passed!\n');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testUtilityFunctions };
}

/**
 * Diagnostic script to check class availability
 */

function checkClassAvailability() {
    const requiredClasses = [
        'Player',
        'Enemy', 
        'Projectile',
        'GameEngine',
        'EnemySpawner',
        'AudioSystem',
        'UpgradeSystem',
        'PerformanceManager',
        'UIManager',
        'StatsManager',
        'DifficultyManager',
        'EffectsManager',
        'GameManagerBridge'
    ];
    
    const results = {};
    let allAvailable = true;
    
    for (const className of requiredClasses) {
        const available = typeof window[className] !== 'undefined';
        results[className] = available;
        if (!available) {
            allAvailable = false;
            console.warn(`❌ ${className} not available`);
        } else {
            console.log(`✅ ${className} available`);
        }
    }
    
    console.log('\n=== Class Availability Summary ===');
    console.log(`Total classes checked: ${requiredClasses.length}`);
    console.log(`Available: ${Object.values(results).filter(Boolean).length}`);
    console.log(`Missing: ${Object.values(results).filter(x => !x).length}`);
    console.log(`All required classes available: ${allAvailable ? 'YES' : 'NO'}`);
    
    return results;
}

// Auto-run when loaded
if (typeof window !== 'undefined') {
    window.checkClassAvailability = checkClassAvailability;
    // Run after a short delay to ensure other scripts have loaded
    setTimeout(checkClassAvailability, 1000);
}

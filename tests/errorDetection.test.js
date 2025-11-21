
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Mock browser environment
global.window = {
    GAME_CONSTANTS: {},
    Game: {},
    logger: {
        log: () => {},
        error: console.error,
        warn: console.warn
    }
};

// Mock console.error to trap silent errors
let errorCount = 0;
const originalConsoleError = console.error;
const errors = [];

console.error = (...args) => {
    errorCount++;
    errors.push(args.join(' '));
    // originalConsoleError(...args); // Uncomment to see errors in output
};

console.log('[T] Running Silent Error Detection Tests...');

try {
    // Load key system files to check for initialization errors
    // We use eval to load them in the global scope as they are not modules
    
    const loadFile = (filePath) => {
        const content = fs.readFileSync(path.join(__dirname, '../src', filePath), 'utf8');
        try {
            eval(content);
        } catch (e) {
            console.error(`Failed to load ${filePath}: ${e.message}`);
        }
    };

    // Load configs first
    loadFile('config/gameConstants.js');
    loadFile('config/formations.config.js');
    
    // Load systems
    loadFile('systems/EnemySpawner.js');
    loadFile('systems/FormationManager.js');
    
    // Check for errors during load
    if (errorCount > 0) {
        throw new Error(`Errors detected during module loading:\n${errors.join('\n')}`);
    }
    console.log('+ Modules loaded without errors');

    // Test FormationManager initialization
    const mockGame = {
        player: { x: 0, y: 0 },
        canvas: { width: 800, height: 600 },
        spawner: {
            waveNumber: 1,
            availableEnemyTypes: ['basic'],
            getRandomEnemyType: () => 'basic',
            createEnemy: () => ({ x: 0, y: 0, isDead: false })
        },
        addEntity: () => {},
        performanceManager: {}
    };

    const formationManager = new window.FormationManager(mockGame);
    
    // Test update loop for errors
    formationManager.update(0.016);
    
    if (errorCount > 0) {
        throw new Error(`Errors detected during FormationManager update:\n${errors.join('\n')}`);
    }
    console.log('+ FormationManager update cycle clean');

    // Test EnemySpawner initialization
    const EnemySpawner = window.Game?.EnemySpawner || window.EnemySpawner;
    if (!EnemySpawner) throw new Error('EnemySpawner class not found');
    
    const spawner = new EnemySpawner(mockGame);
    
    // Test spawner update
    spawner.update(0.016);
    
    if (errorCount > 0) {
        throw new Error(`Errors detected during EnemySpawner update:\n${errors.join('\n')}`);
    }
    console.log('+ EnemySpawner update cycle clean');

} catch (e) {
    console.log(`! Test failed: ${e.message}`);
    process.exit(1);
} finally {
    // Restore console.error
    console.error = originalConsoleError;
}

console.log('Silent Error Detection passed');

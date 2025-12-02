const EnemyMovement = require('../src/entities/components/EnemyMovement.js');

// Mock Game and SpatialGrid
class MockGame {
    constructor() {
        this.gridSize = 100;
        this.spatialGrid = new Map();
        this.performanceMode = false;
    }

    _encodeGridKey(x, y) {
        return `${x},${y}`;
    }

    addToGrid(enemy) {
        const gridX = Math.floor(enemy.x / this.gridSize);
        const gridY = Math.floor(enemy.y / this.gridSize);
        const key = this._encodeGridKey(gridX, gridY);
        
        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, []);
        }
        this.spatialGrid.get(key).push(enemy);
    }
}

class MockEnemy {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.radius = 15;
        this.type = 'enemy';
        this.isDead = false;
        this.velocity = { x: 0, y: 0 };
        this.movement = { velocity: this.velocity }; // Circular reference for the test
    }
}

async function runTests() {
    console.log('Running EnemyMovement Tests...');
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (e) {
            console.error(`❌ ${name}: ${e.message}`);
            failed++;
        }
    };

    await test('applyAtomicForces applies repulsion when enemies are close', () => {
        const game = new MockGame();
        const enemy1 = new MockEnemy(100, 100, 'e1');
        const enemy2 = new MockEnemy(100, 105, 'e2'); // Very close, should repel

        // Setup circular reference properly
        enemy1.movement = new EnemyMovement(enemy1);
        enemy2.movement = new EnemyMovement(enemy2);

        game.addToGrid(enemy1);
        game.addToGrid(enemy2);

        // Apply forces to enemy1
        enemy1.movement.applyAtomicForces(0.016, game);

        // Expect velocity to change (repulsion)
        // enemy2 is at (100, 105), so below enemy1.
        // enemy1 should be pushed UP (negative Y)
        if (enemy1.movement.velocity.y >= 0) {
            throw new Error(`Expected negative Y velocity (repulsion), got ${enemy1.movement.velocity.y}`);
        }
    });

    await test('applyAtomicForces applies attraction (bonding) when enemies are at medium distance', () => {
        const game = new MockGame();
        const enemy1 = new MockEnemy(100, 100, 'e1');
        // Atomic radius is radius * 2.2 = 15 * 2.2 = 33.
        // Place enemy2 at distance 40 (greater than 33 but less than interaction radius 66)
        const enemy2 = new MockEnemy(100, 140, 'e2'); 

        enemy1.movement = new EnemyMovement(enemy1);
        enemy2.movement = new EnemyMovement(enemy2);

        game.addToGrid(enemy1);
        game.addToGrid(enemy2);

        // Apply forces to enemy1
        enemy1.movement.applyAtomicForces(0.016, game);

        // Expect velocity to change (attraction)
        // enemy2 is at (100, 140), so below enemy1.
        // enemy1 should be pulled DOWN (positive Y)
        if (enemy1.movement.velocity.y <= 0) {
            throw new Error(`Expected positive Y velocity (attraction), got ${enemy1.movement.velocity.y}`);
        }
    });

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

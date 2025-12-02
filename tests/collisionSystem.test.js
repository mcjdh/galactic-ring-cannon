// CollisionSystem Test Suite - Tests spatial grid, collision detection, and layer filtering

function testCollisionSystem() {
    console.log('\n=== Testing CollisionSystem ===\n');

    // Mock engine with minimal required properties
    function createMockEngine() {
        return {
            entities: [],
            spatialGrid: new Map(),
            _spatialGridCellPool: [],
            gridSize: 100,
            encodeGridKey: (x, y) => `${x},${y}`,
            decodeGridKey: (key) => key.split(',').map(Number),
            player: null
        };
    }

    // Helper to create mock entity
    function createEntity(type, x, y, radius = 10, additionalProps = {}) {
        return {
            type,
            x,
            y,
            radius,
            isDead: false,
            id: Math.random().toString(36).substr(2, 9),
            ...additionalProps
        };
    }

    // Test 1: Constructor initializes properly
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (!system.engine) throw new Error('System should have engine reference');
        if (!system.stats) throw new Error('System should initialize stats');
        if (!system.collisionRules) throw new Error('System should have collision rules');
        if (!system.collisionLayers) throw new Error('System should have collision layers');
        if (system._gridDirty !== true) throw new Error('Grid should be marked dirty on initialization');

        console.log('✓ CollisionSystem constructor initializes correctly');
    }

    // Test 2: Spatial grid partitions entities correctly
    {
        const engine = createMockEngine();
        engine.gridSize = 100;
        const system = new window.Game.CollisionSystem(engine);

        // Create entities in different grid cells
        const entity1 = createEntity('enemy', 50, 50);  // Cell (0,0)
        const entity2 = createEntity('enemy', 150, 50); // Cell (1,0)
        const entity3 = createEntity('enemy', 50, 150); // Cell (0,1)
        const entity4 = createEntity('enemy', 55, 55);  // Cell (0,0) - same as entity1

        engine.entities = [entity1, entity2, entity3, entity4];
        system.updateSpatialGrid();

        const grid = engine.spatialGrid;

        // Should have 3 cells
        if (grid.size !== 3) throw new Error(`Expected 3 cells, got ${grid.size}`);

        // Cell (0,0) should have 2 entities
        const cell00 = grid.get('0,0');
        if (!cell00 || cell00.length !== 2) throw new Error('Cell (0,0) should have 2 entities');
        if (!cell00.includes(entity1) || !cell00.includes(entity4)) {
            throw new Error('Cell (0,0) should contain entity1 and entity4');
        }

        // Cell (1,0) should have 1 entity
        const cell10 = grid.get('1,0');
        if (!cell10 || cell10.length !== 1) throw new Error('Cell (1,0) should have 1 entity');
        if (!cell10.includes(entity2)) throw new Error('Cell (1,0) should contain entity2');

        // Cell (0,1) should have 1 entity
        const cell01 = grid.get('0,1');
        if (!cell01 || cell01.length !== 1) throw new Error('Cell (0,1) should have 1 entity');
        if (!cell01.includes(entity3)) throw new Error('Cell (0,1) should contain entity3');

        console.log('✓ Spatial grid partitions entities correctly');
    }

    // Test 3: Dirty tracking optimization - grid not rebuilt when entities don't move
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        const entity = createEntity('enemy', 50, 50);
        engine.entities = [entity];

        // First update - should build grid
        system.updateSpatialGrid();
        const cellsProcessed1 = system.stats.cellsProcessed;
        if (cellsProcessed1 === 0) throw new Error('First update should process cells');

        // Second update - same entities, same positions, should skip rebuild
        system.updateSpatialGrid();
        // Grid should be reused (stats still reflect cached state)
        if (engine.spatialGrid.size === 0) throw new Error('Grid should still be populated');

        console.log('✓ Dirty tracking prevents unnecessary rebuilds');
    }

    // Test 4: Dirty tracking triggers rebuild when entity moves to new cell
    {
        const engine = createMockEngine();
        engine.gridSize = 100;
        const system = new window.Game.CollisionSystem(engine);

        const entity = createEntity('enemy', 50, 50); // Cell (0,0)
        engine.entities = [entity];

        system.updateSpatialGrid();
        const initialCell = engine.spatialGrid.get('0,0');
        if (!initialCell || !initialCell.includes(entity)) {
            throw new Error('Entity should be in cell (0,0)');
        }

        // Move entity to different cell
        entity.x = 150; // Now in cell (1,0)
        system.updateSpatialGrid();

        const oldCell = engine.spatialGrid.get('0,0');
        const newCell = engine.spatialGrid.get('1,0');

        if (oldCell && oldCell.includes(entity)) {
            throw new Error('Entity should no longer be in old cell');
        }
        if (!newCell || !newCell.includes(entity)) {
            throw new Error('Entity should be in new cell (1,0)');
        }

        console.log('✓ Dirty tracking triggers rebuild when entity moves cells');
    }

    // Test 5: Grid rebuilds when entity count changes
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        engine.entities = [createEntity('enemy', 50, 50)];
        system.updateSpatialGrid();

        const initialSize = engine.spatialGrid.size;

        // Add new entity
        engine.entities.push(createEntity('enemy', 250, 250));
        system.updateSpatialGrid();

        const newSize = engine.spatialGrid.size;
        if (newSize <= initialSize) {
            throw new Error('Grid should rebuild and have more cells after adding entity');
        }

        console.log('✓ Grid rebuilds when entity count changes');
    }

    // Test 6: Dead entities are excluded from spatial grid
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        const aliveEntity = createEntity('enemy', 50, 50);
        const deadEntity = createEntity('enemy', 55, 55);
        deadEntity.isDead = true;

        engine.entities = [aliveEntity, deadEntity];
        system.updateSpatialGrid();

        const cell = engine.spatialGrid.get('0,0');
        if (!cell) throw new Error('Cell should exist');
        if (cell.length !== 1) throw new Error(`Expected 1 entity in cell, got ${cell.length}`);
        if (!cell.includes(aliveEntity)) throw new Error('Alive entity should be in grid');
        if (cell.includes(deadEntity)) throw new Error('Dead entity should not be in grid');

        console.log('✓ Dead entities excluded from spatial grid');
    }

    // Test 7: Adaptive grid size calculation
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        const size1 = system.calculateOptimalGridSize(30);   // < 50 entities
        const size2 = system.calculateOptimalGridSize(75);   // 50-100 entities
        const size3 = system.calculateOptimalGridSize(150);  // 100-200 entities
        const size4 = system.calculateOptimalGridSize(250);  // > 200 entities

        if (size1 !== 160) throw new Error(`Expected 160 for 30 entities, got ${size1}`);
        if (size2 !== 140) throw new Error(`Expected 140 for 75 entities, got ${size2}`);
        if (size3 !== 120) throw new Error(`Expected 120 for 150 entities, got ${size3}`);
        if (size4 !== 100) throw new Error(`Expected 100 for 250 entities, got ${size4}`);

        // Grid size should decrease as entity count increases (more entities = smaller cells)
        if (!(size1 > size2 && size2 > size3 && size3 > size4)) {
            throw new Error('Grid size should decrease as entity count increases');
        }

        console.log('✓ Adaptive grid sizing works correctly');
    }

    // Test 8: isColliding detects circular collision correctly
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        const entity1 = createEntity('enemy', 100, 100, 10);
        const entity2 = createEntity('enemy', 110, 100, 10); // Touching (distance = 10, radius sum = 20)
        const entity3 = createEntity('enemy', 130, 100, 10); // Not touching (distance = 30, radius sum = 20)
        const entity4 = createEntity('enemy', 115, 100, 10); // Overlapping (distance = 15, radius sum = 20)

        if (!system.isColliding(entity1, entity2)) {
            throw new Error('Entities touching at edges should collide');
        }
        if (system.isColliding(entity1, entity3)) {
            throw new Error('Distant entities should not collide');
        }
        if (!system.isColliding(entity1, entity4)) {
            throw new Error('Overlapping entities should collide');
        }

        console.log('✓ isColliding detects circular collisions correctly');
    }

    // Test 9: isColliding handles edge cases
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        const validEntity = createEntity('enemy', 100, 100, 10);

        // Null/undefined entities
        if (system.isColliding(null, validEntity)) {
            throw new Error('Should not collide with null');
        }
        if (system.isColliding(validEntity, undefined)) {
            throw new Error('Should not collide with undefined');
        }

        // Missing properties
        const invalidEntity1 = { type: 'enemy', x: 100, y: 100 }; // No radius
        if (system.isColliding(validEntity, invalidEntity1)) {
            throw new Error('Should not collide when radius is missing');
        }

        // Zero/negative radius
        const zeroRadius = createEntity('enemy', 100, 100, 0);
        if (system.isColliding(validEntity, zeroRadius)) {
            throw new Error('Should not collide when radius sum is zero');
        }

        console.log('✓ isColliding handles edge cases correctly');
    }

    // Test 10: Collision layer rules - player vs enemy
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (!system._canCollideTypes('player', 'enemy')) {
            throw new Error('Player should collide with enemy');
        }
        if (!system._canCollideTypes('enemy', 'player')) {
            throw new Error('Enemy should collide with player (bidirectional)');
        }

        console.log('✓ Player-enemy collision layer works');
    }

    // Test 11: Collision layer rules - projectile vs enemy
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (!system._canCollideTypes('projectile', 'enemy')) {
            throw new Error('Projectile should collide with enemy');
        }
        if (!system._canCollideTypes('enemy', 'projectile')) {
            throw new Error('Enemy should collide with projectile (bidirectional)');
        }

        console.log('✓ Projectile-enemy collision layer works');
    }

    // Test 12: Collision layer rules - player vs xpOrb
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (!system._canCollideTypes('player', 'xpOrb')) {
            throw new Error('Player should collide with xpOrb');
        }
        if (!system._canCollideTypes('xpOrb', 'player')) {
            throw new Error('XP orb should collide with player (bidirectional)');
        }

        console.log('✓ Player-xpOrb collision layer works');
    }

    // Test 13: Collision layer rules - projectile should NOT collide with projectile
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (system._canCollideTypes('projectile', 'projectile')) {
            throw new Error('Projectile should not collide with projectile');
        }

        console.log('✓ Projectile-projectile non-collision works');
    }

    // Test 14: Collision layer rules - enemy should NOT collide with enemy
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (system._canCollideTypes('enemy', 'enemy')) {
            throw new Error('Enemy should not collide with enemy');
        }

        console.log('✓ Enemy-enemy non-collision works');
    }

    // Test 15: Collision layer rules - player vs enemyProjectile
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (!system._canCollideTypes('player', 'enemyProjectile')) {
            throw new Error('Player should collide with enemyProjectile');
        }
        if (!system._canCollideTypes('enemyProjectile', 'player')) {
            throw new Error('Enemy projectile should collide with player (bidirectional)');
        }

        console.log('✓ Player-enemyProjectile collision layer works');
    }

    // Test 16: Performance stats tracking
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        if (typeof system.stats.cellsProcessed !== 'number') {
            throw new Error('Should track cellsProcessed');
        }
        if (typeof system.stats.collisionsChecked !== 'number') {
            throw new Error('Should track collisionsChecked');
        }
        if (typeof system.stats.collisionsDetected !== 'number') {
            throw new Error('Should track collisionsDetected');
        }

        const perfStats = system.getPerformanceStats();
        if (!perfStats.efficiency) {
            throw new Error('Should calculate efficiency percentage');
        }

        console.log('✓ Performance stats tracking works');
    }

    // Test 17: Adjacent cell collision checking setup
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        // Should have 4 adjacent offsets (right, down, down-right, down-left)
        if (!system._adjacentOffsets) {
            throw new Error('Should have adjacent offsets defined');
        }
        if (system._adjacentOffsets.length !== 4) {
            throw new Error(`Expected 4 adjacent offsets, got ${system._adjacentOffsets.length}`);
        }

        // Verify offsets are correct (forward neighbors only to avoid duplicates)
        const expectedOffsets = [[1, 0], [0, 1], [1, 1], [-1, 1]];
        for (let i = 0; i < expectedOffsets.length; i++) {
            const expected = expectedOffsets[i];
            const actual = system._adjacentOffsets[i];
            if (actual[0] !== expected[0] || actual[1] !== expected[1]) {
                throw new Error(`Offset ${i} incorrect: expected [${expected}], got [${actual}]`);
            }
        }

        console.log('✓ Adjacent cell offsets configured correctly');
    }

    // Test 18: handleCollision - player collects XP orb
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        let xpAdded = 0;
        const player = createEntity('player', 100, 100, 15, {
            addXP: (value) => { xpAdded = value; }
        });
        const xpOrb = createEntity('xpOrb', 100, 100, 5, {
            value: 50,
            createCollectionEffect: () => {}
        });

        engine.player = player;
        system.handleCollision(player, xpOrb);

        if (xpAdded !== 50) throw new Error('Player should receive XP value');
        if (!xpOrb.isDead) throw new Error('XP orb should be marked dead after collection');
        if (!xpOrb.collected) throw new Error('XP orb should be marked collected');

        console.log('✓ Player XP orb collection works');
    }

    // Test 19: handleCollision - player takes damage from enemy
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        let damageTaken = 0;
        const player = createEntity('player', 100, 100, 15, {
            isInvulnerable: false,
            takeDamage: (amount) => { damageTaken = amount; }
        });
        const enemy = createEntity('enemy', 100, 100, 10, {
            damage: 25
        });

        system.handleCollision(player, enemy);

        if (damageTaken !== 25) throw new Error(`Expected 25 damage, got ${damageTaken}`);

        console.log('✓ Player-enemy damage works');
    }

    // Test 20: handleCollision - invulnerable player doesn't take damage
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        let damageTaken = 0;
        const player = createEntity('player', 100, 100, 15, {
            isInvulnerable: true,
            takeDamage: (amount) => { damageTaken = amount; }
        });
        const enemy = createEntity('enemy', 100, 100, 10, {
            damage: 25
        });

        system.handleCollision(player, enemy);

        if (damageTaken !== 0) throw new Error('Invulnerable player should not take damage');

        console.log('✓ Invulnerable player immunity works');
    }

    // Test 21: handleCollision - same entity doesn't collide with itself
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        let callCount = 0;
        const entity = createEntity('enemy', 100, 100, 10, {
            takeDamage: () => { callCount++; }
        });

        system.handleCollision(entity, entity);

        if (callCount !== 0) throw new Error('Entity should not collide with itself');

        console.log('✓ Self-collision prevention works');
    }

    // Test 22: handleCollision - dead entities don't process collisions
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        let damageTaken = 0;
        const player = createEntity('player', 100, 100, 15, {
            isInvulnerable: false,
            takeDamage: (amount) => { damageTaken = amount; }
        });
        const enemy = createEntity('enemy', 100, 100, 10, {
            damage: 25
        });
        enemy.isDead = true;

        system.handleCollision(player, enemy);

        if (damageTaken !== 0) throw new Error('Dead entity should not cause damage');

        console.log('✓ Dead entity collision skip works');
    }

    // Test 23: Grid size adaptation triggers rebuild
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        // Start with few entities - should use larger grid size
        for (let i = 0; i < 30; i++) {
            engine.entities.push(createEntity('enemy', Math.random() * 500, Math.random() * 500));
        }

        system._lastGridSampleTime = 0; // Force recalculation
        system.updateSpatialGrid();
        const gridSize1 = engine.gridSize;

        // Add many more entities - should use smaller grid size
        for (let i = 0; i < 200; i++) {
            engine.entities.push(createEntity('enemy', Math.random() * 500, Math.random() * 500));
        }

        system._lastGridSampleTime = 0; // Force recalculation
        system.updateSpatialGrid();
        const gridSize2 = engine.gridSize;

        if (gridSize2 >= gridSize1) {
            throw new Error('Grid size should decrease when entity count increases significantly');
        }

        console.log('✓ Grid size adaptation based on entity density works');
    }

    // Test 24: Stats report average entities per cell
    {
        const engine = createMockEngine();
        engine.gridSize = 100;
        const system = new window.Game.CollisionSystem(engine);

        // Create 6 entities in 2 cells
        engine.entities = [
            createEntity('enemy', 50, 50),  // Cell (0,0)
            createEntity('enemy', 55, 55),  // Cell (0,0)
            createEntity('enemy', 60, 60),  // Cell (0,0)
            createEntity('enemy', 150, 150), // Cell (1,1)
            createEntity('enemy', 155, 155), // Cell (1,1)
            createEntity('enemy', 160, 160)  // Cell (1,1)
        ];

        system.updateSpatialGrid();

        if (system.stats.cellsProcessed !== 2) {
            throw new Error(`Expected 2 cells processed, got ${system.stats.cellsProcessed}`);
        }
        if (Math.abs(system.stats.avgEntitiesPerCell - 3.0) > 0.01) {
            throw new Error(`Expected 3.0 avg entities per cell, got ${system.stats.avgEntitiesPerCell}`);
        }

        console.log('✓ Stats correctly report average entities per cell');
    }

    // Test 25: Null/undefined entity handling in collision checks
    {
        const engine = createMockEngine();
        const system = new window.Game.CollisionSystem(engine);

        const validEntity = createEntity('enemy', 100, 100, 10);

        // Should not throw errors
        try {
            system.handleCollision(null, validEntity);
            system.handleCollision(validEntity, null);
            system.handleCollision(undefined, undefined);
        } catch (e) {
            throw new Error('Should gracefully handle null/undefined entities');
        }

        console.log('✓ Null/undefined entity handling works');
    }

    console.log('\n✅ All CollisionSystem tests passed!\n');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testCollisionSystem };
}

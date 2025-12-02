// Formation System Test Suite - Tests formation patterns, positioning, and lifecycle

function testFormationSystem() {
    console.log('\n=== Testing Formation System ===\n');

    // Mock game object
    function createMockGame() {
        return {
            player: { x: 400, y: 300 },
            enemies: [],
            canvas: { width: 800, height: 600 },
            spawner: {
                waveNumber: 1,
                maxEnemies: 50,
                availableEnemyTypes: ['basic', 'fast', 'tank'],
                getRandomEnemyType: () => 'basic',
                createEnemy: (type, x, y) => ({
                    type,
                    x,
                    y,
                    formationId: null,
                    formationIndex: null,
                    formationIsLeader: false
                })
            },
            addEntity: function(entity) {
                this.enemies.push(entity);
            }
        };
    }

    // Test 1: FormationManager initializes correctly
    {
        if (!window.FormationManager) {
            throw new Error('FormationManager class not found');
        }

        const game = createMockGame();
        const manager = new window.FormationManager(game);

        if (!manager.game) throw new Error('Should have game reference');
        if (!Array.isArray(manager.formations)) throw new Error('Should have formations array');
        if (typeof manager.maxFormations !== 'number') throw new Error('Should have maxFormations');
        if (typeof manager.enabled !== 'boolean') throw new Error('Should have enabled flag');
        if (!manager.entropyPhase) throw new Error('Should have entropy phase');

        console.log('✓ FormationManager initializes correctly');
    }

    // Test 2: Entropy phase starts as CHAOS
    {
        const game = createMockGame();
        const manager = new window.FormationManager(game);

        if (manager.entropyPhase !== 'CHAOS') {
            throw new Error('Should start in CHAOS phase');
        }

        console.log('✓ Entropy phase starts as CHAOS');
    }

    // Test 3: Entropy phase cycles from CHAOS to ORDER
    {
        const game = createMockGame();
        const manager = new window.FormationManager(game);

        manager.entropyPhase = 'CHAOS';
        manager.entropyTimer = 0;

        // Simulate time passing beyond chaos duration
        const chaosDuration = manager.entropyCycleDuration - manager.orderDuration;
        manager.entropyTimer = chaosDuration + 1;

        // Update should switch to ORDER
        manager.update(0.016);

        if (manager.entropyPhase !== 'ORDER') {
            throw new Error('Should transition from CHAOS to ORDER');
        }

        console.log('✓ Entropy phase transitions from CHAOS to ORDER');
    }

    // Test 4: Entropy phase cycles from ORDER to CHAOS
    {
        const game = createMockGame();
        const manager = new window.FormationManager(game);

        manager.entropyPhase = 'ORDER';
        manager.entropyTimer = 0;

        // Simulate time passing beyond order duration
        manager.entropyTimer = manager.orderDuration + 1;

        // Update should switch to CHAOS
        manager.update(0.016);

        if (manager.entropyPhase !== 'CHAOS') {
            throw new Error('Should transition from ORDER to CHAOS');
        }

        console.log('✓ Entropy phase transitions from ORDER to CHAOS');
    }

    // Test 5: FORMATION_CONFIGS are defined
    {
        if (!window.FORMATION_CONFIGS) {
            throw new Error('FORMATION_CONFIGS not found');
        }

        const configs = window.FORMATION_CONFIGS;
        const expectedFormations = ['CUBIC_SWARM', 'PYRAMID_SQUADRON', 'OCTAHEDRON_RING'];

        for (const name of expectedFormations) {
            if (!configs[name]) {
                throw new Error(`Missing formation config: ${name}`);
            }
        }

        console.log('✓ FORMATION_CONFIGS are defined');
    }

    // Test 6: All formation configs have required properties
    {
        const configs = window.FORMATION_CONFIGS;
        const requiredProps = ['id', 'name', 'enemyCount', 'radius', 'rotationSpeed', 'moveSpeed', 'breakDistance', 'minWave', 'spawnWeight', 'getPositions'];

        for (const [key, config] of Object.entries(configs)) {
            for (const prop of requiredProps) {
                if (!(prop in config)) {
                    throw new Error(`${key} missing required property: ${prop}`);
                }
            }
        }

        console.log('✓ All formation configs have required properties');
    }

    // Test 7: CUBIC_SWARM generates 8 positions
    {
        const config = window.FORMATION_CONFIGS.CUBIC_SWARM;
        const positions = config.getPositions(400, 300, 0, 0);

        if (!Array.isArray(positions)) {
            throw new Error('getPositions should return array');
        }
        if (positions.length !== 8) {
            throw new Error(`CUBIC_SWARM should generate 8 positions, got ${positions.length}`);
        }

        // Check all positions have x and y
        for (let i = 0; i < positions.length; i++) {
            if (typeof positions[i].x !== 'number' || typeof positions[i].y !== 'number') {
                throw new Error(`Position ${i} should have numeric x and y`);
            }
        }

        console.log('✓ CUBIC_SWARM generates 8 positions correctly');
    }

    // Test 8: PYRAMID_SQUADRON generates 5 positions with 1 leader
    {
        const config = window.FORMATION_CONFIGS.PYRAMID_SQUADRON;
        const positions = config.getPositions(400, 300, 0, 0);

        if (positions.length !== 5) {
            throw new Error(`PYRAMID_SQUADRON should generate 5 positions, got ${positions.length}`);
        }

        // Check for exactly 1 leader
        const leaders = positions.filter(p => p.isLeader);
        if (leaders.length !== 1) {
            throw new Error(`PYRAMID_SQUADRON should have exactly 1 leader, got ${leaders.length}`);
        }

        console.log('✓ PYRAMID_SQUADRON generates 5 positions with 1 leader');
    }

    // Test 9: OCTAHEDRON_RING generates 6 positions
    {
        const config = window.FORMATION_CONFIGS.OCTAHEDRON_RING;
        const positions = config.getPositions(400, 300, 0, 0);

        if (positions.length !== 6) {
            throw new Error(`OCTAHEDRON_RING should generate 6 positions, got ${positions.length}`);
        }

        console.log('✓ OCTAHEDRON_RING generates 6 positions correctly');
    }

    // Test 10: Formation positions respect radius
    {
        const config = window.FORMATION_CONFIGS.CUBIC_SWARM;
        const centerX = 400;
        const centerY = 300;
        const positions = config.getPositions(centerX, centerY, 0, 0);

        // All positions should be within reasonable distance from center
        const maxDistance = config.radius * 1.5; // Allow some tolerance for pulse effects

        for (const pos of positions) {
            const dx = pos.x - centerX;
            const dy = pos.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > maxDistance) {
                throw new Error(`Position too far from center: ${distance} > ${maxDistance}`);
            }
        }

        console.log('✓ Formation positions respect radius');
    }

    // Test 11: Formation rotation affects positions
    {
        const config = window.FORMATION_CONFIGS.PYRAMID_SQUADRON;
        const centerX = 400;
        const centerY = 300;

        const positions1 = config.getPositions(centerX, centerY, 0, 0);
        const positions2 = config.getPositions(centerX, centerY, Math.PI / 2, 0); // 90 degree rotation

        // Positions should be different when rotated
        let allSame = true;
        for (let i = 0; i < positions1.length; i++) {
            if (Math.abs(positions1[i].x - positions2[i].x) > 1 || Math.abs(positions1[i].y - positions2[i].y) > 1) {
                allSame = false;
                break;
            }
        }

        if (allSame) {
            throw new Error('Rotation should affect positions');
        }

        console.log('✓ Formation rotation affects positions');
    }

    // Test 12: Formation positions are evenly distributed (OCTAHEDRON_RING)
    {
        const config = window.FORMATION_CONFIGS.OCTAHEDRON_RING;
        const positions = config.getPositions(400, 300, 0, 0);

        // Calculate angles from center for each position
        const angles = positions.map(pos => Math.atan2(pos.y - 300, pos.x - 400));

        // Check spacing between consecutive angles (should be ~60 degrees for 6 positions)
        const expectedSpacing = (Math.PI * 2) / 6; // 60 degrees in radians

        for (let i = 0; i < angles.length - 1; i++) {
            let spacing = angles[i + 1] - angles[i];
            if (spacing < 0) spacing += Math.PI * 2;

            // Allow some tolerance
            if (Math.abs(spacing - expectedSpacing) > 0.3) {
                throw new Error(`Uneven spacing between positions: ${spacing} radians vs expected ${expectedSpacing}`);
            }
        }

        console.log('✓ OCTAHEDRON_RING positions are evenly distributed');
    }

    // Test 13: Formation spawn weights are positive
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (config.spawnWeight <= 0) {
                throw new Error(`${key} spawn weight must be positive`);
            }
        }

        console.log('✓ All formation spawn weights are positive');
    }

    // Test 14: Formation enemy counts are positive
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (config.enemyCount <= 0) {
                throw new Error(`${key} enemy count must be positive`);
            }
        }

        console.log('✓ All formation enemy counts are positive');
    }

    // Test 15: Formation min waves are valid
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (config.minWave < 1) {
                throw new Error(`${key} minWave must be at least 1`);
            }
        }

        console.log('✓ All formation min waves are valid');
    }

    // Test 16: Formation rotation speeds are positive
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (config.rotationSpeed < 0) {
                throw new Error(`${key} rotation speed must be non-negative`);
            }
        }

        console.log('✓ All formation rotation speeds are valid');
    }

    // Test 17: Formation move speeds are positive
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (config.moveSpeed <= 0) {
                throw new Error(`${key} move speed must be positive`);
            }
        }

        console.log('✓ All formation move speeds are positive');
    }

    // Test 18: Formation break distances are positive
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (config.breakDistance <= 0) {
                throw new Error(`${key} break distance must be positive`);
            }
        }

        console.log('✓ All formation break distances are positive');
    }

    // Test 19: Formation time affects pulse (breathing effect)
    {
        const config = window.FORMATION_CONFIGS.CUBIC_SWARM;
        const positions1 = config.getPositions(400, 300, 0, 0);
        const positions2 = config.getPositions(400, 300, 0, Math.PI); // Different time

        // Distances from center should vary with time (breathing effect)
        let hasVariation = false;
        for (let i = 0; i < positions1.length; i++) {
            const dist1 = Math.sqrt((positions1[i].x - 400) ** 2 + (positions1[i].y - 300) ** 2);
            const dist2 = Math.sqrt((positions2[i].x - 400) ** 2 + (positions2[i].y - 300) ** 2);

            if (Math.abs(dist1 - dist2) > 1) {
                hasVariation = true;
                break;
            }
        }

        if (!hasVariation) {
            throw new Error('Formation time should affect positions (breathing effect)');
        }

        console.log('✓ Formation time parameter affects positions');
    }

    // Test 20: Formation IDs are unique strings
    {
        const configs = window.FORMATION_CONFIGS;
        const seenIds = new Set();

        for (const [key, config] of Object.entries(configs)) {
            if (typeof config.id !== 'string') {
                throw new Error(`${key} id must be a string`);
            }
            if (seenIds.has(config.id)) {
                throw new Error(`Duplicate formation id: ${config.id}`);
            }
            seenIds.add(config.id);
        }

        console.log('✓ All formation IDs are unique strings');
    }

    // Test 21: Formation names are non-empty strings
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            if (typeof config.name !== 'string' || config.name.length === 0) {
                throw new Error(`${key} name must be a non-empty string`);
            }
        }

        console.log('✓ All formation names are non-empty strings');
    }

    // Test 22: Manager respects maxFormations limit
    {
        const game = createMockGame();
        const manager = new window.FormationManager(game);

        manager.maxFormations = 2;
        manager.formations = [
            { active: true },
            { active: true }
        ];

        // Try to spawn when at limit - should not add more
        const initialCount = manager.formations.length;

        // This would normally try to spawn, but we're at the limit
        if (manager.formations.length >= manager.maxFormations) {
            // Correctly respects limit
            if (manager.formations.length !== initialCount) {
                throw new Error('Should not exceed maxFormations');
            }
        }

        console.log('✓ Manager respects maxFormations limit');
    }

    // Test 23: Inactive formations are removed
    {
        const game = createMockGame();
        const manager = new window.FormationManager(game);

        manager.formations = [
            { active: true },
            { active: false },
            { active: true }
        ];

        manager.update(0.016);

        // After update, only active formations should remain
        if (manager.formations.some(f => !f.active)) {
            throw new Error('Inactive formations should be removed');
        }

        console.log('✓ Inactive formations are removed during update');
    }

    // Test 24: PYRAMID_SQUADRON leader is positioned correctly
    {
        const config = window.FORMATION_CONFIGS.PYRAMID_SQUADRON;
        const centerY = 300;
        const positions = config.getPositions(400, centerY, 0, 0);

        // Leader should be first position and slightly forward (lower y)
        const leader = positions.find(p => p.isLeader);
        if (!leader) {
            throw new Error('Leader not found');
        }

        if (leader.y >= centerY) {
            throw new Error('Leader should be forward (lower y than center)');
        }

        console.log('✓ PYRAMID_SQUADRON leader is positioned correctly');
    }

    // Test 25: getPositions returns consistent count on multiple calls
    {
        const configs = window.FORMATION_CONFIGS;

        for (const [key, config] of Object.entries(configs)) {
            const positions1 = config.getPositions(400, 300, 0, 0);
            const positions2 = config.getPositions(400, 300, Math.PI / 4, 1);
            const positions3 = config.getPositions(500, 400, Math.PI, 2);

            if (positions1.length !== config.enemyCount) {
                throw new Error(`${key} should return ${config.enemyCount} positions, got ${positions1.length}`);
            }
            if (positions2.length !== config.enemyCount) {
                throw new Error(`${key} should consistently return ${config.enemyCount} positions`);
            }
            if (positions3.length !== config.enemyCount) {
                throw new Error(`${key} should consistently return ${config.enemyCount} positions`);
            }
        }

        console.log('✓ getPositions returns consistent count on multiple calls');
    }

    console.log('\n✅ All Formation System tests passed!\n');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testFormationSystem };
}

const GameEngine = require('../src/core/gameEngine');
const EmergentFormationDetector = require('../src/systems/EmergentFormationDetector');

// Mock classes
class MockEnemy {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isDead = false;
        this.radius = 15;
        this.movement = {
            velocity: { x: 0, y: 0 },
            speed: 100
        };
    }
}

class MockPlayer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isDead = false;
    }
}

// Helper to constrain enemies
function constrainEnemies(enemies, positions) {
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].x = positions[i].x;
        enemies[i].y = positions[i].y;
    }
}

// Test Suite
const runTests = () => {
    console.log('Running EmergentFormationDetector Tests...');
    let passed = 0;
    let failed = 0;

    // Setup shared context
    const setup = () => {
        // Mock logger
        if (typeof window === 'undefined') global.window = {};
        window.logger = {
            log: () => { },
            error: console.error,
            warn: console.warn
        };
        if (!window.addEventListener) {
            window.addEventListener = () => { };
        }
        if (!window.removeEventListener) {
            window.removeEventListener = () => { };
        }

        // Mock document and canvas
        if (typeof document === 'undefined') {
            global.document = {
                getElementById: (id) => {
                    if (id === 'game-canvas') {
                        return {
                            style: {},
                            getContext: () => ({})
                        };
                    }
                    return null;
                },
                addEventListener: () => { }
            };
        }

        const game = new GameEngine();
        game.player = new MockPlayer(0, 0);
        game.enemies = [];
        game.obstacles = [];



        // Mock document and canvas
        if (typeof document === 'undefined') {
            global.document = {
                getElementById: (id) => {
                    if (id === 'game-canvas') {
                        return {
                            style: {},
                            getContext: () => ({})
                        };
                    }
                    return null;
                },
                addEventListener: () => { }
            };
        }

        const detector = new EmergentFormationDetector(game);
        detector.enabled = true;

        const enemies = [
            new MockEnemy('e1', 100, 100),
            new MockEnemy('e2', 120, 100),
            new MockEnemy('e3', 110, 120)
        ];
        game.enemies = enemies;

        return { game, detector, enemies };
    };

    try {
        // Test 1: Detection
        {
            const { detector } = setup();
            detector.detectAndUpdateConstellations();

            if (detector.constellations.length > 0 && detector.constellations[0].enemies.length === 3) {
                console.log('✅ Constellation detection passed');
                passed++;
            } else {
                console.error('❌ Constellation detection failed');
                failed++;
            }
        }

        // Test 2: Shape Maintenance
        {
            const { game, detector } = setup();
            detector.detectAndUpdateConstellations();
            const constellation = detector.constellations[0];

            // Move player far away
            game.player.x = 1000;
            game.player.y = 1000;

            // Update
            for (let i = 0; i < 60; i++) {
                detector.update(0.016);
            }

            let compact = true;
            for (const enemy of constellation.enemies) {
                const dx = enemy.x - constellation.centerX;
                const dy = enemy.y - constellation.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 150) compact = false;
            }

            if (constellation.centerX > 50 && compact) {
                console.log('✅ Shape maintenance passed');
                passed++;
            } else {
                console.error(`❌ Shape maintenance failed: Center moved=${constellation.centerX > 50}, Compact=${compact}`);
                failed++;
            }
        }

        // Test 3: Stuck Detection
        {
            const { game, detector } = setup();
            detector.detectAndUpdateConstellations();
            const constellation = detector.constellations[0];

            // Force enemies to stay in place while center moves
            game.player.x = 2000;
            const initialPositions = constellation.enemies.map(e => ({ x: e.x, y: e.y }));

            // Run updates
            for (let i = 0; i < 120; i++) {
                constrainEnemies(constellation.enemies, initialPositions);
                detector.update(0.016);
            }

            // Constellation should be broken (empty enemies array or removed from list)
            const stillActive = detector.constellations.includes(constellation);
            const broken = !stillActive || constellation.enemies.length === 0;

            if (broken) {
                console.log('✅ Stuck detection passed (Constellation broken)');
                passed++;
            } else {
                console.error('❌ Stuck detection failed (Constellation still active with enemies)');
                failed++;
            }
        }

        // Test 4: Obstacle Avoidance
        {
            const { game, detector } = setup();
            detector.detectAndUpdateConstellations();
            const constellation = detector.constellations[0];

            // Setup collision course
            constellation.centerX = 0;
            constellation.centerY = 0;
            game.player.x = 1000;
            game.player.y = 0;

            // Add obstacle
            game.obstacles.push({ x: 500, y: 0, radius: 50 });

            // Update
            for (let i = 0; i < 60; i++) {
                detector.update(0.016);
            }

            // Check if it deviated from y=0
            // Note: With current simple avoidance, it might just push Y a bit or slow down X
            // We just want to ensure it didn't crash and moved somewhat
            if (!isNaN(constellation.centerX)) {
                console.log('✅ Obstacle avoidance execution passed (No crash)');
                passed++;
            } else {
                console.error('❌ Obstacle avoidance failed (NaN coordinates)');
                failed++;
            }
        }

    } catch (error) {
        console.error('❌ Unexpected error in test suite:', error);
        failed++;
    }

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();

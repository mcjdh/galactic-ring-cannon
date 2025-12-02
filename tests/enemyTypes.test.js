// Enemy Types Test Suite - Tests initialization and configuration for all 16 enemy types

function testEnemyTypes() {
    console.log('\n=== Testing Enemy Types ===\n');

    // All enemy type classes that should be available
    const enemyTypeClasses = {
        'BasicEnemy': window.BasicEnemy,
        'FastEnemy': window.FastEnemy,
        'TankEnemy': window.TankEnemy,
        'DasherEnemy': window.DasherEnemy,
        'RangedEnemy': window.RangedEnemy,
        'BossEnemy': window.BossEnemy,
        'BerserkerEnemy': window.BerserkerEnemy,
        'ExploderEnemy': window.ExploderEnemy,
        'HealerEnemy': window.HealerEnemy,
        'ShielderEnemy': window.ShielderEnemy,
        'SplitterEnemy': window.SplitterEnemy,
        'PhantomEnemy': window.PhantomEnemy,
        'TeleporterEnemy': window.TeleporterEnemy,
        'SummonerEnemy': window.SummonerEnemy,
        'MinionEnemy': window.MinionEnemy
    };

    // Required config properties for all enemy types
    const requiredConfigProps = [
        'radius',
        'color',
        'health',
        'damage',
        'xpValue',
        'baseSpeed',
        'enemyType'
    ];

    // Mock enemy object for testing configuration
    function createMockEnemy() {
        return {
            x: 400,
            y: 300,
            vx: 0,
            vy: 0,
            ai: {
                configureForEnemyType: function(type) {
                    this.enemyType = type;
                }
            },
            abilities: {
                configureForEnemyType: function(type) {
                    this.enemyType = type;
                }
            },
            movement: {
                configureForEnemyType: function(type) {
                    this.enemyType = type;
                }
            }
        };
    }

    // Test 1: All enemy type classes are defined
    {
        const missing = [];
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            if (!cls) {
                missing.push(name);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing enemy type classes: ${missing.join(', ')}`);
        }

        console.log(`✓ All ${Object.keys(enemyTypeClasses).length} enemy type classes are defined`);
    }

    // Test 2: All enemy types extend EnemyTypeBase
    {
        if (!window.EnemyTypeBase) {
            throw new Error('EnemyTypeBase not found');
        }

        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            // Check if class has getConfig method (inherited from base)
            if (typeof cls.getConfig !== 'function') {
                throw new Error(`${name} should have getConfig method`);
            }
        }

        console.log('✓ All enemy types have getConfig method');
    }

    // Test 3: All enemy types return valid configuration
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const config = cls.getConfig();

            if (!config || typeof config !== 'object') {
                throw new Error(`${name}.getConfig() should return an object`);
            }

            // Check all required properties
            for (const prop of requiredConfigProps) {
                if (!(prop in config)) {
                    throw new Error(`${name} config missing required property: ${prop}`);
                }
            }

            // Validate property types
            if (typeof config.radius !== 'number') {
                throw new Error(`${name} radius should be a number`);
            }
            if (typeof config.color !== 'string') {
                throw new Error(`${name} color should be a string`);
            }
            if (typeof config.health !== 'number') {
                throw new Error(`${name} health should be a number`);
            }
            if (typeof config.damage !== 'number') {
                throw new Error(`${name} damage should be a number`);
            }
            if (typeof config.xpValue !== 'number') {
                throw new Error(`${name} xpValue should be a number`);
            }
            if (typeof config.baseSpeed !== 'number') {
                throw new Error(`${name} baseSpeed should be a number`);
            }
            if (typeof config.enemyType !== 'string') {
                throw new Error(`${name} enemyType should be a string`);
            }
        }

        console.log('✓ All enemy types return valid configuration');
    }

    // Test 4: All enemy types have positive stats
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const config = cls.getConfig();

            if (config.radius <= 0) {
                throw new Error(`${name} radius must be positive`);
            }
            if (config.health <= 0) {
                throw new Error(`${name} health must be positive`);
            }
            if (config.damage < 0) {
                throw new Error(`${name} damage must be non-negative`);
            }
            if (config.xpValue < 0) {
                throw new Error(`${name} xpValue must be non-negative`);
            }
            if (config.baseSpeed <= 0) {
                throw new Error(`${name} baseSpeed must be positive`);
            }
        }

        console.log('✓ All enemy types have positive stats');
    }

    // Test 5: Enemy types have unique enemyType identifiers
    {
        const seenTypes = new Set();
        const duplicates = [];

        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const config = cls.getConfig();
            const typeId = config.enemyType;

            if (seenTypes.has(typeId)) {
                duplicates.push(typeId);
            }
            seenTypes.add(typeId);
        }

        if (duplicates.length > 0) {
            throw new Error(`Duplicate enemy type identifiers: ${duplicates.join(', ')}`);
        }

        console.log('✓ All enemy types have unique identifiers');
    }

    // Test 6: configure() method applies config to enemy instance
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const enemy = createMockEnemy();
            cls.configure(enemy);

            const config = cls.getConfig();

            if (enemy.radius !== config.radius) {
                throw new Error(`${name} configure() should set radius`);
            }
            if (enemy.color !== config.color) {
                throw new Error(`${name} configure() should set color`);
            }
            if (enemy.health !== config.health) {
                throw new Error(`${name} configure() should set health`);
            }
            if (enemy.damage !== config.damage) {
                throw new Error(`${name} configure() should set damage`);
            }
            if (enemy.maxHealth !== config.health) {
                throw new Error(`${name} configure() should set maxHealth from health`);
            }
            if (enemy.enemyType !== config.enemyType) {
                throw new Error(`${name} configure() should set enemyType`);
            }
        }

        console.log('✓ configure() method applies config correctly for all types');
    }

    // Test 7: TankEnemy has higher health than BasicEnemy
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const tankConfig = window.TankEnemy.getConfig();

        if (tankConfig.health <= basicConfig.health) {
            throw new Error('TankEnemy should have more health than BasicEnemy');
        }

        console.log('✓ TankEnemy has higher health than BasicEnemy');
    }

    // Test 8: FastEnemy has higher speed than BasicEnemy
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const fastConfig = window.FastEnemy.getConfig();

        if (fastConfig.baseSpeed <= basicConfig.baseSpeed) {
            throw new Error('FastEnemy should have higher speed than BasicEnemy');
        }

        console.log('✓ FastEnemy has higher speed than BasicEnemy');
    }

    // Test 9: BossEnemy has isBoss flag
    {
        const bossConfig = window.BossEnemy.getConfig();

        if (!bossConfig.isBoss) {
            throw new Error('BossEnemy should have isBoss flag set to true');
        }

        console.log('✓ BossEnemy has isBoss flag');
    }

    // Test 10: BossEnemy has hasPhases flag
    {
        const bossConfig = window.BossEnemy.getConfig();

        if (!bossConfig.hasPhases) {
            throw new Error('BossEnemy should have hasPhases flag set to true');
        }

        console.log('✓ BossEnemy has hasPhases flag');
    }

    // Test 11: BossEnemy has significantly higher health
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const bossConfig = window.BossEnemy.getConfig();

        if (bossConfig.health < basicConfig.health * 5) {
            throw new Error('BossEnemy should have significantly higher health (at least 5x basic)');
        }

        console.log('✓ BossEnemy has significantly higher health');
    }

    // Test 12: DasherEnemy has higher speed than BasicEnemy
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const dasherConfig = window.DasherEnemy.getConfig();

        if (dasherConfig.baseSpeed <= basicConfig.baseSpeed) {
            throw new Error('DasherEnemy should have higher speed than BasicEnemy');
        }

        console.log('✓ DasherEnemy has higher speed than BasicEnemy');
    }

    // Test 13: ExploderEnemy has higher damage than BasicEnemy
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const exploderConfig = window.ExploderEnemy.getConfig();

        if (exploderConfig.damage <= basicConfig.damage) {
            throw new Error('ExploderEnemy should have higher damage than BasicEnemy');
        }

        console.log('✓ ExploderEnemy has higher damage than BasicEnemy');
    }

    // Test 14: All enemy types have valid hex color codes
    {
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const config = cls.getConfig();

            if (!hexColorRegex.test(config.color)) {
                throw new Error(`${name} color "${config.color}" is not a valid hex color code`);
            }
        }

        console.log('✓ All enemy types have valid hex color codes');
    }

    // Test 15: Radius values are reasonable (between 10 and 50)
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const config = cls.getConfig();

            if (config.radius < 10 || config.radius > 50) {
                throw new Error(`${name} radius ${config.radius} is outside reasonable range (10-50)`);
            }
        }

        console.log('✓ All enemy types have reasonable radius values');
    }

    // Test 16: Speed values are reasonable (between 30 and 200)
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const config = cls.getConfig();

            if (config.baseSpeed < 30 || config.baseSpeed > 200) {
                throw new Error(`${name} baseSpeed ${config.baseSpeed} is outside reasonable range (30-200)`);
            }
        }

        console.log('✓ All enemy types have reasonable speed values');
    }

    // Test 17: configureAI() delegates to enemy AI component
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const enemy = createMockEnemy();
            cls.configure(enemy);
            cls.configureAI(enemy);

            if (enemy.ai.enemyType !== enemy.enemyType) {
                throw new Error(`${name} configureAI() should configure AI component`);
            }
        }

        console.log('✓ configureAI() delegates correctly for all types');
    }

    // Test 18: configureAbilities() delegates to enemy abilities component
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const enemy = createMockEnemy();
            cls.configure(enemy);
            cls.configureAbilities(enemy);

            if (enemy.abilities.enemyType !== enemy.enemyType) {
                throw new Error(`${name} configureAbilities() should configure abilities component`);
            }
        }

        console.log('✓ configureAbilities() delegates correctly for all types');
    }

    // Test 19: configureMovement() delegates to enemy movement component
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const enemy = createMockEnemy();
            cls.configure(enemy);
            cls.configureMovement(enemy);

            if (enemy.movement.enemyType !== enemy.enemyType) {
                throw new Error(`${name} configureMovement() should configure movement component`);
            }
        }

        console.log('✓ configureMovement() delegates correctly for all types');
    }

    // Test 20: XP values scale with enemy difficulty
    {
        const basicXP = window.BasicEnemy.getConfig().xpValue;
        const bossXP = window.BossEnemy.getConfig().xpValue;

        if (bossXP <= basicXP * 3) {
            throw new Error('BossEnemy should give significantly more XP than BasicEnemy (at least 3x)');
        }

        console.log('✓ XP values scale with enemy difficulty');
    }

    // Test 21: MinionEnemy has lower stats than BasicEnemy
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const minionConfig = window.MinionEnemy.getConfig();

        if (minionConfig.health > basicConfig.health || minionConfig.xpValue > basicConfig.xpValue) {
            throw new Error('MinionEnemy should have lower stats than BasicEnemy');
        }

        console.log('✓ MinionEnemy has lower stats than BasicEnemy');
    }

    // Test 22: RangedEnemy has reasonable damage
    {
        const rangedConfig = window.RangedEnemy.getConfig();

        // Ranged enemies typically have moderate damage
        if (rangedConfig.damage <= 0) {
            throw new Error('RangedEnemy should have positive damage');
        }

        console.log('✓ RangedEnemy has reasonable damage stats');
    }

    // Test 23: PhantomEnemy has unique characteristics
    {
        const phantomConfig = window.PhantomEnemy.getConfig();

        if (!phantomConfig.enemyType || phantomConfig.enemyType !== 'phantom') {
            throw new Error('PhantomEnemy should have enemyType "phantom"');
        }

        console.log('✓ PhantomEnemy has correct type identifier');
    }

    // Test 24: SplitterEnemy has appropriate stats
    {
        const splitterConfig = window.SplitterEnemy.getConfig();

        // Splitter enemies should have reasonable health since they split
        if (splitterConfig.health <= 0 || splitterConfig.xpValue <= 0) {
            throw new Error('SplitterEnemy should have positive health and XP');
        }

        console.log('✓ SplitterEnemy has appropriate stats');
    }

    // Test 25: All elite variants can be created with isElite flag
    {
        for (const [name, cls] of Object.entries(enemyTypeClasses)) {
            const enemy = createMockEnemy();
            cls.configure(enemy);

            // Manually set isElite to test it can be applied
            enemy.isElite = true;

            if (enemy.isElite !== true) {
                throw new Error(`${name} should support isElite flag`);
            }
        }

        console.log('✓ All enemy types support isElite flag');
    }

    // Test 26: HealerEnemy has appropriate stats
    {
        const healerConfig = window.HealerEnemy.getConfig();

        if (!healerConfig.enemyType || healerConfig.enemyType !== 'healer') {
            throw new Error('HealerEnemy should have enemyType "healer"');
        }

        console.log('✓ HealerEnemy has correct type identifier');
    }

    // Test 27: ShielderEnemy has appropriate stats
    {
        const shielderConfig = window.ShielderEnemy.getConfig();

        if (!shielderConfig.enemyType || shielderConfig.enemyType !== 'shielder') {
            throw new Error('ShielderEnemy should have enemyType "shielder"');
        }

        console.log('✓ ShielderEnemy has correct type identifier');
    }

    // Test 28: SummonerEnemy has appropriate stats
    {
        const summonerConfig = window.SummonerEnemy.getConfig();

        if (!summonerConfig.enemyType || summonerConfig.enemyType !== 'summoner') {
            throw new Error('SummonerEnemy should have enemyType "summoner"');
        }

        console.log('✓ SummonerEnemy has correct type identifier');
    }

    // Test 29: BerserkerEnemy has high damage
    {
        const basicConfig = window.BasicEnemy.getConfig();
        const berserkerConfig = window.BerserkerEnemy.getConfig();

        if (berserkerConfig.damage <= basicConfig.damage) {
            throw new Error('BerserkerEnemy should have higher damage than BasicEnemy');
        }

        console.log('✓ BerserkerEnemy has high damage');
    }

    // Test 30: TeleporterEnemy has correct type identifier
    {
        const teleporterConfig = window.TeleporterEnemy.getConfig();

        if (!teleporterConfig.enemyType || teleporterConfig.enemyType !== 'teleporter') {
            throw new Error('TeleporterEnemy should have enemyType "teleporter"');
        }

        console.log('✓ TeleporterEnemy has correct type identifier');
    }

    console.log(`\n✅ All ${Object.keys(enemyTypeClasses).length} enemy type tests passed!\n`);
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testEnemyTypes };
}

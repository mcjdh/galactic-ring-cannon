/**
 * Formation Bonus System Test Suite
 * 
 * Tests for the FormationBonusSystem that applies pattern-specific bonuses
 * to enemies in constellations.
 */

// Setup global mocks
global.window = {
    Game: {},
    logger: null
};

const FormationBonusSystem = require('../src/systems/FormationBonusSystem');

// Mock classes
class MockEnemy {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isDead = false;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 10;
        this.baseSpeed = 100;
        this.speed = 100;
        this.constellation = null;
        this.constellationAnchor = null;
        this._formationBonus = null;
        this._breakDebuff = null;
        this.stats = {
            takeDamageRaw: (amount) => {
                this.health = Math.max(0, this.health - amount);
            },
            heal: (amount) => {
                this.health = Math.min(this.maxHealth, this.health + amount);
            }
        };
    }
}

function createMockConstellation(patternName, enemyCount, age = 5) {
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
        const enemy = new MockEnemy(`enemy_${i}`, 100 + i * 30, 100);
        enemy.constellationAnchor = i;
        enemies.push(enemy);
    }

    return {
        id: `constellation_${Date.now()}`,
        enemies,
        pattern: { name: patternName },
        centerX: 150,
        centerY: 100,
        age,
        rotation: 0
    };
}

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running Formation Bonus System Tests...\n');

    try {
        // =====================================================
        // TEST 1: Bonus definitions exist for key patterns
        // =====================================================
        {
            const hasArrow = FormationBonusSystem.BONUSES.ARROW !== undefined;
            const hasTriangle = FormationBonusSystem.BONUSES.TRIANGLE !== undefined;
            const hasShieldWall = FormationBonusSystem.BONUSES.SHIELD_WALL !== undefined;

            if (hasArrow && hasTriangle && hasShieldWall) {
                console.log('✅ Test 1: Bonus definitions exist for key patterns');
                passed++;
            } else {
                console.error('❌ Test 1: Missing bonus definitions');
                failed++;
            }
        }

        // =====================================================
        // TEST 2: getBonusMultiplier returns correct values
        // =====================================================
        {
            const mult0 = FormationBonusSystem.getBonusMultiplier(0);    // Should be 0
            const mult1 = FormationBonusSystem.getBonusMultiplier(1);    // Should be 0
            const mult3 = FormationBonusSystem.getBonusMultiplier(3);    // Should be 0.5
            const mult5 = FormationBonusSystem.getBonusMultiplier(5);    // Should be 1.0

            if (mult0 === 0 && mult1 === 0 && mult3 === 0.5 && mult5 === 1.0) {
                console.log('✅ Test 2: Bonus multiplier ramp-up works correctly');
                passed++;
            } else {
                console.error(`❌ Test 2: Ramp-up values wrong: ${mult0}, ${mult1}, ${mult3}, ${mult5}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 3: applyBonuses sets _formationBonus on enemies
        // =====================================================
        {
            const constellation = createMockConstellation('ARROW', 3);

            FormationBonusSystem.applyBonuses(constellation);

            const allHaveBonus = constellation.enemies.every(e => e._formationBonus !== null);
            if (allHaveBonus) {
                console.log('✅ Test 3: applyBonuses sets _formationBonus on enemies');
                passed++;
            } else {
                console.error('❌ Test 3: Some enemies missing _formationBonus');
                failed++;
            }
        }

        // =====================================================
        // TEST 4: removeBonuses clears _formationBonus
        // =====================================================
        {
            const constellation = createMockConstellation('ARROW', 3);
            FormationBonusSystem.applyBonuses(constellation);
            FormationBonusSystem.removeBonuses(constellation);

            const noneHaveBonus = constellation.enemies.every(e => e._formationBonus === undefined);
            if (noneHaveBonus) {
                console.log('✅ Test 4: removeBonuses clears _formationBonus');
                passed++;
            } else {
                console.error('❌ Test 4: Some enemies still have _formationBonus');
                failed++;
            }
        }

        // =====================================================
        // TEST 5: getSpeedMultiplier returns correct value for ARROW
        // =====================================================
        {
            const constellation = createMockConstellation('ARROW', 3, 5);
            FormationBonusSystem.applyBonuses(constellation);

            const enemy = constellation.enemies[0];
            const speedMult = FormationBonusSystem.getSpeedMultiplier(enemy, constellation);

            // ARROW has speedMult: 1.15, at age 5 (100% ramp-up)
            if (Math.abs(speedMult - 1.15) < 0.01) {
                console.log('✅ Test 5: getSpeedMultiplier returns correct value for ARROW');
                passed++;
            } else {
                console.error(`❌ Test 5: Expected 1.15, got ${speedMult}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 6: getDamageReduction returns correct value for SHIELD_WALL
        // =====================================================
        {
            const constellation = createMockConstellation('SHIELD_WALL', 7, 5);
            FormationBonusSystem.applyBonuses(constellation);

            const enemy = constellation.enemies[0];
            const dr = FormationBonusSystem.getDamageReduction(enemy, constellation);

            // SHIELD_WALL has damageReduction: 0.25, at age 5 (100% ramp-up)
            if (Math.abs(dr - 0.25) < 0.01) {
                console.log('✅ Test 6: getDamageReduction returns correct value for SHIELD_WALL');
                passed++;
            } else {
                console.error(`❌ Test 6: Expected 0.25, got ${dr}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 7: applyBreakDebuff sets debuff on enemies
        // =====================================================
        {
            const enemies = [new MockEnemy('e1', 0, 0), new MockEnemy('e2', 10, 0)];

            FormationBonusSystem.applyBreakDebuff(enemies);

            const allHaveDebuff = enemies.every(e => e._breakDebuff !== null);
            if (allHaveDebuff) {
                console.log('✅ Test 7: applyBreakDebuff sets debuff on enemies');
                passed++;
            } else {
                console.error('❌ Test 7: Some enemies missing _breakDebuff');
                failed++;
            }
        }

        // =====================================================
        // TEST 8: Break debuff reduces speed
        // =====================================================
        {
            const enemy = new MockEnemy('e1', 0, 0);

            // Apply debuff
            FormationBonusSystem.applyBreakDebuff([enemy]);

            const speedMult = FormationBonusSystem.getSpeedMultiplier(enemy);

            // Break debuff is 0.80 (-20% speed)
            if (Math.abs(speedMult - 0.80) < 0.01) {
                console.log('✅ Test 8: Break debuff reduces speed by 20%');
                passed++;
            } else {
                console.error(`❌ Test 8: Expected 0.80, got ${speedMult}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 9: Damage sharing distributes damage (TRIANGLE)
        // =====================================================
        {
            const constellation = createMockConstellation('TRIANGLE', 3, 5);
            FormationBonusSystem.applyBonuses(constellation);

            const target = constellation.enemies[0];
            const others = [constellation.enemies[1], constellation.enemies[2]];

            // Set initial health
            target.health = 100;
            others.forEach(e => e.health = 100);

            // Process 100 damage with 20% sharing
            const keptDamage = FormationBonusSystem.processDamageSharing(target, 100, constellation);

            // Should keep 80 damage, share 20 to others (10 each)
            const othersLostHealth = others.every(e => e.health < 100);

            if (Math.abs(keptDamage - 80) < 1 && othersLostHealth) {
                console.log('✅ Test 9: Damage sharing distributes damage correctly');
                passed++;
            } else {
                console.error(`❌ Test 9: Damage sharing failed. Kept: ${keptDamage}, Others lost health: ${othersLostHealth}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 10: Aura effects heal center enemy (CROSS)
        // =====================================================
        {
            const constellation = createMockConstellation('CROSS', 5, 5);
            FormationBonusSystem.applyBonuses(constellation);

            const centerEnemy = constellation.enemies[0];
            centerEnemy.health = 50;

            // Update aura effects for 1 second
            FormationBonusSystem.updateAuraEffects(constellation, 1.0);

            // CROSS heals 8 HP/sec at 100% ramp-up
            if (centerEnemy.health > 50) {
                console.log(`✅ Test 10: Aura effects heal center enemy (healed to ${centerEnemy.health})`);
                passed++;
            } else {
                console.error(`❌ Test 10: Center enemy not healed. Health: ${centerEnemy.health}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 11: No bonus at age < 2 seconds
        // =====================================================
        {
            const constellation = createMockConstellation('ARROW', 3, 1); // Age 1 second
            FormationBonusSystem.applyBonuses(constellation);

            const enemy = constellation.enemies[0];
            const speedMult = FormationBonusSystem.getSpeedMultiplier(enemy, constellation);

            // At age 1, bonus multiplier is 0, so speed should be 1.0
            if (speedMult === 1.0) {
                console.log('✅ Test 11: No bonus applied when formation is forming (age < 2s)');
                passed++;
            } else {
                console.error(`❌ Test 11: Expected 1.0 at forming age, got ${speedMult}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 12: Half bonus at age 2-4 seconds (stabilizing)
        // =====================================================
        {
            const constellation = createMockConstellation('ARROW', 3, 3); // Age 3 seconds
            FormationBonusSystem.applyBonuses(constellation);

            const enemy = constellation.enemies[0];
            const speedMult = FormationBonusSystem.getSpeedMultiplier(enemy, constellation);

            // ARROW speedMult is 1.15, at 50% ramp-up: 1 + (0.15 * 0.5) = 1.075
            if (Math.abs(speedMult - 1.075) < 0.01) {
                console.log('✅ Test 12: Half bonus during stabilizing phase (age 2-4s)');
                passed++;
            } else {
                console.error(`❌ Test 12: Expected 1.075, got ${speedMult}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 13: getDamageMultiplier works for V_FORMATION
        // =====================================================
        {
            const constellation = createMockConstellation('V_FORMATION', 5, 5);
            FormationBonusSystem.applyBonuses(constellation);

            const enemy = constellation.enemies[0];
            const damageMult = FormationBonusSystem.getDamageMultiplier(enemy, constellation);

            // V_FORMATION has damageMult: 1.08
            if (Math.abs(damageMult - 1.08) < 0.01) {
                console.log('✅ Test 13: getDamageMultiplier works for V_FORMATION');
                passed++;
            } else {
                console.error(`❌ Test 13: Expected 1.08, got ${damageMult}`);
                failed++;
            }
        }

        // =====================================================
        // TEST 14: Dead enemies don't receive bonuses
        // =====================================================
        {
            const constellation = createMockConstellation('ARROW', 3);
            constellation.enemies[0].isDead = true;

            FormationBonusSystem.applyBonuses(constellation);

            const deadEnemyHasBonus = constellation.enemies[0]._formationBonus !== null;
            const aliveHaveBonus = constellation.enemies.slice(1).every(e => e._formationBonus !== null);

            if (!deadEnemyHasBonus && aliveHaveBonus) {
                console.log('✅ Test 14: Dead enemies don\'t receive bonuses');
                passed++;
            } else {
                console.error('❌ Test 14: Dead enemy incorrectly received bonus');
                failed++;
            }
        }

        // =====================================================
        // TEST 15: Pattern without bonus doesn't crash
        // =====================================================
        {
            const constellation = createMockConstellation('UNKNOWN_PATTERN', 3);

            try {
                FormationBonusSystem.applyBonuses(constellation);
                FormationBonusSystem.removeBonuses(constellation);
                console.log('✅ Test 15: Pattern without bonus definition doesn\'t crash');
                passed++;
            } catch (error) {
                console.error(`❌ Test 15: Crashed on unknown pattern: ${error.message}`);
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

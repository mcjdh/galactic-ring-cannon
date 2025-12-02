// PlayerCombat Test Suite - Tests damage calculations, stacking formulas, and soft caps

function testPlayerCombat() {
    console.log('\n=== Testing PlayerCombat ===\n');

    // Mock player object
    function createMockPlayer(props = {}) {
        return {
            x: 400,
            y: 300,
            id: 'player-1',
            health: 100,
            maxHealth: 100,
            stats: {
                getKillStreakBonuses: () => ({ attackSpeed: 1.0, damage: 1.0 }),
                lifestealAmount: 0,
                lifestealCritMultiplier: 1,
                knockback: 0
            },
            abilities: {},
            spawnParticle: () => {},
            ...props
        };
    }

    // Test 1: Constructor initializes correctly
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        if (!combat.player) throw new Error('Should have player reference');
        if (typeof combat.attackSpeed !== 'number') throw new Error('Should initialize attackSpeed');
        if (typeof combat.attackDamage !== 'number') throw new Error('Should initialize attackDamage');
        if (typeof combat.critChance !== 'number') throw new Error('Should initialize critChance');
        if (typeof combat.critMultiplier !== 'number') throw new Error('Should initialize critMultiplier');
        if (!combat.BALANCE) throw new Error('Should have BALANCE constants');

        console.log('✓ PlayerCombat constructor initializes correctly');
    }

    // Test 2: Attack speed upgrade with diminishing returns
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const baseAttackSpeed = combat.attackSpeed;

        // First stack: Full 15% increase
        combat.applyCombatUpgrade({
            type: 'attackSpeed',
            multiplier: 1.15,
            stackCount: 1
        });
        const firstStack = combat.attackSpeed;

        // Second stack: Reduced effectiveness (0.9^1 = 0.9)
        combat.applyCombatUpgrade({
            type: 'attackSpeed',
            multiplier: 1.15,
            stackCount: 2
        });
        const secondStack = combat.attackSpeed;

        // Third stack: Further reduced (0.9^2 = 0.81)
        combat.applyCombatUpgrade({
            type: 'attackSpeed',
            multiplier: 1.15,
            stackCount: 3
        });
        const thirdStack = combat.attackSpeed;

        // Verify first stack gives full increase
        const firstIncrease = (firstStack - baseAttackSpeed) / baseAttackSpeed;
        if (Math.abs(firstIncrease - 0.15) > 0.001) {
            throw new Error(`First stack should be ~15% increase, got ${(firstIncrease * 100).toFixed(2)}%`);
        }

        // Verify subsequent stacks have diminishing returns
        const secondIncrease = (secondStack - firstStack) / firstStack;
        const thirdIncrease = (thirdStack - secondStack) / secondStack;

        if (secondIncrease >= firstIncrease) {
            throw new Error('Second stack should be less effective than first');
        }
        if (thirdIncrease >= secondIncrease) {
            throw new Error('Third stack should be less effective than second');
        }

        console.log('✓ Attack speed diminishing returns work correctly');
    }

    // Test 3: Damage upgrade with diminishing returns
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const baseDamage = combat.attackDamage;

        // Stack 1
        combat.applyCombatUpgrade({
            type: 'attackDamage',
            multiplier: 1.20,
            stackCount: 1
        });
        const stack1 = combat.attackDamage;

        // Stack 2
        combat.applyCombatUpgrade({
            type: 'attackDamage',
            multiplier: 1.20,
            stackCount: 2
        });
        const stack2 = combat.attackDamage;

        const increase1 = (stack1 - baseDamage) / baseDamage;
        const increase2 = (stack2 - stack1) / stack1;

        if (Math.abs(increase1 - 0.20) > 0.001) {
            throw new Error('First damage stack should be full 20% increase');
        }

        if (increase2 >= increase1) {
            throw new Error('Damage scaling should have diminishing returns');
        }

        // Verify scaling factor is 0.95^(stackCount-1)
        const expectedIncrease2 = 0.20 * 0.95; // 0.95^1
        if (Math.abs(increase2 - expectedIncrease2) > 0.001) {
            throw new Error(`Second stack should use 0.95 scaling factor, expected ~${(expectedIncrease2 * 100).toFixed(2)}%, got ${(increase2 * 100).toFixed(2)}%`);
        }

        console.log('✓ Damage diminishing returns work correctly');
    }

    // Test 4: Crit chance soft cap at 80%
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        // Start with low crit chance
        combat.critChance = 0.10;

        // Apply many crit upgrades
        for (let i = 0; i < 20; i++) {
            combat.applyCombatUpgrade({
                type: 'critChance',
                value: 0.10
            });
        }

        if (combat.critChance > 0.80) {
            throw new Error(`Crit chance should cap at 80%, got ${(combat.critChance * 100).toFixed(2)}%`);
        }

        // Should be at or very close to cap
        if (combat.critChance < 0.75) {
            throw new Error('After many upgrades, crit should approach the 80% cap');
        }

        console.log('✓ Crit chance soft cap at 80% works correctly');
    }

    // Test 5: Crit chance scaling reduces effectiveness near cap
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        // Test at 10% crit
        combat.critChance = 0.10;
        const critBefore1 = combat.critChance;
        combat.applyCombatUpgrade({
            type: 'critChance',
            value: 0.10
        });
        const increase1 = combat.critChance - critBefore1;

        // Test at 60% crit (near cap)
        combat.critChance = 0.60;
        const critBefore2 = combat.critChance;
        combat.applyCombatUpgrade({
            type: 'critChance',
            value: 0.10
        });
        const increase2 = combat.critChance - critBefore2;

        if (increase2 >= increase1) {
            throw new Error('Crit increase near cap should be smaller than far from cap');
        }

        console.log('✓ Crit chance scaling near soft cap works correctly');
    }

    // Test 6: Projectile speed soft cap at 1200
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        combat.projectileSpeed = 450;

        // Apply many speed upgrades
        for (let i = 0; i < 50; i++) {
            combat.applyCombatUpgrade({
                type: 'projectileSpeed',
                multiplier: 1.15
            });
        }

        if (combat.projectileSpeed > combat.BALANCE.MAX_PROJECTILE_SPEED) {
            throw new Error(`Projectile speed should cap at ${combat.BALANCE.MAX_PROJECTILE_SPEED}, got ${combat.projectileSpeed}`);
        }

        console.log('✓ Projectile speed soft cap works correctly');
    }

    // Test 7: Projectile speed diminishing returns at high values
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        // Test at low speed
        combat.projectileSpeed = 450;
        const speedBefore1 = combat.projectileSpeed;
        combat.applyCombatUpgrade({
            type: 'projectileSpeed',
            multiplier: 1.15
        });
        const increase1 = combat.projectileSpeed - speedBefore1;

        // Test at high speed (above 600 threshold)
        combat.projectileSpeed = 800;
        const speedBefore2 = combat.projectileSpeed;
        combat.applyCombatUpgrade({
            type: 'projectileSpeed',
            multiplier: 1.15
        });
        const increase2 = combat.projectileSpeed - speedBefore2;

        // At high speed, increase should be reduced
        const relativeIncrease1 = increase1 / speedBefore1;
        const relativeIncrease2 = increase2 / speedBefore2;

        if (relativeIncrease2 >= relativeIncrease1) {
            throw new Error('Projectile speed increase should be reduced at high speeds');
        }

        console.log('✓ Projectile speed diminishing returns work correctly');
    }

    // Test 8: Projectile count upgrade
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const initialCount = combat.projectileCount;

        combat.applyCombatUpgrade({
            type: 'projectileCount',
            value: 2
        });

        if (combat.projectileCount !== initialCount + 2) {
            throw new Error(`Expected ${initialCount + 2} projectiles, got ${combat.projectileCount}`);
        }

        if (!combat.hasSpreadAttack) {
            throw new Error('Should enable spread attack flag when projectile count > 1');
        }

        console.log('✓ Projectile count upgrade works correctly');
    }

    // Test 9: Piercing upgrade
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const initialPiercing = combat.piercing;

        combat.applyCombatUpgrade({
            type: 'piercing',
            value: 3
        });

        if (combat.piercing !== initialPiercing + 3) {
            throw new Error(`Expected piercing ${initialPiercing + 3}, got ${combat.piercing}`);
        }

        console.log('✓ Piercing upgrade works correctly');
    }

    // Test 10: Attack range upgrade
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const initialRange = combat.attackRange;

        combat.applyCombatUpgrade({
            type: 'attackRange',
            multiplier: 1.3
        });

        const expectedRange = initialRange * 1.3;
        if (Math.abs(combat.attackRange - expectedRange) > 0.01) {
            throw new Error(`Expected range ${expectedRange}, got ${combat.attackRange}`);
        }

        console.log('✓ Attack range upgrade works correctly');
    }

    // Test 11: Crit damage scaling with diminishing returns at extreme values
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        // Set to extreme value
        combat.critMultiplier = 5.0;

        const before = combat.critMultiplier;
        combat.applyScaledCritDamage(0.5);
        const increase = combat.critMultiplier - before;

        // Should be significantly less than 0.5 due to diminishing returns
        if (increase >= 0.5) {
            throw new Error('Crit damage should have diminishing returns at extreme values');
        }

        console.log('✓ Crit damage diminishing returns work correctly');
    }

    // Test 12: Crit damage normal scaling below threshold
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        combat.critMultiplier = 2.5; // Below 4.0 threshold

        const before = combat.critMultiplier;
        combat.applyScaledCritDamage(0.5);
        const increase = combat.critMultiplier - before;

        // Should get full increase when below threshold
        if (Math.abs(increase - 0.5) > 0.01) {
            throw new Error('Crit damage should not have diminishing returns below 4.0x');
        }

        console.log('✓ Crit damage normal scaling works correctly');
    }

    // Test 13: _calculateProjectileAngle for single projectile
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const baseAngle = Math.PI / 4; // 45 degrees
        const angle = combat._calculateProjectileAngle(baseAngle, 0, 1, 0);

        if (angle !== baseAngle) {
            throw new Error('Single projectile should fire straight at base angle');
        }

        console.log('✓ Single projectile angle calculation works correctly');
    }

    // Test 14: _calculateProjectileAngle for two projectiles
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const baseAngle = 0; // Straight right
        const totalSpread = Math.PI / 6; // 30 degrees

        const angle0 = combat._calculateProjectileAngle(baseAngle, 0, 2, totalSpread);
        const angle1 = combat._calculateProjectileAngle(baseAngle, 1, 2, totalSpread);

        // Should be symmetric around base angle
        const offset0 = angle0 - baseAngle;
        const offset1 = angle1 - baseAngle;

        if (Math.abs(offset0 + offset1) > 0.001) {
            throw new Error('Two projectiles should be symmetric around base angle');
        }

        if (Math.abs(Math.abs(offset0) - totalSpread / 2) > 0.001) {
            throw new Error('Projectiles should be spread by half of total spread on each side');
        }

        console.log('✓ Two projectile angle calculation works correctly');
    }

    // Test 15: _calculateProjectileAngle for three projectiles
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const baseAngle = 0;
        const totalSpread = Math.PI / 4; // 45 degrees

        const angle0 = combat._calculateProjectileAngle(baseAngle, 0, 3, totalSpread);
        const angle1 = combat._calculateProjectileAngle(baseAngle, 1, 3, totalSpread);
        const angle2 = combat._calculateProjectileAngle(baseAngle, 2, 3, totalSpread);

        // Middle projectile should go straight
        if (Math.abs(angle1 - baseAngle) > 0.001) {
            throw new Error('Middle projectile (index 1 of 3) should go straight');
        }

        // Outer projectiles should be symmetric
        const offset0 = angle0 - baseAngle;
        const offset2 = angle2 - baseAngle;

        if (Math.abs(offset0 + offset2) > 0.001) {
            throw new Error('Outer projectiles should be symmetric');
        }

        console.log('✓ Three projectile angle calculation works correctly');
    }

    // Test 16: _calculateProjectileAngle for five projectiles (even distribution)
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const baseAngle = 0;
        const totalSpread = Math.PI / 2; // 90 degrees

        const angles = [];
        for (let i = 0; i < 5; i++) {
            angles.push(combat._calculateProjectileAngle(baseAngle, i, 5, totalSpread));
        }

        // Check even spacing
        for (let i = 0; i < 4; i++) {
            const gap1 = angles[i + 1] - angles[i];
            const gap2 = angles[1] - angles[0];
            if (Math.abs(gap1 - gap2) > 0.001) {
                throw new Error('Projectiles should be evenly spaced');
            }
        }

        // Middle projectile should go straight
        if (Math.abs(angles[2] - baseAngle) > 0.001) {
            throw new Error('Middle projectile should go straight');
        }

        console.log('✓ Five projectile even distribution works correctly');
    }

    // Test 17: updateAttackCooldown with berserker bonus
    {
        const player = createMockPlayer({
            health: 30,
            maxHealth: 100,
            abilities: {
                hasBerserker: true,
                berserkerScaling: 0.5
            }
        });

        const combat = new PlayerCombat(player);
        const baseSpeed = combat.attackSpeed;

        combat.updateAttackCooldown();

        // At 30% health (70% missing), should have bonus
        const missingHealth = 0.7;
        const expectedMultiplier = 1.0 + (missingHealth * 0.5); // 1.35
        const expectedSpeed = baseSpeed * expectedMultiplier;

        const actualCooldown = combat.attackCooldown;
        const expectedCooldown = 1 / expectedSpeed;

        if (Math.abs(actualCooldown - expectedCooldown) > 0.01) {
            throw new Error(`Expected cooldown ~${expectedCooldown.toFixed(3)}, got ${actualCooldown.toFixed(3)}`);
        }

        console.log('✓ Berserker attack speed bonus works correctly');
    }

    // Test 18: updateAttackCooldown with kill streak bonus
    {
        const player = createMockPlayer({
            stats: {
                getKillStreakBonuses: () => ({ attackSpeed: 1.5, damage: 1.0 }),
                lifestealAmount: 0,
                lifestealCritMultiplier: 1,
                knockback: 0
            }
        });

        const combat = new PlayerCombat(player);
        const baseSpeed = combat.attackSpeed;

        combat.updateAttackCooldown();

        const expectedSpeed = baseSpeed * 1.5;
        const expectedCooldown = 1 / expectedSpeed;

        if (Math.abs(combat.attackCooldown - expectedCooldown) > 0.01) {
            throw new Error('Kill streak bonus should affect attack cooldown');
        }

        console.log('✓ Kill streak attack speed bonus works correctly');
    }

    // Test 19: updateAttackCooldown prevents division by zero
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        combat.attackSpeed = 0;
        combat.updateAttackCooldown();

        // Should use minimum attack speed of 0.1
        const expectedCooldown = 1 / 0.1;
        if (Math.abs(combat.attackCooldown - expectedCooldown) > 0.01) {
            throw new Error('Should prevent division by zero with minimum attack speed');
        }

        console.log('✓ Attack cooldown division by zero prevention works correctly');
    }

    // Test 20: Crit chance upgrade with critDamageBonus
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const initialCrit = combat.critChance;
        const initialCritMult = combat.critMultiplier;

        combat.applyCombatUpgrade({
            type: 'critChance',
            value: 0.05,
            critDamageBonus: 0.3
        });

        if (combat.critChance <= initialCrit) {
            throw new Error('Crit chance should increase');
        }
        if (combat.critMultiplier <= initialCritMult) {
            throw new Error('Crit multiplier should increase when upgrade has critDamageBonus');
        }

        console.log('✓ Crit chance upgrade with damage bonus works correctly');
    }

    // Test 21: getDebugInfo returns complete information
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const info = combat.getDebugInfo();

        const requiredFields = [
            'attackSpeed',
            'attackDamage',
            'attackRange',
            'projectileCount',
            'projectileSpeed',
            'critChance',
            'critMultiplier',
            'hasAOEAttack',
            'hasSpreadAttack',
            'rangeScaling',
            'speedScaling',
            'critCapUtilization',
            'attackCooldown',
            'activeWeapon'
        ];

        for (const field of requiredFields) {
            if (!(field in info)) {
                throw new Error(`Debug info missing field: ${field}`);
            }
        }

        console.log('✓ getDebugInfo returns complete information');
    }

    // Test 22: Balance constants are defined
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        if (combat.BALANCE.ATTACK_SPEED_SCALING !== 0.9) {
            throw new Error('Attack speed scaling should be 0.9');
        }
        if (combat.BALANCE.DAMAGE_SCALING !== 0.95) {
            throw new Error('Damage scaling should be 0.95');
        }
        if (combat.BALANCE.CRIT_SOFT_CAP !== 0.8) {
            throw new Error('Crit soft cap should be 0.8');
        }
        if (combat.BALANCE.MAX_PROJECTILE_SPEED !== 1200) {
            throw new Error('Max projectile speed should be 1200');
        }

        console.log('✓ Balance constants are correctly defined');
    }

    // Test 23: Stacking attack speed 10 times
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const initialSpeed = combat.attackSpeed;
        const increases = [];

        for (let i = 1; i <= 10; i++) {
            const before = combat.attackSpeed;
            combat.applyCombatUpgrade({
                type: 'attackSpeed',
                multiplier: 1.15,
                stackCount: i
            });
            const increase = (combat.attackSpeed - before) / before;
            increases.push(increase);
        }

        // Each increase should be smaller than the previous (diminishing returns)
        for (let i = 1; i < increases.length; i++) {
            if (increases[i] >= increases[i - 1]) {
                throw new Error(`Stack ${i + 1} should be less effective than stack ${i}`);
            }
        }

        console.log('✓ Stacking attack speed shows consistent diminishing returns');
    }

    // Test 24: Projectile spread upgrade
    {
        const player = createMockPlayer();
        const combat = new PlayerCombat(player);

        const initialSpread = combat.projectileSpread;

        combat.applyCombatUpgrade({
            type: 'projectileSpread',
            value: 15
        });

        if (combat.projectileSpread !== initialSpread + 15) {
            throw new Error(`Expected spread ${initialSpread + 15}, got ${combat.projectileSpread}`);
        }

        console.log('✓ Projectile spread upgrade works correctly');
    }

    // Test 25: Combined bonuses (berserker + kill streak)
    {
        const player = createMockPlayer({
            health: 40,
            maxHealth: 100,
            abilities: {
                hasBerserker: true,
                berserkerScaling: 0.5
            },
            stats: {
                getKillStreakBonuses: () => ({ attackSpeed: 1.2, damage: 1.3 }),
                lifestealAmount: 0,
                lifestealCritMultiplier: 1,
                knockback: 0
            }
        });

        const combat = new PlayerCombat(player);
        const baseSpeed = combat.attackSpeed;

        combat.updateAttackCooldown();

        // At 40% health (60% missing)
        const missingHealth = 0.6;
        const berserkerMult = 1.0 + (missingHealth * 0.5); // 1.3
        const streakMult = 1.2;
        const expectedSpeed = baseSpeed * berserkerMult * streakMult;
        const expectedCooldown = 1 / expectedSpeed;

        if (Math.abs(combat.attackCooldown - expectedCooldown) > 0.01) {
            throw new Error('Berserker and kill streak bonuses should stack multiplicatively');
        }

        console.log('✓ Combined bonuses (berserker + kill streak) work correctly');
    }

    console.log('\n✅ All PlayerCombat tests passed!\n');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testPlayerCombat };
}

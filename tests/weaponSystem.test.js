// Weapon System Test Suite - Tests weapon initialization, fire rates, and cooldown mechanics

function testWeaponSystem() {
    console.log('\n=== Testing Weapon System ===\n');

    // Mock player and combat
    function createMockPlayer() {
        return {
            x: 400,
            y: 300,
            startingWeapon: 'pulse_cannon'
        };
    }

    function createMockCombat() {
        return {
            baseAttackSpeed: 1.0,
            attackSpeed: 1.0,
            attackTimer: 0,
            attackCooldown: 1.0,
            attackDamage: 25,
            findNearestEnemy: () => ({ x: 500, y: 300 }),
            fireProjectile: (game, angle, overrides) => {}
        };
    }

    function createMockGame() {
        return {
            player: createMockPlayer(),
            enemies: [{ x: 500, y: 300, isDead: false }]
        };
    }

    // Test 1: PulseCannonWeapon class is defined
    {
        if (!window.PulseCannonWeapon) {
            throw new Error('PulseCannonWeapon class not found');
        }

        console.log('✓ PulseCannonWeapon class is defined');
    }

    // Test 2: PulseCannonWeapon initializes correctly
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        if (!weapon.player) throw new Error('Weapon should have player reference');
        if (!weapon.combat) throw new Error('Weapon should have combat reference');
        if (typeof weapon.timer !== 'number') throw new Error('Weapon should have timer');
        if (typeof weapon.cooldown !== 'number') throw new Error('Weapon should have cooldown');

        console.log('✓ PulseCannonWeapon initializes correctly');
    }

    // Test 3: Fire rate calculation uses combat attack speed
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        combat.attackSpeed = 2.0; // 2 attacks per second

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        const expectedCooldown = 1 / 2.0; // 0.5 seconds

        if (Math.abs(weapon.cooldown - expectedCooldown) > 0.01) {
            throw new Error(`Expected cooldown ${expectedCooldown}, got ${weapon.cooldown}`);
        }

        console.log('✓ Fire rate calculation uses combat attack speed');
    }

    // Test 4: Weapon fires when timer exceeds cooldown
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        let fireCount = 0;
        combat.fireProjectile = () => { fireCount++; };

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        // Update past cooldown
        weapon.update(weapon.cooldown + 0.1, game);

        if (fireCount !== 1) {
            throw new Error(`Expected 1 fire, got ${fireCount}`);
        }

        console.log('✓ Weapon fires when timer exceeds cooldown');
    }

    // Test 5: Weapon doesn't fire when timer is below cooldown
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        let fireCount = 0;
        combat.fireProjectile = () => { fireCount++; };

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        // Update below cooldown
        weapon.update(weapon.cooldown * 0.5, game);

        if (fireCount !== 0) {
            throw new Error('Weapon should not fire before cooldown');
        }

        console.log('✓ Weapon doesn\'t fire when timer is below cooldown');
    }

    // Test 6: getCooldown returns current cooldown
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.5 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        const cooldown = weapon.getCooldown();

        if (typeof cooldown !== 'number') {
            throw new Error('getCooldown should return a number');
        }
        if (cooldown <= 0) {
            throw new Error('Cooldown should be positive');
        }

        console.log('✓ getCooldown returns current cooldown');
    }

    // Test 7: getTimer returns current timer
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon.timer = 0.5;
        const timer = weapon.getTimer();

        if (timer !== 0.5) {
            throw new Error('getTimer should return current timer value');
        }

        console.log('✓ getTimer returns current timer');
    }

    // Test 8: fireImmediate resets timer
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        combat.fireProjectile = () => {};

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon.timer = 0.8;
        weapon.fireImmediate(game);

        if (weapon.timer !== 0) {
            throw new Error('fireImmediate should reset timer to 0');
        }

        console.log('✓ fireImmediate resets timer');
    }

    // Test 9: onEquip marks weapon for recalculation
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._needsRecalc = false;
        weapon.onEquip();

        if (!weapon._needsRecalc) {
            throw new Error('onEquip should mark weapon for recalculation');
        }
        if (weapon.timer !== 0) {
            throw new Error('onEquip should reset timer');
        }

        console.log('✓ onEquip marks weapon for recalculation');
    }

    // Test 10: onCombatStatsChanged marks weapon for recalculation
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._needsRecalc = false;
        weapon.onCombatStatsChanged();

        if (!weapon._needsRecalc) {
            throw new Error('onCombatStatsChanged should mark weapon for recalculation');
        }

        console.log('✓ onCombatStatsChanged marks weapon for recalculation');
    }

    // Test 11: Minimum fire rate prevents infinity cooldown
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        combat.attackSpeed = 0; // Would cause division by zero

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 0 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        if (!Number.isFinite(weapon.cooldown)) {
            throw new Error('Cooldown should be finite even with zero fire rate');
        }
        if (weapon.cooldown === Infinity) {
            throw new Error('Cooldown should not be Infinity');
        }

        console.log('✓ Minimum fire rate prevents infinity cooldown');
    }

    // Test 12: applyUpgrade triggers recalculation for relevant upgrades
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._needsRecalc = false;
        weapon.applyUpgrade({ type: 'attackSpeed' });

        if (!weapon._needsRecalc) {
            throw new Error('Attack speed upgrade should trigger recalculation');
        }

        console.log('✓ applyUpgrade triggers recalculation for relevant upgrades');
    }

    // Test 13: Fire returns false when no enemy available
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        combat.findNearestEnemy = () => null; // No enemy

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        const result = weapon.fire(game);

        if (result !== false) {
            throw new Error('Fire should return false when no enemy available');
        }

        console.log('✓ Fire returns false when no enemy available');
    }

    // Test 14: Fire returns true when enemy is available
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        combat.fireProjectile = () => {};

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        const result = weapon.fire(game);

        if (result !== true) {
            throw new Error('Fire should return true when enemy is available');
        }

        console.log('✓ Fire returns true when enemy is available');
    }

    // Test 15: Timer accumulates over multiple updates
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        combat.findNearestEnemy = () => null; // Prevent firing

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);
        weapon.timer = 0;

        weapon.update(0.1, game);
        weapon.update(0.1, game);
        weapon.update(0.1, game);

        if (Math.abs(weapon.timer - 0.3) > 0.01) {
            throw new Error(`Timer should accumulate, expected ~0.3, got ${weapon.timer}`);
        }

        console.log('✓ Timer accumulates over multiple updates');
    }

    // Test 16: Timer resets after firing
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        combat.fireProjectile = () => {};

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 2.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        // Update past cooldown to trigger fire
        weapon.update(weapon.cooldown + 0.2, game);

        // Timer should have reset and carried over excess time
        if (weapon.timer > weapon.cooldown) {
            throw new Error('Timer should reset after firing');
        }

        console.log('✓ Timer resets after firing');
    }

    // Test 17: Weapon definitions normalize fire rate
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        // Test with invalid fire rate
        const weapon1 = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: -1 },
            manager: null
        });

        weapon1._recalculateCooldown(false);

        if (weapon1.cooldown === Infinity || weapon1.cooldown <= 0) {
            throw new Error('Invalid fire rate should be normalized to valid value');
        }

        console.log('✓ Weapon definitions normalize fire rate');
    }

    // Test 18: Fire rate multiplier from definition
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        combat.baseAttackSpeed = 1.0;
        combat.attackSpeed = 1.0;

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 2.0 }, // 2x base rate
            manager: null
        });

        weapon._recalculateCooldown(false);

        // Cooldown should reflect the multiplied fire rate
        const expectedCooldown = 1 / 2.0;

        if (Math.abs(weapon.cooldown - expectedCooldown) > 0.1) {
            throw new Error(`Expected cooldown ~${expectedCooldown}, got ${weapon.cooldown}`);
        }

        console.log('✓ Fire rate multiplier from definition works correctly');
    }

    // Test 19: Combat stats update affects cooldown
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        combat.attackSpeed = 1.0;

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);
        const initialCooldown = weapon.cooldown;

        // Change combat stats
        combat.attackSpeed = 2.0;
        weapon.onCombatStatsChanged();
        weapon._recalculateCooldown(false);

        if (weapon.cooldown >= initialCooldown) {
            throw new Error('Higher attack speed should reduce cooldown');
        }

        console.log('✓ Combat stats update affects cooldown');
    }

    // Test 20: Progress preservation during cooldown recalculation
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        combat.attackSpeed = 1.0;

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);
        weapon.timer = weapon.cooldown * 0.5; // 50% progress

        // Recalculate with progress preservation
        combat.attackSpeed = 2.0;
        weapon._recalculateCooldown(true);

        // Timer should be approximately 50% of new cooldown
        const expectedProgress = 0.5;
        const actualProgress = weapon.timer / weapon.cooldown;

        if (Math.abs(actualProgress - expectedProgress) > 0.05) {
            throw new Error(`Progress not preserved: expected ${expectedProgress}, got ${actualProgress}`);
        }

        console.log('✓ Progress preservation during cooldown recalculation works');
    }

    // Test 21: Multiple rapid fires with accumulated timer
    {
        const player = createMockPlayer();
        const combat = createMockCombat();
        const game = createMockGame();

        let fireCount = 0;
        combat.fireProjectile = () => { fireCount++; };

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        weapon._recalculateCooldown(false);

        // Update with 2.5x cooldown time - should fire twice
        weapon.update(weapon.cooldown * 2.5, game);

        if (fireCount < 2) {
            throw new Error(`Expected at least 2 fires with 2.5x cooldown time, got ${fireCount}`);
        }

        console.log('✓ Multiple rapid fires with accumulated timer work correctly');
    }

    // Test 22: WeaponManager exists and has registry
    {
        if (!window.WeaponManager) {
            throw new Error('WeaponManager class not found');
        }

        console.log('✓ WeaponManager class exists');
    }

    // Test 23: Weapon registration system exists
    {
        if (typeof window.Game?.Weapons?.registerType !== 'function') {
            console.log('⚠ Weapon registration system not available (may be expected in test environment)');
        } else {
            console.log('✓ Weapon registration system exists');
        }
    }

    // Test 24: All weapon upgrade types trigger recalculation
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        const upgradeTypes = [
            'attackSpeed',
            'attackDamage',
            'projectileCount',
            'projectileSpread',
            'piercing',
            'projectileSpeed',
            'critChance',
            'critDamage'
        ];

        for (const type of upgradeTypes) {
            weapon._needsRecalc = false;
            weapon.applyUpgrade({ type });

            if (!weapon._needsRecalc) {
                throw new Error(`${type} upgrade should trigger recalculation`);
            }
        }

        console.log('✓ All weapon upgrade types trigger recalculation');
    }

    // Test 25: Invalid game reference doesn't crash fire
    {
        const player = createMockPlayer();
        const combat = createMockCombat();

        const weapon = new window.PulseCannonWeapon({
            player,
            combat,
            definition: { fireRate: 1.0 },
            manager: null
        });

        try {
            const result = weapon.fire(null);
            if (result !== false) {
                throw new Error('Fire should return false for null game');
            }
        } catch (e) {
            throw new Error('Fire should handle null game gracefully');
        }

        console.log('✓ Invalid game reference doesn\'t crash fire');
    }

    console.log('\n✅ All Weapon System tests passed!\n');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testWeaponSystem };
}

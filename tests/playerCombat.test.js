/**
 * PlayerCombat Tests
 * 
 * Tests the player combat component - handles attacking, projectiles, crits.
 * Critical for understanding:
 * - Attack cooldown and timing
 * - Projectile spawning and spread patterns
 * - Critical hit mechanics with soft caps
 * - Berserker mechanics (low health = more damage/speed)
 * - Upgrade application with diminishing returns
 */

// Mock dependencies
global.window = {
    GAME_CONSTANTS: {
        PLAYER: {
            BASE_ATTACK_SPEED: 1.2,
            BASE_ATTACK_DAMAGE: 25,
            BASE_ATTACK_RANGE: 300,
            BASE_PROJECTILE_SPEED: 450,
            BASE_CRIT_CHANCE: 0.10,
            BASE_CRIT_MULTIPLIER: 2.2,
            AOE_ATTACK_COOLDOWN: 2.0,
            AOE_ATTACK_RANGE: 150,
            AOE_DAMAGE_MULTIPLIER: 0.6
        },
        VISUAL_SYMBOLS: { CRITICAL: '*' }
    },
    Game: {},
    logger: { log: () => {}, warn: () => {}, error: () => {}, isDebugEnabled: () => false },
    gameManager: null,
    audioSystem: null,
    optimizedParticles: null
};

// Load PlayerCombat
const fs = require('fs');
const path = require('path');
const playerCombatCode = fs.readFileSync(
    path.join(__dirname, '../src/entities/player/PlayerCombat.js'), 
    'utf8'
);
// Execute the code and capture the class definition
const PlayerCombat = eval(`${playerCombatCode}; PlayerCombat;`);

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running PlayerCombat Tests...\n');

    const createMockPlayer = () => ({
        x: 100, y: 100,
        health: 100, maxHealth: 100,
        id: 'player-1',
        stats: {
            getKillStreakBonuses: () => ({ damage: 1.0, speed: 1.0, attackSpeed: 1.0 }),
            lifestealAmount: 0,
            lifestealCritMultiplier: 1,
            knockback: 0
        },
        abilities: null,
        spawnParticle: () => {}
    });

    // ==================== INITIALIZATION ====================
    console.log('=== Initialization ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        if (combat.attackSpeed === 1.2 && combat.attackDamage === 25 && combat.attackRange === 300) {
            console.log('✅ Initializes with correct attack stats');
            passed++;
        } else {
            throw new Error('Attack stats incorrect');
        }
    } catch (e) { console.error('❌ Attack stats init failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        if (combat.projectileSpeed === 450 && combat.projectileCount === 1 && 
            combat.piercing === 0) {
            console.log('✅ Initializes with correct projectile stats');
            passed++;
        } else {
            throw new Error('Projectile stats incorrect');
        }
    } catch (e) { console.error('❌ Projectile stats init failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        if (combat.critChance === 0.10 && combat.critMultiplier === 2.2) {
            console.log('✅ Initializes with correct crit stats');
            passed++;
        } else {
            throw new Error('Crit stats incorrect');
        }
    } catch (e) { console.error('❌ Crit stats init failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        if (Math.abs(combat.attackCooldown - (1 / 1.2)) < 0.001) {
            console.log('✅ Initializes attack cooldown from attack speed');
            passed++;
        } else {
            throw new Error(`Cooldown is ${combat.attackCooldown}`);
        }
    } catch (e) { console.error('❌ Cooldown init failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        if (combat.BALANCE.CRIT_SOFT_CAP === 0.8 && combat.BALANCE.MAX_PROJECTILE_SPEED === 1200) {
            console.log('✅ Initializes BALANCE constants');
            passed++;
        } else {
            throw new Error('Balance constants incorrect');
        }
    } catch (e) { console.error('❌ Balance constants init failed:', e.message); failed++; }

    // ==================== ATTACK COOLDOWN ====================
    console.log('\n=== Attack Cooldown ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.attackSpeed = 2.0;
        combat.updateAttackCooldown();
        if (Math.abs(combat.attackCooldown - 0.5) < 0.001) {
            console.log('✅ updateAttackCooldown() recalculates from attack speed');
            passed++;
        } else {
            throw new Error(`Cooldown is ${combat.attackCooldown}`);
        }
    } catch (e) { console.error('❌ Cooldown recalc failed:', e.message); failed++; }

    try {
        const mockPlayer = createMockPlayer();
        mockPlayer.stats.getKillStreakBonuses = () => ({ 
            damage: 1.0, speed: 1.0, attackSpeed: 1.5 
        });
        const combat = new PlayerCombat(mockPlayer);
        combat.updateAttackCooldown();
        // Base 1.2 * 1.5 = 1.8, cooldown = 1/1.8
        if (Math.abs(combat.attackCooldown - (1 / 1.8)) < 0.001) {
            console.log('✅ updateAttackCooldown() applies kill streak bonus');
            passed++;
        } else {
            throw new Error(`Cooldown is ${combat.attackCooldown}`);
        }
    } catch (e) { console.error('❌ Kill streak cooldown failed:', e.message); failed++; }

    try {
        const mockPlayer = createMockPlayer();
        mockPlayer.abilities = { hasBerserker: true, berserkerScaling: 0.5 };
        mockPlayer.health = 50;
        mockPlayer.maxHealth = 100;
        const combat = new PlayerCombat(mockPlayer);
        combat.updateAttackCooldown();
        // 50% missing health * 0.5 scaling = 25% bonus
        const expectedSpeed = 1.2 * 1.25;
        if (Math.abs(combat.attackCooldown - (1 / expectedSpeed)) < 0.01) {
            console.log('✅ updateAttackCooldown() applies Berserker bonus');
            passed++;
        } else {
            throw new Error(`Cooldown is ${combat.attackCooldown}`);
        }
    } catch (e) { console.error('❌ Berserker cooldown failed:', e.message); failed++; }

    // ==================== PROJECTILE ANGLES ====================
    console.log('\n=== Projectile Angle Calculation ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        const result = combat._calculateProjectileAngle(Math.PI, 0, 1, 0.5);
        if (result === Math.PI) {
            console.log('✅ _calculateProjectileAngle() returns base for single projectile');
            passed++;
        } else {
            throw new Error(`Got ${result}`);
        }
    } catch (e) { console.error('❌ Single projectile angle failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        const spreadRad = Math.PI / 4;
        const angle1 = combat._calculateProjectileAngle(0, 0, 2, spreadRad);
        const angle2 = combat._calculateProjectileAngle(0, 1, 2, spreadRad);
        if (Math.abs(angle1 - (-spreadRad / 2)) < 0.001 && 
            Math.abs(angle2 - (spreadRad / 2)) < 0.001) {
            console.log('✅ _calculateProjectileAngle() splits two projectiles evenly');
            passed++;
        } else {
            throw new Error('Two-split incorrect');
        }
    } catch (e) { console.error('❌ Two projectile split failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        const spreadRad = Math.PI / 3;
        const angle2 = combat._calculateProjectileAngle(0, 1, 3, spreadRad);
        if (Math.abs(angle2) < 0.001) {
            console.log('✅ _calculateProjectileAngle() centers odd number');
            passed++;
        } else {
            throw new Error(`Middle angle is ${angle2}`);
        }
    } catch (e) { console.error('❌ Odd centering failed:', e.message); failed++; }

    // ==================== FIRE PROJECTILE ====================
    console.log('\n=== Fire Projectile ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let spawnCount = 0;
        const mockGame = {
            spawnProjectile: () => { spawnCount++; return { id: 'test', piercing: 0 }; }
        };
        combat.fireProjectile(mockGame, 0);
        if (spawnCount === 1) {
            console.log('✅ fireProjectile() spawns single projectile by default');
            passed++;
        } else {
            throw new Error(`Spawned ${spawnCount}`);
        }
    } catch (e) { console.error('❌ Single spawn failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let spawnCount = 0;
        const mockGame = {
            spawnProjectile: () => { spawnCount++; return { id: 'test', piercing: 0 }; }
        };
        combat.projectileCount = 3;
        combat.fireProjectile(mockGame, 0);
        if (spawnCount === 3) {
            console.log('✅ fireProjectile() uses projectileCount for multi-shot');
            passed++;
        } else {
            throw new Error(`Spawned ${spawnCount}`);
        }
    } catch (e) { console.error('❌ Multi-shot failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let spawnCount = 0;
        const mockGame = {
            spawnProjectile: () => { spawnCount++; return { id: 'test', piercing: 0 }; }
        };
        combat.projectileCount = 2;
        combat.fireProjectile(mockGame, 0, { additionalProjectiles: 1 });
        if (spawnCount === 3) {
            console.log('✅ fireProjectile() respects additionalProjectiles override');
            passed++;
        } else {
            throw new Error(`Spawned ${spawnCount}`);
        }
    } catch (e) { console.error('❌ Additional projectiles failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let piercingValue = -1;
        const mockGame = {
            spawnProjectile: (x, y, config) => { 
                piercingValue = config.piercing; 
                return { id: 'test', piercing: config.piercing }; 
            }
        };
        combat.piercing = 3;
        combat.fireProjectile(mockGame, 0);
        if (piercingValue === 3) {
            console.log('✅ fireProjectile() applies piercing');
            passed++;
        } else {
            throw new Error(`Piercing is ${piercingValue}`);
        }
    } catch (e) { console.error('❌ Piercing failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let hookCalled = false;
        const mockGame = {
            spawnProjectile: () => ({ id: 'test', piercing: 0 })
        };
        combat.fireProjectile(mockGame, 0, {
            onProjectileSpawn: () => { hookCalled = true; }
        });
        if (hookCalled) {
            console.log('✅ fireProjectile() calls onProjectileSpawn hook');
            passed++;
        } else {
            throw new Error('Hook not called');
        }
    } catch (e) { console.error('❌ Spawn hook failed:', e.message); failed++; }

    // ==================== CRITICAL HITS ====================
    console.log('\n=== Critical Hits ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.critMultiplier = 2.0;
        combat.applyScaledCritDamage(0.5);
        if (combat.critMultiplier === 2.5) {
            console.log('✅ applyScaledCritDamage() full effect under cap');
            passed++;
        } else {
            throw new Error(`Crit is ${combat.critMultiplier}`);
        }
    } catch (e) { console.error('❌ Crit under cap failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.critMultiplier = 5.0;
        combat.applyScaledCritDamage(0.5);
        // Should apply diminishing returns since > 4.0
        if (combat.critMultiplier < 5.5 && combat.critMultiplier > 5.0) {
            console.log('✅ applyScaledCritDamage() applies diminishing returns');
            passed++;
        } else {
            throw new Error(`Crit is ${combat.critMultiplier}`);
        }
    } catch (e) { console.error('❌ Crit diminishing returns failed:', e.message); failed++; }

    // ==================== AOE ATTACK ====================
    console.log('\n=== AOE Attack ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let aoeCalled = false;
        combat.executeAOEAttack = () => { aoeCalled = true; };
        combat.hasAOEAttack = false;
        combat._updateAOEAttack(10.0, {});
        if (!aoeCalled) {
            console.log('✅ _updateAOEAttack() respects hasAOEAttack flag');
            passed++;
        } else {
            throw new Error('AOE called when disabled');
        }
    } catch (e) { console.error('❌ AOE flag respect failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        let aoeCalled = false;
        combat.executeAOEAttack = () => { aoeCalled = true; };
        combat.hasAOEAttack = true;
        combat.aoeAttackCooldown = 2.0;
        combat.aoeAttackTimer = 0;
        combat._updateAOEAttack(2.5, {});
        if (aoeCalled && combat.aoeAttackTimer === 0) {
            console.log('✅ _updateAOEAttack() triggers on cooldown expiry');
            passed++;
        } else {
            throw new Error('AOE not triggered');
        }
    } catch (e) { console.error('❌ AOE trigger failed:', e.message); failed++; }

    // ==================== COMBAT UPGRADES ====================
    console.log('\n=== Combat Upgrades ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.applyCombatUpgrade({ type: 'attackSpeed', multiplier: 1.15, stackCount: 1 });
        if (Math.abs(combat.attackSpeed - (1.2 * 1.15)) < 0.01) {
            console.log('✅ applyCombatUpgrade() handles attackSpeed');
            passed++;
        } else {
            throw new Error(`Speed is ${combat.attackSpeed}`);
        }
    } catch (e) { console.error('❌ attackSpeed upgrade failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        const initial = combat.attackSpeed;
        combat.applyCombatUpgrade({ type: 'attackSpeed', multiplier: 1.15, stackCount: 1 });
        const afterFirst = combat.attackSpeed;
        combat.applyCombatUpgrade({ type: 'attackSpeed', multiplier: 1.15, stackCount: 2 });
        const afterSecond = combat.attackSpeed;
        // Diminishing returns means each PERCENTAGE gain is smaller
        const firstPctGain = (afterFirst - initial) / initial;  // Should be 0.15
        const secondPctGain = (afterSecond - afterFirst) / afterFirst;  // Should be 0.135 (0.9 * 0.15)
        if (secondPctGain < firstPctGain) {
            console.log('✅ attackSpeed has diminishing returns (percentage gains)');
            passed++;
        } else {
            throw new Error(`Gains: first=${firstPctGain.toFixed(3)}, second=${secondPctGain.toFixed(3)}`);
        }
    } catch (e) { console.error('❌ attackSpeed diminishing returns failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.applyCombatUpgrade({ type: 'attackDamage', multiplier: 1.20, stackCount: 1 });
        if (combat.attackDamage === 30) {
            console.log('✅ applyCombatUpgrade() handles attackDamage');
            passed++;
        } else {
            throw new Error(`Damage is ${combat.attackDamage}`);
        }
    } catch (e) { console.error('❌ attackDamage upgrade failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.applyCombatUpgrade({ type: 'projectileCount', value: 2 });
        if (combat.projectileCount === 3 && combat.hasSpreadAttack) {
            console.log('✅ applyCombatUpgrade() handles projectileCount');
            passed++;
        } else {
            throw new Error(`Count is ${combat.projectileCount}`);
        }
    } catch (e) { console.error('❌ projectileCount upgrade failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.applyCombatUpgrade({ type: 'piercing', value: 2 });
        if (combat.piercing === 2) {
            console.log('✅ applyCombatUpgrade() handles piercing');
            passed++;
        } else {
            throw new Error(`Piercing is ${combat.piercing}`);
        }
    } catch (e) { console.error('❌ piercing upgrade failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.projectileSpeed = 1000;
        combat.applyCombatUpgrade({ type: 'projectileSpeed', multiplier: 1.5 });
        if (combat.projectileSpeed <= 1200) {
            console.log('✅ applyCombatUpgrade() handles projectileSpeed with cap');
            passed++;
        } else {
            throw new Error(`Speed is ${combat.projectileSpeed}`);
        }
    } catch (e) { console.error('❌ projectileSpeed cap failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        for (let i = 0; i < 10; i++) {
            combat.applyCombatUpgrade({ type: 'critChance', value: 0.10 });
        }
        if (combat.critChance <= 0.80) {
            console.log('✅ critChance respects soft cap');
            passed++;
        } else {
            throw new Error(`Crit is ${combat.critChance}`);
        }
    } catch (e) { console.error('❌ critChance soft cap failed:', e.message); failed++; }

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.applyCombatUpgrade({ type: 'attackRange', multiplier: 1.25 });
        if (combat.attackRange === 375) {
            console.log('✅ applyCombatUpgrade() handles attackRange');
            passed++;
        } else {
            throw new Error(`Range is ${combat.attackRange}`);
        }
    } catch (e) { console.error('❌ attackRange upgrade failed:', e.message); failed++; }

    // ==================== DEBUG INFO ====================
    console.log('\n=== Debug Info ===');

    try {
        const combat = new PlayerCombat(createMockPlayer());
        combat.projectileCount = 3;
        combat.critChance = 0.5;
        const debug = combat.getDebugInfo();
        if (debug.attackSpeed === 1.2 && debug.projectileCount === 3 && 
            debug.critChance === 0.5 && debug.critCapUtilization === '63%') {
            console.log('✅ getDebugInfo() returns comprehensive stats');
            passed++;
        } else {
            throw new Error('Debug info incomplete');
        }
    } catch (e) { console.error('❌ Debug info failed:', e.message); failed++; }

    // Final summary
    console.log('\n========================================');
    console.log(`PlayerCombat Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    return failed === 0;
};

// Run if executed directly
if (typeof module !== 'undefined' && require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

module.exports = { runTests };

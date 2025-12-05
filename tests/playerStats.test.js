/**
 * PlayerStats Tests
 * 
 * Tests the player stats component - manages health, XP, leveling, kill streaks.
 * Critical for understanding:
 * - Health and healing mechanics
 * - XP and leveling progression (piecewise scaling)
 * - Invulnerability frames
 * - Kill streak bonuses (damage, speed, attack speed, lifesteal)
 * - Damage reduction mechanics
 */

// Mock dependencies
global.window = {
    GAME_CONSTANTS: {
        PLAYER: {
            BASE_HEALTH: 120,
            INITIAL_XP_TO_LEVEL: 212,
            INVULNERABILITY_TIME: 0.5,
            LEVELING: {
                EARLY_LEVELS: 7,
                EARLY_MULTIPLIER: 1.08,
                MID_LEVELS: 22,
                MID_MULTIPLIER: 1.15,
                LATE_MULTIPLIER: 1.12
            },
            DAMAGE_INTAKE_MULTIPLIER: 1
        },
        VISUAL_SYMBOLS: { LEVEL_UP: '^', DODGE: '>', BLOCKED: '#' }
    },
    logger: { log: () => {}, warn: () => {}, error: () => {}, isDebugEnabled: () => false },
    gameManager: null,
    upgradeSystem: null,
    audioSystem: null
};

// Load PlayerStats
const fs = require('fs');
const path = require('path');
const playerStatsCode = fs.readFileSync(
    path.join(__dirname, '../src/entities/player/PlayerStats.js'), 
    'utf8'
);
// Execute the code and capture the class definition
const PlayerStats = eval(`${playerStatsCode}; PlayerStats;`);

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running PlayerStats Tests...\n');

    const createMockPlayer = () => ({
        x: 100, y: 100,
        abilities: null,
        maxHealth: 120
    });

    // ==================== INITIALIZATION ====================
    console.log('=== Initialization ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        if (playerStats.health === 120 && playerStats.maxHealth === 120) {
            console.log('✅ Initializes with correct health from constants');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.health}/${playerStats.maxHealth}`);
        }
    } catch (e) { console.error('❌ Health init failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        if (playerStats.xp === 0 && playerStats.xpToNextLevel === 212 && playerStats.level === 1) {
            console.log('✅ Initializes with correct XP values');
            passed++;
        } else {
            throw new Error('XP init incorrect');
        }
    } catch (e) { console.error('❌ XP init failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        if (playerStats.damageReduction === 0 && playerStats.dodgeChance === 0 &&
            playerStats.regeneration === 0 && playerStats.lifestealAmount === 0) {
            console.log('✅ Initializes defensive stats at zero');
            passed++;
        } else {
            throw new Error('Defensive stats not zero');
        }
    } catch (e) { console.error('❌ Defensive stats init failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        if (!playerStats.isInvulnerable && playerStats.invulnerabilityTime === 0.5) {
            console.log('✅ Initializes invulnerability system');
            passed++;
        } else {
            throw new Error('Invuln init incorrect');
        }
    } catch (e) { console.error('❌ Invuln init failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        if (playerStats.killStreak === 0 && playerStats.killStreakTimeout === 5.0) {
            console.log('✅ Initializes kill streak tracking');
            passed++;
        } else {
            throw new Error('Kill streak init incorrect');
        }
    } catch (e) { console.error('❌ Kill streak init failed:', e.message); failed++; }

    // ==================== HEALING ====================
    console.log('\n=== Healing ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.health = 50;
        playerStats.heal(30);
        if (playerStats.health === 80) {
            console.log('✅ heal() increases health');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.health}`);
        }
    } catch (e) { console.error('❌ heal increase failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.health = 100;
        playerStats.heal(100);
        if (playerStats.health === playerStats.maxHealth) {
            console.log('✅ heal() caps at maxHealth');
            passed++;
        } else {
            throw new Error('Health exceeded max');
        }
    } catch (e) { console.error('❌ heal cap failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.health = 50;
        playerStats.heal(-20);
        playerStats.heal(0);
        if (playerStats.health === 50) {
            console.log('✅ heal() ignores invalid amounts');
            passed++;
        } else {
            throw new Error('Invalid heal accepted');
        }
    } catch (e) { console.error('❌ heal validation failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.isDead = true;
        playerStats.health = 0;
        playerStats.heal(50);
        if (playerStats.health === 0) {
            console.log('✅ heal() does nothing when dead');
            passed++;
        } else {
            throw new Error('Dead player healed');
        }
    } catch (e) { console.error('❌ heal when dead failed:', e.message); failed++; }

    // ==================== DAMAGE ====================
    console.log('\n=== Taking Damage ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.takeDamage(30);
        if (playerStats.health === 90) {
            console.log('✅ takeDamage() reduces health');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.health}`);
        }
    } catch (e) { console.error('❌ takeDamage failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.takeDamage(10);
        if (playerStats.isInvulnerable && playerStats.invulnerabilityTimer === 0.5) {
            console.log('✅ takeDamage() triggers invulnerability');
            passed++;
        } else {
            throw new Error('Invuln not triggered');
        }
    } catch (e) { console.error('❌ Invuln trigger failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.isInvulnerable = true;
        const oldHealth = playerStats.health;
        playerStats.takeDamage(50);
        if (playerStats.health === oldHealth) {
            console.log('✅ takeDamage() ignored when invulnerable');
            passed++;
        } else {
            throw new Error('Damage taken while invuln');
        }
    } catch (e) { console.error('❌ Invuln protection failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.damageReduction = 0.25;
        playerStats.takeDamage(100);
        if (playerStats.health === 45) { // 120 - 75
            console.log('✅ takeDamage() applies damage reduction');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.health}`);
        }
    } catch (e) { console.error('❌ Damage reduction failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.takeDamage(150);
        if (playerStats.health === 0 && playerStats.isDead === true) {
            console.log('✅ takeDamage() sets isDead when health <= 0');
            passed++;
        } else {
            throw new Error('Death not triggered');
        }
    } catch (e) { console.error('❌ Death trigger failed:', e.message); failed++; }

    // ==================== INVULNERABILITY ====================
    console.log('\n=== Invulnerability ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.isInvulnerable = true;
        playerStats.invulnerabilityTimer = 0.5;
        playerStats.handleInvulnerability(0.3);
        if (Math.abs(playerStats.invulnerabilityTimer - 0.2) < 0.001 && playerStats.isInvulnerable) {
            console.log('✅ handleInvulnerability() counts down timer');
            passed++;
        } else {
            throw new Error('Timer not counting');
        }
    } catch (e) { console.error('❌ Invuln countdown failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.isInvulnerable = true;
        playerStats.invulnerabilityTimer = 0.2;
        playerStats.handleInvulnerability(0.3);
        if (!playerStats.isInvulnerable && playerStats.invulnerabilityTimer === 0) {
            console.log('✅ handleInvulnerability() clears when timer expires');
            passed++;
        } else {
            throw new Error('Invuln not cleared');
        }
    } catch (e) { console.error('❌ Invuln clear failed:', e.message); failed++; }

    // ==================== REGENERATION ====================
    console.log('\n=== Regeneration ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.regeneration = 5;
        playerStats.health = 100;
        playerStats.handleRegeneration(1.0);
        if (playerStats.health === 105) {
            console.log('✅ handleRegeneration() heals every second');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.health}`);
        }
    } catch (e) { console.error('❌ Regen failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.regeneration = 10;
        playerStats.health = 100;
        playerStats.handleRegeneration(0.5);
        if (playerStats.health === 100) {
            playerStats.handleRegeneration(0.5);
            if (playerStats.health === 110) {
                console.log('✅ handleRegeneration() accumulates partial time');
                passed++;
            } else {
                throw new Error('Partial time not accumulated');
            }
        } else {
            throw new Error('Healed before 1s');
        }
    } catch (e) { console.error('❌ Partial regen failed:', e.message); failed++; }

    // ==================== KILL STREAKS ====================
    console.log('\n=== Kill Streaks ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.addKillToStreak();
        if (playerStats.killStreak === 1) {
            console.log('✅ addKillToStreak() increments streak');
            passed++;
        } else {
            throw new Error('Streak not incremented');
        }
    } catch (e) { console.error('❌ Kill streak increment failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.killStreak = 5;
        playerStats.updateKillStreak(6.0);
        if (playerStats.killStreak === 0) {
            console.log('✅ updateKillStreak() expires streak after timeout');
            passed++;
        } else {
            throw new Error('Streak not expired');
        }
    } catch (e) { console.error('❌ Kill streak expiry failed:', e.message); failed++; }

    // ==================== KILL STREAK BONUSES ====================
    console.log('\n=== Kill Streak Bonuses ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.killStreak = 4;
        const bonuses = playerStats.getKillStreakBonuses();
        if (bonuses.damage === 1.0 && bonuses.speed === 1.0 && bonuses.lifesteal === 0) {
            console.log('✅ getKillStreakBonuses() returns 1.0 for low streaks');
            passed++;
        } else {
            throw new Error('Unexpected bonuses');
        }
    } catch (e) { console.error('❌ Low streak bonuses failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.killStreak = 5;
        const bonuses = playerStats.getKillStreakBonuses();
        if (bonuses.damage === 1.10 && bonuses.speed === 1.05) {
            console.log('✅ getKillStreakBonuses() scales at 5 kills');
            passed++;
        } else {
            throw new Error(`Got damage=${bonuses.damage}, speed=${bonuses.speed}`);
        }
    } catch (e) { console.error('❌ 5-kill bonuses failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.killStreak = 20;
        const bonuses = playerStats.getKillStreakBonuses();
        if (bonuses.lifesteal === 0) {
            console.log('✅ getKillStreakBonuses() no longer grants lifesteal at 20 kills');
            passed++;
        } else {
            throw new Error(`Got lifesteal=${bonuses.lifesteal}, expected 0`);
        }
    } catch (e) { console.error('❌ 20-kill bonuses failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.killStreak = 30;
        const bonuses = playerStats.getKillStreakBonuses();
        // Use approximate comparison for floating point
        const approxEqual = (a, b) => Math.abs(a - b) < 0.001;
        if (approxEqual(bonuses.damage, 1.55) && approxEqual(bonuses.speed, 1.30) && 
            approxEqual(bonuses.attackSpeed, 1.25) && bonuses.lifesteal === 0) {
            console.log('✅ getKillStreakBonuses() maxes at 30 kills (no lifesteal)');
            passed++;
        } else {
            throw new Error('Max bonuses incorrect');
        }
    } catch (e) { console.error('❌ 30-kill bonuses failed:', e.message); failed++; }

    // ==================== XP & LEVELING ====================
    console.log('\n=== XP & Leveling ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.addXP(50);
        if (playerStats.xp === 50) {
            console.log('✅ addXP() increases XP');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.xp}`);
        }
    } catch (e) { console.error('❌ addXP failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        const xpNeeded = playerStats.xpToNextLevel;
        playerStats.addXP(xpNeeded);
        if (playerStats.level === 2) {
            console.log('✅ addXP() triggers level up when threshold reached');
            passed++;
        } else {
            throw new Error(`Level is ${playerStats.level}`);
        }
    } catch (e) { console.error('❌ Level up trigger failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        const xpNeeded = playerStats.xpToNextLevel;
        playerStats.addXP(xpNeeded + 50);
        if (playerStats.level === 2 && playerStats.xp === 50) {
            console.log('✅ addXP() carries over excess XP');
            passed++;
        } else {
            throw new Error('Carryover incorrect');
        }
    } catch (e) { console.error('❌ XP carryover failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        const initialXP = playerStats.xpToNextLevel;
        playerStats.level = 3;
        playerStats.levelUp();
        if (playerStats.xpToNextLevel === Math.floor(initialXP * 1.08)) {
            console.log('✅ levelUp() uses early multiplier for early levels');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.xpToNextLevel}`);
        }
    } catch (e) { console.error('❌ Early multiplier failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.level = 10;
        const before = playerStats.xpToNextLevel;
        playerStats.levelUp();
        if (playerStats.xpToNextLevel === Math.floor(before * 1.15)) {
            console.log('✅ levelUp() uses mid multiplier for mid levels');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.xpToNextLevel}`);
        }
    } catch (e) { console.error('❌ Mid multiplier failed:', e.message); failed++; }

    // ==================== STATS UPGRADES ====================
    console.log('\n=== Stats Upgrades ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        const oldHealth = playerStats.health;
        playerStats.applyStatsUpgrade({ type: 'maxHealth', multiplier: 1.5 });
        if (playerStats.maxHealth === 180 && playerStats.health === oldHealth + 60) {
            console.log('✅ applyStatsUpgrade() handles maxHealth');
            passed++;
        } else {
            throw new Error('maxHealth upgrade failed');
        }
    } catch (e) { console.error('❌ maxHealth upgrade failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.applyStatsUpgrade({ type: 'regeneration', value: 3 });
        if (playerStats.regeneration === 3) {
            console.log('✅ applyStatsUpgrade() handles regeneration');
            passed++;
        } else {
            throw new Error('regeneration upgrade failed');
        }
    } catch (e) { console.error('❌ regeneration upgrade failed:', e.message); failed++; }

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.applyStatsUpgrade({ type: 'damageReduction', value: 0.5 });
        playerStats.applyStatsUpgrade({ type: 'damageReduction', value: 0.5 });
        if (playerStats.damageReduction === 0.75) {
            console.log('✅ applyStatsUpgrade() handles damageReduction with cap');
            passed++;
        } else {
            throw new Error(`Got ${playerStats.damageReduction}`);
        }
    } catch (e) { console.error('❌ damageReduction upgrade failed:', e.message); failed++; }

    // ==================== DEBUG INFO ====================
    console.log('\n=== Debug Info ===');

    try {
        const playerStats = new PlayerStats(createMockPlayer());
        playerStats.killStreak = 5;
        playerStats.health = 80;
        const debug = playerStats.getDebugInfo();
        if (debug.health === 80 && debug.maxHealth === 120 && debug.killStreak === 5) {
            console.log('✅ getDebugInfo() returns comprehensive stats');
            passed++;
        } else {
            throw new Error('Debug info incomplete');
        }
    } catch (e) { console.error('❌ Debug info failed:', e.message); failed++; }

    // Final summary
    console.log('\n========================================');
    console.log(`PlayerStats Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    return failed === 0;
};

// Run if executed directly
if (typeof module !== 'undefined' && require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

module.exports = { runTests };

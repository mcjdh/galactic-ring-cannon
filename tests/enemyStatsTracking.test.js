#!/usr/bin/env node

/**
 * Regression test to ensure EnemyStats reports damage to StatsManager.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setupEnvironment(damageLog) {
    const windowStub = {
        logger: {
            log() {},
            warn() {},
            error() {}
        },
        gameManager: {
            statsManager: {
                trackDamageDealt(amount) {
                    damageLog.push(amount);
                }
            },
            effectsManager: {
                createHitEffect() {}
            },
            showFloatingText() {},
            game: {
                enemies: [],
                addEntity() {}
            }
        }
    };

    windowStub.window = windowStub;

    global.window = windowStub;
    global.window.gameManagerBridge = windowStub.gameManager;
    global.document = {
        getElementById() {
            return null;
        }
    };
}

function loadEnemyStats() {
    const filePath = path.join(__dirname, '../src/entities/enemy/EnemyStats.js');
    const contents = fs.readFileSync(filePath, 'utf8');
    const wrapped = `${contents}\n;global.EnemyStats = typeof EnemyStats !== 'undefined' ? EnemyStats : global.EnemyStats;`;
    vm.runInThisContext(wrapped, { filename: 'EnemyStats.js' });
    return global.EnemyStats;
}

function createEnemy() {
    return {
        isDead: false,
        damageReduction: 0,
        damageResistance: 0,
        deflectChance: 0,
        abilities: {
            shieldActive: false,
            shieldReflection: 0,
            onDeath() {}
        },
        reflectAttack() {},
        x: 0,
        y: 0,
        maxHealth: 100,
        health: 100,
        pulseTimer: 0,
        pulseIntensity: 1,
        damageFlashTimer: 0,
        deathTimer: 0,
        opacity: 1
    };
}

function runTest() {
    const damageLog = [];
    setupEnvironment(damageLog);
    const EnemyStats = loadEnemyStats();
    if (!EnemyStats) {
        throw new Error('EnemyStats failed to load');
    }

    const enemy = createEnemy();
    EnemyStats.takeDamage(enemy, 25);

    if (damageLog.length !== 1 || damageLog[0] !== 25) {
        throw new Error(`Expected trackDamageDealt to record 25 once, got ${JSON.stringify(damageLog)}`);
    }

    console.log('+ EnemyStats reports damage to StatsManager');
}

try {
    runTest();
} catch (error) {
    console.error('! EnemyStats tracking regression:', error.message);
    console.error(error);
    process.exitCode = 1;
}

#!/usr/bin/env node

/**
 * CONFIGURATION VALIDATION TEST SUITE
 * Validates all game configuration files for structural integrity
 * Helps catch configuration errors before they cause runtime issues
 * Serves as documentation for required config structure
 */

// Mock global object for Node.js environment
global.window = global.window || { GAME_CONSTANTS: {} };

// Load configuration files
require('../src/config/gameConstants.js');
require('../src/config/upgrades.config.js');

const UPGRADE_DEFINITIONS = window.UPGRADE_DEFINITIONS || [];
const GAME_CONSTANTS = window.GAME_CONSTANTS || {};

function runTests() {
    console.log('[T] Running Configuration Validation Tests...\n');
    const results = { passed: 0, failed: 0, errors: [] };

    const test = (name, fn) => {
        try {
            fn();
            console.log(`+ ${name}`);
            results.passed++;
        } catch (error) {
            console.error(`! ${name}:`, error.message);
            results.failed++;
            results.errors.push({ test: name, error: error.message });
        }
    };

    const assert = (condition, message) => {
        if (!condition) throw new Error(message || 'Assertion failed');
    };

    // ============================================
    // UPGRADE DEFINITIONS STRUCTURE TESTS
    // ============================================

    test('Upgrade definitions exist and are non-empty', () => {
        assert(Array.isArray(UPGRADE_DEFINITIONS), 'UPGRADE_DEFINITIONS should be an array');
        assert(UPGRADE_DEFINITIONS.length > 0, 'UPGRADE_DEFINITIONS should not be empty');
        assert(UPGRADE_DEFINITIONS.length >= 20, 'Should have at least 20 upgrade definitions');
    });

    test('All upgrades have required fields', () => {
        const requiredFields = ['id', 'name', 'description', 'type', 'rarity', 'buildPath'];
        UPGRADE_DEFINITIONS.forEach((upgrade, index) => {
            requiredFields.forEach(field => {
                assert(upgrade.hasOwnProperty(field),
                    `Upgrade at index ${index} missing required field: ${field}`);
                assert(typeof upgrade[field] === 'string' && upgrade[field].length > 0,
                    `Upgrade "${upgrade.id || index}" has invalid ${field}`);
            });
        });
    });

    test('All upgrade IDs are unique', () => {
        const ids = UPGRADE_DEFINITIONS.map(u => u.id);
        const uniqueIds = new Set(ids);
        assert(ids.length === uniqueIds.size,
            `Duplicate upgrade IDs found: ${ids.length} total, ${uniqueIds.size} unique`);
    });

    test('Upgrade IDs follow naming convention', () => {
        UPGRADE_DEFINITIONS.forEach(upgrade => {
            // IDs should be lowercase with underscores
            assert(/^[a-z_0-9]+$/.test(upgrade.id),
                `Upgrade ID "${upgrade.id}" should be lowercase with underscores only`);
        });
    });

    test('All upgrades have valid rarity levels', () => {
        const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        UPGRADE_DEFINITIONS.forEach(upgrade => {
            assert(validRarities.includes(upgrade.rarity),
                `Upgrade "${upgrade.id}" has invalid rarity: ${upgrade.rarity}`);
        });
    });

    test('All upgrades have valid build paths', () => {
        const validBuildPaths = ['core', 'chain', 'orbit', 'ricochet', 'explosive', 'shotgun', 'support'];
        UPGRADE_DEFINITIONS.forEach(upgrade => {
            assert(validBuildPaths.includes(upgrade.buildPath),
                `Upgrade "${upgrade.id}" has invalid buildPath: ${upgrade.buildPath}`);
        });
    });

    test('Multiplier-based upgrades have valid multiplier values', () => {
        const multiplierTypes = ['attackSpeed', 'attackDamage', 'maxHealth', 'speed'];
        UPGRADE_DEFINITIONS
            .filter(u => multiplierTypes.includes(u.type))
            .forEach(upgrade => {
                assert(typeof upgrade.multiplier === 'number',
                    `Upgrade "${upgrade.id}" should have numeric multiplier`);
                assert(upgrade.multiplier > 0 && upgrade.multiplier <= 5,
                    `Upgrade "${upgrade.id}" multiplier ${upgrade.multiplier} out of reasonable range (0-5)`);
            });
    });

    test('Value-based upgrades have valid value properties', () => {
        const valueTypes = ['projectileCount', 'projectileSpread', 'piercing', 'magnet', 'regeneration'];
        UPGRADE_DEFINITIONS
            .filter(u => valueTypes.includes(u.type))
            .forEach(upgrade => {
                assert(typeof upgrade.value === 'number',
                    `Upgrade "${upgrade.id}" should have numeric value`);
                assert(Number.isFinite(upgrade.value),
                    `Upgrade "${upgrade.id}" value should be finite number`);
            });
    });

    test('Special upgrades have specialType defined', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'special')
            .forEach(upgrade => {
                assert(typeof upgrade.specialType === 'string',
                    `Special upgrade "${upgrade.id}" should have specialType`);
                const validSpecialTypes = ['chain', 'orbit', 'ricochet', 'explosion', 'shield'];
                assert(validSpecialTypes.includes(upgrade.specialType),
                    `Special upgrade "${upgrade.id}" has invalid specialType: ${upgrade.specialType}`);
            });
    });

    test('Chain upgrades have proper configuration', () => {
        const chainUpgrades = UPGRADE_DEFINITIONS.filter(u =>
            u.specialType === 'chain' || u.type === 'chain' || u.id.includes('chain'));

        chainUpgrades.forEach(upgrade => {
            if (upgrade.specialType === 'chain') {
                assert(typeof upgrade.value === 'number' && upgrade.value > 0 && upgrade.value <= 1,
                    `Chain upgrade "${upgrade.id}" should have probability value (0-1)`);
                assert(typeof upgrade.maxChains === 'number' && upgrade.maxChains > 0,
                    `Chain upgrade "${upgrade.id}" should have positive maxChains`);
            }
        });
    });

    test('Explosive upgrades have proper configuration', () => {
        const explosiveUpgrades = UPGRADE_DEFINITIONS.filter(u =>
            u.specialType === 'explosion' || u.id.includes('explosive'));

        explosiveUpgrades.forEach(upgrade => {
            if (upgrade.specialType === 'explosion') {
                assert(typeof upgrade.explosionRadius === 'number' && upgrade.explosionRadius > 0,
                    `Explosive upgrade "${upgrade.id}" should have positive explosionRadius`);
                assert(typeof upgrade.explosionDamage === 'number' && upgrade.explosionDamage > 0,
                    `Explosive upgrade "${upgrade.id}" should have positive explosionDamage`);
            }
        });
    });

    test('Orbit upgrades have proper configuration', () => {
        const orbitUpgrades = UPGRADE_DEFINITIONS.filter(u =>
            u.specialType === 'orbit' || u.id.includes('orbit'));

        orbitUpgrades.forEach(upgrade => {
            if (upgrade.specialType === 'orbit') {
                assert(typeof upgrade.orbitRadius === 'number' && upgrade.orbitRadius > 0,
                    `Orbit upgrade "${upgrade.id}" should have positive orbitRadius`);
                assert(typeof upgrade.orbitSpeed === 'number' && upgrade.orbitSpeed > 0,
                    `Orbit upgrade "${upgrade.id}" should have positive orbitSpeed`);
            }
        });
    });

    test('Ricochet upgrades have proper configuration', () => {
        const ricochetUpgrades = UPGRADE_DEFINITIONS.filter(u =>
            u.specialType === 'ricochet' || u.id.includes('ricochet'));

        ricochetUpgrades.forEach(upgrade => {
            if (upgrade.specialType === 'ricochet') {
                assert(typeof upgrade.ricochetChance === 'number' && upgrade.ricochetChance > 0 && upgrade.ricochetChance <= 1,
                    `Ricochet upgrade "${upgrade.id}" should have probability ricochetChance (0-1)`);
                assert(typeof upgrade.bounces === 'number' && upgrade.bounces > 0,
                    `Ricochet upgrade "${upgrade.id}" should have positive bounces`);
            }
        });
    });

    test('Upgrades with requirements reference valid upgrade IDs', () => {
        const allIds = new Set(UPGRADE_DEFINITIONS.map(u => u.id));

        UPGRADE_DEFINITIONS
            .filter(u => u.requires)
            .forEach(upgrade => {
                assert(Array.isArray(upgrade.requires),
                    `Upgrade "${upgrade.id}" requires should be an array`);
                upgrade.requires.forEach(requiredId => {
                    assert(allIds.has(requiredId),
                        `Upgrade "${upgrade.id}" requires non-existent upgrade: ${requiredId}`);
                });
            });
    });

    test('All upgrades have icons', () => {
        UPGRADE_DEFINITIONS.forEach(upgrade => {
            assert(typeof upgrade.icon === 'string' && upgrade.icon.length > 0,
                `Upgrade "${upgrade.id}" should have an icon`);
        });
    });

    test('Damage reduction values are percentages (0-1)', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'damageReduction')
            .forEach(upgrade => {
                assert(upgrade.value >= 0 && upgrade.value <= 1,
                    `Upgrade "${upgrade.id}" damage reduction should be 0-1 (percentage)`);
            });
    });

    // ============================================
    // GAME CONSTANTS VALIDATION
    // ============================================

    test('Game constants are defined', () => {
        assert(typeof GAME_CONSTANTS === 'object',
            'GAME_CONSTANTS should be an object');
        assert(Object.keys(GAME_CONSTANTS).length > 0,
            'GAME_CONSTANTS should not be empty');
    });

    test('Player constants are defined and valid', () => {
        const PLAYER = GAME_CONSTANTS.PLAYER;
        assert(PLAYER, 'PLAYER constants should exist');

        const requiredPlayerFields = {
            BASE_SPEED: { min: 0, max: 1000 },
            BASE_HEALTH: { min: 1, max: 1000 },
            BASE_ATTACK_SPEED: { min: 0.1, max: 10 },
            BASE_ATTACK_DAMAGE: { min: 1, max: 1000 },
            BASE_ATTACK_RANGE: { min: 0, max: 2000 },
            BASE_PROJECTILE_SPEED: { min: 0, max: 2000 },
            BASE_CRIT_CHANCE: { min: 0, max: 1 },
            BASE_CRIT_MULTIPLIER: { min: 1, max: 10 },
            BASE_MAGNET_RANGE: { min: 0, max: 1000 },
            RADIUS: { min: 1, max: 100 }
        };

        Object.entries(requiredPlayerFields).forEach(([field, range]) => {
            assert(typeof PLAYER[field] === 'number',
                `PLAYER.${field} should be a number`);
            assert(PLAYER[field] >= range.min && PLAYER[field] <= range.max,
                `PLAYER.${field} value ${PLAYER[field]} out of range (${range.min}-${range.max})`);
        });
    });

    test('Enemy constants are defined and valid', () => {
        const ENEMIES = GAME_CONSTANTS.ENEMIES;
        assert(ENEMIES, 'ENEMIES constants should exist');

        const requiredEnemyFields = {
            SPAWN_DISTANCE_MIN: { min: 0, max: 10000 },
            SPAWN_DISTANCE_MAX: { min: 0, max: 10000 },
            BASE_SPAWN_RATE: { min: 0, max: 100 },
            BASE_MAX_ENEMIES: { min: 1, max: 1000 },
            EARLY_GAME_DURATION: { min: 0, max: 300 },
            BOSS_BASE_INTERVAL: { min: 1, max: 1000 }
        };

        Object.entries(requiredEnemyFields).forEach(([field, range]) => {
            assert(typeof ENEMIES[field] === 'number',
                `ENEMIES.${field} should be a number`);
            assert(ENEMIES[field] >= range.min && ENEMIES[field] <= range.max,
                `ENEMIES.${field} value ${ENEMIES[field]} out of range (${range.min}-${range.max})`);
        });
    });

    test('Enemy spawn distances are logical', () => {
        const ENEMIES = GAME_CONSTANTS.ENEMIES;
        assert(ENEMIES.SPAWN_DISTANCE_MAX > ENEMIES.SPAWN_DISTANCE_MIN,
            'SPAWN_DISTANCE_MAX should be greater than SPAWN_DISTANCE_MIN');
    });

    test('Boss constants are defined and valid', () => {
        const BOSSES = GAME_CONSTANTS.BOSSES;
        if (BOSSES) {
            assert(typeof BOSSES === 'object', 'BOSSES should be an object');

            if (BOSSES.MIN_FIGHT_DURATION) {
                assert(BOSSES.MIN_FIGHT_DURATION > 0,
                    'MIN_FIGHT_DURATION should be positive');
            }

            if (BOSSES.DPS_SAFETY_MULTIPLIER) {
                assert(BOSSES.DPS_SAFETY_MULTIPLIER >= 1,
                    'DPS_SAFETY_MULTIPLIER should be >= 1');
            }
        }
    });

    test('Difficulty constants are defined and valid', () => {
        const DIFFICULTY = GAME_CONSTANTS.DIFFICULTY;
        if (DIFFICULTY) {
            assert(typeof DIFFICULTY === 'object', 'DIFFICULTY should be an object');

            if (DIFFICULTY.SCALING_INTERVAL) {
                assert(DIFFICULTY.SCALING_INTERVAL > 0,
                    'SCALING_INTERVAL should be positive');
            }
        }
    });

    test('Player crit soft cap is reasonable', () => {
        const PLAYER = GAME_CONSTANTS.PLAYER;
        if (PLAYER.CRIT_SOFT_CAP) {
            assert(PLAYER.CRIT_SOFT_CAP >= 0 && PLAYER.CRIT_SOFT_CAP <= 1,
                'CRIT_SOFT_CAP should be between 0 and 1 (percentage)');
            assert(PLAYER.CRIT_SOFT_CAP >= 0.5 && PLAYER.CRIT_SOFT_CAP <= 1,
                'CRIT_SOFT_CAP should be between 50% and 100%');
        }
    });

    test('XP scaling factors are reasonable', () => {
        const PLAYER = GAME_CONSTANTS.PLAYER;
        if (PLAYER.XP_SCALING_FACTOR) {
            assert(PLAYER.XP_SCALING_FACTOR >= 1 && PLAYER.XP_SCALING_FACTOR <= 2,
                'XP_SCALING_FACTOR should be between 1 and 2');
        }

        if (PLAYER.LEVELING) {
            const LEV = PLAYER.LEVELING;
            assert(LEV.EARLY_MULTIPLIER >= 1 && LEV.EARLY_MULTIPLIER <= 2,
                'EARLY_MULTIPLIER should be between 1 and 2');
            assert(LEV.MID_MULTIPLIER >= 1 && LEV.MID_MULTIPLIER <= 2,
                'MID_MULTIPLIER should be between 1 and 2');
            assert(LEV.LATE_MULTIPLIER >= 1 && LEV.LATE_MULTIPLIER <= 2,
                'LATE_MULTIPLIER should be between 1 and 2');
        }
    });

    test('Elite enemy multipliers are reasonable', () => {
        const ENEMIES = GAME_CONSTANTS.ENEMIES;
        if (ENEMIES.ELITE_HEALTH_MULTIPLIER) {
            assert(ENEMIES.ELITE_HEALTH_MULTIPLIER >= 1 && ENEMIES.ELITE_HEALTH_MULTIPLIER <= 10,
                'ELITE_HEALTH_MULTIPLIER should be between 1 and 10');
        }
        if (ENEMIES.ELITE_DAMAGE_MULTIPLIER) {
            assert(ENEMIES.ELITE_DAMAGE_MULTIPLIER >= 1 && ENEMIES.ELITE_DAMAGE_MULTIPLIER <= 10,
                'ELITE_DAMAGE_MULTIPLIER should be between 1 and 10');
        }
    });

    // ============================================
    // UPGRADE BALANCE TESTS (Sanity Checks)
    // ============================================

    test('Attack speed multipliers are not too extreme', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'attackSpeed')
            .forEach(upgrade => {
                assert(upgrade.multiplier >= 1.0 && upgrade.multiplier <= 3.0,
                    `Attack speed upgrade "${upgrade.id}" multiplier ${upgrade.multiplier} seems extreme (1.0-3.0 expected)`);
            });
    });

    test('Damage multipliers are not too extreme', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'attackDamage')
            .forEach(upgrade => {
                assert(upgrade.multiplier >= 1.0 && upgrade.multiplier <= 3.0,
                    `Damage upgrade "${upgrade.id}" multiplier ${upgrade.multiplier} seems extreme (1.0-3.0 expected)`);
            });
    });

    test('Health multipliers are not too extreme', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'maxHealth')
            .forEach(upgrade => {
                assert(upgrade.multiplier >= 1.0 && upgrade.multiplier <= 3.0,
                    `Health upgrade "${upgrade.id}" multiplier ${upgrade.multiplier} seems extreme (1.0-3.0 expected)`);
            });
    });

    test('Movement speed multipliers are not too extreme', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'speed')
            .forEach(upgrade => {
                assert(upgrade.multiplier >= 1.0 && upgrade.multiplier <= 2.5,
                    `Speed upgrade "${upgrade.id}" multiplier ${upgrade.multiplier} seems extreme (1.0-2.5 expected)`);
            });
    });

    test('Projectile spread values are reasonable', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'projectileSpread')
            .forEach(upgrade => {
                assert(upgrade.value >= 0 && upgrade.value <= 90,
                    `Spread upgrade "${upgrade.id}" value ${upgrade.value} seems extreme (0-90 degrees expected)`);
            });
    });

    test('Regeneration values are reasonable', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.type === 'regeneration')
            .forEach(upgrade => {
                assert(upgrade.value >= 0 && upgrade.value <= 50,
                    `Regen upgrade "${upgrade.id}" value ${upgrade.value} seems extreme (0-50 HP/s expected)`);
            });
    });

    test('Chain range values are reasonable', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.chainRange)
            .forEach(upgrade => {
                assert(upgrade.chainRange >= 50 && upgrade.chainRange <= 1000,
                    `Chain upgrade "${upgrade.id}" range ${upgrade.chainRange} seems extreme (50-1000 expected)`);
            });
    });

    test('Explosion radius values are reasonable', () => {
        UPGRADE_DEFINITIONS
            .filter(u => u.explosionRadius)
            .forEach(upgrade => {
                assert(upgrade.explosionRadius >= 20 && upgrade.explosionRadius <= 500,
                    `Explosive upgrade "${upgrade.id}" radius ${upgrade.explosionRadius} seems extreme (20-500 expected)`);
            });
    });

    // ============================================
    // CONFIGURATION COMPLETENESS TESTS
    // ============================================

    test('Core stat upgrades are available', () => {
        const coreTypes = ['attackSpeed', 'attackDamage', 'maxHealth', 'speed'];
        coreTypes.forEach(type => {
            const count = UPGRADE_DEFINITIONS.filter(u => u.type === type).length;
            assert(count > 0, `No upgrades found for core type: ${type}`);
        });
    });

    test('Multiple build paths are available', () => {
        const buildPaths = ['chain', 'orbit', 'ricochet', 'explosive'];
        buildPaths.forEach(path => {
            const count = UPGRADE_DEFINITIONS.filter(u => u.buildPath === path).length;
            assert(count > 0, `No upgrades found for build path: ${path}`);
        });
    });

    test('Support upgrades are available', () => {
        const supportTypes = ['magnet', 'regeneration', 'damageReduction'];
        supportTypes.forEach(type => {
            const count = UPGRADE_DEFINITIONS.filter(u => u.type === type).length;
            assert(count > 0, `No support upgrades found for type: ${type}`);
        });
    });

    test('Rarity distribution is reasonable', () => {
        const rarities = UPGRADE_DEFINITIONS.reduce((acc, u) => {
            acc[u.rarity] = (acc[u.rarity] || 0) + 1;
            return acc;
        }, {});

        assert(rarities.common >= 1, 'Should have at least 1 common upgrade');
        assert(rarities.uncommon >= 1, 'Should have at least 1 uncommon upgrade');
        assert(rarities.rare >= 1, 'Should have at least 1 rare upgrade');
    });

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log(`[S] Configuration Validation: ${results.passed} passed, ${results.failed} failed`);

    if (results.errors.length > 0) {
        console.log('\n[E] Failed tests:');
        results.errors.forEach(({ test, error }) => {
            console.log(`  - ${test}`);
            console.log(`    ${error}`);
        });
    }

    return results;
}

// Run tests if executed directly
if (require.main === module) {
    try {
        const results = runTests();
        process.exit(results.failed > 0 ? 1 : 0);
    } catch (err) {
        console.error('[FATAL] Uncaught error during test execution:', err && err.stack ? err.stack : err);
        process.exit(1);
    }
}

module.exports = { runTests };

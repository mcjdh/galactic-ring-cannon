#!/usr/bin/env node

/**
 * Quick regression test to ensure upgrade definitions remain immutable
 * after applying upgrades and that stack counts increment per run.
 */

function createLocalStorageStub() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

function setupGlobalEnvironment() {
    const localStorageStub = createLocalStorageStub();
    
    // Create StorageManager stub
    const StorageManager = {
        getBoolean(key, defaultValue = false) {
            const value = localStorageStub.getItem(key);
            if (value === null) return defaultValue;
            return value === 'true' || value === '1';
        },
        getItem(key, defaultValue = null) {
            const value = localStorageStub.getItem(key);
            return value !== null ? value : defaultValue;
        },
        setItem(key, value) {
            localStorageStub.setItem(key, value);
            return true;
        },
        getInt(key, defaultValue = 0) {
            const value = localStorageStub.getItem(key);
            if (value === null) return defaultValue;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
        },
        getFloat(key, defaultValue = 0.0) {
            const value = localStorageStub.getItem(key);
            if (value === null) return defaultValue;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        },
        getJSON(key, defaultValue = null) {
            const value = localStorageStub.getItem(key);
            if (value === null) return defaultValue;
            try {
                return JSON.parse(value);
            } catch (e) {
                return defaultValue;
            }
        },
        setJSON(key, value) {
            try {
                const json = JSON.stringify(value);
                localStorageStub.setItem(key, json);
                return true;
            } catch (e) {
                return false;
            }
        }
    };
    
    const windowStub = {
        Game: {},
        GAME_CONSTANTS: {
            PLAYER: {
                RADIUS: 20
            },
            COLORS: {
                PLAYER: '#3498db'
            }
        },
        CHARACTER_DEFINITIONS: [
            {
                id: 'test_pilot',
                weaponId: 'pulse_cannon',
                modifiers: {}
            }
        ],
        logger: {
            log() {},
            warn() {},
            error() {}
        },
        addEventListener() {},
        removeEventListener() {},
        StorageManager: StorageManager
    };

    windowStub.window = windowStub;
    windowStub.localStorage = localStorageStub;
    windowStub.gameManager = {
        showFloatingText() {},
        addXpCollected(amount) {
            return amount;
        },
        statsManager: {
            trackSpecialEvent() {}
        },
        game: {}
    };

    const documentStub = {
        getElementById() {
            return null;
        },
        addEventListener() {}
    };

    global.window = windowStub;
    global.document = documentStub;
    global.localStorage = windowStub.localStorage;

    // Minimal stubs for player component classes used by Player.js
    global.PlayerStats = class {
        constructor(player) {
            this.player = player;
            this.health = 100;
            this.maxHealth = 100;
        }
        updateXPBar() {}
        applyStatsUpgrade() {}
        heal() {}
        addXP() {}
        addExperience() {}
        takeDamage() {}
    };

    global.PlayerMovement = class {
        constructor(player) {
            this.player = player;
            this.speed = 220;
        }
        update() {}
        applyMovementUpgrade() {}
        setLowQuality() {}
    };

    global.PlayerCombat = class {
        constructor(player) {
            this.player = player;
            this.attackDamage = 10;
            this.critChance = 0.05;
            this.critMultiplier = 2.0;
            this.weaponManager = {
                applyUpgrade() {},
                notifyCombatStatChange() {}
            };
        }
        update() {}
        applyCombatUpgrade() {}
        updateAttackCooldown() {}
    };

    global.PlayerAbilities = class {
        constructor(player) {
            this.player = player;
        }
        update() {}
        applyAbilityUpgrade() {}
        createLightningEffect() {}
        createRicochetEffect() {}
    };

    global.PlayerRenderer = class {
        constructor(player) {
            this.player = player;
        }
        render() {}
        createUpgradeStackEffect() {}
    };
}

function runTest() {
    setupGlobalEnvironment();

    // Load upgrade definitions and system
    require('../src/config/upgrades.config.js');
    require('../src/systems/upgrades.js');
    require('../src/entities/player/Player.js');

    const { UpgradeSystem } = window.Game;
    const { Player } = window.Game;

    if (!UpgradeSystem || !Player) {
        throw new Error('Failed to load required game classes');
    }

    const upgradeSystem = new UpgradeSystem();
    const player = new Player(0, 0);
    window.gameManager.game.player = player;

    const targetUpgrade = window.UPGRADE_DEFINITIONS.find(def => def.id === 'multi_shot_1');
    if (!targetUpgrade) {
        throw new Error('Test upgrade definition not found');
    }

    const serializedDefinition = JSON.stringify(targetUpgrade);

    upgradeSystem._applyUpgradeCore(targetUpgrade);
    upgradeSystem._applyUpgradeCore(targetUpgrade);

    const definitionAfter = JSON.stringify(targetUpgrade);
    if (definitionAfter !== serializedDefinition) {
        throw new Error('Upgrade definition was mutated during application');
    }

    if (!Array.isArray(player.upgrades) || player.upgrades.length !== 2) {
        throw new Error('Player did not record applied upgrades');
    }

    const [first, second] = player.upgrades;
    if (first.stackCount !== 1 || second.stackCount !== 2) {
        throw new Error(`Unexpected stack counts: [${first.stackCount}, ${second.stackCount}]`);
    }

    console.log('Upgrade mutation regression test passed');
}

try {
    runTest();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}

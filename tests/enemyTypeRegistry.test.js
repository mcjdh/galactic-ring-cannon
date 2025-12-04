/**
 * EnemyTypeRegistry Tests
 * 
 * Tests the enemy type registry - maps type strings to configuration classes.
 * Critical for understanding:
 * - Enemy type catalog (15 types: basic, fast, tank, ranged, etc.)
 * - Registry pattern with static methods
 * - How enemy spawning finds type configurations
 * - Type validation and fallback behavior
 */

// Mock dependencies
global.window = {
    logger: { log: () => {}, warn: () => {}, error: () => {}, isDebugEnabled: () => false }
};

// Mock all enemy type classes BEFORE loading the registry
// These classes need to exist in global scope for the registry static initializer
const createMockEnemyType = (name) => ({
    name,
    getConfig: () => ({ type: name, health: 100 })
});

global.BasicEnemy = createMockEnemyType('basic');
global.FastEnemy = createMockEnemyType('fast');
global.TankEnemy = createMockEnemyType('tank');
global.RangedEnemy = createMockEnemyType('ranged');
global.DasherEnemy = createMockEnemyType('dasher');
global.ExploderEnemy = createMockEnemyType('exploder');
global.SplitterEnemy = createMockEnemyType('splitter');
global.HealerEnemy = createMockEnemyType('healer');
global.TeleporterEnemy = createMockEnemyType('teleporter');
global.PhantomEnemy = createMockEnemyType('phantom');
global.ShielderEnemy = createMockEnemyType('shielder');
global.SummonerEnemy = createMockEnemyType('summoner');
global.BerserkerEnemy = createMockEnemyType('berserker');
global.MinionEnemy = createMockEnemyType('minion');
global.BossEnemy = createMockEnemyType('boss');

// Load EnemyTypeRegistry
const fs = require('fs');
const path = require('path');
const registryCode = fs.readFileSync(
    path.join(__dirname, '../src/entities/enemy/EnemyTypeRegistry.js'), 
    'utf8'
);
const EnemyTypeRegistry = eval(`${registryCode}; EnemyTypeRegistry;`);

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running EnemyTypeRegistry Tests...\n');

    // ==================== REGISTRY STRUCTURE ====================
    console.log('=== Registry Structure ===');

    try {
        if (typeof EnemyTypeRegistry === 'function' || typeof EnemyTypeRegistry === 'object') {
            console.log('✅ EnemyTypeRegistry is defined');
            passed++;
        } else {
            throw new Error('Not defined');
        }
    } catch (e) { console.error('❌ Registry definition failed:', e.message); failed++; }

    try {
        if (typeof EnemyTypeRegistry.getType === 'function') {
            console.log('✅ EnemyTypeRegistry.getType() is a function');
            passed++;
        } else {
            throw new Error('Not a function');
        }
    } catch (e) { console.error('❌ getType method missing:', e.message); failed++; }

    try {
        if (typeof EnemyTypeRegistry.getAllTypes === 'function') {
            console.log('✅ EnemyTypeRegistry.getAllTypes() is a function');
            passed++;
        } else {
            throw new Error('Not a function');
        }
    } catch (e) { console.error('❌ getAllTypes method missing:', e.message); failed++; }

    try {
        if (typeof EnemyTypeRegistry.hasType === 'function') {
            console.log('✅ EnemyTypeRegistry.hasType() is a function');
            passed++;
        } else {
            throw new Error('Not a function');
        }
    } catch (e) { console.error('❌ hasType method missing:', e.message); failed++; }

    // ==================== TYPE LOOKUP ====================
    console.log('\n=== Type Lookup ===');

    try {
        const basicType = EnemyTypeRegistry.getType('basic');
        if (basicType === global.BasicEnemy) {
            console.log('✅ getType("basic") returns BasicEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ basic lookup failed:', e.message); failed++; }

    try {
        const fastType = EnemyTypeRegistry.getType('fast');
        if (fastType === global.FastEnemy) {
            console.log('✅ getType("fast") returns FastEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ fast lookup failed:', e.message); failed++; }

    try {
        const tankType = EnemyTypeRegistry.getType('tank');
        if (tankType === global.TankEnemy) {
            console.log('✅ getType("tank") returns TankEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ tank lookup failed:', e.message); failed++; }

    try {
        const rangedType = EnemyTypeRegistry.getType('ranged');
        if (rangedType === global.RangedEnemy) {
            console.log('✅ getType("ranged") returns RangedEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ ranged lookup failed:', e.message); failed++; }

    try {
        const dasherType = EnemyTypeRegistry.getType('dasher');
        if (dasherType === global.DasherEnemy) {
            console.log('✅ getType("dasher") returns DasherEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ dasher lookup failed:', e.message); failed++; }

    try {
        const exploderType = EnemyTypeRegistry.getType('exploder');
        if (exploderType === global.ExploderEnemy) {
            console.log('✅ getType("exploder") returns ExploderEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ exploder lookup failed:', e.message); failed++; }

    try {
        const splitterType = EnemyTypeRegistry.getType('splitter');
        if (splitterType === global.SplitterEnemy) {
            console.log('✅ getType("splitter") returns SplitterEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ splitter lookup failed:', e.message); failed++; }

    try {
        const healerType = EnemyTypeRegistry.getType('healer');
        if (healerType === global.HealerEnemy) {
            console.log('✅ getType("healer") returns HealerEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ healer lookup failed:', e.message); failed++; }

    try {
        const teleporterType = EnemyTypeRegistry.getType('teleporter');
        if (teleporterType === global.TeleporterEnemy) {
            console.log('✅ getType("teleporter") returns TeleporterEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ teleporter lookup failed:', e.message); failed++; }

    try {
        const phantomType = EnemyTypeRegistry.getType('phantom');
        if (phantomType === global.PhantomEnemy) {
            console.log('✅ getType("phantom") returns PhantomEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ phantom lookup failed:', e.message); failed++; }

    try {
        const shielderType = EnemyTypeRegistry.getType('shielder');
        if (shielderType === global.ShielderEnemy) {
            console.log('✅ getType("shielder") returns ShielderEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ shielder lookup failed:', e.message); failed++; }

    try {
        const summonerType = EnemyTypeRegistry.getType('summoner');
        if (summonerType === global.SummonerEnemy) {
            console.log('✅ getType("summoner") returns SummonerEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ summoner lookup failed:', e.message); failed++; }

    try {
        const berserkerType = EnemyTypeRegistry.getType('berserker');
        if (berserkerType === global.BerserkerEnemy) {
            console.log('✅ getType("berserker") returns BerserkerEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ berserker lookup failed:', e.message); failed++; }

    try {
        const minionType = EnemyTypeRegistry.getType('minion');
        if (minionType === global.MinionEnemy) {
            console.log('✅ getType("minion") returns MinionEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ minion lookup failed:', e.message); failed++; }

    try {
        const bossType = EnemyTypeRegistry.getType('boss');
        if (bossType === global.BossEnemy) {
            console.log('✅ getType("boss") returns BossEnemy');
            passed++;
        } else {
            throw new Error('Wrong type returned');
        }
    } catch (e) { console.error('❌ boss lookup failed:', e.message); failed++; }

    // ==================== INVALID TYPES ====================
    console.log('\n=== Invalid Type Handling ===');

    try {
        const result = EnemyTypeRegistry.getType('nonexistent');
        // Falls back to BasicEnemy
        if (result === global.BasicEnemy) {
            console.log('✅ getType() falls back to BasicEnemy for unknown type');
            passed++;
        } else {
            throw new Error('Unexpected return');
        }
    } catch (e) { console.error('❌ Unknown type handling failed:', e.message); failed++; }

    try {
        const result = EnemyTypeRegistry.getType('');
        // Falls back to BasicEnemy
        if (result === global.BasicEnemy) {
            console.log('✅ getType() falls back to BasicEnemy for empty string');
            passed++;
        } else {
            throw new Error('Unexpected return');
        }
    } catch (e) { console.error('❌ Empty string handling failed:', e.message); failed++; }

    // ==================== hasType METHOD ====================
    console.log('\n=== hasType Method ===');

    try {
        if (EnemyTypeRegistry.hasType('basic') === true) {
            console.log('✅ hasType("basic") returns true');
            passed++;
        } else {
            throw new Error('Should be true');
        }
    } catch (e) { console.error('❌ hasType basic failed:', e.message); failed++; }

    try {
        if (EnemyTypeRegistry.hasType('nonexistent') === false) {
            console.log('✅ hasType("nonexistent") returns false');
            passed++;
        } else {
            throw new Error('Should be false');
        }
    } catch (e) { console.error('❌ hasType nonexistent failed:', e.message); failed++; }

    try {
        const typesToCheck = ['fast', 'tank', 'healer', 'boss'];
        const allExist = typesToCheck.every(t => EnemyTypeRegistry.hasType(t));
        if (allExist) {
            console.log('✅ hasType() validates multiple types');
            passed++;
        } else {
            throw new Error('Some types missing');
        }
    } catch (e) { console.error('❌ Multiple type check failed:', e.message); failed++; }

    // ==================== getAllTypes METHOD ====================
    console.log('\n=== getAllTypes Method ===');

    try {
        const allTypes = EnemyTypeRegistry.getAllTypes();
        if (Array.isArray(allTypes) && allTypes.length >= 15) {
            console.log('✅ getAllTypes() returns array of 15+ types');
            passed++;
        } else {
            throw new Error(`Got ${allTypes.length} types`);
        }
    } catch (e) { console.error('❌ getAllTypes count failed:', e.message); failed++; }

    try {
        const allTypes = EnemyTypeRegistry.getAllTypes();
        const requiredTypes = ['basic', 'fast', 'tank', 'ranged', 'boss'];
        const hasRequired = requiredTypes.every(t => allTypes.includes(t));
        if (hasRequired) {
            console.log('✅ getAllTypes() includes core enemy types');
            passed++;
        } else {
            throw new Error('Missing required types');
        }
    } catch (e) { console.error('❌ getAllTypes content failed:', e.message); failed++; }

    try {
        const allTypes = EnemyTypeRegistry.getAllTypes();
        const specialTypes = ['healer', 'teleporter', 'phantom', 'shielder', 'summoner'];
        const hasSpecial = specialTypes.every(t => allTypes.includes(t));
        if (hasSpecial) {
            console.log('✅ getAllTypes() includes special enemy types');
            passed++;
        } else {
            throw new Error('Missing special types');
        }
    } catch (e) { console.error('❌ getAllTypes special failed:', e.message); failed++; }

    // ==================== USE CASE PATTERNS ====================
    console.log('\n=== Use Case Patterns ===');

    try {
        // Pattern: Spawning enemy by type string
        const typeString = 'tank';
        const typeConfig = EnemyTypeRegistry.getType(typeString);
        if (typeConfig && typeConfig.name === 'tank') {
            console.log('✅ Spawning pattern: type string → config');
            passed++;
        } else {
            throw new Error('Pattern failed');
        }
    } catch (e) { console.error('❌ Spawning pattern failed:', e.message); failed++; }

    try {
        // Pattern: Validating type before spawn
        const typeString = 'maybe_invalid';
        if (EnemyTypeRegistry.hasType(typeString)) {
            throw new Error('Should not exist');
        } else {
            const fallback = EnemyTypeRegistry.getType('basic');
            if (fallback === global.BasicEnemy) {
                console.log('✅ Validation pattern: check → fallback');
                passed++;
            } else {
                throw new Error('Fallback wrong');
            }
        }
    } catch (e) { console.error('❌ Validation pattern failed:', e.message); failed++; }

    try {
        // Pattern: Iterating all types for UI
        const allTypes = EnemyTypeRegistry.getAllTypes();
        const typeInfo = allTypes.map(t => ({
            name: t,
            config: EnemyTypeRegistry.getType(t)
        }));
        if (typeInfo.length >= 15 && typeInfo[0].config) {
            console.log('✅ Iteration pattern: list → map to configs');
            passed++;
        } else {
            throw new Error('Pattern failed');
        }
    } catch (e) { console.error('❌ Iteration pattern failed:', e.message); failed++; }

    // Final summary
    console.log('\n========================================');
    console.log(`EnemyTypeRegistry Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    return failed === 0;
};

// Run if executed directly
if (typeof module !== 'undefined' && require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

module.exports = { runTests };

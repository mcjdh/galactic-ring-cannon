#!/usr/bin/env node

/**
 * StorageManager Integration Tests
 * 
 * Tests the StorageManager utility for:
 * - Correct type conversions (int, float, boolean, JSON)
 * - Error handling when localStorage is unavailable
 * - Fallback behavior with default values
 * - JSON serialization edge cases
 * 
 * Usage: npm test
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMockLocalStorage } = require('./testUtils.js');

function runTests() {
    console.log('[T] Running StorageManager Integration Tests...\n');

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

    // Load StorageManager source once
    const storageManagerPath = path.join(__dirname, '..', 'src', 'utils', 'StorageManager.js');
    const storageManagerSource = fs.readFileSync(storageManagerPath, 'utf8');

    // ===== BASIC FUNCTIONALITY TESTS =====

    test('StorageManager loads without errors', () => {
        const localStorage = createMockLocalStorage();
        const windowStub = { localStorage, LoggerUtils: { warn: () => {} } };
        global.window = windowStub;
        global.localStorage = localStorage;

        vm.runInThisContext(storageManagerSource, { filename: 'StorageManager.js' });

        if (!windowStub.StorageManager) {
            throw new Error('StorageManager not attached to window');
        }
    });

    test('getItem returns null for missing key', () => {
        const result = window.StorageManager.getItem('nonexistent');
        if (result !== null) {
            throw new Error(`Expected null, got ${result}`);
        }
    });

    test('getItem returns default value for missing key', () => {
        const result = window.StorageManager.getItem('nonexistent', 'default');
        if (result !== 'default') {
            throw new Error(`Expected 'default', got ${result}`);
        }
    });

    test('setItem and getItem work correctly', () => {
        window.StorageManager.setItem('testKey', 'testValue');
        const result = window.StorageManager.getItem('testKey');
        if (result !== 'testValue') {
            throw new Error(`Expected 'testValue', got ${result}`);
        }
    });

    test('removeItem deletes key', () => {
        window.StorageManager.setItem('tempKey', 'tempValue');
        window.StorageManager.removeItem('tempKey');
        const result = window.StorageManager.getItem('tempKey');
        if (result !== null) {
            throw new Error(`Expected null after removal, got ${result}`);
        }
    });

    // ===== INTEGER TESTS =====

    test('getInt parses integer correctly', () => {
        window.StorageManager.setItem('intKey', '42');
        const result = window.StorageManager.getInt('intKey');
        if (result !== 42) {
            throw new Error(`Expected 42, got ${result}`);
        }
    });

    test('getInt returns default for missing key', () => {
        const result = window.StorageManager.getInt('missingInt', 99);
        if (result !== 99) {
            throw new Error(`Expected 99, got ${result}`);
        }
    });

    test('getInt returns default for invalid integer', () => {
        window.StorageManager.setItem('badInt', 'not a number');
        const result = window.StorageManager.getInt('badInt', 100);
        if (result !== 100) {
            throw new Error(`Expected 100, got ${result}`);
        }
    });

    test('getInt handles negative numbers', () => {
        window.StorageManager.setItem('negativeInt', '-42');
        const result = window.StorageManager.getInt('negativeInt');
        if (result !== -42) {
            throw new Error(`Expected -42, got ${result}`);
        }
    });

    // ===== FLOAT TESTS =====

    test('getFloat parses float correctly', () => {
        window.StorageManager.setItem('floatKey', '3.14');
        const result = window.StorageManager.getFloat('floatKey');
        if (Math.abs(result - 3.14) > 0.001) {
            throw new Error(`Expected 3.14, got ${result}`);
        }
    });

    test('getFloat returns default for missing key', () => {
        const result = window.StorageManager.getFloat('missingFloat', 2.5);
        if (Math.abs(result - 2.5) > 0.001) {
            throw new Error(`Expected 2.5, got ${result}`);
        }
    });

    test('getFloat returns default for invalid float', () => {
        window.StorageManager.setItem('badFloat', 'not a float');
        const result = window.StorageManager.getFloat('badFloat', 1.5);
        if (Math.abs(result - 1.5) > 0.001) {
            throw new Error(`Expected 1.5, got ${result}`);
        }
    });

    // ===== BOOLEAN TESTS =====

    test('getBoolean parses "true" correctly', () => {
        window.StorageManager.setItem('boolTrue', 'true');
        const result = window.StorageManager.getBoolean('boolTrue');
        if (result !== true) {
            throw new Error(`Expected true, got ${result}`);
        }
    });

    test('getBoolean parses "false" correctly', () => {
        window.StorageManager.setItem('boolFalse', 'false');
        const result = window.StorageManager.getBoolean('boolFalse');
        if (result !== false) {
            throw new Error(`Expected false, got ${result}`);
        }
    });

    test('getBoolean parses "1" as true', () => {
        window.StorageManager.setItem('bool1', '1');
        const result = window.StorageManager.getBoolean('bool1');
        if (result !== true) {
            throw new Error(`Expected true, got ${result}`);
        }
    });

    test('getBoolean returns default for missing key', () => {
        const result = window.StorageManager.getBoolean('missingBool', true);
        if (result !== true) {
            throw new Error(`Expected true, got ${result}`);
        }
    });

    test('getBoolean returns false for non-boolean strings', () => {
        window.StorageManager.setItem('notBool', 'yes');
        const result = window.StorageManager.getBoolean('notBool', false);
        if (result !== false) {
            throw new Error(`Expected false, got ${result}`);
        }
    });

    // ===== JSON TESTS =====

    test('getJSON/setJSON handle objects correctly', () => {
        const testObj = { name: 'test', value: 42, nested: { foo: 'bar' } };
        window.StorageManager.setJSON('jsonObj', testObj);
        const result = window.StorageManager.getJSON('jsonObj');
        
        if (!result || result.name !== 'test' || result.value !== 42 || result.nested.foo !== 'bar') {
            throw new Error('JSON object not preserved correctly');
        }
    });

    test('getJSON/setJSON handle arrays correctly', () => {
        const testArray = [1, 2, 3, 'four', { five: 5 }];
        window.StorageManager.setJSON('jsonArray', testArray);
        const result = window.StorageManager.getJSON('jsonArray');
        
        if (!Array.isArray(result) || result.length !== 5 || result[3] !== 'four') {
            throw new Error('JSON array not preserved correctly');
        }
    });

    test('getJSON returns default for missing key', () => {
        const result = window.StorageManager.getJSON('missingJson', { default: true });
        if (!result || result.default !== true) {
            throw new Error('Default value not returned');
        }
    });

    test('getJSON returns default for invalid JSON', () => {
        window.StorageManager.setItem('badJson', '{invalid json}');
        const result = window.StorageManager.getJSON('badJson', { fallback: true });
        if (!result || result.fallback !== true) {
            throw new Error('Fallback not used for invalid JSON');
        }
    });

    test('getJSON handles null correctly', () => {
        window.StorageManager.setJSON('nullValue', null);
        const result = window.StorageManager.getJSON('nullValue');
        if (result !== null) {
            throw new Error(`Expected null, got ${result}`);
        }
    });

    // ===== ERROR HANDLING TESTS =====

    test('StorageManager handles unavailable localStorage gracefully', () => {
        const failingStorage = createMockLocalStorage(true);
        global.localStorage = failingStorage;
        
        // Should not throw, should use fallback
        const result = window.StorageManager.getItem('anyKey', 'fallback');
        if (result !== 'fallback') {
            throw new Error('Did not use fallback when localStorage unavailable');
        }
    });

    test('setItem returns false when localStorage fails', () => {
        const failingStorage = createMockLocalStorage(true);
        global.localStorage = failingStorage;
        
        const success = window.StorageManager.setItem('key', 'value');
        if (success !== false) {
            throw new Error('Should return false on failure');
        }
    });

    test('hasKey returns false when localStorage fails', () => {
        const failingStorage = createMockLocalStorage(true);
        global.localStorage = failingStorage;
        
        const result = window.StorageManager.hasKey('anyKey');
        if (result !== false) {
            throw new Error('Should return false when checking key with failed storage');
        }
    });

    // Restore working localStorage for remaining tests
    global.localStorage = createMockLocalStorage();

    // ===== UTILITY METHOD TESTS =====

    test('hasKey returns true for existing key', () => {
        window.StorageManager.setItem('existingKey', 'value');
        const result = window.StorageManager.hasKey('existingKey');
        if (result !== true) {
            throw new Error('hasKey should return true for existing key');
        }
    });

    test('hasKey returns false for missing key', () => {
        const result = window.StorageManager.hasKey('nonExistentKey');
        if (result !== false) {
            throw new Error('hasKey should return false for missing key');
        }
    });

    test('keys returns array of stored keys', () => {
        // Clear first to ensure clean state
        global.localStorage.clear();
        window.StorageManager.setItem('key1', 'val1');
        window.StorageManager.setItem('key2', 'val2');
        const keys = window.StorageManager.keys();
        
        if (!Array.isArray(keys)) {
            throw new Error('keys() should return an array');
        }
        if (!keys.includes('key1') || !keys.includes('key2')) {
            throw new Error(`keys() should include all stored keys, got: ${keys.join(', ')}`);
        }
    });

    test('clear removes all items', () => {
        global.localStorage.clear();
        window.StorageManager.setItem('clearTest1', 'value1');
        window.StorageManager.setItem('clearTest2', 'value2');
        window.StorageManager.clear();
        
        const item1 = window.StorageManager.getItem('clearTest1');
        const item2 = window.StorageManager.getItem('clearTest2');
        
        if (item1 !== null || item2 !== null) {
            throw new Error('clear() should remove all items');
        }
    });

    test('isAvailable returns true for working localStorage', () => {
        global.localStorage = createMockLocalStorage();
        const result = window.StorageManager.isAvailable();
        if (result !== true) {
            throw new Error('isAvailable should return true for working storage');
        }
    });

    test('isAvailable returns false for broken localStorage', () => {
        global.localStorage = createMockLocalStorage(true);
        const result = window.StorageManager.isAvailable();
        if (result !== false) {
            throw new Error('isAvailable should return false for broken storage');
        }
    });

    // ===== RESULTS =====

    console.log('\n' + '='.repeat(50));
    console.log(`[S] Test Results:`);
    console.log(`   + Passed: ${results.passed}`);
    console.log(`   ! Failed: ${results.failed}`);
    console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
        console.log('\n! Failed Tests:');
        results.errors.forEach(({ test, error }) => {
            console.log(`   • ${test}: ${error}`);
        });
        console.log('='.repeat(50) + '\n');
    } else {
        console.log('\n+ All tests passed!');
        console.log('='.repeat(50) + '\n');
    }

    return results;
}

try {
    const results = runTests();
    process.exit(results.failed > 0 ? 1 : 0);
} catch (error) {
    console.error('! Test suite crashed:', error);
    process.exit(1);
}

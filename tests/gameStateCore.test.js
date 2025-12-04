/**
 * GameState Core Tests
 * 
 * Tests the central state management system - the single source of truth for all game state.
 * Critical for understanding:
 * - Runtime state (time, pause, FPS)
 * - Game flow (game over, win, difficulty)
 * - Player state (health, level, XP)
 * - Progression (kills, combo, damage)
 * - Meta state (star tokens, achievements)
 * - Observer pattern for reactive updates
 */

// Mock window and dependencies
global.window = {
    Game: {},
    logger: { log: () => {}, warn: () => {}, error: () => {} },
    StorageManager: {
        getItem: () => null,
        setItem: () => {},
        getInt: () => 0
    }
};

// Load GameState
require('../src/core/GameState.js');
const { GameState } = global.window.Game;

const runTests = () => {
    let passed = 0;
    let failed = 0;

    console.log('Running GameState Core Tests...\n');

    // ==================== RUNTIME STATE ====================
    console.log('=== Runtime State ===');

    try {
        const gameState = new GameState();
        if (gameState.runtime.gameTime === 0 && 
            gameState.runtime.deltaTime === 0 &&
            gameState.runtime.isPaused === false &&
            gameState.runtime.isRunning === false) {
            console.log('✅ Initializes with correct defaults');
            passed++;
        } else {
            console.error('❌ Incorrect default values');
            failed++;
        }
    } catch (e) { console.error('❌ Runtime init failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.updateTime(0.016);
        if (Math.abs(gameState.runtime.gameTime - 0.016) < 0.001 && gameState.runtime.deltaTime === 0.016) {
            gameState.updateTime(0.033);
            if (Math.abs(gameState.runtime.gameTime - 0.049) < 0.001) {
                console.log('✅ updateTime() advances game time and delta');
                passed++;
            } else {
                throw new Error('Second updateTime failed');
            }
        } else {
            throw new Error('First updateTime failed');
        }
    } catch (e) { console.error('❌ updateTime test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.updateFPS(60);
        gameState.updateFPS(20);
        // 60 * 0.9 + 20 * 0.1 = 56
        if (gameState.runtime.fps === 20 && Math.abs(gameState.performance.averageFps - 56) < 1) {
            console.log('✅ updateFPS() calculates running average');
            passed++;
        } else {
            throw new Error('Unexpected average');
        }
    } catch (e) { console.error('❌ updateFPS test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        for (let i = 0; i < 50; i++) { gameState.updateFPS(20); }
        if (gameState.performance.isLagging === true) {
            console.log('✅ updateFPS() detects lagging when avg < 30');
            passed++;
        } else {
            throw new Error('Lagging not detected');
        }
    } catch (e) { console.error('❌ Lagging detection failed:', e.message); failed++; }

    // ==================== PAUSE/START/STOP ====================
    console.log('\n=== Game Control ===');

    try {
        const gameState = new GameState();
        gameState.pause();
        if (gameState.runtime.isPaused === true) {
            console.log('✅ pause() sets isPaused to true');
            passed++;
        } else {
            throw new Error('Pause failed');
        }
    } catch (e) { console.error('❌ pause test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        let pauseCount = 0;
        gameState.on('pause', () => pauseCount++);
        gameState.pause();
        gameState.pause();
        if (pauseCount === 1) {
            console.log('✅ pause() is idempotent');
            passed++;
        } else {
            throw new Error(`Called ${pauseCount} times`);
        }
    } catch (e) { console.error('❌ pause idempotent test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.pause();
        gameState.resume();
        if (gameState.runtime.isPaused === false) {
            console.log('✅ resume() sets isPaused to false');
            passed++;
        } else {
            throw new Error('Resume failed');
        }
    } catch (e) { console.error('❌ resume test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.pause();
        gameState.start();
        if (gameState.runtime.isRunning === true && gameState.runtime.isPaused === false) {
            console.log('✅ start() sets isRunning and clears pause');
            passed++;
        } else {
            throw new Error('Start failed');
        }
    } catch (e) { console.error('❌ start test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.start();
        gameState.stop();
        if (gameState.runtime.isRunning === false) {
            console.log('✅ stop() sets isRunning to false');
            passed++;
        } else {
            throw new Error('Stop failed');
        }
    } catch (e) { console.error('❌ stop test failed:', e.message); failed++; }

    // ==================== GAME FLOW ====================
    console.log('\n=== Game Flow ===');

    try {
        const gameState = new GameState();
        let gameOverTriggered = false;
        gameState.on('gameOver', () => gameOverTriggered = true);
        gameState.start();
        gameState.gameOver();
        if (gameState.flow.isGameOver && !gameState.runtime.isRunning && 
            !gameState.player.isAlive && gameOverTriggered) {
            console.log('✅ gameOver() triggers game over state');
            passed++;
        } else {
            throw new Error('gameOver not working');
        }
    } catch (e) { console.error('❌ gameOver test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        let count = 0;
        gameState.on('gameOver', () => count++);
        gameState.gameOver();
        gameState.gameOver();
        if (count === 1) {
            console.log('✅ gameOver() is idempotent');
            passed++;
        } else {
            throw new Error(`Called ${count} times`);
        }
    } catch (e) { console.error('❌ gameOver idempotent test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.setDifficulty('hard');
        if (gameState.flow.difficulty === 'hard') {
            gameState.setDifficulty('invalid');
            if (gameState.flow.difficulty === 'hard') {
                console.log('✅ setDifficulty() validates input');
                passed++;
            } else {
                throw new Error('Invalid accepted');
            }
        } else {
            throw new Error('Valid rejected');
        }
    } catch (e) { console.error('❌ setDifficulty test failed:', e.message); failed++; }

    // ==================== PLAYER STATE ====================
    console.log('\n=== Player State ===');

    try {
        const gameState = new GameState();
        const mockPlayer = {
            isDead: false, level: 5,
            stats: { health: 80, maxHealth: 120, xp: 50, xpToNextLevel: 200 },
            x: 100, y: 200
        };
        gameState.syncPlayerState(mockPlayer);
        if (gameState.player.isAlive && gameState.player.level === 5 &&
            gameState.player.health === 80 && gameState.player.x === 100) {
            console.log('✅ syncPlayerState() updates player snapshot');
            passed++;
        } else {
            throw new Error('Sync failed');
        }
    } catch (e) { console.error('❌ syncPlayerState test failed:', e.message); failed++; }

    // ==================== PROGRESSION ====================
    console.log('\n=== Progression & Kills ===');

    try {
        const gameState = new GameState();
        gameState.addKill();
        if (gameState.progression.killCount === 1 && gameState.combo.count === 1 &&
            gameState.combo.timer === gameState.combo.timeout) {
            console.log('✅ addKill() increments kill count and combo');
            passed++;
        } else {
            throw new Error('Kill tracking failed');
        }
    } catch (e) { console.error('❌ addKill test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.addKill(true, false);
        gameState.addKill(false, true);
        if (gameState.progression.elitesKilled === 1 && gameState.progression.bossesKilled === 1) {
            console.log('✅ addKill() tracks elite and boss kills');
            passed++;
        } else {
            throw new Error('Elite/boss tracking failed');
        }
    } catch (e) { console.error('❌ Elite/boss test failed:', e.message); failed++; }

    // ==================== COMBO SYSTEM ====================
    console.log('\n=== Combo System ===');

    try {
        const gameState = new GameState();
        gameState.addKill();
        const initialTimer = gameState.combo.timer;
        gameState.updateCombo(0.5);
        if (Math.abs(gameState.combo.timer - (initialTimer - 0.5)) < 0.001) {
            console.log('✅ updateCombo() decreases timer over time');
            passed++;
        } else {
            throw new Error('Timer not decreasing');
        }
    } catch (e) { console.error('❌ updateCombo timer test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.addKill();
        gameState.addKill();
        gameState.updateCombo(gameState.combo.timeout + 0.1);
        if (gameState.combo.count === 0) {
            console.log('✅ updateCombo() resets combo when timer expires');
            passed++;
        } else {
            throw new Error('Combo not reset');
        }
    } catch (e) { console.error('❌ updateCombo reset test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        for (let i = 0; i < 50; i++) { gameState.addKill(); }
        gameState.updateCombo(0);
        if (gameState.combo.multiplier === 3.0) {
            console.log('✅ combo multiplier caps at 3.0');
            passed++;
        } else {
            throw new Error(`Multiplier is ${gameState.combo.multiplier}`);
        }
    } catch (e) { console.error('❌ Combo cap test failed:', e.message); failed++; }

    // ==================== META STATE ====================
    console.log('\n=== Meta State ===');

    try {
        const gameState = new GameState();
        gameState.earnStarTokens(10);
        if (gameState.meta.starTokens === 10 && gameState.meta.totalStarsEarned === 10) {
            console.log('✅ earnStarTokens() adds tokens');
            passed++;
        } else {
            throw new Error('Token earning failed');
        }
    } catch (e) { console.error('❌ earnStarTokens test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.earnStarTokens(20);
        const result1 = gameState.spendStarTokens(15);
        const result2 = gameState.spendStarTokens(10);
        if (result1 === true && gameState.meta.starTokens === 5 && result2 === false) {
            console.log('✅ spendStarTokens() works correctly');
            passed++;
        } else {
            throw new Error('Spending failed');
        }
    } catch (e) { console.error('❌ spendStarTokens test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.unlockAchievement('first_blood');
        if (gameState.meta.achievements.has('first_blood') && 
            gameState.isAchievementUnlocked('first_blood')) {
            console.log('✅ Achievement unlocking works');
            passed++;
        } else {
            throw new Error('Achievement tracking failed');
        }
    } catch (e) { console.error('❌ Achievement test failed:', e.message); failed++; }

    // ==================== OBSERVER PATTERN ====================
    console.log('\n=== Observer Pattern ===');

    try {
        const gameState = new GameState();
        let received = null;
        gameState.on('kill', (data) => received = data);
        gameState.addKill(true, false);
        if (received && received.isElite === true) {
            console.log('✅ on() registers event listeners');
            passed++;
        } else {
            throw new Error('Listener not called');
        }
    } catch (e) { console.error('❌ on() test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        const events = [];
        gameState.on('*', (data) => events.push(data.event));
        gameState.addKill();
        gameState.pause();
        if (events.includes('kill') && events.includes('pause')) {
            console.log('✅ wildcard (*) receives all events');
            passed++;
        } else {
            throw new Error('Wildcard not working');
        }
    } catch (e) { console.error('❌ Wildcard test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        let count = 0;
        const callback = () => count++;
        gameState.on('pause', callback);
        gameState.pause();
        gameState.off('pause', callback);
        gameState.resume();
        gameState.pause();
        if (count === 1) {
            console.log('✅ off() removes listeners');
            passed++;
        } else {
            throw new Error(`Called ${count} times`);
        }
    } catch (e) { console.error('❌ off() test failed:', e.message); failed++; }

    // ==================== SESSION RESET ====================
    console.log('\n=== Session Reset ===');

    try {
        const gameState = new GameState();
        gameState.start();
        gameState.addKill();
        gameState.addKill();
        gameState.progression.damageDealt = 500;
        gameState.player.level = 5;
        gameState.resetSession();
        if (gameState.runtime.gameTime === 0 && !gameState.flow.isGameOver &&
            gameState.player.isAlive && gameState.player.level === 1 &&
            gameState.progression.killCount === 0) {
            console.log('✅ resetSession() resets all session state');
            passed++;
        } else {
            throw new Error('Reset incomplete');
        }
    } catch (e) { console.error('❌ resetSession test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        const before = gameState.meta.gamesPlayed;
        gameState.resetSession();
        if (gameState.meta.gamesPlayed === before + 1) {
            console.log('✅ resetSession() increments gamesPlayed');
            passed++;
        } else {
            throw new Error('gamesPlayed not incremented');
        }
    } catch (e) { console.error('❌ gamesPlayed test failed:', e.message); failed++; }

    // ==================== VALIDATION ====================
    console.log('\n=== State Validation ===');

    try {
        const gameState = new GameState();
        const result = gameState.validate();
        if (result.valid && result.issues.length === 0) {
            console.log('✅ validate() passes on good state');
            passed++;
        } else {
            throw new Error('Valid state rejected');
        }
    } catch (e) { console.error('❌ validate test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.player.health = -10;
        const result = gameState.validate();
        if (!result.valid && result.issues.includes('Negative health')) {
            console.log('✅ validate() catches negative health');
            passed++;
        } else {
            throw new Error('Negative health not caught');
        }
    } catch (e) { console.error('❌ Negative health test failed:', e.message); failed++; }

    // ==================== WEAPON/CHARACTER SELECTION ====================
    console.log('\n=== Weapon & Character Selection ===');

    try {
        const gameState = new GameState();
        gameState.setSelectedWeapon('plasma_rifle');
        if (gameState.flow.selectedWeapon === 'plasma_rifle' && 
            gameState.meta.selectedWeapon === 'plasma_rifle') {
            console.log('✅ setSelectedWeapon() updates state');
            passed++;
        } else {
            throw new Error('Weapon not set');
        }
    } catch (e) { console.error('❌ setSelectedWeapon test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        if (gameState.getSelectedWeapon() === 'pulse_cannon') {
            console.log('✅ getSelectedWeapon() has default fallback');
            passed++;
        } else {
            throw new Error(`Got: ${gameState.getSelectedWeapon()}`);
        }
    } catch (e) { console.error('❌ Default weapon test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        if (gameState.getSelectedCharacter() === 'aegis_vanguard') {
            console.log('✅ getSelectedCharacter() has default fallback');
            passed++;
        } else {
            throw new Error(`Got: ${gameState.getSelectedCharacter()}`);
        }
    } catch (e) { console.error('❌ Default character test failed:', e.message); failed++; }

    // ==================== SNAPSHOT & DEBUG ====================
    console.log('\n=== Debug & Snapshot ===');

    try {
        const gameState = new GameState();
        gameState.addKill();
        gameState.unlockAchievement('test');
        const snapshot = gameState.getSnapshot();
        if (snapshot.progression.killCount === 1 && 
            snapshot.meta.achievements.includes('test') &&
            snapshot.player.reference === null) {
            console.log('✅ getSnapshot() returns serializable copy');
            passed++;
        } else {
            throw new Error('Snapshot incomplete');
        }
    } catch (e) { console.error('❌ getSnapshot test failed:', e.message); failed++; }

    try {
        const gameState = new GameState();
        gameState.addKill();
        gameState.runtime.gameTime = 65.5;
        gameState.runtime.fps = 59.7;
        const summary = gameState.getSummary();
        if (summary.time === 65 && summary.kills === 1 && summary.fps === 60) {
            console.log('✅ getSummary() returns formatted display data');
            passed++;
        } else {
            throw new Error('Summary incorrect');
        }
    } catch (e) { console.error('❌ getSummary test failed:', e.message); failed++; }

    // Final summary
    console.log('\n========================================');
    console.log(`GameState Core Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    return failed === 0;
};

// Run if executed directly
if (typeof module !== 'undefined' && require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

module.exports = { runTests };

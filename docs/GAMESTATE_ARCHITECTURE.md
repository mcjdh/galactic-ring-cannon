# 🌊 GameState Architecture

**Single Source of Truth Pattern for Galactic Ring Cannon**

## Overview

GameState is the **centralized state management system** for the entire game. It eliminates duplicate state tracking across multiple managers and provides a clean, observable, and debuggable source of truth.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              GameState (Single Source)          │
├─────────────────────────────────────────────────┤
│  runtime:      time, pause, FPS                 │
│  flow:         gameOver, gameWon, mode          │
│  player:       level, health, position          │
│  progression:  kills, XP, damage stats          │
│  combo:        count, timer, multiplier         │
│  entities:     entity counts                    │
│  meta:         star tokens, achievements        │
│  performance:  quality settings, metrics        │
└─────────────────────────────────────────────────┘
           ▲           ▲           ▲
           │           │           │
     ┌─────┴─────┬─────┴─────┬────┴─────┐
     │           │           │          │
GameEngine   GameManager  StatsManager  Others
(updates)     (reads)      (delegates)  (read)
```

## Key Benefits

### ✅ Before: Multiple Sources of Truth

```javascript
// ❌ OLD: State scattered across 3 systems
GameEngine: { gameTime, isPaused, ... }
GameManagerBridge: { gameTime, isPaused, killCount, combo, ... }
StatsManager: { killCount, xpCollected, combo, ... }

// Sync bugs when these drift apart!
gameManager.gameTime = 100;
// But gameEngine.gameTime still at 95...
```

### ✅ After: Single Source of Truth

```javascript
// ✅ NEW: One state, many readers
GameState: { runtime, flow, progression, combo, meta }

// All systems read from same place
game.state.runtime.gameTime === gameManager.state.runtime.gameTime === statsManager.state.runtime.gameTime
```

## Usage

### Creating GameState

```javascript
// In GameEngine constructor
this.state = new GameState();
```

### Linking to GameState

```javascript
// In GameManagerBridge
this.state = this.game.state;  // Share reference

// In StatsManager
this.state = gameManager?.game?.state;  // Share reference
```

### Reading State

```javascript
// Direct access
const currentTime = gameEngine.state.runtime.gameTime;
const killCount = gameEngine.state.progression.killCount;

// Through getters (backward compatible)
const currentTime = gameEngine.gameTime;
const killCount = gameManager.killCount;
```

### Updating State

```javascript
// Use state methods (preferred)
gameState.updateTime(deltaTime);
gameState.addKill();
gameState.pause();
gameState.resume();

// Through setters (backward compatible)
gameEngine.isPaused = true;  // Calls state.pause()
statsManager.killCount++;    // Updates state.progression.killCount
```

### Observing State Changes

```javascript
// Subscribe to specific events
gameState.on('kill', (data) => {
    console.log(`Kill! Total: ${data.killCount}`);
});

gameState.on('levelUp', (data) => {
    console.log(`Level up! Now level ${data.level}`);
});

// Subscribe to all events
gameState.on('*', (data) => {
    console.log('State changed:', data.event, data);
});

// Unsubscribe
gameState.off('kill', callback);
```

## State Structure

### `runtime` - Game Loop State
- `gameTime` - Total elapsed seconds
- `deltaTime` - Last frame delta
- `isPaused` - Game paused?
- `isRunning` - Game loop active?
- `fps` - Current FPS
- `frameCount` - Total frames rendered

### `flow` - Game Flow State
- `isGameOver` - Player died?
- `isGameWon` - Player won (Normal mode)?
- `hasShownEndScreen` - End screen displayed?
- `gameMode` - 'normal' | 'endless'
- `difficulty` - 'easy' | 'normal' | 'hard'

### `player` - Player State Snapshot
- `reference` - Player instance
- `isAlive` - Player alive?
- `level` - Current level
- `health` - Current health
- `maxHealth` - Max health
- `xp` - Current XP
- `xpToNextLevel` - XP needed
- `x, y` - Position

### `progression` - Session Stats
- `killCount` - Total kills
- `xpCollected` - Total XP collected
- `damageDealt` - Total damage dealt
- `damageTaken` - Total damage taken
- `highestLevel` - Highest level reached
- `bossesKilled` - Bosses defeated
- `elitesKilled` - Elite enemies killed

### `combo` - Combo System
- `count` - Current combo
- `timer` - Time until reset
- `timeout` - Timeout duration
- `highest` - Highest combo this session
- `multiplier` - Current multiplier

### `entities` - Entity Counts
- `enemyCount` - Active enemies
- `projectileCount` - Active projectiles
- `xpOrbCount` - Active XP orbs
- `particleCount` - Active particles
- `maxEnemiesReached` - Peak enemy count

### `meta` - Persistent Meta State
- `starTokens` - Current star tokens
- `totalStarsEarned` - Lifetime stars
- `achievements` - Unlocked achievement IDs
- `gamesPlayed` - Total games played
- `totalKills` - Lifetime kills

### `performance` - Performance Settings
- `lowQuality` - Low quality mode?
- `renderMode` - 'normal' | 'low' | 'minimal'
- `averageFps` - Running average FPS
- `isLagging` - Performance degraded?

## API Reference

### State Lifecycle Methods

```javascript
// Time management
state.updateTime(deltaTime)    // Update game time
state.updateFPS(fps)            // Update FPS tracking

// Game flow control
state.start()                   // Start game loop
state.stop()                    // Stop game loop
state.pause()                   // Pause game
state.resume()                  // Resume game
state.gameOver()                // Trigger game over
state.gameWon()                 // Trigger game won

// Player tracking
state.setPlayer(player)         // Set player reference
state.syncPlayerState(player)   // Sync player snapshot

// Progression tracking
state.addKill(isElite, isBoss)  // Increment kills
state.addXP(amount)             // Add XP collected
state.addDamageDealt(amount)    // Track damage
state.addDamageTaken(amount)    // Track damage taken

// Combo system
state.updateCombo(deltaTime)    // Update combo timer
state.resetCombo()              // Reset combo

// Entity tracking
state.updateEntityCounts(enemies, projectiles, xpOrbs, particles)

// Meta progression
state.earnStarTokens(amount)    // Earn stars
state.spendStarTokens(amount)   // Spend stars
state.unlockAchievement(id)     // Unlock achievement

// Session management
state.resetSession()            // Reset for new game

// Debugging
state.enableDebug()             // Enable debug mode
state.getSnapshot()             // Get state snapshot
state.getHistory()              // Get state change history
state.getSummary()              // Get formatted summary
state.validate()                // Validate state integrity
```

### Observer Pattern

```javascript
// Subscribe to events
state.on(event, callback)       // Listen for event
state.off(event, callback)      // Stop listening

// Available events:
'timeUpdate'         // Game time updated
'pause'              // Game paused
'resume'             // Game resumed
'start'              // Game started
'stop'               // Game stopped
'gameOver'           // Game over triggered
'gameWon'            // Game won triggered
'kill'               // Enemy killed
'bossKilled'         // Boss killed
'levelUp'            // Player leveled up
'xpCollected'        // XP collected
'damageTaken'        // Player took damage
'comboReset'         // Combo reset
'starTokensEarned'   // Stars earned
'starTokensSpent'    // Stars spent
'achievementUnlocked' // Achievement unlocked
'sessionReset'       // Session reset
'*'                  // Wildcard (all events)
```

## Integration Points

### GameEngine
- **Creates** GameState instance
- **Updates** time, FPS, player sync, entity counts
- **Provides** getters/setters for external access

```javascript
// In GameEngine.update()
this.state.updateTime(deltaTime);
this.state.updateFPS(this.fps);
if (this.player) {
    this.state.syncPlayerState(this.player);
}
this.state.updateEntityCounts(
    this.enemies.length,
    this.projectiles.length,
    this.xpOrbs.length,
    particles.length
);
```

### GameManagerBridge
- **Links** to GameEngine's GameState
- **Provides** proxy getters/setters for external systems
- **Delegates** state operations to GameState

```javascript
// Proxy properties
get gameTime() { return this.state.runtime.gameTime; }
get isPaused() { return this.state.runtime.isPaused; }
set isPaused(value) { value ? this.state.pause() : this.state.resume(); }
```

### StatsManager
- **Links** to GameEngine's GameState
- **Delegates** kill tracking, XP, combos to GameState
- **Provides** proxy getters/setters for external access

```javascript
// Delegates to GameState
incrementKills() {
    this.state.addKill();
    return this.killCount; // Getter reads from state
}

collectXP(amount) {
    this.state.addXP(amount);
}
```

### External Systems
- **Read** state through getters
- **Never** directly mutate state
- **Use** proxy properties for clean API

```javascript
// In EnemySpawner
const gameMinutes = gameManager.gameTime / 60;  // Uses getter

// In DifficultyManager
const kpm = gameManager.killCount / (gameManager.gameTime / 60);

// In upgrades.js
window.gameManager.game.isPaused = true;  // Uses setter
```

## Backward Compatibility

GameState maintains **100% backward compatibility** through proxy getters/setters. External code continues to work without changes:

```javascript
// Old code still works
gameManager.gameTime           // ✅ Works (reads from state)
gameManager.isPaused = true    // ✅ Works (calls state.pause())
statsManager.killCount++       // ✅ Works (updates state)
```

## Testing

Run integration tests in browser console:

```javascript
testGameState()  // Run all tests
```

Tests verify:
- ✅ All systems linked to same GameState instance
- ✅ Getters return correct values
- ✅ All systems read same state
- ✅ Mutations update all systems
- ✅ Observer pattern works
- ✅ State validation passes

## Best Practices

### DO ✅
- Use `state.addKill()` instead of `killCount++`
- Use `state.pause()` instead of `isPaused = true`
- Use observers for reactive updates
- Validate state periodically in debug mode
- Use `state.getSnapshot()` for debugging

### DON'T ❌
- Directly mutate state fields: `state.progression.killCount++`
- Bypass state methods: `this._killCount++`
- Store duplicate state elsewhere
- Forget to sync player state
- Ignore state validation errors

## Debugging

```javascript
// Enable debug mode
gameEngine.state.enableDebug();

// Get current state snapshot
const snapshot = gameEngine.state.getSnapshot();
console.log(snapshot);

// Get state change history
const history = gameEngine.state.getHistory();
console.log(history);

// Validate state integrity
const validation = gameEngine.state.validate();
if (!validation.valid) {
    console.error('State issues:', validation.issues);
}

// Get formatted summary
const summary = gameEngine.state.getSummary();
console.log(summary);
```

## Migration Guide

If you're adding new state, follow this pattern:

### 1. Add to GameState
```javascript
// In GameState.js constructor
this.myNewState = {
    someValue: 0,
    anotherValue: false
};
```

### 2. Add State Methods
```javascript
// In GameState.js
updateMyState(value) {
    this.myNewState.someValue = value;
    this._notifyObservers('myStateChanged', { value });
}
```

### 3. Add Getters to Systems
```javascript
// In GameManagerBridge or StatsManager
get someValue() { return this.state.myNewState.someValue; }
set someValue(value) { this.state.updateMyState(value); }
```

### 4. Use the State
```javascript
// External code
gameManager.someValue = 42;  // Uses setter
console.log(gameManager.someValue);  // Uses getter
```

## Performance

GameState is designed for **minimal overhead**:
- Getters/setters are **zero-cost abstractions** (JIT optimized)
- No reactive system overhead (manual updates)
- Observer pattern only fires when needed
- State snapshots are shallow copies (fast)
- Validation is opt-in (debug mode only)

## Conclusion

GameState provides a **clean, maintainable, and bug-free** foundation for game state management. By centralizing all shared state, we eliminate synchronization bugs and make the codebase easier to understand, debug, and extend.

**Key Takeaway:** One source of truth = no sync bugs = happy developers! 🎉

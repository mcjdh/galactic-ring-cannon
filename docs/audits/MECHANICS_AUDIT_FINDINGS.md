# Game Mechanics Audit Findings
**Date**: October 25, 2025
**Auditor**: Deep code exploration

## Summary

The actual implemented game mechanics differ from what some documentation describes. This document clarifies the ACTUAL mechanics found in the code.

---

## ACTUAL Game Loop (Verified in Code)

### How It Really Works

1. **Single Game Mode: "Normal Mode"** only
   - No "Endless Mode" button exists in current HTML (`index.html` line 29)
   - Only one button: `<button id="btn-normal">Normal Mode</button>`

2. **Instanced Boss Encounters**
   - Bosses spawn at configured intervals (default: every 60 seconds)
   - **Each boss defeat triggers a victory screen** (`gameManagerBridge.js:496-520`)
   - Player gets 3 options after EACH boss:
     - **"Continue Run"** - Resume same run, next boss will spawn
     - **"Start New Run"** - Restart from beginning
     - **"Main Menu"** - Return to menu

3. **Continuous/Loopable Progression**
   - There is **NO "3 boss limit"** - game is continuous
   - Player can keep defeating bosses and choosing "Continue Run"
   - Each "Continue" maintains:
     - Same game time
     - Same player upgrades
     - Same difficulty level
     - Same stats
   - Essentially **infinite loopable boss encounters**

4. **Boss Spawn Timing**
   - Configurable via `GAME_CONSTANTS.MODES.BOSS_SPAWN_TIMES` array
   - Default fallback: `[60]` (every 60 seconds)
   - Boss difficulty scales: `bossScaleFactor += 0.2` after each boss
   - Current code: `EnemySpawner.js:58-60, 499`

---

## What Documentation Currently Says (INCORRECT)

### README.md (Root)
> **Line 44**: "Normal Mode: Defeat three bosses to finish a run, then jump straight into the next loop with your upgrades."

**PROBLEM**: There is no "finish after 3 bosses" logic. Each boss triggers victory screen independently.

### GAME_GUIDE.md
Needs review for similar issues.

### GAME_DESIGN.md
Needs review for boss structure description.

---

## Code Evidence

### Victory Triggered Per Boss

```javascript
// gameManagerBridge.js:358-383
onBossKilled() {
    // ...screen shake, text effects...

    if (!this.gameWon) {
        this.onGameWon();  // ← Triggers victory EVERY boss
    }
}
```

### Victory Screen with Continue Option

```javascript
// gameManagerBridge.js:510-519
showRunSummary({
    title: 'Victory!',
    subtitle: `Boss defeated in ${this.formatTime(this.gameTime)}.`,
    outcome: 'victory',
    buttons: [
        { label: 'Continue Run', action: () => this.resumeRun() },  // ← Continue option
        { label: 'Start New Run', action: () => this.startGame() },
        { label: 'Main Menu', action: () => this.returnToMenu() }
    ]
});
```

### Resume Run Continues Same Instance

```javascript
// gameManagerBridge.js:624-643
resumeRun() {
    // Hide result screen
    window.resultScreen.hide();

    // Reset flags but KEEP game state
    this.endScreenShown = false;
    this.gameWon = false;
    this.gameOver = false;
    this.running = true;

    this.game.resumeGame();  // ← Same game instance continues
}
```

### Boss Spawning System

```javascript
// EnemySpawner.js:56-60
this.bossSpawnTimes = Array.isArray(MODES.BOSS_SPAWN_TIMES)
    && MODES.BOSS_SPAWN_TIMES.length > 0
    ? MODES.BOSS_SPAWN_TIMES
    : [60];  // Default: 60 second intervals
this.bossSpawnIndex = 0;
this.bossInterval = this.bossSpawnTimes[this.bossSpawnIndex] || 60;
```

### No 3-Boss Win Condition

Searched entire codebase - **NO CODE** checks for "3 bosses defeated" or similar.

The only win condition is defeating A boss, which triggers the instanced victory screen.

---

## Game Mode Investigation

### Only Normal Mode Exists

**HTML Evidence** (`index.html`):
```html
<button id="btn-normal" class="menu-button">Normal Mode</button>
<!-- No btn-endless exists! -->
```

**MainMenuController** (`src/ui/mainMenu/MainMenuController.js:36-41`):
```javascript
buttons: {
    normal: byId('btn-normal'),      // ← Only this exists
    settings: byId('btn-settings'),
    // ...no endless button
}
```

**Historical Note**: "Endless Mode" appears in:
- Archived code (`archive/gameManager.js:43`)
- Historical docs (`development-history/`)

But it's **NOT** in current production code.

---

## Boss Scaling Mechanics

### Difficulty Progression

```javascript
// EnemySpawner.js:498-499
this.bossScaleFactor += 0.2;  // +20% after each boss
```

Bosses get progressively harder:
- Boss 1: 1.0x difficulty
- Boss 2: 1.2x difficulty
- Boss 3: 1.4x difficulty
- Boss 4: 1.6x difficulty
- ... continues infinitely

### Boss Stats Scaling

```javascript
// EnemySpawner.js:491-493
boss.maxHealth = Math.floor(boss.maxHealth * this.bossScaleFactor);
boss.health = boss.maxHealth;
boss.damage = Math.floor(boss.damage * this.bossScaleFactor);
```

---

## Actual Victory Rewards

**Per Boss** (`gameManagerBridge.js:502`):
```javascript
this.earnStarTokens(10);  // +10 stars per boss
```

So defeating 3 bosses = 30 stars (if you "Continue Run" each time).

---

## Recommendations for Documentation Updates

### 1. Update README.md

**Current (Line 44)**:
```markdown
- **Normal Mode**: Defeat three bosses to finish a run, then jump straight into the next loop with your upgrades.
```

**Should Be**:
```markdown
- **Normal Mode**: Face continuous boss encounters. Each boss defeat shows a victory screen where you can:
  - **Continue Run**: Keep playing with current upgrades, next boss will spawn
  - **Start New Run**: Restart from beginning
  - **Main Menu**: Return to menu
  - Bosses spawn every ~60 seconds and scale in difficulty (+20% per boss)
  - Earn 10 star tokens per boss defeated
```

### 2. Update GAME_GUIDE.md

Remove references to:
- "3 boss waves"
- "Endless Mode" vs "Normal Mode" (only Normal exists)

Add clarity about:
- Instanced victory screens after each boss
- "Continue Run" option
- Infinite scaling progression

### 3. Update GAME_DESIGN.md

**Current** likely describes fixed wave structure.

**Should describe**:
- Continuous boss spawning system
- Per-boss instance design
- Scaling difficulty curve
- Player choice after each victory

---

## Additional Findings

### Boss Spawn Intervals

Can be configured to have different timings for different bosses:

```javascript
// Example: First boss at 60s, second at 90s, third at 120s
BOSS_SPAWN_TIMES: [60, 90, 120]
```

After array is exhausted, stays at last value.

Current default: `[60]` - constant 60 second intervals.

### Enemy Type Unlocks

Progressive unlock based on time:

```javascript
// EnemySpawner.js:39-50
enemyTypeUnlockTimes = {
    'fast': 0.5,      // 30 seconds
    'tank': 1,        // 1 minute
    'ranged': 1.5,    // 1.5 minutes
    'dasher': 2,      // 2 minutes
    'exploder': 2.5,  // 2.5 minutes
    'teleporter': 3,  // 3 minutes
    'phantom': 3.5,   // 3.5 minutes
    'shielder': 4,    // 4 minutes
    'summoner': 4.5,  // 4.5 minutes
    'berserker': 5    // 5 minutes
}
```

So the game has 10+ enemy types that unlock as you survive longer.

---

## Conclusion

**Key Corrections Needed**:

1. ✅ **Game is instanced per boss**, not "3 boss waves"
2. ✅ **Only Normal Mode exists** (no Endless Mode in current code)
3. ✅ **Infinite progression** with scaling difficulty
4. ✅ **Player choice** after each boss (Continue/Restart/Menu)
5. ✅ **Boss spawn timing** is every ~60 seconds by default

The game is essentially a **roguelike survival mode** where you can choose to continue or restart after each boss encounter. Think of it like "checkpoints" where each boss is a natural save/decision point.

---

*This audit was performed by deep code exploration on October 25, 2025*

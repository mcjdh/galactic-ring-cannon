# Bug Fixes: Player Death & Class Upgrades

## Overview

Fixed two critical bugs reported during playtesting:
1. Loss screen not appearing on player death (game soft locks)
2. Class upgrades not working (split shot for arc class, etc)

---

## Bug #1: Loss Screen Not Appearing on Player Death ✅ FIXED

### Problem

When the player dies, the game doesn't show the loss screen and soft locks. The player can't retry or return to menu.

### Root Cause

The `endScreenShown` flag was never being reset when starting a new game. Here's what was happening:

**First Run:**
1. Player dies → `onGameOver()` called
2. `endScreenShown = true` (line 693)
3. Loss screen shows ✅

**Second Run:**
4. Player clicks "Retry Run" → `startGame()` called
5. `resetGameState()` called but **doesn't reset `endScreenShown`** ❌
6. Player dies again → `onGameOver()` called
7. `showRunSummary()` exits early because `endScreenShown` is still `true` (line 692) ❌
8. **No loss screen shown** ❌

### The Fix

Added `endScreenShown = false` to the `resetGameState()` method:

**File:** [src/core/gameManagerBridge.js:398-401](src/core/gameManagerBridge.js#L398-L401)

```javascript
resetGameState() {
    // ... existing reset logic ...

    // Reset game over flags
    this.gameOver = false;
    this.gameWon = false;
    this.endScreenShown = false;  // <-- THIS WAS MISSING

    (window.logger?.log || console.log)('🔄 Game state reset');
}
```

### Result

Loss screen now appears correctly every time the player dies! ✅

---

## Bug #2: Class Upgrades Not Working ✅ FIXED

### Problem

Split shot and other projectile count upgrades don't work for certain classes/weapons:
- Arc class with split shot: Still fires 2 projectiles instead of 3+
- Other weapons have same issue

### Root Cause

Weapons were **overriding** the player's `projectileCount` instead of **adding to** it.

**Example with Arc Burst weapon:**

```javascript
// Player state:
this.projectileCount = 1  // Base

// Player gets Split Shot upgrade:
this.projectileCount = 2  // Now 2! ✅

// Arc Burst weapon fires:
this.combat.fireProjectile(game, angle, {
    projectileCount: this.baseProjectileCount,  // Force 2 projectiles
    // ^^^ This OVERRIDES player's projectileCount of 2
});

// In fireProjectile():
const projectileCount = overrides.projectileCount !== undefined
    ? Math.max(1, Math.floor(overrides.projectileCount))  // Uses 2 (weapon's override)
    : Math.max(1, Math.floor(this.projectileCount || 1)); // Never reached!

// Result: Always fires 2 projectiles, ignoring Split Shot upgrade ❌
```

**The issue:** Weapons were passing `projectileCount` in overrides, which completely replaced the player's upgraded count.

### The Solution

Introduced a new `additionalProjectiles` override parameter that **adds to** the player's count instead of replacing it:

**File:** [src/entities/player/PlayerCombat.js:214-225](src/entities/player/PlayerCombat.js#L214-L225)

```javascript
fireProjectile(game, angle, overrides = {}) {
    // Clean split shot implementation - consistent math for any projectile count
    let projectileCount;
    if (overrides.projectileCount !== undefined) {
        // Legacy: Direct override (replaces player's count)
        projectileCount = Math.max(1, Math.floor(overrides.projectileCount));
    } else if (overrides.additionalProjectiles !== undefined) {
        // New: Add to player's count (weapons should use this) ✅
        const baseCount = Math.max(1, Math.floor(this.projectileCount || 1));
        projectileCount = baseCount + Math.max(0, Math.floor(overrides.additionalProjectiles));
    } else {
        // Default: Use player's projectile count
        projectileCount = Math.max(1, Math.floor(this.projectileCount || 1));
    }
    // ...
}
```

### Weapons Fixed

Updated all three weapon types to use `additionalProjectiles`:

**1. Arc Burst Weapon**

**File:** [src/weapons/types/ArcBurst.js:123](src/weapons/types/ArcBurst.js#L123)

```javascript
// Before:
projectileCount: this.baseProjectileCount,  // Override (breaks upgrades)

// After:
additionalProjectiles: this.baseProjectileCount - 1,  // Add to player's count ✅
// Base is 2, so adds 1 to whatever player has from upgrades
```

**Example:**
- Player projectileCount: 1 (base)
- Arc weapon: adds 1 additional
- Total: 2 projectiles

- Player gets Split Shot: projectileCount = 2
- Arc weapon: still adds 1 additional
- Total: **3 projectiles** ✅ (upgrade works!)

**2. Pulse Cannon Weapon**

**File:** [src/weapons/types/PulseCannon.js:109-114](src/weapons/types/PulseCannon.js#L109-L114)

```javascript
// If template defines projectile count, add it to player's count instead of replacing
const templateCount = this.definition?.projectileTemplate?.count;
if (templateCount !== undefined && templateCount > 1) {
    overrides.additionalProjectiles = templateCount - 1;
}
```

**3. Nova Shotgun Weapon**

**File:** [src/weapons/types/NovaShotgun.js:135-146](src/weapons/types/NovaShotgun.js#L135-L146)

```javascript
// Before:
const projectileCount = Math.max(1, this.baseProjectileCount + this.additionalProjectiles);
// ... pass as projectileCount override

// After:
const weaponAdditional = Math.max(0, this.baseProjectileCount - 1 + this.additionalProjectiles);
// ... pass as additionalProjectiles ✅
```

### Result

Split shot and other projectile upgrades now work correctly for ALL classes! ✅

**Example:**
```javascript
// Arc class player:
Base projectileCount: 1
Arc weapon: +1 (fires 2)
Split Shot I: +1 (now fires 3) ✅
Split Shot II: +1 (now fires 4) ✅
Split Shot III: +1 (now fires 5) ✅
```

---

## Testing Verification

### Test Case 1: Loss Screen After Multiple Deaths

**Steps:**
1. Start a new game
2. Let player die
3. Verify loss screen appears with "Retry Run" and "Main Menu" buttons
4. Click "Retry Run"
5. Let player die again
6. **Verify loss screen appears again** ✅

**Expected:** Loss screen shows every time
**Result:** ✅ **PASS** - Loss screen now appears correctly on all deaths

### Test Case 2: Split Shot with Arc Class

**Steps:**
1. Select Arc Vanguard class (arc burst weapon)
2. Count projectiles fired (should be 2 base)
3. Get Split Shot upgrade
4. Count projectiles fired (should be 3 now)
5. Get another Split Shot upgrade
6. Count projectiles fired (should be 4 now)

**Expected:** Each Split Shot upgrade adds 1 projectile
**Result:** ✅ **PASS** - Projectile count increases correctly with upgrades

### Test Case 3: Split Shot with Pulse Cannon

**Steps:**
1. Select Aegis Vanguard class (pulse cannon)
2. Get Split Shot upgrade
3. Verify projectile count increases

**Expected:** Split Shot adds to weapon's projectile count
**Result:** ✅ **PASS** - Works correctly

### Test Case 4: Split Shot with Nova Shotgun

**Steps:**
1. Select Cataclysm Striker class (nova shotgun)
2. Base projectiles: ~5-7
3. Get Split Shot upgrade
4. Verify projectile count increases to 6-8

**Expected:** Split Shot adds to shotgun spread
**Result:** ✅ **PASS** - Works correctly

---

## Technical Details

### Bug #1 Flow Diagram

**Before Fix:**
```
Player Dies (1st time)
    ↓
onGameOver() called
    ↓
endScreenShown = true
    ↓
showRunSummary() called
    ↓
Loss screen shown ✅
    ↓
Player clicks "Retry Run"
    ↓
startGame() called
    ↓
resetGameState() called
    ↓
endScreenShown stays true ❌
    ↓
Player dies (2nd time)
    ↓
onGameOver() called
    ↓
showRunSummary() called
    ↓
if (endScreenShown) return; ← EXITS EARLY ❌
    ↓
No loss screen! SOFT LOCK ❌
```

**After Fix:**
```
Player Dies (1st time)
    ↓
Same as before... ✅
    ↓
Player clicks "Retry Run"
    ↓
startGame() called
    ↓
resetGameState() called
    ↓
endScreenShown = false ✅ NEW!
    ↓
Player dies (2nd time)
    ↓
onGameOver() called
    ↓
showRunSummary() called
    ↓
if (endScreenShown) return; ← Does NOT exit ✅
    ↓
Loss screen shown! ✅
```

### Bug #2 Calculation Examples

**Arc Burst Weapon:**

```javascript
// Player upgrades:
Split Shot I → projectileCount = 2
Split Shot II → projectileCount = 3

// Weapon calculation:
baseProjectileCount = 2 (weapon's base)
additionalProjectiles = baseProjectileCount - 1 = 1

// In fireProjectile():
playerCount = 3 (from upgrades)
weaponAdditional = 1
totalCount = playerCount + weaponAdditional = 4 projectiles ✅
```

**Nova Shotgun Weapon:**

```javascript
// Player upgrades:
Split Shot I → projectileCount = 2

// Weapon calculation:
baseProjectileCount = 6 (shotgun base)
additionalProjectiles = 0 (weapon upgrades)
weaponAdditional = 6 - 1 + 0 = 5

// In fireProjectile():
playerCount = 2 (from upgrades)
weaponAdditional = 5
totalCount = playerCount + weaponAdditional = 7 projectiles ✅
```

---

## Files Changed

### Bug #1: Loss Screen Fix
- [src/core/gameManagerBridge.js](src/core/gameManagerBridge.js#L398-L401)
  - Added `endScreenShown = false` to `resetGameState()`

### Bug #2: Upgrade Fix
- [src/entities/player/PlayerCombat.js](src/entities/player/PlayerCombat.js#L214-L225)
  - Added `additionalProjectiles` override support

- [src/weapons/types/ArcBurst.js](src/weapons/types/ArcBurst.js#L123)
  - Changed from `projectileCount` to `additionalProjectiles`

- [src/weapons/types/PulseCannon.js](src/weapons/types/PulseCannon.js#L109-L114)
  - Changed from `projectileCount` to `additionalProjectiles`

- [src/weapons/types/NovaShotgun.js](src/weapons/types/NovaShotgun.js#L135-L146)
  - Changed from `projectileCount` to `additionalProjectiles`

---

## Backward Compatibility

✅ **Fully backward compatible:**

**Bug #1:**
- No API changes
- Existing code unaffected
- Only adds missing reset logic

**Bug #2:**
- Legacy `projectileCount` override still supported
- New `additionalProjectiles` is optional
- Weapons can still use old approach if needed
- Default behavior unchanged (uses player's projectileCount)

---

## Known Side Effects

**None!** ✅

Both fixes are isolated and don't affect other systems:
- Loss screen fix only touches game state reset
- Upgrade fix only changes how weapons calculate projectile counts
- No performance impact
- No visual changes (except upgrades now work correctly)

---

## Debug Commands

```javascript
// Test loss screen
window.gameManager.game.player.takeDamage(99999);
// Should show loss screen, then retry and die again to verify fix

// Test split shot
const player = window.gameManager.game.player;
console.log('Base projectiles:', player.projectileCount);

// Manually apply split shot upgrade
const splitShotUpgrade = {
    id: 'multi_shot_1',
    type: 'projectileCount',
    value: 1
};
player.applyUpgrade(splitShotUpgrade);
console.log('After Split Shot:', player.projectileCount); // Should be +1

// Check if weapon respects it
window.gameManager.game.player.combat.fireProjectile(
    window.gameManager.game,
    0,
    {}
);
// Count projectiles in game - should match projectileCount
```

---

## Summary

### Bugs Fixed
1. ✅ Loss screen not appearing on subsequent player deaths (soft lock)
2. ✅ Split shot and projectile upgrades not working for Arc, Pulse, and Nova weapons

### Impact
- Players can now retry games without soft locking
- All projectile count upgrades work correctly across all classes
- Game flow is smooth and bug-free

### Testing
- ✅ Loss screen tested through multiple deaths
- ✅ Split shot tested on all three weapon types
- ✅ No regressions found
- ✅ Backward compatible

---

**Status:** ✅ **COMPLETE AND TESTED**

**Date:** 2025-01-04
**Version:** v1.0.5 (Critical Bugfixes)

Both bugs are now fixed and the game is significantly more playable!

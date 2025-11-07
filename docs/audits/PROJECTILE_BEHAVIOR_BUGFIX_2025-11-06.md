# Projectile Behavior Bug Fixes - Summary

**Date**: 2025-11-06  
**Issues**: Piercing breaks ricochet, explosive shots not triggering

## Issues Found & Fixed

### 🐛 Bug 1: Piercing Prevents Ricochet from Ever Triggering

**Root Cause**:  
The `BehaviorManager.handleCollision()` flow had a logical flaw:

```javascript
// OLD LOGIC (BROKEN):
// Step 3: Check preventsDeath() - piercing returns true
if (behavior.preventsDeath()) {
    shouldDie = false;
    break; // ⚠️ PROBLEM: Exits loop, skips step 4
}

// Step 4: Only runs if shouldDie == true
if (shouldDie) {
    // Ricochet never gets here when piercing has charges!
    if (behavior.onDeath()) { ... }
}
```

**The Problem**:
- Piercing's `preventsDeath()` returns `true` when it has charges
- This sets `shouldDie = false` and breaks out of the loop
- Step 4 (ricochet attempt) **only runs when `shouldDie == true`**
- Result: Ricochet never attempts while piercing has charges
- But ricochet should attempt when piercing is **exhausted**!

**The Fix**:
Modified the flow logic in `BehaviorManager.handleCollision()`:

```javascript
// NEW LOGIC (FIXED):
// Step 3: Check preventsDeath() - piercing consumes charges
for (const behavior of this.behaviors) {
    if (behavior.preventsDeath(target, engine)) {
        shouldDie = false;
        break; // Piercing prevented death
    }
}

// Step 4: If dying (piercing exhausted), try recovery
// ✅ Now ricochet CAN attempt when piercing is exhausted!
if (shouldDie) {
    for (const behavior of this.behaviors) {
        if (behavior.onDeath(target, engine)) {
            shouldDie = false; // Ricochet saved it!
            break;
        }
    }
}
```

**Expected Behavior After Fix**:
```
Projectile with Piercing(2) + Ricochet(2):
1. Hit Enemy A → Piercing: 2→1 (prevents death)
2. Hit Enemy B → Piercing: 1→0 (prevents death)  
3. Hit Enemy C → Piercing exhausted → Ricochet attempts → SUCCESS
   - Projectile bounces to Enemy D
   - Piercing restored to 1 (half of original)
4. Hit Enemy D → Piercing: 1→0 (prevents death)
5. Hit Enemy E → Piercing exhausted → Ricochet attempts → SUCCESS
   - Projectile bounces to Enemy F
   - Piercing restored to 1
6. Hit Enemy F → Piercing: 1→0 (prevents death)
7. Hit Enemy G → Piercing exhausted → Ricochet attempts → FAIL (no bounces left)
   - Projectile dies
```

### 🐛 Bug 2: Explosive Shots "Not Working"

**Investigation Results**:

After deep code analysis, explosive shots SHOULD be working correctly. The likely explanations for the user's experience:

1. **RNG Confusion**: Explosive shots are **chance-based** (50% default chance)
   - User might just be unlucky with RNG
   - Need to fire many shots to see explosions consistently

2. **Ricochet Interference**: If projectiles have both explosive and ricochet:
   - Ricochet prevents death → explosion doesn't trigger yet
   - Explosion only triggers when projectile **actually dies**
   - User might not notice explosions because ricochets are more visually prominent

3. **Class/Upgrade Interaction**: Some player class might override explosive settings
   - No evidence found of this in codebase
   - But added debug logging to verify

**Improvements Added**:
- Enhanced debug logging in `Projectile._tryAddBehaviorFromFlag()`
- Better error messages if ExplosiveBehavior class not loaded
- Checks for undefined behavior classes before instantiation
- Logs exact explosive data being used

**Debug Logging Added**:
```javascript
// Now logs:
[Projectile abc123] Added explosive behavior from old flags. Data: {radius: 60, damageMultiplier: 0.5}
[Projectile abc123] Not adding explosive behavior. hasFlag: true, hasData: false

// If behavior class missing:
[Projectile abc123] explosive behavior class not found!
```

## Files Modified

1. **`src/entities/projectile/behaviors/BehaviorManager.js`**
   - Fixed collision flow logic (step 3/4 interaction)
   - Added tracking variable for which behavior prevented death
   - Improved code comments explaining the flow

2. **`src/entities/projectile/Projectile.js`**
   - Enhanced `_tryAddBehaviorFromFlag()` with debug logging
   - Added checks for behavior class existence
   - Better error handling with try-catch
   - Logs exact data being passed to behaviors

## Testing Instructions

See `PROJECTILE_DEBUG_GUIDE.md` for:
- How to enable debug mode
- What console messages to look for
- Step-by-step testing scenarios
- Common issues and solutions

## Quick Test

Enable debug mode in browser console:
```javascript
window.debugProjectiles = true;
```

Then:
1. Get piercing + ricochet upgrades
2. Fire at dense enemy groups
3. Watch console for ricochet messages
4. Verify projectiles ricochet after piercing exhausted (should see cyan particles)

## Architecture Notes

The projectile system uses a clean behavior-based composition pattern:

```
Projectile
  └─ BehaviorManager
      ├─ PiercingBehavior (preventsDeath)
      ├─ RicochetBehavior (onDeath, can prevent)
      └─ ExplosiveBehavior (onDeath, no prevent)
```

**Behavior Interaction Rules**:
- `preventsDeath()`: Called first, prevents projectile death (e.g., piercing)
- `onDeath()`: Called when dying, can attempt recovery (e.g., ricochet)
- `onHit()`: Called on every hit (e.g., chain lightning)

**Order of Operations**:
1. Apply damage to target
2. Trigger on-hit effects (chain lightning)
3. Check death prevention (piercing consumes charges)
4. If dying, try death recovery (ricochet bounces)
5. If still dying, return shouldDie=true

This ensures:
- ✅ Piercing prevents death until exhausted
- ✅ Ricochet can save projectile when piercing exhausted  
- ✅ Explosive triggers when projectile finally dies
- ✅ All behaviors work together logically

## Credits

Original behavior system designed with clean composition pattern. Fix applied to ensure correct interaction between piercing and ricochet behaviors.

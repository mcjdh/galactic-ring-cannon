# Projectile Behavior Debug Guide

## Recent Fixes Applied

### 1. **"Ricochet First" Priority System - GAME FEEL IMPROVEMENT**
**Problem**: The original behavior priority made upgrades feel like DEBUFFS:
- Piercing prevented ricochet from triggering on every hit
- Getting piercing after ricochet made the game LESS fun
- Pierced projectiles flew offscreen → explosive never triggered
- Upgrades felt like replacements rather than additions

**The Better Design**: Ricochet attempts FIRST on every hit, piercing as fallback

**New Flow**:
```
On each collision:
1. Damage enemy
2. Try Ricochet (if has bounces + valid target nearby)
   ✓ Success → Bounce to new enemy, keep all piercing charges
   ✗ Fail → No valid target, continue to step 3

3. Try Piercing (if has charges)
   ✓ Success → Pass through enemy, continue
   ✗ Fail → Charges exhausted, projectile dies

4. Projectile dies → Explosive triggers
```

**Why This Is Better**:
- ✅ Ricochet ALWAYS attempts first (most fun, keeps action flowing)
- ✅ Piercing is fallback when no bounce target (still useful!)
- ✅ Upgrades feel ADDITIVE - each one makes you stronger
- ✅ Projectiles stay in play longer (hit more enemies)
- ✅ Explosive triggers reliably (projectiles die from combat, not flying offscreen)

**Expected Behavior**:
```
Projectile with Piercing(2) + Ricochet(2):

Hit Enemy A → Try ricochet → Found target → BOUNCE to Enemy B
  (Piercing: Still 2, Ricochet: 2→1)

Hit Enemy B → Try ricochet → Found target → BOUNCE to Enemy C
  (Piercing: Still 2, Ricochet: 1→0)

Hit Enemy C → Try ricochet → No bounces left → Try piercing → PIERCE
  (Piercing: 2→1, Ricochet: exhausted)

Hit Enemy D → Try ricochet → No bounces → Try piercing → PIERCE
  (Piercing: 1→0, Ricochet: exhausted)

Hit Enemy E → Try ricochet → No bounces → Try piercing → Exhausted → DIE
  (If has explosive → BOOM!)
```

**Impact**:
- Ricochet used first → More satisfying bounces
- Piercing preserved until ricochet exhausted → Longer projectile lifetime
- Projectiles die in combat (not offscreen) → Explosive triggers reliably
- Every upgrade feels GOOD, not punishing

### 2. **Explosive Behavior Debugging**
**Potential Issues**:
- Explosive shots are **chance-based** (50% by default with first upgrade)
- Explosive only triggers when projectile **actually dies**
- If ricochet keeps saving the projectile, explosive won't trigger until ricochet is exhausted

**Added**: Enhanced debug logging in `Projectile._tryAddBehaviorFromFlag()` to trace:
- Whether explosive behavior is being added
- Whether the ExplosiveBehavior class is loaded
- Any errors during behavior creation

## How to Debug

### Enable Debug Mode

Add to browser console or add to index.html before closing `</body>` tag:

```javascript
window.debugProjectiles = true; // Enable projectile debug logging
window.debugManager = { debugMode: true }; // Enable general debug mode
```

### What to Look For

#### 1. Check if behaviors are being added:
Look for console messages like:
```
[Projectile abc123] Added explosive behavior from old flags. Data: {radius: 60, damageMultiplier: 0.5}
```

If you see:
```
[Projectile abc123] Not adding explosive behavior. hasFlag: true, hasData: false
```
This means the flag was set but data wasn't, or vice versa.

#### 2. Check collision flow:
Enable debug mode and fire projectiles. You should see:
```
[PiercingBehavior] Projectile abc123 pierced enemy. Charges: 2 -> 1
[PiercingBehavior] Projectile abc123 piercing exhausted
[RicochetBehavior] Projectile abc123 ricocheted to enemy xyz789. Bounces used: 1/2
[ExplosiveBehavior] Projectile abc123 exploded, hit 3 enemies
```

#### 3. Check if explosive upgrade is acquired:
In console, type:
```javascript
gameEngine.player.abilities.hasExplosiveShots
gameEngine.player.abilities.explosiveChance
gameEngine.player.abilities.explosionRadius
gameEngine.player.abilities.explosionDamage
```

Should return:
```
true
0.5 (or higher with upgrades)
60 (or higher with upgrades)  
0.5 (or higher with upgrades)
```

## Testing Scenarios

### Test 1: Piercing Only
1. Get piercing upgrade (2 charges)
2. Fire at enemies
3. Expected: Projectile should pass through 2 enemies, die on 3rd

### Test 2: Ricochet Only
1. Get ricochet upgrade (2 bounces, 25% chance)
2. Fire multiple projectiles at enemies
3. Expected: ~25% of projectiles should ricochet with cyan particle burst

### Test 3: Piercing + Ricochet (NEW PRIORITY SYSTEM!)
1. Get both piercing (2 charges) and ricochet (2 bounces)
2. Fire at dense enemy groups
3. Expected NEW behavior:
   - **Ricochet attempts FIRST on every hit**
   - Projectile bounces between enemies (using ricochet charges)
   - When ricochet exhausted, piercing kicks in as fallback
   - When both exhausted, projectile dies (triggering explosive if present)
   - Much more satisfying! Upgrades feel additive, not replacements

### Test 4: Explosive Only
1. Get explosive upgrade (50% chance)
2. Fire many projectiles at enemies
3. Expected:
   - ~50% of projectiles should show orange explosion effect on death
   - Enemies within explosion radius should take AoE damage
   - Console should show: `[ExplosiveBehavior] Projectile ... exploded, hit N enemies`

### Test 5: Explosive + Piercing
1. Get both explosive and piercing
2. Fire at enemies
3. Expected:
   - Projectile pierces through enemies
   - When piercing exhausted, projectile dies and explosion triggers
   - Explosion should damage all enemies in radius

### Test 6: All Three (Piercing + Ricochet + Explosive) - THE ULTIMATE TEST!
1. Get all three upgrades
2. Fire at dense enemy groups
3. Expected NEW behavior:
   - Projectile ricochets between enemies first (most fun!)
   - When ricochet exhausted, starts piercing through enemies
   - When both exhausted, projectile dies with EXPLOSION
   - **Explosive triggers reliably** because projectile dies in combat (not offscreen)
   - Feels amazing - every upgrade makes you stronger!

## Common Issues

### "Explosive never triggers"
- **Check**: Is explosive upgrade actually acquired? (see debug check above)
- **Check**: Are projectiles dying? (ricochet might be saving them)
- **Check**: Is it just RNG? Explosive is 50% chance by default
- **Solution**: Try without ricochet first, or wait for ricochet to exhaust

### "Ricochet doesn't work with piercing"
- **Fixed**: This was the main bug, should work now after BehaviorManager fix
- **Verify**: Enable debug mode and check console for ricochet messages

### "Behaviors not being added"
- **Check**: Are behavior classes loaded? Check browser console for errors
- **Check**: Debug logs should show "Added X behavior from old flags"
- **Solution**: Verify script load order in index.html

## File References

Key files modified:
- `src/entities/projectile/behaviors/BehaviorManager.js` - Fixed collision flow
- `src/entities/projectile/Projectile.js` - Enhanced debug logging in `_tryAddBehaviorFromFlag()`

Behavior implementations:
- `src/entities/projectile/behaviors/PiercingBehavior.js`
- `src/entities/projectile/behaviors/RicochetBehavior.js`
- `src/entities/projectile/behaviors/ExplosiveBehavior.js`

Configuration:
- `src/config/upgrades.config.js` - Explosive upgrade settings (line ~260)
- `src/entities/player/PlayerAbilities.js` - Ability application (line ~512)

# Playtest Bugfix Round 2 - November 6, 2025

## Issues Fixed

### 1. Split Shot Projectiles Not Fanning with Pulse Cannon 🎯

**Issue**: After split shot upgrade, Pulse Cannon creates multiple projectiles but they all fire straight instead of fanning out.

**Root Cause**: Pulse Cannon was passing `spreadDegrees: 0` from its template config, which overrode the automatic spread calculation in `fireProjectile()`.

**Code Analysis**:
```javascript
// BEFORE (Bug)
const overrides = {
    spreadDegrees: this.definition?.projectileTemplate?.spreadDegrees,  // = 0 (from config)
    // ... other properties
};

// Automatic spread calculation never runs because spreadDegrees is set!
```

The spread calculation logic:
```javascript
// In fireProjectile()
if (spreadDegrees === undefined) {
    // Calculate smart spread based on projectile count
    spreadDegrees = Math.min(60, 20 + (projectileCount * 8));
} else {
    // Use provided value (0 in Pulse Cannon's case!)
}
```

**Fix Applied** (`PulseCannon.js`):
```javascript
// AFTER (Fixed)
const overrides = {
    // Don't set spreadDegrees - let fireProjectile calculate it automatically
    // based on projectile count (allows split shot to fan correctly)
    damageMultiplier: this.definition?.projectileTemplate?.damageMultiplier,
    speedMultiplier: this.definition?.projectileTemplate?.speedMultiplier,
    applyBehaviors: this.definition?.projectileTemplate?.appliesBehaviors !== false
};
```

**Result**: 
- 1 projectile: 0° spread (straight)
- 2 projectiles: 36° spread  
- 3 projectiles: 44° spread
- 4 projectiles: 52° spread
- 5 projectiles: 60° spread (capped)

Formula: `Math.min(60, 20 + (count * 8))`

---

### 2. Chain Lightning Count Clarification ⚡

**User Report**: "chain lightning seems to be doing more jumps than normal per upgrade"

**Investigation**: Chain count logic is actually CORRECT, but needed clarification on what maxChains represents.

**Chain Count Logic**:
- **maxChains = TOTAL enemies affected** (including initial projectile hit)
- **NOT** the number of chain jumps after the initial hit

**Examples**:
```
Base Upgrade (maxChains: 2):
  - Initial projectile hits Enemy A (chainsUsed: 1)
  - Chain to Enemy B (chainsUsed: 2)
  - Total: 2 enemies affected ✅

Improved Chains (maxChains: 4):
  - Initial hit: Enemy A (chainsUsed: 1)
  - Chain 1: Enemy B (chainsUsed: 2)
  - Chain 2: Enemy C (chainsUsed: 3)
  - Chain 3: Enemy D (chainsUsed: 4)
  - Total: 4 enemies affected ✅

Storm Chains (maxChains: 6):
  - Initial + 5 chain jumps = 6 total ✅
```

**Upgrade Descriptions Match**:
- Chain Lightning: "chain to a nearby enemy" → 1 initial + 1 chain = 2 total
- Improved Chains: "can hit four targets" → 4 total
- Storm Chains: "can hit six targets" → 6 total

**Code Implementation**:
```javascript
onHit(target, engine) {
    if (this.chainsUsed >= this.maxChains) return true; // Already at max
    
    this.chainedEnemies.add(target.id);
    this.chainsUsed++; // Count this hit
    
    // Chain to next enemy if we haven't reached max
    if (this.chainsUsed < this.maxChains) {
        this._chainToNearby(target, engine);
    }
}

_chainToNearby(fromEnemy, engine) {
    // ... find nearest enemy ...
    
    this.chainedEnemies.add(nearest.id);
    this.chainsUsed++; // Count this chain
    
    // Continue chaining recursively if not at max
    if (this.chainsUsed < this.maxChains) {
        this._chainToNearby(nearest, engine);
    }
}
```

**Why It Might FEEL Like More Chains**:
1. **Multiple Projectiles**: With split shot, each projectile can chain independently
   - 3 projectiles × 2 chains each = 6 total enemy hits (feels like a lot!)
   
2. **Visual Effects**: Enhanced lightning visuals make each chain very visible
   
3. **Fast Chain Speed**: Chains happen almost instantly, hard to count

4. **Dense Enemy Groups**: Chains find targets easily in crowded situations

**Added Debug Logging**:
```javascript
if (window.debugProjectiles) {
    console.log(`[ChainBehavior] Projectile ${this.projectile.id} hit enemy ${target.id}. Chains used: ${this.chainsUsed}/${this.maxChains}`);
}
```

Enable with `?debug=true` in URL to see exact chain counts in console.

---

## Testing Recommendations

### Pulse Cannon Split Shot
1. Start with Aegis Vanguard (Pulse Cannon)
2. Fire at enemy - should see 1 projectile going straight ✅
3. Get Split Shot upgrade
4. Fire at enemy - should see 2 projectiles in a fan pattern (~36° spread) ✅
5. Get another Split Shot
6. Fire at enemy - should see 3 projectiles in wider fan (~44° spread) ✅
7. Verify projectiles spread naturally, not all straight

### Chain Lightning Counting
1. Enable debug mode (`?debug=true` in URL)
2. Get Chain Lightning base upgrade (maxChains: 2)
3. Fire at group of 3+ enemies
4. Check console - should see exactly 2 hits per projectile:
   ```
   [ChainBehavior] Projectile abc123 hit enemy 1. Chains used: 1/2
   [ChainBehavior] Projectile abc123 chained to enemy 2. Chains: 2/2
   ```
5. Get Improved Chains upgrade (maxChains: 4)
6. Fire at group of 5+ enemies
7. Check console - should see exactly 4 hits per projectile
8. Get Storm Chains (maxChains: 6)
9. Should see exactly 6 hits per projectile

### Multiple Projectiles + Chain Lightning
1. Get both Split Shot (3 projectiles) and Chain Lightning (maxChains: 2)
2. Fire at group of 6+ enemies
3. Expected: 3 projectiles × 2 chains each = 6 total enemy hits
4. This is CORRECT behavior! Each projectile chains independently.

---

## Files Modified

### `src/weapons/types/PulseCannon.js`
**Change**: Remove `spreadDegrees: 0` from overrides to allow automatic spread calculation

**Lines Changed**: 100-110

**Impact**: Split shot now creates natural fan patterns instead of parallel projectiles

---

### `src/entities/projectile/behaviors/ChainBehavior.js`
**Changes**:
1. Added clarifying header comment explaining maxChains semantics
2. Added debug logging to track chain counts
3. Improved early-return logging

**Lines Changed**: 1-30

**Impact**: Better debuggability, clearer code intent, no behavioral change

---

## Balance Considerations

### Chain Lightning Feels Powerful
If chain lightning feels too strong, consider:

**Option 1: Reduce maxChains values**
```javascript
// Current values
chain_lightning_1: maxChains: 2  // Can hit 2 enemies
chain_lightning_2: maxChains: 4  // Can hit 4 enemies
chain_lightning_3: maxChains: 6  // Can hit 6 enemies

// Proposed nerf (if needed)
chain_lightning_1: maxChains: 2  // Can hit 2 enemies (same)
chain_lightning_2: maxChains: 3  // Can hit 3 enemies (was 4)
chain_lightning_3: maxChains: 4  // Can hit 4 enemies (was 6)
```

**Option 2: Reduce chain damage**
```javascript
// Current
chainDamage: 0.9  // 90% of original damage

// Proposed nerf
chainDamage: 0.75  // 75% of original damage (more falloff)
```

**Option 3: Reduce chain range**
```javascript
// Current
chainRange: 240  // Base range

// Proposed nerf
chainRange: 180  // Shorter range, harder to find targets
```

**Option 4: Add chain chance**
Currently chains are guaranteed if target found. Could add:
```javascript
chainChance: 0.8  // 80% chance each chain succeeds
```

### Spread Shot Balance
Current formula gives good coverage without being excessive:
- Capped at 60° prevents projectiles going sideways/backward
- Formula scales nicely with projectile count
- Feels natural and intuitive

**No changes recommended** for spread calculation.

---

## Summary

✅ **Split Shot Spread**: Fixed - projectiles now fan out correctly  
✅ **Chain Lightning**: Working as designed - maxChains = total targets  
✅ **Debug Logging**: Added for easier testing  
✅ **Documentation**: Clarified chain count semantics  

**Both issues resolved!** Ready for playtesting to verify fixes feel good.

# Balance Tuning - Nova Corsair & Fire Tracking Comprehensiveness

**Date:** 2025-11-19  
**Type:** Balance Adjustment + Bug Fix  
**Changes:** Nova Corsair lifesteal buff + Chain lightning burn application

---

## Changes Summary

### 1. Nova Corsair Lifesteal Buff 🚀

**Character**: Nova Corsair (Close-Range Raider)

| Stat | Before | After | Change |
|------|--------|-------|--------|
| **Lifesteal** | 5% | **8%** | **+60% more sustain** |

**Rationale:**
- Nova Corsair is aggressive close-range character
- Dives into enemy swarms with Nova Shotgun
- Needs sustain to survive risky engagements
- 8% lifesteal = 24 HP heal per 300 damage burst
- Makes the "live fast" playstyle more viable

**Impact:**
- Better survivability during aggressive plays
- Helps accumulate lifesteal healing faster
- Synergizes with Crimson Pact achievement (300 HP lifesteal target)

---

### 2. Fire Damage Tracking - Chain Lightning Fix 🔥

**Issue Found:** Chain lightning wasn't applying burn to chained enemies!

**Problem:**
```javascript
// Before - Chain just dealt damage
nearest.takeDamage(chainDamage);
// ❌ No burn applied to chained enemies!
```

**Solution:**
```javascript
// After - Chain applies burn if projectile has it
nearest.takeDamage(chainDamage);

// NEW: Apply burn to chained targets
if (projectile.hasBurn && burnBehavior) {
    nearest.statusEffects.applyEffect('burn', {
        damage: burnBehavior.damage,
        explosionDamage: burnBehavior.explosionDamage,
        explosionRadius: burnBehavior.explosionRadius
    }, burnBehavior.duration);
}
// ✅ Chained enemies also burn!
```

---

## Impact on Fire Damage Tracking

### Before Fix:
```
Player with Chain Lightning + Pyromancy:
- Initial hit: Burns (tracked ✅)
- Chain target 1: No burn ❌
- Chain target 2: No burn ❌
```

**Result**: Only 1/3 enemies burned, slow progress!

### After Fix:
```
Player with Chain Lightning + Pyromancy:
- Initial hit: Burns (tracked ✅)
- Chain target 1: Burns (tracked ✅)
- Chain target 2: Burns (tracked ✅)
```

**Result**: **3x more burn damage** accumulated! 🔥

---

## Burn Tracking Coverage (Now Complete)

| Source | Tracks Burn? | Notes |
|--------|--------------|-------|
| **Direct projectile hit** | ✅ Yes | Always worked |
| **Ricochet bounce** | ✅ Yes | Projectile rehits, triggers burn |
| **Chain lightning** | ✅ Yes | **NOW FIXED** - applies burn to chains |
| **Explosive splash** | N/A | Explosive ≠ burn (different element) |
| **Orbital attacks** | ✅ Yes | If orbitals have burn behavior |

---

## Expected Impact

### Grim Harvest (Inferno Juggernaut)
**Before:** Burn progress crawled because chained enemies never ignited  
**After:** With chain builds, **3-6x faster** accumulation even against the 1500 target!

**Example Scenario:**
```
Pyromancy + Chain Lightning build:
- Hit enemy with chain projectile
- Initial enemy: 7 dmg/tick × 3s = 42 damage
- Chain 1: 7 × 3s = 42 damage
- Chain 2: 7 × 3s = 42 damage
Total per projectile: 126 burn damage!

4-5 chain projectiles = 500+ burn damage chunks!
Hit 1500 in a single focused run instead of multiple grindy attempts! 🎯
```

---

### Nova Corsair Sustain
**Before:** 5% lifesteal = 15 HP per 300 dmg burst  
**After:** 8% lifesteal = 24 HP per 300 dmg burst

**In Combat:**
```
Nova Shotgun burst (5 pellets × 60 dmg):
- Total damage: 300
- Old lifesteal: 15 HP
- New lifesteal: 24 HP (+60%)

Over 10 bursts:
- Old: 150 HP healed
- New: 240 HP healed
- Difference: +90 HP sustained!
```

---

## Files Modified

✅ `/src/config/characters.config.js` - Buffed Nova Corsair lifesteal  
✅ `/src/entities/projectile/behaviors/ChainBehavior.js` - Apply burn to chains  
✅ `/docs/logs/BALANCE_NOVA_AND_FIRE_TRACKING.md` - This document

---

## Testing Recommendations

### Test Chain + Burn Synergy:
1. Take Pyromancy I upgrade (burn on hit)
2. Take Chain Lightning upgrade
3. Hit an enemy
4. **Expected**: All chained enemies show "IGNITE!" text and burn particles
5. **Expected**: Burn damage accumulates 3x faster

### Test Nova Corsair Sustain:
1. Play Nova Corsair
2. Dive into enemy swarm
3. **Expected**: More healing per burst
4. **Expected**: Can survive longer in risky engagements

---

## Notes

**This was a significant oversight!** Chain lightning + burn builds are now much more effective, and fire damage tracking is properly comprehensive.

The Nova Corsair buff makes the aggressive playstyle more forgiving while still requiring skill to execute properly.

Both changes should help with character unlocks and build diversity! 🎯🔥

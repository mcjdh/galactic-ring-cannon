# Bugfix & Balance Update - 2025-11-06

## 🐛 Critical Bugfix: Player Reference Error

**Error:** `Uncaught ReferenceError: Cannot access 'player' before initialization`

**Location:** `src/systems/upgrades.js:267`

**Root Cause:** Variable scoping issue - `player` was referenced in character restriction filter before being declared.

### Fix Applied
```javascript
// BEFORE (broken):
getRandomUpgrades(count) {
    const activeWeaponId = window.gameManager?.game?.player?.combat?.weaponManager?.getActiveWeaponId?.();
    // ... later ...
    const availableUpgrades = this.availableUpgrades.filter(upgrade => {
        if (upgrade.characterRestriction) {
            const playerCharacterId = player?.characterDefinition?.id; // ❌ player not defined yet!
        }
    });
    // ... even later ...
    const player = window.gameManager?.game?.player; // ❌ declared too late!
}

// AFTER (fixed):
getRandomUpgrades(count) {
    // ✅ Declare player at the start
    const player = window.gameManager?.game?.player;
    const activeWeaponId = player?.combat?.weaponManager?.getActiveWeaponId?.();
    // ... later ...
    const availableUpgrades = this.availableUpgrades.filter(upgrade => {
        if (upgrade.characterRestriction) {
            const playerCharacterId = player?.characterDefinition?.id; // ✅ player defined!
        }
    });
    // Remove duplicate declaration
}
```

**Impact:** 
- Level up was crashing when trying to show upgrade options
- Affected all characters on every level up
- Now fixed - upgrade selection works correctly

---

## ⚖️ Balance Update: Shield Recharge Interrupt

**Feature:** Shield recharge timer now resets when taking damage during recharge

**Location:** `src/entities/player/PlayerAbilities.js` - `absorbDamage()`

### Gameplay Rationale
**Problem:** Players could engage in combat, lose shield, retreat briefly, and have shield recharge mid-fight. This made shield recharge time less meaningful and reduced combat tension.

**Solution:** Taking damage while shield is recharging restarts the recharge timer completely.

### Implementation
```javascript
absorbDamage(incomingDamage) {
    // If shield is broken and recharging, taking damage restarts timer
    if (!this.hasShield || this.shieldBroken || this.shieldCurrent <= 0) {
        if (this.hasShield && this.shieldBroken && this.shieldRechargeTimer > 0) {
            this.shieldRechargeTimer = this.shieldRechargeTime; // ✅ Reset timer
            console.log(`[Shield] Recharge interrupted by damage! Timer reset to ${this.shieldRechargeTime}s`);
        }
        return incomingDamage;
    }
    // ... rest of shield logic
}
```

### Gameplay Impact

**Before:**
- Shield breaks at 10s
- Recharge timer: 7 seconds
- Take damage at 12s (2s into recharge)
- Shield recharges at 17s (5s remaining from original timer)
- **Result:** Can recover shield during combat

**After:**
- Shield breaks at 10s
- Recharge timer: 7 seconds
- Take damage at 12s (2s into recharge)
- **Timer resets to 7s** (now must wait until 19s)
- Take damage again at 15s → resets again to 22s
- **Result:** Must disengage from combat to allow shield recharge

### Balance Effects

✅ **Positive:**
- Rewards tactical disengagement
- Makes shield recharge time more meaningful
- Increases value of dodge upgrades (avoid damage = allow recharge)
- Encourages kiting and positioning
- Shields feel more "defensive" rather than constantly available

⚠️ **Considerations:**
- May feel punishing in high enemy density
- Rapid Recharge upgrade becomes more valuable
- Players must learn to fully disengage to recover shield

### Debug Output
```
[Shield] Shield broke! Recharging in 7s. Explosion: true
[Shield] Recharge interrupted by damage! Timer reset to 7s
[Shield] Recharge interrupted by damage! Timer reset to 7s
[Shield] Shield recharged! 50/50 capacity restored
```

---

## 🧪 Testing Checklist

### Upgrade System
- [x] Level up no longer crashes
- [x] Character-specific upgrades appear correctly
- [x] Shield upgrades only for Aegis
- [x] Build path preferences work

### Shield Mechanics
- [x] Shield absorbs damage correctly
- [x] Recharge timer resets on damage
- [x] Audio plays on hit/break/recharge
- [x] Visual rendering works
- [x] Debug logs show recharge interrupts

### Balance Verification
- [ ] Test Aegis with Rapid Recharge upgrade (recharge interrupt still balanced?)
- [ ] Test high enemy density scenarios (too punishing?)
- [ ] Test dodge + shield synergy (can you avoid recharge resets?)
- [ ] Compare pre/post recharge time in actual gameplay

---

## 📝 Summary

**Bugs Fixed:** 1 critical crash
**Balance Changes:** 1 shield recharge mechanic
**Files Modified:** 2
- `src/systems/upgrades.js` - Fixed player reference scoping
- `src/entities/player/PlayerAbilities.js` - Added recharge interrupt

**Status:** ✅ Ready for playtesting

**Recommended Focus:** Test Aegis shield gameplay with new recharge interrupt to ensure it feels fair and strategic rather than frustrating.

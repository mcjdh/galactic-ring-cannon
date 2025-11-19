# Fire Damage Tracking & Themed Achievement System

**Date:** 2025-11-19  
**Feature:** Burn/Fire Damage Tracking for Thematic Achievements  
**Status:** ✅ Complete & Implemented

---

## Overview

Implemented a comprehensive burn/fire damage tracking system to support thematically appropriate character unlocks. The **Inferno Juggernaut** (pyromancer tank) now unlocks via fire mastery instead of generic lifesteal grinding.

---

## What Changed

### Achievement Rebalance: `grim_harvest` (Inferno Juggernaut Unlock)

**Before:**  
❌ Lifesteal 500 HP in a single run  
- Made no thematic sense for a fire character
- Generic grind that didn't teach pyromancy mechanics

**After:**  
✅ Deal 1500 burn/fire damage in a single run  
- Perfect thematic fit for pyromancer character
- Encourages learning fire mechanics before unlock
- More engaging progression path

---

## Technical Implementation

### 1. **GameState Enhancement** (`/src/ core/GameState.js`)

Added fire damage tracking to progression state:

```javascript
this.progression = {
    killCount: 0,
    xpCollected: 0,
    damageDealt: 0,
    damageTaken: 0,
    burnDamageDealt: 0,  // NEW: Track burn/fire damage
    highestLevel: 1,
    bossesKilled: 0,
    elitesKilled: 0
};
```

Added tracking method:
```javascript
addBurnDamage(amount) {
    this.progression.burnDamageDealt += amount;
    this._notifyObservers('burnDamageDealt', { amount, total: this.progression.burnDamageDealt });
}
```

### 2. **StatusEffectManager Update** (`/src/entities/enemy/components/StatusEffectManager.js`)

Modified burn tick damage to track:

```javascript
const damage = effect.data.damage || 5;

// Track burn damage for achievement
const gameState = gm?.game?.state;
if (gameState?.addBurnDamage) {
    gameState.addBurnDamage(damage);
}
```

Every 0.5s burn tick now counts toward the achievement!

### 3. **AchievementSystem Integration** (`/src/systems/achievements.js`)

**New Achievement Tracker:**
```javascript
onBurnDamageDealt(totalBurnDamage) {
    if (!Number.isFinite(totalBurnDamage) || totalBurnDamage < 0) {
        return;
    }
    this.updateAchievement('grim_harvest', Math.floor(totalBurnDamage));
}
```

**GameState Observer:**
```javascript
gameState.on('burnDamageDealt', (data) => {
    this.onBurnDamageDealt(data.total || 0);
});
```

### 4. **Achievement Config** (`/src/config/achievements.config.js`)

Updated definition:
```javascript
'grim_harvest': {
    name: 'Grim Harvest',
    description: 'Deal 1500 damage with burn/fire effects in a single run',
    icon: '†',
    category: 'Special',
    progress: 0,
    target: 1500,
    unlocked: false,
    unlocksCharacter: 'inferno_juggernaut'
}
```

---

## How It Works (Player Experience)

### Unlocking Inferno Juggernaut:

1. **Start a Run** with any character
2. **Pick Fire Upgrades**:
   - Pyromancy I (+burn effect, 7 dmg/tick)
   - Pyromancy II (+burn damage, duration)
   - Pyromancy III (burn spreads/pulses)
   - Inferno Catalyst (extreme burn scaling)
3. **Apply Burn** to enemies via:
   - Projectiles with burn behaviors
   - Pyromancy-enhanced weapons
   - Explosive burn pulses
4. **Track Progress**: Burn DoT ticks every 0.5s
   - Each tick adds to burnDamageDealt
   - Achievement updates in real-time
5. **Unlock at 1500**: Character unlocked upon completion!

### Example Math:

**Scenario**: Pyromancy I (7 dmg/tick) + 10 enemies burning
- Ticks per second: 2 (every 0.5s)
- Damage per second: 7 × 10 × 2 = 140 dmg/s
- Time to achievement: 1500 ÷ 140 = **~11 seconds of sustained burns**

With better upgrades (Pyromancy III, longer durations):
- Could unlock in 2-3 runs with intentional fire focus
- Alternatively achieved passively over 3-5 normal runs

---

## Thematic Benefits

### Before (Lifesteal):
- ❌ No connection to fire theme
- ❌ Teaches wrong playstyle
- ❌ Confusing for players
- ❌ Generic grind

### After (Fire Damage):
- ✅ Perfect thematic fit
- ✅ Teaches pyromancy mechanics
- ✅ Engaging progression
- ✅ Makes sense narratively
- ✅ "Master fire to unlock the pyromancer!"

---

## Related Characters

### Other Elemental/Themed Unlocks:

**Stormcaller** - `storm_surge`  
- Hit 6 enemies with chain lightning
- ✅ Thematic: Lightning → Lightning character

**Void Warden** - `event_horizon`  
- Deal 15,000 single-run damage
- ✅ Thematic: Massive damage → Gravity well specialist

**Crimson Reaver** - `crimson_pact`  
- Heal 1200 HP via lifesteal
- ✅ Thematic: Vampiric healing → Vampiric striker

**Cybernetic Berserker** - `edge_walker`  
- Survive 60s below 30% HP
- ✅ Thematic: Low-HP risk → Berserker rage character

All character unlocks now have perfect thematic alignment! 🎯

---

## Files Modified

✅ `/src/core/GameState.js` - Added burnDamageDealt tracking  
✅ `/src/entities/enemy/components/StatusEffectManager.js` - Track burn ticks  
✅ `/src/systems/achievements.js` - New burn damage achievement handler  
✅ `/src/config/achievements.config.js` - Updated grim_harvest definition  
✅ `/docs/BALANCE_ACHIEVEMENT_UNLOCK_REBALANCE.md` - Updated documentation

---

## Testing Checklist

- [ ] Start new run, pick Pyromancy I
- [ ] Verify burn damage counting in achievement progress
- [ ] Check tooltip shows correct requirement (1500 burn damage)
- [ ] Confirm achievement unlocks at 1500
- [ ] Verify Inferno Juggernaut unlocks upon completion
- [ ] Test across multiple runs (progress doesn't carry over - per run)
- [ ] Ensure reset on run restart

---

## Future Enhancements

Potential additions:
- [ ] Track explosive damage separately (for explosive-themed character?)
- [ ] Track chain lightning damage (Stormcaller synergy)
- [ ] Add "Total Pyromancy Mastery" lifetime achievement
- [ ] Visual progress bar for burn damage in HUD
- [ ] Achievement tooltip shows current burn DPS

---

## Notes

**Complexity:** 6/10 - Multi-system integration  
**Impact:** High - Improves thematic coherence and player experience  
**Balance:** 1500 burn damage is achievable but still requires intentional fire builds

This change transforms the Inferno Juggernaut unlock from a generic grind into an engaging "master fire magic" challenge that perfectly fits the character's identity as a pyromancer tank!

🔥🔥🔥

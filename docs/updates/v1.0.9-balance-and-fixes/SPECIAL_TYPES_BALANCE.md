# Special Types Balance Improvements

## Summary

After fixing the independent roll bug (see [PROJECTILE_SPECIAL_TYPES_FIX.md](PROJECTILE_SPECIAL_TYPES_FIX.md)), playtest feedback revealed that explosive shot and ricochet were still triggering too infrequently. This document covers the balance improvements made to special type trigger rates.

---

## Problem

**User Feedback:**
> "on playtesting seems like ricochet shot and explosive etc hardly ever trigger"

**Root Causes:**
1. Explosive Shot base upgrade was **missing** the `explosiveChance` property entirely
   - Code defaulted to 0.30 (30%) from PlayerCombat.js line 377
2. Ricochet was set to 0.45 (45%) but felt too conservative
3. Follow-up upgrades had no chance bonuses - only improved radius/damage/bounces
4. PlayerAbilities didn't handle `chanceBonus` for explosive upgrades

**Result:** Even with independent rolls working correctly, players rarely saw explosions or ricochets.

---

## The Fix

### 1. Explosive Shot Progression

**Before:**
```javascript
explosive_shots_1:
  explosiveChance: MISSING (defaulted to 0.30)

explosive_shots_2 (Bigger Explosions):
  multiplier: 1.4 (radius only)
  chanceBonus: MISSING

explosive_shots_3 (Devastating Blasts):
  value: 0.75 (damage only)
  chanceBonus: MISSING

Result: 30% chance, no upgrades
```

**After:**
```javascript
explosive_shots_1:
  explosiveChance: 0.50        // 50% base (was 30%)

explosive_shots_2 (Bigger Explosions):
  multiplier: 1.4
  chanceBonus: 0.15            // +15% → 65% total

explosive_shots_3 (Devastating Blasts):
  value: 0.75
  chanceBonus: 0.15            // +15% → 80% total

Result: 50% → 65% → 80% progression ✅
```

**Files Changed:**
- [src/config/upgrades.config.js:250](src/config/upgrades.config.js#L250) - Added explosiveChance
- [src/config/upgrades.config.js:265](src/config/upgrades.config.js#L265) - Added chanceBonus to explosive_shots_2
- [src/config/upgrades.config.js:278](src/config/upgrades.config.js#L278) - Added chanceBonus to explosive_shots_3

---

### 2. Ricochet Shot Progression

**Before:**
```javascript
ricochet_1:
  ricochetChance: 0.45         // 45% base

ricochet_2 (Multi-Bounce):
  chanceBonus: 0.15            // Already had this ✅

ricochet_damage (Momentum Transfer):
  value: 0.95 (damage retention only)
  chanceBonus: MISSING

Result: 45% → 60% (only 2 upgrades buffed chance)
```

**After:**
```javascript
ricochet_1:
  ricochetChance: 0.60         // 60% base (was 45%)

ricochet_2 (Multi-Bounce):
  chanceBonus: 0.15            // +15% → 75% total

ricochet_damage (Momentum Transfer):
  value: 0.95
  chanceBonus: 0.10            // +10% → 85% total

Result: 60% → 75% → 85% progression ✅
```

**Files Changed:**
- [src/config/upgrades.config.js:204](src/config/upgrades.config.js#L204) - Increased base to 60%
- [src/config/upgrades.config.js:217](src/config/upgrades.config.js#L217) - Updated description
- [src/config/upgrades.config.js:234](src/config/upgrades.config.js#L234) - Added chanceBonus to ricochet_damage

---

### 3. PlayerAbilities chanceBonus Handling

**Problem:** PlayerAbilities.applyAbilityUpgrade() didn't support `chanceBonus` for explosive upgrades.

**Fix:** Added chanceBonus handling to match ricochet implementation.

**Files Changed:**
- [src/entities/player/PlayerAbilities.js:548-560](src/entities/player/PlayerAbilities.js#L548-L560) - explosionSize and explosionDamage cases
- [src/entities/player/PlayerAbilities.js:576-583](src/entities/player/PlayerAbilities.js#L576-L583) - ricochetDamage case

**Implementation:**
```javascript
case 'explosionSize':
    this.explosionRadius *= upgrade.multiplier || 1;
    if (upgrade.chanceBonus) {
        this.explosiveChance = Math.min(0.95, (this.explosiveChance || 0.3) + upgrade.chanceBonus);
    }
    break;

case 'explosionDamage':
    this.explosionDamage = upgrade.value || this.explosionDamage;
    if (upgrade.chanceBonus) {
        this.explosiveChance = Math.min(0.95, (this.explosiveChance || 0.3) + upgrade.chanceBonus);
    }
    break;

case 'ricochetDamage':
    if (upgrade.value) {
        this.ricochetDamage = Math.max(this.ricochetDamage, upgrade.value);
    }
    if (upgrade.chanceBonus) {
        this.ricochetChance = Math.min(0.95, (this.ricochetChance || 0.45) + upgrade.chanceBonus);
    }
    break;
```

**Key Features:**
- Caps at 95% to prevent 100% guaranteed procs (would be boring)
- Uses fallback defaults if base upgrade not taken (shouldn't happen, but safe)
- Additive bonuses stack properly
- Matches ricochetBounces implementation pattern

---

## Upgrade Progression Comparison

### Explosive Shot Build Path

| Upgrade | Chance | Radius | Damage | Notes |
|---------|--------|--------|--------|-------|
| **None** | 0% | - | - | No explosions |
| **Explosive Rounds** | 50% | 60px | 50% | Base unlock |
| **+ Bigger Explosions** | 65% | 84px | 50% | +40% radius, +15% chance |
| **+ Devastating Blasts** | 80% | 84px | 75% | +25% damage, +15% chance |

**Full Build Result:**
- 80% explosion chance (4 out of 5 projectiles)
- 84px blast radius (1.4x base)
- 75% of hit damage as AoE
- Extremely satisfying with multi-shot (Nova Shotgun!)

---

### Ricochet Shot Build Path

| Upgrade | Chance | Bounces | Range | Damage Retention |
|---------|--------|---------|-------|-----------------|
| **None** | 0% | - | - | - |
| **Ricochet Shot** | 60% | 2 | 260px | 90% |
| **+ Multi-Bounce** | 75% | 3 | 320px | 90% |
| **+ Momentum Transfer** | 85% | 3 | 320px | 95% |

**Full Build Result:**
- 85% ricochet chance (17 out of 20 projectiles)
- 3 bounces per projectile (can hit 4 enemies total)
- 320px bounce range
- 95% damage retention per bounce
- Combos with piercing shot for screen-wide coverage!

---

## Chain Lightning (Unchanged)

Chain lightning was **not** buffed because:
1. User didn't report issues with it
2. Already has good base chance: 55% → 70% progression
3. Arc Burst weapon **forces** chain on all projectiles (doesn't rely on random proc)
4. Used more by Arc Vanguard class as core mechanic

**Current Values:**
```javascript
chain_lightning_1: 55% base chance
chain_lightning_2: 70% chance, 4 max chains
chain_damage: 110% damage multiplier
```

If needed later, could add chanceBonus to chain_damage upgrade.

---

## Class Synergy Analysis

### Arc Vanguard (Arc Burst)
**Weapon:** Forces 'chain' on all projectiles, 2 base projectiles

**With Explosive Build:**
- All bullets chain (forced) ✅
- 80% of bullets also explode ✅
- 2-5 projectiles (with multi-shot)
- **Result:** Chain-explosion combo, ~4 explosions per volley

**With Ricochet Build:**
- All bullets chain (forced) ✅
- 85% also ricochet ✅
- Chain → ricochet → chain creates massive coverage
- **Result:** Screen-wide lightning storm

---

### Aegis Vanguard (Pulse Cannon)
**Weapon:** 1 base projectile, balanced stats

**With Explosive Build:**
- 1-4 projectiles (with multi-shot)
- 80% explosion rate = 3-4 explosions per shot
- **Result:** Reliable AoE artillery

**With Ricochet Build:**
- 1-4 projectiles
- 85% ricochet × 3 bounces = 10-12 enemy hits per shot
- **Result:** Single-target deletion or crowd control

---

### Cataclysm Striker (Nova Shotgun)
**Weapon:** 5-7 pellets, wide spread

**With Explosive Build:** ⭐ **BEST SYNERGY**
- 7 pellets × 80% = ~5-6 explosions per shot
- Overlapping blast radii for massive AoE
- **Result:** Room-clearing devastation

**With Ricochet Build:**
- 7 pellets × 85% = ~6 ricochets
- Each ricochet bounces 3 times
- **Result:** 30+ enemy hits per shot (7 direct + 18 bounces)

---

## Math: Expected Projectiles with Special Types

### Explosive Shot (80% chance)

| Projectile Count | Expected Explosions | Visual Feel |
|------------------|---------------------|-------------|
| 1 (Pulse) | 0.8 | Reliable |
| 2 (Arc) | 1.6 | Consistent |
| 3 (Split Shot) | 2.4 | Very consistent |
| 5 (Split II) | 4.0 | Almost always |
| 7 (Shotgun) | 5.6 | Overwhelming |

**Distribution (7 pellets):**
- 7 explosions: 21% (lucky!)
- 6 explosions: 37% (most common)
- 5 explosions: 28%
- 4 explosions: 11%
- 0-3 explosions: 3% (rare)

**Average:** 5.6 explosions per shot ✅

---

### Ricochet Shot (85% chance)

| Projectile Count | Expected Ricochets | Total Enemy Hits |
|------------------|-------------------|------------------|
| 1 (Pulse) | 0.85 | 1 + 2.55 = 3.55 |
| 2 (Arc) | 1.7 | 2 + 5.1 = 7.1 |
| 3 (Split Shot) | 2.55 | 3 + 7.65 = 10.65 |
| 5 (Split II) | 4.25 | 5 + 12.75 = 17.75 |
| 7 (Shotgun) | 5.95 | 7 + 17.85 = 24.85 |

**With 3 bounces:** Each ricochet hits 3 additional enemies (4 total)

**Average:** Shotgun hits ~25 enemies per shot ✅

---

## Comparison with Old Values

### Explosive Shot

| Version | Base | Upgraded | Feel |
|---------|------|----------|------|
| **Old (Buggy)** | 30% volley | 30% volley | All or nothing ❌ |
| **Fixed (Conservative)** | 30% each | 30% each | Too rare ❌ |
| **Buffed (Current)** | 50% each | 80% each | Reliable ✅ |

**Example with 7 pellets:**
- Old: 7 explosions (30%) or 0 (70%)
- Fixed: ~2 explosions per shot (felt weak)
- Buffed: ~5-6 explosions per shot (satisfying!)

---

### Ricochet Shot

| Version | Base | Upgraded | Feel |
|---------|------|----------|------|
| **Old (Buggy)** | 45% volley | 60% volley | All or nothing ❌ |
| **Fixed (Conservative)** | 45% each | 60% each | Too rare ❌ |
| **Buffed (Current)** | 60% each | 85% each | Reliable ✅ |

**Example with 3 projectiles:**
- Old: 3 ricochets (45%) or 0 (55%)
- Fixed: ~1.35 ricochets per shot (underwhelming)
- Buffed: ~2.55 ricochets per shot (impactful!)

---

## Playtesting Checklist

### Explosive Shot
- [ ] Base upgrade (50%) feels noticeable
- [ ] Full build (80%) feels powerful but not guaranteed
- [ ] Shotgun + explosives = room clear
- [ ] Arc + explosives = chain-explosion combo
- [ ] Visual feedback is satisfying

### Ricochet Shot
- [ ] Base upgrade (60%) feels consistent
- [ ] Full build (85%) creates screen coverage
- [ ] Bounces feel natural and visible
- [ ] Shotgun + ricochet = 20+ hits per shot
- [ ] Works well with piercing shot

### Balance
- [ ] Explosive doesn't trivialize bosses (resistance applies)
- [ ] Ricochet doesn't cause performance issues (many bounces)
- [ ] Players choose between builds (not always explosive)
- [ ] Special types work with all classes

---

## Performance Considerations

**Explosive Shot (80% with 7 pellets):**
- ~6 explosions per shot
- 60fps = 360 explosions/second (worst case)
- Each explosion checks ~10-20 enemies for AoE damage
- **Load:** 3,600-7,200 collision checks/second
- **Verdict:** Acceptable (collision checks are O(1) with spatial grid)

**Ricochet Shot (85% with 7 pellets):**
- ~6 ricochets per shot, 3 bounces each
- 60fps = ~1,080 ricochet searches/second
- Each search checks enemies within 320px radius
- **Load:** Spatial grid makes this O(log n) per search
- **Verdict:** Acceptable (ricochet already implemented and tested)

---

## Edge Cases

### Multiple Special Types on One Projectile
**Possible:** Explosive + Ricochet + Chain

**Behavior:**
1. Projectile hits enemy
2. Rolls 80% explosive → explodes ✅
3. Rolls 85% ricochet → bounces ✅
4. Rolls 70% chain (if Arc weapon) → chains ✅
5. Bounced projectile can explode again!

**Result:** Working as intended - creates powerful synergies ✅

---

### Cap at 95%
**Why not 100%?**
- 100% guaranteed procs remove decision-making
- Slight RNG keeps gameplay fresh
- 95% feels consistent without being boring
- Leaves room for "guaranteed explosion" epic upgrades later

**Example:**
- 95% with 7 pellets = 6.65 average explosions
- Still get 7/7 explosions 69.8% of the time
- Feels effectively guaranteed ✅

---

## Future Tuning Knobs

If explosive/ricochet still feel off after playtesting:

### Too Weak
```javascript
// Buff base values
explosive_shots_1.explosiveChance: 0.60  // 60% base
ricochet_1.ricochetChance: 0.70          // 70% base

// Increase bonuses
explosive_shots_2.chanceBonus: 0.20      // 60% → 80%
ricochet_2.chanceBonus: 0.20             // 70% → 90%
```

### Too Strong
```javascript
// Nerf damage/radius instead of chance
explosive_shots_1.explosionDamage: 0.40  // 40% of hit damage
ricochet_1.bounceDamage: 0.75            // 75% damage retention

// Keep chances high but reduce impact
```

### Balance Philosophy
- Keep **trigger rates high** (feels good, reliable)
- Tune **damage/radius** for balance (preserves feel)
- Special types should feel **core to build**, not occasional bonus

---

## Files Changed Summary

### Config Files
1. **[src/config/upgrades.config.js](src/config/upgrades.config.js)**
   - Lines 204, 217, 234: Ricochet buffs
   - Lines 250, 265, 278: Explosive buffs

### Code Files
2. **[src/entities/player/PlayerAbilities.js](src/entities/player/PlayerAbilities.js)**
   - Lines 548-560: Explosive chanceBonus handling
   - Lines 576-583: Ricochet chanceBonus handling

### Documentation
3. **[SPECIAL_TYPES_BALANCE.md](SPECIAL_TYPES_BALANCE.md)** - This document
4. **[PROJECTILE_SPECIAL_TYPES_FIX.md](PROJECTILE_SPECIAL_TYPES_FIX.md)** - Prior fix (independent rolls)

---

## Related Systems

### Upgrade Dependencies
```
explosive_shots_1 (base)
├── explosive_shots_2 (radius + chance)
└── explosive_shots_3 (damage + chance)

ricochet_1 (base)
├── ricochet_2 (bounces + range + chance)
└── ricochet_damage (damage + chance)
```

### Interaction with Other Upgrades
- **Multi-shot:** More projectiles = more procs (exponential value!)
- **Piercing Shot:** Projectile pierces THEN checks for explosion/ricochet
- **Attack Speed:** More volleys = more procs per second
- **Attack Damage:** Higher base damage = higher explosion/ricochet damage

**Synergy Example:**
```
Base: 1 projectile, 100 damage, 1 shot/sec
+ Multi-shot II: 3 projectiles
+ Explosive III: 80% chance, 75% damage
+ Attack Damage: 150 damage
+ Attack Speed: 1.5 shots/sec

Result:
3 proj × 1.5 shots/sec = 4.5 proj/sec
4.5 × 0.80 = 3.6 explosions/sec
3.6 × 150 × 0.75 = 405 AoE DPS
+ (4.5 × 150 = 675 direct DPS)
= 1,080 total DPS ✅
```

---

## Summary

**Problems Fixed:**
1. ✅ Explosive shot missing base chance property
2. ✅ Ricochet base chance too conservative
3. ✅ No chance progression on follow-up upgrades
4. ✅ PlayerAbilities didn't handle chanceBonus for explosives

**New Values:**
- Explosive: 50% → 65% → 80%
- Ricochet: 60% → 75% → 85%
- Chain: 55% → 70% (unchanged, already good)

**Impact:**
- Special types feel reliable and impactful
- Build paths have meaningful progression
- Synergies with multi-shot create powerful combos
- Each class has unique optimal builds

---

**Status:** ✅ **COMPLETE AND READY FOR PLAYTESTING**

**Date:** 2025-01-04
**Version:** v1.0.8 (Special Types Balance)

Special types now feel powerful, reliable, and fun across all classes and build paths!

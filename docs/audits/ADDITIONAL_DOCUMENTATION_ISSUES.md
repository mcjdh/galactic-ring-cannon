# Additional Documentation Issues Found
**Date**: October 25, 2025
**Type**: Deep code audit for undocumented features and dead code

## Executive Summary

Beyond the boss mechanics issues, found several additional discrepancies:
- Dead code for unimplemented enemy types
- Achievements referencing features that don't exist
- Wave system that isn't documented
- Limited meta upgrades vs expectations

---

## Issue 1: Phantom Enemy Types (Dead Code)

### Problem

`EnemySpawner.js` references two enemy types that **don't exist**:

```javascript
// EnemySpawner.js:48-49
enemyTypeUnlockTimes = {
    // ... other types ...
    'summoner': 4.5,  // 4.5 minutes
    'berserker': 5    // 5 minutes
}
```

### Evidence

**Files that exist**:
```
BasicEnemy.js
FastEnemy.js
TankEnemy.js
RangedEnemy.js
DasherEnemy.js
ExploderEnemy.js
TeleporterEnemy.js
PhantomEnemy.js
ShielderEnemy.js
BossEnemy.js
```

**Files that DON'T exist**:
- ❌ SummonerEnemy.js
- ❌ BerserkerEnemy.js

### Impact

- Code tries to unlock these types at 4.5 and 5 minutes
- Falls back to 'basic' type when spawning (silent failure)
- Player never sees these types
- Confusing for developers reading the code

### Recommendation

**Option A**: Remove dead code from EnemySpawner.js
```javascript
// Remove lines 48-49 and 229-230, 464-468
```

**Option B**: Add note in comments
```javascript
// PLANNED: Summoner and Berserker types not yet implemented
// 'summoner': 4.5,  // TODO: Implement SummonerEnemy.js
// 'berserker': 5    // TODO: Implement BerserkerEnemy.js
```

**Option C**: Document as "planned features" in FUTURE_ENHANCEMENTS.md

---

## Issue 2: "Mega Boss" Achievement Confusion

### Problem

Achievement config references a "Mega Boss" that doesn't exist as documented:

```javascript
// achievements.config.js:51-59
'mega_boss_slayer': {
    name: 'Mega Boss Slayer',
    description: 'Defeat the Mega Boss',
    icon: '🌟',
    target: 1,
    important: true
}
```

### Reality

- There is NO special "Mega Boss" type
- All bosses are the same type with scaling difficulty
- Achievement can never trigger (or triggers on first boss, unclear)

### Current Documentation

GAME_GUIDE.md (before our fixes) said:
> "Mega Boss: Appears as the third boss encounter"

But actual code has NO logic for a "third boss special encounter".

### Recommendation

**Update Achievement**:
```javascript
'boss_slayer_hard': {
    name: 'Boss Marathon',
    description: 'Defeat 10 bosses in a single run',
    icon: '🌟',
    target: 10,
    important: true
}
```

OR keep it but clarify it's just "any boss":
```javascript
'first_boss_slayer': {
    name: 'First Boss Down',
    description: 'Defeat your first boss',
    icon: '🌟',
    target: 1,
    important: true
}
```

---

## Issue 3: Wave System (Undocumented)

### Discovery

Found an entire **wave system** that runs parallel to bosses:

```javascript
// EnemySpawner.js:67-71
// Wave system
this.wavesEnabled = true;
this.waveTimer = 0;
this.waveInterval = 30;  // Wave every 30 seconds
this.waveCount = 0;
```

**Wave spawning**:
- Every 30 seconds, triggers `spawnWave()`
- Spawns multiple enemies at once
- Wave size increases over time
- Completely separate from boss system

### Evidence

Achievement references waves:
```javascript
// achievements.config.js:152-159
'wave_master': {
    name: 'Wave Master',
    description: 'Survive 10 waves',
    icon: '🌊',
    target: 10
}
```

### Documentation Status

**Current docs**: ❌ Don't mention wave system at all
**Player experience**: Waves happen every 30s (more intense spawns)

### Recommendation

Add to **GAME_GUIDE.md**:

```markdown
## 🌊 WAVE SYSTEM

### Regular Waves
- Every 30 seconds, a wave of enemies spawns
- Wave size scales with time and difficulty
- Separate from boss encounters
- Creates periodic intensity spikes
```

Add to **GAME_DESIGN.md**:

```markdown
### Difficulty Pacing
- **Continuous Spawning**: Enemies spawn gradually (1-2 per second)
- **Wave Events**: Every 30 seconds, larger group spawns simultaneously
- **Boss Encounters**: Every ~60 seconds, single powerful boss
- **Combined Challenge**: Waves and bosses can overlap for intense moments
```

---

## Issue 4: Limited Meta Upgrades

### Current Implementation

Only **5 meta upgrades** in config:

```javascript
// metaUpgrades.config.js
1. Enhanced Firepower (+25% starting damage)
2. Reinforced Hull (+20% starting health)
3. Ion Thrusters (+15% starting speed)
4. Stellar Fortune (star drop rate)
5. Lightning Mastery (chain +1)
```

### Documentation Implies More

GAME_DESIGN.md mentions:
> "Planetary theme: Mercury (speed), Venus (defense), Mars (offense), etc."

This implies multiple planet-themed upgrades, but only 5 exist.

### Recommendation

**Option A**: Expand docs to list actual 5 upgrades
**Option B**: Note in planning/FUTURE_ENHANCEMENTS.md that more meta upgrades are planned
**Option C**: Clarify current count in GAME_GUIDE.md

```markdown
### Star Vendor (Meta Progression)
- **5 permanent upgrades** available
- Purchased with star tokens earned from boss defeats
- Persist between runs
- Stackable (multiple levels per upgrade)
```

---

## Issue 5: Enemy Type Count Mismatch

### Current Documentation

GAME_GUIDE.md lists:
- Basic, Fast, Tank, Ranged, Dasher, Exploder, Teleporter
- **Count: 7 types**

### Actual Implementation

**9 distinct types exist** (not counting Boss):
1. BasicEnemy
2. FastEnemy
3. TankEnemy
4. RangedEnemy
5. DasherEnemy
6. ExploderEnemy
7. TeleporterEnemy
8. **PhantomEnemy** ← Missing from docs!
9. **ShielderEnemy** ← Missing from docs!

### Recommendation

Add to GAME_GUIDE.md enemy list:

```markdown
## 👾 ENEMY TYPES
- 👾 **Basic**: Standard enemy with balanced stats
- ⚡ **Fast**: Quicker but weaker enemies
- 🛡️ **Tank**: Slow but high health and damage
- 🏹 **Ranged**: Attacks from distance
- 💨 **Dasher**: Periodically charges at high speed
- 💣 **Exploder**: Explodes on death, dealing area damage
- ✨ **Teleporter**: Can warp around the battlefield
- 👻 **Phantom**: Phases through obstacles, unpredictable movement  ← ADD
- 🔰 **Shielder**: Protected by regenerating shield  ← ADD
```

---

## Issue 6: Upgrade Count

### Current Docs

Don't specify exact number of upgrades available.

### Actual Implementation

Counted **324 lines** in upgrades.config.js with multiple upgrades defined.

### Recommendation

Add to GAME_GUIDE.md:

```markdown
## ⚡ UPGRADES

- **20+ unique upgrades** available
- Choose from 3 random options each level-up
- Stackable effects (can choose same upgrade multiple times)
- Multiple build paths: Core stats, Chain Lightning, Orbital, Ricochet, Explosive
```

---

## Issue 7: Elite Enemy Spawn Rate

### Code Says

```javascript
// EnemySpawner.js:24
this.baseEliteChance = 0.06; // 6%
```

### Docs Say

```markdown
# GAME_DESIGN.md:39
- 10% spawn chance for any enemy type
```

### Reality

**6% base chance**, not 10%.

### Recommendation

Update GAME_DESIGN.md:

```javascript
### Elite Variants
- 6% spawn chance for any enemy type (increases over time)
- 2.5x health, 1.5x damage multiplier
- Special visual effects and enhanced XP rewards
```

---

## Summary of Issues Found

| Issue | Type | Severity | Fix Effort |
|-------|------|----------|-----------|
| Phantom enemy types (summoner/berserker) | Dead Code | Low | Easy (remove or comment) |
| "Mega Boss" achievement | Incorrect Reference | Medium | Easy (rename/redefine) |
| Undocumented wave system | Missing Documentation | Medium | Medium (add docs) |
| Limited meta upgrades | Expectation Mismatch | Low | Easy (clarify count) |
| Missing enemy types in docs | Incomplete | Low | Easy (add 2 types) |
| Upgrade count not specified | Vague | Low | Easy (add count) |
| Elite spawn rate mismatch | Incorrect Value | Low | Easy (fix 10%→6%) |

---

## Recommended Actions

### High Priority (Accuracy)

1. ✅ **Remove phantom enemy types** or mark as TODO
2. ✅ **Fix "Mega Boss" achievement** - either rename or redefine
3. ✅ **Document wave system** - it's a core mechanic!
4. ✅ **Add Phantom and Shielder enemies** to docs
5. ✅ **Fix elite spawn rate** (10% → 6%)

### Medium Priority (Clarity)

6. ✅ **Specify meta upgrade count** (5 total)
7. ✅ **Specify upgrade count** (20+ types)

### Low Priority (Nice to Have)

8. Document upgrade rarity system
9. Document build path synergies
10. Add enemy unlock timeline chart

---

## Proposed Quick Fixes

### Fix 1: Update GAME_GUIDE.md

Add Phantom and Shielder:
```markdown
- 👻 **Phantom**: Phases through obstacles, unpredictable movement
- 🔰 **Shielder**: Protected by regenerating shield
```

Add wave system:
```markdown
## 🌊 WAVE SYSTEM
- Enemy waves spawn every 30 seconds
- Larger groups of enemies spawn simultaneously
- Wave size increases with difficulty
- Can overlap with boss encounters for intense moments
```

### Fix 2: Update GAME_DESIGN.md

Fix elite rate:
```markdown
- 6% base spawn chance (increases over time)
```

Add wave pacing:
```markdown
### Difficulty Pacing
- Continuous spawning + Wave events every 30s + Boss encounters every 60s
```

### Fix 3: Update achievements.config.js

Rename achievement:
```javascript
'first_boss_defeat': {
    name: 'First Boss Down',
    description: 'Defeat your first boss',
    icon: '🌟',
    target: 1,
    important: true
}
```

### Fix 4: Clean up EnemySpawner.js

Add comment:
```javascript
// PLANNED FEATURES (not yet implemented):
// 'summoner': 4.5,  // TODO: Create SummonerEnemy.js
// 'berserker': 5    // TODO: Create BerserkerEnemy.js
```

---

## Code Evidence Files

- `src/systems/EnemySpawner.js` - Line 48-49 (phantom types), 67-71 (wave system), 24 (elite rate)
- `src/config/achievements.config.js` - Line 51-59 (mega boss achievement)
- `src/config/metaUpgrades.config.js` - All 5 meta upgrades
- `src/entities/enemy/types/` - Directory listing (9 enemy types)

---

*This audit complements the main mechanics audit and identifies additional discrepancies between code and documentation.*

# Achievement Balance Pass - Character Unlocks

**Date:** 2025-11-19  
**Type:** Balance Adjustment  
**Reason:** Playtesting feedback - unlock requirements too difficult

---

## Overview

After playtesting, three character unlock achievements were found to be excessively difficult, preventing players from accessing cool characters in a reasonable timeframe. This balance pass reduces the requirements while keeping them challenging enough to feel rewarding.

## Changes

### 1. **Inferno Juggernaut** - `grim_harvest`
**Unlocks:** Inferno Juggernaut (Pyromancer Tank)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Requirement** | Lifesteal 500 HP | Deal 1500 burn/fire damage | **Changed Type & Tuned Value** |
| **Description** | Didn't fit fire theme | Thematically perfect! | **Much Better** |

**Rationale:**
- Lifesteal made **zero thematic sense** for a fire-based juggernaut character
- 1500 burn damage requires **pyromancy upgrades** (Pyromancy I/II/III, Inferno Catalyst)
- Encourages players to **master fire mechanics** before unlocking the fire specialist
- More engaging - you learn the playstyle while unlocking the character
- Pyromancy is Inferno Juggernaut's signature ability (100% burn chance!)

**Expected Unlock Time:** ~3 focused runs (or 1 long burn-heavy run) vs 2-3 runs grinding lifesteal

**How to Unlock:**
- Pick burn/pyromancy upgrades (Pyromancy I, II, III)
- Use burn-applying weapons (Magma Launcher if Inferno Juggernaut is already unlocked)
- Burn DoT ticks every 0.5s, each tick counts toward achievementOptimal strategy: Stack burn damage + burn duration upgrades

---

### 2. **Crimson Reaver** - `crimson_pact`
**Unlocks:** Crimson Reaver (Vampiric Striker)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Requirement** | Lifesteal 3,000 HP | Lifesteal 1,200 HP | **-60%** |
| **Description** | Nearly impossible | Challenging but fair | **Balanced** |

**Rationale:**
- 3,000 HP was **BRUTAL** - required max lifesteal build + 15+ minute run
- Players often died before reaching the goal
- 1,200 HP is still **significant** but achievable with good lifesteal build
- Encourages lifesteal playstyle without being punishing

**Expected Unlock Time:** 3-5 successful runs vs 10-15 runs before

---

### 3. **Cybernetic Berserker** - `edge_walker`
**Unlocks:** Cybernetic Berserker (Critical Overclock)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Requirement** | Survive 3 minutes <30% HP | Survive 60 seconds <30% HP | **-67%** |
| **Description** | Risk of death too high | High-risk but doable | **Balanced** |

**Rationale:**
- 3 minutes at <30% HP was **INSANE** - one mistake = run over
- Required perfect dodge timing for extended period
- 60 seconds (1 minute) is still **very risky** but feels exciting not frustrating
- Matches the berserker's "edge of death" fantasy without being impossible

**Expected Unlock Time:** 2-4 runs with intentional low-HP play vs 8-12 runs before

---

## Design Philosophy

### What Makes a Good Unlock Requirement?

✅ **Good:**
- Encourages trying new playstyles
- Achievable within 2-5 focused attempts
- Feels rewarding when accomplished
- Teaches players about game mechanics

❌ **Bad:**
- Requires excessive grinding
- Forces players into unfun strategies
- Takes 10+ runs of pure luck
- Frustrating rather than challenging

### New Targets

The rebalanced achievements follow this formula:

```
Unlock Difficulty = (Skill Required × Time Investment) ÷ Fun Factor
```

**Target: 3-5 runs for average player**

- Skilled players: 1-2 runs
- Average players: 3-5 runs
- New players: 5-8 runs

---

## Impact on Game Progression

### Before (Too Restrictive)
- Players stuck with starter characters for hours
- Cool builds gated behind unreasonable requirements
- Frustration led to abandoning unlock attempts

### After (Just Right)
- Characters feel like **rewards** not **punishments**
- Players naturally unlock during normal gameplay
- Encourages **replay value** without grinding

---

## Testing Recommendations

To verify the new balance:

1. **Grim Harvest (1500 burn damage)**
   - Test: Acquire Pyromancy and maintain multi-target burns for ~15 seconds
   - Expected: Unlock in 3-4 focused runs or a single long Pyromancy run

2. **Crimson Pact (1200 HP)**
   - Test: Build lifesteal-focused build (10-15% total)
   - Expected: Unlock in 3-5 runs with intentional lifesteal focus

3. **Edge Walker (60s)**
   - Test: Intentionally stay below 30% HP during mid-game
   - Expected: Unlock in 2-4 runs with risky but manageable play

---

## Future Considerations

If these are still too hard/easy, adjust by **±20-30%**:

- **Too Easy** → Increase by 20-30% (e.g., 1500 → 1800 burn)
- **Too Hard** → Decrease by 20-30% (e.g., 1500 → 1100 burn)

Use **player unlock rates** as metric:
- **Target:** 40-60% of players unlock within 5 runs
- **Too Easy:** >80% unlock within 2 runs
- **Too Hard:** <20% unlock within 10 runs

---

## Related Files

- `/src/config/achievements.config.js` - Achievement definitions
- `/src/config/characters.config.js` - Character unlock requirements
- `/src/systems/AchievementSystem.js` - Achievement tracking logic

---

## Notes

These changes make the game more accessible while preserving the **reward feeling** of unlocking new characters. Players should feel "I earned this!" not "Finally, that's over."

The Inferno Juggernaut and Crimson Reaver especially benefit from this change as they're **lifesteal-focused** characters that were ironically locked behind excessive lifesteal requirements.

# 🎯 Projectile System Analysis

**Date:** September 29, 2025
**Agent:** Claude 4.5 Sonnet
**Status:** 🔍 Investigation Complete - Issues Identified

## Current Issues

### 1. **Conflicting Design Philosophy**
The code has contradictory comments and implementation:

**Line 354 of PlayerCombat.js:**
```javascript
// Note: Projectiles only support one special type at a time
```

**Lines 290-301 of PlayerCombat.js:**
```javascript
// Apply ALL special types as properties (not just primary)
if (volleySpecialTypes.includes('chain')) {
    projectile.hasChainLightning = true;
}
if (volleySpecialTypes.includes('explosive')) {
    projectile.hasExplosive = true;
}
// etc - enabling MULTIPLE types
```

### 2. **Piercing Value Override Bug**
**Line 274 of PlayerCombat.js** has a comment:
```javascript
// POTENTIAL BUG: This might be overriding the piercing value!
```

The flow is:
1. Projectile created with `piercing` param
2. `_configureProjectileFromUpgrades()` called
3. Then piercing gets normalized/overridden (lines 275-281)

This can cause upgrades to not work as expected.

### 3. **Scattered Collision Logic**
Piercing + ricochet interaction is handled in **3 places**:
- `CollisionSystem.js` lines 300-360
- `CollisionSystem.js` lines 390-450 (duplicate for reversed collision)
- `gameEngine.js` lines 750-800

Each with slightly different logic.

### 4. **Complex originalPiercing Restoration**
When a projectile ricochets after piercing is exhausted, piercing gets restored to half:
```javascript
if (piercingExhausted && entity1.originalPiercing > 0) {
    entity1.piercing = Math.max(1, Math.floor(entity1.originalPiercing / 2));
}
```

This is unintuitive gameplay-wise and hard to debug.

### 5. **Multiple Ways to Check Same Property**
```javascript
// All these check the same thing in different ways:
entity.hasRicochet
entity.ricochet
entity.specialType === 'ricochet'
entity.ricochetData
```

## Architecture Problems

### Separation of Concerns Issues
- **Projectile.js** (571 LOC) - Handles special types, update, rendering
- **PlayerCombat.js** - Configures upgrades on projectiles
- **CollisionSystem.js** - Handles piercing/ricochet/explosive interactions
- **GameEngine.js** - Duplicate collision logic

No single source of truth for how projectile upgrades work together.

## Proposed Solution

### Option A: Refactor Similar to Enemy System ✅ RECOMMENDED

Create modular projectile behavior system:

```
src/entities/projectile/
├── Projectile.js (base class ~200 LOC)
├── ProjectileBehaviors.js (upgrade application logic)
├── ProjectileRenderer.js (visual effects)
└── behaviors/
    ├── PiercingBehavior.js
    ├── RicochetBehavior.js
    ├── ExplosiveBehavior.js
    ├── ChainBehavior.js
    ├── HomingBehavior.js
    └── BehaviorComposition.js (handles interaction rules)
```

**Benefits:**
- Each behavior is self-contained
- Clear interaction rules in BehaviorComposition
- Easy to test individual behaviors
- Matches enemy/player refactor pattern
- Easy to add new projectile types

### Option B: Centralize Collision Logic

Keep current structure but move all collision behavior handling to one place.

**Benefits:**
- Less refactoring work
- Fixes duplicate logic issue

**Drawbacks:**
- Still scattered configuration
- Hard to add new behaviors

### Option C: Document Current System

Just fix the bugs and document how it works.

**Benefits:**
- Minimal code changes
- Quick fix

**Drawbacks:**
- Technical debt remains
- Future additions still complex

## Specific Bugs to Fix (Regardless of Approach)

1. ✅ **Remove duplicate collision logic** - Pick CollisionSystem or GameEngine, not both
2. ✅ **Fix piercing override** - Apply upgrades BEFORE normalizing piercing
3. ✅ **Standardize property checks** - Use only `hasRicochet`, `hasExplosive`, etc
4. ✅ **Clear behavior composition rules** - Document what combines with what
5. ✅ **Fix ricochet + piercing restore** - Make it predictable

## Recommendation

**Go with Option A** - Refactor to match enemy/player patterns. You've already established a clean modular pattern with enemies. Projectiles should follow the same approach for consistency.

The benefits outweigh the refactoring cost, and it sets up the codebase for easy expansion (new weapon types, new projectile behaviors, etc).

## Testing Checklist (For Any Fix)

- [ ] Piercing only works correctly
- [ ] Ricochet only works correctly
- [ ] Piercing + Ricochet works (should ricochet after piercing exhausted)
- [ ] Explosive only works correctly
- [ ] Explosive + Piercing works (explodes after piercing exhausted)
- [ ] Chain lightning only works correctly
- [ ] Chain + Piercing works correctly
- [ ] All 3+ upgrades together work (no crashes)
- [ ] Critical hits interact correctly with all upgrades
- [ ] Lifesteal works with all upgrade combinations

---

**Next Steps:** Decide on approach and implement fix.
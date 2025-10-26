# 🗺️ Projectile System Code Map

**Complete mapping of all projectile-related code across the codebase**

## Core Files

### 1. **src/entities/projectile.js** (571 LOC)
**Primary Responsibilities:**
- Projectile class definition
- Constructor with special type initialization
- Update loop (movement, homing, lifetime)
- Render method (trail, glow effects)
- Special ability methods:
  - `explode()` - explosive damage
  - `triggerChain()` - chain lightning
  - `ricochet()` - bounce to new target
  - `initializeSpecial()` - setup special type data

**Key Properties:**
```javascript
piercing, isCrit, specialType, hitEnemies
hasChainLightning, hasRicochet, hasExplosive, hasHoming
chainData, ricochetData, explosiveData, homingData
special // Primary special type data
```

**Lines of Interest:**
- 93-116: `initializeSpecial()` - sets up special types
- 207-265: `explode()` - explosive behavior
- 267-335: `triggerChain()` - chain lightning behavior
- 337-397: `ricochet()` - ricochet behavior
- 399-448: `render()` - visual rendering

---

### 2. **src/entities/player/PlayerCombat.js** (575 LOC)
**Primary Responsibilities:**
- Creating projectiles from player attacks
- Applying player upgrades to projectiles
- Determining which special types apply
- Setting piercing values
- Volley/multishot handling

**Key Methods:**
- `shootProjectile()` (lines 215-309) - Main shooting logic
- `_determineSpecialTypesForShot()` (lines 332-351) - RNG for special types
- `_configureProjectileFromUpgrades()` (lines 353-459) - Apply upgrade stats

**Lines of Interest:**
- 254: Projectile creation with initial piercing
- 272: Calls `_configureProjectileFromUpgrades()`
- 274-287: **BUG** - Piercing normalization/override
- 290-301: Enables multiple special type flags
- 337-348: Chance-based special type selection
- 376-456: Configuration of chain/explosive/ricochet/homing data

**Issues:**
- Piercing set 3 times (constructor, config, normalize)
- Comment says "one special type" but enables multiple
- `originalPiercing` tracking for ricochet restore

---

### 3. **src/core/systems/CollisionSystem.js** (511 LOC)
**Primary Responsibilities:**
- Spatial partitioning collision detection
- Projectile vs Enemy collision handling
- Piercing decrement logic
- Ricochet trigger on death
- Explosive trigger on death
- Chain lightning trigger on hit

**Key Methods:**
- `handleCollision()` (lines 136-470) - Main collision handler

**Lines of Interest:**
- 300-320: Piercing handling (decrement, exhaust check)
- 322-351: Ricochet attempt when projectile should die
- 335-340: **Piercing restoration** after ricochet (half of original)
- 353-358: Explosive trigger
- 375-380: Chain lightning trigger
- 390-450: **DUPLICATE** - Same logic for reversed entity order

**Issues:**
- Duplicate logic for entity1/entity2 ordering
- Complex piercing restoration logic
- Multiple property checks (`hasRicochet`, `ricochet`, `specialType`)

---

### 4. **src/core/gameEngine.js** (1580 LOC)
**Primary Responsibilities:**
- Main game loop
- Entity management
- **DUPLICATE** collision handling (lines 730-800)

**Lines of Interest:**
- 730-800: Old collision logic (should be removed, CollisionSystem handles this)
- 750-790: Piercing + ricochet logic (duplicates CollisionSystem)

**Issues:**
- Entire collision block is redundant with CollisionSystem
- Should be removed to eliminate confusion

---

## Supporting Files

### 5. **src/entities/player/PlayerAbilities.js** (610 LOC)
**Stores upgrade values:**
```javascript
hasChainLightning, chainChance, maxChains, chainRange, chainDamage
hasExplosiveShots, explosiveChance, explosionRadius, explosionDamage
hasRicochet, ricochetChance, ricochetBounces, ricochetRange
hasHomingShots, homingChance, homingTurnSpeed
```

---

### 6. **src/systems/upgrades.js** (661 LOC)
**Upgrade definitions and application:**
- Defines what each upgrade does
- Applies upgrades to player abilities
- Piercing upgrades (lines 50-70)
- Special type upgrades (lines 200-400)

---

### 7. **src/entities/PlayerUpgrades.js** (197 LOC)
**Manages active player upgrades:**
- Tracks which upgrades player has
- Applies upgrade effects
- `apply()` method delegates to PlayerAbilities

---

### 8. **debug-projectiles.js** (81 LOC)
**Debug utilities:**
- Enable/disable projectile debug logging
- Test functions for piercing/ricochet

---

## Data Flow

```
User Input → PlayerCombat.shootProjectile()
                ↓
    1. Create Projectile (with base piercing)
    2. _determineSpecialTypesForShot() (RNG)
    3. _configureProjectileFromUpgrades() (apply stats)
    4. Normalize piercing (BUG: may override)
    5. Set originalPiercing
    6. Enable special type flags
                ↓
         Game Loop Updates
                ↓
    Projectile.update() (movement, homing)
                ↓
    CollisionSystem.checkCollisions()
                ↓
    CollisionSystem.handleCollision()
        - Check piercing, decrement
        - If exhausted → try ricochet
        - If ricochet success → restore piercing/2
        - If still dying → try explosive
        - If hit → try chain lightning
                ↓
        Projectile.isDead = true
```

## Behavior Interaction Matrix

| Upgrade 1 | Upgrade 2 | Expected Behavior | Current Issues |
|-----------|-----------|-------------------|----------------|
| Piercing | None | Pierce N enemies | ✅ Works |
| Ricochet | None | Bounce to new target | ✅ Works |
| Piercing | Ricochet | Pierce N, then ricochet | ⚠️ Complex restoration logic |
| Explosive | Piercing | Pierce N, then explode | ⚠️ Explodes too early sometimes |
| Chain | Piercing | Pierce + chain each hit | ✅ Works |
| All 4 | Combined | All effects | ⚠️ Unpredictable |

## Problems Identified

### Critical Issues
1. **Duplicate collision logic** - GameEngine.js lines 730-800 vs CollisionSystem
2. **Piercing override bug** - Set 3 times, comment warns of issue
3. **Multiple property checks** - `hasX`, `X`, `specialType === 'X'`
4. **Scattered configuration** - Across 4+ files

### Design Issues
1. **Contradictory comments** - "one special type" but enables multiple
2. **Complex restoration** - Piercing restore on ricochet is unintuitive
3. **No composition rules** - How behaviors combine is implicit
4. **Hard to add types** - Need to touch multiple files

## Proposed Refactor Structure

```
src/entities/projectile/
├── Projectile.js               # Base class ~150 LOC
├── ProjectileFactory.js        # Creation + upgrade application
├── ProjectileRenderer.js       # Visual effects only
└── behaviors/
    ├── BehaviorBase.js         # Base behavior interface
    ├── PiercingBehavior.js     # Piercing logic
    ├── RicochetBehavior.js     # Ricochet logic
    ├── ExplosiveBehavior.js    # Explosive logic
    ├── ChainBehavior.js        # Chain lightning logic
    ├── HomingBehavior.js       # Homing logic
    └── BehaviorManager.js      # Composition + interaction rules
```

### Key Principles

1. **Single Responsibility** - Each behavior handles one thing
2. **Composition over Flags** - `behaviors: [Piercing, Ricochet]` not `hasPiercing, hasRicochet`
3. **Clear Interaction** - BehaviorManager defines precedence
4. **Centralized** - All logic in one place
5. **Testable** - Each behavior can be unit tested

### Interaction Rules (BehaviorManager)

```javascript
onCollision(projectile, target, engine) {
    // 1. Apply damage
    target.takeDamage(projectile.damage);

    // 2. Trigger on-hit effects (chain lightning)
    for (const behavior of projectile.behaviors) {
        if (behavior.triggersOnHit) {
            behavior.onHit(projectile, target, engine);
        }
    }

    // 3. Check if projectile should die
    let shouldDie = true;

    // Piercing prevents death
    if (projectile.hasBehavior('piercing')) {
        shouldDie = !projectile.getBehavior('piercing').decrementCharge();
    }

    // If dying, try ricochet
    if (shouldDie && projectile.hasBehavior('ricochet')) {
        shouldDie = !projectile.getBehavior('ricochet').attemptBounce(engine);
    }

    // 4. Trigger on-death effects (explosive)
    if (shouldDie) {
        for (const behavior of projectile.behaviors) {
            if (behavior.triggersOnDeath) {
                behavior.onDeath(projectile, target, engine);
            }
        }
        projectile.isDead = true;
    }
}
```

## Migration Path

### Phase 1: Create Structure
1. Create `src/entities/projectile/` folder
2. Create behavior base classes
3. Create BehaviorManager

### Phase 2: Extract Behaviors
1. Move piercing logic → PiercingBehavior
2. Move ricochet logic → RicochetBehavior
3. Move explosive logic → ExplosiveBehavior
4. Move chain logic → ChainBehavior
5. Move homing logic → HomingBehavior

### Phase 3: Refactor Core
1. Update Projectile.js to use behaviors
2. Create ProjectileFactory for creation
3. Update PlayerCombat to use factory
4. Update CollisionSystem to use BehaviorManager

### Phase 4: Clean Up
1. Remove duplicate logic from GameEngine
2. Remove old property checks
3. Remove debug-projectiles.js (or update for new system)
4. Update index.html script loading

### Phase 5: Test
1. Test each behavior individually
2. Test all combinations
3. Verify no regressions

---

**Next Step:** Begin Phase 1 - Create folder structure and base classes
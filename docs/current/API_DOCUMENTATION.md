# API Documentation
**Last Updated**: October 25, 2025
**Architecture**: Component-based, Global Namespace (`window.Game`)

## Overview

Galactic Ring Cannon uses a **component-based architecture** with a global namespace pattern. All classes are accessible via `window.Game` or their legacy global names for backward compatibility.

---

## Core Engine Classes

### GameEngine
Main game loop and rendering engine (2120 lines).

**Location**: `src/core/gameEngine.js`
**Access**: `window.Game.GameEngine` or `new GameEngine()`

**Constructor**: `new GameEngine(canvas)`

**Key Methods**:
- `start()` - Initialize and start the game loop
- `update(deltaTime)` - Update all game entities
- `render()` - Render the game frame
- `addEntity(entity)` - Add entity to game world
- `removeEntity(entity)` - Remove entity from world
- `togglePause()` - Toggle pause state
- `shutdown()` - Clean shutdown and resource cleanup

**Key Properties**:
- `entities[]` - All game entities
- `player` - Player reference
- `state` - GameState reference (single source of truth)
- `canvas` - Canvas element
- `ctx` - 2D rendering context
- `running` - Engine running state

---

### GameManagerBridge
High-level game flow and coordination layer. Bridges older code with newer GameState pattern.

**Location**: `src/core/gameManagerBridge.js`
**Access**: `window.Game.GameManagerBridge`

**Constructor**: `new GameManagerBridge()`

**Key Methods**:
- `startGame(mode)` - Initialize new game (mode: 'normal' or 'endless')
- `update(deltaTime)` - Update game systems
- `handleGameOver()` - Handle game over state
- `saveStarTokens(amount)` - Save star currency
- `onUpgradeMaxed()` - Handle maxed upgrade notification

**State Proxy Properties** (delegates to GameState):
- `gameTime` - Current game time
- `killCount` - Player kills
- `gameOver` - Game over state
- `combo` - Current combo count
- `metaStars` - Star token count

**Direct Properties**:
- `game` - GameEngine instance
- `state` - GameState instance
- `enemySpawner` - EnemySpawner instance
- `effects` - EffectsManager instance
- `uiManager` - UnifiedUIManager instance
- `minimapSystem` - MinimapSystem instance
- `lowQuality` - Performance mode flag
- `difficultyFactor` - Difficulty scaling multiplier

---

### GameState
Centralized state management - **single source of truth** for all game data.

**Location**: `src/core/GameState.js`
**Access**: `window.Game.GameState`

**Constructor**: `new GameState()`

**State Categories**:
```javascript
state.runtime      // gameTime, isPaused, fps, deltaTime
state.flow         // gameOver, gameWon, endlessMode, currentMode
state.player       // level, health, maxHealth, xp, position
state.progression  // kills, xpCollected, damageDealt, bosses defeated
state.combo        // count, timer, multiplier, maxCombo
state.entities     // entity counts by type
state.meta         // starTokens, achievements unlocked
state.performance  // quality, frameCount, metrics
```

**Key Methods**:
- `reset()` - Reset to initial state
- `updateRuntime(deltaTime, isPaused, fps)` - Update runtime values
- `setPlayerState(level, health, maxHealth, xp, x, y)` - Update player state
- `incrementKills()` - Increment kill count
- `addXP(amount)` - Add experience points
- `updateCombo(count, timer, multiplier)` - Update combo state

---

## Core System Managers

These are manager classes that coordinate specific game systems:

### EntityManager
Manages entity lifecycle and spatial partitioning.

**Location**: `src/core/systems/EntityManager.js`

**Key Methods**:
- `addEntity(entity)` - Add entity to world
- `removeEntity(entity)` - Remove entity
- `getNearbyEntities(x, y, radius, type)` - Get entities in radius
- `getEntitiesByType(type)` - Get all entities of specific type

---

### EffectsManager
Manages visual effects, screen shake, and particles.

**Location**: `src/core/systems/EffectsManager.js`

**Key Methods**:
- `addScreenShake(intensity, duration)` - Add screen shake effect
- `createExplosion(x, y, radius, color)` - Create explosion particles
- `createFloatingText(text, x, y, color, size)` - Display floating text
- `update(deltaTime)` - Update all active effects

---

### DifficultyManager
Adaptive difficulty scaling based on player performance.

**Location**: `src/core/systems/DifficultyManager.js`

**Key Methods**:
- `update(deltaTime)` - Update difficulty over time
- `getDifficultyMultiplier()` - Get current difficulty scaling
- `scaleBoss(boss)` - Scale boss stats based on player DPS
- `calculatePlayerDPS()` - Calculate player damage per second

---

### StatsManager
Tracks player statistics and progression metrics.

**Location**: `src/core/systems/StatsManager.js`

**Key Methods**:
- `recordKill(enemyType)` - Record enemy kill
- `recordDamage(amount)` - Record damage dealt
- `getStats()` - Get all tracked statistics
- `reset()` - Reset statistics for new run

---

### UnifiedUIManager
Manages HUD rendering and UI updates.

**Location**: `src/core/systems/UnifiedUIManager.js`

**Key Methods**:
- `update(deltaTime)` - Update UI elements
- `render(ctx)` - Render HUD to canvas
- `showUpgradeNotification(upgrade)` - Show upgrade notification
- `updateHealthBar(health, maxHealth)` - Update health display

---

### MinimapSystem
Minimap rendering and entity tracking.

**Location**: `src/core/systems/MinimapSystem.js`

**Key Methods**:
- `render(ctx, player, entities)` - Render minimap
- `setVisible(visible)` - Toggle minimap visibility

---

## Entity Classes

### Player
Player character with component-based architecture (345 lines coordinator).

**Location**: `src/entities/player/Player.js`
**Access**: `window.Game.Player` or `new Player(x, y)`

**Constructor**: `new Player(x, y)`

**Components**:
- `stats` - PlayerStats component (health, XP, level)
- `movement` - PlayerMovement component (position, velocity, input)
- `combat` - PlayerCombat component (attacks, weapons, projectiles)
- `abilities` - PlayerAbilities component (dodge, special abilities)
- `renderer` - PlayerRenderer component (visual rendering)

**Key Methods**:
- `update(deltaTime, game)` - Update all components
- `render(ctx)` - Render player
- `applyMetaUpgrades()` - Apply Star Vendor persistent upgrades
- `spawnParticle(...)` - Utility for particle spawning

**Properties**:
- `x, y` - Position
- `radius` - Collision radius
- `type` - Entity type ('player')
- `upgrades[]` - Applied upgrades

---

### PlayerStats
Player health, XP, and level management component.

**Location**: `src/entities/player/PlayerStats.js`

**Key Properties**:
- `health` - Current health
- `maxHealth` - Maximum health
- `level` - Current level
- `experience` - Current XP
- `experienceToNextLevel` - XP needed for next level

**Key Methods**:
- `takeDamage(amount)` - Apply damage
- `heal(amount)` - Restore health
- `addXP(amount)` - Add experience points
- `levelUp()` - Level up and trigger upgrade selection

---

### PlayerMovement
Player movement, input handling, and physics component (289 lines).

**Location**: `src/entities/player/PlayerMovement.js`

**Key Properties**:
- `speed` - Movement speed
- `vx, vy` - Velocity
- `acceleration` - Acceleration rate

**Key Methods**:
- `update(deltaTime, game)` - Process input and update position
- `handleInput(game)` - Process keyboard input
- `applyFriction()` - Apply movement friction

---

### PlayerCombat
Player attack logic and projectile firing component (547 lines).

**Location**: `src/entities/player/PlayerCombat.js`

**Key Properties**:
- `attackDamage` - Base damage
- `attackSpeed` - Attack cooldown
- `attackRange` - Auto-target range
- `projectileSpeed` - Projectile velocity
- `critChance` - Critical hit chance
- `critMultiplier` - Critical damage multiplier

**Key Methods**:
- `update(deltaTime, game)` - Update combat, auto-attack nearest enemy
- `fireProjectile(target, game)` - Fire projectile at target
- `findNearestEnemy(game)` - Auto-targeting logic

---

### PlayerAbilities
Player special abilities component (dodge, abilities) (617 lines).

**Location**: `src/entities/player/PlayerAbilities.js`

**Key Properties**:
- `dodgeCooldown` - Dodge roll cooldown
- `dodgeDistance` - Dodge distance
- `dodgeDuration` - Dodge duration
- `isDodging` - Currently dodging flag

**Key Methods**:
- `update(deltaTime, game)` - Update ability cooldowns
- `dodge(direction)` - Perform dodge roll
- `canDodge()` - Check if dodge is available

---

### Enemy
Enemy base class with component-based architecture.

**Location**: `src/entities/enemy/Enemy.js`

**Constructor**: `new Enemy(x, y, typeConfig)`

**Components** (for complex enemies):
- `ai` - EnemyAI component (state machine, targeting)
- `abilities` - EnemyAbilities component (attacks, special moves)
- `movement` - EnemyMovement component (physics, patterns)

**Key Methods**:
- `update(deltaTime, game)` - Update enemy state
- `render(ctx)` - Render enemy
- `takeDamage(amount, source)` - Apply damage
- `die(game)` - Handle death, drop XP

**Properties**:
- `health` - Current health
- `maxHealth` - Maximum health
- `damage` - Contact damage
- `speed` - Movement speed
- `type` - Enemy type string
- `xpValue` - XP dropped on death

---

### Enemy Types

All enemy types extend the base Enemy class:

- **BasicEnemy** - Balanced stats, direct movement
- **FastEnemy** - High speed, low health, swarm tactics
- **TankEnemy** - High health/damage, slow movement
- **RangedEnemy** - Shoots projectiles from distance
- **DasherEnemy** - Periodic high-speed charges
- **ExploderEnemy** - Explodes on death, area damage
- **TeleporterEnemy** - Can teleport to avoid attacks
- **PhantomEnemy** - Phases through walls, unpredictable
- **ShielderEnemy** - Has protective shield
- **BossEnemy** - Multi-phase boss with all abilities

**Location**: `src/entities/enemy/types/*.js`

---

### Projectile
Player and enemy projectiles with behavior system.

**Location**: `src/entities/projectile/Projectile.js`
**Access**: `new Projectile(config)`

**Constructor**:
```javascript
new Projectile({
  x, y, vx, vy, damage, source, team,
  piercing, explosive, chain, homing, ricochet
})
```

**Behavior System**:
Projectiles support pluggable behaviors:
- **PiercingBehavior** - Pierce through multiple enemies
- **ExplosiveBehavior** - Explode on impact
- **ChainBehavior** - Chain to nearby enemies
- **HomingBehavior** - Track and follow targets
- **RicochetBehavior** - Bounce to additional targets

**Location**: `src/entities/projectile/behaviors/*.js`

---

### XPOrb
Experience orbs dropped by enemies.

**Location**: `src/entities/XPOrb.js`

**Constructor**: `new XPOrb(x, y, value)`

**Key Properties**:
- `value` - XP amount
- `magnetRange` - Attraction range to player

---

### DamageZone
Area-of-effect damage zones.

**Location**: `src/entities/damageZone.js`

**Constructor**: `new DamageZone(x, y, radius, damage, duration, team)`

---

## System Classes

### EnemySpawner
Enemy wave spawning and difficulty progression.

**Location**: `src/systems/EnemySpawner.js`

**Key Methods**:
- `update(deltaTime, game)` - Spawn enemies over time
- `spawnEnemy(type, position)` - Spawn specific enemy type
- `spawnBoss(difficulty)` - Spawn boss enemy
- `updateDifficulty(gameTime)` - Scale difficulty over time

---

### InputManager
Keyboard and input handling.

**Location**: `src/systems/InputManager.js`

**Key Methods**:
- `isKeyPressed(key)` - Check if key is currently pressed
- `getMovementInput()` - Get WASD/arrow movement vector
- `consumeAction(action)` - Consume one-time action (dodge, pause)

---

### AudioSystem
Procedural audio generation.

**Location**: `src/systems/audio.js`
**Access**: `window.Game.AudioSystem`

**Key Methods**:
- `playSound(type, options)` - Play procedural sound
- `playHitSound()` - Play hit sound
- `playExplosionSound()` - Play explosion sound
- `playLevelUpSound()` - Play level up sound
- `toggleMute()` - Toggle sound on/off

---

### UpgradeSystem
Player progression and upgrade selection.

**Location**: `src/systems/upgrades.js`
**Access**: `window.Game.UpgradeSystem`

**Key Methods**:
- `showUpgradeOptions(player, gameManager)` - Display 3 random upgrade choices
- `applyUpgrade(player, upgrade)` - Apply selected upgrade to player
- `hideUpgradeUI()` - Hide upgrade selection UI

**Upgrade Types**: See `src/config/upgrades.config.js`

---

### AchievementSystem
Achievement tracking and unlocking.

**Location**: `src/systems/achievements.js`
**Access**: `window.Game.AchievementSystem`

**Key Methods**:
- `checkAchievements(gameStats)` - Check for newly unlocked achievements
- `unlockAchievement(id)` - Unlock specific achievement
- `getProgress(id)` - Get achievement progress percentage
- `showAchievementPopup(achievement)` - Display unlock notification

**Achievement Types**: See `src/config/achievements.config.js`

---

### PerformanceManager
Performance monitoring and quality adjustment.

**Location**: `src/systems/performance.js`
**Access**: `window.Game.PerformanceManager`

**Key Methods**:
- `update(fps)` - Monitor FPS and adjust quality
- `setQualityMode(mode)` - Set quality ('high', 'medium', 'low')
- `getMetrics()` - Get performance metrics

---

### OptimizedParticlePool
Object pool for efficient particle management.

**Location**: `src/systems/OptimizedParticlePool.js`
**Access**: `window.optimizedParticles`

**Key Methods**:
- `spawnParticle(config)` - Spawn particle from pool
- `spawnExplosion(x, y, radius, color)` - Spawn explosion effect
- `update(deltaTime)` - Update all active particles
- `render(ctx)` - Render all particles

---

## Utility Modules

### MathUtils
Mathematical utility functions.

**Location**: `src/utils/MathUtils.js`
**Access**: `window.Game.MathUtils`

**Methods**:
- `lerp(a, b, t)` - Linear interpolation
- `clamp(value, min, max)` - Clamp value to range
- `random(min, max)` - Random number in range
- `distance(x1, y1, x2, y2)` - Calculate distance
- `angle(x1, y1, x2, y2)` - Calculate angle between points
- `normalize(x, y)` - Normalize vector to unit length
- `xpForLevel(level)` - Calculate XP required for level
- `budget(available, requested)` - Budget limited resource

---

### CollisionUtils
Collision detection utilities.

**Location**: `src/utils/CollisionUtils.js`
**Access**: `window.Game.CollisionUtils`

**Methods**:
- `circleCircle(c1, c2)` - Circle-circle collision
- `circleRect(circle, rect)` - Circle-rectangle collision
- `isColliding(entity1, entity2)` - Generic entity collision
- `getCollisionNormal(entity1, entity2)` - Get collision direction

---

### ParticleHelpers
Particle creation helper functions.

**Location**: `src/utils/ParticleHelpers.js`
**Access**: `window.Game.ParticleHelpers`

**Methods**:
- `createExplosionEffect(x, y, radius, color)` - Create explosion particles
- `createHitEffect(x, y, color)` - Create hit impact particles
- `createTrailEffect(x, y, vx, vy)` - Create movement trail

---

### Logger
Logging system with debug levels.

**Location**: `src/utils/Logger.js`
**Access**: `window.Game.logger`

**Methods**:
- `log(message)` - Standard log
- `debug(message)` - Debug log (only in debug mode)
- `error(message)` - Error log
- `warn(message)` - Warning log

---

## Configuration Files

### gameConstants.js
Central configuration for all game constants.

**Location**: `src/config/gameConstants.js`
**Access**: `window.GAME_CONSTANTS`

**Categories**:
```javascript
GAME_CONSTANTS.PLAYER      // Player stats (health, speed, damage)
GAME_CONSTANTS.ENEMY       // Enemy stats by type
GAME_CONSTANTS.COLORS      // Color palette
GAME_CONSTANTS.COMBAT      // Combat parameters
GAME_CONSTANTS.PERFORMANCE // Performance thresholds
GAME_CONSTANTS.UI          // UI constants
```

---

### upgrades.config.js
Upgrade definitions and effects.

**Location**: `src/config/upgrades.config.js`
**Access**: `window.UPGRADE_CONFIGS`

Defines all available upgrades including:
- Damage increases
- Health boosts
- Movement speed
- Attack speed
- Piercing shots
- Explosive rounds
- Chain lightning
- Orbital attacks
- And more...

---

### achievements.config.js
Achievement definitions and unlock criteria.

**Location**: `src/config/achievements.config.js`
**Access**: `window.ACHIEVEMENT_CONFIGS`

Defines 15+ achievements with progress tracking.

---

### metaUpgrades.config.js
Star Vendor persistent upgrade definitions.

**Location**: `src/config/metaUpgrades.config.js`
**Access**: `window.META_UPGRADE_CONFIGS`

Defines permanent upgrades purchasable with star tokens.

---

## Global Namespace

All classes are organized under `window.Game` for clean global access:

```javascript
// Core
window.Game.GameEngine
window.Game.GameManagerBridge
window.Game.GameState

// Entities
window.Game.Player
window.Game.Enemy
window.Game.Projectile
window.Game.XPOrb
window.Game.DamageZone
window.Game.EnemyProjectile

// Systems
window.Game.InputManager
window.Game.AudioSystem
window.Game.UpgradeSystem
window.Game.AchievementSystem
window.Game.PerformanceManager
window.Game.EnemySpawner

// Core Systems
window.Game.EntityManager
window.Game.EffectsManager
window.Game.DifficultyManager
window.Game.StatsManager
window.Game.UnifiedUIManager
window.Game.MinimapSystem
window.Game.OptimizedParticlePool

// Utilities
window.Game.MathUtils
window.Game.CollisionUtils
window.Game.ParticleHelpers
window.Game.logger
window.Game.urlParams
```

---

## Legacy Global Access

For backward compatibility, some classes are also available at:
- `window.Player` → Use `window.Game.Player` instead
- `window.Enemy` → Use `window.Game.Enemy` instead
- etc.

**Recommendation**: Use `window.Game` namespace for all new code.

---

## Architecture Pattern

The codebase follows a **component-based architecture**:

### Player Component Structure
```javascript
class Player {
  constructor(x, y) {
    this.stats = new PlayerStats(this);
    this.movement = new PlayerMovement(this);
    this.combat = new PlayerCombat(this);
    this.abilities = new PlayerAbilities(this);
    this.renderer = new PlayerRenderer(this);
  }

  update(deltaTime, game) {
    this.stats.update(deltaTime);
    this.movement.update(deltaTime, game);
    this.combat.update(deltaTime, game);
    this.abilities.update(deltaTime, game);
  }
}
```

### Benefits
- **Single Responsibility**: Each component handles one domain
- **Testability**: Components can be tested independently
- **Maintainability**: Easy to modify without affecting other systems
- **Scalability**: Add new components without changing core classes

See [KEY_CODE_PATTERNS.md](KEY_CODE_PATTERNS.md) for detailed architectural patterns and best practices.

---

## State Management

The game uses **GameState** as a single source of truth. All systems read from and write to this centralized state object, preventing sync issues and making state changes observable.

See [GAMESTATE_ARCHITECTURE.md](GAMESTATE_ARCHITECTURE.md) for details.

---

## Event System

Game events flow through the GameState and are observed by various managers:

- `enemy-killed` → StatsManager, AchievementSystem
- `player-level-up` → UpgradeSystem, AudioSystem
- `boss-spawned` → DifficultyManager, AudioSystem
- `game-over` → StatsManager, AchievementSystem

---

## Performance Considerations

- **Object Pooling**: Use `OptimizedParticlePool` for all particles
- **Spatial Partitioning**: `EntityManager` uses grid-based collision
- **Frustum Culling**: Only render entities in viewport
- **Adaptive Quality**: `PerformanceManager` adjusts based on FPS

---

## Testing

Run GameState tests:
```javascript
window.Game.testGameState()  // Browser console
```

Or:
```bash
node src/core/GameState.test.js
```

---

## Further Reading

- [KEY_CODE_PATTERNS.md](KEY_CODE_PATTERNS.md) - Architectural patterns and best practices
- [GAMESTATE_ARCHITECTURE.md](GAMESTATE_ARCHITECTURE.md) - State management details
- [GAME_DESIGN.md](GAME_DESIGN.md) - Game design philosophy
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - File organization

---

*This documentation reflects the current component-based architecture as of October 2025.*

# API Documentation

## Core Classes

### GameEngine
Main game loop and rendering engine.

**Constructor**: `new GameEngine()`

**Key Methods**:
- `start()` - Initialize and start the game loop
- `update(deltaTime)` - Update all game entities
- `render()` - Render the game frame
- `addEntity(entity)` - Add entity to game world
- `togglePause()` - Toggle pause state
- `shutdown()` - Clean shutdown

**Properties**:
- `entities[]` - All game entities
- `player` - Player reference
- `isPaused` - Pause state
- `fps` - Current FPS

### GameManager
High-level game state management.

**Constructor**: `new GameManager()`

**Key Methods**:
- `startGame()` - Initialize new game
- `update(deltaTime)` - Update game systems
- `showGameOver()` - Handle game over state
- `incrementKills()` - Track player kills
- `showFloatingText(text, x, y, color, size)` - Display floating text

**Properties**:
- `game` - GameEngine instance
- `gameTime` - Current game time
- `killCount` - Player kills
- `gameOver` - Game over state

## Entity Classes

### Player
Player character entity.

**Constructor**: `new Player(x, y)`

**Key Methods**:
- `update(deltaTime, game)` - Update player state
- `takeDamage(amount)` - Apply damage to player
- `addXP(amount)` - Add experience points
- `levelUp()` - Handle level up
- `applyUpgrade(upgrade)` - Apply selected upgrade

**Properties**:
- `health` - Current health
- `maxHealth` - Maximum health
- `level` - Player level
- `experience` - Current XP

### Enemy
Enemy entity base class.

**Constructor**: `new Enemy(x, y, type)`

**Key Methods**:
- `update(deltaTime, game)` - Update enemy AI
- `takeDamage(amount)` - Apply damage
- `dropXP(game)` - Drop XP orb on death

**Properties**:
- `health` - Current health
- `damage` - Attack damage
- `speed` - Movement speed
- `type` - Enemy type

## System Classes

### AudioSystem
Procedural audio generation and management.

**Constructor**: `new AudioSystem()`

**Key Methods**:
- `playSound(frequency, duration, type)` - Play procedural sound
- `playAttackSound()` - Player attack sound
- `playExplosionSound()` - Explosion sound
- `toggleMute()` - Toggle mute state

### UpgradeSystem
Player progression and upgrades.

**Constructor**: `new UpgradeSystem()`

**Key Methods**:
- `showUpgradeOptions(player)` - Display upgrade choices
- `applyUpgrade(player, upgrade)` - Apply selected upgrade
- `generateUpgradeOptions()` - Generate random upgrades

### AchievementSystem
Achievement tracking and unlocking.

**Constructor**: `new AchievementSystem()`

**Key Methods**:
- `checkAchievements(gameStats)` - Check for unlocked achievements
- `unlockAchievement(id)` - Unlock specific achievement
- `getProgress(id)` - Get achievement progress

## Utility Functions

### CollisionUtils
- `isColliding(entity1, entity2)` - Check collision between entities
- `getDistance(x1, y1, x2, y2)` - Calculate distance
- `normalizeVector(vector)` - Normalize vector

### MathUtils
- `lerp(a, b, t)` - Linear interpolation
- `clamp(value, min, max)` - Clamp value to range
- `random(min, max)` - Random number in range

## Events

### Game Events
- `player-death` - Player died
- `enemy-killed` - Enemy was killed
- `level-up` - Player leveled up
- `boss-spawn` - Boss enemy spawned
- `game-over` - Game ended

### Input Events  
- `keydown` - Key pressed
- `keyup` - Key released
- `pause` - Game paused/unpaused

## Configuration

See `config/gameConfig.js` for all configurable values including:
- Player stats
- Enemy properties  
- Performance settings
- Audio settings
- Debug options

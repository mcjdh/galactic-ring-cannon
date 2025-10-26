# Game Design Document

## 🎯 Core Concept
**Galactic Ring: Cannon** is a 2D survival game where players fight waves of enemies while upgrading their abilities. The game combines bullet-hell mechanics with RPG progression in a space-themed setting.

## 🎮 Gameplay Loop

### Core Mechanics
1. **Movement**: WASD/Arrow keys for 8-directional movement
2. **Combat**: Automatic projectile firing at nearest enemies
3. **Survival**: Avoid enemy contact and projectiles
4. **Progression**: Collect XP orbs to level up and choose upgrades
5. **Special Abilities**: Dodge roll with cooldown

### Run Structure

#### Normal Mode (Instanced Boss Encounters)
- Continuous boss encounters at ~60 second intervals
- Each boss defeat shows a victory screen with choices:
  - **Continue Run**: Keep current upgrades and stats, next boss will spawn
  - **Start New Run**: Restart from beginning
  - **Main Menu**: Return to menu
- Bosses scale in difficulty (+20% health/damage per boss)
- Infinite progression - survive as long as you can
- Earn 10 star tokens per boss defeated
- Encourages both long survival runs and experimental restart strategies

## 👾 Enemy Design

### Basic Enemy Types
- **Basic**: Balanced stats, direct movement toward player
- **Fast**: High speed, low health - swarm tactics
- **Tank**: High health/damage, slow movement
- **Ranged**: Shoots projectiles from distance
- **Dasher**: Periodic high-speed charges
- **Exploder**: Explodes on death, area damage

### Elite Variants
- 6% base spawn chance for any enemy type (increases over time)
- 2.5x health, 1.5x damage multiplier
- Special visual effects and enhanced XP rewards

### Boss Mechanics
- **Multi-phase combat**: 4 phases based on health thresholds
- **Dynamic abilities**: Shield, teleportation, minion spawning
- **Area attacks**: Damage zones and projectile patterns
- **Scaling Difficulty**: Each boss is 20% stronger than the previous (+health, +damage)
- **Infinite Encounters**: Bosses continue spawning indefinitely with increasing difficulty

## ⚡ Upgrade System

### Core Upgrades
- **Damage Enhancement**: Increase projectile damage
- **Health & Survivability**: Max health, regeneration, damage reduction  
- **Mobility**: Movement speed, dodge improvements
- **Projectile Modifiers**: Piercing, explosive, split shots
- **Utility**: XP magnet range, attack speed, critical hits

### Special Abilities
- **Chain Lightning**: Electricity jumps between enemies
- **Orbital Attacks**: Projectiles orbit around player
- **Lifesteal**: Damage heals player
- **Ricochet**: Projectiles bounce to additional targets

### Meta Progression (Star Vendor)
- Permanent upgrades purchased with star currency
- Stars earned by defeating bosses and special achievements
- Planetary theme: Mercury (speed), Venus (defense), Mars (offense), etc.

## 🏆 Achievement System

### Categories
- **Combat**: Kill counts, boss defeats, critical hits
- **Survival**: Time survived, damage avoided, perfect dodges  
- **Progression**: Levels reached, upgrades collected
- **Special**: Hidden achievements for unique accomplishments

### Progression Tracking
- Real-time progress updates
- Visual feedback for achievement unlocks
- Achievement browser with progress bars

## 🎨 Visual Design

### Art Style
- Minimalist geometric shapes
- Vibrant neon color palette
- Particle effects for visual impact
- Clean, readable UI elements

### Visual Feedback
- Screen shake for impacts
- Floating damage numbers
- Visual upgrade indicators
- Health/XP bar animations

### Performance Optimization
- Low Quality mode for older devices
- Particle count limiting
- Spatial partitioning for collision detection
- Entity culling outside viewport

## 🔊 Audio Design

### Procedural Audio System
- Dynamically generated sound effects
- Frequency-based audio synthesis
- Contextual audio cues (hits, explosions, level-ups)
- Volume and mute controls

### Audio Categories
- **Combat**: Attack sounds, explosions, critical hits
- **UI**: Menu navigation, level up notifications
- **Ambient**: Background atmosphere (future feature)

## 📱 User Experience

### Controls
- **Primary**: WASD movement, automatic firing
- **Secondary**: Space for dodge, P/ESC for pause
- **Accessibility**: Alternative arrow key controls
- **Mobile**: Touch controls (future consideration)

### User Interface
- **HUD**: Health bar, XP bar, level indicator, timer
- **Menus**: Main menu, pause menu, settings, shop
- **Visual Indicators**: Skill cooldowns, combo counter, minimap

### Quality of Life
- **Save System**: Local storage for progress and settings
- **Performance Options**: Low quality mode, graphics settings
- **Pause Functionality**: Full pause with resume capability

## 🏗️ Technical Architecture

### Core Systems
- **Game Engine**: Canvas-based 2D renderer with performance optimization
- **Entity System**: Component-based entity management
- **Physics**: Simple collision detection with spatial partitioning
- **State Management**: Clean separation of game states

### Performance Features  
- **Object Pooling**: Reuse projectiles and particles
- **Frustum Culling**: Only render visible entities
- **Dynamic Quality**: Automatic performance adjustment
- **Resource Management**: Memory cleanup and optimization

## 🎯 Player Progression

### Short-term Goals (Per Run)
- Survive enemy waves
- Collect XP and level up
- Choose strategic upgrades
- Defeat boss encounters

### Long-term Goals (Meta Progression)
- Unlock permanent upgrades via Star Vendor
- Complete achievement collections
- Master different build strategies
- Push deeper loops for higher kill counts and score milestones

## 🔮 Future Enhancements

### Potential Features
- **Additional Weapons**: Different base weapon types
- **More Enemy Variety**: New enemy types and behaviors  
- **Environmental Hazards**: Map obstacles and dangers
- **Power-ups**: Temporary ability boosts
- **Multiplayer**: Co-op or competitive modes
- **Mobile Support**: Touch controls and responsive design

### Technical Improvements
- **Module System**: ES6 modules with build pipeline
- **TypeScript**: Type safety for larger codebase
- **Asset Pipeline**: Image and audio asset management
- **PWA Features**: Offline play capability

## 📊 Balancing Philosophy

### Difficulty Curve
- Gradual introduction of mechanics
- Meaningful upgrade choices
- Risk/reward decision making
- Multiple viable strategies

### Player Agency
- Clear upgrade information
- Predictable enemy behaviors  
- Fair challenge progression
- Multiple paths to success

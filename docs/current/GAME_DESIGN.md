# Game Design Document

## 🎯 Core Concept
**Galactic Ring: Cannon** is a 2D survival game where players choose from 4 unique character classes, each with signature weapons, and fight waves of enemies while upgrading their abilities. The game combines bullet-hell mechanics with RPG progression and roguelite elements in a space-themed setting.

## 🎮 Gameplay Loop

### Core Mechanics
1. **Character Selection**: Choose from 4 distinct character classes with unique stats and starting weapons
2. **Weapon Systems**: 3 unique weapon types with different firing patterns and strategies
3. **Movement**: WASD/Arrow keys for 8-directional movement
4. **Combat**: Automatic projectile firing with weapon-specific behaviors
5. **Survival**: Avoid enemy contact and projectiles
6. **Progression**: Collect XP orbs to level up and choose upgrades
7. **Special Abilities**: Dodge roll with cooldown, character-specific abilities

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

## 🧑‍🚀 Character System

### Character Classes (4 Total)
Players choose from 4 distinct character archetypes, each with unique playstyles:

1. **Aegis Vanguard** - Shield Sentinel (Balanced)
   - Highest survivability with shield technology
   - +30% health, +12% damage reduction, passive regen
   - Forgiving for new players
   - Uses Pulse Cannon

2. **Nova Corsair** - Close-Range Raider (Aggressive)
   - High-risk, high-reward glass cannon
   - +18% attack speed, +8% damage, 5% lifesteal
   - Fast movement and frequent dodges
   - Uses Nova Shotgun

3. **Stormcaller Adept** - Arc Lance Savant (Control)
   - Crowd control specialist with built-in chain lightning
   - 60% base chain chance, +1 piercing
   - Strategic positioning focus
   - Uses Arc Burst

4. **Nexus Architect** - Orbital Savant (Tactical)
   - Orbital specialist starting with 2 free orbitals
   - +10% orbital damage, +20% orbital speed
   - Methodical, sustained combat
   - Uses Pulse Cannon

### Design Philosophy
- **Distinct identities**: Each character has a clear role and playstyle
- **Build synergies**: Characters favor specific upgrade paths
- **Skill expression**: Different skill floors and ceilings
- **Accessibility**: Multiple viable characters for different player types

## ⚔️ Weapon System

### Weapon Types (3 Total)
Each character begins with a signature weapon optimized for their playstyle:

1. **Pulse Cannon** - Generalist (1.2 fire rate)
   - Balanced, reliable single-target damage
   - Works with all upgrade types
   - Used by: Aegis Vanguard, Nexus Architect

2. **Nova Shotgun** - Burst (0.8 fire rate)
   - 5-projectile cone spread for close-range devastation
   - Secondary: Nova Knockback (crowd control)
   - Synergizes with explosive upgrades
   - Used by: Nova Corsair

3. **Arc Burst** - Control (1.6 fire rate)
   - Rapid-fire twin projectiles
   - Secondary: Storm Surge (AoE chain pulse)
   - Exceptional chain lightning synergy
   - Used by: Stormcaller Adept

### Weapon Design Goals
- **Data-driven**: All weapons defined in config files
- **Upgrade compatibility**: Universal upgrades work with all weapons
- **Distinct feel**: Each weapon plays differently
- **Strategic depth**: Weapon choice affects optimal build paths

## ⚡ Upgrade System

### Core Upgrades
- **Damage Enhancement**: Increase projectile damage
- **Health & Survivability**: Max health, regeneration, damage reduction  
- **Mobility**: Movement speed, dodge improvements
- **Projectile Modifiers**: Piercing, explosive, split shots
- **Utility**: XP magnet range, attack speed, critical hits

### Special Abilities
- **Chain Lightning**: Electricity jumps between enemies (built-in for Stormcaller)
- **Orbital Attacks**: Projectiles orbit around player (built-in for Nexus Architect)
- **Shield System**: Absorbs damage and can reflect/explode (Aegis Vanguard)
- **Lifesteal**: Damage heals player (built-in for Nova Corsair)
- **Ricochet**: Projectiles bounce to additional targets
- **Weapon Secondaries**: Nova Knockback (shotgun), Storm Surge (arc burst)

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
- **More Characters**: Additional character archetypes (support, summoner, etc.)
- **Weapon Switching**: Mid-run weapon changes
- **More Weapons**: Sniper, beam, missile types
- **More Enemy Variety**: New enemy types and behaviors
- **Environmental Hazards**: Map obstacles and dangers
- **Power-ups**: Temporary ability boosts
- **Character Progression**: Unlock system, character-specific achievements
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

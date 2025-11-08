# 🚀 Galactic Ring: Cannon

A fast-paced 2D survival game built with vanilla JavaScript and HTML5 Canvas. Fight waves of enemies, collect upgrades, and survive in the depths of space!

## 🎮 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mcjdh/galactic-ring-cannon.git
   cd galactic-ring-cannon
   ```

2. **Start a local server**:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server
   ```

3. **Play the game**: Open `http://localhost:8000/index.html` in your browser

**Platform-specific setup:** See [docs/current/QUICK_START_PI5.md](docs/current/QUICK_START_PI5.md) for Raspberry Pi 5 optimization guide.

## 🌟 Features

### New in v1.1.0!
- **🧑‍🚀 4 Playable Characters**: Choose from distinct classes with unique playstyles
  - 🛡️ Aegis Vanguard (Tank) - High survivability, balanced gameplay
  - ⚡ Nova Corsair (Glass Cannon) - High risk, high reward burst damage
  - ⚡️🔗 Stormcaller Adept (Control) - Chain lightning specialist
  - 🎯 Nexus Architect (Tactical) - Orbital specialist with sustained damage
- **⚔️ 3 Weapon Types**: Each character has a signature weapon
  - Pulse Cannon - Balanced auto-targeting
  - Nova Shotgun - Close-range spread with knockback
  - Arc Burst - Rapid chain-linked projectiles

### Core Features
- **Loopable Runs**: Face escalating waves across successive boss encounters
- **Dynamic Upgrades**: Choose from 37 unique upgrades each level
- **Boss Battles**: Multi-phase boss encounters with special mechanics
- **Meta Progression**: Permanent upgrades via the Star Vendor system
- **Achievement System**: 19 achievements to unlock
- **Performance Optimized**: 60 FPS on Raspberry Pi 5 (+44-70 FPS improvement)
- **Mobile Friendly**: Responsive design with touch support

## ⚡ Performance

**Optimized for Raspberry Pi 5 and low-end hardware:**
- TrigCache & FastMath for ARM optimization (+16-22 FPS)
- Array pre-allocation & batch rendering (+13-23 FPS)
- Advanced performance caching (+15-25 FPS)
- Spatial grid partitioning for collision detection
- GPU memory management for smooth rendering

**See:** [docs/audits/FINAL_STATUS.md](docs/audits/FINAL_STATUS.md) for complete optimization details.

## 🎯 Gameplay

### Character Selection
Choose your pilot at game start:
- **🛡️ Aegis Vanguard**: +30% health, tanky and forgiving - perfect for beginners
- **⚡ Nova Corsair**: +18% attack speed, glass cannon - for skilled players
- **⚡️🔗 Stormcaller Adept**: Built-in chain lightning - crowd control specialist
- **🎯 Nexus Architect**: Starts with 2 orbitals - orbital specialist with tactical playstyle

See [docs/current/CHARACTERS.md](docs/current/CHARACTERS.md) for detailed builds and strategies!

### Controls
- **WASD/Arrow Keys**: Move your character
- **Space**: Dodge roll (has cooldown)
- **P/ESC**: Pause game
- **M**: Toggle sound
- **1-3**: Select upgrades when leveling up

### Run Structure
- **Normal Mode**: Face continuous boss encounters (~60 second intervals). Each boss defeat shows a victory screen where you can:
  - **Continue Run**: Keep playing with current upgrades, next boss will spawn
  - **Start New Run**: Restart from beginning
  - Bosses scale in difficulty (+20% health/damage per boss)
  - Earn 10 star tokens per boss defeated
  - Infinite progression - survive as long as you can!

## 📁 Project Structure

```
galactic-ring-cannon/
├── src/                     # Source code
│   ├── core/               # Game engine & management
│   ├── entities/           # Game objects (Player, Enemy, etc.)
│   ├── systems/            # Game systems (Audio, Upgrades, etc.)
│   ├── ui/                 # User interface components
│   └── utils/              # Utilities and helpers
├── assets/                 # Game assets
│   └── css/               # Stylesheets
├── docs/                   # Documentation
│   ├── current/           # Current reference docs
│   ├── updates/           # Version update documentation
│   ├── development-history/ # Multi-agent development notes
│   ├── planning/          # Future enhancements
│   └── README.md          # Documentation guide
├── scripts/                # Development & testing utilities
│   ├── performance/       # Performance testing scripts
│   ├── debug/             # Debugging utilities
│   └── README.md          # Script documentation
├── tests/                  # Test files
└── index.html             # Single entry point (unified)
```

## 🛠️ Development

### Prerequisites
- Modern web browser
- Local web server
- Text editor/IDE

### Setup for Development
1. Clone the repository
2. Install VS Code Live Server extension (recommended)
3. Open project in VS Code
4. Right-click `index.html` → "Open with Live Server"

### Documentation

📋 **For players**:
- [docs/current/GAME_GUIDE.md](docs/current/GAME_GUIDE.md) - Complete player guide ⭐ Updated v1.1
- [docs/current/CHARACTERS.md](docs/current/CHARACTERS.md) - Character builds & strategies ⭐ NEW v1.1
- [docs/current/WEAPONS.md](docs/current/WEAPONS.md) - Weapon mechanics & synergies ⭐ NEW v1.1

📋 **For developers**:
- [docs/current/KEY_CODE_PATTERNS.md](docs/current/KEY_CODE_PATTERNS.md) - Essential architectural patterns
- [docs/current/PROJECT_STRUCTURE.md](docs/current/PROJECT_STRUCTURE.md) - Codebase architecture ⭐ Updated v1.1
- [docs/current/API_DOCUMENTATION.md](docs/current/API_DOCUMENTATION.md) - Complete API reference

📚 **Full documentation**: See [docs/README.md](docs/README.md) for complete documentation navigation.

### Code Organization
- **Modular Architecture**: Clear separation of concerns
- **Performance Focused**: Optimized for 60fps gameplay
- **Documented Code**: Comprehensive inline documentation
- **ES6 Features**: Modern JavaScript practices

### Development Utilities
Helpful scripts for development and testing:
- **Performance Testing**: Run `./scripts/performance/test-pi5-performance.sh` for Pi 5 benchmarks
- **GPU Monitoring**: Check GPU memory with `./scripts/performance/check-gpu-memory.sh`
- **Debug Tools**: See `scripts/debug/` for debugging utilities
- **Full documentation**: [scripts/README.md](scripts/README.md)

### Global Namespace API
Runtime classes and helpers are exposed through a single `window.Game` namespace (legacy globals like `window.Player` have been removed). Use the namespace to access engine systems:

| Namespace Property | Description |
| ------------------- | ----------- |
| `window.Game.GameManagerBridge` | Main bridge coordinating the game loop, UI, and systems |
| `window.Game.GameEngine` | Core engine instance (created automatically during bootstrap) |
| `window.Game.GameState` | Centralized state container (single source of truth) |
| `window.Game.Player`, `window.Game.Enemy`, `window.Game.EnemyProjectile`, `window.Game.Projectile`, `window.Game.XPOrb`, `window.Game.DamageZone` | Primary entity classes |
| `window.Game.InputManager`, `window.Game.UpgradeSystem`, `window.Game.AudioSystem`, `window.Game.PerformanceManager`, `window.Game.AchievementSystem`, `window.Game.EnemySpawner` | Major gameplay systems instantiated at bootstrap |
| `window.Game.EffectsManager`, `window.Game.MinimapSystem`, `window.Game.CollisionSystem`, `window.Game.UnifiedUIManager`, `window.Game.FloatingTextSystem`, `window.Game.StatsManager`, `window.Game.DifficultyManager`, `window.Game.OptimizedParticlePool` | Shared subsystem classes |
| `window.Game.MathUtils`, `window.Game.ParticleHelpers`, `window.Game.urlParams`, `window.Game.logger` | Utility modules |
| `window.Game.testGameState` | Browser helper to run quick GameState integration tests |

Example usage:

```js
const { Player, MathUtils } = window.Game;
const newPlayer = new Player(0, 0);
const xpForLevel5 = MathUtils.xpForLevel(5);
```

Accessing classes through `window.Game` keeps the global scope clean and makes future module migration straightforward.

## 📊 Technical Features

### Performance Optimizations
- **Object Pooling**: Reuse game objects for better memory usage
- **Spatial Partitioning**: Efficient collision detection
- **Frustum Culling**: Only render visible entities
- **Dynamic Quality**: Automatic performance adjustments

### Browser Compatibility
- Chrome 80+ (Recommended)
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 Contributing

Contributions are welcome! Please see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

**Quick summary:**
- Report bugs via GitHub Issues
- Suggest new features
- Submit pull requests
- Improve documentation
- Follow existing code style and test thoroughly

## 🎯 Roadmap

### Short Term
- [ ] Module bundler integration
- [ ] TypeScript migration
- [ ] Mobile controls improvement
- [x] ~~Additional enemy types~~ ✅ (Added Summoner & Minion types)

### Long Term
- [ ] Multiplayer support
- [ ] Level editor
- [ ] Steam/itch.io release
- [ ] Mobile app version

## 📜 Version History

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for complete version history and release notes.

**Latest:** v1.1.1 (Nov 2025) - Added 4th character (Nexus Architect), documentation updates
**Previous:** v1.1.0 (Nov 2025) - Character & weapon systems, performance optimizations

## 🏆 Credits

**Created by**: mcjdh
**Tools Used**: VS Code, GitHub Copilot, Claude, GPT-4

## 🌟 Star History

If you enjoy this game, consider giving it a star on GitHub!

---

*Made with ❤️ and lots of coffee*

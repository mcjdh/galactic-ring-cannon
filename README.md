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

## 🌟 Features

- **Loopable Runs**: Face escalating waves across successive boss encounters
- **Dynamic Upgrades**: Choose from 12+ unique upgrade types each level
- **Boss Battles**: Multi-phase boss encounters with special mechanics
- **Meta Progression**: Permanent upgrades via the Star Vendor system
- **Achievement System**: 15+ achievements to unlock
- **Performance Optimized**: Runs smoothly on older hardware
- **Mobile Friendly**: Responsive design with touch support

## 🎯 Gameplay

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
├── config/                 # Configuration files
├── docs/                   # Documentation
│   ├── current/           # Current reference docs
│   ├── development-history/ # Multi-agent development notes
│   ├── planning/          # Future enhancements
│   └── README.md          # Documentation guide
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

### Code Architecture & Patterns
📋 **For developers**: See [docs/current/KEY_CODE_PATTERNS.md](docs/current/KEY_CODE_PATTERNS.md) for essential architectural patterns, component design principles, and development guidelines established through collaborative AI development.

📚 **Full documentation**: See [docs/README.md](docs/README.md) for complete documentation navigation.

### Code Organization
- **Modular Architecture**: Clear separation of concerns
- **Performance Focused**: Optimized for 60fps gameplay
- **Documented Code**: Comprehensive inline documentation
- **ES6 Features**: Modern JavaScript practices

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

Contributions are welcome! Please feel free to:
- Report bugs via GitHub Issues
- Suggest new features
- Submit pull requests
- Improve documentation

### Development Guidelines
1. Follow existing code style
2. Test changes thoroughly
3. Update documentation as needed
4. Keep commits focused and descriptive

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

## 🏆 Credits

**Created by**: mcjdh  
**Tools Used**: VS Code, GitHub Copilot, Claude, GPT-4

## 🌟 Star History

If you enjoy this game, consider giving it a star on GitHub!

---

*Made with ❤️ and lots of coffee*

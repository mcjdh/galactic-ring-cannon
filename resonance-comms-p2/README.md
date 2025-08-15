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

- **Two Game Modes**: Normal (3-minute challenge) and Endless survival
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

### Game Modes
- **Normal Mode**: Defeat 3 bosses in 3 minutes to win
- **Endless Mode**: Survive as long as possible for high scores

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
│   ├── GAME_GUIDE.md      # Player guide
│   ├── API_DOCUMENTATION.md # Code documentation
│   ├── GAME_DESIGN.md     # Design document
│   └── DEPLOYMENT.md      # Deployment guide
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
📋 **For developers**: See [`key-code-patterns.md`](./key-code-patterns.md) for essential architectural patterns, component design principles, and development guidelines established through collaborative AI development.

### Code Organization
- **Modular Architecture**: Clear separation of concerns
- **Performance Focused**: Optimized for 60fps gameplay
- **Documented Code**: Comprehensive inline documentation
- **ES6 Features**: Modern JavaScript practices

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
- [ ] Additional enemy types

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

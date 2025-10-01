# Contributing to Galactic Ring Cannon

This document outlines the standards and practices for this codebase.

## 🎯 Code Quality Standards

### Architecture Patterns

This codebase follows several key patterns:

1. **Single Source of Truth** - `GameState.js` is the centralized state container
2. **Entity-Component Pattern** - Entities are composed of modular components (e.g., Player = Stats + Movement + Combat + Abilities + Renderer)
3. **Observer Pattern** - GameState emits events for reactive updates
4. **Namespace Pattern** - All runtime classes exposed via `window.Game.*` to avoid global pollution

### Code Style

- **Indentation**: 4 spaces for JS/HTML/CSS
- **Line endings**: LF (Unix-style)
- **Trailing whitespace**: Remove it
- **Final newline**: Always include

### Constants & Configuration

- **DO**: Add magic numbers to `src/config/gameConstants.js`
- **DON'T**: Hardcode gameplay values directly in logic
- **EXAMPLE**:
  ```javascript
  // ❌ Bad
  if (healthPercent < 0.3) { ... }

  // ✅ Good
  const threshold = GAME_CONSTANTS.DIFFICULTY.LOW_HEALTH_THRESHOLD;
  if (healthPercent < threshold) { ... }
  ```

### Logging

Use the centralized logger instead of `console.*`:

```javascript
// ❌ Bad
console.log('Player died');
console.warn('Performance issue');

// ✅ Good
window.logger.log('Player died');
window.logger.warn('Performance issue');
```

### Error Handling

Always validate inputs and handle errors gracefully:

```javascript
// ✅ Good
if (!entity || typeof entity.x !== 'number') {
    window.logger.warn('Invalid entity', entity);
    return;
}
```

### Performance Considerations

- **Object Pooling**: Use for frequently created/destroyed entities (see `enemyProjectilePool`)
- **Spatial Partitioning**: Leverage the spatial grid for collision detection
- **Frustum Culling**: Only render/update entities within viewport
- **Lazy Evaluation**: Defer expensive calculations when possible

## 🧪 Testing

Currently using manual testing. Run the game with:

```bash
npm run serve
# Then open http://localhost:8000/index.html
```

Test the GameState system:
```bash
npm test
```

## 📝 Documentation

- Use JSDoc comments for complex functions
- Add inline comments for non-obvious logic
- Update README.md if adding major features

## 🐛 Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- Console errors (if any)

## 🚀 Feature Requests

Before implementing major features:
1. Open an issue to discuss the approach
2. Consider performance impact
3. Ensure it fits the game's design vision

## 🔧 Pull Request Process

1. Test your changes thoroughly
2. Ensure no console errors
3. Update documentation if needed
4. Keep commits focused and descriptive

## 📚 Useful Resources

- Game Architecture - See README.md Project Structure section
- Game Constants - src/config/gameConstants.js
- GameState API - src/core/GameState.js

## 🎮 Development Philosophy

- **Simplicity over cleverness** - Readable code > overly abstracted code
- **Performance matters** - This is a real-time game
- **Progressive enhancement** - Graceful degradation when systems unavailable
- **Player experience first** - Technical decisions should serve gameplay

---

Happy coding! 🚀

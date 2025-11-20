# Development Roadmap

**Last Updated**: November 20, 2025
**Current Status**: ✅ Stable, feature-complete base with component architecture

---

## 📍 Where We Are

### ✅ Completed Foundation
- Modern component-based architecture
- Performance optimized (+44-70 FPS on Pi5)
- 4 playable characters with unique abilities
- 3 weapon types (Blaster, Nova Shotgun, Arc Burst)
- 12+ enemy types including bosses
- 20+ stackable upgrades
- Achievement and meta-progression systems
- Zero-build HTML/CSS/JS architecture

### 🎯 Current State
The game is **production-ready** with a solid technical foundation. The codebase is clean, well-documented, and performant on target platforms (including Raspberry Pi 5).

---

## 🚀 Future Directions

### 🎮 Content Expansion
**Focus**: Deepen gameplay variety and replayability

**New Enemy Types** (Medium effort, high impact)
- Teleporter enemy (blinks around battlefield)
- Support enemy (buffs nearby enemies)
- More boss varieties with unique mechanics

**Environmental Mechanics** (Medium effort, high impact)
- Biome system with different space environments
- Environmental hazards (asteroid fields, black holes, solar flares)
- Dynamic backgrounds per biome

**Meta-Progression** (Low-medium effort, high engagement)
- Daily challenge system
- Extended achievement tree
- Unlock system for characters/weapons
- Leaderboards (local or cloud)

---

### 🏗️ Technical Evolution

**Build System & Tooling** (Medium effort, foundational)
- Modern bundler (Vite recommended)
- ES6 module conversion
- Development server with hot reload
- ESLint + Prettier for code quality
- Production build optimization

**TypeScript Migration** (High effort, long-term value)
- Type safety across codebase
- Better IDE support and refactoring
- Reduced runtime errors
- Improved documentation through types

**Performance & Optimization** (Ongoing)
- Further batch rendering optimizations
- Memory profiling and optimization
- Advanced spatial partitioning
- WebGL rendering for particles (optional)

---

### 📱 Platform Expansion

**Progressive Web App** (Medium effort, broad reach)
- Service worker for offline play
- App manifest for installation
- Touch controls and mobile UI
- Responsive design for all screen sizes

**Mobile Native** (High effort, new audience)
- iOS/Android native builds
- Touch-optimized controls
- App store deployment
- Platform-specific optimizations

**Desktop Distribution** (Low-medium effort, legitimacy)
- Electron wrapper for desktop app
- Steam or itch.io deployment
- Native desktop features (achievements, cloud saves)

---

## 🎯 Recommended Next Steps

### Short-Term Quick Wins (1-2 weeks each)
1. **New enemy type** - Add Teleporter enemy for immediate content variety
2. **Daily challenges** - Simple meta-progression hook for engagement
3. **Touch controls prototype** - Test mobile viability
4. **Achievement expansion** - More unlock goals

### Medium-Term Projects (3-4 weeks each)
1. **Biome system** - Environmental variety with 3-5 biomes
2. **PWA implementation** - Mobile web deployment
3. **Build system setup** - Vite + ES6 modules foundation
4. **Boss variety** - 3-4 unique boss types with different mechanics

### Long-Term Initiatives (2-3 months each)
1. **TypeScript migration** - Full type safety
2. **Mobile native app** - iOS/Android deployment
3. **Multiplayer prototype** - Co-op or competitive modes
4. **Level editor** - User-generated content system

---

## 📊 Decision Framework

When prioritizing work, consider:

**For Maximum Player Impact**: Focus on content expansion (enemies, biomes, challenges)
**For Technical Foundation**: Focus on build system and TypeScript
**For Broad Reach**: Focus on PWA and mobile deployment
**For Portfolio Value**: Focus on production polish and platform distribution

---

## 🔄 How to Use This Roadmap

1. **Pick your focus area** based on goals (content, technical, platform)
2. **Start with quick wins** to build momentum
3. **Document decisions** as features are implemented
4. **Update this roadmap** when priorities shift
5. **Archive completed work** to historical documentation

This roadmap is a living document. As features are completed or priorities change, update this file to reflect current direction.

---

## 📝 Notes

**Zero-Build Philosophy**: The current architecture intentionally avoids build complexity. Adding a build system (Vite) would be optional, not required.

**Performance First**: All features should maintain the 60 FPS target on Raspberry Pi 5.

**Incremental Approach**: Features can be added independently without breaking existing functionality.

**Community Input**: Consider player feedback when prioritizing content additions.

---

**See Also**:
- [docs/current/PROJECT_STRUCTURE.md](../current/PROJECT_STRUCTURE.md) - Current architecture
- [docs/current/KEY_CODE_PATTERNS.md](../current/KEY_CODE_PATTERNS.md) - Architectural patterns
- [docs/historical-archive.zip](../historical-archive.zip) - Historical planning docs (extract planning-completed/ for REFACTORING_PLAN and IMPROVEMENTS)

# Future Enhancements

This document contains **wishlist items** and **nice-to-have features** that would enhance the game but are not critical bugs or technical debt.

> **Note**: For actual bugs and technical debt, see the Issues tracker or CHANGELOG.md

---

## 🎮 Gameplay Enhancements

### Enemy System
- **More enemy types**: Additional enemy variety beyond the current 13 types
  - ~~Summoner enemies that spawn minions~~ ✅ **IMPLEMENTED** (v1.1.0 - SummonerEnemy + MinionEnemy)
  - Berserker enemies with rage mechanics
  - Support enemies that buff other enemies

- **Boss variety**: Multiple boss types with different mechanics
  - Element-themed bosses (fire, ice, lightning)
  - Movement-pattern based bosses (teleporter, dasher)
  - Multi-stage transformations

- **Dynamic difficulty scaling**: More sophisticated difficulty curves
  - Exponential scaling instead of linear
  - Player skill-based difficulty adjustment
  - Optional difficulty modifiers (skulls/mutations)

### Wave System
- **Themed wave patterns**: More engaging wave compositions
  - Elite-only waves
  - Horde waves (many weak enemies)
  - Mixed composition waves
  - Boss rush waves

- **Enemy unlock progression**: Configuration-driven enemy unlock system
  - Move hard-coded unlock times to config file
  - Difficulty-based unlock scaling
  - Boss-milestone unlocks

### Elite & Special Enemies
- **More elite varieties**: Additional elite enemy types with unique abilities
  - Shielded elites (regenerating shields)
  - Enraged elites (damage boost on low health)
  - Summoner elites (spawn adds)

---

## ⚙️ Technical Enhancements

### Performance Optimizations
- **Enemy budget system**: Cap total enemy "cost" for performance
  - Assign point values to enemy types
  - Limit total spawn budget per frame
  - Spawn prediction to prevent frame drops

### Statistics & Analytics
- **GameStats manager**: Centralized statistics tracking
  - Move stats out of EnemySpawner
  - Track per-run, per-session, all-time stats
  - Achievement progress tracking

### Configuration
- **Move magic numbers to config**: Improve configurability
  - Enemy unlock times → config file
  - Difficulty scaling curves → config file
  - Boss spawn patterns → config file

---

## 🚀 Long-term Ideas

### Major Features
- **Multiplayer support**: Co-op or competitive modes
- **Level editor**: Player-created content
- **Mobile app version**: Native mobile ports
- **Steam/itch.io release**: Commercial distribution

### Quality of Life
- **More sophisticated boss spawning**: Dynamic based on player progress
- **Health scaling refinement**: Better balance at high difficulties
- **Improved wave system engagement**: More varied patterns

---

## 📊 Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Enemy budget system | High | Medium | High |
| Themed wave patterns | Medium | Low | Medium |
| Boss variety | High | High | Medium |
| GameStats manager | Medium | Medium | Medium |
| Configuration migration | Medium | Low | Low |
| More elite varieties | Low | Medium | Low |

---

## 🔄 Implementation Notes

When implementing features from this list:
1. Create a tracking issue in the issue tracker
2. Move the item from this document to active development
3. Update CHANGELOG.md when completed
4. Mark as ✅ completed with date

---

**Last Updated**: 2025-11-07
**Maintained By**: Development team

# Documentation Guide
**Last Updated**: November 20, 2025
**Version**: 1.1.1

Welcome to the Galactic Ring Cannon documentation! This guide will help you navigate the documentation structure.

---

## Quick Start

### 🆕 Latest Updates (v1.1.1)

**NEW Features in v1.1.1:**
- **[current/WEAPONS.md](current/WEAPONS.md)** - Weapon system guide (3 weapon types!)
- **[current/CHARACTERS.md](current/CHARACTERS.md)** - Character classes guide (4 characters!)

**Previous Updates:**
- **[updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/)** - Major balance overhaul and bug fixes (January 2025)

### For Developers

Start here to understand the codebase:

1. **[current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md)** - Overview of file organization and architecture
2. **[current/API_DOCUMENTATION.md](current/API_DOCUMENTATION.md)** - Complete API reference for all classes
3. **[current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md)** - Architectural patterns and best practices
4. **[current/WEAPONS.md](current/WEAPONS.md)** - Weapon system architecture ⭐ NEW
5. **[current/CHARACTERS.md](current/CHARACTERS.md)** - Character system architecture ⭐ NEW

### For Players

1. **[current/GAME_GUIDE.md](current/GAME_GUIDE.md)** - How to play, controls, characters, weapons, enemy types, upgrades ⭐ UPDATED
2. **[current/WEAPONS.md](current/WEAPONS.md)** - Detailed weapon guide ⭐ NEW
3. **[current/CHARACTERS.md](current/CHARACTERS.md)** - Character builds and strategies ⭐ NEW
4. **[current/GAME_DESIGN.md](current/GAME_DESIGN.md)** - Game design philosophy and mechanics
5. **[updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/)** - What's new in v1.0.9

### For DevOps/Deployment

1. **[current/DEPLOYMENT.md](current/DEPLOYMENT.md)** - Deployment guide for various platforms

---

## Documentation Structure

The documentation is organized into the following categories:

### 📋 Root Documentation Files

Essential project documentation:

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines and development workflow |
| [HISTORICAL_ARCHIVE_README.md](HISTORICAL_ARCHIVE_README.md) | Guide to the historical documentation archive |

**When to use**: Understanding project history, learning how to contribute, accessing historical docs.

### 📘 [current/](current/) - Current Documentation

**All documentation about the current state of the game.** This includes reference docs, guides, feature implementations, and how-tos. Everything you need to understand and work with the codebase as it exists right now.

**Reference Documentation:**
| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](current/API_DOCUMENTATION.md) | Complete API reference for all classes and systems |
| [PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md) | File organization and architectural overview |
| [KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md) | Established patterns and best practices |
| [GAMESTATE_ARCHITECTURE.md](current/GAMESTATE_ARCHITECTURE.md) | State management pattern details |

**Game Documentation:**
| Document | Description |
|----------|-------------|
| [GAME_GUIDE.md](current/GAME_GUIDE.md) | Player guide - controls, characters, weapons, enemies, upgrades |
| [GAME_DESIGN.md](current/GAME_DESIGN.md) | Game design philosophy and mechanics |
| [CHARACTERS.md](current/CHARACTERS.md) | 4 playable characters with builds and strategies |
| [WEAPONS.md](current/WEAPONS.md) | 3 weapon types with detailed mechanics |

**Guides & Implementation Notes:**
| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](current/DEPLOYMENT.md) | Deployment instructions for various platforms |
| [QUICK_START_PI5.md](current/QUICK_START_PI5.md) | Raspberry Pi 5 optimization and setup guide |
| [QUICK_START_TESTING.md](current/QUICK_START_TESTING.md) | Testing guide |
| [PROJECTILE_DEBUG_GUIDE.md](current/PROJECTILE_DEBUG_GUIDE.md) | Debugging projectile systems |
| [FEATURE_BERSERKER_RAGE_VISUALS.md](current/FEATURE_BERSERKER_RAGE_VISUALS.md) | Berserker low-HP visual effects implementation |
| [FEATURE_FIRE_DAMAGE_TRACKING.md](current/FEATURE_FIRE_DAMAGE_TRACKING.md) | Fire damage tracking implementation |

**When to use**: Anytime you need to understand how the game currently works - whether that's code architecture, game mechanics, specific features, or deployment.

---

### 📦 Historical Documentation Archive

**File**: [historical-archive.zip](historical-archive.zip) (449KB compressed, 141 markdown files)

Historical documentation has been archived to reduce noise in searches while preserving development history. The archive contains:

- **development-history/** - Multi-agent AI collaboration process (59 files)
- **audits/** - Documentation verification reports (48 files)
- **logs/** - Change logs and balance updates
- **archive/** - Obsolete/uncertain material (2 files)
- **planning-completed/** - Completed planning docs (2 files)
- **updates-to-archive/** - Version update logs (19 files, v1.0.9 + feature updates)

**To access**: See [HISTORICAL_ARCHIVE_README.md](HISTORICAL_ARCHIVE_README.md) for extraction instructions.

**When to use**: Understanding past architectural decisions, researching bug fix history, reviewing version changes, learning about the multi-agent development process.

---

### 📝 [planning/](planning/) - Future Direction

Forward-looking development roadmap for the project. This is a **living document** reflecting current priorities and future possibilities.

| Document | Description |
|----------|-------------|
| [ROADMAP.md](planning/ROADMAP.md) | Consolidated development roadmap with content, technical, and platform expansion paths |

**When to use**: Planning future work, proposing enhancements, understanding project direction.

**Note**: Historical planning docs (REFACTORING_PLAN, IMPROVEMENTS) are archived in [historical-archive.zip](historical-archive.zip) under `planning-completed/`.

---

## Key Concepts

### Component-Based Architecture

The codebase uses a **component-based architecture** where complex entities (Player, Enemy) are built from smaller, focused components:

```javascript
class Player {
  constructor(x, y) {
    this.stats = new PlayerStats(this);         // Health, XP, level
    this.movement = new PlayerMovement(this);   // Movement & input
    this.combat = new PlayerCombat(this);       // Attacks & projectiles
    this.abilities = new PlayerAbilities(this); // Dodge & abilities
    this.renderer = new PlayerRenderer(this);   // Rendering
  }
}
```

See [current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md) for details.

### Global Namespace Pattern

All classes are organized under `window.Game` for clean global access:

```javascript
window.Game.Player
window.Game.Enemy
window.Game.GameEngine
window.Game.MathUtils
```

See [current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md) for details.

### Single Source of Truth (GameState)

All game state is centralized in `GameState` to prevent sync issues:

```javascript
state.runtime      // game time, FPS, pause state
state.player       // player stats and position
state.progression  // kills, XP, damage
state.combo        // combo system
state.meta         // achievements, stars
```

See [current/GAMESTATE_ARCHITECTURE.md](current/GAMESTATE_ARCHITECTURE.md) for details.

---

## Common Tasks

### Understanding Recent Changes

1. Check [updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/) for latest update documentation
2. Review [updates/v1.0.9-balance-and-fixes/ALL_CHANGES_FINAL.md](updates/v1.0.9-balance-and-fixes/ALL_CHANGES_FINAL.md) for complete change list
3. See specific fix documentation for detailed explanations

### Understanding a Class

1. Check [current/API_DOCUMENTATION.md](current/API_DOCUMENTATION.md) for the class reference
2. Look at the actual file in `src/` directory
3. Review [current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md) for architectural patterns

### Adding a New Feature

1. Review [current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md) for established patterns
2. Check [current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md) for where to place new files
3. Follow component-based architecture principles
4. Update [current/API_DOCUMENTATION.md](current/API_DOCUMENTATION.md) if adding public APIs

### Understanding a Past Decision

1. Extract [historical-archive.zip](historical-archive.zip) to access historical documentation
2. Check `development-history/phase-2-integration/CODEBASE_STATUS.md` for recent status
3. Search the archived `development-history/` folders for relevant context
4. Look for migration notes in [current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md)

### Deploying the Game

1. Read [current/DEPLOYMENT.md](current/DEPLOYMENT.md) for deployment options
2. Follow platform-specific instructions (GitHub Pages, Netlify, etc.)

---

## Documentation Maintenance

### Keeping Docs Current

When making significant code changes:

1. **Update API docs** if public APIs change
2. **Update patterns** if introducing new architectural patterns
3. **Don't modify historical docs** - they're snapshots of development process
4. **Add to planning docs** if planning future work

### Documentation Status

- ✅ **current/**: Actively maintained, reflects codebase as of November 2025 (14 files)
- 📦 **historical-archive.zip**: Archived historical docs (extract when needed, 141 files)
- 📝 **planning/**: Updated as plans change (1 file)

---

## For Future AI Models

If you're an AI model working on this codebase:

1. **Start with `current/` documentation** - this reflects the actual codebase
2. **Extract `historical-archive.zip` for context** - understand why decisions were made
3. **Don't treat historical docs as current** - they document the development journey
4. **Reference `KEY_CODE_PATTERNS.md`** - follow established architectural patterns
5. **Update `current/` docs** when making changes - keep them synchronized with code

The documentation reorganization (October 2025) and archiving (November 2025) were specifically done to prevent confusion between current reference material and historical development notes, while reducing grep noise.

---

## Questions or Issues?

- **Codebase questions**: Start with [current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md)
- **API questions**: Check [current/API_DOCUMENTATION.md](current/API_DOCUMENTATION.md)
- **Pattern questions**: Review [current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md)
- **Historical questions**: Extract [historical-archive.zip](historical-archive.zip) and search archived docs
- **Deployment questions**: See [current/DEPLOYMENT.md](current/DEPLOYMENT.md)

---

## Audit History

- **November 20, 2025**: Historical documentation archiving & structure simplification
  - Archived 141 markdown files (development-history, audits, logs, archive, planning-completed, updates)
  - Reduced grep noise by ~1.5MB of historical docs
  - Created [historical-archive.zip](historical-archive.zip) (449KB compressed)
  - Consolidated 5 fragmented planning docs into single [ROADMAP.md](planning/ROADMAP.md)
  - Simplified structure: merged guides/, features/, updates/ into current/
  - Deleted redundant root CHANGELOG.md
  - Final structure: current/ (14 files) + planning/ (1 file) + historical-archive.zip (141 files)
  - See [HISTORICAL_ARCHIVE_README.md](HISTORICAL_ARCHIVE_README.md) for details

- **October 25-26, 2025**: Comprehensive documentation verification (3 phases)
  - **Phase 1**: Reorganized 70+ docs into clear folder structure
  - **Phase 2**: Verified game mechanics accuracy (found boss system discrepancy)
  - **Phase 3**: Verified all current docs against actual code
  - **Result**: 17 issues found and fixed, 100% documentation accuracy
  - Audit reports now archived in [historical-archive.zip](historical-archive.zip)

---

## Recent Updates

- **November 7, 2025**: v1.1.1 Documentation Update
  - ⭐ **UPDATED**: [CHARACTERS.md](current/CHARACTERS.md) - Added 4th character: Nexus Architect (Orbital Savant)
  - ⭐ **UPDATED**: [GAME_GUIDE.md](current/GAME_GUIDE.md) - Added Nexus Architect strategies and tips
  - ⭐ **UPDATED**: All docs now correctly reference 4 playable characters
  - Features: 4 playable characters, 3 weapon types, complete orbital specialist build path

- **November 7, 2025**: v1.1.0 Documentation Update
  - ⭐ **NEW**: [WEAPONS.md](current/WEAPONS.md) - Complete weapon system documentation
  - ⭐ **NEW**: [CHARACTERS.md](current/CHARACTERS.md) - Complete character system documentation (initially 3, now 4)
  - ⭐ **UPDATED**: [GAME_GUIDE.md](current/GAME_GUIDE.md) - Added character/weapon sections and strategies
  - ⭐ **UPDATED**: [PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md) - Added v1.1.0 changes, new files

- **January 4, 2025**: Added v1.0.9 update documentation (14 files in [updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/))
  - Boss balance overhaul documentation
  - Special types fix and balance documentation
  - Critical bug fix documentation
  - Comprehensive change summaries

---

*This documentation reflects the production-ready component-based architecture as of November 2025.*
*Version: 1.1.1*
*Structure: Simple & Clean - current/ (14 files) + planning/ (1 file) + historical-archive.zip (141 files)*

# Documentation Guide
**Last Updated**: January 4, 2025

Welcome to the Galactic Ring Cannon documentation! This guide will help you navigate the documentation structure.

---

## Quick Start

### 🆕 Latest Updates

**[updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/)** - Major balance overhaul and bug fixes (January 2025)

### For Developers

Start here to understand the codebase:

1. **[current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md)** - Overview of file organization and architecture
2. **[current/API_DOCUMENTATION.md](current/API_DOCUMENTATION.md)** - Complete API reference for all classes
3. **[current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md)** - Architectural patterns and best practices

### For Players

1. **[current/GAME_GUIDE.md](current/GAME_GUIDE.md)** - How to play, controls, enemy types, upgrades
2. **[current/GAME_DESIGN.md](current/GAME_DESIGN.md)** - Game design philosophy and mechanics
3. **[updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/)** - What's new in v1.0.9

### For DevOps/Deployment

1. **[current/DEPLOYMENT.md](current/DEPLOYMENT.md)** - Deployment guide for various platforms

---

## Documentation Structure

The documentation is organized into the following categories:

### 📋 Root Documentation Files

Essential project documentation:

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines and development workflow |

**When to use**: Understanding project history, learning how to contribute.

### 📘 [current/](current/) - Current Reference Documentation

Up-to-date documentation reflecting the current state of the codebase (as of October 2025).

| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](current/API_DOCUMENTATION.md) | Complete API reference for all classes and systems |
| [PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md) | File organization and architectural overview |
| [KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md) | Established patterns and best practices |
| [GAMESTATE_ARCHITECTURE.md](current/GAMESTATE_ARCHITECTURE.md) | State management pattern details |
| [GAME_GUIDE.md](current/GAME_GUIDE.md) | Player guide - controls, enemies, upgrades |
| [GAME_DESIGN.md](current/GAME_DESIGN.md) | Game design philosophy and mechanics |
| [DEPLOYMENT.md](current/DEPLOYMENT.md) | Deployment instructions |
| [QUICK_START_PI5.md](current/QUICK_START_PI5.md) | Raspberry Pi 5 optimization and setup guide |

**When to use**: Learning the codebase, implementing features, understanding architecture, deploying to specific platforms.

---

### 📚 [development-history/](development-history/) - Historical Development Notes

Documents the collaborative AI development process and major refactoring efforts. This is **historical documentation** - valuable for context but not current reference material.

| Folder | Description |
|--------|-------------|
| [phase-1-resonance/](development-history/phase-1-resonance/) | Multi-agent development phase (30+ documents) |
| [phase-2-integration/](development-history/phase-2-integration/) | Integration and optimization phase (20+ documents) |
| [status-reports/](development-history/status-reports/) | Historical fix/optimization reports |

**When to use**: Understanding architectural decisions, learning about the evolution, researching why something was built a certain way.

---

### 📝 [planning/](planning/) - Future Enhancements

Roadmaps, enhancement ideas, and future refactoring plans. These are **proposed/planned** features, not current implementation.

| Document | Description |
|----------|-------------|
| [DEVELOPMENT_ROADMAP.md](planning/DEVELOPMENT_ROADMAP.md) | Development roadmap and milestones |
| [REFACTORING_PLAN.md](planning/REFACTORING_PLAN.md) | Planned refactoring efforts |
| [FUTURE_ENHANCEMENTS.md](planning/FUTURE_ENHANCEMENTS.md) | Feature wishlist and ideas |
| [IMPROVEMENTS.md](planning/IMPROVEMENTS.md) | Improvement proposals |

**When to use**: Planning future work, proposing enhancements, understanding project direction.

---

### 🗄️ [archive/](archive/) - Archived Documentation

Documents of uncertain relevance or outdated material. Preserved for reference but not actively maintained.

**When to use**: Rarely - only if researching old features or deprecated functionality.

---

### 📊 [audits/](audits/) - Documentation Audit Reports

Reports from documentation verification and cleanup efforts (October 2025). Shows evidence and findings from 3 verification phases ensuring docs match actual code.

| Document | Description |
|----------|-------------|
| [COMPLETE_VERIFICATION_REPORT.md](audits/COMPLETE_VERIFICATION_REPORT.md) | Final comprehensive report (all 3 phases) |
| [DOCUMENTATION_AUDIT_2025.md](audits/DOCUMENTATION_AUDIT_2025.md) | Phase 1 - Initial reorganization |
| [MECHANICS_AUDIT_FINDINGS.md](audits/MECHANICS_AUDIT_FINDINGS.md) | Phase 2 - Boss mechanics verification |
| [ADDITIONAL_DOCUMENTATION_ISSUES.md](audits/ADDITIONAL_DOCUMENTATION_ISSUES.md) | Phase 2 - Additional issues found |
| [FINAL_DOCUMENTATION_UPDATE.md](audits/FINAL_DOCUMENTATION_UPDATE.md) | Phase 2 - Update summary |
| [DOCUMENTATION_UPDATE_SUMMARY.md](audits/DOCUMENTATION_UPDATE_SUMMARY.md) | Phase 1 - Update summary |

**When to use**: Understanding the documentation verification process, seeing evidence for doc changes.

---

### 🔄 [updates/](updates/) - Version Update Documentation

Detailed documentation for major updates and releases. Each update has its own folder with comprehensive change logs, bug fix analysis, and balance documentation.

| Update | Description |
|--------|-------------|
| [v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/) | Boss balance overhaul, special types fixes, critical bug repairs (Jan 2025) |

**When to use**: Understanding what changed in a specific version, troubleshooting issues after an update, reviewing balance decisions.

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

1. Check [development-history/phase-2-integration/CODEBASE_STATUS.md](development-history/phase-2-integration/CODEBASE_STATUS.md) for recent status
2. Search [development-history/](development-history/) for relevant context
3. Look for migration notes in [current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md)

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

- ✅ **current/**: Actively maintained, reflects codebase as of October 2025
- 📚 **development-history/**: Preserved as-is, historical record
- 📝 **planning/**: Updated as plans change
- 🗄️ **archive/**: Not actively maintained

---

## For Future AI Models

If you're an AI model working on this codebase:

1. **Start with `current/` documentation** - this reflects the actual codebase
2. **Use `development-history/` for context** - understand why decisions were made
3. **Don't treat historical docs as current** - they document the development journey
4. **Reference `KEY_CODE_PATTERNS.md`** - follow established architectural patterns
5. **Update `current/` docs** when making changes - keep them synchronized with code

The documentation reorganization (October 2025) was specifically done to prevent confusion between current reference material and historical development notes.

---

## Questions or Issues?

- **Codebase questions**: Start with [current/PROJECT_STRUCTURE.md](current/PROJECT_STRUCTURE.md)
- **API questions**: Check [current/API_DOCUMENTATION.md](current/API_DOCUMENTATION.md)
- **Pattern questions**: Review [current/KEY_CODE_PATTERNS.md](current/KEY_CODE_PATTERNS.md)
- **Historical questions**: Search [development-history/](development-history/)
- **Deployment questions**: See [current/DEPLOYMENT.md](current/DEPLOYMENT.md)

---

## Audit History

- **October 25-26, 2025**: Comprehensive documentation verification (3 phases)
  - **Phase 1**: Reorganized 70+ docs into clear folder structure
  - **Phase 2**: Verified game mechanics accuracy (found boss system discrepancy)
  - **Phase 3**: Verified all current docs against actual code
  - **Result**: 17 issues found and fixed, 100% documentation accuracy
  - See [audits/](audits/) for complete audit reports and evidence

---

## Recent Updates

- **January 4, 2025**: Added v1.0.9 update documentation (14 files in [updates/v1.0.9-balance-and-fixes/](updates/v1.0.9-balance-and-fixes/))
  - Boss balance overhaul documentation
  - Special types fix and balance documentation
  - Critical bug fix documentation
  - Comprehensive change summaries

---

*This documentation reflects the production-ready component-based architecture as of January 2025.*
*Total: 85+ markdown files organized for clarity and maintainability.*

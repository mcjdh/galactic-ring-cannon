# Galactic Ring Cannon Codebase Size Audit

Snapshot: 2025-10-27 18:45 UTC  
Scope: Full repository scan excluding typical tooling caches (`.git`, `node_modules`, virtualenvs, build artifacts). Counts follow `wc -l` semantics (lines are newline-delimited), and byte totals are used as a proxy for character counts when decoding is ambiguous.

## High-Level Totals
| Metric | Value |
| --- | ---: |
| Files scanned | 174 |
| Line count | 44,789 |
| Byte size | 1,512,370 (~1.44 MiB) |

## Top-Level Directory Distribution
| Area | Files | Lines | Line Share | Bytes | Byte Share |
| --- | ---: | ---: | ---: | ---: | ---: |
| `src` | 78 | 23,883 | 53.3% | 834,304 | 55.2% |
| `docs` | 81 | 16,892 | 37.7% | 563,746 | 37.3% |
| `assets` | 1 | 1,831 | 4.1% | 38,547 | 2.5% |
| `archive` | 2 | 869 | 1.9% | 28,818 | 1.9% |
| root files | 7 | 816 | 1.8% | 29,965 | 2.0% |
| `tests` | 4 | 485 | 1.1% | 16,778 | 1.1% |
| `.claude` | 1 | 13 | <0.1% | 212 | <0.1% |

## Source Code Breakdown (`src`)
| Subtree | Files | Lines | Share of `src` | Bytes |
| --- | ---: | ---: | ---: | ---: |
| `src/core` | 15 | 8,962 | 37.5% | 325,121 |
| `src/entities` | 40 | 8,383 | 35.1% | 285,527 |
| `src/systems` | 8 | 3,710 | 15.5% | 129,952 |
| `src/utils` | 6 | 1,221 | 5.1% | 40,206 |
| `src/ui` | 5 | 833 | 3.5% | 30,701 |
| `src/config` | 4 | 774 | 3.2% | 22,797 |

Notable sub-areas:
- `src/core/systems`: 3,614 lines across 8 files (average 452 lines/file).
- `src/entities/components`: 2,198 lines across 3 files (average 733 lines/file).

## Largest Files by Line Count
| File | Lines | Bytes | Notes |
| --- | ---: | ---: | --- |
| `src/core/gameEngine.js` | 2,397 | 92,600 | Central engine loop + orchestration. |
| `assets/css/styles.css` | 1,831 | 38,547 | Consolidated stylesheet for UI. |
| `src/core/gameManagerBridge.js` | 1,273 | 45,109 | Glue between engine, systems, and UI. |
| `src/core/systems/EffectsManager.js` | 853 | 29,430 | Visual/audio effects pipeline. |
| `src/entities/components/EnemyAbilities.js` | 817 | 25,762 | Large component definition block. |
| `src/core/systems/StatsManager.js` | 792 | 27,285 | Stat tracking & progression logic. |
| `src/systems/EnemySpawner.js` | 773 | 27,659 | Spawner rules + wave configuration. |
| `archive/gameManager.js` | 765 | 24,684 | Legacy manager retained in archive. |
| `docs/current/API_DOCUMENTATION.md` | 746 | 20,043 | Live reference documentation. |
| `src/entities/components/EnemyMovement.js` | 741 | 28,763 | Movement behaviors and helpers. |

## File Type Mix
| Extension | Files | Lines | Line Share | Bytes | Byte Share |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.js` | 84 | 25,275 | 56.4% | 881,699 | 58.3% |
| `.md` | 84 | 17,306 | 38.6% | 577,453 | 38.2% |
| `.css` | 1 | 1,831 | 4.1% | 38,547 | 2.5% |
| `.html` | 2 | 271 | 0.6% | 12,816 | 0.8% |
| `.json` | 2 | 56 | 0.1% | 1,368 | 0.1% |
| *(no extension)* | 1 | 50 | 0.1% | 487 | <0.1% |

## Observations & Opportunities
- Core gameplay code is concentrated in a handful of long-running files (`gameEngine.js`, `gameManagerBridge.js`, and several managers) that exceed 750 lines each—prime candidates for modularization to improve navigability.
- Styling is funneled through a single 1.8k-line stylesheet; consider breaking it into logical chunks (layout, components, themes) to ease maintenance.
- `src/entities/components` delivers 2.2k lines across just three files, hinting at dense component definitions that may benefit from splitting by enemy archetype or responsibility.
- Documentation is substantial (37% of all lines) with `docs/development-history` alone hosting 10.5k lines—keep archival docs in mind when measuring game-only changes.
- Automated tests are confined to four files (485 lines), suggesting room to expand coverage around the large core systems.
- The `archive` directory still carries a 765-line legacy manager; verify whether it should remain bundled with production exports.

## Suggested Next Steps
1. Profile `src/core/gameEngine.js` and `gameManagerBridge.js` for logical seams (input handling, simulation, rendering) that can be extracted into dedicated modules.
2. Create a stylesheet plan (e.g., BEM or utility split) to segment `assets/css/styles.css` into smaller, thematic files.
3. Review `src/entities/components/*` for component-specific modules and shared helper extraction to reduce per-file cognitive load.
4. Expand the `tests/` directory with coverage around the largest systems (Effects, Stats, EnemySpawner) to protect against regressions.
5. Decide whether `archive/gameManager.js` belongs in the main branch or should be moved to a long-term storage location (e.g., git tag or docs archive).

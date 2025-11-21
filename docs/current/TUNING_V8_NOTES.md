# Tuning V8 Notes: Mid-Game Slowdown & Density Boost

## Problem
User feedback:
1.  "XP post lvl 10 down a bit" (Slower leveling).
2.  "General mob spawn up slightly around a minute and onward".

## Changes

### 1. Slower Mid-Late Game Leveling (Demand)
*   **Mid Multiplier (Lvl 10-22)**: Increased from 1.15 to **1.20**.
    *   *Effect*: XP requirements grow faster. Level 20 now requires ~850 XP (was ~400).
*   **Late Multiplier (Lvl 22+)**: Increased from 1.18 to **1.25**.
    *   *Effect*: Late game levels become significantly harder, preventing the "Level 50 in 5 minutes" issue.

### 2. Higher Post-Minute Density (Supply)
*   **Base Spawn Rate**: Increased from 2.0 to **3.0**.
    *   *Effect*: Once the early game protection wears off, the spawn rate jumps to a much higher baseline.
*   **Early Game Spawn Multiplier**: Reduced from 0.6 to **0.4**.
    *   *Effect*: `3.0 * 0.4 = 1.2`. This keeps the **first minute exactly the same** as V7 (which the user liked), but allows the rate to explode upwards after 60s.

## Expected Outcome
*   **0-60s**: Calm start (1.2 spawns/s). Fast leveling (Lvl 1-9).
*   **60s+**: Mob density ramps up quickly to 3.0+ spawns/s.
*   **Leveling**: Slows down noticeably after Level 10. Level 20 should take ~5 minutes.

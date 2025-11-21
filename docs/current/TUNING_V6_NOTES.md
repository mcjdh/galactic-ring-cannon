# Tuning V6 Notes: Curve Reshape

## Problem
User reported hitting Level 3-4 after 1 minute, which is too slow.
User requested:
1.  "Big buff to first 3 levels"
2.  "Tiny buff to 4-9"
3.  "Normal XP rest of run"

## Changes

### 1. XP Curve Reshape (Demand)
*   **Initial XP to Level**: Drastically reduced from 50 to **15**.
    *   *Effect*: Level 1->2 requires ~2-3 kills. Level 2->3 requires ~3-4 kills. This fulfills the "Big buff to first 3 levels".
*   **Early Multiplier**: Increased from 1.08 to **1.35**.
    *   *Effect*: Because we start so low (15 XP), we need a steep ramp to catch up to "normal" values by Level 10.
    *   *Progression*: 15 -> 20 -> 27 -> 36 -> 48 -> 64 -> 86 -> 116 -> 133 (Lvl 10).
    *   *Comparison*: Previous Lvl 10 req was ~100-120. This is slightly higher at Lvl 10, but much lower at Lvl 1-5.

### 2. Removed Time-Based Boost (Supply)
*   **Early XP Boost**: Disabled (Multiplier 1.0, Duration 0).
    *   *Reasoning*: The curve reshape handles the pacing more reliably than a time-based boost, which can be inconsistent depending on kill speed.

### 3. Mob Density (Supply)
*   **Early Game Spawn Multiplier**: Kept at **0.9x**.
    *   *Effect*: Maintains the "gentle start" requested by the user.

## Expected Outcome
*   **Level 3 Timing**: ~5-10 seconds.
*   **Level 5 Timing**: ~15-25 seconds.
*   **Level 10 Timing**: ~60-90 seconds.
*   **Mid-Game**: Normal progression resumes after Level 10.

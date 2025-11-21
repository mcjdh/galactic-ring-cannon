# Tuning V7 Notes: Mob Density Balance

## Problem
User feedback:
1.  "First minute is a bit heavy handed" (Too many mobs early).
2.  "Late game its nice to have high total mob count cap" (Wants high ceiling).
3.  "General scaling" needs adjustment.

## Changes

### 1. Calmer Early Game (Supply)
*   **Base Spawn Rate**: Reduced from 2.5 to **2.0**.
*   **Early Game Spawn Multiplier**: Reduced from 0.9 to **0.6**.
    *   *Effect*: Effective spawn rate in first minute is 1.2 spawns/sec (was 2.25). This is nearly 50% fewer spawns.
*   **Early Game Duration**: Extended from 48s to **60s**.
    *   *Effect*: The "calm period" lasts the full first minute.
*   **Early Game Max Enemy Bonus**: Removed (0).
    *   *Effect*: No artificial inflation of the mob cap early on.

### 2. Higher Late Game Ceiling (Scaling)
*   **Base Max Enemies**: Increased from 80 to **150**.
    *   *Effect*: The potential "pool" of enemies is much larger.
*   **Hard Cap (Code)**: Increased from 100 to **300** in `EnemySpawner.js`.
    *   *Effect*: Allows the game to scale up to massive swarms in late game (if performance allows).
*   **Spawn Ramp Dampener**: Increased from 0.58 to **0.7**.
    *   *Effect*: The difficulty scales up *faster* after the early game protection wears off, bridging the gap between the quiet start and the chaotic end.

## Expected Outcome
*   **0-60s**: Very chill. Sparse enemies. Easy to pick off for early XP without pressure.
*   **60s-180s**: Ramp up is steeper than before. Density increases noticeably.
*   **3m+**: High density swarms (up to 150-300 mobs) for the "bullet hell" feel the user enjoys late game.

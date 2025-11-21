# Tuning V3 Notes: Supply-Side Nerfs

## Problem
User reported hitting Level 20 in ~1 minute and "too many mobs".
Previous tuning focused on increasing XP requirements (Demand), but the XP generation (Supply) was too high due to high spawn rates and high XP values.

## Changes

### 1. Mob Density Reduction (Supply)
*   **Base Spawn Rate**: Reduced from 3.5 to 2.5 enemies/sec.
*   **Max Enemies**: Reduced from 140 to 80 to prevent screen clutter and performance issues.
*   **Early Game Spawn Multiplier**: Removed (1.22 -> 1.0).

### 2. XP Generation Nerf (Supply)
*   **Global XP Value**: All enemies now drop ~60% less XP (Multiplier 0.4 applied globally).
*   **Early XP Boost**: Reduced from 1.8x to 1.2x.
*   **Wave Scaling**: Wave size bonus from player level reduced from 1.4x to 0.5x to prevent "rich get richer" feedback loop.

### 3. XP Curve Adjustment (Demand)
*   **Mid-Game Multiplier**: Adjusted to 1.15 (from 1.21) to compensate for the massive reduction in XP supply.
*   **Late-Game Multiplier**: Adjusted to 1.18 (from 1.25).

## Expected Outcome
*   **Pacing**: Level 20 should now take ~2.5 - 4.5 minutes for normal play (25-50 XP/s).
*   **Visuals**: Significantly fewer enemies on screen, reducing clutter and stacking.
*   **Performance**: Better framerate due to fewer entities.

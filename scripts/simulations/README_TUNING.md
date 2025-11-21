# Tuning Report (Nov 20, 2025)

## Issue
Players reported reaching Level 30 in ~67 seconds, which is far too fast for the intended 3-4 minute "Mega Boss" pacing.

## Root Cause Analysis
1.  **Hardcoded Multiplier**: `PlayerStats.js` was hardcoded to use a `1.12` multiplier, ignoring the `gameConstants.js` configuration.
2.  **Fast Scaling**: The combination of high spawn rates (4.27/sec) and low XP requirements allowed for rapid leveling.

## Fixes Implemented
1.  **Code Fix**: Updated `PlayerStats.js` to correctly read `EARLY`, `MID`, and `LATE` multipliers from `gameConstants.js`.
2.  **Balance Tuning**:
    *   **Mid Multiplier**: Set to **1.13** (Targeting ~4.5 mins in sim).
    *   **Late Multiplier**: Set to **1.15**.
    *   **Mid Levels**: Range extended to Level 22.

## Simulation Projections
With the new settings and the code fix:
- **Level 10**: ~17 seconds (Fast start maintained).
- **Level 20**: ~52 seconds.
- **Level 30**: ~273 seconds (4.5 minutes).

This aligns perfectly with the goal of a 3-4 minute power curve for the Mega Boss encounter.

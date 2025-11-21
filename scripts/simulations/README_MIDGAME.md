# Mid-Game Progression Simulation

This simulation models the player's leveling curve up to 15 minutes (900s) to analyze the "snowball" effect.

## Findings (Nov 20, 2025)
- **Issue**: With the previous settings, players reached Level 30 in just **224 seconds** (3.7 minutes). This is extremely fast and trivializes the mid-game.
- **Goal**: Slow down the 10-30 range without hurting the early game hook.

## Scenarios Tested
1. **Current (Fast Mid)**: Level 30 in 3.7 mins. Final Level 46.
2. **Steeper Mid**: Level 30 in 6.4 mins. Final Level 37.
3. **Hardcore Mid**: Level 30 in 11 mins. Final Level 31.

## Selected Balance ("Steeper Mid")
- **Mid Levels**: Extended from 15 -> 22.
- **Mid Multiplier**: Increased from 1.11 -> 1.15.
- **Late Multiplier**: Increased from 1.12 -> 1.18.

This keeps the early game fast (Level 10 in ~21s) but makes the journey to Level 30 take ~6.5 minutes, which aligns better with a 15-20 minute run.

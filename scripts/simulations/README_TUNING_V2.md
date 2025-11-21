# Tuning Report V2 (Nov 20, 2025)

## Issue
Playtesting revealed that Level 30 was reached in **65 seconds**, despite previous tuning. This indicates the player is generating XP at a rate of ~300 XP/sec (likely due to high mob density and efficient clearing), which is 3x higher than the previous model assumed.

## Simulation V2
I created `simulate_tuning_v2.js` to model this "High Intensity" scenario (300 XP/sec constant).

### Results
- **Current Settings (1.13 Mid)**: Level 30 in **55s**. (Matches playtest observation).
- **Aggressive Scaling (1.20 Mid)**: Level 30 in **176s** (3 mins).
- **Extreme Scaling (1.25 Mid)**: Level 30 in **384s** (6.4 mins).

## Selected Balance ("Aggressive+")
I selected a midpoint between Aggressive and Extreme to hit the ~4 minute target.

- **Mid Multiplier**: **1.21** (was 1.13).
- **Late Multiplier**: **1.25** (was 1.15).

### Projected Pacing (High Intensity)
- **Level 10**: ~3-5 seconds (Instant hook).
- **Level 20**: ~25 seconds.
- **Level 30**: ~200-240 seconds (**3.5 - 4 minutes**).

This ensures that even with screen-clearing weapons, the player won't max out their build in the first minute.

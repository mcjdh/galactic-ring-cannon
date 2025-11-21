# Progression Simulation

This simulation models the player's leveling curve during the first 5 minutes of gameplay.

## Purpose
To tune the "Time to Level X" metrics, ensuring the early game feels rewarding without making the mid-game trivial.

## Key Metrics
- **Time to Level 6**: The "Hook" phase. Should be < 30s for skilled players, < 60s for new players.
- **XP Rate**: How much XP is generated per second based on spawn rates and kill efficiency.

## Usage
`node scripts/simulations/simulate_progression.js`

## Configuration
Edit the `SCENARIOS` array in the script to test different balance values.

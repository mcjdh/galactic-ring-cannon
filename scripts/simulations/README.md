# Simulation Tools

This directory contains headless simulation scripts used to tune game balance and physics without running the full game.

## Available Simulations

### 1. Formation Integrity (`simulate_formations.js`)
Tests the stability of enemy formations under the influence of physics forces (repulsion, friction).
- **Goal**: Ensure formations don't break apart or stack.
- **Usage**: `node scripts/simulations/simulate_formations.js`
- **Output**: CSV data showing Average Error (deviation from slot) and Neighbor Distance.

### 2. Kill Zone Visualizer (`simulate_killzone.js`)
Visualizes the damage coverage of weapons.
- **Goal**: See the effective range and density of weapon upgrades.
- **Usage**: `node scripts/simulations/simulate_killzone.js`
- **Output**: ASCII Heatmap of damage density.

## How to Add New Simulations
1. Mock the necessary game components (Game, Entity, Physics).
2. Copy the *exact* logic you want to test from the source files (or require them if possible).
3. Run a loop for a fixed number of frames.
4. Output data to the console.

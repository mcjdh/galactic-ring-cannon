const fs = require('fs');
const path = require('path');

// Load game constants
const constantsPath = path.join(__dirname, '../../src/config/gameConstants.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Extract the config object
const configMatch = constantsContent.match(/const GAME_CONSTANTS = ({[\s\S]*?});/);
if (!configMatch) {
    console.error("Could not parse GAME_CONSTANTS");
    process.exit(1);
}

// Evaluate the config object safely
const GAME_CONSTANTS = eval('(' + configMatch[1] + ')');

// Override with V6 Proposed Settings
// Goal: "Big buff to first 3 levels, tiny buff to 4-9, normal rest"
// Strategy:
// 1. Drastically reduce INITIAL_XP_TO_LEVEL (e.g., 15).
// 2. Set EARLY_MULTIPLIER high enough that by Level 10 we are back to "normal".
// 3. Use EARLY_LEVELS = 9 to cover the "tiny buff" range.

GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL = 15; // Was 50. Instant Lvl 2.
GAME_CONSTANTS.PLAYER.LEVELING.EARLY_LEVELS = 9; // Was 7. Covers 1-9.
GAME_CONSTANTS.PLAYER.LEVELING.EARLY_MULTIPLIER = 1.35; // High multiplier to catch up from low base.
GAME_CONSTANTS.PLAYER.LEVELING.MID_MULTIPLIER = 1.15; // Standard mid-game.

// Remove time-based boost for this sim to isolate the curve
GAME_CONSTANTS.PLAYER.LEVELING.EARLY_XP_BOOST_MULTIPLIER = 1.0; 

class PlayerStats {
    constructor() {
        this.level = 1;
        this.currentXP = 0;
        this.xpToNextLevel = GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL;
        this.totalXP = 0;
    }

    addXP(amount) {
        this.currentXP += amount;
        this.totalXP += amount;
        while (this.currentXP >= this.xpToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.currentXP -= this.xpToNextLevel;
        this.level++;
        
        // Logic from PlayerStats.js
        const LV = GAME_CONSTANTS.PLAYER.LEVELING;
        let multiplier = LV.LATE_MULTIPLIER;
        
        if (this.level < LV.EARLY_LEVELS) {
            multiplier = LV.EARLY_MULTIPLIER;
        } else if (this.level < LV.MID_LEVELS) {
            multiplier = LV.MID_MULTIPLIER;
        }
        
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * multiplier);
    }
}

// Simulation Parameters
// Base Rate = 4 XP/s (Slow Start)
const XP_RATES = [
    { name: "Slow Start (4 XP/s)", rate: 4 },
    { name: "Average Start (8 XP/s)", rate: 8 }
];

const TARGET_LEVELS = [2, 3, 4, 5, 10, 20, 30];

console.log("=== XP TUNING SIMULATION V6 (Curve Reshape) ===");
console.log("Configuration:");
console.log(`Initial XP: ${GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL}`);
console.log(`Early Multiplier: ${GAME_CONSTANTS.PLAYER.LEVELING.EARLY_MULTIPLIER} (Levels 1-${GAME_CONSTANTS.PLAYER.LEVELING.EARLY_LEVELS})`);
console.log("------------------------------------------------");

XP_RATES.forEach(scenario => {
    console.log(`\nScenario: ${scenario.name}`);
    const stats = new PlayerStats();
    let seconds = 0;
    const timeToLevel = {};
    const xpReqs = {};

    // Simulate 5 minutes
    for (let t = 0; t < 300; t++) {
        stats.addXP(scenario.rate);
        seconds++;

        TARGET_LEVELS.forEach(target => {
            if (stats.level >= target && !timeToLevel[target]) {
                timeToLevel[target] = seconds;
                xpReqs[target] = stats.xpToNextLevel; // Capture req at this level
            }
        });
    }

    TARGET_LEVELS.forEach(target => {
        const time = timeToLevel[target];
        if (time) {
            console.log(`  Level ${target}: ${time}s`);
        } else {
            console.log(`  Level ${target}: Not reached in 5m (Current: ${stats.level})`);
        }
    });
});

// Print XP Requirements for verification
console.log("\nXP Requirements Check:");
let xp = GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL;
for(let i=1; i<=15; i++) {
    console.log(`Lvl ${i}->${i+1}: ${xp}`);
    const LV = GAME_CONSTANTS.PLAYER.LEVELING;
    let multiplier = LV.LATE_MULTIPLIER;
    if ((i+1) < LV.EARLY_LEVELS) multiplier = LV.EARLY_MULTIPLIER;
    else if ((i+1) < LV.MID_LEVELS) multiplier = LV.MID_MULTIPLIER;
    xp = Math.floor(xp * multiplier);
}

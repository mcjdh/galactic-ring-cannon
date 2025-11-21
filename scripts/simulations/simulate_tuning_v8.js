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

// Override with V8 Proposed Settings
// Goal: Slower leveling post-10.
GAME_CONSTANTS.PLAYER.LEVELING.MID_MULTIPLIER = 1.20; // Was 1.15
GAME_CONSTANTS.PLAYER.LEVELING.LATE_MULTIPLIER = 1.25; // Was 1.18

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
// Base Rate = 8 XP/s (Average Start) -> increasing to 15 XP/s (Mid Game) -> 30 XP/s (Late Game)
// We'll use a dynamic rate to simulate the increasing mob density
const SCENARIOS = [
    { name: "Standard Run", baseRate: 8, ramp: 0.05 } // Rate increases by 0.05 per second
];

const TARGET_LEVELS = [10, 15, 20, 25, 30];

console.log("=== XP TUNING SIMULATION V8 (Slower Mid-Game) ===");
console.log("Configuration:");
console.log(`Initial XP: ${GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL}`);
console.log(`Mid Multiplier: ${GAME_CONSTANTS.PLAYER.LEVELING.MID_MULTIPLIER} (Lvl 10-22)`);
console.log(`Late Multiplier: ${GAME_CONSTANTS.PLAYER.LEVELING.LATE_MULTIPLIER} (Lvl 22+)`);
console.log("------------------------------------------------");

SCENARIOS.forEach(scenario => {
    console.log(`\nScenario: ${scenario.name}`);
    const stats = new PlayerStats();
    let seconds = 0;
    let currentRate = scenario.baseRate;
    const timeToLevel = {};

    // Simulate 10 minutes
    for (let t = 0; t < 600; t++) {
        stats.addXP(currentRate);
        currentRate += scenario.ramp; // Mob density increases
        seconds++;

        TARGET_LEVELS.forEach(target => {
            if (stats.level >= target && !timeToLevel[target]) {
                timeToLevel[target] = seconds;
            }
        });
    }

    TARGET_LEVELS.forEach(target => {
        const time = timeToLevel[target];
        if (time) {
            console.log(`  Level ${target}: ${time}s (${(time/60).toFixed(1)}m)`);
        } else {
            console.log(`  Level ${target}: Not reached in 10m (Current: ${stats.level})`);
        }
    });
});

// Print XP Requirements for verification
console.log("\nXP Requirements Check (Lvl 10-25):");
let xp = GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL;
// Fast forward to lvl 9
for(let i=1; i<9; i++) {
    const LV = GAME_CONSTANTS.PLAYER.LEVELING;
    let multiplier = LV.LATE_MULTIPLIER;
    if ((i+1) < LV.EARLY_LEVELS) multiplier = LV.EARLY_MULTIPLIER;
    else if ((i+1) < LV.MID_LEVELS) multiplier = LV.MID_MULTIPLIER;
    xp = Math.floor(xp * multiplier);
}

for(let i=9; i<=25; i++) {
    console.log(`Lvl ${i}->${i+1}: ${xp}`);
    const LV = GAME_CONSTANTS.PLAYER.LEVELING;
    let multiplier = LV.LATE_MULTIPLIER;
    if ((i+1) < LV.EARLY_LEVELS) multiplier = LV.EARLY_MULTIPLIER;
    else if ((i+1) < LV.MID_LEVELS) multiplier = LV.MID_MULTIPLIER;
    xp = Math.floor(xp * multiplier);
}

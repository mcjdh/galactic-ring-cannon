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

// Mock PlayerStats
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
        this.xpToNextLevel = Math.floor(this.calculateXPForLevel(this.level));
    }

    calculateXPForLevel(level) {
        const LV = GAME_CONSTANTS.PLAYER.LEVELING;
        
        // Base geometric progression
        let multiplier = GAME_CONSTANTS.PLAYER.XP_SCALING_FACTOR;
        
        // Piecewise scaling
        if (level <= LV.EARLY_LEVELS) {
            multiplier = LV.EARLY_MULTIPLIER;
        } else if (level <= LV.MID_LEVELS) {
            multiplier = LV.MID_MULTIPLIER;
        } else {
            multiplier = LV.LATE_MULTIPLIER;
        }

        return Math.floor(GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL * Math.pow(multiplier, level - 1));
    }
}

// Simulation Parameters
const XP_RATES = [
    { name: "New Balanced Flow (25 XP/s)", rate: 25 },
    { name: "High Intensity (50 XP/s)", rate: 50 },
    { name: "Extreme Swarm (100 XP/s)", rate: 100 }
];

const TARGET_LEVELS = [10, 20, 30];

console.log("=== XP TUNING SIMULATION V3 (Post-Nerf) ===");
console.log("Configuration:");
console.log(`Initial XP: ${GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL}`);
console.log(`Multipliers: Early ${GAME_CONSTANTS.PLAYER.LEVELING.EARLY_MULTIPLIER}, Mid ${GAME_CONSTANTS.PLAYER.LEVELING.MID_MULTIPLIER}, Late ${GAME_CONSTANTS.PLAYER.LEVELING.LATE_MULTIPLIER}`);
console.log("------------------------------------------------");

XP_RATES.forEach(scenario => {
    console.log(`\nScenario: ${scenario.name}`);
    const stats = new PlayerStats();
    let seconds = 0;
    const timeToLevel = {};

    // Simulate 10 minutes
    for (let t = 0; t < 600; t++) {
        stats.addXP(scenario.rate);
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

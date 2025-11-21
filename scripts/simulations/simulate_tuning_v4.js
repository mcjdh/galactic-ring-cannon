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

// Override with V4 Proposed Settings
GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL = 45;
GAME_CONSTANTS.PLAYER.LEVELING.EARLY_XP_BOOST_MULTIPLIER = 2.0;
// Note: Spawn multiplier affects rate, which we model via input rate

class PlayerStats {
    constructor() {
        this.level = 1;
        this.currentXP = 0;
        this.xpToNextLevel = GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL;
        this.totalXP = 0;
    }

    addXP(amount, time) {
        // Apply Early XP Boost
        let finalAmount = amount;
        if (time < GAME_CONSTANTS.PLAYER.LEVELING.EARLY_XP_BOOST_DURATION) {
            finalAmount *= GAME_CONSTANTS.PLAYER.LEVELING.EARLY_XP_BOOST_MULTIPLIER;
        }

        this.currentXP += finalAmount;
        this.totalXP += finalAmount;
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
// Base Rate = Raw XP from kills before boost
// If user was getting ~4.3 XP/s with 1.2x boost, their base was ~3.6 XP/s.
// With 1.15x spawn buff, base becomes ~4.1 XP/s.
const XP_RATES = [
    { name: "Slow Start (4 XP/s Base)", rate: 4 },
    { name: "Average Start (8 XP/s Base)", rate: 8 },
    { name: "Good Start (12 XP/s Base)", rate: 12 }
];

const TARGET_LEVELS = [2, 3, 4, 5, 10];

console.log("=== XP TUNING SIMULATION V4 (Early Game Buff) ===");
console.log("Configuration:");
console.log(`Initial XP: ${GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL}`);
console.log(`Early Boost: ${GAME_CONSTANTS.PLAYER.LEVELING.EARLY_XP_BOOST_MULTIPLIER}x for ${GAME_CONSTANTS.PLAYER.LEVELING.EARLY_XP_BOOST_DURATION}s`);
console.log("------------------------------------------------");

XP_RATES.forEach(scenario => {
    console.log(`\nScenario: ${scenario.name}`);
    const stats = new PlayerStats();
    let seconds = 0;
    const timeToLevel = {};

    // Simulate 2 minutes
    for (let t = 0; t < 120; t++) {
        stats.addXP(scenario.rate, t);
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
            console.log(`  Level ${target}: ${time}s`);
        } else {
            console.log(`  Level ${target}: Not reached in 2m (Current: ${stats.level})`);
        }
    });
});

const fs = require('fs');

// --- Configuration ---

const CONFIG = {
    INITIAL_XP_TO_LEVEL: 140,
    LEVELING: {
        EARLY_LEVELS: 7,
        EARLY_MULTIPLIER: 1.08,
        MID_LEVELS: 15,
        MID_MULTIPLIER: 1.11,
        LATE_MULTIPLIER: 1.12,
        EARLY_XP_BOOST_DURATION: 60,
        EARLY_XP_BOOST_MULTIPLIER: 1.5
    },
    ENEMIES: {
        BASE_SPAWN_RATE: 3.5,
        EARLY_GAME_SPAWN_MULTIPLIER: 1.22,
        EARLY_GAME_DURATION: 48,
        BASIC_XP_VALUE: 10,
        MAX_ENEMIES: 40 // Cap from EnemySpawner
    }
};

// --- Simulation State ---

let state = {
    time: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: CONFIG.INITIAL_XP_TO_LEVEL,
    totalKills: 0,
    totalXP: 0,
    activeEnemies: 0
};

// --- Helpers ---

function getXPMultiplier(time) {
    if (time <= CONFIG.LEVELING.EARLY_XP_BOOST_DURATION) {
        return CONFIG.LEVELING.EARLY_XP_BOOST_MULTIPLIER;
    }
    // Ease out over 30s
    const easeDuration = 30;
    const timePast = time - CONFIG.LEVELING.EARLY_XP_BOOST_DURATION;
    if (timePast < easeDuration) {
        const t = timePast / easeDuration;
        const mult = CONFIG.LEVELING.EARLY_XP_BOOST_MULTIPLIER;
        return mult - (mult - 1.0) * t;
    }
    return 1.0;
}

function getSpawnRate(time) {
    let rate = CONFIG.ENEMIES.BASE_SPAWN_RATE;
    if (time <= CONFIG.ENEMIES.EARLY_GAME_DURATION) {
        rate *= CONFIG.ENEMIES.EARLY_GAME_SPAWN_MULTIPLIER;
    }
    return rate;
}

function getNextLevelXP(currentLevel, currentReq) {
    let mult = CONFIG.LEVELING.LATE_MULTIPLIER;
    if (currentLevel < CONFIG.LEVELING.EARLY_LEVELS) {
        mult = CONFIG.LEVELING.EARLY_MULTIPLIER;
    } else if (currentLevel < CONFIG.LEVELING.MID_LEVELS) {
        mult = CONFIG.LEVELING.MID_MULTIPLIER;
    }
    return Math.floor(currentReq * mult);
}

// --- Scenarios ---

const DT = 1.0; // 1 second steps
const MAX_TIME = 900; // 15 minutes
// Simulate player power growing: Kills/sec increases by 0.1 every level
const BASE_KILLS_PER_SEC = 2.0; 

const SCENARIOS = [
    { 
        name: 'Current (Fast Mid)', 
        xpReq: 80, 
        midMult: 1.11, 
        lateMult: 1.12,
        midLevels: 15
    },
    { 
        name: 'Steeper Mid', 
        xpReq: 80, 
        midMult: 1.15, // Increased from 1.11
        lateMult: 1.18, // Increased from 1.12
        midLevels: 20   // Extended mid-game phase
    },
    { 
        name: 'Hardcore Mid', 
        xpReq: 80, 
        midMult: 1.20, 
        lateMult: 1.25,
        midLevels: 25
    }
];

function runScenario(scenario) {
    // Reset State
    state = {
        time: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: scenario.xpReq,
        totalKills: 0,
        totalXP: 0,
        activeEnemies: 0
    };

    // Override Config
    const currentConfig = JSON.parse(JSON.stringify(CONFIG));
    currentConfig.INITIAL_XP_TO_LEVEL = scenario.xpReq;
    currentConfig.LEVELING.MID_MULTIPLIER = scenario.midMult;
    currentConfig.LEVELING.LATE_MULTIPLIER = scenario.lateMult;
    currentConfig.LEVELING.MID_LEVELS = scenario.midLevels;

    const milestones = {
        lvl10: null,
        lvl20: null,
        lvl30: null,
        finalLevel: 0
    };

    // Run Loop
    for (let t = 0; t <= MAX_TIME; t += DT) {
        state.time = t;

        // 1. Calculate Potential Spawns
        let rate = currentConfig.ENEMIES.BASE_SPAWN_RATE;
        if (t <= currentConfig.ENEMIES.EARLY_GAME_DURATION) {
            rate *= currentConfig.ENEMIES.EARLY_GAME_SPAWN_MULTIPLIER;
        }
        // Ramp up spawn rate over time (difficulty scaling)
        rate *= (1 + t / 300); // +100% every 5 mins

        let potentialSpawns = rate * DT;

        // 2. Apply Cap
        const spaceAvailable = currentConfig.ENEMIES.MAX_ENEMIES - state.activeEnemies;
        const actualSpawns = Math.min(potentialSpawns, spaceAvailable);
        state.activeEnemies += actualSpawns;

        // 3. Kill Enemies (Player gets stronger)
        // Simple model: Player kills X + (Level * 0.2) enemies per second
        const playerPower = BASE_KILLS_PER_SEC + (state.level * 0.25);
        const kills = Math.min(state.activeEnemies, playerPower * DT);
        
        state.activeEnemies -= kills;
        state.totalKills += kills;

        // 4. Collect XP
        let xpMult = 1.0;
        if (t <= currentConfig.LEVELING.EARLY_XP_BOOST_DURATION) {
            xpMult = currentConfig.LEVELING.EARLY_XP_BOOST_MULTIPLIER;
        }
        const xpPerEnemy = currentConfig.ENEMIES.BASIC_XP_VALUE * xpMult;
        const xpGained = kills * xpPerEnemy;
        
        state.xp += xpGained;
        state.totalXP += xpGained;

        // 5. Level Up
        while (state.xp >= state.xpToNextLevel) {
            state.xp -= state.xpToNextLevel;
            state.level++;
            
            // Recalculate next level req
            let mult = currentConfig.LEVELING.LATE_MULTIPLIER;
            if (state.level < currentConfig.LEVELING.EARLY_LEVELS) {
                mult = currentConfig.LEVELING.EARLY_MULTIPLIER;
            } else if (state.level < currentConfig.LEVELING.MID_LEVELS) {
                mult = currentConfig.LEVELING.MID_MULTIPLIER;
            }
            state.xpToNextLevel = Math.floor(state.xpToNextLevel * mult);
        }

        // Record Milestones
        if (state.level >= 10 && !milestones.lvl10) milestones.lvl10 = t;
        if (state.level >= 20 && !milestones.lvl20) milestones.lvl20 = t;
        if (state.level >= 30 && !milestones.lvl30) milestones.lvl30 = t;
    }
    milestones.finalLevel = state.level;
    return milestones;
}

console.log('Scenario,Lvl 10 (s),Lvl 20 (s),Lvl 30 (s),Final Level (15m)');
SCENARIOS.forEach(s => {
    const m = runScenario(s);
    console.log(`${s.name},${m.lvl10 || '-'},${m.lvl20 || '-'},${m.lvl30 || '-'},${m.finalLevel}`);
});

/*
console.log('Time(s),Level,XP,XP_Req,Kills,ActiveEnemies,SpawnRate');
// ... old loop ...
*/

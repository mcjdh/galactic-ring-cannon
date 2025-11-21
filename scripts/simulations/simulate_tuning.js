
const fs = require('fs');

// --- Configuration ---
// These match the current gameConstants.js
const CONFIG = {
    INITIAL_XP_TO_LEVEL: 80,
    LEVELING: {
        EARLY_LEVELS: 7,
        EARLY_MULTIPLIER: 1.08,
        MID_LEVELS: 22,
        MID_MULTIPLIER: 1.15,
        LATE_MULTIPLIER: 1.18,
        EARLY_XP_BOOST_DURATION: 60,
        EARLY_XP_BOOST_MULTIPLIER: 1.8
    },
    ENEMIES: {
        BASE_SPAWN_RATE: 3.5,
        EARLY_GAME_SPAWN_MULTIPLIER: 1.22,
        EARLY_GAME_DURATION: 48,
        BASIC_XP_VALUE: 10,
        MAX_ENEMIES: 100
    }
};

// --- Scenarios ---
const SCENARIOS = [
    { 
        name: 'Current (Steeper Mid)', 
        midMult: 1.15, 
        lateMult: 1.18 
    },
    { 
        name: 'Target Tuned', 
        midMult: 1.13, 
        lateMult: 1.15 
    },
    { 
        name: 'Fast Mid', 
        midMult: 1.11, 
        lateMult: 1.12 
    }
];

// --- Simulation Logic ---

function runScenario(scenario) {
    // Override Config
    const C = JSON.parse(JSON.stringify(CONFIG));
    C.LEVELING.MID_MULTIPLIER = scenario.midMult;
    C.LEVELING.LATE_MULTIPLIER = scenario.lateMult;

    let state = {
        time: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: C.INITIAL_XP_TO_LEVEL,
        activeEnemies: 0
    };

    const milestones = { lvl10: 0, lvl20: 0, lvl30: 0 };
    const DT = 1.0;
    const MAX_TIME = 600; // 10 mins

    for (let t = 0; t <= MAX_TIME; t += DT) {
        // Spawn
        let rate = C.ENEMIES.BASE_SPAWN_RATE;
        if (t <= C.ENEMIES.EARLY_GAME_DURATION) rate *= C.ENEMIES.EARLY_GAME_SPAWN_MULTIPLIER;
        rate *= (1 + t / 300); // Difficulty ramp

        const potential = rate * DT;
        const space = C.ENEMIES.MAX_ENEMIES - state.activeEnemies;
        state.activeEnemies += Math.min(potential, space);

        // Kill (Player Power Curve)
        // Level 1: 2 kills/sec -> Level 30: 9.5 kills/sec
        const killsPerSec = 2.0 + (state.level * 0.25);
        const kills = Math.min(state.activeEnemies, killsPerSec * DT);
        state.activeEnemies -= kills;

        // XP
        let xpMult = 1.0;
        if (t <= C.LEVELING.EARLY_XP_BOOST_DURATION) xpMult = C.LEVELING.EARLY_XP_BOOST_MULTIPLIER;
        
        const xpGained = kills * C.ENEMIES.BASIC_XP_VALUE * xpMult;
        state.xp += xpGained;

        // Level Up
        while (state.xp >= state.xpToNextLevel) {
            state.xp -= state.xpToNextLevel;
            state.level++;

            let mult = C.LEVELING.LATE_MULTIPLIER;
            if (state.level < C.LEVELING.EARLY_LEVELS) mult = C.LEVELING.EARLY_MULTIPLIER;
            else if (state.level < C.LEVELING.MID_LEVELS) mult = C.LEVELING.MID_MULTIPLIER;
            
            state.xpToNextLevel = Math.floor(state.xpToNextLevel * mult);
        }

        if (state.level >= 10 && !milestones.lvl10) milestones.lvl10 = t;
        if (state.level >= 20 && !milestones.lvl20) milestones.lvl20 = t;
        if (state.level >= 30 && !milestones.lvl30) milestones.lvl30 = t;
    }

    return milestones;
}

console.log('Scenario,Lvl 10 (s),Lvl 20 (s),Lvl 30 (s)');
SCENARIOS.forEach(s => {
    const m = runScenario(s);
    console.log(`${s.name},${m.lvl10},${m.lvl20},${m.lvl30}`);
});


const fs = require('fs');

// --- Configuration ---
const CONFIG = {
    INITIAL_XP_TO_LEVEL: 80,
    LEVELING: {
        EARLY_LEVELS: 7,
        EARLY_MULTIPLIER: 1.08,
        MID_LEVELS: 22,
        MID_MULTIPLIER: 1.13,
        LATE_MULTIPLIER: 1.15,
        EARLY_XP_BOOST_DURATION: 60,
        EARLY_XP_BOOST_MULTIPLIER: 1.8
    },
    ENEMIES: {
        BASIC_XP_VALUE: 10
    }
};

// --- Scenarios ---
const SCENARIOS = [
    { 
        name: 'Current Settings', 
        midMult: 1.13, 
        lateMult: 1.15,
        xpRate: 300 // User observed ~300 XP/sec implied by 65s lvl 30
    },
    { 
        name: 'Aggressive Scaling', 
        midMult: 1.20, 
        lateMult: 1.25,
        xpRate: 300 
    },
    { 
        name: 'Extreme Scaling', 
        midMult: 1.25, 
        lateMult: 1.30,
        xpRate: 300 
    }
];

function runScenario(scenario) {
    const C = JSON.parse(JSON.stringify(CONFIG));
    C.LEVELING.MID_MULTIPLIER = scenario.midMult;
    C.LEVELING.LATE_MULTIPLIER = scenario.lateMult;

    let state = {
        time: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: C.INITIAL_XP_TO_LEVEL
    };

    const milestones = { lvl10: 0, lvl20: 0, lvl30: 0 };
    const DT = 1.0;
    const MAX_TIME = 600;

    for (let t = 0; t <= MAX_TIME; t += DT) {
        // XP Gain (Constant high rate to match user report)
        // We assume the user is clearing screens efficiently
        const xpGained = scenario.xpRate * DT;
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

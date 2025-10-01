(function() {
    const GAME_CONSTANTS = {
        // Player Configuration
        PLAYER: {
            BASE_SPEED: 220,
            BASE_HEALTH: 120,
            BASE_ATTACK_SPEED: 1.2,
            BASE_ATTACK_DAMAGE: 25,
            BASE_ATTACK_RANGE: 300,
            BASE_PROJECTILE_SPEED: 450,
            BASE_CRIT_CHANCE: 0.10,
            BASE_CRIT_MULTIPLIER: 2.2,
            BASE_MAGNET_RANGE: 120,

            // Dodge System
            DODGE_COOLDOWN: 2.0,
            DODGE_DURATION: 0.3,
            DODGE_SPEED: 600,
            INVULNERABILITY_TIME: 0.5,

            // XP System (early-game friendlier)
            INITIAL_XP_TO_LEVEL: 140,
            XP_SCALING_FACTOR: 1.12, // fallback; see LEVELING for piecewise
            LEVEL_UP_HEAL_PERCENT: 0.3,
            LEVELING: {
                EARLY_LEVELS: 7,
                EARLY_MULTIPLIER: 1.08,
                MID_LEVELS: 15,
                MID_MULTIPLIER: 1.11,
                LATE_MULTIPLIER: 1.12,
                EARLY_XP_BOOST_DURATION: 60, // seconds
                EARLY_XP_BOOST_MULTIPLIER: 1.5
            }
        },

        // Enemy Configuration
        ENEMIES: {
            SPAWN_DISTANCE_MIN: 400,
            SPAWN_DISTANCE_MAX: 800,
            BASE_SPAWN_RATE: 1.1,
            BASE_MAX_ENEMIES: 50,
            ELITE_CHANCE_BASE: 0.06,
            ELITE_HEALTH_MULTIPLIER: 2.5,
            ELITE_DAMAGE_MULTIPLIER: 1.5,

            // Boss System
            BOSS_HEAL_BONUS: 0.15,
            BOSS_INVULNERABILITY_REWARD: 2.0
        },

        // Difficulty Scaling
        DIFFICULTY: {
            BASE_FACTOR: 1.0,
            MAX_FACTOR: 4.0,
            SCALING_INTERVAL: 20,
            SCALING_MULTIPLIER: 1.12,

            LOW_HEALTH_THRESHOLD: 0.3,
            LOW_HEALTH_SCALING_REDUCTION: 0.85,
            HIGH_LEVEL_THRESHOLD: 10,
            HIGH_LEVEL_SCALING_INCREASE: 1.05
        },

        // Game Modes
        GAME: {
            WIN_TIME: 180 // 3 minutes
        }
    };

    const GameMath = {
        xpForLevel(level) {
            const LV = GAME_CONSTANTS.PLAYER.LEVELING || {};
            const earlyLevels = LV.EARLY_LEVELS ?? 7;
            const midLevels = LV.MID_LEVELS ?? 15;
            const earlyMult = LV.EARLY_MULTIPLIER ?? 1.08;
            const midMult = LV.MID_MULTIPLIER ?? 1.11;
            const lateMult = LV.LATE_MULTIPLIER ?? GAME_CONSTANTS.PLAYER.XP_SCALING_FACTOR;
            let totalXP = 0;
            let currentRequirement = GAME_CONSTANTS.PLAYER.INITIAL_XP_TO_LEVEL;
            for (let i = 1; i < level; i++) {
                totalXP += currentRequirement;
                const next = i + 1;
                if (next <= earlyLevels) {
                    currentRequirement = Math.floor(currentRequirement * earlyMult);
                } else if (next <= midLevels) {
                    currentRequirement = Math.floor(currentRequirement * midMult);
                } else {
                    currentRequirement = Math.floor(currentRequirement * lateMult);
                }
            }
            return totalXP;
        },

        scaledEnemyCount(baseCount, difficultyFactor, gameTime) {
            const timeMinutes = gameTime / 60;
            const timeFactor = 1 + (timeMinutes * 0.1);
            return Math.floor(baseCount * difficultyFactor * timeFactor);
        },

        earlyXPBoostMultiplier(gameTime) {
            const LV = GAME_CONSTANTS.PLAYER.LEVELING || {};
            const duration = LV.EARLY_XP_BOOST_DURATION ?? 0;
            const mult = LV.EARLY_XP_BOOST_MULTIPLIER ?? 1.0;
            if (duration <= 0) return 1.0;
            if (gameTime <= duration) return mult;
            // Ease-out from boost to 1.0 over next 30s
            const t = Math.min(1, (gameTime - duration) / 30);
            return mult - (mult - 1.0) * t;
        }
    };

    if (typeof window !== 'undefined') {
        window.GAME_CONSTANTS = GAME_CONSTANTS;
        window.GameMath = GameMath;
        (window.logger?.log || console.log)('GameConstants loaded');
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            GAME_CONSTANTS,
            GameMath
        };
    }
})();

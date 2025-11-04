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
            RADIUS: 20,
            DAMAGE_INTAKE_MULTIPLIER: 2.0,
            CLASS_COLORS: {
                default: {
                    core: '#00aaff',
                    glow: '#00ffff'
                },
                aegis_vanguard: {
                    core: '#3cb371',
                    glow: '#7fffd4'
                },
                nova_corsair: {
                    core: '#ff6347',
                    glow: '#ffd700'
                },
                stormcaller: {
                    core: '#8a2be2',
                    glow: '#da70d6'
                }
            },

            // Combat Scaling & Limits
            AOE_ATTACK_RANGE: 150,
            AOE_DAMAGE_MULTIPLIER: 0.6,
            MAX_PROJECTILE_SPEED: 1200,
            MIN_ATTACK_SPEED: 0.1,
            CRIT_SOFT_CAP: 0.8, // 80% maximum

            // Dodge System
            DODGE_COOLDOWN: 2.0,
            DODGE_DURATION: 0.3,
            DODGE_SPEED: 600,
            INVULNERABILITY_TIME: 0.5,

            // Kill Streak
            KILL_STREAK_TIMEOUT: 5.0,

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
            BASE_SPAWN_RATE: 2.2,
            BASE_MAX_ENEMIES: 90,
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
        },

        // Visual Effects
        EFFECTS: {
            SCREEN_SHAKE_LEVELUP: 2,
            SCREEN_SHAKE_DURATION: 0.2,
            AUDIO_VOLUME_LEVELUP: 0.3,
            AUDIO_VOLUME_SHOOT: 0.3,
            AUDIO_VOLUME_HIT: 0.2,
            AUDIO_VOLUME_AOE: 0.4
        },

        // Special Abilities
        ABILITIES: {
            CHAIN_LIGHTNING_CHANCE: 0.4,
            CHAIN_LIGHTNING_RANGE: 240,
            CHAIN_LIGHTNING_DAMAGE_MULTIPLIER: 0.8,

            EXPLOSIVE_CHANCE: 0.3,
            EXPLOSIVE_DAMAGE_MULTIPLIER: 0.85,

            RICOCHET_CHANCE: 0.25,
            RICOCHET_RANGE: 260,

            HOMING_CHANCE: 0.2
        },

        // Performance
        PERFORMANCE: {
            MAX_ENTITIES: 2000,
            MAX_PARTICLES: 150,
            SPATIAL_GRID_SIZE: 100,
            TARGET_FPS: 60,
            LOW_FPS_THRESHOLD: 30
        },

        // Colors (for consistency)
        COLORS: {
            PLAYER: '#3498db',
            PLAYER_GLOW: 'rgba(52, 152, 219, 0.5)',
            HEAL: '#2ecc71',
            DAMAGE: '#e74c3c',
            LEVEL_UP: '#f39c12',
            XP_ORB: '#f39c12',
            SUMMONER: 'rgba(187, 107, 217, 0.85)',
            SUMMONER_GLOW: 'rgba(187, 107, 217, 0.5)',
            SUMMONER_TEXT: 'rgba(187, 107, 217, 0.9)'
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

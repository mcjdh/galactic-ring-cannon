/**
 * 🌊 UNIFIED DIFFICULTY MANAGER - Resonant Multi-Agent Architecture
 * [A] RESONANT NOTE: Extracted from massive GameManager.js (2,400+ lines)
 * Handles all difficulty scaling, progression curves, and adaptive balancing
 * 
 * Single responsibility: Manage game difficulty progression and scaling
 * Provides intelligent scaling based on player performance and time
 */

class DifficultyManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Get GAME_CONSTANTS from global scope
        const GAME_CONSTANTS = window.GAME_CONSTANTS || {
            DIFFICULTY: { BASE_INTERVAL: 20, MAX_FACTOR: 4.0 }
        };
        
        // Core difficulty system
        this.difficultyFactor = 1.0;
        this.difficultyTimer = 0;
        this.difficultyInterval = GAME_CONSTANTS.DIFFICULTY.BASE_INTERVAL || 20; // 20 seconds
        this.maxDifficultyFactor = GAME_CONSTANTS.DIFFICULTY.MAX_FACTOR || 4.0; // 4.0
        
        // Adaptive difficulty system
        this.playerPerformanceScore = 0;
        this.performanceHistory = [];
        this.maxPerformanceHistory = 10;
        
        // Enemy scaling parameters
        this.enemyHealthMultiplier = 1.0;
        this.enemyDamageMultiplier = 1.0;
        this.enemySpeedMultiplier = 1.0;
        this.enemySpawnRateMultiplier = 1.0;
        
        // Boss scaling parameters
        this.bossScalingFactor = 1.0;
        this.bossCount = 0;
        // Note: Mega boss interval is now configured in GAME_CONSTANTS.BOSSES
        
        // Curve parameters for smooth scaling (balanced for 1-3 minute runs)
        this.scalingCurves = {
            health: { base: 1.0, growth: 0.35, cap: 2.5 },     // Reduced from 0.5 to 0.35
            damage: { base: 1.0, growth: 0.30, cap: 2.0 },     // Reduced from 0.4 to 0.30
            speed: { base: 1.0, growth: 0.15, cap: 1.4 },      // Reduced from 0.2 to 0.15
            spawnRate: { base: 1.0, growth: 0.30, cap: 1.5 }   // Reduced from 0.4 to 0.30
        };
        
        // Performance tracking
        this.lastDifficultyIncrease = 0;
        this.difficultyNotificationCooldown = 5.0; // seconds
        this.lastNotification = 0;
        
    }
    
    /**
     * Main difficulty update loop
     */
    update(deltaTime) {
        // Update timers
        this.difficultyTimer += deltaTime;
        this.lastNotification += deltaTime;
        
        // Check for difficulty increases
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.increaseDifficulty();
            this.difficultyTimer = 0;
        }
        
        // Update player performance tracking
        this.updatePlayerPerformance();
        
        // Apply adaptive difficulty adjustments
        this.applyAdaptiveDifficulty();
        
        // Update scaling multipliers
        this.updateScalingMultipliers();
    }
    
    /**
     * Increase base difficulty level
     */
    increaseDifficulty() {
        const oldFactor = this.difficultyFactor;
        
        // Calculate new difficulty factor
        const timeMinutes = this.gameManager.gameTime / 60;
        const baseIncrease = 0.2; // Base 20% increase
        
        // Accelerated scaling for shorter games
        const timeMultiplier = Math.min(2.0, 1 + (timeMinutes * 0.1));
        const actualIncrease = baseIncrease * timeMultiplier;
        
        this.difficultyFactor = Math.min(this.maxDifficultyFactor, this.difficultyFactor + actualIncrease);
        
        // Show difficulty notification
        this.showDifficultyNotification(oldFactor);
        
        // Update last increase time
        this.lastDifficultyIncrease = this.gameManager.gameTime;
        
        // Trigger adaptive scaling
        this.recalculateScaling();
    }
    
    /**
     * Update player performance tracking
     */
    updatePlayerPerformance() {
        if (!this.gameManager.game.player) return;
        
        const player = this.gameManager.game.player;
        const currentTime = this.gameManager.gameTime;
        
        // Calculate performance metrics
        const killsPerMinute = this.gameManager.killCount / Math.max(1, currentTime / 60);
        const healthPercent = player.health / player.maxHealth;
        const levelProgress = player.level;
        
        // Combined performance score (0-100)
        const performanceScore = Math.min(100, 
            (killsPerMinute * 2) + 
            (healthPercent * 20) + 
            (levelProgress * 5)
        );
        
        // Add to history
        this.performanceHistory.push({
            time: currentTime,
            score: performanceScore,
            killsPerMinute: killsPerMinute,
            healthPercent: healthPercent,
            level: levelProgress
        });
        
        // Maintain history size
        if (this.performanceHistory.length > this.maxPerformanceHistory) {
            this.performanceHistory.shift();
        }
        
        // Calculate average performance
        this.playerPerformanceScore = this.performanceHistory.reduce((sum, entry) => sum + entry.score, 0) / this.performanceHistory.length;
    }
    
    /**
     * Apply adaptive difficulty adjustments
     */
    applyAdaptiveDifficulty() {
        if (this.performanceHistory.length < 3) return; // Need some history
        
        const targetPerformance = 60; // Target 60% performance score
        const performanceDelta = this.playerPerformanceScore - targetPerformance;
        
        // Adaptive scaling factor (-0.2 to +0.2)
        const adaptiveAdjustment = Math.max(-0.2, Math.min(0.2, performanceDelta / 100));
        
        // Apply gentle adaptive scaling
        const adaptiveFactor = 1.0 + (adaptiveAdjustment * 0.1); // Max 2% adjustment
        
        // Store adaptive factor for use in scaling calculations
        this.adaptiveScalingFactor = adaptiveFactor;
    }
    
    /**
     * Update all scaling multipliers
     */
    updateScalingMultipliers() {
        const baseFactor = this.difficultyFactor;
        const adaptiveFactor = this.adaptiveScalingFactor || 1.0;
        
        // Calculate multipliers using smooth curves
        this.enemyHealthMultiplier = this.calculateScaledValue('health', baseFactor) * adaptiveFactor;
        this.enemyDamageMultiplier = this.calculateScaledValue('damage', baseFactor) * adaptiveFactor;
        this.enemySpeedMultiplier = this.calculateScaledValue('speed', baseFactor) * adaptiveFactor;
        this.enemySpawnRateMultiplier = this.calculateScaledValue('spawnRate', baseFactor) * adaptiveFactor;
        
        // Boss scaling is more conservative
        this.bossScalingFactor = 1.0 + ((baseFactor - 1.0) * 0.8) * adaptiveFactor;
    }
    
    /**
     * Calculate scaled value using smooth curve
     */
    calculateScaledValue(curveType, difficultyFactor) {
        const curve = this.scalingCurves[curveType];
        if (!curve) return 1.0;
        
        // Smooth exponential curve: base + (growth * (factor - 1)^0.8)
        const scaledIncrease = curve.growth * Math.pow(difficultyFactor - 1.0, 0.8);
        const result = curve.base + scaledIncrease;
        
        return Math.min(curve.cap, result);
    }
    
    /**
     * Recalculate all scaling after difficulty change
     */
    recalculateScaling() {
        this.updateScalingMultipliers();
        
        // Notify other systems of difficulty change
        if (this.gameManager.enemySpawner && this.gameManager.enemySpawner.onDifficultyChange) {
            this.gameManager.enemySpawner.onDifficultyChange(this.difficultyFactor);
        }
    }
    
    /**
     * Show difficulty increase notification
     */
    showDifficultyNotification(oldFactor) {
        if (this.lastNotification < this.difficultyNotificationCooldown) return;
        
        const difficultyIncrease = this.difficultyFactor - oldFactor;
        
        // Only show significant increases
        if (difficultyIncrease >= 0.15 && Math.floor(this.difficultyFactor * 10) % 5 === 0) {
            const player = this.gameManager.game.player;
            if (player && this.gameManager.effectsManager) {
                this.gameManager.effectsManager.showCombatText(
                    `Difficulty Increased! (x${this.difficultyFactor.toFixed(1)})`,
                    player.x, player.y - 70,
                    'critical', 20
                );
                
                // Add screen shake for dramatic effect
                this.gameManager.effectsManager.addScreenShake(3, 0.3);
            }
            
            this.lastNotification = 0;
        }
    }
    
    /**
     * Apply difficulty scaling to an enemy
     */
    scaleEnemy(enemy) {
        if (!enemy) return;
        
        // Store original values if not already stored
        if (!enemy.originalStats) {
            enemy.originalStats = {
                health: enemy.health,
                maxHealth: enemy.maxHealth,
                damage: enemy.damage,
                speed: enemy.baseSpeed || enemy.speed,
                xpValue: enemy.xpValue
            };
        }
        
        // Apply scaling
        const healthScale = this.enemyHealthMultiplier;
        const damageScale = this.enemyDamageMultiplier;
        const speedScale = this.enemySpeedMultiplier;
        
        enemy.maxHealth = Math.ceil(enemy.originalStats.maxHealth * healthScale);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.ceil(enemy.originalStats.damage * damageScale);
        
        // Apply speed scaling if enemy has movement component
        if (enemy.movement && enemy.movement.configureForEnemyType) {
            enemy.movement.speed = enemy.originalStats.speed * speedScale;
        } else if (enemy.speed !== undefined) {
            enemy.speed = enemy.originalStats.speed * speedScale;
        }
        
        // Scale XP reward proportionally to difficulty
        const xpScale = 1.0 + ((healthScale - 1.0) * 0.7); // XP scales 70% of health scaling
        enemy.xpValue = Math.ceil(enemy.originalStats.xpValue * xpScale);
        
        // Apply time-based late-game scaling
        this.applyLateGameScaling(enemy);
    }
    
    /**
     * Apply late-game scaling for sustained challenge
     */
    applyLateGameScaling(enemy) {
        const gameMinutes = this.gameManager.gameTime / 60;
        
        if (gameMinutes > 5) {
            // Additional scaling after 5 minutes
            const lateGameFactor = Math.min(1.5, 1 + ((gameMinutes - 5) * 0.05));
            enemy.maxHealth = Math.ceil(enemy.maxHealth * lateGameFactor);
            enemy.health = enemy.maxHealth;
        }
    }
    
    /**
     * Calculate realistic player DPS accounting for special abilities
     * @private
     */
    _calculateRealisticPlayerDPS(player) {
        if (!player) return 30; // Safe fallback

        // Get boss constants
        const BOSS_CONST = window.GAME_CONSTANTS?.BOSSES || {};
        const DPS_EFFICIENCY = BOSS_CONST.DPS_EFFICIENCY || 0.70;
        const ABILITY_MULTS = BOSS_CONST.ABILITY_MULTIPLIERS || {};

        // Base damage with validation
        const baseDamage = Math.max(1,
            player.combat?.attackDamage ||
            player.attackDamage ||
            25
        );

        // Attack speed with validation (prevent divide by zero)
        const attackSpeed = Math.max(0.1, Math.min(10.0,
            player.combat?.attackSpeed ||
            player.attackSpeed ||
            1.2
        ));

        // Base theoretical DPS
        const baseDPS = baseDamage * attackSpeed;

        // Account for special abilities that multiply effective damage
        let abilityMultiplier = 1.0;

        // Chain lightning hits multiple targets
        if (player.hasChainLightning || player.abilities?.hasChainLightning) {
            abilityMultiplier += (ABILITY_MULTS.CHAIN_LIGHTNING || 0.30);
        }

        // Piercing hits multiple enemies in a line
        if ((player.piercing || player.combat?.piercing || 0) > 0) {
            abilityMultiplier += (ABILITY_MULTS.PIERCING || 0.20);
        }

        // AOE attacks hit multiple enemies
        if (player.hasAOEAttack || player.combat?.hasAOEAttack) {
            abilityMultiplier += (ABILITY_MULTS.AOE || 0.15);
        }

        // Apply efficiency factor (accounts for misses, dodging, kiting)
        const realisticDPS = baseDPS * abilityMultiplier * DPS_EFFICIENCY;

        // Sanity check: ensure DPS is in reasonable range
        return Math.max(10, Math.min(500, realisticDPS));
    }

    /**
     * Calculate boss damage resistance with diminishing returns
     * @private
     */
    _calculateBossResistance(bossCount) {
        const BOSS_CONST = window.GAME_CONSTANTS?.BOSSES || {};
        const baseResistance = BOSS_CONST.BASE_RESISTANCE || 0.20;
        const growthRate = BOSS_CONST.RESISTANCE_GROWTH_RATE || 0.15;
        const maxResistance = BOSS_CONST.MAX_RESISTANCE || 0.60;

        // Exponential decay curve: resistance approaches max asymptotically
        // Formula: max * (1 - e^(-bossCount * growthRate))
        const resistance = maxResistance * (1 - Math.exp(-bossCount * growthRate));

        // Ensure resistance stays within bounds
        return Math.min(maxResistance, Math.max(baseResistance, resistance));
    }

    /**
     * Generate dynamic phase thresholds with variance
     * @private
     */
    _generatePhaseThresholds() {
        const BOSS_CONST = window.GAME_CONSTANTS?.BOSSES || {};
        const variance = BOSS_CONST.PHASE_VARIANCE || 0.05;
        const baseThresholds = BOSS_CONST.BASE_PHASE_THRESHOLDS || [0.70, 0.40, 0.15];

        return baseThresholds.map(threshold => {
            // Add ±variance random variation
            const randomOffset = (Math.random() - 0.5) * variance * 2;
            return Math.max(0.10, Math.min(0.90, threshold + randomOffset));
        });
    }

    /**
     * Add golden tint to boss color for visual distinction
     * @private
     */
    _addGoldenTint(color) {
        // Parse the color (hex or rgb)
        let r, g, b, a = 1;

        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 6) {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            } else if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            }
        } else if (color.startsWith('rgb')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
                a = match[4] ? parseFloat(match[4]) : 1;
            }
        }

        // Default fallback
        if (r === undefined) {
            r = 231; g = 76; b = 60; // Default red
        }

        // Blend with gold (#f1c40f = rgb(241, 196, 15))
        const goldR = 241, goldG = 196, goldB = 15;
        const blendFactor = 0.3; // 30% gold, 70% original

        const finalR = Math.round(r * (1 - blendFactor) + goldR * blendFactor);
        const finalG = Math.round(g * (1 - blendFactor) + goldG * blendFactor);
        const finalB = Math.round(b * (1 - blendFactor) + goldB * blendFactor);

        return `rgba(${finalR}, ${finalG}, ${finalB}, ${a})`;
    }

    /**
     * Scale boss enemy with special considerations
     */
    scaleBoss(boss) {
        if (!boss) return;

        // Get boss constants
        const BOSS_CONST = window.GAME_CONSTANTS?.BOSSES || {};
        const MEGA_INTERVAL = BOSS_CONST.MEGA_BOSS_INTERVAL || 4;
        const MEGA_HEALTH_MULT = BOSS_CONST.MEGA_HEALTH_MULTIPLIER || 1.5;
        const MEGA_RADIUS_MULT = BOSS_CONST.MEGA_RADIUS_MULTIPLIER || 1.2;
        const MIN_FIGHT_DUR = BOSS_CONST.MIN_FIGHT_DURATION || 7;
        const MEGA_FIGHT_DUR = BOSS_CONST.MEGA_FIGHT_DURATION || 10;
        const SAFETY_MULT = BOSS_CONST.DPS_SAFETY_MULTIPLIER || 1.3;

        this.bossCount++;

        // Mega boss determination: every Nth boss (4th, 8th, 12th...)
        const isMegaBoss = (this.bossCount % MEGA_INTERVAL === 0) && this.bossCount > 0;

        // Get player for intelligent scaling
        const player = this.gameManager.game.player;

        // Calculate realistic player DPS with ability modifiers
        const realisticDPS = this._calculateRealisticPlayerDPS(player);

        // Determine target fight duration
        const fightDuration = isMegaBoss ? MEGA_FIGHT_DUR : MIN_FIGHT_DUR;

        // Calculate minimum boss health with safety multiplier
        // Safety multiplier accounts for burst damage, lucky crits, etc.
        const minimumBossHealth = realisticDPS * fightDuration * SAFETY_MULT;

        // Apply boss scaling with difficulty factor
        const bossHealthScale = this.bossScalingFactor * (isMegaBoss ? MEGA_HEALTH_MULT : 1.0);
        const scaledHealth = Math.max(minimumBossHealth, boss.maxHealth * bossHealthScale);

        boss.maxHealth = Math.ceil(scaledHealth);
        boss.health = boss.maxHealth;

        // Conservative damage scaling to avoid one-shots
        boss.damage = Math.ceil(boss.damage * Math.sqrt(this.bossScalingFactor));

        // Increase XP reward proportionally
        boss.xpValue = Math.ceil(boss.xpValue * bossHealthScale);

        // Add damage resistance with diminishing returns
        boss.damageResistance = this._calculateBossResistance(this.bossCount);

        // Dynamic phase thresholds for variety
        if (boss.hasPhases) {
            boss.phaseThresholds = this._generatePhaseThresholds();
        }

        // Set mega boss properties
        if (isMegaBoss) {
            boss.isMegaBoss = true;
            boss.radius *= MEGA_RADIUS_MULT;
            boss.color = '#8e44ad'; // Purple for mega bosses

            // Mega bosses get enhanced minion spawning
            if (boss.abilities) {
                const MEGA_MINION_RATE = BOSS_CONST.MEGA_MINION_RATE_MULTIPLIER || 1.5;
                const MEGA_MINION_BONUS = BOSS_CONST.MEGA_MINION_COUNT_BONUS || 2;

                if (boss.abilities.minionSpawnCooldown) {
                    boss.abilities.minionSpawnCooldown /= MEGA_MINION_RATE;
                }
                if (boss.abilities.minionMaxCount) {
                    boss.abilities.minionMaxCount += MEGA_MINION_BONUS;
                }
            }

            // Show mega boss warning
            if (this.gameManager.effectsManager) {
                this.gameManager.effectsManager.showCombatText(
                    '! MEGA BOSS APPROACHING! !',
                    player ? player.x : 0,
                    player ? player.y - 100 : 0,
                    'critical',
                    28
                );
                this.gameManager.effectsManager.addScreenShake(6, 0.6);
            }
        } else {
            // Regular bosses get a golden tint to stand out from normal enemies
            // Keep their base color but blend with gold
            boss.color = this._addGoldenTint(boss.color || '#e74c3c');
        }

        return boss;
    }
    
    /**
     * Get current difficulty metrics
     */
    getDifficultyMetrics() {
        return {
            difficultyFactor: this.difficultyFactor,
            enemyHealthMultiplier: this.enemyHealthMultiplier,
            enemyDamageMultiplier: this.enemyDamageMultiplier,
            enemySpeedMultiplier: this.enemySpeedMultiplier,
            enemySpawnRateMultiplier: this.enemySpawnRateMultiplier,
            bossScalingFactor: this.bossScalingFactor,
            playerPerformanceScore: this.playerPerformanceScore,
            adaptiveScalingFactor: this.adaptiveScalingFactor || 1.0,
            timeMinutes: this.gameManager.gameTime / 60,
            bossCount: this.bossCount
        };
    }
    
    /**
     * Reset difficulty (for new game)
     */
    reset() {
        this.difficultyFactor = 1.0;
        this.difficultyTimer = 0;
        this.playerPerformanceScore = 0;
        this.performanceHistory = [];
        this.bossCount = 0;
        this.lastDifficultyIncrease = 0;
        this.lastNotification = 0;
        this.adaptiveScalingFactor = 1.0;
        
        this.updateScalingMultipliers();
    }
    
    /**
     * Get difficulty state for debugging/UI
     */
    getDifficultyState() {
        return {
            ...this.getDifficultyMetrics(),
            nextIncreaseIn: this.difficultyInterval - this.difficultyTimer,
            performanceHistoryLength: this.performanceHistory.length,
            timeSinceLastIncrease: this.gameManager.gameTime - this.lastDifficultyIncrease
        };
    }
}

// Also make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.DifficultyManager = DifficultyManager;
}

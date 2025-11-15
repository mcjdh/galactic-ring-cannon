// Spawn ring cache - reuses precomputed angles/types to shift work from CPU to RAM.
const SpawnRingCache = (() => {
    const TABLE_SIZE = 8192;
    const TABLE_MASK = TABLE_SIZE - 1;
    const TWO_PI = Math.PI * 2;
    const cosTable = new Float32Array(TABLE_SIZE);
    const sinTable = new Float32Array(TABLE_SIZE);
    const radiusNoise = new Float32Array(TABLE_SIZE);
    const generalNoise = new Float32Array(TABLE_SIZE);

    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = (i / TABLE_SIZE) * TWO_PI;
        cosTable[i] = Math.cos(angle);
        sinTable[i] = Math.sin(angle);
        radiusNoise[i] = Math.random();
        generalNoise[i] = Math.random();
    }

    let generalCursor = 0;
    const nextNoiseValue = () => {
        generalCursor = (generalCursor + 1) & TABLE_MASK;
        return generalNoise[generalCursor];
    };

    const nextIndex = () => ((nextNoiseValue() * TABLE_SIZE) | 0) & TABLE_MASK;

    return {
        nextVector() {
            const idx = nextIndex();
            return { cos: cosTable[idx], sin: sinTable[idx] };
        },
        nextRadiusNoise() {
            return radiusNoise[nextIndex()];
        },
        nextEnemyIndex(listLength) {
            if (!listLength || listLength <= 1) return 0;
            const scaled = nextNoiseValue() * listLength;
            return Math.min(listLength - 1, scaled | 0);
        },
        nextNoise() {
            return nextNoiseValue();
        }
    };
})();

/**
 * Enemy Spawner - Manages enemy spawning, waves, and difficulty progression
 * Extracted from enemy.js for better organization
 * + PERFORMANCE: Adaptive enemy limits based on frame time monitoring
 * + PERFORMANCE: Distant enemy culling when performance degrades
 */
class EnemySpawner {
    constructor(game) {
        this.game = game;
        
        // Basic spawning parameters
        const GC = (window.GAME_CONSTANTS || {});
        const EN = GC.ENEMIES || {};
        const MODES = GC.MODES || {};
        const DIFF = GC.DIFFICULTY || {};
        this.spawnRate = typeof EN.BASE_SPAWN_RATE === 'number' ? EN.BASE_SPAWN_RATE : 1.2;
        this.spawnTimer = 0;
        this.spawnCooldown = this.spawnRate > 0 ? 1 / this.spawnRate : 1;
        this.maxEnemies = typeof EN.BASE_MAX_ENEMIES === 'number' ? EN.BASE_MAX_ENEMIES : 60;
        this.spawnDistanceMin = typeof EN.SPAWN_DISTANCE_MIN === 'number' ? EN.SPAWN_DISTANCE_MIN : 350;
        this.spawnRadius = typeof EN.SPAWN_DISTANCE_MAX === 'number' ? EN.SPAWN_DISTANCE_MAX : 650;
        this.earlyGameConfig = {
            duration: typeof EN.EARLY_GAME_DURATION === 'number' ? EN.EARLY_GAME_DURATION : 48,
            spawnMultiplier: typeof EN.EARLY_GAME_SPAWN_MULTIPLIER === 'number' ? EN.EARLY_GAME_SPAWN_MULTIPLIER : 1.22,
            maxEnemyBonus: typeof EN.EARLY_GAME_MAX_ENEMY_BONUS === 'number' ? EN.EARLY_GAME_MAX_ENEMY_BONUS : 10
        };
        this.spawnRampDampener = typeof EN.SPAWN_RAMP_DAMPENER === 'number' ? EN.SPAWN_RAMP_DAMPENER : 0.58;
        this.midGameSoftener = {
            start: typeof EN.MID_GAME_SOFTENER_START === 'number' ? EN.MID_GAME_SOFTENER_START : 45,
            end: typeof EN.MID_GAME_SOFTENER_END === 'number' ? EN.MID_GAME_SOFTENER_END : 110,
            strength: typeof EN.MID_GAME_SOFTENER_STRENGTH === 'number' ? EN.MID_GAME_SOFTENER_STRENGTH : 0.35
        };
        this.dynamicBossBaseInterval = typeof EN.BOSS_BASE_INTERVAL === 'number' ? EN.BOSS_BASE_INTERVAL : 90;
        this.dynamicBossIntervalIncrement = typeof EN.BOSS_INTERVAL_INCREMENT === 'number' ? EN.BOSS_INTERVAL_INCREMENT : 70;
        this.dynamicBossMinInterval = typeof EN.BOSS_MIN_INTERVAL === 'number' ? EN.BOSS_MIN_INTERVAL : 55;
        this.dynamicBossKillReduction = typeof EN.BOSS_KILL_REDUCTION === 'number' ? EN.BOSS_KILL_REDUCTION : 0.85;
        this.dynamicBossProgressReduction = typeof EN.BOSS_PROGRESSIVE_REDUCTION === 'number' ? EN.BOSS_PROGRESSIVE_REDUCTION : 6;

        if (!Number.isFinite(this.spawnRadius) || this.spawnRadius <= this.spawnDistanceMin) {
            this.spawnRadius = this.spawnDistanceMin + 250;
        }

        this._fallbackKillCount = 0;
        this.bossKillBaseline = this.getCurrentKillCount();

        this.baseSpawnRate = this.spawnRate;
        this.baseMaxEnemies = this.maxEnemies;
        this.baseEliteChance = typeof EN.ELITE_CHANCE_BASE === 'number' ? EN.ELITE_CHANCE_BASE : 0.05;

        // Performance monitoring and adaptive limits
        this.performanceMonitor = {
            frameTimeHistory: new Array(10).fill(0),
            frameTimeIndex: 0,
            frameTimeCount: 0,
            maxHistory: 10,
            lagThreshold: 33, // 30 FPS threshold
            isLagging: false,
            adaptiveMaxEnemies: this.maxEnemies,
            lastFrameTime: 0
        };
        
        // [Pi] Apply Pi5 optimizations if detected
        if (window.isRaspberryPi) {
            this.enablePi5Mode();
        }
        
        // Enemy types progression
        // NOTE: Enemy unlock times are hard-coded for game balance
        this.enemyTypes = ['basic'];
        this.enemyTypeUnlockTimes = {
            'fast': 0.25,      // 15 seconds
            'tank': 0.75,      // 45 seconds
            'ranged': 1.2,     // ~72 seconds
            'dasher': 1.6,     // ~96 seconds
            'exploder': 2.0,   // 2 minutes
            'teleporter': 2.4, // 2.4 minutes
            'phantom': 2.8,    // 2.8 minutes
            'shielder': 3.2,   // 3.2 minutes
            'summoner': 3.6,   // 3.6 minutes
            'berserker': 4.2   // 4.2 minutes
        };
        
        // Difficulty scaling
        this.difficultyTimer = 0;
        this.difficultyInterval = typeof DIFF.SCALING_INTERVAL === 'number' ? DIFF.SCALING_INTERVAL : 30; // Increase difficulty every interval
        
        // Boss spawning
        this.bossTimer = 0;
        this.bossSpawnTimes = Array.isArray(MODES.BOSS_SPAWN_TIMES) && MODES.BOSS_SPAWN_TIMES.length > 0
            ? MODES.BOSS_SPAWN_TIMES
            : [90, 160, 240];
        this.bossSpawnIndex = 0;
        const initialDynamicInterval = this.getDynamicBossInterval();
        this.bossInterval = Number.isFinite(initialDynamicInterval)
            ? initialDynamicInterval
            : (this.bossSpawnTimes[this.bossSpawnIndex] || this.dynamicBossBaseInterval || 60);
        this.bossScaleFactor = 1.0;
        this.bossesKilled = 0;

        this.baseBossInterval = this.dynamicBossBaseInterval || this.bossInterval;
        this.activeBossId = null;
        
        // Wave system
        this.wavesEnabled = true;
        this.waveTimer = 0;
        this.waveInterval = 30; // Wave every 30 seconds
        this.waveCount = 0;
        
        // Elite enemies
        this.eliteChance = typeof EN.ELITE_CHANCE_BASE === 'number' ? EN.ELITE_CHANCE_BASE : 0.05; // base chance
        this.eliteTimer = 0;
        this.eliteInterval = 40; // Increase elite chance every 40 seconds
        
        // Statistics
        this.totalEnemiesSpawned = 0;
        this.enemiesKilledThisWave = 0;
        
        // Health scaling for sustained challenge
        this.enemyHealthMultiplier = 1.0;
        
        // Enemy Spawner initialized
    }
    
    /**
     * Update spawner logic
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.updatePerformanceMonitoring(deltaTime);
        this.updateSpawnRateFromDifficulty(deltaTime);
        this.applyPlayerLevelWeighting();
        this.updateBossSpawning(deltaTime);
        this.updateWaveSpawning(deltaTime);
        this.updateRegularSpawning(deltaTime);
        this.updateEliteChance(deltaTime);
    }

    /**
     * Monitor performance and adjust enemy limits
     * @param {number} deltaTime - Time since last update
     */
    updatePerformanceMonitoring(deltaTime) {
        const monitor = this.performanceMonitor;
        const frameTime = deltaTime * 1000; // Convert to milliseconds

        // Track frame time history using circular buffer (O(1) instead of O(n))
        monitor.frameTimeHistory[monitor.frameTimeIndex] = frameTime;
        monitor.frameTimeIndex = (monitor.frameTimeIndex + 1) % monitor.maxHistory;
        monitor.frameTimeCount = Math.min(monitor.frameTimeCount + 1, monitor.maxHistory);

        // Calculate average frame time every few frames
        if (monitor.frameTimeCount >= monitor.maxHistory) {
            let sum = 0;
            for (let i = 0; i < monitor.maxHistory; i++) {
                sum += monitor.frameTimeHistory[i];
            }
            const avgFrameTime = sum / monitor.maxHistory;
            const wasLagging = monitor.isLagging;
            monitor.isLagging = avgFrameTime > monitor.lagThreshold;

            // Adjust adaptive limits based on performance
            if (monitor.isLagging && !wasLagging) {
                // Performance degraded - reduce enemy count
                monitor.adaptiveMaxEnemies = Math.max(30, Math.floor(this.maxEnemies * 0.7));
                this.cullDistantEnemies(); // Remove distant enemies immediately
            } else if (!monitor.isLagging && wasLagging) {
                // Performance improved - gradually increase limit
                monitor.adaptiveMaxEnemies = Math.min(this.maxEnemies, monitor.adaptiveMaxEnemies + 5);
            }
        }

        monitor.lastFrameTime = frameTime;
    }

    /**
     * Remove enemies that are far from player to improve performance
     */
    cullDistantEnemies() {
        const enemies = this.game?.getEnemies?.() ?? this.game?.enemies ?? [];
        if (!this.game.player || enemies.length === 0) return;

        const player = this.game.player;
        const cullDistance = this.spawnRadius * 2.5; // Cull beyond spawn range
        const cullDistanceSq = cullDistance * cullDistance;

        let culledCount = 0;

        // Reverse iteration for safe removal during loop
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (!enemy || enemy.isBoss) continue; // Never cull bosses

            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > cullDistanceSq) {
                // Flag as dead so other systems (AI, collision, rendering) ignore it immediately
                enemy.isDead = true;
                enemy.wasCulledBySpawner = true;

                if (typeof this.game.removeEntity === 'function') {
                    this.game.removeEntity(enemy);
                } else {
                    // Write-back pattern: O(n) instead of splice O(n²)
                    const lastIndex = enemies.length - 1;
                    if (i !== lastIndex) {
                        enemies[i] = enemies[lastIndex];
                    }
                    enemies.length = lastIndex;
                }
                culledCount++;

                // Stop culling once we've removed enough
                if (culledCount >= 10) break;
            }
        }
    }

    /**
     * Update spawn rate based on DifficultyManager
     * DifficultyManager is the single source of truth for difficulty scaling.
     * @param {number} deltaTime - Time since last update
     */
    updateSpawnRateFromDifficulty(deltaTime) {
        this.difficultyTimer += deltaTime;
        
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.difficultyTimer = 0;

            // Read spawn rate multiplier from DifficultyManager
            const gameManager = window.gameManager;
            const spawnRateMultiplier = gameManager?.difficultyManager?.enemySpawnRateMultiplier || 1.0;
            
            // Performance-aware spawn rate scaling
            if (!this.performanceMonitor.isLagging) {
                const dampener = Number.isFinite(this.spawnRampDampener) && this.spawnRampDampener > 0
                    ? this.spawnRampDampener
                    : 1.0;
                const adjustedMultiplier = 1 + (spawnRateMultiplier - 1) * dampener;
                this.spawnRate = Math.min(4, this.baseSpawnRate * adjustedMultiplier);
                this.spawnCooldown = this.spawnRate > 0 ? 1 / this.spawnRate : 1;
                const dampenedMaxBonus = (spawnRateMultiplier - 1.0) * dampener * 40;
                this.maxEnemies = Math.min(150, this.baseMaxEnemies + dampenedMaxBonus);
            }
            
            // Unlock new enemy types
            this.unlockNewEnemyTypes();
        }
    }
    
    /**
     * Unlock new enemy types based on game time
     */
    unlockNewEnemyTypes() {
        const gameTimeMinutes = (window.gameManager?.gameTime || 0) / 60;
        
        for (const [enemyType, unlockTime] of Object.entries(this.enemyTypeUnlockTimes)) {
            if (!this.enemyTypes.includes(enemyType) && gameTimeMinutes >= unlockTime) {
                this.enemyTypes.push(enemyType);
                this.showNewEnemyMessage(`${this.getEnemyDisplayName(enemyType)} enemies have appeared!`);
                // New enemy type unlocked
            }
        }
    }
    
    /**
     * Get display name for enemy type
     * @param {string} enemyType - Enemy type
     * @returns {string} Display name
     */
    getEnemyDisplayName(enemyType) {
        const displayNames = {
            'fast': 'Fast',
            'tank': 'Tank',
            'ranged': 'Ranged',
            'dasher': 'Dasher',
            'exploder': 'Exploding',
            'teleporter': 'Teleporting',
            'phantom': 'Phantom',
            'shielder': 'Shielded',
            'summoner': 'Summoner',
            'berserker': 'Berserker'
        };
        return displayNames[enemyType] || enemyType;
    }
    
    /**
     * Update boss spawning
     * @param {number} deltaTime - Time since last update
     */
    updateBossSpawning(deltaTime) {
        const bossAlive = this.isBossAlive();

        if (bossAlive) {
            // Hold timer steady while current boss is alive
            this.bossTimer = Math.min(this.bossTimer, this.bossInterval);
            if (window.gameManager) {
                window.gameManager.bossActive = true;
            }
            return;
        }

        if (window.gameManager) {
            window.gameManager.bossActive = false;
        }

        // Increment boss timer
        this.bossTimer += deltaTime;

        // Calculate dynamic boss interval (updated every frame to reflect kills)
        const BOSS_CONST = window.GAME_CONSTANTS?.BOSSES || {};
        const MIN_REST = BOSS_CONST.MIN_REST_PERIOD || 60;
        const LAG_DELAY = BOSS_CONST.SPAWN_DELAY_IF_LAGGING || 15;

        const dynamicInterval = this.getDynamicBossInterval();
        if (Number.isFinite(dynamicInterval)) {
            // Apply minimum rest period floor
            let effectiveInterval = Math.max(MIN_REST, dynamicInterval);

            // Add lag delay if performance is poor
            if (this.performanceMonitor.isLagging) {
                effectiveInterval += LAG_DELAY;
            }

            this.bossInterval = effectiveInterval;
        }

        // Debug logging
        if (Math.floor(this.bossTimer) !== this._lastLoggedBossTimer) {
            this._lastLoggedBossTimer = Math.floor(this.bossTimer);
            if (window.debugManager?.enabled) {
                console.log(`[EnemySpawner] Boss timer: ${this.bossTimer.toFixed(1)}s / ${this.bossInterval}s (lag: ${this.performanceMonitor.isLagging})`);
            }
        }

        // Spawn boss when timer reaches interval
        if (this.bossTimer >= this.bossInterval) {
            this.bossTimer = 0;
            this.spawnBoss();
            this.bossKillBaseline = this.getCurrentKillCount();

            // Advance to next boss
            this.bossSpawnIndex++;

            // Recalculate interval for next boss
            const nextInterval = this.getDynamicBossInterval();
            if (Number.isFinite(nextInterval)) {
                let effectiveNextInterval = Math.max(MIN_REST, nextInterval);
                if (this.performanceMonitor.isLagging) {
                    effectiveNextInterval += LAG_DELAY;
                }
                this.bossInterval = effectiveNextInterval;
            }
        }
    }
    
    /**
     * Update wave spawning
     * @param {number} deltaTime - Time since last update
     */
    updateWaveSpawning(deltaTime) {
        if (!this.wavesEnabled) return;
        
        this.waveTimer += deltaTime;
        
        if (this.waveTimer >= this.waveInterval) {
            this.waveTimer = 0;
            this.spawnWave();
        }
    }
    
    /**
     * Update regular enemy spawning
     * @param {number} deltaTime - Time since last update
     */
    updateRegularSpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        const gameTime = window.gameManager?.gameTime || 0;
        const earlyMultiplier = this.getEarlyGameSpawnMultiplier(gameTime);
        const midGameMultiplier = this.getMidGameReliefMultiplier(gameTime);
        const totalSpawnMultiplier = Math.max(0.25, earlyMultiplier * midGameMultiplier);
        const effectiveSpawnCooldown = this.spawnCooldown / totalSpawnMultiplier;
        const maxBonus = this.getEarlyGameMaxBonus(gameTime);
        const roundedBonus = Math.max(0, Math.round(maxBonus));
        const adaptiveBase = this.performanceMonitor.adaptiveMaxEnemies;
        const hardCap = this.maxEnemies + roundedBonus;
        const softCapMultiplier = Math.max(0.45, Math.min(1, midGameMultiplier + 0.05));
        const softCap = Math.max(1, Math.floor((adaptiveBase + roundedBonus) * softCapMultiplier));
        const effectiveMaxEnemies = Math.max(1, Math.min(hardCap, softCap));
        const enemies = this.game?.getEnemies?.() ?? this.game?.enemies ?? [];

        if (this.spawnTimer >= effectiveSpawnCooldown && enemies.length < effectiveMaxEnemies) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }
    }
    
    /**
     * Update elite enemy chance
     * @param {number} deltaTime - Time since last update
     */
    updateEliteChance(deltaTime) {
        this.eliteTimer += deltaTime;
        
        if (this.eliteTimer >= this.eliteInterval) {
            this.eliteTimer = 0;
            // Gradually increase elite chance (cap at 25%)
            this.eliteChance = Math.min(0.25, this.eliteChance + 0.02);
            // Elite chance increased
        }
    }
    
    getEarlyGameProgress(gameTime) {
        const duration = this.earlyGameConfig?.duration;
        if (!duration || duration <= 0) {
            return 1;
        }
        return Math.min(1, Math.max(0, gameTime / duration));
    }

    getEarlyGameSpawnMultiplier(gameTime) {
        const configMultiplier = this.earlyGameConfig?.spawnMultiplier;
        if (!configMultiplier || configMultiplier <= 1) {
            return 1;
        }
        const progress = this.getEarlyGameProgress(gameTime);
        return configMultiplier - (configMultiplier - 1) * progress;
    }

    getEarlyGameMaxBonus(gameTime) {
        const bonus = this.earlyGameConfig?.maxEnemyBonus;
        if (!bonus || bonus <= 0) {
            return 0;
        }
        const progress = this.getEarlyGameProgress(gameTime);
        return bonus * (1 - progress);
    }

    getMidGameReliefMultiplier(gameTime) {
        const config = this.midGameSoftener;
        if (!config || config.strength <= 0) {
            return 1;
        }

        const { start, end, strength } = config;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
            return 1;
        }

        if (gameTime <= start) {
            return 1 - strength;
        }
        if (gameTime >= end) {
            return 1;
        }

        const t = (gameTime - start) / (end - start);
        return 1 - strength * (1 - t);
    }

    getCurrentKillCount() {
        if (typeof window === 'undefined' || !window.gameManager) {
            return this._fallbackKillCount;
        }

        const gm = window.gameManager;
        if (typeof gm.killCount === 'number') {
            return gm.killCount;
        }

        const statsManager = gm.statsManager;
        if (statsManager && typeof statsManager.killCount === 'number') {
            return statsManager.killCount;
        }

        const stateKills = gm.game?.state?.progression?.killCount;
        if (typeof stateKills === 'number') {
            return stateKills;
        }

        return this._fallbackKillCount;
    }

    getDynamicBossInterval() {
        const index = this.bossSpawnIndex;
        const baseFromList = Array.isArray(this.bossSpawnTimes) ? this.bossSpawnTimes[index] : undefined;
        const base = Number.isFinite(baseFromList)
            ? baseFromList
            : this.dynamicBossBaseInterval + this.dynamicBossIntervalIncrement * index;

        const killCount = this.getCurrentKillCount();
        if (!Number.isFinite(this.bossKillBaseline)) {
            this.bossKillBaseline = killCount;
        }
        const killsSinceBaseline = Math.max(0, killCount - this.bossKillBaseline);

        const killReduction = killsSinceBaseline * this.dynamicBossKillReduction;
        const progressiveReduction = this.bossesKilled * this.dynamicBossProgressReduction;

        const target = Math.max(
            this.dynamicBossMinInterval,
            base - killReduction - progressiveReduction
        );

        return target;
    }
    
    // Note: createEnemy consolidated below
    
    /**
     * Spawn a regular enemy
     */
    spawnEnemy() {
        if (!this.game.player) return;
        const spawnPos = this.getSpawnPosition();
        const enemyType = this.getRandomEnemyType();
        const enemy = this.createEnemy(enemyType, spawnPos.x, spawnPos.y);
        if (!enemy) return;
        this.game.addEntity(enemy);
        this.totalEnemiesSpawned++;
        // Enemy spawned
    }

    /**
     * Factory to create an enemy by type at a position
     * Creates an instance without side-effects (no add to game)
     */
    createEnemy(type, x, y) {
        const enemy = new Enemy(x, y, type);
        this.applyDifficultyScaling(enemy);
        if (SpawnRingCache.nextNoise() < this.eliteChance) {
            this.makeElite(enemy);
        }
        return enemy;
    }
    
    /**
     * Get spawn position around player
     * @returns {Object} Position {x, y}
     */
    getSpawnPosition() {
        // Validate player exists and has valid position
        if (!this.game.player ||
            typeof this.game.player.x !== 'number' ||
            typeof this.game.player.y !== 'number' ||
            !Number.isFinite(this.game.player.x) ||
            !Number.isFinite(this.game.player.y)) {
            // Fallback to canvas center if player position is invalid
            const fallbackX = this.game.canvas ? this.game.canvas.width / 2 : 400;
            const fallbackY = this.game.canvas ? this.game.canvas.height / 2 : 300;
            if (window.debugManager?.enabled) {
                window.logger.warn('[EnemySpawner] Invalid player position, using fallback:', { fallbackX, fallbackY });
            }
            return { x: fallbackX, y: fallbackY };
        }

        const cachedVector = SpawnRingCache.nextVector();

        const globalWindow = (typeof window !== 'undefined') ? window : undefined;
        const canvasWidth = this.game.canvas?.width || globalWindow?.innerWidth || 1280;
        const canvasHeight = this.game.canvas?.height || globalWindow?.innerHeight || 720;
        const visibleRadius = Math.hypot(canvasWidth, canvasHeight) * 0.45;

        const minDistance = Math.max(
            50,
            this.spawnDistanceMin,
            visibleRadius + 60
        );
        const maxDistanceConfig = Number.isFinite(this.spawnRadius)
            ? this.spawnRadius
            : minDistance + 250;
        const maxDistance = Math.max(minDistance + 120, maxDistanceConfig);

        const radiusNoise = SpawnRingCache.nextRadiusNoise();
        const distance = minDistance + radiusNoise * (maxDistance - minDistance);
        const x = this.game.player.x + cachedVector.cos * distance;
        const y = this.game.player.y + cachedVector.sin * distance;

        // Final validation - ensure no NaN or Infinity values
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            if (window.debugManager?.enabled) {
                window.logger.warn('[EnemySpawner] Calculated position is invalid:', { x, y, angle, distance });
            }
            // Return player position as last resort
            return {
                x: this.game.player.x,
                y: this.game.player.y
            };
        }

        return { x, y };
    }
    
    /**
     * Get random enemy type from available types
     * @returns {string} Enemy type
     */
    getRandomEnemyType() {
        const idx = SpawnRingCache.nextEnemyIndex(this.enemyTypes.length);
        return this.enemyTypes[idx] || this.enemyTypes[0];
    }
    
    /**
     * Apply difficulty scaling to enemy
     * Delegates to DifficultyManager for consistent scaling across the game.
     * @param {Enemy} enemy - Enemy to scale
     */
    applyDifficultyScaling(enemy) {
        const gameManager = window.gameManager;
        if (!gameManager?.difficultyManager) {
            // Fallback if DifficultyManager is not available
            if (!gameManager?.difficultyFactor) return;
            
            const healthMultiplier = 1 + ((gameManager.difficultyFactor - 1) * 0.5);
            const damageScaling = 1 + ((gameManager.difficultyFactor - 1) * 0.4);
            
            enemy.maxHealth = Math.ceil(enemy.maxHealth * healthMultiplier);
            enemy.health = enemy.maxHealth;
            enemy.damage = Math.ceil(enemy.damage * damageScaling);
            
            const xpMultiplier = 1 + ((healthMultiplier - 1) * 0.7);
            enemy.xpValue = Math.ceil(enemy.xpValue * xpMultiplier);
            return;
        }
        
        // Delegate to DifficultyManager for scaling
        gameManager.difficultyManager.scaleEnemy(enemy);
    }
    
    /**
     * Make an enemy elite with boosted stats
     * @param {Enemy} enemy - Enemy to make elite
     */
    makeElite(enemy) {
        enemy.isElite = true;
        
        // Boost stats
        enemy.maxHealth *= 2.5;
        enemy.health = enemy.maxHealth;
        enemy.damage *= 1.5;
        enemy.xpValue *= 3;
        enemy.radius *= 1.2;
        
        // Visual indicator
        enemy.glowColor = '#f1c40f';
        
        // Type-specific elite bonuses
        this.applyEliteBonuses(enemy);
        
        // Elite enemy created
    }
    
    /**
     * Apply type-specific elite bonuses
     * @param {Enemy} enemy - Elite enemy
     */
    applyEliteBonuses(enemy) {
        switch (enemy.enemyType) {
            case 'basic':
                enemy.damageReduction = 0.2;
                break;
            case 'fast':
                enemy.speed *= 1.2;
                break;
            case 'tank':
                enemy.deflectChance = 0.2;
                break;
            case 'ranged':
                enemy.projectileDamage *= 1.5;
                enemy.rangeAttackCooldown *= 0.7;
                break;
            case 'dasher':
                enemy.dashCooldown *= 0.7;
                enemy.dashSpeed *= 1.2;
                break;
            case 'exploder':
                enemy.explosionRadius *= 1.3;
                enemy.explosionDamage *= 1.5;
                break;
            case 'teleporter':
                enemy.teleportCooldown *= 0.8;
                break;
            case 'phantom':
                enemy.phaseChance += 0.1;
                break;
            case 'shielder':
                enemy.shieldRechargeRate *= 1.5;
                break;
            case 'summoner':
                enemy.minionCount += 1;
                break;
            case 'berserker':
                enemy.berserkerThreshold += 0.1;
                break;
        }
    }
    
    /**
     * Spawn a boss enemy
     */
    spawnBoss() {
        if (!this.game.player) return;

        // Prevent multiple bosses from stacking
        if (window.gameManager?.bossActive || this.isBossAlive()) {
            if (window.debugManager?.enabled) {
                console.log('[EnemySpawner] Boss spawn skipped - boss already active');
            }
            return;
        }

        const spawnPos = this.getSpawnPosition();
        const boss = new Enemy(spawnPos.x, spawnPos.y, 'boss');

        // Delegate boss scaling to DifficultyManager
        const gameManager = window.gameManager;
        if (gameManager?.difficultyManager) {
            gameManager.difficultyManager.scaleBoss(boss);
        } else {
            // Fallback if DifficultyManager is not available
            boss.maxHealth = Math.floor(boss.maxHealth * this.bossScaleFactor);
            boss.health = boss.maxHealth;
            boss.damage = Math.floor(boss.damage * this.bossScaleFactor);
            
            // Update boss scaling for next boss
            this.bossScaleFactor += 0.2;
        }
        
        this.game.addEntity(boss);
        this.activeBossId = boss.id;

        // Notify game manager
        if (window.gameManager) {
            window.gameManager.bossActive = true;
            window.gameManager._activeBossId = boss.id;
            if (window.gameManager.uiManager && typeof window.gameManager.uiManager.addBoss === 'function') {
                window.gameManager.uiManager.addBoss(boss);
            }
            // Track last boss on bridge for cleanup
            window.gameManager._lastBossId = boss.id;
        }
        
        this.showNewEnemyMessage("! BOSS INCOMING! !");
        // Boss spawned successfully
    }

    isBossAlive() {
        const enemies = this.game?.enemies;
        if (!Array.isArray(enemies) || enemies.length === 0) {
            return false;
        }

        if (this.activeBossId) {
            const boss = enemies.find(enemy => enemy && !enemy.isDead && enemy.id === this.activeBossId);
            if (boss) {
                return true;
            }
            this.activeBossId = null;
        }

        const existingBoss = enemies.find(enemy => enemy && !enemy.isDead && enemy.isBoss);
        if (existingBoss) {
            this.activeBossId = existingBoss.id;
            return true;
        }

        return false;
    }
    
    /**
     * Spawn a wave of enemies
     */
    spawnWave() {
        this.waveCount++;
        const playerLevel = window.gameManager?.game?.player?.level || 1;
        window.gameManager?.statsManager?.trackSpecialEvent?.('wave_completed', { 'waveNumber': this.waveCount });
        // Wave size scales with wave index and player level for higher intensity
        const base = 9 + Math.floor(this.waveCount * 1.5);
        const levelBonus = Math.floor(playerLevel * 1.4);
        // Performance-aware wave sizing
        const maxWaveSize = this.performanceMonitor.isLagging ? 24 : 40;
        const waveSize = Math.min(maxWaveSize, base + levelBonus);
        
        // Wave spawning initiated

        // Store timeout IDs for cleanup if needed
        if (!this.waveTimeouts) this.waveTimeouts = [];

        // > OPTIMIZATION: Longer delays on Pi5 to prevent GC spikes
        const spawnDelay = window.isRaspberryPi ? 250 : 100; // 250ms on Pi5, 100ms on desktop

        for (let i = 0; i < waveSize; i++) {
            // Delay spawning to spread out the wave and reduce instantiation spikes
            const timeoutId = setTimeout(() => {
                // Clear this timeout from the list
                const index = this.waveTimeouts.indexOf(timeoutId);
                if (index !== -1) this.waveTimeouts.splice(index, 1);

                // Only spawn if spawner is still active
                if (this.game && !this.game.isShuttingDown) {
                    this.spawnEnemy();
                }
            }, i * spawnDelay); // Spread over 250ms intervals on Pi5

            this.waveTimeouts.push(timeoutId);
        }
        
        this.showNewEnemyMessage(`Wave ${this.waveCount} incoming!`);
        this.enemiesKilledThisWave = 0;
    }
    
    /**
     * Show floating message about new enemies or events
     * @param {string} message - Message to display
     */
    showNewEnemyMessage(message) {
        if (this.game.player && window.gameManager && window.gameManager.uiManager) {
            window.gameManager.uiManager.showFloatingText(
                message,
                this.game.player.x,
                this.game.player.y - 50,
                "#f39c12",
                24
            );
        }
    }
    
    /**
     * Handle enemy death (called when enemy is killed)
     * @param {Enemy} enemy - Killed enemy
     */
    onEnemyKilled(enemy) {
        this.enemiesKilledThisWave++;

        if (typeof window === 'undefined' || !window.gameManager) {
            this._fallbackKillCount += 1;
        }
        
        if (enemy.isBoss) {
            this.bossesKilled++;
            // Boss defeated - tracking for difficulty scaling
            this.onBossCleared();
        }

        // Note: enemyHealthMultiplier is now managed by DifficultyManager
    }

    onBossCleared() {
        this.activeBossId = null;
        this.bossTimer = 0;

        // Reset kill baseline so next boss interval only counts kills AFTER this boss
        this.bossKillBaseline = this.getCurrentKillCount();

        if (window.gameManager) {
            window.gameManager.bossActive = false;
            window.gameManager._activeBossId = null;
        }
    }
    
    /**
     * Get spawner statistics
     * @returns {Object} Statistics
     */
    getStats() {
        const gameManager = window.gameManager;
        const difficultyManager = gameManager?.difficultyManager;
        
        return {
            totalEnemiesSpawned: this.totalEnemiesSpawned,
            currentSpawnRate: this.spawnRate,
            maxEnemies: this.maxEnemies,
            availableEnemyTypes: [...this.enemyTypes],
            eliteChance: this.eliteChance,
            waveCount: this.waveCount,
            bossesKilled: this.bossesKilled,
            bossScaleFactor: difficultyManager?.bossScalingFactor || this.bossScaleFactor,
            enemyHealthMultiplier: difficultyManager?.enemyHealthMultiplier || this.enemyHealthMultiplier
        };
    }
    
    /**
     * Reset spawner for new game
     */
    reset() {
        // Clear any pending wave timeouts to prevent memory leaks
        if (this.waveTimeouts) {
            this.waveTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.waveTimeouts = [];
        }

        this._fallbackKillCount = 0;

        this.spawnRate = this.baseSpawnRate;
        this.spawnCooldown = this.spawnRate > 0 ? 1 / this.spawnRate : 1;
        this.maxEnemies = this.baseMaxEnemies;
        this.enemyTypes = ['basic'];
        this.spawnTimer = 0;
        this.difficultyTimer = 0;
        this.bossTimer = 0;
        this.bossSpawnIndex = 0;
        this.bossKillBaseline = this.getCurrentKillCount();
        const initialBossInterval = this.getDynamicBossInterval();
        this.bossInterval = Number.isFinite(initialBossInterval)
            ? initialBossInterval
            : (this.baseBossInterval || this.dynamicBossBaseInterval || 60);
        this.activeBossId = null;
        this.waveTimer = 0;
        this.waveCount = 0;
        this.eliteChance = this.baseEliteChance;
        this.eliteTimer = 0;
        this.bossScaleFactor = 1.0;
        this.totalEnemiesSpawned = 0;
        this.bossesKilled = 0;
        this.enemyHealthMultiplier = 1.0;
        this.enemiesKilledThisWave = 0;
        this.performanceMonitor.frameTimeHistory.fill(0);
        this.performanceMonitor.frameTimeIndex = 0;
        this.performanceMonitor.frameTimeCount = 0;
        this.performanceMonitor.isLagging = false;
        this.performanceMonitor.adaptiveMaxEnemies = this.maxEnemies;
        this.performanceMonitor.lastFrameTime = 0;

        // Enemy spawner reset for new game
        if (window.gameManager) {
            window.gameManager.bossActive = false;
            window.gameManager._activeBossId = null;
        }

    }
    
    /**
     * Set spawner configuration
     * @param {Object} config - Configuration options
     */
    configure(config) {
        if (config.spawnRate) this.spawnRate = config.spawnRate;
        if (config.maxEnemies) this.maxEnemies = config.maxEnemies;
        if (config.bossInterval) this.bossInterval = config.bossInterval;
        if (config.waveInterval) this.waveInterval = config.waveInterval;
        if (config.wavesEnabled !== undefined) this.wavesEnabled = config.wavesEnabled;
        if (config.eliteChance) this.eliteChance = config.eliteChance;
        
        // Enemy spawner configured with new settings
    }

    /**
     * Increase spawn intensity based on player level to keep challenge scaling
     */
    applyPlayerLevelWeighting() {
        try {
            const level = window.gameManager?.game?.player?.level || 1;
            // Aggressive multi-phase scaling to keep pressure as player powers up
            let levelFactor;
            if (level <= 10) {
                levelFactor = 1 + (level - 1) * 0.12; // up to ~2.08x at 10
            } else if (level <= 20) {
                levelFactor = 2.08 + (level - 10) * 0.10; // up to ~3.08x at 20
            } else {
                levelFactor = 3.08 + (Math.min(level, 35) - 20) * 0.06; // up to ~4.0x around 35
            }
            const clamped = Math.min(4.0, levelFactor);
            // Apply to spawn rate and max enemies
            const baseSpawn = typeof (window.GAME_CONSTANTS?.ENEMIES?.BASE_SPAWN_RATE) === 'number'
                ? window.GAME_CONSTANTS.ENEMIES.BASE_SPAWN_RATE : 1.2;
            this.spawnRate = Math.min(8, baseSpawn * clamped);
            this.spawnCooldown = 1 / this.spawnRate;
            const baseMax = typeof (window.GAME_CONSTANTS?.ENEMIES?.BASE_MAX_ENEMIES) === 'number'
                ? window.GAME_CONSTANTS.ENEMIES.BASE_MAX_ENEMIES : 60;
            // Performance-aware max enemies with much lower ceiling
            const theoreticalMax = Math.min(180, Math.floor(baseMax * (0.8 + clamped * 0.6)));
            this.maxEnemies = theoreticalMax;

            // Update adaptive limit based on performance
            if (this.performanceMonitor.isLagging) {
                this.performanceMonitor.adaptiveMaxEnemies = Math.floor(theoreticalMax * 0.7);
            } else {
                this.performanceMonitor.adaptiveMaxEnemies = theoreticalMax;
            }

            // Increase elite chance with player level (capped)
            const desiredElite = Math.min(0.35, 0.05 + level * 0.01);
            this.eliteChance = Math.max(this.eliteChance, desiredElite);
        } catch (_) { /* no-op */ }
    }
    
    /**
     * [Pi] RASPBERRY PI 5 OPTIMIZATION MODE
     * Applies conservative limits for smooth 60fps gameplay on Pi5
     */
    enablePi5Mode() {
        if (window.debugManager?.enabled) {
            console.log('[Pi] EnemySpawner: Enabling Pi5 optimization mode...');
        }
        
        // Conservative enemy limits
        this.maxEnemies = 35; // Much lower than default 60
        this.baseMaxEnemies = 35;
        this.performanceMonitor.adaptiveMaxEnemies = 35;
        
        // Slower spawn rate
        this.spawnRate = Math.min(this.spawnRate, 1.0);
        this.baseSpawnRate = 1.0;
        this.spawnCooldown = 1.0;
        
        // More aggressive lag threshold (target 40fps minimum instead of 30fps)
        this.performanceMonitor.lagThreshold = 25; // 40fps
        
        // Reduce elite chance slightly
        this.eliteChance = Math.min(this.eliteChance, 0.08);
        this.baseEliteChance = 0.03;
        
        if (window.debugManager?.enabled) {
            console.log('+ Pi5 mode: maxEnemies=35, spawnRate=1.0, lagThreshold=25ms (40fps)');
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemySpawner = EnemySpawner;
}

/**
 * Enemy Spawner - Manages enemy spawning, waves, and difficulty progression
 * Extracted from enemy.js for better organization
 * ✅ PERFORMANCE: Adaptive enemy limits based on frame time monitoring
 * ✅ PERFORMANCE: Distant enemy culling when performance degrades
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
        this.spawnRadius = typeof EN.SPAWN_DISTANCE_MAX === 'number' ? EN.SPAWN_DISTANCE_MAX : 800;

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
        
        // Enemy types progression
        // NOTE: Enemy unlock times are hard-coded for game balance
        this.enemyTypes = ['basic'];
        this.enemyTypeUnlockTimes = {
            'fast': 0.5,      // 30 seconds
            'tank': 1,        // 1 minute  
            'ranged': 1.5,    // 1.5 minutes
            'dasher': 2,      // 2 minutes
            'exploder': 2.5,  // 2.5 minutes
            'teleporter': 3,  // 3 minutes
            'phantom': 3.5,   // 3.5 minutes
            'shielder': 4,    // 4 minutes
            'summoner': 4.5,  // 4.5 minutes
            'berserker': 5    // 5 minutes
        };
        
        // Difficulty scaling
        this.difficultyTimer = 0;
        this.difficultyInterval = typeof DIFF.SCALING_INTERVAL === 'number' ? DIFF.SCALING_INTERVAL : 30; // Increase difficulty every interval
        
        // Boss spawning
        this.bossTimer = 0;
        this.bossSpawnTimes = Array.isArray(MODES.BOSS_SPAWN_TIMES) && MODES.BOSS_SPAWN_TIMES.length > 0 ? MODES.BOSS_SPAWN_TIMES : [60];
        this.bossSpawnIndex = 0;
        this.bossInterval = this.bossSpawnTimes[this.bossSpawnIndex] || 60; // First boss timing
        this.bossScaleFactor = 1.0;
        this.bossesKilled = 0;

        this.baseBossInterval = this.bossInterval;
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
        this.updateDifficulty(deltaTime);
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
                    enemies.splice(i, 1);
                }
                culledCount++;

                // Stop culling once we've removed enough
                if (culledCount >= 10) break;
            }
        }
    }

    /**
     * Update difficulty scaling
     * @param {number} deltaTime - Time since last update
     */
    updateDifficulty(deltaTime) {
        this.difficultyTimer += deltaTime;
        
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.difficultyTimer = 0;

            // Performance-aware difficulty scaling
            if (!this.performanceMonitor.isLagging) {
                this.spawnRate = Math.min(4, this.spawnRate * 1.15); // Slower scaling
                this.spawnCooldown = this.spawnRate > 0 ? 1 / this.spawnRate : 1;
                this.maxEnemies = Math.min(150, this.maxEnemies + 8); // Lower cap
            }
            
            // Unlock new enemy types
            this.unlockNewEnemyTypes();
            
            // Difficulty increased
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

        this.bossTimer += deltaTime;

        // Debug logging
        if (Math.floor(this.bossTimer) !== this._lastLoggedBossTimer) {
            this._lastLoggedBossTimer = Math.floor(this.bossTimer);
            if (window.debugManager?.enabled) {
                console.log(`[EnemySpawner] Boss timer: ${this.bossTimer.toFixed(1)}s / ${this.bossInterval}s`);
            }
        }

        if (this.bossTimer >= this.bossInterval) {
            this.bossTimer = 0;
            this.spawnBoss();
            // Advance to next configured boss time if available
            if (this.bossSpawnIndex < this.bossSpawnTimes.length - 1) {
                this.bossSpawnIndex++;
                this.bossInterval = this.bossSpawnTimes[this.bossSpawnIndex];
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

        const effectiveMaxEnemies = this.performanceMonitor.adaptiveMaxEnemies;
        const enemies = this.game?.getEnemies?.() ?? this.game?.enemies ?? [];
        if (this.spawnTimer >= this.spawnCooldown && enemies.length < effectiveMaxEnemies) {
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
        if (Math.random() < this.eliteChance) {
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
                console.warn('[EnemySpawner] Invalid player position, using fallback:', { fallbackX, fallbackY });
            }
            return { x: fallbackX, y: fallbackY };
        }

        // Validate spawn radius
        const spawnRadius = typeof this.spawnRadius === 'number' && Number.isFinite(this.spawnRadius)
            ? this.spawnRadius
            : 800; // Fallback to default

        const angle = Math.random() * Math.PI * 2;
        const distance = spawnRadius + Math.random() * 200; // Some distance variation

        const x = this.game.player.x + Math.cos(angle) * distance;
        const y = this.game.player.y + Math.sin(angle) * distance;

        // Final validation - ensure no NaN or Infinity values
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            if (window.debugManager?.enabled) {
                console.warn('[EnemySpawner] Calculated position is invalid:', { x, y, angle, distance });
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
        return this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
    }
    
    /**
     * Apply difficulty scaling to enemy
     * @param {Enemy} enemy - Enemy to scale
     */
    applyDifficultyScaling(enemy) {
        const gameManager = window.gameManager;
        if (!gameManager || !gameManager.difficultyFactor) return;
        
        // Health scaling with better balance
        const healthMultiplier = this.enemyHealthMultiplier || 
            (1 + ((gameManager.difficultyFactor - 1) * 0.5));
        
        // Damage scaling (less aggressive than health)
        const damageScaling = 1 + ((gameManager.difficultyFactor - 1) * 0.4);
        
        // Apply scaling
        enemy.maxHealth = Math.ceil(enemy.maxHealth * healthMultiplier);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.ceil(enemy.damage * damageScaling);
        
        // Scale XP reward appropriately
        const xpMultiplier = 1 + ((healthMultiplier - 1) * 0.7);
        enemy.xpValue = Math.ceil(enemy.xpValue * xpMultiplier);
        
        // Late game additional scaling
        const gameMinutes = gameManager.gameTime / 60;
        if (gameMinutes > 5) {
            const lateGameFactor = Math.min(1.5, 1 + ((gameMinutes - 5) * 0.05));
            enemy.maxHealth = Math.ceil(enemy.maxHealth * lateGameFactor);
            enemy.health = enemy.maxHealth;
        }
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

        // Apply boss scaling
        boss.maxHealth = Math.floor(boss.maxHealth * this.bossScaleFactor);
        boss.health = boss.maxHealth;
        boss.damage = Math.floor(boss.damage * this.bossScaleFactor);
        
        this.game.addEntity(boss);
        this.activeBossId = boss.id;

        // Update boss scaling for next boss
        this.bossScaleFactor += 0.2;

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
        
        this.showNewEnemyMessage("⚠️ BOSS INCOMING! ⚠️");
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
        const base = 5 + this.waveCount;
        const levelBonus = Math.floor(playerLevel * 1.2);
        // Performance-aware wave sizing
        const maxWaveSize = this.performanceMonitor.isLagging ? 15 : 25;
        const waveSize = Math.min(maxWaveSize, base + levelBonus);
        
        // Wave spawning initiated

        // Store timeout IDs for cleanup if needed
        if (!this.waveTimeouts) this.waveTimeouts = [];

        for (let i = 0; i < waveSize; i++) {
            // Delay spawning slightly to spread out the wave
            const timeoutId = setTimeout(() => {
                // Clear this timeout from the list
                const index = this.waveTimeouts.indexOf(timeoutId);
                if (index !== -1) this.waveTimeouts.splice(index, 1);

                // Only spawn if spawner is still active
                if (this.game && !this.game.isShuttingDown) {
                    this.spawnEnemy();
                }
            }, i * 100);

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
        
        if (enemy.isBoss) {
            this.bossesKilled++;
            // Boss defeated - tracking for difficulty scaling
            this.onBossCleared();
        }

        // Update health multiplier for sustained challenge
        if (this.totalEnemiesSpawned % 50 === 0) {
            this.enemyHealthMultiplier *= 1.05;
        }
    }

    onBossCleared() {
        this.activeBossId = null;
        this.bossTimer = 0;
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
        return {
            totalEnemiesSpawned: this.totalEnemiesSpawned,
            currentSpawnRate: this.spawnRate,
            maxEnemies: this.maxEnemies,
            availableEnemyTypes: [...this.enemyTypes],
            eliteChance: this.eliteChance,
            waveCount: this.waveCount,
            bossesKilled: this.bossesKilled,
            bossScaleFactor: this.bossScaleFactor,
            enemyHealthMultiplier: this.enemyHealthMultiplier
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

        this.spawnRate = this.baseSpawnRate;
        this.spawnCooldown = this.spawnRate > 0 ? 1 / this.spawnRate : 1;
        this.maxEnemies = this.baseMaxEnemies;
        this.enemyTypes = ['basic'];
        this.spawnTimer = 0;
        this.difficultyTimer = 0;
        this.bossTimer = 0;
        this.bossSpawnIndex = 0;
        this.bossInterval = this.bossSpawnTimes[this.bossSpawnIndex] || this.baseBossInterval || 60;
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
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EnemySpawner = EnemySpawner;
}

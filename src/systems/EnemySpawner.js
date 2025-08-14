/**
 * Enemy Spawner - Manages enemy spawning, waves, and difficulty progression
 * Extracted from enemy.js for better organization
 */
class EnemySpawner {
    constructor(game) {
        this.game = game;
        
        // Basic spawning parameters
        this.spawnRate = 1; // enemies per second
        this.spawnTimer = 0;
        this.spawnCooldown = 1 / this.spawnRate;
        this.maxEnemies = 50;
        this.spawnRadius = 800; // Distance from player to spawn enemies
        
        // Enemy types progression
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
        this.difficultyInterval = 30; // Increase difficulty every 30 seconds
        
        // Boss spawning
        this.bossTimer = 0;
        this.bossInterval = 60; // Boss every 1 minute
        this.bossScaleFactor = 1.0;
        this.bossesKilled = 0;
        
        // Wave system
        this.wavesEnabled = true;
        this.waveTimer = 0;
        this.waveInterval = 30; // Wave every 30 seconds
        this.waveCount = 0;
        
        // Elite enemies
        this.eliteChance = 0.05; // 5% base chance
        this.eliteTimer = 0;
        this.eliteInterval = 40; // Increase elite chance every 40 seconds
        
        // Statistics
        this.totalEnemiesSpawned = 0;
        this.enemiesKilledThisWave = 0;
        
        // Health scaling for sustained challenge
        this.enemyHealthMultiplier = 1.0;
        
        console.log('👹 Enemy Spawner initialized');
    }
    
    /**
     * Update spawner logic
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.updateDifficulty(deltaTime);
        this.updateBossSpawning(deltaTime);
        this.updateWaveSpawning(deltaTime);
        this.updateRegularSpawning(deltaTime);
        this.updateEliteChance(deltaTime);
    }
    
    /**
     * Update difficulty scaling
     * @param {number} deltaTime - Time since last update
     */
    updateDifficulty(deltaTime) {
        this.difficultyTimer += deltaTime;
        
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.difficultyTimer = 0;
            
            // Increase spawn rate and max enemies
            this.spawnRate = Math.min(5, this.spawnRate * 1.2);
            this.spawnCooldown = 1 / this.spawnRate;
            this.maxEnemies = Math.min(200, this.maxEnemies + 10);
            
            // Unlock new enemy types
            this.unlockNewEnemyTypes();
            
            console.log(`📈 Difficulty increased: spawn rate ${this.spawnRate.toFixed(2)}, max enemies ${this.maxEnemies}`);
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
                console.log(`🆕 New enemy type unlocked: ${enemyType}`);
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
        this.bossTimer += deltaTime;
        
        if (this.bossTimer >= this.bossInterval) {
            this.bossTimer = 0;
            this.spawnBoss();
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
        
        if (this.spawnTimer >= this.spawnCooldown && this.game.enemies.length < this.maxEnemies) {
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
            console.log(`⭐ Elite chance increased to ${(this.eliteChance * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * Spawn a regular enemy
     */
    spawnEnemy() {
        if (!this.game.player) return;
        
        // Generate spawn position around player
        const spawnPos = this.getSpawnPosition();
        
        // Pick random enemy type
        const enemyType = this.getRandomEnemyType();
        
        // Create enemy
        const enemy = new Enemy(spawnPos.x, spawnPos.y, enemyType);
        
        // Apply difficulty scaling
        this.applyDifficultyScaling(enemy);
        
        // Chance for elite
        if (Math.random() < this.eliteChance) {
            this.makeElite(enemy);
        }
        
        // Add to game
        this.game.addEntity(enemy);
        this.totalEnemiesSpawned++;
        
        console.log(`👹 Spawned ${enemy.isElite ? 'Elite ' : ''}${enemyType} enemy`);
    }
    
    /**
     * Get spawn position around player
     * @returns {Object} Position {x, y}
     */
    getSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.spawnRadius + Math.random() * 200; // Some distance variation
        
        return {
            x: this.game.player.x + Math.cos(angle) * distance,
            y: this.game.player.y + Math.sin(angle) * distance
        };
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
        
        console.log(`⭐ Created elite ${enemy.enemyType} with ${enemy.maxHealth} HP`);
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
        
        const spawnPos = this.getSpawnPosition();
        const boss = new Enemy(spawnPos.x, spawnPos.y, 'boss');
        
        // Apply boss scaling
        boss.maxHealth = Math.floor(boss.maxHealth * this.bossScaleFactor);
        boss.health = boss.maxHealth;
        boss.damage = Math.floor(boss.damage * this.bossScaleFactor);
        
        this.game.addEntity(boss);
        
        // Update boss scaling for next boss
        this.bossScaleFactor += 0.2;
        
        // Notify game manager
        if (window.gameManager) {
            window.gameManager.bossActive = true;
            if (window.gameManager.uiManager) {
                window.gameManager.uiManager.addBoss(boss);
            }
        }
        
        this.showNewEnemyMessage("⚠️ BOSS INCOMING! ⚠️");
        console.log(`👑 Boss spawned with ${boss.maxHealth} HP`);
    }
    
    /**
     * Spawn a wave of enemies
     */
    spawnWave() {
        this.waveCount++;
        const waveSize = Math.min(15, 5 + this.waveCount);
        
        console.log(`🌊 Spawning wave ${this.waveCount} with ${waveSize} enemies`);
        
        for (let i = 0; i < waveSize; i++) {
            // Delay spawning slightly to spread out the wave
            setTimeout(() => {
                this.spawnEnemy();
            }, i * 100);
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
            console.log(`👑 Boss killed! Total bosses defeated: ${this.bossesKilled}`);
        }
        
        // Update health multiplier for sustained challenge
        if (this.totalEnemiesSpawned % 50 === 0) {
            this.enemyHealthMultiplier *= 1.05;
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
        this.spawnRate = 1;
        this.spawnCooldown = 1;
        this.maxEnemies = 50;
        this.enemyTypes = ['basic'];
        this.difficultyTimer = 0;
        this.bossTimer = 0;
        this.waveTimer = 0;
        this.waveCount = 0;
        this.eliteChance = 0.05;
        this.bossScaleFactor = 1.0;
        this.totalEnemiesSpawned = 0;
        this.bossesKilled = 0;
        this.enemyHealthMultiplier = 1.0;
        this.enemiesKilledThisWave = 0;
        
        console.log('👹 Enemy Spawner reset for new game');
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
        
        console.log('👹 Enemy Spawner configured', config);
    }
}

// Intelligent enemy spawning system with dynamic difficulty
class IntelligentSpawner {
    constructor(game) {
        this.game = game;
        this.spawnQueue = [];
        this.difficultyAnalyzer = new DifficultyAnalyzer();
        this.spawnPatterns = new Map();
        this.lastSpawnTime = 0;
        this.currentWaveIntensity = 1.0;
        this.adaptiveSpawnRate = 1.0;
        
        this.initializeSpawnPatterns();
    }
    
    initializeSpawnPatterns() {
        this.spawnPatterns.set('scatter', {
            count: 3,
            spacing: 120,
            type: 'basic',
            formation: 'circle'
        });
        
        this.spawnPatterns.set('line', {
            count: 5,
            spacing: 80,
            type: 'basic',
            formation: 'line'
        });
        
        this.spawnPatterns.set('pincer', {
            count: 4,
            spacing: 200,
            type: 'fast',
            formation: 'pincer'
        });
        
        this.spawnPatterns.set('elite', {
            count: 1,
            spacing: 0,
            type: 'tank',
            formation: 'single',
            minDifficulty: 5
        });
    }
    
    update(deltaTime) {
        this.difficultyAnalyzer.update(this.game);
        this.updateAdaptiveSpawnRate();
        this.processSpawnQueue(deltaTime);
        this.considerNewSpawns(deltaTime);
    }
    
    updateAdaptiveSpawnRate() {
        const analysis = this.difficultyAnalyzer.getAnalysis();
        
        // Adjust spawn rate based on player performance
        if (analysis.playerStruggling) {
            this.adaptiveSpawnRate *= 0.95; // Slightly reduce spawn rate
        } else if (analysis.playerDominating) {
            this.adaptiveSpawnRate *= 1.02; // Slightly increase spawn rate
        }
        
        // Keep within reasonable bounds
        this.adaptiveSpawnRate = Math.max(0.3, Math.min(2.0, this.adaptiveSpawnRate));
    }
    
    considerNewSpawns(deltaTime) {
        const currentTime = performance.now();
        const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
        const baseSpawnInterval = 2000 / this.adaptiveSpawnRate; // Base 2 second interval
        
        if (timeSinceLastSpawn > baseSpawnInterval && this.shouldSpawn()) {
            const pattern = this.selectSpawnPattern();
            this.queueSpawnPattern(pattern);
            this.lastSpawnTime = currentTime;
        }
    }
    
    shouldSpawn() {
        if (!this.game.player || this.game.enemies.length > 50) return false;
        
        const analysis = this.difficultyAnalyzer.getAnalysis();
        const spawnProbability = Math.min(0.8, 0.3 + analysis.gameDifficulty * 0.1);
        
        return Math.random() < spawnProbability;
    }
    
    selectSpawnPattern() {
        const analysis = this.difficultyAnalyzer.getAnalysis();
        const availablePatterns = [];
        
        for (const [name, pattern] of this.spawnPatterns) {
            if (!pattern.minDifficulty || analysis.gameDifficulty >= pattern.minDifficulty) {
                // Weight patterns based on current situation
                const weight = this.getPatternWeight(pattern, analysis);
                for (let i = 0; i < weight; i++) {
                    availablePatterns.push(name);
                }
            }
        }
        
        const selectedName = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        return this.spawnPatterns.get(selectedName);
    }
    
    getPatternWeight(pattern, analysis) {
        let weight = 1;
        
        // Favor elite enemies when player is doing well
        if (pattern.type === 'tank' && analysis.playerDominating) {
            weight += 2;
        }
        
        // Favor swarms when player has good area damage
        if (pattern.count > 3 && analysis.playerHasAreaDamage) {
            weight += 1;
        }
        
        // Reduce complex patterns when player is struggling
        if (pattern.formation !== 'single' && analysis.playerStruggling) {
            weight = Math.max(1, weight - 1);
        }
        
        return weight;
    }
    
    queueSpawnPattern(pattern) {
        const spawnPositions = this.calculateSpawnPositions(pattern);
        
        for (let i = 0; i < pattern.count; i++) {
            this.spawnQueue.push({
                position: spawnPositions[i],
                type: pattern.type,
                delay: i * 200 // Stagger spawns slightly
            });
        }
    }
    
    calculateSpawnPositions(pattern) {
        const player = this.game.player;
        const spawnDistance = 400;
        const positions = [];
        
        switch (pattern.formation) {
            case 'circle':
                for (let i = 0; i < pattern.count; i++) {
                    const angle = (i / pattern.count) * Math.PI * 2;
                    positions.push({
                        x: player.x + Math.cos(angle) * spawnDistance,
                        y: player.y + Math.sin(angle) * spawnDistance
                    });
                }
                break;
                
            case 'line':
                const lineAngle = Math.random() * Math.PI * 2;
                const startOffset = -(pattern.count - 1) * pattern.spacing / 2;
                for (let i = 0; i < pattern.count; i++) {
                    const offset = startOffset + i * pattern.spacing;
                    positions.push({
                        x: player.x + Math.cos(lineAngle) * spawnDistance + Math.cos(lineAngle + Math.PI/2) * offset,
                        y: player.y + Math.sin(lineAngle) * spawnDistance + Math.sin(lineAngle + Math.PI/2) * offset
                    });
                }
                break;
                
            case 'pincer':
                const pincerAngle = Math.atan2(player.y - player.lastY || 0, player.x - player.lastX || 1);
                positions.push(
                    {
                        x: player.x + Math.cos(pincerAngle + Math.PI/3) * spawnDistance,
                        y: player.y + Math.sin(pincerAngle + Math.PI/3) * spawnDistance
                    },
                    {
                        x: player.x + Math.cos(pincerAngle - Math.PI/3) * spawnDistance,
                        y: player.y + Math.sin(pincerAngle - Math.PI/3) * spawnDistance
                    }
                );
                break;
                
            case 'single':
            default:
                const angle = Math.random() * Math.PI * 2;
                positions.push({
                    x: player.x + Math.cos(angle) * spawnDistance,
                    y: player.y + Math.sin(angle) * spawnDistance
                });
                break;
        }
        
        return positions;
    }
    
    processSpawnQueue(deltaTime) {
        const currentTime = performance.now();
        
        for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
            const spawn = this.spawnQueue[i];
            spawn.delay -= deltaTime * 1000;
            
            if (spawn.delay <= 0) {
                this.executeSpawn(spawn);
                this.spawnQueue.splice(i, 1);
            }
        }
    }
    
    executeSpawn(spawn) {
        if (!this.game.enemySpawner) return;
        
        // Use existing enemy spawner but with calculated position and type
        const enemy = this.game.enemySpawner.createEnemy(spawn.type, spawn.position.x, spawn.position.y);
        if (enemy) {
            this.game.enemies.push(enemy);
        }
    }
}

// Difficulty analysis system
class DifficultyAnalyzer {
    constructor() {
        this.playerHealthHistory = [];
        this.killRateHistory = [];
        this.deathCount = 0;
        this.analysisUpdateInterval = 1000; // Update every second
        this.lastAnalysisTime = 0;
        this.currentAnalysis = {
            playerStruggling: false,
            playerDominating: false,
            playerHasAreaDamage: false,
            gameDifficulty: 1.0
        };
    }
    
    update(game) {
        const currentTime = performance.now();
        
        if (currentTime - this.lastAnalysisTime > this.analysisUpdateInterval) {
            this.analyzeGameState(game);
            this.lastAnalysisTime = currentTime;
        }
    }
    
    analyzeGameState(game) {
        if (!game.player) return;
        
        const player = game.player;
        
        // Track player health trend
        const healthPercent = player.health / player.maxHealth;
        this.playerHealthHistory.push(healthPercent);
        if (this.playerHealthHistory.length > 10) {
            this.playerHealthHistory.shift();
        }
        
        // Calculate kill rate
        const recentKills = this.calculateRecentKillRate(game);
        this.killRateHistory.push(recentKills);
        if (this.killRateHistory.length > 5) {
            this.killRateHistory.shift();
        }
        
        // Update analysis
        this.updateAnalysis(player, game);
    }
    
    calculateRecentKillRate(game) {
        // This would need to be tracked elsewhere, simplified for now
        const aliveEnemies = game.enemies.filter(e => !e.isDead).length;
        return Math.max(0, 50 - aliveEnemies); // Rough approximation
    }
    
    updateAnalysis(player, game) {
        const avgHealth = this.playerHealthHistory.reduce((a, b) => a + b, 0) / this.playerHealthHistory.length;
        const avgKillRate = this.killRateHistory.reduce((a, b) => a + b, 0) / this.killRateHistory.length;
        
        // Determine if player is struggling
        this.currentAnalysis.playerStruggling = avgHealth < 0.3 || avgKillRate < 2;
        
        // Determine if player is dominating
        this.currentAnalysis.playerDominating = avgHealth > 0.8 && avgKillRate > 8;
        
        // Check for area damage capabilities
        this.currentAnalysis.playerHasAreaDamage = 
            player.hasExplosiveAttack || 
            player.hasChainLightning || 
            player.projectileCount > 3;
        
        // Calculate overall difficulty
        this.currentAnalysis.gameDifficulty = Math.max(1, 
            (game.gameTime || 0) / 30 + // Time-based scaling
            (player.level || 1) * 0.2 + // Level-based scaling
            this.deathCount * 0.1 // Death penalty
        );
    }
    
    getAnalysis() {
        return { ...this.currentAnalysis };
    }
    
    recordPlayerDeath() {
        this.deathCount++;
    }
}

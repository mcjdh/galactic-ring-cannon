class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = 'enemy';
        this.enemyType = type;
        this.radius = 15;
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.speed = 100;
        this.xpValue = 10;
        this.isDead = false;
        this.color = '#e74c3c';
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for each enemy
        
        // Special attack properties
        this.canRangeAttack = false;
        this.rangeAttackCooldown = 0;
        this.rangeAttackTimer = 0;
        this.projectileSpeed = 200;
        this.projectileDamage = 5;
        
        // Special movement properties
        this.dashCooldown = 0;
        this.dashTimer = 0;
        this.dashSpeed = 0;
        this.dashDuration = 0;
        this.isDashing = false;
        
        // Boss specific properties
        this.isBoss = false;
        this.spawnMinionCooldown = 0;
        this.spawnMinionTimer = 0;
        
        // Special effects
        this.deathEffect = 'normal'; // normal, explosion, etc.
        
        // Customize based on enemy type
        this.configureEnemyType();
    }
    
    configureEnemyType() {
        switch (this.enemyType) {
            case 'basic':
                // Default values
                break;
                
            case 'fast':
                this.radius = 12;
                this.health = this.maxHealth = 20;
                this.damage = 5;
                this.speed = 180;
                this.xpValue = 15;
                this.color = '#f39c12';
                break;
                
            case 'tank':
                this.radius = 25;
                this.health = this.maxHealth = 100;
                this.damage = 20;
                this.speed = 60;
                this.xpValue = 30;
                this.color = '#8e44ad';
                break;
                
            case 'ranged':
                this.radius = 14;
                this.health = this.maxHealth = 25;
                this.damage = 8;
                this.speed = 70;
                this.xpValue = 20;
                this.color = '#16a085';
                this.canRangeAttack = true;
                this.rangeAttackCooldown = 3; // seconds
                break;
                
            case 'dasher':
                this.radius = 13;
                this.health = this.maxHealth = 30;
                this.damage = 15;
                this.speed = 120;
                this.xpValue = 25;
                this.color = '#c0392b';
                this.dashCooldown = 5; // seconds
                this.dashSpeed = 400;
                this.dashDuration = 0.5; // seconds
                break;
                
            case 'exploder':
                this.radius = 18;
                this.health = this.maxHealth = 40;
                this.damage = 25;
                this.speed = 90;
                this.xpValue = 35;
                this.color = '#d35400';
                this.deathEffect = 'explosion';
                break;
                
            case 'boss':
                this.radius = 40;
                this.health = this.maxHealth = 500;
                this.damage = 30;
                this.speed = 50;
                this.xpValue = 200;
                this.color = '#c0392b';
                this.isBoss = true;
                this.canRangeAttack = true;
                this.rangeAttackCooldown = 2;
                this.spawnMinionCooldown = 10;
                break;
        }
    }
    
    update(deltaTime, game) {
        // Handle special abilities
        if (this.canRangeAttack) {
            this.rangeAttackTimer += deltaTime;
            if (this.rangeAttackTimer >= this.rangeAttackCooldown) {
                this.rangeAttackTimer = 0;
                this.performRangeAttack(game);
            }
        }
        
        if (this.dashCooldown > 0 && !this.isDashing) {
            this.dashTimer += deltaTime;
            if (this.dashTimer >= this.dashCooldown) {
                this.dashTimer = 0;
                this.startDash();
            }
        }
        
        if (this.isDashing) {
            this.dashTimer += deltaTime;
            if (this.dashTimer >= this.dashDuration) {
                this.isDashing = false;
                this.dashTimer = 0;
            }
        }
        
        // Boss minion spawning
        if (this.isBoss && this.spawnMinionCooldown > 0) {
            this.spawnMinionTimer += deltaTime;
            if (this.spawnMinionTimer >= this.spawnMinionCooldown) {
                this.spawnMinionTimer = 0;
                this.spawnMinions(game);
            }
        }
        
        // Move toward player
        if (game.player && !game.player.isDead && !this.isDashing) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Ranged enemies maintain distance
            if (this.canRangeAttack && distance < 300 && distance > 100) {
                // Don't move if in ideal range
                return;
            }
            
            if (distance > 0) {
                const speed = this.isDashing ? this.dashSpeed : this.speed;
                const vx = (dx / distance) * speed * deltaTime;
                const vy = (dy / distance) * speed * deltaTime;
                
                this.x += vx;
                this.y += vy;
            }
        }
    }
    
    startDash() {
        this.isDashing = true;
        this.dashTimer = 0;
    }
    
    performRangeAttack(game) {
        if (!game.player || game.player.isDead) return;
        
        // Calculate direction to player
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const angle = Math.atan2(dy, dx);
        
        const projectile = new EnemyProjectile(
            this.x,
            this.y,
            Math.cos(angle) * this.projectileSpeed,
            Math.sin(angle) * this.projectileSpeed,
            this.projectileDamage
        );
        
        game.addEntity(projectile);
    }
    
    spawnMinions(game) {
        // Spawn 2-3 basic enemies around the boss
        const count = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 30;
            
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            const randomType = Math.random() < 0.7 ? 'basic' : 'fast';
            const enemy = new Enemy(x, y, randomType);
            
            game.addEntity(enemy);
        }
        
        // Visual effect
        gameManager.showFloatingText("Summoning!", this.x, this.y - 30, "#9b59b6", 20);
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        // Boss damage feedback
        if (this.isBoss) {
            gameManager.showFloatingText(`${Math.round(amount)}`, this.x, this.y - 30, '#ffffff', 14);
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isDead = true;
        
        // Create XP orb
        const orb = new XPOrb(this.x, this.y, this.xpValue);
        gameManager.game.addEntity(orb);
        
        // Special death effects
        if (this.deathEffect === 'explosion') {
            this.createExplosion();
        }
        
        // Boss death effect
        if (this.isBoss) {
            this.createBossDeathEffect();
        }
        
        // Track kills and show floating text
        const kills = gameManager.incrementKills();
        gameManager.showFloatingText(`+1`, this.x, this.y - 30, '#e74c3c', 16);
        
        // Show milestone messages
        if (kills % 50 === 0) {
            gameManager.showFloatingText(`${kills} KILLS!`, 
                                        gameManager.game.player.x, 
                                        gameManager.game.player.y - 50, 
                                        '#f39c12', 24);
        }
    }
    
    createExplosion() {
        const explosionRadius = this.radius * 3;
        const explosionDamage = this.maxHealth * 0.6;
        
        // Damage player if in range
        const player = gameManager.game.player;
        if (player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < explosionRadius + player.radius) {
                player.takeDamage(explosionDamage);
            }
        }
        
        // Add visual explosion effect
        gameManager.createExplosion(this.x, this.y, explosionRadius, '#d35400');
    }
    
    createBossDeathEffect() {
        // Boss death creates many XP orbs
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80;
            
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            const orb = new XPOrb(x, y, 20);
            gameManager.game.addEntity(orb);
        }
        
        // Visual explosion
        gameManager.createExplosion(this.x, this.y, 100, '#c0392b');
        
        // Show message
        gameManager.showFloatingText("BOSS DEFEATED!", 
                                     gameManager.game.player.x, 
                                     gameManager.game.player.y - 50, 
                                     "#f1c40f", 
                                     30);
    }
    
    render(ctx) {
        // Draw enemy
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Special visuals for dashing enemies
        if (this.isDashing) {
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, '#ffffff');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.color;
        }
        
        ctx.fill();
        
        // Draw boss indicator or special enemy indicators
        if (this.isBoss) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.canRangeAttack || this.deathEffect === 'explosion') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = this.canRangeAttack ? '#16a085' : '#d35400';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw health bar
        const healthBarWidth = this.radius * 2;
        const healthBarHeight = this.isBoss ? 6 : 4;
        const healthPercentage = this.health / this.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(
            this.x - this.radius,
            this.y - this.radius - (this.isBoss ? 15 : 10),
            healthBarWidth,
            healthBarHeight
        );
        
        ctx.fillStyle = healthPercentage < 0.3 ? '#e74c3c' : '#2ecc71';
        ctx.fillRect(
            this.x - this.radius,
            this.y - this.radius - (this.isBoss ? 15 : 10),
            healthBarWidth * healthPercentage,
            healthBarHeight
        );
    }
}

class EnemyProjectile {
    constructor(x, y, vx, vy, damage) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = 'enemyProjectile';
        this.radius = 5;
        this.damage = damage;
        this.isDead = false;
        this.lifetime = 3; // seconds
        this.timer = 0;
    }
    
    update(deltaTime, game) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        this.timer += deltaTime;
        if (this.timer >= this.lifetime) {
            this.isDead = true;
            return;
        }
        
        // Check collision with player
        if (game.player && !game.player.isInvulnerable && !game.player.isDead) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < game.player.radius + this.radius) {
                game.player.takeDamage(this.damage);
                this.isDead = true;
            }
        }
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#9b59b6';
        ctx.fill();
        
        // Trail effect
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.02, this.y - this.vy * 0.02);
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = this.radius * 1.5;
        ctx.stroke();
    }
}

// Fix enemy projectiles tracking in game engine
const originalPerformRangeAttack = Enemy.prototype.performRangeAttack;
Enemy.prototype.performRangeAttack = function(game) {
    if (!game.player || game.player.isDead) return;
    
    // Calculate direction to player
    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const angle = Math.atan2(dy, dx);
    
    const projectile = new EnemyProjectile(
        this.x,
        this.y,
        Math.cos(angle) * this.projectileSpeed,
        Math.sin(angle) * this.projectileSpeed,
        this.projectileDamage
    );
    
    // Track enemy projectiles separately
    if (!game.enemyProjectiles) {
        game.enemyProjectiles = [];
    }
    
    game.enemyProjectiles.push(projectile);
    game.addEntity(projectile);
};

// Make boss enemies more distinctive
const originalEnemyRender = Enemy.prototype.render;
Enemy.prototype.render = function(ctx) {
    // Call the original render method
    originalEnemyRender.call(this, ctx);
    
    // Add special effects for boss
    if (this.isBoss) {
        // Pulsing aura
        const pulseSize = 1 + Math.sin(gameManager.gameTime / 200) * 0.1;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseSize + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(192, 57, 43, 0.2)';
        ctx.fill();
        
        // Crown or boss indicator
        ctx.save();
        ctx.translate(this.x, this.y - this.radius - 15);
        
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-5, -8);
        ctx.lineTo(0, 0);
        ctx.lineTo(5, -8);
        ctx.lineTo(10, 0);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        
        ctx.restore();
    }
};

class XPOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        // Allow for value adjustments in gameManager.js
        this.value = value;
        this.type = 'xpOrb';
        this.radius = 5;
        this.isDead = false;
        this.color = '#2ecc71';
        
        // Add some random scatter
        this.x += (Math.random() - 0.5) * 40;
        this.y += (Math.random() - 0.5) * 40;
        
        // Make bigger XP orbs for higher values
        if (value > 20) {
            this.radius = 8;
        } else if (value > 50) {
            this.radius = 12;
        }
        
        // Animation properties
        this.bobAmplitude = 3;
        this.bobSpeed = 3;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotation = 0;
    }
    
    update(deltaTime, game) {
        // Animation
        this.bobOffset += this.bobSpeed * deltaTime;
        this.rotation += deltaTime * 2;
        
        // Magnetism when player is close
        if (game.player) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Magnetism range (use player's magnetRange property)
            const magnetRange = game.player.magnetRange || 100;
            
            if (distance < magnetRange) {
                const pullFactor = 1 - (distance / magnetRange); // Stronger pull when closer
                const pullStrength = 300 * pullFactor;
                const speed = pullStrength * deltaTime;
                
                if (distance > 0) {
                    const vx = (dx / distance) * speed;
                    const vy = (dy / distance) * speed;
                    
                    this.x += vx;
                    this.y += vy;
                }
            }
        }
    }
    
    render(ctx) {
        const bobY = Math.sin(this.bobOffset) * this.bobAmplitude;
        
        // Draw glow
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(46, 204, 113, 0.3)`;
        ctx.fill();
        
        // Draw orb
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Draw XP symbol inside orb
        ctx.save();
        ctx.translate(this.x, this.y + bobY);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.moveTo(-this.radius/2, -this.radius/2);
        ctx.lineTo(this.radius/2, this.radius/2);
        ctx.moveTo(-this.radius/2, this.radius/2);
        ctx.lineTo(this.radius/2, -this.radius/2);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
}

class EnemySpawner {
    constructor(game) {
        this.game = game;
        this.spawnRate = 1; // enemies per second
        this.spawnTimer = 0;
        this.spawnCooldown = 1 / this.spawnRate;
        this.maxEnemies = 50;
        this.spawnRadius = 800; // Distance from player to spawn enemies
        this.enemyTypes = ['basic'];
        this.difficultyTimer = 0;
        this.bossTimer = 0;
        this.bossInterval = 95; // Boss every ~1.5 minutes (reduced for faster pacing)
        this.wavesEnabled = true;
        this.waveTimer = 0;
        this.waveInterval = 30; // Wave every 30 seconds
        this.waveCount = 0;
        
        // Enemy quality scaling
        this.eliteChance = 0.05; // 5% chance for an elite enemy
        this.eliteTimer = 0;
        this.eliteInterval = 40; // Increase elite chance every 40 seconds
        
        // Add boss scaling parameters
        this.bossScaleFactor = 1.0;
        
        // Track enemy count for analytics
        this.totalEnemiesSpawned = 0;
    }
    
    update(deltaTime) {
        // Increase difficulty over time
        this.difficultyTimer += deltaTime;
        this.bossTimer += deltaTime;
        this.waveTimer += deltaTime;
        
        // Every 30 seconds, increase spawn rate and max enemies
        if (this.difficultyTimer >= 30) {
            this.difficultyTimer = 0;
            this.spawnRate = Math.min(5, this.spawnRate * 1.2);
            this.spawnCooldown = 1 / this.spawnRate;
            this.maxEnemies = Math.min(200, this.maxEnemies + 10);
            
            // Add new enemy types based on time - accelerated progression
            const gameTimeMinutes = this.game.gameTime / 60000;
            
            if (!this.enemyTypes.includes('fast') && gameTimeMinutes >= 0.5) { // 30 seconds (down from 1 min)
                this.enemyTypes.push('fast');
                this.showNewEnemyMessage("Fast enemies have appeared!");
            }
            if (!this.enemyTypes.includes('tank') && gameTimeMinutes >= 1) { // 1 minute (down from 2 min)
                this.enemyTypes.push('tank');
                this.showNewEnemyMessage("Tank enemies have appeared!");
            }
            if (!this.enemyTypes.includes('ranged') && gameTimeMinutes >= 1.5) { // 1.5 minutes (down from 3 min)
                this.enemyTypes.push('ranged');
                this.showNewEnemyMessage("Ranged enemies have appeared!");
            }
            if (!this.enemyTypes.includes('dasher') && gameTimeMinutes >= 2) { // 2 minutes (down from 4 min)
                this.enemyTypes.push('dasher');
                this.showNewEnemyMessage("Dasher enemies have appeared!");
            }
            if (!this.enemyTypes.includes('exploder') && gameTimeMinutes >= 2.5) { // 2.5 minutes (down from 5 min)
                this.enemyTypes.push('exploder');
                this.showNewEnemyMessage("Exploding enemies have appeared!");
            }
        }
        
        // Boss spawning
        if (this.bossTimer >= this.bossInterval) {
            this.bossTimer = 0;
            this.spawnBoss();
        }
        
        // Wave spawning
        if (this.wavesEnabled && this.waveTimer >= this.waveInterval) {
            this.waveTimer = 0;
            this.spawnWave();
        }
        
        // Regular enemy spawning
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnCooldown && this.game.enemies.length < this.maxEnemies) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }
    }
    
    showNewEnemyMessage(message) {
        if (this.game.player) {
            gameManager.showFloatingText(message, 
                                       this.game.player.x, 
                                       this.game.player.y - 50, 
                                       "#f39c12", 
                                       24);
        }
    }
    
    spawnEnemy() {
        if (!this.game.player) return;
        
        // Generate position around player
        const angle = Math.random() * Math.PI * 2;
        const x = this.game.player.x + Math.cos(angle) * this.spawnRadius;
        const y = this.game.player.y + Math.sin(angle) * this.spawnRadius;
        
        // Pick a random enemy type
        const enemyType = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
        
        // Create and add enemy
        const enemy = new Enemy(x, y, enemyType);
        
        // Apply difficulty scaling to enemy stats
        if (gameManager && gameManager.difficultyFactor) {
            const difficultyScaling = 1 + ((gameManager.difficultyFactor - 1) * 0.5);
            
            // Scale enemy health and damage with difficulty
            enemy.maxHealth = Math.ceil(enemy.maxHealth * difficultyScaling);
            enemy.health = enemy.maxHealth;
            enemy.damage = Math.ceil(enemy.damage * difficultyScaling);
            
            // Scale XP reward slightly (but not as much as stats)
            enemy.xpValue = Math.ceil(enemy.xpValue * (1 + ((difficultyScaling - 1) * 0.5)));
        }
        
        // Chance to create an elite enemy with boosted stats
        if (Math.random() < this.eliteChance) {
            this.makeElite(enemy);
        }
        
        this.game.addEntity(enemy);
        this.totalEnemiesSpawned++;
    }
    
    makeElite(enemy) {
        // Boost enemy stats for elite version
        enemy.maxHealth *= 2.5; // Even stronger elites
        enemy.health = enemy.maxHealth;
        enemy.damage *= 1.5;
        enemy.xpValue *= 3;
        enemy.radius *= 1.2;
        
        // Add elite visual indicator
        enemy.isElite = true;
        enemy.glowColor = '#f1c40f';
        
        // Additional unique elite abilities based on enemy type
        switch (enemy.enemyType) {
            case 'basic':
                enemy.damageReduction = 0.2; // 20% damage reduction
                break;
            case 'fast':
                enemy.speed *= 1.2; // Even faster
                break;
            case 'tank':
                enemy.deflectChance = 0.2; // Chance to deflect projectiles
                break;
            case 'ranged':
                enemy.projectileDamage *= 1.5;
                enemy.rangeAttackCooldown *= 0.7; // Shoot more often
                break;
            case 'dasher':
                enemy.dashCooldown *= 0.7; // Dash more frequently
                enemy.dashSpeed *= 1.2; // Dash faster
                break;
            case 'exploder':
                // Bigger explosion
                enemy.explosionRadiusMod = 1.5;
                break;
            case 'teleporter':
                enemy.teleportCooldown *= 0.6; // Teleport more often
                break;
        }
        
        return enemy;
    }
    
    spawnBoss() {
        if (!this.game.player) return;
        
        // Generate position around player
        const angle = Math.random() * Math.PI * 2;
        const x = this.game.player.x + Math.cos(angle) * this.spawnRadius;
        const y = this.game.player.y + Math.sin(angle) * this.spawnRadius;
        
        // Create boss with progressive scaling
        const boss = new Enemy(x, y, 'boss');
        
        // Scale boss with game time and based on how many bosses have spawned
        if (gameManager && gameManager.difficultyFactor) {
            // Determine if this should be a mega boss (every 3rd boss after the first)
            const isMegaBoss = gameManager.gameStats && 
                gameManager.gameStats.bossesSpawned &&
                (gameManager.gameStats.bossesSpawned + 1) % 3 === 0 && 
                gameManager.gameStats.bossesSpawned > 0;
            
            // Apply scaled stats
            const bossScaling = gameManager.difficultyFactor * 
                (isMegaBoss ? 1.5 : 1.0);
            
            boss.maxHealth *= bossScaling;
            boss.health = boss.maxHealth;
            boss.damage *= Math.sqrt(bossScaling); // Scale damage less aggressively
            boss.xpValue *= bossScaling;
            
            // Visual indicator for mega bosses
            if (isMegaBoss) {
                boss.radius *= 1.2; 
                boss.color = '#8e44ad'; // Purple for mega bosses
                boss.isMegaBoss = true;
                
                // More frequent special attacks for mega bosses
                if (boss.rangeAttackCooldown) boss.rangeAttackCooldown *= 0.7;
                if (boss.spawnMinionCooldown) boss.spawnMinionCooldown *= 0.7;
                
                gameManager.showFloatingText("MEGA BOSS APPEARED!", 
                                          this.game.player.x, 
                                          this.game.player.y - 50, 
                                          "#8e44ad", 
                                          32);
                
                // Add extra screen shake
                if (gameManager.addScreenShake) {
                    gameManager.addScreenShake(10, 1.0);
                }
            } else {
                gameManager.showFloatingText("BOSS APPEARED!", 
                                          this.game.player.x, 
                                          this.game.player.y - 50, 
                                          "#c0392b", 
                                          30);
                
                // Add regular screen shake
                if (gameManager.addScreenShake) {
                    gameManager.addScreenShake(5, 0.7);
                }
            }
        }
        
        this.game.addEntity(boss);
        this.totalEnemiesSpawned++;
        
        // Track boss spawns
        if (gameManager && gameManager.gameStats) {
            gameManager.gameStats.bossesSpawned = 
                (gameManager.gameStats.bossesSpawned || 0) + 1;
        }
    }
    
    spawnWave() {
        if (!this.game.player) return;
        
        this.waveCount++;
        // Scaling wave size based on difficulty and wave count
        const difficultyMod = gameManager ? gameManager.difficultyFactor : 1;
        const waveSize = Math.floor(8 + (this.waveCount * 1.5) + (difficultyMod * 3));
        
        // Notify player
        gameManager.showFloatingText(`WAVE ${this.waveCount} INCOMING!`, 
                                   this.game.player.x, 
                                   this.game.player.y - 50, 
                                   "#3498db", 
                                   24);
        
        // Make waves spawn in a visible radius
        const spawnRadius = Math.min(this.spawnRadius, 600);
        
        // Spawn enemies in a circle around player
        for (let i = 0; i < waveSize; i++) {
            const angle = (i / waveSize) * Math.PI * 2;
            const x = this.game.player.x + Math.cos(angle) * spawnRadius;
            const y = this.game.player.y + Math.sin(angle) * spawnRadius;
            
            // Make waves include more advanced enemies as game progresses
            let enemyType;
            
            // More varied enemy types in later waves
            if (this.waveCount <= 1) {
                enemyType = 'basic';
            } else if (this.waveCount <= 3) {
                enemyType = Math.random() < 0.7 ? 'basic' : 'fast';
            } else if (this.waveCount <= 5) {
                const roll = Math.random();
                if (roll < 0.5) enemyType = 'basic';
                else if (roll < 0.8) enemyType = 'fast';
                else enemyType = 'tank';
            } else {
                // Use weighted random selection based on enemy difficulty
                enemyType = this.getWeightedEnemyType();
            }
            
            // Create and add enemy
            const enemy = new Enemy(x, y, enemyType);
            
            // Apply difficulty scaling to wave enemies
            if (gameManager && gameManager.difficultyFactor) {
                const scaling = 1 + ((gameManager.difficultyFactor - 1) * 0.5);
                enemy.maxHealth = Math.ceil(enemy.maxHealth * scaling);
                enemy.health = enemy.maxHealth;
                enemy.damage = Math.ceil(enemy.damage * scaling);
            }
            
            // Higher elite chance in waves
            if (Math.random() < this.eliteChance * 1.5) {
                this.makeElite(enemy);
            }
            
            this.game.addEntity(enemy);
            this.totalEnemiesSpawned++;
        }
        
        // Add screen shake for wave spawn
        if (gameManager && gameManager.addScreenShake) {
            gameManager.addScreenShake(3, 0.4);
        }
    }
    
    // Helper method for weighted enemy type selection
    getWeightedEnemyType() {
        // Don't try to select from empty array
        if (!this.enemyTypes.length) return 'basic';
        
        // Define weights for different enemy types (higher = less common)
        const weights = {
            'basic': 1,
            'fast': 2,
            'tank': 3,
            'ranged': 3,
            'dasher': 4,
            'exploder': 5,
            'teleporter': 5
        };
        
        // Create weighted list of available types
        const availableTypes = [];
        this.enemyTypes.forEach(type => {
            // Add each type to the array a number of times inversely proportional to its weight
            const count = Math.max(1, Math.floor(10 / (weights[type] || 1)));
            for (let i = 0; i < count; i++) {
                availableTypes.push(type);
            }
        });
        
        // Pick random enemy type from weighted list
        return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
}

// Override boss render to show mega boss visual difference
const originalBossRender = Enemy.prototype.render;
Enemy.prototype.render = function(ctx) {
    // Call the original render method
    originalBossRender.call(this, ctx);
    
    // Additional visual effects for mega bosses
    if (this.isBoss && this.isMegaBoss) {
        // Extra aura for mega bosses
        const pulseSize = 1 + Math.sin((gameManager.gameTime || 0) / 150) * 0.15;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseSize + 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(142, 68, 173, 0.2)'; // Purple aura
        ctx.fill();
        
        // Add sparkle effects around mega boss
        for (let i = 0; i < 3; i++) {
            const angle = ((gameManager.gameTime || 0) / 200 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
            const distance = this.radius * 1.5;
            const sparkleX = this.x + Math.cos(angle) * distance;
            const sparkleY = this.y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
        }
    }
};

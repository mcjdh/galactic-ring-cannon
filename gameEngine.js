class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Game state
        this.entities = [];
        this.player = null;
        this.enemies = [];
        this.xpOrbs = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lastTime = 0;
        this.gameTime = 0;
        this.isPaused = false;
        
        // Input handling with additional pause key support
        this.keys = {};
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            
            // Pause game when pressing P or Escape
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });
        window.addEventListener('keyup', e => this.keys[e.key] = false);
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    start() {
        this.gameLoop(0);
    }
    
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.gameTime += deltaTime;
        
        if (!this.isPaused) {
            this.update(deltaTime / 1000); // Convert to seconds
            this.render();
        }
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // Update all entities
        this.entities.forEach(entity => entity.update(deltaTime, this));
        
        // Check collisions
        this.checkCollisions();
        
        // Clean up dead entities
        this.cleanupEntities();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set camera to follow player
        this.ctx.save();
        if (this.player) {
            const cameraX = -this.player.x + this.canvas.width / 2;
            const cameraY = -this.player.y + this.canvas.height / 2;
            this.ctx.translate(cameraX, cameraY);
        }
        
        // Render all entities
        // Sort entities by y position for proper layering
        [...this.entities].sort((a, b) => a.y - b.y).forEach(entity => {
            entity.render(this.ctx);
        });
        
        this.ctx.restore();
    }
    
    checkCollisions() {
        // Player collision with XP orbs
        if (this.player) {
            this.xpOrbs.forEach(orb => {
                if (this.isColliding(this.player, orb)) {
                    this.player.addXP(orb.value);
                    orb.isDead = true;
                }
            });
            
            // Player collision with enemies
            this.enemies.forEach(enemy => {
                if (this.isColliding(this.player, enemy) && !this.player.isInvulnerable) {
                    this.player.takeDamage(enemy.damage);
                }
            });
            
            // Projectile collision with enemies
            this.projectiles.forEach(projectile => {
                this.enemies.forEach(enemy => {
                    // Skip dead enemies
                    if (enemy.isDead) return;
                    
                    // Check for collision
                    if (this.isColliding(projectile, enemy)) {
                        // Call the hit method which handles all special effects
                        const hitSuccessful = projectile.hit(enemy);
                        
                        // Apply damage to enemy
                        enemy.takeDamage(projectile.damage);
                        
                        // Mark projectile as dead if not piercing
                        if (hitSuccessful && !projectile.piercing) {
                            projectile.isDead = true;
                        }
                    }
                });
            });
        }
    }
    
    isColliding(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (entity1.radius + entity2.radius);
    }
    
    cleanupEntities() {
        this.entities = this.entities.filter(entity => !entity.isDead);
        this.enemies = this.enemies.filter(enemy => !enemy.isDead);
        this.xpOrbs = this.xpOrbs.filter(orb => !orb.isDead);
        this.projectiles = this.projectiles.filter(projectile => !projectile.isDead);
        if (this.enemyProjectiles) {
            this.enemyProjectiles = this.enemyProjectiles.filter(projectile => !projectile.isDead);
        }
    }
    
    addEntity(entity) {
        this.entities.push(entity);
        
        if (entity.type === 'player') {
            this.player = entity;
        } else if (entity.type === 'enemy') {
            this.enemies.push(entity);
        } else if (entity.type === 'xpOrb') {
            this.xpOrbs.push(entity);
        } else if (entity.type === 'projectile') {
            this.projectiles.push(entity);
        } else if (entity.type === 'enemyProjectile') {
            if (!this.enemyProjectiles) {
                this.enemyProjectiles = [];
            }
            this.enemyProjectiles.push(entity);
        }
        
        return entity;
    }
    
    togglePause() {
        // Don't allow toggling pause when level-up menu is active
        if (upgradeSystem && upgradeSystem.isLevelUpActive()) {
            return;
        }
        
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }
    
    pauseGame() {
        this.isPaused = true;
        
        // Only show pause menu if we're not in level-up mode
        if (!upgradeSystem || !upgradeSystem.isLevelUpActive()) {
            document.getElementById('pause-menu').classList.remove('hidden');
        }
    }
    
    resumeGame() {
        // Don't resume if level-up menu is active
        if (upgradeSystem && upgradeSystem.isLevelUpActive()) {
            return;
        }
        
        this.isPaused = false;
        
        // Hide pause menu
        document.getElementById('pause-menu').classList.add('hidden');
    }
}

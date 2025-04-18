class GameEngine {
    constructor() {
        // Initialize canvas with error handling
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Game canvas not found!');
            return;
        }
        
        // Optimize canvas for GPU rendering
        this.canvas.style.willChange = 'transform'; // Hint to browser for GPU acceleration
        this.canvas.style.transform = 'translateZ(0)'; // Force GPU layer
        this.canvas.style.backfaceVisibility = 'hidden'; // Optimize for transforms
        
        // Get 2D context with performance optimizations
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false, // Disable alpha for better performance
            willReadFrequently: false // Optimize for GPU rendering
        });
        
        if (!this.ctx) {
            console.error('Could not get 2D context!');
            return;
        }
        
        // Set canvas size to window size with error handling
        try {
            this.resizeCanvas();
            window.addEventListener('resize', this.resizeCanvas.bind(this));
        } catch (error) {
            console.error('Error initializing canvas:', error);
        }
        
        // Game state with null checks
        this.entities = [];
        this.player = null;
        this.enemies = [];
        this.xpOrbs = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lastTime = 0;
        this.gameTime = 0;
        this.isPaused = false;
        
        // Performance monitoring with fallbacks
        this.frameTimes = [];
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.targetFps = 60;
        this.frameTime = 1000 / this.targetFps;
        this.lastFrameTime = 0;
        this.gpuUsage = 0;
        this.performanceMode = false;
        this.lowGpuMode = false;
        this.maxParticles = 150;
        this.particleReductionFactor = 1.0;
        this.debugMode = false;
        
        // Object pools with size limits
        this.projectilePool = [];
        this.particlePool = [];
        this.maxPoolSize = 100;
        
        // Spatial partitioning with error handling
        this.gridSize = 100;
        this.spatialGrid = new Map();
        
        // Input handling with additional pause key support and error handling
        this.keys = {};
        try {
            window.addEventListener('keydown', e => {
                this.keys[e.key] = true;
                
                // Pause game when pressing P or Escape
                if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                    this.togglePause();
                }
                
                // Toggle debug mode with F3
                if (e.key === 'F3') {
                    this.debugMode = !this.debugMode;
                }
                
                // Add performance mode toggle
                if (e.key === 'p' || e.key === 'P') {
                    this.togglePerformanceMode();
                }
            });
            window.addEventListener('keyup', e => this.keys[e.key] = false);
        } catch (error) {
            console.error('Error setting up input handling:', error);
        }
        
        // Visibility state tracking
        this.isVisible = true;
        this.isMinimized = false;
        this.lastVisibilityChange = 0;
        
        // Add visibility change handlers
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('focus', this.handleFocusChange.bind(this));
        window.addEventListener('blur', this.handleBlurChange.bind(this));
        
        // Resource management
        this.resourceCleanupInterval = 5000; // 5 seconds
        this.lastResourceCleanup = 0;
        
        // Performance thresholds
        this.lowGpuThreshold = 50; // 50% GPU usage
        this.highGpuThreshold = 80; // 80% GPU usage
        this.criticalGpuThreshold = 90; // 90% GPU usage
        
        // Initialize performance monitoring
        this.performanceHistory = [];
        this.maxHistorySize = 100;
    }
    
    resizeCanvas() {
        try {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            // Optimize canvas for performance
            this.canvas.style.imageRendering = 'pixelated';
            this.ctx.imageSmoothingEnabled = false;
            
            // Set up GPU-optimized rendering
            this.ctx.imageSmoothingQuality = 'low'; // Better performance
            this.ctx.globalCompositeOperation = 'source-over'; // Optimize blending
        } catch (error) {
            console.error('Error resizing canvas:', error);
        }
    }
    
    start() {
        this.gameLoop(0);
    }
    
    gameLoop(timestamp) {
        // Frame rate limiting
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.frameTime) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(elapsed);
        
        // Adjust performance mode based on GPU usage
        this.adjustPerformanceMode();
        
        // Update game state
        if (!this.isPaused) {
            this.update(elapsed / 1000);
            this.render();
        }
        
        this.lastFrameTime = timestamp;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // Update performance metrics
        this.updatePerformanceMetrics(deltaTime);
        
        // Update all entities with spatial optimization
        this.updateSpatialGrid();
        
        // Only update entities that are visible or near the player
        const visibleEntities = this.getVisibleEntities();
        visibleEntities.forEach(entity => entity.update(deltaTime, this));
        
        // Check collisions with spatial optimization
        this.checkCollisions();
        
        // Clean up dead entities
        this.cleanupEntities();
    }
    
    updatePerformanceMetrics(elapsed) {
        // Track frame times
        this.frameTimes.push(elapsed);
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // Calculate FPS
        this.frameCount++;
        this.lastFpsUpdate += elapsed;
        if (this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = 0;
            
            // Estimate GPU usage based on frame times
            const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            this.gpuUsage = Math.min(100, (avgFrameTime / this.frameTime) * 100);
            
            // Track performance history
            this.performanceHistory.push({
                timestamp: Date.now(),
                fps: this.fps,
                gpuUsage: this.gpuUsage,
                entityCount: this.entities.length
            });
            
            if (this.performanceHistory.length > this.maxHistorySize) {
                this.performanceHistory.shift();
            }
            
            if (this.debugMode) {
                console.log(`FPS: ${this.fps}, GPU: ${this.gpuUsage.toFixed(1)}%, Entities: ${this.entities.length}`);
            }
        }
        
        // Periodically clean up resources
        const now = Date.now();
        if (now - this.lastResourceCleanup > this.resourceCleanupInterval) {
            this.cleanupResources();
            this.lastResourceCleanup = now;
        }
    }
    
    adjustPerformanceMode() {
        // More aggressive performance adjustments based on GPU usage
        if (this.gpuUsage > this.criticalGpuThreshold) {
            // Critical performance mode
            this.enablePerformanceMode();
            this.targetFps = 30; // Reduce FPS target
            this.particleReductionFactor = 0.25; // More aggressive particle reduction
        } else if (this.gpuUsage > this.highGpuThreshold) {
            // High performance mode
            this.enablePerformanceMode();
            this.targetFps = 45;
            this.particleReductionFactor = 0.5;
        } else if (this.gpuUsage < this.lowGpuThreshold && this.performanceMode) {
            // Restore normal mode
            this.disablePerformanceMode();
            this.targetFps = 60;
            this.particleReductionFactor = 1.0;
        }
    }
    
    togglePerformanceMode() {
        if (this.performanceMode) {
            this.disablePerformanceMode();
        } else {
            this.enablePerformanceMode();
        }
    }
    
    enablePerformanceMode() {
        this.performanceMode = true;
        this.lowGpuMode = true;
        
        // Reduce visual effects
        this.particleReductionFactor = 0.5;
        this.maxParticles = Math.floor(this.maxParticles * 0.5);
        
        // Optimize rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Reduce update frequency for non-critical entities
        if (gameManager) {
            gameManager.updateInterval = 0.1; // Update every 100ms instead of every frame
        }
        
        console.log('Performance mode enabled');
    }
    
    disablePerformanceMode() {
        this.performanceMode = false;
        this.lowGpuMode = false;
        
        // Restore visual effects
        this.particleReductionFactor = 1.0;
        this.maxParticles = 150;
        
        // Restore rendering quality
        this.ctx.imageSmoothingEnabled = true;
        
        // Restore update frequency
        if (gameManager) {
            gameManager.updateInterval = 0;
        }
        
        console.log('Performance mode disabled');
    }
    
    updateSpatialGrid() {
        // Clear grid
        this.spatialGrid.clear();
        
        // Add entities to grid
        for (const entity of this.entities) {
            const gridX = Math.floor(entity.x / this.gridSize);
            const gridY = Math.floor(entity.y / this.gridSize);
            const key = `${gridX},${gridY}`;
            
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key).push(entity);
        }
    }
    
    checkCollisions() {
        // Use spatial grid for collision checks
        for (const [key, entities] of this.spatialGrid) {
            // Check collisions within the same grid cell
            this.checkCollisionsInCell(entities);
            
            // Check collisions with adjacent cells
            const [gridX, gridY] = key.split(',').map(Number);
            this.checkAdjacentCellCollisions(gridX, gridY, entities);
        }
    }
    
    checkCollisionsInCell(entities) {
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                if (this.isColliding(entities[i], entities[j])) {
                    this.handleCollision(entities[i], entities[j]);
                }
            }
        }
    }
    
    checkAdjacentCellCollisions(gridX, gridY, entities) {
        const adjacentOffsets = [
            [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]
        ];
        
        for (const [dx, dy] of adjacentOffsets) {
            const adjacentKey = `${gridX + dx},${gridY + dy}`;
            const adjacentEntities = this.spatialGrid.get(adjacentKey);
            
            if (adjacentEntities) {
                for (const entity of entities) {
                    for (const adjacentEntity of adjacentEntities) {
                        if (this.isColliding(entity, adjacentEntity)) {
                            this.handleCollision(entity, adjacentEntity);
                        }
                    }
                }
            }
        }
    }
    
    handleCollision(entity1, entity2) {
        if (!entity1 || !entity2) {
            console.error('Invalid collision entities!');
            return;
        }
        
        try {
            // Player collision with XP orbs
            if (entity1.type === 'player' && entity2.type === 'xpOrb') {
                entity1.addXP(entity2.value);
                entity2.isDead = true;
            } else if (entity2.type === 'player' && entity1.type === 'xpOrb') {
                entity2.addXP(entity1.value);
                entity1.isDead = true;
            }
            
            // Player collision with enemies
            if (entity1.type === 'player' && entity2.type === 'enemy' && !entity1.isInvulnerable) {
                entity1.takeDamage(entity2.damage);
            } else if (entity2.type === 'player' && entity1.type === 'enemy' && !entity2.isInvulnerable) {
                entity2.takeDamage(entity1.damage);
            }
            
            // Projectile collision with enemies
            if (entity1.type === 'projectile' && entity2.type === 'enemy' && !entity2.isDead) {
                const hitSuccessful = entity1.hit(entity2);
                entity2.takeDamage(entity1.damage);
                if (hitSuccessful && !entity1.piercing) {
                    entity1.isDead = true;
                }
            } else if (entity2.type === 'projectile' && entity1.type === 'enemy' && !entity1.isDead) {
                const hitSuccessful = entity2.hit(entity1);
                entity1.takeDamage(entity2.damage);
                if (hitSuccessful && !entity2.piercing) {
                    entity2.isDead = true;
                }
            }
        } catch (error) {
            console.error('Error handling collision:', error);
        }
    }
    
    render() {
        // Clear canvas with optimized method
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set camera with optimized transform
        this.ctx.save();
        if (this.player) {
            const cameraX = -this.player.x + this.canvas.width / 2;
            const cameraY = -this.player.y + this.canvas.height / 2;
            this.ctx.translate(cameraX, cameraY);
        }
        
        // Get visible entities with spatial optimization
        const visibleEntities = this.getVisibleEntities();
        
        // Group entities by type for batch rendering
        const entityGroups = new Map();
        for (const entity of visibleEntities) {
            const type = entity.constructor.name;
            if (!entityGroups.has(type)) {
                entityGroups.set(type, []);
            }
            entityGroups.get(type).push(entity);
        }
        
        // Render each group with optimized batching
        for (const [type, group] of entityGroups) {
            // Sort by y-coordinate within each group
            group.sort((a, b) => a.y - b.y);
            
            // Batch render similar entities
            this.batchRenderEntities(group);
        }
        
        // Render debug information if enabled
        if (this.debugMode) {
            this.renderDebugInfo();
        }
        
        this.ctx.restore();
    }
    
    batchRenderEntities(entities) {
        if (entities.length === 0) return;
        
        // Get the first entity to determine rendering properties
        const firstEntity = entities[0];
        
        // Set up common rendering properties
        this.ctx.fillStyle = firstEntity.color || '#ffffff';
        this.ctx.strokeStyle = firstEntity.strokeColor || '#000000';
        this.ctx.lineWidth = firstEntity.lineWidth || 1;
        
        // Batch render similar entities
        for (const entity of entities) {
            // Only update context if properties changed
            if (entity.color !== this.ctx.fillStyle) {
                this.ctx.fillStyle = entity.color;
            }
            if (entity.strokeColor !== this.ctx.strokeStyle) {
                this.ctx.strokeStyle = entity.strokeColor;
            }
            if (entity.lineWidth !== this.ctx.lineWidth) {
                this.ctx.lineWidth = entity.lineWidth;
            }
            
            // Render the entity
            entity.render(this.ctx);
        }
    }
    
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.translate(-this.player.x + this.canvas.width / 2, -this.player.y + this.canvas.height / 2);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const startX = Math.floor((this.player.x - this.canvas.width) / this.gridSize) * this.gridSize;
        const startY = Math.floor((this.player.y - this.canvas.height) / this.gridSize) * this.gridSize;
        const endX = Math.ceil((this.player.x + this.canvas.width) / this.gridSize) * this.gridSize;
        const endY = Math.ceil((this.player.y + this.canvas.height) / this.gridSize) * this.gridSize;
        
        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
        
        // Draw FPS counter
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        this.ctx.fillText(`Entities: ${this.entities.length}`, 10, 40);
        this.ctx.fillText(`Performance Mode: ${this.performanceMode}`, 10, 60);
        
        this.ctx.restore();
    }
    
    isColliding(entity1, entity2) {
        // Use squared distance to avoid costly sqrt per collision check
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        const r = entity1.radius + entity2.radius;
        return (dx * dx + dy * dy) < (r * r);
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
    
    // Add error handling to addEntity
    addEntity(entity) {
        if (!entity) {
            console.error('Attempted to add null entity!');
            return null;
        }
        
        try {
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
        } catch (error) {
            console.error('Error adding entity:', error);
            return null;
        }
    }
    
    // Add error handling to togglePause
    togglePause() {
        try {
            // Don't allow toggling pause when level-up menu is active
            if (upgradeSystem && upgradeSystem.isLevelUpActive()) {
                return;
            }
            
            if (this.isPaused) {
                this.resumeGame();
            } else {
                this.pauseGame();
            }
        } catch (error) {
            console.error('Error toggling pause:', error);
        }
    }
    
    pauseGame() {
        this.isPaused = true;
        
        // Only show pause menu if we're not in level-up mode
        if (!upgradeSystem || !upgradeSystem.isLevelUpActive()) {
            document.getElementById('pause-menu').classList.remove('hidden');
        }
        // Suspend audio during pause
        if (audioSystem && audioSystem.audioContext && audioSystem.audioContext.state === 'running') {
            audioSystem.audioContext.suspend();
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
        // Resume audio on unpause
        if (audioSystem) {
            audioSystem.resumeAudioContext();
        }
    }
    
    getVisibleEntities() {
        if (!this.player) return this.entities;
        
        // Calculate visible area around player with margin
        const viewportWidth = this.canvas.width;
        const viewportHeight = this.canvas.height;
        const margin = 200; // Extra margin for entities about to enter view
        
        // Use spatial grid for faster culling
        const visibleEntities = [];
        const startX = Math.floor((this.player.x - viewportWidth/2 - margin) / this.gridSize);
        const startY = Math.floor((this.player.y - viewportHeight/2 - margin) / this.gridSize);
        const endX = Math.ceil((this.player.x + viewportWidth/2 + margin) / this.gridSize);
        const endY = Math.ceil((this.player.y + viewportHeight/2 + margin) / this.gridSize);
        
        // Check only relevant grid cells
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const cellEntities = this.spatialGrid.get(key);
                if (cellEntities) {
                    for (const entity of cellEntities) {
                        const dx = Math.abs(entity.x - this.player.x);
                        const dy = Math.abs(entity.y - this.player.y);
                        
                        // Only include entities within viewport + margin
                        if (dx < viewportWidth/2 + margin && dy < viewportHeight/2 + margin) {
                            visibleEntities.push(entity);
                        }
                    }
                }
            }
        }
        
        return visibleEntities;
    }
    
    handleVisibilityChange() {
        const now = Date.now();
        if (now - this.lastVisibilityChange < 1000) return; // Debounce
        
        this.isVisible = !document.hidden;
        this.lastVisibilityChange = now;
        
        if (!this.isVisible) {
            this.pauseGame();
            this.reduceResourceUsage();
        } else {
            this.resumeGame();
            this.restoreResourceUsage();
        }
    }
    
    handleFocusChange() {
        this.isMinimized = false;
        this.resumeGame();
        this.restoreResourceUsage();
    }
    
    handleBlurChange() {
        this.isMinimized = true;
        this.reduceResourceUsage();
    }
    
    reduceResourceUsage() {
        // Clear particles and effects
        if (gameManager) {
            gameManager.particles = [];
            gameManager.particlePool = [];
        }
        
        // Reduce update frequency
        this.targetFps = 30;
        this.frameTime = 1000 / this.targetFps;
        
        // Clear unnecessary resources
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Suspend audio if available
        if (audioSystem && audioSystem.audioContext) {
            audioSystem.audioContext.suspend();
        }
    }
    
    restoreResourceUsage() {
        // Restore normal FPS
        this.targetFps = 60;
        this.frameTime = 1000 / this.targetFps;
        
        // Resume audio if available
        if (audioSystem && audioSystem.audioContext) {
            audioSystem.audioContext.resume();
        }
    }
    
    cleanupResources() {
        // Clean up dead entities
        this.cleanupEntities();
        
        // Clear unused object pools
        if (this.projectilePool.length > this.maxPoolSize) {
            this.projectilePool.length = this.maxPoolSize;
        }
        
        if (this.particlePool.length > this.maxPoolSize) {
            this.particlePool.length = this.maxPoolSize;
        }
        
        // Clear spatial grid
        this.spatialGrid.clear();
        
        // Rebuild spatial grid
        this.updateSpatialGrid();
    }
}

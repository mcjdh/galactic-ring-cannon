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
    this.enemyProjectilePool = [];
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
                
                // Toggle performance mode with 'O' key (O for Optimize)
                if (e.key === 'o' || e.key === 'O') {
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
        
        // Add canvas context loss handling
        this.canvas.addEventListener('webglcontextlost', this.handleContextLoss.bind(this));
        this.canvas.addEventListener('webglcontextrestored', this.handleContextRestore.bind(this));
        this.contextLost = false;
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
        // Calculate deltaTime properly
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
        }
        
        const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = timestamp;
        
        // Cap deltaTime to prevent large jumps (e.g., when tab is inactive)
        const cappedDeltaTime = Math.min(deltaTime, 1/30); // Max 30fps equivalent
        
        // Frame pacing to prevent black flashes
        const targetFrameTime = 1000 / this.targetFps;
        const actualFrameTime = timestamp - this.lastFrameTime;
        
        // Skip frame if we're running too fast (prevents black flashes)
        if (actualFrameTime < targetFrameTime - 2) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(actualFrameTime);
        
        // Adjust performance mode based on GPU usage
        this.adjustPerformanceMode();
        
        // Update game state only if not paused
        if (!this.isPaused) {
            this.update(cappedDeltaTime);
            
            // Only render if enough time has passed since last render
            const timeSinceLastRender = timestamp - (this.lastRenderTime || 0);
            if (timeSinceLastRender >= targetFrameTime * 0.8) {
                this.render();
                this.lastRenderTime = timestamp;
            }
        }
        
        this.lastFrameTime = timestamp;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // Validate deltaTime
        if (isNaN(deltaTime) || deltaTime <= 0 || deltaTime > 1) {
            console.warn('Invalid deltaTime:', deltaTime);
            deltaTime = 1/60; // Fallback to 60fps
        }
        
        // Update performance manager if available
        if (window.performanceManager && typeof window.performanceManager.update === 'function') {
            window.performanceManager.update(deltaTime);
        }
        
    // Update all entities with proper error handling
        if (this.entities && Array.isArray(this.entities)) {
            // Create a safe copy to avoid modification during iteration
            const entitiesToUpdate = [...this.entities];
            
            entitiesToUpdate.forEach(entity => {
                if (entity && typeof entity.update === 'function' && !entity.isDead) {
                    try {
                        entity.update(deltaTime, this);
                    } catch (error) {
                        console.error('Error updating entity:', error, entity);
                        entity.isDead = true; // Mark as dead to prevent further errors
                    }
                }
            });
        }
        
    // Rebuild spatial grid AFTER entities have moved so culling/collisions are accurate
    this.updateSpatialGrid();
        
        // Update pooled floating/combat texts each frame
        if (window.gameManager && typeof window.gameManager._updateTexts === 'function') {
            window.gameManager._updateTexts(deltaTime);
        }

    // Check collisions with error handling (uses up-to-date spatial grid)
        try {
            this.checkCollisions();
        } catch (error) {
            console.error('Error in collision detection:', error);
        }
        
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
        if (this.gpuUsage > this.criticalGpuThreshold && !this.performanceMode) {
            // Critical performance mode
            this.enablePerformanceMode();
            this.targetFps = 30; // Reduce FPS target
            this.particleReductionFactor = 0.25; // More aggressive particle reduction
        } else if (this.gpuUsage > this.highGpuThreshold && !this.performanceMode) {
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
        if (this.performanceMode) return; // Prevent multiple enables
        
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
        if (!this.performanceMode) return; // Prevent multiple disables
        
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
        
        // Prevent entities from colliding with themselves
        if (entity1 === entity2 || (entity1.id && entity1.id === entity2.id)) {
            return;
        }
        
        // Check if entities are already dead
        if (entity1.isDead || entity2.isDead) {
            return;
        }
        
        try {
            // Player collision with XP orbs
            if (entity1.type === 'player' && entity2.type === 'xpOrb') {
                if (typeof entity1.addXP === 'function' && typeof entity2.value === 'number') {
                    entity1.addXP(entity2.value);
                    entity2.isDead = true;
                }
            } else if (entity2.type === 'player' && entity1.type === 'xpOrb') {
                if (typeof entity2.addXP === 'function' && typeof entity1.value === 'number') {
                    entity2.addXP(entity1.value);
                    entity1.isDead = true;
                }
            }
            
            // Player collision with enemies
            if (entity1.type === 'player' && entity2.type === 'enemy' && !entity1.isInvulnerable) {
                if (typeof entity1.takeDamage === 'function' && typeof entity2.damage === 'number') {
                    entity1.takeDamage(entity2.damage);
                }
            } else if (entity2.type === 'player' && entity1.type === 'enemy' && !entity2.isInvulnerable) {
                if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                    entity2.takeDamage(entity1.damage);
                    // Visual/audio feedback for enemy hit
                    if (window.gameManager) {
                        window.gameManager.createHitEffect(entity2.x, entity2.y, entity1.damage);
                    }
                    if (window.audioSystem && window.audioSystem.play) {
                        window.audioSystem.play('hit', 0.2);
                    }
                }
            }
            
            // Projectile collision with enemies
            if (entity1.type === 'projectile' && entity2.type === 'enemy' && !entity2.isDead) {
                // Check if this enemy was already hit (for piercing projectiles)
                if (entity1.hitEnemies && entity1.hitEnemies.has(entity2.id)) {
                    return; // Skip this collision
                }
                
                let hitSuccessful = true;
                if (typeof entity1.hit === 'function') {
                    hitSuccessful = entity1.hit(entity2);
                }
                if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                    entity2.takeDamage(entity1.damage);
                }
                
                // Track hit enemy for piercing
                if (entity1.hitEnemies) {
                    entity1.hitEnemies.add(entity2.id);
                }
                
                // Handle special projectile effects
                let projectileShouldDie = false;
                
                // Process all special effects
                if (entity1.chainLightning) {
                    entity1.triggerChainLightning(this, entity2);
                }
                
                // Handle lifesteal
                if (this.player && entity1.lifesteal) {
                    const healAmount = entity1.damage * entity1.lifesteal;
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                    
                    if (gameManager) {
                        gameManager.showFloatingText(`+${Math.round(healAmount)}`, 
                            this.player.x, this.player.y - 30, '#2ecc71', 14);
                    }
                }
                
                // Check piercing and ricochet first (before explosion)
                if (hitSuccessful) {
                    if (entity1.piercing && entity1.piercing > 0) {
                        entity1.piercing--; // Reduce piercing count
                        if (entity1.piercing <= 0) {
                            projectileShouldDie = true;
                        }
                    } else if (entity1.ricochet && entity1.ricochet.bounced < entity1.ricochet.bounces) {
                        // Check if entity1 is a projectile with ricochet capability
                        if (entity1.type === 'projectile' && entity1 instanceof Projectile) {
                            const ricochetSuccessful = Projectile.prototype.ricochet.call(entity1, this);
                            if (!ricochetSuccessful) {
                                projectileShouldDie = true; // Failed to ricochet, projectile dies
                            }
                        } else {
                            projectileShouldDie = true; // Not a projectile, can't ricochet
                        }
                    } else {
                        projectileShouldDie = true; // Regular projectile dies on hit
                    }
                }
                
                // Handle explosion last (can happen with any projectile that has explosive property)
                if (entity1.explosive && (projectileShouldDie || (entity1.piercing !== undefined && entity1.piercing <= 0))) {
                    entity1.explode(this);
                    projectileShouldDie = true; // Explosion always kills the projectile
                }
                
                // Kill projectile if needed
                if (projectileShouldDie) {
                    entity1.isDead = true;
                }
                
            } else if (entity2.type === 'projectile' && entity1.type === 'enemy' && !entity1.isDead) {
                // Check if this enemy was already hit (for piercing projectiles)
                if (entity2.hitEnemies && entity2.hitEnemies.has(entity1.id)) {
                    return; // Skip this collision
                }
                
                let hitSuccessful = true;
                if (typeof entity2.hit === 'function') {
                    hitSuccessful = entity2.hit(entity1);
                }
                if (typeof entity1.takeDamage === 'function' && typeof entity2.damage === 'number') {
                    entity1.takeDamage(entity2.damage);
                    // Visual/audio feedback for enemy hit
                    if (window.gameManager) {
                        window.gameManager.createHitEffect(entity1.x, entity1.y, entity2.damage);
                    }
                    if (window.audioSystem && window.audioSystem.play) {
                        window.audioSystem.play('hit', 0.2);
                    }
                }
                
                // Track hit enemy for piercing
                if (entity2.hitEnemies) {
                    entity2.hitEnemies.add(entity1.id);
                }
                
                // Handle special projectile effects
                if (entity2.chainLightning) {
                    entity2.triggerChainLightning(this, entity1);
                }
                
                if (entity2.explosive) {
                    entity2.explode(this);
                    return; // Explosion kills the projectile
                }
                
                // Handle lifesteal
                if (this.player && entity2.lifesteal) {
                    const healAmount = entity2.damage * entity2.lifesteal;
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                    
                    if (gameManager) {
                        gameManager.showFloatingText(`+${Math.round(healAmount)}`, 
                            this.player.x, this.player.y - 30, '#2ecc71', 14);
                    }
                }
                
                // Check piercing and ricochet
                if (hitSuccessful) {
                    if (entity2.piercing && entity2.piercing > 0) {
                        entity2.piercing--; // Reduce piercing count
                        if (entity2.piercing <= 0) {
                            entity2.isDead = true;
                        }
                    } else if (entity2.ricochet && entity2.ricochet.bounced < entity2.ricochet.bounces) {
                        // Check if entity2 is a projectile with ricochet capability
                        if (entity2.type === 'projectile' && entity2 instanceof Projectile) {
                            const ricochetSuccessful = Projectile.prototype.ricochet.call(entity2, this);
                            if (!ricochetSuccessful) {
                                entity2.isDead = true; // Failed to ricochet, projectile dies
                            }
                        } else {
                            entity2.isDead = true; // Not a projectile, can't ricochet
                        }
                    } else {
                        entity2.isDead = true; // Regular projectile dies on hit
                    }
                }
            }
            
            // Enemy projectile collision with player
            if (entity1.type === 'enemyProjectile' && entity2.type === 'player' && !entity2.isInvulnerable) {
                if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                    entity2.takeDamage(entity1.damage);
                    entity1.isDead = true;
                }
            } else if (entity2.type === 'enemyProjectile' && entity1.type === 'player' && !entity1.isInvulnerable) {
                if (typeof entity1.takeDamage === 'function' && typeof entity2.damage === 'number') {
                    entity1.takeDamage(entity2.damage);
                    entity2.isDead = true;
                }
            }
        } catch (error) {
            console.error('Error handling collision:', error, 'Entity1:', entity1?.type, 'Entity2:', entity2?.type);
        }
    }
    render() {
        // Check for context loss before rendering
        if (this.contextLost || !this.ctx) {
            console.warn('Canvas context unavailable, skipping render');
            return;
        }

        try {
            // Double buffer protection - ensure we have valid canvas state
            if (!this.canvas.width || !this.canvas.height) {
                return;
            }
            
            // Performance optimization: skip render if FPS is too low
            const now = performance.now();
            if (this.lastRenderTime && (now - this.lastRenderTime) < 8) { // Cap at 120fps max
                return;
            }
            this.lastRenderTime = now;
            
            // Clear canvas with optimized method
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        
            // Set camera with optimized transform
            this.ctx.save();
            if (this.player) {
                const cameraX = -this.player.x + this.canvas.width / 2;
                const cameraY = -this.player.y + this.canvas.height / 2;
                this.ctx.translate(cameraX, cameraY);
            }
            
            // Use frustum culling to only render visible entities
            const visibleEntities = this.getVisibleEntities();
            
            // Render particles first (below entities)
            if (window.gameManager && !window.gameManager.lowQuality && typeof window.gameManager.renderParticles === 'function') {
                window.gameManager.renderParticles(this.ctx);
            }

            // Batch render by entity type for better performance
            this.batchRenderEntitiesByType(visibleEntities);
            // Ensure player is drawn last on top as a safety net
            if (this.player && typeof this.player.render === 'function') {
                try { this.player.render(this.ctx); } catch(e) { console.error('Player render error', e); }
            }
            
            // Render pooled floating/combat texts on top of entities
            if (window.gameManager && typeof window.gameManager._renderTexts === 'function') {
                window.gameManager._renderTexts(this.ctx);
            }
            
            // Render debug information if enabled
            if (this.debugMode) {
                this.renderDebugInfo();
            }
            
            this.ctx.restore();
            
        } catch (error) {
            console.error('Render error:', error);
            // Try to recover context if possible
            if (!this.ctx || this.contextLost) {
                this.handleContextLoss(new Event('webglcontextlost'));
            }
        }
    }
    
    batchRenderEntitiesByType(entities) {
        if (entities.length === 0) return;
        
        // Group entities by type for batch rendering
        const entityGroups = new Map();
        
        for (const entity of entities) {
            if (!entity || entity.isDead) continue;
            
            // Validate entity has required render properties
            if (typeof entity.render !== 'function') continue;
            if (typeof entity.x !== 'number' || typeof entity.y !== 'number') continue;
            
            const type = entity.constructor.name || entity.type || 'unknown';
            if (!entityGroups.has(type)) {
                entityGroups.set(type, []);
            }
            entityGroups.get(type).push(entity);
        }
        
        // Render groups in optimized order (static objects first, then dynamic)
        const renderOrder = ['Particle', 'XPOrb', 'Projectile', 'Enemy', 'Player'];
        
        for (const type of renderOrder) {
            const group = entityGroups.get(type);
            if (group && group.length > 0) {
                this.batchRenderGroup(group);
            }
        }
        
        // Render any remaining types not in the ordered list
        for (const [type, group] of entityGroups) {
            if (!renderOrder.includes(type) && group.length > 0) {
                this.batchRenderGroup(group);
            }
        }
    }
    
    batchRenderGroup(entities) {
        if (entities.length === 0) return;
        
        // Pre-sort by depth if needed (for proper layering)
        const needsDepthSort = entities.some(e => e.z !== undefined);
        if (needsDepthSort) {
            entities.sort((a, b) => (a.z || 0) - (b.z || 0));
        }
        
        // Render each entity with error handling
        for (const entity of entities) {
            try {
                entity.render(this.ctx);
            } catch (error) {
                console.error(`Error rendering ${entity.constructor.name}:`, error);
                // Continue rendering other entities
            }
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
        // Validate entities have required properties
        if (!entity1 || !entity2 || 
            typeof entity1.x !== 'number' || typeof entity1.y !== 'number' || 
            typeof entity2.x !== 'number' || typeof entity2.y !== 'number' ||
            typeof entity1.radius !== 'number' || typeof entity2.radius !== 'number') {
            return false;
        }
        
        // Use squared distance to avoid costly sqrt per collision check
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        const r = entity1.radius + entity2.radius;
        
        // Ensure radius sum is positive to avoid division issues
        if (r <= 0) return false;
        
        return (dx * dx + dy * dy) < (r * r);
    }
      cleanupEntities() {
        // Track entities before cleanup for debugging
        const entitiesBefore = this.entities.length;
        
        // More robust filtering with validation
        this.entities = this.entities.filter(entity => 
            entity && 
            !entity.isDead && 
            typeof entity.x === 'number' && 
            typeof entity.y === 'number'
        );
        
        this.enemies = this.enemies.filter(enemy => 
            enemy && 
            !enemy.isDead && 
            typeof enemy.x === 'number' && 
            typeof enemy.y === 'number'
        );
        
        this.xpOrbs = this.xpOrbs.filter(orb => 
            orb && 
            !orb.isDead && 
            typeof orb.x === 'number' && 
            typeof orb.y === 'number'
        );
        
        // Return dead projectiles to pool before filtering
        const liveProjectiles = [];
        for (const p of this.projectiles) {
            if (!p || p.isDead || typeof p.x !== 'number' || typeof p.y !== 'number') {
                if (p && p.type === 'projectile') this._releaseProjectile(p);
                continue;
            }
            liveProjectiles.push(p);
        }
        this.projectiles = liveProjectiles;
        
        if (this.enemyProjectiles) {
            const liveEnemyProjectiles = [];
            for (const ep of this.enemyProjectiles) {
                if (!ep || ep.isDead || typeof ep.x !== 'number' || typeof ep.y !== 'number') {
                    if (ep && ep.type === 'enemyProjectile') this._releaseEnemyProjectile(ep);
                    continue;
                }
                liveEnemyProjectiles.push(ep);
            }
            this.enemyProjectiles = liveEnemyProjectiles;
        }
        
        // Enforce entity limits to prevent memory issues
        const maxEntities = 2000; // Reasonable limit
        if (this.entities.length > maxEntities) {
            console.warn(`Entity count exceeded limit (${this.entities.length}), removing oldest entities`);
            // Remove oldest non-player entities
            const nonPlayerEntities = this.entities.filter(e => e && e.type !== 'player');
            const toRemove = this.entities.length - maxEntities;
            for (let i = 0; i < toRemove && i < nonPlayerEntities.length; i++) {
                nonPlayerEntities[i].isDead = true;
            }
            // Re-filter after marking for removal
            this.entities = this.entities.filter(entity => entity && !entity.isDead);
        }
        
        // Log cleanup stats in debug mode
        if (this.debugMode && entitiesBefore !== this.entities.length) {
            console.log(`Cleaned up ${entitiesBefore - this.entities.length} entities (${this.entities.length} remaining)`);
        }
    }

    // Projectile pooling helpers
    spawnProjectile(x, y, vx, vy, damage, piercing = 0, isCrit = false, specialType = null) {
        let proj = this.projectilePool.pop();
        if (!proj) {
            proj = new Projectile(x, y, vx, vy, damage, piercing, isCrit, specialType);
        } else {
            // Reset pooled projectile
            proj.x = x; proj.y = y; proj.vx = vx; proj.vy = vy;
            proj.damage = damage; proj.piercing = piercing; proj.isCrit = isCrit;
            proj.radius = 5; proj.type = 'projectile';
            proj.active = true; proj.isDead = false;
            proj.lifetime = 5.0; proj.age = 0;
            if (proj.hitEnemies && typeof proj.hitEnemies.clear === 'function') proj.hitEnemies.clear(); else proj.hitEnemies = new Set();
            proj.specialType = null;
            proj.chainLightning = null; proj.explosive = null; proj.ricochet = null; proj.homing = null;
            // reset trail circular buffer
            if (Array.isArray(proj.trail)) {
                proj.trailWrite = 0; proj.trailCount = 0;
            } else {
                proj.trail = new Array(proj.maxTrailLength || 10); proj.trailWrite = 0; proj.trailCount = 0;
            }
            // Initialize primary special type if provided
            if (specialType) {
                proj.specialType = specialType;
                if (typeof proj.initializeSpecialType === 'function') proj.initializeSpecialType(specialType);
            }
        }
        this.addEntity(proj);
        return proj;
    }

    _releaseProjectile(p) {
        // Basic sanitize of projectile before pooling
        p.isDead = true; p.active = false; p.homing && (p.homing.target = null); // break references
        if (this.projectilePool.length < this.maxPoolSize) {
            this.projectilePool.push(p);
        }
    }

    spawnEnemyProjectile(x, y, vx, vy, damage) {
        let ep = this.enemyProjectilePool.pop();
        if (!ep) {
            ep = new EnemyProjectile(x, y, vx, vy, damage);
        } else {
            ep.x = x; ep.y = y; ep.vx = vx; ep.vy = vy; ep.damage = damage;
            ep.type = 'enemyProjectile'; ep.radius = 5; ep.isDead = false; ep.timer = 0; ep.lifetime = 3;
        }
    // Rely on addEntity to manage enemyProjectiles list membership
    this.addEntity(ep);
        return ep;
    }

    _releaseEnemyProjectile(ep) {
        ep.isDead = true;
        if (this.enemyProjectilePool.length < this.maxPoolSize) {
            this.enemyProjectilePool.push(ep);
        }
    }
      // Add error handling to addEntity
    addEntity(entity) {
        if (!entity) {
            console.error('Attempted to add null/undefined entity!');
            return null;
        }
        
        // Validate entity has required properties
        if (typeof entity.x !== 'number' || typeof entity.y !== 'number') {
            console.error('Entity missing required position properties:', entity);
            return null;
        }
        
        if (!entity.type || typeof entity.type !== 'string') {
            console.error('Entity missing or invalid type property:', entity);
            return null;
        }
        
        try {
            // Add to main entities array
            this.entities.push(entity);
            
            // Add to specific type arrays with validation
            if (entity.type === 'player') {
                if (this.player) {
                    console.warn('Player already exists, replacing...');
                }
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
            
            // Assign unique ID if not present
            if (!entity.id) {
                entity.id = `${entity.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            return entity;
        } catch (error) {
            console.error('Error adding entity:', error, entity);
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
    let anyCellFound = false;
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const cellEntities = this.spatialGrid.get(key);
                if (cellEntities) {
            anyCellFound = true;
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
        // If grid returned nothing (edge case), fall back to scanning all entities
        if (!anyCellFound && Array.isArray(this.entities)) {
            const halfW = viewportWidth/2 + margin, halfH = viewportHeight/2 + margin;
            for (const e of this.entities) {
                if (!e || e.isDead) continue;
                const dx = Math.abs(e.x - this.player.x);
                const dy = Math.abs(e.y - this.player.y);
                if (dx < halfW && dy < halfH) {
                    visibleEntities.push(e);
                }
            }
        }
        // Ensure player is always visible and rendered
        if (this.player && !visibleEntities.includes(this.player)) {
            visibleEntities.push(this.player);
        }

        // Fallback: if grid missed some active entities near the edges (rare), do a quick direct pass
        if (visibleEntities.length < 10 && Array.isArray(this.entities)) {
            const halfW = viewportWidth/2 + margin, halfH = viewportHeight/2 + margin;
            for (const e of this.entities) {
                if (!e || e.isDead) continue;
                const dx = Math.abs(e.x - this.player.x);
                const dy = Math.abs(e.y - this.player.y);
                if (dx < halfW && dy < halfH && !visibleEntities.includes(e)) {
                    visibleEntities.push(e);
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
        
        // Clean up event listeners if shutting down
        if (this.isShuttingDown) {
            this.cleanupEventListeners();
        }
    }
    
    handleContextLoss(event) {
        event.preventDefault();
        this.contextLost = true;
        console.warn('Canvas context lost - game paused');
        this.isPaused = true;
    }
    
    handleContextRestore(event) {
        console.log('Canvas context restored - resuming game');
        this.contextLost = false;
        
        // Reinitialize canvas context
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,
            willReadFrequently: false
        });
        
        if (this.ctx) {
            this.isPaused = false;
            console.log('Game context successfully restored');
        } else {
            console.error('Failed to restore canvas context');
        }
    }
    
    cleanupEventListeners() {
        // Remove event listeners to prevent memory leaks
        try {
            window.removeEventListener('resize', this.resizeCanvas.bind(this));
            this.canvas.removeEventListener('webglcontextlost', this.handleContextLoss.bind(this));
            this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestore.bind(this));
            document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            window.removeEventListener('focus', this.handleFocusChange.bind(this));
            window.removeEventListener('blur', this.handleBlurChange.bind(this));
            
            console.log('Event listeners cleaned up successfully');
        } catch (error) {
            console.error('Error cleaning up event listeners:', error);
        }
    }
    
    shutdown() {
        console.log('Shutting down game engine...');
        this.isShuttingDown = true;
        this.isPaused = true;
        
        // Clean up all resources
        this.cleanupResources();
        
        // Clear all entities
        this.entities = [];
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.xpOrbs = [];
        
        // Clear pools
        this.projectilePool = [];
        this.particlePool = [];
        
        console.log('Game engine shutdown complete');
    }
}

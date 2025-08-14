class GameEngine {
    constructor() {
        // Initialize canvas with error handling
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Game canvas not found!');
            return;
        }
        
        // TODO: Move canvas optimization to separate CanvasManager
        // Optimize canvas for GPU rendering
        this.canvas.style.willChange = 'transform'; // Hint to browser for GPU acceleration
        this.canvas.style.transform = 'translateZ(0)'; // Force GPU layer
        this.canvas.style.backfaceVisibility = 'hidden'; // Optimize for transforms
        
        // Get 2D context with performance optimizations
        // TODO: Consider OffscreenCanvas for background processing
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
    // TODO: Use a proper state machine for game states
    // FIX: Entity arrays should be managed by EntityManager
    // Resonant note for all coding agents: State management and entity arrays should be modularized. Coordinate with other agents to avoid overlap and follow the refactoring roadmap.
        this.entities = [];
        this.player = null;
        this.enemies = [];
        this.xpOrbs = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
    this.enemyProjectilePool = []; // TODO: Implement proper object pooling system
        this.lastTime = 0;
        this.gameTime = 0;
        this.isPaused = false;
        
        // Performance monitoring with fallbacks
        // TODO: Extract performance monitoring to separate class
        // FIX: Too many performance-related properties scattered throughout
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
    // Resonant note for all coding agents: maxParticles is managed in GameManager. Remove here to avoid duplication. If you need particle limits, use GameManager's property.
        this.particleReductionFactor = 1.0;
        this.debugMode = false;
        
    // Object pools with size limits
    // TODO: Implement comprehensive object pooling for all entities
    // TODO: Add pool statistics and monitoring
    // Resonant note: Object pooling is incomplete. Future agents, please consolidate pooling logic and consider extracting to ParticleManager/ProjectileManager modules as per refactoring plan.
    this.projectilePool = [];
    this.particlePool = [];
    this.maxPoolSize = 100; // TODO: Make pool size dynamic based on available memory
        
        // Spatial partitioning with error handling
        // TODO: Implement quadtree for better spatial partitioning
        // FIX: Grid size should be configurable and adaptive
        this.gridSize = 100;
        this.spatialGrid = new Map();
        
        // Initialize CollisionSystem if available (delegates spatial grid & collisions)
        try {
            this.collisionSystem = (typeof window !== 'undefined' && window.CollisionSystem)
                ? new window.CollisionSystem(this)
                : null;
        } catch (e) {
            console.warn('CollisionSystem initialization failed, using internal collision logic.', e);
            this.collisionSystem = null;
        }
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
        // Validate deltaTime (avoid noisy logs when it's 0 on first frames)
        if (!Number.isFinite(deltaTime) || deltaTime < 0 || deltaTime > 1) {
            console.warn('Invalid deltaTime:', deltaTime);
            deltaTime = 1/60; // Fallback to 60fps
        } else if (deltaTime === 0) {
            // Use a small timestep silently when browsers report 0ms frame
            deltaTime = 1/60;
        }
        
        // Apply resonance time scaling for enhanced game feel
        if (window.resonanceSystem) {
            deltaTime = window.resonanceSystem.update(deltaTime);
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
    if (this.collisionSystem && typeof this.collisionSystem.updateSpatialGrid === 'function') {
            this.collisionSystem.updateSpatialGrid();
        } else {
            this.updateSpatialGrid();
        }
        
        // Update pooled floating/combat texts each frame
        if (window.gameManager && typeof window.gameManager._updateTexts === 'function') {
            window.gameManager._updateTexts(deltaTime);
        }

    // Check collisions with error handling (uses up-to-date spatial grid)
        try {
            if (this.collisionSystem && typeof this.collisionSystem.checkCollisions === 'function') {
                this.collisionSystem.checkCollisions();
            } else {
                this.checkCollisions();
            }
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
        if (!entity1 || !entity2 || entity1.isDead || entity2.isDead || entity1 === entity2 || (entity1.id && entity1.id === entity2.id)) {
            return;
        }

        const type1 = entity1.type;
        const type2 = entity2.type;

        try {
            if ((type1 === 'player' && type2 === 'xpOrb') || (type1 === 'xpOrb' && type2 === 'player')) {
                this._handlePlayerXpOrbCollision(
                    type1 === 'player' ? entity1 : entity2,
                    type1 === 'xpOrb' ? entity1 : entity2
                );
            } else if ((type1 === 'player' && type2 === 'enemy') || (type1 === 'enemy' && type2 === 'player')) {
                this._handlePlayerEnemyCollision(
                    type1 === 'player' ? entity1 : entity2,
                    type1 === 'enemy' ? entity1 : entity2
                );
            } else if ((type1 === 'projectile' && type2 === 'enemy') || (type1 === 'enemy' && type2 === 'projectile')) {
                this._handleProjectileEnemyCollision(
                    type1 === 'projectile' ? entity1 : entity2,
                    type1 === 'enemy' ? entity1 : entity2
                );
            } else if ((type1 === 'enemyProjectile' && type2 === 'player') || (type1 === 'player' && type2 === 'enemyProjectile')) {
                this._handleEnemyProjectilePlayerCollision(
                    type1 === 'enemyProjectile' ? entity1 : entity2,
                    type1 === 'player' ? entity1 : entity2
                );
            }
        } catch (error) {
            console.error('Error handling collision:', error, 'Entity1:', entity1?.type, 'Entity2:', entity2?.type);
        }
    }

    _handlePlayerXpOrbCollision(player, xpOrb) {
        if (typeof player.addXP === 'function' && typeof xpOrb.value === 'number') {
            player.addXP(xpOrb.value);
            if (typeof xpOrb.createCollectionEffect === 'function') {
                try { xpOrb.createCollectionEffect(); } catch (e) { console.error("Error creating collection effect", e); }
            }
            if ('collected' in xpOrb) xpOrb.collected = true;
            xpOrb.isDead = true;
        }
    }

    _handlePlayerEnemyCollision(player, enemy) {
        if (!player.isInvulnerable && typeof player.takeDamage === 'function' && typeof enemy.damage === 'number') {
            player.takeDamage(enemy.damage);
            if (window.gameManager) {
                window.gameManager.createHitEffect(player.x, player.y, enemy.damage);
            }
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('hit', 0.2);
            }
        }
    }

    _handleProjectileEnemyCollision(projectile, enemy) {
        if (enemy.isDead || (projectile.hitEnemies && projectile.hitEnemies.has(enemy.id))) {
            return;
        }

        let hitSuccessful = typeof projectile.hit === 'function' ? projectile.hit(enemy) : true;
        if (!hitSuccessful) return;

        if (typeof enemy.takeDamage === 'function' && typeof projectile.damage === 'number') {
            const wasCritical = projectile.isCritical || false;
            const wasKilled = enemy.health <= projectile.damage;
            
            enemy.takeDamage(projectile.damage);
            
            // Trigger resonance effects
            if (window.resonanceSystem) {
                const intensity = Math.min(projectile.damage / 100, 1.0);
                const position = { x: enemy.x, y: enemy.y };
                
                if (wasKilled) {
                    window.resonanceSystem.triggerImpactResonance(intensity * 1.5, 'kill', position);
                } else if (wasCritical) {
                    window.resonanceSystem.triggerImpactResonance(intensity * 1.2, 'critical', position);
                } else {
                    window.resonanceSystem.triggerImpactResonance(intensity, 'hit', position);
                }
            }
            
            if (window.gameManager) {
                window.gameManager.createHitEffect(enemy.x, enemy.y, projectile.damage);
            }
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('hit', 0.2);
            }
        }

        if (projectile.hitEnemies) {
            projectile.hitEnemies.add(enemy.id);
        }

        if (projectile.chainLightning) projectile.triggerChainLightning(this, enemy);

        if (this.player && projectile.lifesteal) {
            const healAmount = projectile.damage * projectile.lifesteal;
            this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
            if (gameManager) {
                gameManager.showFloatingText(`+${Math.round(healAmount)}`, this.player.x, this.player.y - 30, '#2ecc71', 14);
            }
        }

        let projectileShouldDie = true;
        if (projectile.piercing > 0) {
            projectile.piercing--;
            projectileShouldDie = false;
        } else if (projectile.ricochet && projectile.ricochet.bounced < projectile.ricochet.bounces) {
            if (projectile.type === 'projectile' && projectile instanceof Projectile) {
                projectileShouldDie = !Projectile.prototype.ricochet.call(projectile, this);
            }
        }
        
        if (projectile.explosive) {
            projectile.explode(this);
            projectileShouldDie = true;
        }

        if (projectileShouldDie) {
            projectile.isDead = true;
        }
    }

    _handleEnemyProjectilePlayerCollision(enemyProjectile, player) {
        if (!player.isInvulnerable && typeof player.takeDamage === 'function' && typeof enemyProjectile.damage === 'number') {
            player.takeDamage(enemyProjectile.damage);
            enemyProjectile.isDead = true;
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
            this.renderEntities(visibleEntities);
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
    
    // Simplified rendering - removed overengineered batching system
    renderEntities(entities) {
        if (!entities || entities.length === 0) return;
        
        // Simple, reliable rendering loop
        for (const entity of entities) {
            if (entity && typeof entity.render === 'function' && !entity.isDead) {
                try {
                    entity.render(this.ctx);
                } catch (error) {
                    // Silent error handling - don't spam console in production
                    if (window.debugManager?.debugMode) {
                        console.error(`Render error for ${entity.constructor?.name || 'entity'}:`, error);
                    }
                }
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
        // Simple and efficient cleanup
        this.entities = this.entities.filter(entity => 
            entity && !entity.isDead
        );
        
        this.enemies = this.enemies.filter(enemy => 
            enemy && !enemy.isDead
        );
        
        this.xpOrbs = this.xpOrbs.filter(orb => 
            orb && !orb.isDead
        );
        
        // Clean up projectiles and return to pool
        const liveProjectiles = [];
        for (const p of this.projectiles) {
            if (!p || p.isDead) {
                if (p && p.type === 'projectile') this._releaseProjectile(p);
                continue;
            }
            liveProjectiles.push(p);
        }
        this.projectiles = liveProjectiles;
        
        if (this.enemyProjectiles) {
            const liveEnemyProjectiles = [];
            for (const ep of this.enemyProjectiles) {
                if (!ep || ep.isDead) {
                    if (ep && ep.type === 'enemyProjectile') this._releaseEnemyProjectile(ep);
                    continue;
                }
                liveEnemyProjectiles.push(ep);
            }
            this.enemyProjectiles = liveEnemyProjectiles;
        }
        
        // Basic entity limit enforcement
        const maxEntities = 2000;
        if (this.entities.length > maxEntities) {
            const nonPlayerEntities = this.entities.filter(e => e && e.type !== 'player');
            const toRemove = this.entities.length - maxEntities;
            for (let i = 0; i < toRemove && i < nonPlayerEntities.length; i++) {
                nonPlayerEntities[i].isDead = true;
            }
            this.entities = this.entities.filter(entity => entity && !entity.isDead);
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
        if (this.collisionSystem && typeof this.collisionSystem.updateSpatialGrid === 'function') {
            this.collisionSystem.updateSpatialGrid();
        } else {
            this.updateSpatialGrid();
        }
        
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

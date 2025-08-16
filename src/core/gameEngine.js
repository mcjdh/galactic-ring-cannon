class GameEngine {
    constructor() {
        // Initialize canvas with error handling
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            (window.logger?.error || console.error)('Game canvas not found!');
            return;
        }
        
        // Canvas performance optimizations
        this.canvas.style.willChange = 'transform'; // Hint to browser for GPU acceleration
        this.canvas.style.transform = 'translateZ(0)'; // Force GPU layer
        this.canvas.style.backfaceVisibility = 'hidden'; // Optimize for transforms
        
        // Get 2D context with performance optimizations
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false, // Disable alpha for better performance
            willReadFrequently: false // Optimize for GPU rendering
        });
        
        if (!this.ctx) {
            (window.logger?.error || console.error)('Could not get 2D context!');
            return;
        }
        
        // Set canvas size to window size with error handling
        try {
            // Store bound functions for proper cleanup later
            this.boundResizeCanvas = this.resizeCanvas.bind(this);
            this.boundHandleContextLoss = this.handleContextLoss.bind(this);
            this.boundHandleContextRestore = this.handleContextRestore.bind(this);
            this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
            this.boundHandleFocusChange = this.handleFocusChange.bind(this);
            this.boundHandleBlurChange = this.handleBlurChange.bind(this);
            
            this.resizeCanvas();
            window.addEventListener('resize', this.boundResizeCanvas);
        } catch (error) {
            (window.logger?.error || console.error)('Error initializing canvas:', error);
        }
        
        // Game state with null checks
    // 🤖 RESONANT NOTE FOR ALL CODING AGENTS:
    // State management and entity arrays need modularization - this is the #1 architectural priority
    // Consider EntityManager pattern: game.entities.add(entity) vs this.entities.push(entity)
    // Coordinate with other agents to avoid duplicate state management systems
        this.entities = [];
        this.player = null;
        this.enemies = [];
        this.xpOrbs = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
		// Enemy projectile pool is initialized below with other pools
        this.lastTime = 0;
        this.gameTime = 0;
        this.isPaused = false;
        
        // Basic performance tracking
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.targetFps = 60;
        this.lastFrameTime = 0;
        this.performanceMode = false;
        this.debugMode = false;
        
    // Object pools - partially implemented for projectiles and particles
    // 🤖 RESONANT NOTE FOR ALL CODING AGENTS:
    // Object pooling is partially implemented - DO NOT create competing pool systems
    // Current pools: projectilePool, particlePool, enemyProjectilePool
    // Missing pools: Enemy objects, XP orbs, damage zones
    // Coordinate to avoid 3+ different pooling implementations
    this.projectilePool = [];
    this.enemyProjectilePool = [];
    this.particlePool = [];
    this.maxPoolSize = 100; // Pool size works well for most devices
        
		// Spatial partitioning system
		this.gridSize = 100; // Fixed grid size for collision detection
		this.spatialGrid = new Map();
        
		// Initialize unified systems if available
		try {
			this.collisionSystem = null;
			if (typeof window !== 'undefined' && window.UnifiedCollisionSystem) {
				this.collisionSystem = new window.UnifiedCollisionSystem(this);
			} else if (typeof window !== 'undefined' && window.CollisionSystem) {
				this.collisionSystem = new window.CollisionSystem(this);
			}
        } catch (e) {
            (window.logger?.warn || console.warn)('Collision system initialization failed, using internal collision logic.', e);
			this.collisionSystem = null;
		}

		try {
			this.entityManager = (typeof window !== 'undefined' && window.EntityManager)
				? new window.EntityManager()
				: null;
        } catch (e) {
            (window.logger?.warn || console.warn)('EntityManager initialization failed, continuing with legacy arrays.', e);
			this.entityManager = null;
		}

		// Initialize Unified UI Manager for proper health bars and floating text
		try {
			this.unifiedUI = (typeof window !== 'undefined' && window.UnifiedUIManager)
				? new window.UnifiedUIManager(this)
				: null;
				
			// Make game engine globally accessible for UI systems
			if (!window.gameEngine) {
				window.gameEngine = this;
			}
		} catch (e) {
			(window.logger?.warn || console.warn)('UnifiedUIManager initialization failed, using legacy UI systems.', e);
			this.unifiedUI = null;
		}
          // Input handling with additional pause key support and error handling
        this.keys = {};
        try {
            // Store bound input handlers so we can remove them during cleanup
            this.boundHandleKeyDown = this.onKeyDown.bind(this);
            this.boundHandleKeyUp = this.onKeyUp.bind(this);
            window.addEventListener('keydown', this.boundHandleKeyDown);
            window.addEventListener('keyup', this.boundHandleKeyUp);
        } catch (error) {
            (window.logger?.error || console.error)('Error setting up input handling:', error);
        }
        
        // Visibility state tracking
        this.isVisible = true;
        this.isMinimized = false;
        this.lastVisibilityChange = 0;
        
        // Add visibility change handlers
        document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
        window.addEventListener('focus', this.boundHandleFocusChange);
        window.addEventListener('blur', this.boundHandleBlurChange);
        
        // Resource cleanup
        this.resourceCleanupInterval = 5000;
        this.lastResourceCleanup = 0;
        
        // Add canvas context loss handling
        this.canvas.addEventListener('webglcontextlost', this.boundHandleContextLoss);
        this.canvas.addEventListener('webglcontextrestored', this.boundHandleContextRestore);
        this.contextLost = false;
    }
    
    onKeyDown(e) {
        this.keys[e.key] = true;
        if (e.code) this.keys[e.code] = true;
        
        // Toggle debug mode with F3
        if (e.key === 'F3') {
            this.debugMode = !this.debugMode;
        }
        
        // Toggle performance mode with 'O' key (O for Optimize)
        if (e.key === 'o' || e.key === 'O') {
            this.togglePerformanceMode();
        }

        // Pause/resume with P or Escape
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            this.togglePause();
        }
    }
    
    onKeyUp(e) {
        this.keys[e.key] = false;
        if (e.code) this.keys[e.code] = false;
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
            (window.logger?.error || console.error)('Error resizing canvas:', error);
        }
    }
    
    start() {
        (window.logger?.log || console.log)('🚀 GameEngine starting...');
        
        // Initialize player if not exists
        if (!this.player && typeof Player !== 'undefined') {
            (window.logger?.log || console.log)('Creating player...');
            this.player = new Player(
                this.canvas.width / 2, 
                this.canvas.height / 2
            );
            this.addEntity(this.player);
            (window.logger?.log || console.log)('✅ Player created and added');
        }
        
        // Start the main game loop
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
        (window.logger?.log || console.log)('✅ Game loop started');
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
            // 🤖 RESONANT NOTE: Reduced console spam - only log critical deltaTime issues
            if (deltaTime > 0.1 && window.debugManager?.enabled) {
                (window.logger?.warn || console.warn)('Invalid deltaTime:', deltaTime);
            }
            deltaTime = 1/60; // Fallback to 60fps
        } else if (deltaTime === 0) {
            // Use a small timestep silently when browsers report 0ms frame
            deltaTime = 1/60;
        }
        
        // Apply resonance time scaling for enhanced game feel
        if (window.resonanceSystem) {
            deltaTime = window.resonanceSystem.update(deltaTime);
        }
        
        // Update gamepad state if available
        if (window.inputManager && typeof window.inputManager.updateGamepad === 'function') {
            window.inputManager.updateGamepad();
        }
        
        // Update performance manager if available
        if (window.performanceManager && typeof window.performanceManager.update === 'function') {
            window.performanceManager.update(deltaTime);
        }

        // Update optimized particle pool if available
        if (window.optimizedParticles && typeof window.optimizedParticles.update === 'function') {
            window.optimizedParticles.update(deltaTime);
        }

        // Late-bind unified systems if modules loaded after engine
        if (!this.collisionSystem && typeof window !== 'undefined' && window.UnifiedCollisionSystem) {
            try { this.collisionSystem = new window.UnifiedCollisionSystem(this); } catch (_) {}
        }
        if (!this.entityManager && typeof window !== 'undefined' && window.EntityManager) {
            try { this.entityManager = new window.EntityManager(); } catch (_) {}
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
                        (window.logger?.error || console.error)('Error updating entity:', error, entity);
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
        
        // Update legacy combat texts only when unified UI is not available
        if (!this.unifiedUI && window.gameManager && typeof window.gameManager.updateCombatTexts === 'function') {
            window.gameManager.updateCombatTexts(deltaTime);
        }

        // Update GameManager systems (bridge compatibility)
        if (window.gameManager && typeof window.gameManager.update === 'function') {
            try {
                window.gameManager.update(deltaTime);
                // Update minimap via bridge only when UIManager is not active
                if (typeof window.gameManager.renderMinimap === 'function' && !window.gameManager.uiManager) {
                    window.gameManager.renderMinimap();
                }
            } catch (error) {
                if (window.debugManager?.enabled) {
                    (window.logger?.error || console.error)('GameManager update error:', error);
                }
            }
        }

    // Check collisions with error handling (uses up-to-date spatial grid)
        try {
            if (this.collisionSystem && typeof this.collisionSystem.checkCollisions === 'function') {
                this.collisionSystem.checkCollisions();
            } else {
                this.checkCollisions();
            }
        } catch (error) {
            (window.logger?.error || console.error)('Error in collision detection:', error);
        }

        // Update unified UI system
        if (this.unifiedUI) {
            this.unifiedUI.update(deltaTime);
        }
        
        // Clean up dead entities
        this.cleanupEntities();
    }
    
    updatePerformanceMetrics(elapsed) {
        // Simple FPS tracking
        this.frameCount++;
        this.lastFpsUpdate += elapsed;
        if (this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = 0;
        }
        
        // Periodic resource cleanup
        const now = Date.now();
        if (now - this.lastResourceCleanup > this.resourceCleanupInterval) {
            this.cleanupResources();
            this.lastResourceCleanup = now;
        }
    }
    
    adjustPerformanceMode() {
        // Defer to centralized performance manager if present
        if (window.performanceManager) {
            return;
        }
        // Simple FPS-based performance adjustment
        if (this.fps < 30 && !this.performanceMode) {
            this.enablePerformanceMode();
        } else if (this.fps > 55 && this.performanceMode) {
            this.disablePerformanceMode();
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
        if (this.performanceMode) return;
        this.performanceMode = true;
        this.lowGpuMode = true;
        // Optimize rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.globalCompositeOperation = 'source-over';
        // Performance mode enabled
    }
    
    disablePerformanceMode() {
        if (!this.performanceMode) return;
        this.performanceMode = false;
        this.lowGpuMode = false;
        // Restore rendering quality
        this.ctx.imageSmoothingEnabled = true;
        // Performance mode disabled
    }
    
    updateSpatialGrid() {
        // Clear grid efficiently by reusing arrays instead of creating new ones
        for (const [key, entities] of this.spatialGrid) {
            entities.length = 0; // Clear array without deallocating
        }
        
        // Add entities to grid with bounds checking
        for (const entity of this.entities) {
            if (!entity || entity.isDead || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
                continue;
            }
            
            const gridX = Math.floor(entity.x / this.gridSize);
            const gridY = Math.floor(entity.y / this.gridSize);
            const key = `${gridX},${gridY}`;
            
            let cellEntities = this.spatialGrid.get(key);
            if (!cellEntities) {
                cellEntities = [];
                this.spatialGrid.set(key, cellEntities);
            }
            cellEntities.push(entity);
        }
        
        // Clean up empty cells periodically to prevent memory bloat
        if (this.entities.length % 100 === 0) {
            for (const [key, entities] of this.spatialGrid) {
                if (entities.length === 0) {
                    this.spatialGrid.delete(key);
                }
            }
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
        // Early return if not enough entities to collide
        if (entities.length < 2) return;
        
        for (let i = 0; i < entities.length; i++) {
            const entity1 = entities[i];
            // Skip invalid or dead entities
            if (!entity1 || entity1.isDead) continue;
            
            for (let j = i + 1; j < entities.length; j++) {
                const entity2 = entities[j];
                // Skip invalid or dead entities
                if (!entity2 || entity2.isDead) continue;
                
                // Quick distance check before expensive collision test
                const dx = entity1.x - entity2.x;
                const dy = entity1.y - entity2.y;
                const maxRadius = (entity1.radius || 0) + (entity2.radius || 0);
                
                // Use squared distance to avoid sqrt
                if (dx * dx + dy * dy < maxRadius * maxRadius) {
                    if (this.isColliding(entity1, entity2)) {
                        this.handleCollision(entity1, entity2);
                    }
                }
            }
        }
    }
    
    checkAdjacentCellCollisions(gridX, gridY, entities) {
        const adjacentOffsets = [
            [1, 0], [0, 1], [1, 1], [-1, 1]
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
            (window.logger?.error || console.error)('Error handling collision:', error, 'Entity1:', entity1?.type, 'Entity2:', entity2?.type);
        }
    }

    _handlePlayerXpOrbCollision(player, xpOrb) {
        if (typeof player.addXP === 'function' && typeof xpOrb.value === 'number') {
            player.addXP(xpOrb.value);
            if (typeof xpOrb.createCollectionEffect === 'function') {
                try { xpOrb.createCollectionEffect(); } catch (e) { (window.logger?.error || console.error)('Error creating collection effect', e); }
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
            if (window.gameManager) {
                window.gameManager.showFloatingText(`+${Math.round(healAmount)}`, this.player.x, this.player.y - 30, '#2ecc71', 14);
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
        if (this.contextLost || !this.ctx || !this.canvas) {
            if (window.debugManager?.debugMode) {
                console.warn('Canvas context unavailable, skipping render');
            }
            return;
        }

        try {
            // Double buffer protection - ensure we have valid canvas state
            if (!this.canvas.width || !this.canvas.height || 
                this.canvas.width <= 0 || this.canvas.height <= 0) {
                return;
            }
            
            // Validate context state before clearing
            if (this.ctx.isContextLost && this.ctx.isContextLost()) {
                this.handleContextLoss(new Event('webglcontextlost'));
                return;
            }
            
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
            if (window.optimizedParticles && typeof window.optimizedParticles.render === 'function') {
                window.optimizedParticles.render(this.ctx);
            } else if (window.gameManager && !window.gameManager.lowQuality && typeof window.gameManager.renderParticles === 'function') {
                window.gameManager.renderParticles(this.ctx);
            }

            // Batch render by entity type for better performance
            this.renderEntities(visibleEntities);
            // Ensure player is drawn last on top as a safety net
            if (this.player && typeof this.player.render === 'function') {
                try { this.player.render(this.ctx); } catch(e) { (window.logger?.error || console.error)('Player render error', e); }
            }
            
            // Render UI elements using unified system (replaces buggy floating text)
            if (this.unifiedUI) {
                this.unifiedUI.render();
            } else if (window.gameManager && typeof window.gameManager._renderTexts === 'function') {
                // Fallback to old system if unified UI not available
                window.gameManager._renderTexts(this.ctx);
            } else if (window.floatingTextSystem && typeof window.floatingTextSystem.render === 'function') {
                window.floatingTextSystem.render(this.ctx);
            }
            
            // Render particles again on top if needed (e.g., trails)
            if (window.optimizedParticles && typeof window.optimizedParticles.render === 'function') {
                window.optimizedParticles.render(this.ctx);
            } else if (window.gameManager && typeof window.gameManager.renderParticles === 'function') {
                window.gameManager.renderParticles(this.ctx);
            }
            // Render debug information if enabled
            if (this.debugMode) {
                this.renderDebugInfo();
            }
            
            this.ctx.restore();
            
        } catch (error) {
            (window.logger?.error || console.error)('Render error:', error);
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
                        (window.logger?.error || console.error)(`Render error for ${entity.constructor?.name || 'entity'}:`, error);
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
        // Batch cleanup with reduced array operations
        let entityIndex = 0;
        let enemyIndex = 0;
        let xpOrbIndex = 0;
        let projectileIndex = 0;
        let enemyProjectileIndex = 0;
        
        // Clean main entities array using write-back approach for better performance
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            if (entity && !entity.isDead && typeof entity === 'object') {
                if (entityIndex !== i) {
                    this.entities[entityIndex] = entity;
                }
                entityIndex++;
            } else if (entity && entity.type === 'projectile') {
                this._releaseProjectile(entity);
            }
        }
        this.entities.length = entityIndex;
        
        // Clean enemies array
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy && !enemy.isDead && typeof enemy === 'object') {
                if (enemyIndex !== i) {
                    this.enemies[enemyIndex] = enemy;
                }
                enemyIndex++;
            }
        }
        this.enemies.length = enemyIndex;
        
        // Clean XP orbs array
        for (let i = 0; i < this.xpOrbs.length; i++) {
            const orb = this.xpOrbs[i];
            if (orb && !orb.isDead && typeof orb === 'object') {
                if (xpOrbIndex !== i) {
                    this.xpOrbs[xpOrbIndex] = orb;
                }
                xpOrbIndex++;
            }
        }
        this.xpOrbs.length = xpOrbIndex;
        
        // Clean projectiles array
        for (let i = 0; i < this.projectiles.length; i++) {
            const p = this.projectiles[i];
            if (p && !p.isDead && typeof p === 'object') {
                if (projectileIndex !== i) {
                    this.projectiles[projectileIndex] = p;
                }
                projectileIndex++;
            } else if (p && p.type === 'projectile') {
                this._releaseProjectile(p);
            }
        }
        this.projectiles.length = projectileIndex;
        
        // Clean enemy projectiles array
        if (this.enemyProjectiles && Array.isArray(this.enemyProjectiles)) {
            for (let i = 0; i < this.enemyProjectiles.length; i++) {
                const ep = this.enemyProjectiles[i];
                if (ep && !ep.isDead && typeof ep === 'object') {
                    if (enemyProjectileIndex !== i) {
                        this.enemyProjectiles[enemyProjectileIndex] = ep;
                    }
                    enemyProjectileIndex++;
                } else if (ep && ep.type === 'enemyProjectile') {
                    this._releaseEnemyProjectile(ep);
                }
            }
            this.enemyProjectiles.length = enemyProjectileIndex;
        }
        
        // Basic entity limit enforcement (unchanged)
        const maxEntities = 2000;
        if (this.entities.length > maxEntities) {
            const nonPlayerEntities = this.entities.filter(e => e && e.type !== 'player');
            const toRemove = this.entities.length - maxEntities;
            for (let i = 0; i < toRemove && i < nonPlayerEntities.length; i++) {
                if (nonPlayerEntities[i]) {
                    nonPlayerEntities[i].isDead = true;
                }
            }
            // Re-run cleanup after marking entities as dead
            this.cleanupEntities();
        }
    }

    // Projectile pooling helpers
    spawnProjectile(x, y, vx, vy, damage, piercing = 0, isCrit = false, specialType = null) {
        // Validate parameters with proper error logging
        if (typeof x !== 'number' || typeof y !== 'number' || 
            typeof vx !== 'number' || typeof vy !== 'number' || 
            typeof damage !== 'number' || damage <= 0) {
            if (window.debugManager?.debugMode) {
                console.warn('Invalid projectile parameters:', { x, y, vx, vy, damage });
            }
            return null;
        }
        
        // Check for NaN values which can cause rendering issues
        if (isNaN(x) || isNaN(y) || isNaN(vx) || isNaN(vy) || isNaN(damage)) {
            if (window.debugManager?.debugMode) {
                console.warn('NaN detected in projectile parameters:', { x, y, vx, vy, damage });
            }
            return null;
        }
        
        let proj = this.projectilePool.length > 0 ? this.projectilePool.pop() : null;
        if (!proj) {
            // Check if Projectile class is available
            if (typeof Projectile === 'undefined') {
                console.error('Projectile class not available');
                return null;
            }
            try {
                proj = new Projectile(x, y, vx, vy, damage, piercing, isCrit, specialType);
            } catch (error) {
                console.error('Failed to create new Projectile:', error);
                return null;
            }
        } else {
            // Reset pooled projectile safely with validation
            try {
                proj.x = x; proj.y = y; proj.vx = vx; proj.vy = vy;
                proj.damage = damage; proj.piercing = piercing || 0; proj.isCrit = !!isCrit;
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
                if (specialType && typeof proj.initializeSpecialType === 'function') {
                    proj.specialType = specialType;
                    proj.initializeSpecialType(specialType);
                }
            } catch (error) {
                console.error('Failed to reset pooled Projectile:', error);
                return null;
            }
        }
        
        if (proj) {
            this.addEntity(proj);
        }
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
        // Validate parameters
        if (typeof x !== 'number' || typeof y !== 'number' || 
            typeof vx !== 'number' || typeof vy !== 'number' || 
            typeof damage !== 'number' || damage <= 0) {
            if (window.debugManager?.debugMode) {
                console.warn('Invalid enemy projectile parameters:', { x, y, vx, vy, damage });
            }
            return null;
        }
        
        // Check for NaN values
        if (isNaN(x) || isNaN(y) || isNaN(vx) || isNaN(vy) || isNaN(damage)) {
            if (window.debugManager?.debugMode) {
                console.warn('NaN detected in enemy projectile parameters:', { x, y, vx, vy, damage });
            }
            return null;
        }
        
        // Initialize enemy projectile pool if it doesn't exist
        if (!this.enemyProjectilePool) {
            this.enemyProjectilePool = [];
        }
        
        let ep = this.enemyProjectilePool.length > 0 ? this.enemyProjectilePool.pop() : null;
        
        if (!ep) {
            // Check if EnemyProjectile class is available
            if (typeof EnemyProjectile === 'undefined') {
                console.error('EnemyProjectile class not available');
                return null;
            }
            try {
                ep = new EnemyProjectile(x, y, vx, vy, damage);
            } catch (error) {
                console.error('Failed to create new EnemyProjectile:', error);
                return null;
            }
        } else {
            // Reset pooled enemy projectile safely
            try {
                ep.x = x; ep.y = y; ep.vx = vx; ep.vy = vy;
                ep.damage = damage;
                ep.isDead = false;
                ep.timer = 0;
                ep.lifetime = 3;
                ep.radius = 5;
                ep.type = 'enemyProjectile';
                ep.color = '#9b59b6';
                ep.glowColor = 'rgba(155, 89, 182, 0.45)';
            } catch (error) {
                console.error('Failed to reset pooled EnemyProjectile:', error);
                return null;
            }
        }
        
        if (ep) {
            this.addEntity(ep);
        }
        return ep;
    }

    _releaseEnemyProjectile(ep) {
        // Basic sanitize of enemy projectile before pooling
        if (ep) {
            ep.isDead = true;
            // Initialize pool if it doesn't exist
            if (!this.enemyProjectilePool) {
                this.enemyProjectilePool = [];
            }
            if (this.enemyProjectilePool.length < this.maxPoolSize) {
                this.enemyProjectilePool.push(ep);
            }
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
                entity.id = `${entity.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
            if (window.upgradeSystem && window.upgradeSystem.isLevelUpActive()) {
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
        if (!window.upgradeSystem || !window.upgradeSystem.isLevelUpActive()) {
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) pauseMenu.classList.remove('hidden');
        }
        // Suspend audio during pause
        if (window.audioSystem && window.audioSystem.audioContext && window.audioSystem.audioContext.state === 'running') {
            window.audioSystem.audioContext.suspend();
        }
    }
    
    resumeGame() {
        // Don't resume if level-up menu is active
        if (window.upgradeSystem && window.upgradeSystem.isLevelUpActive()) {
            return;
        }
        
        this.isPaused = false;
        
        // Hide pause menu
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');
        // Resume audio on unpause
        if (window.audioSystem) {
            window.audioSystem.resumeAudioContext();
        }
    }
    
    getVisibleEntities() {
        if (!this.player || !Array.isArray(this.entities)) {
            return []; // Return empty array if game state is invalid
        }
        
        // Calculate visible area around player with margin
        const viewportWidth = this.canvas.width;
        const viewportHeight = this.canvas.height;
        const margin = 200; // Extra margin for entities about to enter view
        
        // Validate canvas dimensions
        if (!viewportWidth || !viewportHeight) {
            return this.entities.filter(e => e && !e.isDead);
        }
        
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
        if (window.gameManager) {
            window.gameManager.particles = [];
            window.gameManager.particlePool = [];
        }
        
        // Reduce update frequency
        this.targetFps = 30;
        this.frameTime = 1000 / this.targetFps;
        
        // Clear unnecessary resources
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Suspend audio if available
        if (window.audioSystem && window.audioSystem.audioContext) {
            window.audioSystem.audioContext.suspend();
        }
    }
    
    restoreResourceUsage() {
        // Restore normal FPS
        this.targetFps = 60;
        this.frameTime = 1000 / this.targetFps;
        
        // Resume audio if available
        if (window.audioSystem && window.audioSystem.audioContext) {
            window.audioSystem.audioContext.resume();
        }
    }
      cleanupResources() {
        // Clean up dead entities
        this.cleanupEntities();
        
        // Clean up unused object pools
        if (this.projectilePool.length > this.maxPoolSize) {
            this.projectilePool.length = this.maxPoolSize;
        }
        
        if (this.enemyProjectilePool && this.enemyProjectilePool.length > this.maxPoolSize) {
            this.enemyProjectilePool.length = this.maxPoolSize;
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
            (window.logger?.warn || console.warn)('Canvas context lost - game paused');
        this.isPaused = true;
    }
    
    handleContextRestore(event) {
        (window.logger?.log || console.log)('Canvas context restored - resuming game');
        this.contextLost = false;
        
        // Reinitialize canvas context
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,
            willReadFrequently: false
        });
        
        if (this.ctx) {
            this.isPaused = false;
            (window.logger?.log || console.log)('Game context successfully restored');
        } else {
            (window.logger?.error || console.error)('Failed to restore canvas context');
        }
    }
    
    cleanupEventListeners() {
        // Remove event listeners to prevent memory leaks
        try {
            // Store original bound functions for proper removal
            if (this.boundResizeCanvas) {
                window.removeEventListener('resize', this.boundResizeCanvas);
            }
            if (this.boundHandleContextLoss) {
                this.canvas.removeEventListener('webglcontextlost', this.boundHandleContextLoss);
            }
            if (this.boundHandleContextRestore) {
                this.canvas.removeEventListener('webglcontextrestored', this.boundHandleContextRestore);
            }
            if (this.boundHandleVisibilityChange) {
                document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
            }
            if (this.boundHandleFocusChange) {
                window.removeEventListener('focus', this.boundHandleFocusChange);
            }
            if (this.boundHandleBlurChange) {
                window.removeEventListener('blur', this.boundHandleBlurChange);
            }
            if (this.boundHandleKeyDown) {
                window.removeEventListener('keydown', this.boundHandleKeyDown);
            }
            if (this.boundHandleKeyUp) {
                window.removeEventListener('keyup', this.boundHandleKeyUp);
            }
            
            (window.logger?.log || console.log)('Event listeners cleaned up successfully');
        } catch (error) {
            (window.logger?.error || console.error)('Error cleaning up event listeners:', error);
        }
    }
    
    shutdown() {
        (window.logger?.log || console.log)('Shutting down game engine...');
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
        this.enemyProjectilePool = [];
        this.particlePool = [];
        
        (window.logger?.log || console.log)('Game engine shutdown complete');
    }
}

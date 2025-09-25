// CollisionSystem: handles spatial grid updates and collision processing
// Depends on engine entities and classes already present globally
// TODO: Implement quadtree for more efficient spatial partitioning
// FIX: Current grid system creates many small cells - could be optimized
// TODO: Add broad-phase collision detection before narrow-phase
(function () {
    class CollisionSystem {
        constructor(engine) {
            this.engine = engine;
            
            // ✅ COLLISION STATISTICS for performance monitoring
            this.stats = {
                cellsProcessed: 0,
                collisionsChecked: 0,
                collisionsDetected: 0,
                avgEntitiesPerCell: 0,
                lastResetTime: performance.now()
            };
            
            // ✅ COLLISION LAYERS for better filtering
            this.collisionLayers = {
                PLAYER: 1,
                ENEMY: 2,
                PROJECTILE: 4,
                XP_ORB: 8,
                ENEMY_PROJECTILE: 16
            };
            
            // Performance optimization: reusable objects
            this.tempVector = { x: 0, y: 0 };
            // Note: Cell pooling disabled due to correctness issues
        }

        updateSpatialGrid() {
            const engine = this.engine;
            if (!engine.spatialGrid) engine.spatialGrid = new Map();
            engine.spatialGrid.clear();
            
            // ✅ ADAPTIVE GRID SIZE based on entity density
            const entityCount = (engine.entities || []).length;
            const adaptiveGridSize = this.calculateOptimalGridSize(entityCount);
            const gridSize = adaptiveGridSize || engine.gridSize || 100;
            // Sync engine gridSize so helpers (e.g., projectile targeting) use the same value
            engine.gridSize = gridSize;
            
            const list = engine.entities || [];
            this.stats.cellsProcessed = 0;
            let totalEntitiesInCells = 0;
            
            // ✅ OBJECT POOLING for grid cells to reduce allocations
            for (const entity of list) {
                if (!entity || entity.isDead) continue;
                
                const gridX = Math.floor(entity.x / gridSize);
                const gridY = Math.floor(entity.y / gridSize);
                const key = `${gridX},${gridY}`;
                
                let cell = engine.spatialGrid.get(key);
                if (!cell) {
                    // Create new cell array (pooling optimization disabled for now due to correctness issues)
                    cell = [];
                    engine.spatialGrid.set(key, cell);
                    this.stats.cellsProcessed++;
                }
                
                cell.push(entity);
                totalEntitiesInCells++;
            }
            
            // Update performance statistics
            this.stats.avgEntitiesPerCell = this.stats.cellsProcessed > 0 ? 
                totalEntitiesInCells / this.stats.cellsProcessed : 0;
        }
        
        // ✅ CALCULATE OPTIMAL GRID SIZE based on entity density - improved stability
        calculateOptimalGridSize(entityCount) {
            // Use larger grid cells to reduce boundary crossing jitter
            if (entityCount < 50) return 160;      // Larger cells for few entities
            if (entityCount < 100) return 140;     // Medium cells for moderate count
            if (entityCount < 200) return 120;     // Standard cells for many entities
            return 100;                            // Reduced minimum cell size for stability
        }

        checkCollisions() {
            const engine = this.engine;
            if (!engine || !engine.spatialGrid) {
                return; // Skip collision checking if engine state is invalid
            }
            
            // ✅ RESET COLLISION STATISTICS
            this.stats.collisionsChecked = 0;
            this.stats.collisionsDetected = 0;
            const startTime = performance.now();
            
            try {
                for (const [key, entities] of engine.spatialGrid) {
                    // ✅ EARLY EXIT STRATEGY for empty regions
                    if (!entities || entities.length === 0) continue;
                    
                    // ✅ BROAD-PHASE: Skip cells with only one entity
                    if (entities.length === 1) {
                        // Still check adjacent cells for cross-cell collisions
                        const coords = key.split(',');
                        if (coords.length === 2) {
                            const gridX = parseInt(coords[0], 10);
                            const gridY = parseInt(coords[1], 10);
                            if (Number.isFinite(gridX) && Number.isFinite(gridY)) {
                                this.checkAdjacentCellCollisions(gridX, gridY, entities);
                            }
                        }
                        continue;
                    }
                    
                    this.checkCollisionsInCell(entities);
                    const coords = key.split(',');

                    // Validate grid coordinates
                    if (coords.length !== 2) continue;
                    const gridX = parseInt(coords[0], 10);
                    const gridY = parseInt(coords[1], 10);
                    if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) continue;
                    
                    this.checkAdjacentCellCollisions(gridX, gridY, entities);
                }
                
                // ✅ LOG PERFORMANCE STATISTICS periodically
                if (window.debugManager?.enabled && startTime - this.stats.lastResetTime > 5000) {
                    this.logPerformanceStats(performance.now() - startTime);
                    this.stats.lastResetTime = startTime;
                }
                
            } catch (error) {
                (window.logger?.error || console.error)('Error in collision checking:', error);
            }
        }
        
        // ✅ PERFORMANCE STATISTICS LOGGING
        logPerformanceStats(processingTime) {
            const stats = this.stats;
            window.logger?.debug(`Collision Performance:
                Cells: ${stats.cellsProcessed} | Avg Entities/Cell: ${stats.avgEntitiesPerCell.toFixed(1)}
                Checks: ${stats.collisionsChecked} | Detected: ${stats.collisionsDetected} 
                Processing Time: ${processingTime.toFixed(2)}ms`);
        }

        checkCollisionsInCell(entities) {
            // ✅ EARLY EXIT for small cells (already optimized)
            if (entities.length < 2) return;
            
            // ✅ COLLISION LAYER FILTERING - skip impossible collisions
            for (let i = 0; i < entities.length - 1; i++) {
                const entity1 = entities[i];
                if (!entity1 || entity1.isDead) continue; // Skip dead entities
                
                for (let j = i + 1; j < entities.length; j++) {
                    const entity2 = entities[j];
                    if (!entity2 || entity2.isDead) continue; // Skip dead entities
                    
                    // ✅ BROAD-PHASE: Skip impossible collision combinations
                    if (!this.canCollide(entity1, entity2)) {
                        continue;
                    }
                    
                    this.stats.collisionsChecked++;
                    
                    if (this.isColliding(entity1, entity2)) {
                        this.stats.collisionsDetected++;
                        this.handleCollision(entity1, entity2);
                    }
                }
            }
        }
        
        // ✅ COLLISION LAYER SYSTEM - determine if two entities can collide
        canCollide(entity1, entity2) {
            const type1 = entity1.type;
            const type2 = entity2.type;
            
            // Define collision rules (what CAN collide)
            const collisionRules = {
                'player': ['enemy', 'xpOrb', 'enemyProjectile'],
                'projectile': ['enemy'],
                'enemyProjectile': ['player'],
                'enemy': ['player', 'projectile'],
                'xpOrb': ['player']
            };
            
            return collisionRules[type1]?.includes(type2) || collisionRules[type2]?.includes(type1);
        }

        checkAdjacentCellCollisions(gridX, gridY, entities) {
            const engine = this.engine;
            // Check only forward neighbors to avoid duplicate pair processing
            const adjacentOffsets = [
                [1, 0], [0, 1], [1, 1], [-1, 1]
            ];
            for (const [dx, dy] of adjacentOffsets) {
                const adjacentKey = `${gridX + dx},${gridY + dy}`;
                const adjacentEntities = engine.spatialGrid.get(adjacentKey);
                if (!adjacentEntities || adjacentEntities.length === 0) continue;
                for (const e of entities) {
                    if (!e || e.isDead) continue;
                    for (const ae of adjacentEntities) {
                        if (!ae || ae.isDead) continue;
                        if (!this.canCollide(e, ae)) continue;
                        if (this.isColliding(e, ae)) {
                            this.handleCollision(e, ae);
                        }
                    }
                }
            }
        }

        isColliding(a, b) {
            if (!a || !b) return false;
            if (typeof a.x !== 'number' || typeof a.y !== 'number' ||
                typeof b.x !== 'number' || typeof b.y !== 'number' ||
                typeof a.radius !== 'number' || typeof b.radius !== 'number') {
                return false;
            }
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const r = a.radius + b.radius;
            if (r <= 0) return false;
            return (dx * dx + dy * dy) < (r * r);
        }

        handleCollision(entity1, entity2) {
            const engine = this.engine;
            if (!entity1 || !entity2) return;
            if (entity1 === entity2) return;
            // Only compare IDs if both entities have them
            if (entity1.id && entity2.id && entity1.id === entity2.id) return;
            if (entity1.isDead || entity2.isDead) return;

            try {
                // Player <-> XP orbs
                if (entity1.type === 'player' && entity2.type === 'xpOrb') {
                    if (typeof entity1.addXP === 'function' && typeof entity2.value === 'number') {
                        entity1.addXP(entity2.value);
                        if (typeof entity2.createCollectionEffect === 'function') {
                            try { entity2.createCollectionEffect(); } catch {}
                        }
                        if ('collected' in entity2) entity2.collected = true;
                        entity2.isDead = true;
                    }
                } else if (entity2.type === 'player' && entity1.type === 'xpOrb') {
                    if (typeof entity2.addXP === 'function' && typeof entity1.value === 'number') {
                        entity2.addXP(entity1.value);
                        if (typeof entity1.createCollectionEffect === 'function') {
                            try { entity1.createCollectionEffect(); } catch {}
                        }
                        if ('collected' in entity1) entity1.collected = true;
                        entity1.isDead = true;
                    }
                }

                // Player <-> enemy
                if (entity1.type === 'player' && entity2.type === 'enemy' && !entity1.isInvulnerable) {
                    if (typeof entity1.takeDamage === 'function' && typeof entity2.damage === 'number') {
                        entity1.takeDamage(entity2.damage);
                    }
                } else if (entity2.type === 'player' && entity1.type === 'enemy' && !entity2.isInvulnerable) {
                    if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                        entity2.takeDamage(entity1.damage);
                        if (window.gameManager) window.gameManager.createHitEffect(entity2.x, entity2.y, entity1.damage);
                        if (window.audioSystem && window.audioSystem.play) window.audioSystem.play('hit', 0.2);
                    }
                }

                // Projectile <-> enemy
                if (entity1.type === 'projectile' && entity2.type === 'enemy' && !entity2.isDead) {
                    if (entity1.hitEnemies && entity1.hitEnemies.has(entity2.id)) return;
                    let hitSuccessful = true;
                    if (typeof entity1.hit === 'function') hitSuccessful = entity1.hit(entity2);

                    if (hitSuccessful) {
                        // Apply damage only on a valid hit
                        if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                            entity2.takeDamage(entity1.damage);
                        }
                        if (entity1.hitEnemies) entity1.hitEnemies.add(entity2.id);

                        let projectileShouldDie = false;

                        // Chain lightning effects
                        if (entity1.hasChainLightning || entity1.chainLightning || entity1.specialType === 'chain') {
                            if (typeof entity1.triggerChain === 'function') {
                                entity1.triggerChain(engine, entity2);
                            }
                        }

                        // Lifesteal
                        if (engine.player && entity1.lifesteal) {
                            const healAmount = entity1.damage * entity1.lifesteal;
                            engine.player.health = Math.min(engine.player.maxHealth, engine.player.health + healAmount);
                            if (window.gameManager) window.gameManager.showFloatingText(`+${Math.round(healAmount)}`, engine.player.x, engine.player.y - 30, '#2ecc71', 14);
                        }

                        // Handle piercing and death - UPDATED to match gameEngine logic
                        let piercingExhausted = false;
                        if (typeof entity1.piercing === 'number' && entity1.piercing > 0) {
                            if (window.debugProjectiles) {
                                console.log(`[CollisionSystem] Projectile ${entity1.id} piercing hit. Piercing: ${entity1.piercing} -> ${entity1.piercing - 1}`);
                            }
                            entity1.piercing--;
                            projectileShouldDie = false; // Continue after piercing

                            if (entity1.piercing < 0) {
                                piercingExhausted = true;
                                projectileShouldDie = true; // Should die unless ricochet saves it
                                if (window.debugProjectiles) {
                                    console.log(`[CollisionSystem] Projectile ${entity1.id} piercing exhausted, should die unless ricochet saves it`);
                                }
                            } else {
                                if (window.debugProjectiles) {
                                    console.log(`[CollisionSystem] Projectile ${entity1.id} still has piercing charges: ${entity1.piercing}`);
                                }
                            }
                        }

                        // Check for ricochet only when projectile would normally die
                        if (projectileShouldDie && (entity1.hasRicochet || entity1.ricochet || entity1.specialType === 'ricochet')) {
                            if (window.debugProjectiles) {
                                console.log(`[CollisionSystem] Projectile ${entity1.id} attempting ricochet. hasRicochet: ${!!entity1.hasRicochet}, specialType: ${entity1.specialType}`);
                            }
                            try {
                                const ok = entity1.ricochet(engine);
                                if (ok) {
                                    projectileShouldDie = false; // Ricochet successful
                                    if (window.debugProjectiles) {
                                        console.log(`[CollisionSystem] Projectile ${entity1.id} ricochet successful!`);
                                    }
                                    // Reset piercing if projectile ricocheted
                                    if (piercingExhausted && entity1.originalPiercing > 0) {
                                        entity1.piercing = Math.max(1, Math.floor(entity1.originalPiercing / 2));
                                        if (window.debugProjectiles) {
                                            console.log(`[CollisionSystem] Projectile ${entity1.id} piercing restored: ${entity1.piercing}`);
                                        }
                                    }
                                } else {
                                    if (window.debugProjectiles) {
                                        console.log(`[CollisionSystem] Projectile ${entity1.id} ricochet failed`);
                                    }
                                }
                            } catch (e) {
                                if (window.debugProjectiles) {
                                    console.log(`[CollisionSystem] Projectile ${entity1.id} ricochet error:`, e);
                                }
                            }
                        }

                        // Explosion handling
                        if ((entity1.hasExplosive || entity1.explosive || entity1.specialType === 'explosive') && projectileShouldDie) {
                            if (typeof entity1.explode === 'function') {
                                entity1.explode(engine);
                            }
                        }

                        if (projectileShouldDie) entity1.isDead = true;
                    }
                } else if (entity2.type === 'projectile' && entity1.type === 'enemy' && !entity1.isDead) {
                    if (entity2.hitEnemies && entity2.hitEnemies.has(entity1.id)) return;
                    let hitSuccessful = true;
                    if (typeof entity2.hit === 'function') hitSuccessful = entity2.hit(entity1);

                    if (hitSuccessful) {
                        if (typeof entity1.takeDamage === 'function' && typeof entity2.damage === 'number') {
                            entity1.takeDamage(entity2.damage);
                            if (window.gameManager) window.gameManager.createHitEffect(entity1.x, entity1.y, entity2.damage);
                            if (window.audioSystem && window.audioSystem.play) window.audioSystem.play('hit', 0.2);
                        }
                        if (entity2.hitEnemies) entity2.hitEnemies.add(entity1.id);

                        // Chain lightning effects
                        if (entity2.hasChainLightning || entity2.chainLightning || entity2.specialType === 'chain') {
                            if (typeof entity2.triggerChain === 'function') {
                                entity2.triggerChain(engine, entity1);
                            }
                        }

                        // Lifesteal
                        if (engine.player && entity2.lifesteal) {
                            const healAmount = entity2.damage * entity2.lifesteal;
                            engine.player.health = Math.min(engine.player.maxHealth, engine.player.health + healAmount);
                            if (window.gameManager) window.gameManager.showFloatingText(`+${Math.round(healAmount)}`, engine.player.x, engine.player.y - 30, '#2ecc71', 14);
                        }

                        // Explosion handling - trigger for explosive projectiles that should die
                        if (entity2.hasExplosive || entity2.explosive || entity2.specialType === 'explosive') {
                            if (typeof entity2.explode === 'function') {
                                entity2.explode(engine);
                            }
                            entity2.isDead = true;
                            return;
                        }

                        // Handle piercing and death - UPDATED to match gameEngine logic
                        let projectileShouldDie2 = true;
                        let piercingExhausted2 = false;
                        if (typeof entity2.piercing === 'number' && entity2.piercing > 0) {
                            if (window.debugProjectiles) {
                                console.log(`[CollisionSystem] Projectile ${entity2.id} piercing hit. Piercing: ${entity2.piercing} -> ${entity2.piercing - 1}`);
                            }
                            entity2.piercing--;
                            projectileShouldDie2 = false; // Continue after piercing

                            if (entity2.piercing < 0) {
                                piercingExhausted2 = true;
                                projectileShouldDie2 = true; // Should die unless ricochet saves it
                                if (window.debugProjectiles) {
                                    console.log(`[CollisionSystem] Projectile ${entity2.id} piercing exhausted, should die unless ricochet saves it`);
                                }
                            } else {
                                if (window.debugProjectiles) {
                                    console.log(`[CollisionSystem] Projectile ${entity2.id} still has piercing charges: ${entity2.piercing}`);
                                }
                            }
                        }

                        // Check for ricochet only when projectile would normally die
                        if (projectileShouldDie2 && (entity2.hasRicochet || entity2.ricochet || entity2.specialType === 'ricochet')) {
                            if (window.debugProjectiles) {
                                console.log(`[CollisionSystem] Projectile ${entity2.id} attempting ricochet. hasRicochet: ${!!entity2.hasRicochet}, specialType: ${entity2.specialType}`);
                            }
                            try {
                                const ok = entity2.ricochet(engine);
                                if (ok) {
                                    projectileShouldDie2 = false; // Ricochet successful
                                    if (window.debugProjectiles) {
                                        console.log(`[CollisionSystem] Projectile ${entity2.id} ricochet successful!`);
                                    }
                                    // Reset piercing if projectile ricocheted
                                    if (piercingExhausted2 && entity2.originalPiercing > 0) {
                                        entity2.piercing = Math.max(1, Math.floor(entity2.originalPiercing / 2));
                                        if (window.debugProjectiles) {
                                            console.log(`[CollisionSystem] Projectile ${entity2.id} piercing restored: ${entity2.piercing}`);
                                        }
                                    }
                                } else {
                                    if (window.debugProjectiles) {
                                        console.log(`[CollisionSystem] Projectile ${entity2.id} ricochet failed`);
                                    }
                                }
                            } catch (e) {
                                if (window.debugProjectiles) {
                                    console.log(`[CollisionSystem] Projectile ${entity2.id} ricochet error:`, e);
                                }
                            }
                        }

                        if (projectileShouldDie2) entity2.isDead = true;
                    }
                }

                // Enemy projectile <-> player
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
            } catch (err) {
                console.error('Error handling collision:', err, 'Entity1:', entity1?.type, 'Entity2:', entity2?.type);
            }
        }
        
        // ✅ CELL POOL MANAGEMENT - prevent memory leaks
        cleanupCellPool() {
            // Initialize cellPool if it doesn't exist
            if (!this.cellPool) {
                this.cellPool = new Map();
                return;
            }

            // Keep pool size reasonable - remove unused cells periodically
            if (this.cellPool.size > 1000) {
                const engine = this.engine;
                const activeCells = new Set(engine.spatialGrid?.keys() || []);

                // Remove cells that haven't been used recently
                for (const [key, cell] of this.cellPool.entries()) {
                    if (!activeCells.has(key)) {
                        this.cellPool.delete(key);
                    }
                }

                if (window.debugManager?.enabled) {
                    window.logger?.debug(`Cell pool cleaned: ${this.cellPool.size} cells remaining`);
                }
            }
        }
        
        // ✅ PERFORMANCE OPTIMIZATION ENTRY POINT
        getPerformanceStats() {
            return {
                ...this.stats,
                cellPoolSize: this.cellPool?.size || 0,
                efficiency: this.stats.collisionsChecked > 0 ?
                    (this.stats.collisionsDetected / this.stats.collisionsChecked * 100).toFixed(1) + '%' : '0%'
            };
        }
    }

    window.CollisionSystem = CollisionSystem;
})();

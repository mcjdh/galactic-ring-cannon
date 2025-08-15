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
            this.cellPool = new Map(); // Object pooling for grid cells
        }

        updateSpatialGrid() {
            const engine = this.engine;
            if (!engine.spatialGrid) engine.spatialGrid = new Map();
            engine.spatialGrid.clear();
            
            // ✅ ADAPTIVE GRID SIZE based on entity density
            const entityCount = (engine.entities || []).length;
            const adaptiveGridSize = this.calculateOptimalGridSize(entityCount);
            const gridSize = adaptiveGridSize || engine.gridSize || 100;
            
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
                    // Try to reuse pooled cell array
                    cell = this.cellPool.get(key) || [];
                    cell.length = 0; // Clear without deallocating
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
        
        // ✅ CALCULATE OPTIMAL GRID SIZE based on entity density
        calculateOptimalGridSize(entityCount) {
            if (entityCount < 50) return 150;      // Larger cells for few entities
            if (entityCount < 100) return 120;     // Medium cells for moderate count
            if (entityCount < 200) return 100;     // Standard cells for many entities
            return 80;                             // Smaller cells for high density
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
                        const [gridX, gridY] = key.split(',').map(Number);
                        if (Number.isFinite(gridX) && Number.isFinite(gridY)) {
                            this.checkAdjacentCellCollisions(gridX, gridY, entities);
                        }
                        continue;
                    }
                    
                    this.checkCollisionsInCell(entities);
                    const [gridX, gridY] = key.split(',').map(Number);
                    
                    // Validate grid coordinates
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
            const adjacentOffsets = [
                [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]
            ];
            for (const [dx, dy] of adjacentOffsets) {
                const adjacentKey = `${gridX + dx},${gridY + dy}`;
                const adjacentEntities = engine.spatialGrid.get(adjacentKey);
                if (!adjacentEntities) continue;
                for (const e of entities) {
                    for (const ae of adjacentEntities) {
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
            if (entity1 === entity2 || (entity1.id && entity1.id === entity2.id)) return;
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
                        if (entity1.chainLightning) entity1.triggerChainLightning(engine, entity2);
                        if (engine.player && entity1.lifesteal) {
                            const healAmount = entity1.damage * entity1.lifesteal;
                            engine.player.health = Math.min(engine.player.maxHealth, engine.player.health + healAmount);
                            if (window.gameManager) window.gameManager.showFloatingText(`+${Math.round(healAmount)}`, engine.player.x, engine.player.y - 30, '#2ecc71', 14);
                        }
                        if (entity1.piercing && entity1.piercing > 0) {
                            entity1.piercing--;
                            if (entity1.piercing <= 0) projectileShouldDie = true;
                        } else if (entity1.ricochet && entity1.ricochet.bounced < entity1.ricochet.bounces) {
                            if (entity1.type === 'projectile' && typeof Projectile !== 'undefined') {
                                const ok = Projectile.prototype.ricochet.call(entity1, engine);
                                if (!ok) projectileShouldDie = true;
                            } else {
                                projectileShouldDie = true;
                            }
                        } else {
                            projectileShouldDie = true;
                        }
                        if (entity1.explosive && (projectileShouldDie || (entity1.piercing !== undefined && entity1.piercing <= 0))) {
                            entity1.explode(engine);
                            projectileShouldDie = true;
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
                        if (entity2.chainLightning) entity2.triggerChainLightning(engine, entity1);
                        if (engine.player && entity2.lifesteal) {
                            const healAmount = entity2.damage * entity2.lifesteal;
                            engine.player.health = Math.min(engine.player.maxHealth, engine.player.health + healAmount);
                            if (window.gameManager) window.gameManager.showFloatingText(`+${Math.round(healAmount)}`, engine.player.x, engine.player.y - 30, '#2ecc71', 14);
                        }
                        if (entity2.explosive) { entity2.explode(engine); return; }
                        if (entity2.piercing && entity2.piercing > 0) {
                            entity2.piercing--;
                            if (entity2.piercing <= 0) entity2.isDead = true;
                        } else if (entity2.ricochet && entity2.ricochet.bounced < entity2.ricochet.bounces) {
                            if (entity2.type === 'projectile' && typeof Projectile !== 'undefined') {
                                const ok = Projectile.prototype.ricochet.call(entity2, engine);
                                if (!ok) entity2.isDead = true;
                            } else {
                                entity2.isDead = true;
                            }
                        } else {
                            entity2.isDead = true;
                        }
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
                cellPoolSize: this.cellPool.size,
                efficiency: this.stats.collisionsChecked > 0 ? 
                    (this.stats.collisionsDetected / this.stats.collisionsChecked * 100).toFixed(1) + '%' : '0%'
            };
        }
    }

    window.CollisionSystem = CollisionSystem;
})();

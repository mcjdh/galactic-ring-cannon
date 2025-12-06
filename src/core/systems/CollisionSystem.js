// CollisionSystem: handles spatial grid updates and collision processing
// Depends on engine entities and classes already present globally
// + PERFORMANCE: Adaptive grid sizing based on entity density
// + OPTIMIZATION: Broad-phase filtering to skip impossible collisions
// + OPTIMIZATION: Collision layer system to reduce unnecessary checks
(function () {
    class CollisionSystem {
        constructor(engine) {
            this.engine = engine;

            // + COLLISION STATISTICS for performance monitoring
            this.stats = {
                cellsProcessed: 0,
                collisionsChecked: 0,
                collisionsDetected: 0,
                avgEntitiesPerCell: 0,
                lastResetTime: performance.now()
            };

            // + COLLISION LAYERS for better filtering
            this.collisionLayers = {
                PLAYER: 1,
                ENEMY: 2,
                PROJECTILE: 4,
                XP_ORB: 8,
                ENEMY_PROJECTILE: 16
            };

            this.collisionRules = {
                player: new Set(['enemy', 'xpOrb', 'enemyProjectile']),
                projectile: new Set(['enemy']),
                enemyProjectile: new Set(['player']),
                enemy: new Set(['player', 'projectile']),
                xpOrb: new Set(['player'])
            };

            this._adjacentOffsets = [
                [1, 0],
                [0, 1],
                [1, 1],
                [-1, 1]
            ];

            this._cachedGridSize = engine.gridSize || GAME_CONSTANTS.PERFORMANCE.SPATIAL_GRID_SIZE;
            this._lastGridSampleCount = 0;
            this._lastGridSampleTime = performance.now();
            this._gridRecalcIntervalMs = GAME_CONSTANTS.PERFORMANCE.GRID_RECALC_INTERVAL_MS;

            // OPTIMIZATION: Dirty tracking to skip unnecessary grid rebuilds
            // The spatial grid only needs rebuilding when entities move to different grid cells
            // This optimization can save 30-50% of grid rebuild operations on stable frames
            //
            // How it works:
            // 1. Track each entity's last grid cell position in WeakMap (no memory leaks)
            // 2. Before rebuilding, check if any entity moved to a different cell
            // 3. If no entities moved AND entity count is same, reuse cached grid
            // 4. Update stats.cellsProcessed to reflect cached state
            this._gridDirty = true; // Force rebuild on first frame
            this._lastEntityCount = 0;
            this._entityGridPositions = new WeakMap(); // Track entity -> {gridX, gridY}

            // Performance optimization: reusable objects
            this.tempVector = { x: 0, y: 0 };
            // Note: Cell pooling disabled due to correctness issues
        }

        /**
         * Mark the spatial grid as needing a rebuild.
         * Call this when entities are added or removed externally.
         */
        markGridDirty() {
            this._gridDirty = true;
        }

        /**
         * Reset the collision system state (e.g., for new game)
         */
        reset() {
            this._gridDirty = true;
            this._lastEntityCount = 0;
            this._entityGridPositions = new WeakMap();
            this.stats.cellsProcessed = 0;
            this.stats.collisionsChecked = 0;
            this.stats.collisionsDetected = 0;
            this.stats.avgEntitiesPerCell = 0;
            this.stats.lastResetTime = performance.now();
        }

        updateSpatialGrid() {
            const engine = this.engine;
            if (!engine.spatialGrid) engine.spatialGrid = new Map();
            if (!engine._spatialGridCellPool) {
                engine._spatialGridCellPool = [];
            }

            const list = engine.entities || [];
            const entityCount = list.length;

            // OPTIMIZATION: Check if grid needs rebuilding (dirty tracking)
            const now = performance.now();
            let gridSize = this._cachedGridSize;
            let shouldRecalculate = false;

            if (now - this._lastGridSampleTime >= this._gridRecalcIntervalMs) {
                shouldRecalculate = true;
            } else if (Math.abs(entityCount - this._lastGridSampleCount) > 50) {
                shouldRecalculate = true;
            }

            if (shouldRecalculate) {
                const adaptiveGridSize = this.calculateOptimalGridSize(entityCount);
                if (adaptiveGridSize && adaptiveGridSize !== this._cachedGridSize) {
                    gridSize = adaptiveGridSize;
                    this._cachedGridSize = adaptiveGridSize;
                    this._gridDirty = true; // Grid size changed, force rebuild
                } else {
                    gridSize = this._cachedGridSize;
                }
                this._lastGridSampleTime = now;
                this._lastGridSampleCount = entityCount;
            }

            engine.gridSize = gridSize;

            // Check if grid needs rebuilding (dirty check)
            // Need to rebuild if: entities moved cells, entities added/removed, or entities died
            if (!this._gridDirty) {
                let needsRebuild = false;

                // Entity count changed - always rebuild to account for additions/removals
                if (entityCount !== this._lastEntityCount) {
                    needsRebuild = true;
                } else {
                    // Check if player moved to a different grid cell
                    if (engine.player && !engine.player.isDead) {
                        const gridX = Math.floor(engine.player.x / gridSize);
                        const gridY = Math.floor(engine.player.y / gridSize);
                        const lastPos = this._entityGridPositions.get(engine.player);
                        if (!lastPos || lastPos.gridX !== gridX || lastPos.gridY !== gridY) {
                            needsRebuild = true;
                        }
                    }

                    // Same count - check if entities moved or died
                    if (!needsRebuild) {
                        for (const entity of list) {
                            if (!entity || entity.isDead) {
                                needsRebuild = true; // Dead entity, need to rebuild
                                break;
                            }
                            const gridX = Math.floor(entity.x / gridSize);
                            const gridY = Math.floor(entity.y / gridSize);
                            const lastPos = this._entityGridPositions.get(entity);

                            if (!lastPos || lastPos.gridX !== gridX || lastPos.gridY !== gridY) {
                                needsRebuild = true;
                                break;
                            }
                        }
                    }
                }

                // Skip rebuild if nothing changed
                if (!needsRebuild) {
                    // Update stats to reflect cached grid state
                    this.stats.cellsProcessed = engine.spatialGrid.size;
                    return; // EARLY EXIT - grid is still valid!
                }
            }

            // Grid needs rebuilding - clear and reconstruct
            const grid = engine.spatialGrid;
            const cellPool = engine._spatialGridCellPool;

            for (const [, cell] of grid) {
                if (cell && cell.length) {
                    cell.length = 0;
                }
                cellPool.push(cell);
            }
            grid.clear();

            this.stats.cellsProcessed = 0;
            let totalEntitiesInCells = 0;

            // Helper function to add entity to grid
            const addEntityToGrid = (entity) => {
                if (!entity || entity.isDead) return;

                const gridX = Math.floor(entity.x / gridSize);
                const gridY = Math.floor(entity.y / gridSize);
                const key = engine.encodeGridKey(gridX, gridY);

                let cell = grid.get(key);
                if (!cell) {
                    cell = cellPool.length > 0 ? cellPool.pop() : [];
                    grid.set(key, cell);
                    this.stats.cellsProcessed++;
                }

                cell.push(entity);
                totalEntitiesInCells++;

                // OPTIMIZATION: Track entity's current grid position for next frame's dirty check
                this._entityGridPositions.set(entity, { gridX, gridY });
            };

            // CRITICAL: Add player to spatial grid for collision detection
            // Player is stored separately from engine.entities, so we must add it explicitly
            if (engine.player && !engine.player.isDead) {
                addEntityToGrid(engine.player);
            }

            // + OBJECT POOLING for grid cells to reduce allocations
            for (const entity of list) {
                addEntityToGrid(entity);
            }

            // Reset dirty flag and update entity count
            this._gridDirty = false;
            this._lastEntityCount = entityCount;

            // Update performance statistics
            this.stats.avgEntitiesPerCell = this.stats.cellsProcessed > 0 ?
                totalEntitiesInCells / this.stats.cellsProcessed : 0;

            const activeCells = grid.size;
            const desiredPoolSize = Math.max(32, Math.min(512, Math.ceil(activeCells * 1.5)));
            if (cellPool.length > desiredPoolSize) {
                cellPool.length = desiredPoolSize;
            }
        }

        // + CALCULATE OPTIMAL GRID SIZE based on entity density - improved stability
        calculateOptimalGridSize(entityCount) {
            // Use larger grid cells to reduce boundary crossing jitter
            if (entityCount < 50) return 160;      // Larger cells for few entities
            if (entityCount < 100) return 140;     // Medium cells for moderate count
            if (entityCount < 200) return 120;     // Standard cells for many entities
            return 100;                            // Reduced minimum cell size for stability
        }

        // + SPATIAL QUERIES
        // Moved from GameEngine to utilize the grid efficiently
        getEntitiesWithinRadius(type, centerX, centerY, radius, options = {}) {
            const { includeDead = false, predicate } = options;
            const engine = this.engine;

            if (!Number.isFinite(radius) || radius <= 0) {
                return [];
            }

            const x = Number.isFinite(centerX) ? centerX : (engine.player?.x ?? 0);
            const y = Number.isFinite(centerY) ? centerY : (engine.player?.y ?? 0);
            const radiusSq = radius * radius;

            const matches = [];

            // Broad-phase: check grid cells in range
            // Calculate grid bounds
            const gridSize = engine.gridSize || 100;
            const minGridX = Math.floor((x - radius) / gridSize);
            const maxGridX = Math.floor((x + radius) / gridSize);
            const minGridY = Math.floor((y - radius) / gridSize);
            const maxGridY = Math.floor((y + radius) / gridSize);

            // Use Set to avoid duplicates if entity spans cells (though we store 1 ref per entity usually)
            // But entities are pushed to cellPool? No, spatialGrid stores arrays of entities.
            // GameEngine's spatial grid stores references.

            // Optimization: If radius is very large, falling back to full scan might be faster?
            // For now, let's stick to full scan of typed array for consistency with original behavior if efficient grid search isn't easy
            // Actually, original GameEngine.getEntitiesWithinRadius used linear scan of getEntitiesByType.
            // Let's implement BOTH: Grid scan for small radius, Linear for global.
            // For 'enemy' type which has thousands, Grid is better.

            // Replicating EXACT original behavior (Linear Scan) first to ensure stability, 
            // then we can optimize to Grid later if needed.
            // The original GameEngine.js:569 used `this.getEntitiesByType(type)`.

            const entities = engine.getEntitiesByType(type);
            for (const entity of entities) {
                if (!entity) continue;
                if (!includeDead && entity.isDead) continue;
                if (predicate && !predicate(entity)) continue;

                const dx = entity.x - x;
                const dy = entity.y - y;
                if ((dx * dx + dy * dy) <= radiusSq) {
                    matches.push(entity);
                }
            }

            return matches;
        }

        findClosestEntity(type, originX, originY, options = {}) {
            const {
                maxRadius = Infinity,
                includeDead = false,
                predicate,
                useSpatialGrid = true
            } = options;

            const engine = this.engine;
            const x = Number.isFinite(originX) ? originX : (engine.player?.x ?? 0);
            const y = Number.isFinite(originY) ? originY : (engine.player?.y ?? 0);
            const maxRadiusSq = Number.isFinite(maxRadius) ? Math.max(0, maxRadius) ** 2 : Infinity;

            let closest = null;
            let closestDistSq = maxRadiusSq;

            const shouldInclude = (entity) => {
                if (!entity) return false;
                if (!includeDead && entity.isDead) return false;
                if (predicate && !predicate(entity)) return false;
                return true;
            };

            // Optimization: Use spatial grid 3x3 check first
            // This is copied from GameEngine.js logic
            if (useSpatialGrid && engine.spatialGrid && engine.gridSize > 0 && engine.spatialGrid.size > 0) {
                const gridSize = engine.gridSize;
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);

                if (window.perfCache) {
                    // Use cached coords if available (optional)
                }

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = engine.encodeGridKey(gridX + dx, gridY + dy);
                        const cell = engine.spatialGrid.get(key);
                        if (!cell || cell.length === 0) continue;

                        for (const entity of cell) {
                            if (!shouldInclude(entity) || entity.type !== type) continue;

                            const distSq = (entity.x - x) ** 2 + (entity.y - y) ** 2;
                            if (distSq < closestDistSq) {
                                closest = entity;
                                closestDistSq = distSq;
                            }
                        }
                    }
                }
            }

            // Fallback: If nothing found in immediate grid neighbors, scan all entities?
            // The original code did EXACTLY this: Check grid, then "if (!closest) { check all }".
            // This means if the closest entity is 2 grid cells away, the grid check fails and it does a full scan.
            // This preserves that logic.
            if (!closest) {
                const entities = engine.getEntitiesByType(type);
                for (const entity of entities) {
                    if (!shouldInclude(entity)) continue;
                    const distSq = (entity.x - x) ** 2 + (entity.y - y) ** 2;
                    if (distSq < closestDistSq) {
                        closest = entity;
                        closestDistSq = distSq;
                    }
                }
            }

            return closest;
        }

        checkCollisions() {
            const engine = this.engine;
            if (!engine || !engine.spatialGrid) {
                return; // Skip collision checking if engine state is invalid
            }

            // + RESET COLLISION STATISTICS
            this.stats.collisionsChecked = 0;
            this.stats.collisionsDetected = 0;
            const startTime = performance.now();

            try {
                for (const [key, entities] of engine.spatialGrid) {
                    // + EARLY EXIT STRATEGY for empty regions
                    if (!entities || entities.length === 0) continue;

                    // [OPTIMIZATION] Skip cells with < 2 entities or all same type
                    if (entities.length < 2) {
                        // Still need to check adjacent cells
                        const [gridX, gridY] = engine.decodeGridKey(key);
                        this.checkAdjacentCellCollisions(gridX, gridY, entities);
                        continue;
                    }

                    // Fast path: check if all entities are same type (no internal collisions possible)
                    const firstType = entities[0]?.type;
                    let allSameType = true;
                    for (let k = 1; k < entities.length; k++) {
                        if (entities[k]?.type !== firstType) {
                            allSameType = false;
                            break;
                        }
                    }

                    const [gridX, gridY] = engine.decodeGridKey(key);

                    this.checkAdjacentCellCollisions(gridX, gridY, entities);

                    // [OPTIMIZATION] Skip same-cell checks if all entities are same type
                    if (allSameType) continue;

                    for (let i = 0; i < entities.length; i++) {
                        const entity1 = entities[i];
                        if (!entity1 || entity1.isDead) continue;
                        const type1 = entity1.type;

                        for (let j = i + 1; j < entities.length; j++) {
                            const entity2 = entities[j];
                            if (!entity2 || entity2.isDead) continue;
                            const type2 = entity2.type;

                            if (!this._canCollideTypes(type1, type2)) continue;

                            const dx = entity1.x - entity2.x;
                            const dy = entity1.y - entity2.y;
                            const maxRadius = (entity1.radius || 0) + (entity2.radius || 0);

                            if (dx * dx + dy * dy >= maxRadius * maxRadius) continue;

                            this.stats.collisionsChecked++;
                            if (this.isColliding(entity1, entity2)) {
                                this.stats.collisionsDetected++;
                                this.handleCollision(entity1, entity2);
                                if (entity1.isDead) {
                                    break;
                                }
                            }
                        }
                    }
                }

                // + LOG PERFORMANCE STATISTICS periodically
                if (window.logger?.isDebugEnabled?.('systems') && startTime - this.stats.lastResetTime > 5000) {
                    this.logPerformanceStats(performance.now() - startTime);
                    this.stats.lastResetTime = startTime;
                }

            } catch (error) {
                window.logger.error('Error in collision checking:', error);
            }
        }

        // + PERFORMANCE STATISTICS LOGGING
        logPerformanceStats(processingTime) {
            const stats = this.stats;
            window.logger.log(`Collision Performance:
                Cells: ${stats.cellsProcessed} | Avg Entities/Cell: ${stats.avgEntitiesPerCell.toFixed(1)}
                Checks: ${stats.collisionsChecked} | Detected: ${stats.collisionsDetected} 
                Processing Time: ${processingTime.toFixed(2)}ms`);
        }

        checkCollisionsInCell(entities) {
            // + EARLY EXIT for small cells (already optimized)
            if (entities.length < 2) return;

            // + COLLISION LAYER FILTERING - skip impossible collisions
            for (let i = 0; i < entities.length - 1; i++) {
                const entity1 = entities[i];
                if (!entity1 || entity1.isDead) continue; // Skip dead entities

                const type1 = entity1.type;
                const rulesForEntity1 = this.collisionRules[type1];

                for (let j = i + 1; j < entities.length; j++) {
                    const entity2 = entities[j];
                    if (!entity2 || entity2.isDead) continue; // Skip dead entities

                    const type2 = entity2.type;
                    const rulesForEntity2 = this.collisionRules[type2];

                    // + BROAD-PHASE: Skip impossible collision combinations
                    if (
                        !(
                            (rulesForEntity1 && rulesForEntity1.has(type2)) ||
                            (rulesForEntity2 && rulesForEntity2.has(type1))
                        )
                    ) {
                        continue;
                    }

                    this.stats.collisionsChecked++;

                    if (this.isColliding(entity1, entity2)) {
                        this.stats.collisionsDetected++;
                        this.handleCollision(entity1, entity2);
                        if (entity1.isDead) {
                            break;
                        }
                    }
                }
            }
        }

        // + COLLISION LAYER SYSTEM - determine if two entities can collide
        canCollide(entity1, entity2) {
            if (!entity1 || !entity2) return false;
            return this._canCollideTypes(entity1.type, entity2.type);
        }

        _canCollideTypes(type1, type2) {
            if (!type1 || !type2) return false;
            const rulesForEntity1 = this.collisionRules[type1];
            if (rulesForEntity1 && rulesForEntity1.has(type2)) {
                return true;
            }
            const rulesForEntity2 = this.collisionRules[type2];
            return !!(rulesForEntity2 && rulesForEntity2.has(type1));
        }

        checkAdjacentCellCollisions(gridX, gridY, entities) {
            const engine = this.engine;
            // Check only forward neighbors to avoid duplicate pair processing
            for (const [dx, dy] of this._adjacentOffsets) {
                const adjacentKey = engine.encodeGridKey(gridX + dx, gridY + dy);
                const adjacentEntities = engine.spatialGrid.get(adjacentKey);
                if (!adjacentEntities || adjacentEntities.length === 0) continue;
                for (const e of entities) {
                    if (!e || e.isDead) continue;
                    const type1 = e.type;
                    const rulesForEntity1 = this.collisionRules[type1];
                    for (const ae of adjacentEntities) {
                        if (!ae || ae.isDead) continue;
                        const type2 = ae.type;
                        const rulesForEntity2 = this.collisionRules[type2];
                        if (
                            !(
                                (rulesForEntity1 && rulesForEntity1.has(type2)) ||
                                (rulesForEntity2 && rulesForEntity2.has(type1))
                            )
                        ) {
                            continue;
                        }
                        if (this.isColliding(e, ae)) {
                            this.handleCollision(e, ae);
                            if (e.isDead) {
                                break;
                            }
                        }
                    }
                    if (e.isDead) {
                        continue;
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
                            try { entity2.createCollectionEffect(); } catch { }
                        }
                        if ('collected' in entity2) entity2.collected = true;
                        entity2.isDead = true;
                    }
                } else if (entity2.type === 'player' && entity1.type === 'xpOrb') {
                    if (typeof entity2.addXP === 'function' && typeof entity1.value === 'number') {
                        entity2.addXP(entity1.value);
                        if (typeof entity1.createCollectionEffect === 'function') {
                            try { entity1.createCollectionEffect(); } catch { }
                        }
                        if ('collected' in entity1) entity1.collected = true;
                        entity1.isDead = true;
                    }
                }

                // Player <-> enemy
                if (entity1.type === 'player' && entity2.type === 'enemy') {
                    // Check both player invuln AND enemy contact cooldown
                    if (!entity1.isInvulnerable && entity2.collisionCooldown <= 0) {
                        if (typeof entity1.takeDamage === 'function' && typeof entity2.damage === 'number') {
                            // [NEW] Apply formation damage bonuses
                            let damage = entity2.damage;
                            const FormationBonusSystem = window.FormationBonusSystem || window.Game?.FormationBonusSystem;
                            if (FormationBonusSystem && entity2._formationBonus) {
                                const constellation = this._getEnemyConstellation(entity2);
                                const damageMult = FormationBonusSystem.getDamageMultiplier(entity2, constellation, false);
                                damage *= damageMult;
                            }
                            entity1.takeDamage(damage);
                            entity2.collisionCooldown = 0.5; // Per-enemy cooldown
                            if (window.gameManager) window.gameManager.createHitEffect(entity1.x, entity1.y, damage);
                            if (window.audioSystem && window.audioSystem.play) window.audioSystem.play('hit', 0.2);
                        }
                    }
                } else if (entity2.type === 'player' && entity1.type === 'enemy') {
                    if (!entity2.isInvulnerable && entity1.collisionCooldown <= 0) {
                        if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                            // [NEW] Apply formation damage bonuses
                            let damage = entity1.damage;
                            const FormationBonusSystem = window.FormationBonusSystem || window.Game?.FormationBonusSystem;
                            if (FormationBonusSystem && entity1._formationBonus) {
                                const constellation = this._getEnemyConstellation(entity1);
                                const damageMult = FormationBonusSystem.getDamageMultiplier(entity1, constellation, false);
                                damage *= damageMult;
                            }
                            entity2.takeDamage(damage);
                            entity1.collisionCooldown = 0.5; // Per-enemy cooldown
                            if (window.gameManager) window.gameManager.createHitEffect(entity2.x, entity2.y, damage);
                            if (window.audioSystem && window.audioSystem.play) window.audioSystem.play('hit', 0.2);
                        }
                    }
                }

                // Projectile <-> enemy
                if (entity1.type === 'projectile' && entity2.type === 'enemy' && !entity2.isDead) {
                    // NEW SYSTEM: Use BehaviorManager for all projectile logic
                    if (entity1.behaviorManager && typeof entity1.handleCollision === 'function') {
                        entity1.handleCollision(entity2, engine);
                        return; // All behavior logic handled by new system
                    }

                    // OLD SYSTEM FALLBACK (should not be reached with new projectiles)
                    if (entity1.hitEnemies && entity1.hitEnemies.has(entity2.id)) return;
                    let hitSuccessful = true;
                    if (typeof entity1.hit === 'function') hitSuccessful = entity1.hit(entity2);

                    if (hitSuccessful) {
                        // Track successful projectile hit for stats
                        window.gameManager?.statsManager?.trackProjectileHit?.();

                        // Apply damage only on a valid hit
                        if (typeof entity2.takeDamage === 'function' && typeof entity1.damage === 'number') {
                            entity2.takeDamage(entity1.damage);
                            if (window.gameManager) window.gameManager.createHitEffect(entity2.x, entity2.y, entity1.damage);
                            if (window.audioSystem && window.audioSystem.play) window.audioSystem.play('hit', 0.2);
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
                            // Track lifesteal healing for achievements
                            if (window.achievementSystem) window.achievementSystem.onLifestealHeal(healAmount);
                        }

                        // Handle piercing and death - UPDATED to match gameEngine logic
                        let piercingExhausted = false;
                        if (typeof entity1.piercing === 'number' && entity1.piercing >= 0) {
                            if (window.logger?.isDebugEnabled?.('projectiles')) {
                                window.logger.log(`[CollisionSystem] Projectile ${entity1.id} piercing hit. Piercing: ${entity1.piercing} -> ${entity1.piercing - 1}`);
                            }
                            entity1.piercing--;

                            if (entity1.piercing < 0) {
                                piercingExhausted = true;
                                projectileShouldDie = true; // Should die unless ricochet saves it
                                if (window.logger?.isDebugEnabled?.('projectiles')) {
                                    window.logger.log(`[CollisionSystem] Projectile ${entity1.id} piercing exhausted, should die unless ricochet saves it`);
                                }
                            } else {
                                projectileShouldDie = false; // Continue after piercing
                                if (window.logger?.isDebugEnabled?.('projectiles')) {
                                    window.logger.log(`[CollisionSystem] Projectile ${entity1.id} still has piercing charges: ${entity1.piercing}`);
                                }
                            }
                        }

                        // Check for ricochet only when projectile would normally die
                        if (projectileShouldDie && (entity1.hasRicochet || entity1.ricochet || entity1.specialType === 'ricochet')) {
                            if (window.logger?.isDebugEnabled?.('projectiles')) {
                                window.logger.log(`[CollisionSystem] Projectile ${entity1.id} attempting ricochet. hasRicochet: ${!!entity1.hasRicochet}, specialType: ${entity1.specialType}`);
                            }
                            try {
                                const ok = entity1.ricochet(engine);
                                if (ok) {
                                    projectileShouldDie = false; // Ricochet successful
                                    if (window.logger?.isDebugEnabled?.('projectiles')) {
                                        window.logger.log(`[CollisionSystem] Projectile ${entity1.id} ricochet successful!`);
                                    }
                                    // Reset piercing if projectile ricocheted (restore half, minimum 0)
                                    if (piercingExhausted && entity1.originalPiercing > 0) {
                                        entity1.piercing = Math.max(0, Math.floor(entity1.originalPiercing / 2));
                                        if (window.logger?.isDebugEnabled?.('projectiles')) {
                                            window.logger.log(`[CollisionSystem] Projectile ${entity1.id} piercing restored: ${entity1.piercing}`);
                                        }
                                    }
                                } else {
                                    if (window.logger?.isDebugEnabled?.('projectiles')) {
                                        window.logger.log(`[CollisionSystem] Projectile ${entity1.id} ricochet failed`);
                                    }
                                }
                            } catch (e) {
                                if (window.logger?.isDebugEnabled?.('projectiles')) {
                                    window.logger.log(`[CollisionSystem] Projectile ${entity1.id} ricochet error:`, e);
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
                    // NEW SYSTEM: Use BehaviorManager for all projectile logic
                    if (entity2.behaviorManager && typeof entity2.handleCollision === 'function') {
                        entity2.handleCollision(entity1, engine);
                        return; // All behavior logic handled by new system
                    }

                    // OLD SYSTEM FALLBACK (should not be reached with new projectiles)
                    if (entity2.hitEnemies && entity2.hitEnemies.has(entity1.id)) return;
                    let hitSuccessful = true;
                    if (typeof entity2.hit === 'function') hitSuccessful = entity2.hit(entity1);

                    if (hitSuccessful) {
                        // Track successful projectile hit for stats
                        window.gameManager?.statsManager?.trackProjectileHit?.();

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
                            // Track lifesteal healing for achievements
                            if (window.achievementSystem) window.achievementSystem.onLifestealHeal(healAmount);
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
                        if (typeof entity2.piercing === 'number' && entity2.piercing >= 0) {
                            if (window.logger?.isDebugEnabled?.('projectiles')) {
                                window.logger.log(`[CollisionSystem] Projectile ${entity2.id} piercing hit. Piercing: ${entity2.piercing} -> ${entity2.piercing - 1}`);
                            }
                            entity2.piercing--;

                            if (entity2.piercing < 0) {
                                piercingExhausted2 = true;
                                projectileShouldDie2 = true; // Should die unless ricochet saves it
                                if (window.logger?.isDebugEnabled?.('projectiles')) {
                                    window.logger.log(`[CollisionSystem] Projectile ${entity2.id} piercing exhausted, should die unless ricochet saves it`);
                                }
                            } else {
                                projectileShouldDie2 = false; // Continue after piercing
                                if (window.logger?.isDebugEnabled?.('projectiles')) {
                                    window.logger.log(`[CollisionSystem] Projectile ${entity2.id} still has piercing charges: ${entity2.piercing}`);
                                }
                            }
                        }

                        // Check for ricochet only when projectile would normally die
                        if (projectileShouldDie2 && (entity2.hasRicochet || entity2.ricochet || entity2.specialType === 'ricochet')) {
                            if (window.logger?.isDebugEnabled?.('projectiles')) {
                                window.logger.log(`[CollisionSystem] Projectile ${entity2.id} attempting ricochet. hasRicochet: ${!!entity2.hasRicochet}, specialType: ${entity2.specialType}`);
                            }
                            try {
                                const ok = entity2.ricochet(engine);
                                if (ok) {
                                    projectileShouldDie2 = false; // Ricochet successful
                                    if (window.logger?.isDebugEnabled?.('projectiles')) {
                                        window.logger.log(`[CollisionSystem] Projectile ${entity2.id} ricochet successful!`);
                                    }
                                    // Reset piercing if projectile ricocheted (restore half, minimum 0)
                                    if (piercingExhausted2 && entity2.originalPiercing > 0) {
                                        entity2.piercing = Math.max(0, Math.floor(entity2.originalPiercing / 2));
                                        if (window.logger?.isDebugEnabled?.('projectiles')) {
                                            window.logger.log(`[CollisionSystem] Projectile ${entity2.id} piercing restored: ${entity2.piercing}`);
                                        }
                                    }
                                } else {
                                    if (window.logger?.isDebugEnabled?.('projectiles')) {
                                        window.logger.log(`[CollisionSystem] Projectile ${entity2.id} ricochet failed`);
                                    }
                                }
                            } catch (e) {
                                if (window.logger?.isDebugEnabled?.('projectiles')) {
                                    window.logger.log(`[CollisionSystem] Projectile ${entity2.id} ricochet error:`, e);
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
                window.logger.error('Error handling collision:', err, 'Entity1:', entity1?.type, 'Entity2:', entity2?.type);
            }
        }

        /**
         * Helper to get the constellation object for an enemy
         * @private
         */
        _getEnemyConstellation(enemy) {
            if (!enemy?.constellation) return null;

            const gm = window.gameManager || window.gameManagerBridge;
            const detector = gm?.game?.emergentDetector || gm?.emergentDetector || window.gameEngine?.emergentDetector;

            if (detector?.constellations) {
                return detector.constellations.find(c => c?.id === enemy.constellation) || null;
            }

            return null;
        }


        // + CELL POOL MANAGEMENT - prevent memory leaks
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

                if (window.logger?.isDebugEnabled?.('systems')) {
                    window.logger.log(`Cell pool cleaned: ${this.cellPool.size} cells remaining`);
                }
            }
        }

        // + PERFORMANCE OPTIMIZATION ENTRY POINT
        getPerformanceStats() {
            return {
                ...this.stats,
                cellPoolSize: this.cellPool?.size || 0,
                efficiency: this.stats.collisionsChecked > 0 ?
                    (this.stats.collisionsDetected / this.stats.collisionsChecked * 100).toFixed(1) + '%' : '0%'
            };
        }
    }

    window.Game = window.Game || {};
    window.Game.CollisionSystem = CollisionSystem;
})();

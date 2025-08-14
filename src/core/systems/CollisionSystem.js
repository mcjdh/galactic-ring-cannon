// CollisionSystem: handles spatial grid updates and collision processing
// Depends on engine entities and classes already present globally
// TODO: Implement quadtree for more efficient spatial partitioning
// FIX: Current grid system creates many small cells - could be optimized
// TODO: Add broad-phase collision detection before narrow-phase
(function () {
    class CollisionSystem {
        constructor(engine) {
            this.engine = engine;
            // TODO: Add collision statistics for performance monitoring
            // TODO: Implement collision layers for better filtering
        }

        updateSpatialGrid() {
            const engine = this.engine;
            if (!engine.spatialGrid) engine.spatialGrid = new Map();
            engine.spatialGrid.clear();
            
            // TODO: Make grid size adaptive based on entity density
            const gridSize = engine.gridSize || 100;
            const list = engine.entities || [];
            
            // TODO: Use object pooling for grid cells to reduce allocations
            for (const entity of list) {
                if (!entity) continue;
                const gridX = Math.floor(entity.x / gridSize);
                const gridY = Math.floor(entity.y / gridSize);
                const key = `${gridX},${gridY}`;
                if (!engine.spatialGrid.has(key)) engine.spatialGrid.set(key, []);
                engine.spatialGrid.get(key).push(entity);
            }
        }

        checkCollisions() {
            const engine = this.engine;
            // TODO: Implement early exit strategies for empty regions
            // FIX: Currently checks all combinations - could skip impossible collisions
            for (const [key, entities] of engine.spatialGrid) {
                this.checkCollisionsInCell(entities);
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
    }

    window.CollisionSystem = CollisionSystem;
})();

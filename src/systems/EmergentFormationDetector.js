/**
 * Emergent Formation Detector
 * 
 * Detects when enemies naturally cluster together during gameplay and organizes
 * them into geometric constellations. Unlike FormationManager which spawns enemies
 * in formations, this creates dynamic geometric patterns from existing enemies.
 * 
 * Key Concept: When 3+ enemies are near each other without being in a managed formation,
 * they can "snap" into a geometric constellation pattern for visual cohesion.
 */

class EmergentFormationDetector {
    constructor(game) {
        this.game = game;

        // Detection parameters
        this.detectionRadius = 120; // Enemies within this radius can form constellations
        this.minEnemiesForConstellation = 2; // BUFFED: Was 3 - Allow smaller clusters
        this.maxConstellations = 8; // BUFFED: Was 5 - More simultaneous constellations
        this.detectionInterval = 0.5; // Check every 0.5 seconds
        this.detectionTimer = 0;

        // Active constellations (emergent patterns)
        this.constellations = [];

        // Constellation pattern templates (similar to formations but for emergent clustering)
        this.patterns = {
            PAIR: {
                minEnemies: 2,
                maxEnemies: 2,
                strength: 0.18, // Strong pull for pairs
                getTargetPositions: (centerX, centerY, enemies) => {
                    const separation = 40; // Distance between pair
                    return [
                        { x: centerX - separation / 2, y: centerY },
                        { x: centerX + separation / 2, y: centerY }
                    ];
                }
            },
            TRIANGLE: {
                minEnemies: 3,
                maxEnemies: 3,
                strength: 0.15, // How strongly to pull enemies into pattern
                getTargetPositions: (centerX, centerY, enemies) => {
                    const radius = 50;
                    return [
                        { x: centerX, y: centerY - radius },
                        { x: centerX - radius * 0.866, y: centerY + radius * 0.5 },
                        { x: centerX + radius * 0.866, y: centerY + radius * 0.5 }
                    ];
                }
            },
            DIAMOND: {
                minEnemies: 4,
                maxEnemies: 4,
                strength: 0.12,
                getTargetPositions: (centerX, centerY, enemies) => {
                    const radius = 55;
                    return [
                        { x: centerX, y: centerY - radius },
                        { x: centerX + radius, y: centerY },
                        { x: centerX, y: centerY + radius },
                        { x: centerX - radius, y: centerY }
                    ];
                }
            },
            PENTAGON: {
                minEnemies: 5,
                maxEnemies: 5,
                strength: 0.1,
                getTargetPositions: (centerX, centerY, enemies) => {
                    const radius = 60;
                    const positions = [];
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
                        positions.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius
                        });
                    }
                    return positions;
                }
            },
            HEXAGON: {
                minEnemies: 6,
                maxEnemies: 6,
                strength: 0.08,
                getTargetPositions: (centerX, centerY, enemies) => {
                    const radius = 65;
                    const positions = [];
                    for (let i = 0; i < 6; i++) {
                        const angle = i * Math.PI / 3;
                        positions.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius
                        });
                    }
                    return positions;
                }
            },
            CIRCLE: {
                minEnemies: 7,
                maxEnemies: 12,
                strength: 0.06,
                getTargetPositions: (centerX, centerY, enemies) => {
                    const count = enemies.length;
                    const radius = 40 + count * 5; // Dynamic radius based on count
                    const positions = [];
                    for (let i = 0; i < count; i++) {
                        const angle = (i * Math.PI * 2 / count);
                        positions.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius
                        });
                    }
                    return positions;
                }
            }
        };

        this.enabled = true;
        
        // DIAGNOSTIC: Expose to window for debugging
        window.emergentDetector = this;
        
        if (!this.game) {
            window.logger?.error('CRITICAL: EmergentFormationDetector initialized without game instance!');
        } else {
            window.logger?.log(`EmergentFormationDetector initialized with game instance. Enemies array exists: ${!!this.game.enemies}`);
        }
    }

    /**
     * Update emergent constellation detection and application
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // DIAGNOSTIC: Check if game reference was lost or empty
        if (!this.game) {
             if (Math.random() < 0.01) window.logger?.error('EmergentFormationDetector lost game reference!');
             return;
        }

        this.detectionTimer += deltaTime;

        // Periodic detection to avoid performance overhead
        if (this.detectionTimer >= this.detectionInterval) {
            this.detectionTimer = 0;
            this.detectAndUpdateConstellations();
        }

        // Apply constellation forces to enemies (every frame)
        this.applyConstellationForces(deltaTime);

        // Clean up broken constellations
        this.cleanupConstellations();
    }

    /**
     * Detect enemy clusters and form constellations
     */
    detectAndUpdateConstellations() {
        const enemies = this.game?.enemies || [];

        // DEBUG LOG
        if (Math.random() < 0.05) { // Log occasionally
            window.logger?.log(`[Emergent] Update tick. Enemies: ${enemies.length}. Timer: ${this.detectionTimer.toFixed(2)}/${this.detectionInterval}`);
        }

        if (enemies.length < this.minEnemiesForConstellation) return;

        // Get enemies that aren't already in managed formations or constellations
        const freeEnemies = enemies.filter(e =>
            !e.isDead &&
            !e.isBoss &&
            !e.formationId && // FIXED: Was checking .formation, should be .formationId
            !this.isInConstellation(e) // Not already in an emergent constellation
        );

        // DEBUG LOG
        if (freeEnemies.length > 0 && Math.random() < 0.05) {
            window.logger?.log(`[Emergent] ${freeEnemies.length} free enemies available for clustering`);
        }

        if (freeEnemies.length < this.minEnemiesForConstellation) return;

        // Find clusters using spatial hashing for performance
        const clusters = this.findClusters(freeEnemies);

        // DEBUG LOG
        if (clusters.length > 0) {
            window.logger?.log(`[Emergent] Found ${clusters.length} clusters to organize`);
        }

        // Form constellations from clusters
        for (const cluster of clusters) {
            if (this.constellations.length >= this.maxConstellations) break;

            const pattern = this.selectPattern(cluster.length);
            if (pattern) {
                this.createConstellation(cluster, pattern);
            }
        }
    }

    /**
     * Find clusters of nearby enemies using spatial proximity
     */
    findClusters(enemies) {
        const clusters = [];
        const used = new Set();
        const radiusSq = this.detectionRadius * this.detectionRadius;

        for (let i = 0; i < enemies.length; i++) {
            if (used.has(enemies[i].id)) continue;

            const cluster = [enemies[i]];
            used.add(enemies[i].id);

            // Find all enemies near this one
            for (let j = i + 1; j < enemies.length; j++) {
                if (used.has(enemies[j].id)) continue;

                // Check distance to any enemy in current cluster
                for (const clusterEnemy of cluster) {
                    const dx = enemies[j].x - clusterEnemy.x;
                    const dy = enemies[j].y - clusterEnemy.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < radiusSq) {
                        cluster.push(enemies[j]);
                        used.add(enemies[j].id);
                        break;
                    }
                }
            }

            // Only consider clusters with enough enemies
            if (cluster.length >= this.minEnemiesForConstellation) {
                clusters.push(cluster);
            }
        }

        return clusters;
    }

    /**
     * Select best pattern for a cluster size
     */
    selectPattern(count) {
        // Find exact match first
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count <= pattern.maxEnemies) {
                return { name, ...pattern };
            }
        }
        return null;
    }

    /**
     * Create a constellation from a cluster
     */
    createConstellation(enemies, pattern) {
        // Calculate cluster center
        let centerX = 0, centerY = 0;
        for (const enemy of enemies) {
            centerX += enemy.x;
            centerY += enemy.y;
        }
        centerX /= enemies.length;
        centerY /= enemies.length;

        // Trim to exact pattern size if needed
        const targetEnemies = enemies.slice(0, pattern.maxEnemies);

        const constellation = {
            id: `constellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            enemies: targetEnemies,
            pattern,
            centerX,
            centerY,
            createdAt: Date.now(),
            age: 0
        };

        // Mark enemies as part of this constellation
        for (const enemy of targetEnemies) {
            enemy.constellation = constellation.id;
        }

        this.constellations.push(constellation);

        // ALWAYS LOG constellation creation for visibility
        window.logger?.log(`✨ [Emergent] Created ${pattern.name} constellation with ${targetEnemies.length} enemies at (${Math.round(centerX)}, ${Math.round(centerY)})`);
    }

    /**
     * Apply subtle forces to pull enemies into constellation patterns
     */
    applyConstellationForces(deltaTime) {
        for (const constellation of this.constellations) {
            constellation.age += deltaTime;

            // Update center position (slowly follow enemies)
            let centerX = 0, centerY = 0;
            for (const enemy of constellation.enemies) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= constellation.enemies.length;
            centerY /= constellation.enemies.length;

            // Smooth center movement
            constellation.centerX += (centerX - constellation.centerX) * 0.1;
            constellation.centerY += (centerY - constellation.centerY) * 0.1;

            // Get target positions for this constellation
            const targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies
            );

            // Apply subtle forces to each enemy
            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                const target = targetPositions[i];

                if (!enemy || enemy.isDead || !target) continue;

                // Calculate force toward target position
                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 5) { // Only apply if not already at target
                    // Gentle nudge - doesn't override enemy AI, just suggests position
                    const strength = constellation.pattern.strength;
                    
                    // Use velocity if available for smoother physics integration
                    if (enemy.movement && enemy.movement.velocity) {
                        // Apply force to velocity
                        const force = strength * 300; // Scale up for velocity
                        enemy.movement.velocity.x += (dx / dist) * force * deltaTime;
                        enemy.movement.velocity.y += (dy / dist) * force * deltaTime;
                    } else {
                        // Fallback to direct position modification
                        enemy.x += (dx / dist) * strength * deltaTime * 60;
                        enemy.y += (dy / dist) * strength * deltaTime * 60;
                    }
                }
            }

            // Apply separation to prevent stacking
            this.applySeparation(constellation, deltaTime);
        }
    }

    /**
     * Apply separation force to enemies in a constellation
     */
    applySeparation(constellation, deltaTime) {
        const separationRadius = 30; // Slightly larger for organic clusters
        const separationForce = 120; // Gentle push

        for (let i = 0; i < constellation.enemies.length; i++) {
            const e1 = constellation.enemies[i];
            if (!e1 || e1.isDead) continue;

            for (let j = i + 1; j < constellation.enemies.length; j++) {
                const e2 = constellation.enemies[j];
                if (!e2 || e2.isDead) continue;

                const dx = e1.x - e2.x;
                const dy = e1.y - e2.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < separationRadius * separationRadius && distSq > 0.1) {
                    const dist = Math.sqrt(distSq);
                    const overlap = separationRadius - dist;
                    
                    // Push apart
                    const pushX = (dx / dist) * overlap * separationForce * deltaTime;
                    const pushY = (dy / dist) * overlap * separationForce * deltaTime;

                    // Use velocity if available
                    if (e1.movement && e1.movement.velocity) {
                        e1.movement.velocity.x += pushX;
                        e1.movement.velocity.y += pushY;
                    } else {
                        e1.x += pushX;
                        e1.y += pushY;
                    }
                    
                    if (e2.movement && e2.movement.velocity) {
                        e2.movement.velocity.x -= pushX;
                        e2.movement.velocity.y -= pushY;
                    } else {
                        e2.x -= pushX;
                        e2.y -= pushY;
                    }
                }
            }
        }
    }

    /**
     * Remove constellations that have broken apart
     */
    cleanupConstellations() {
        this.constellations = this.constellations.filter(constellation => {
            // Remove if too many enemies died
            const aliveCount = constellation.enemies.filter(e => !e.isDead).length;
            if (aliveCount < constellation.pattern.minEnemies) {
                // Unmark enemies
                for (const enemy of constellation.enemies) {
                    if (enemy) delete enemy.constellation;
                }
                return false;
            }

            // Remove if too old (30 seconds max to avoid stale constellations)
            if (constellation.age > 30) {
                for (const enemy of constellation.enemies) {
                    if (enemy) delete enemy.constellation;
                }
                return false;
            }

            // Remove if enemies have spread too far apart
            const maxSpreadSq = (this.detectionRadius * 1.5) ** 2;
            for (let i = 0; i < constellation.enemies.length; i++) {
                for (let j = i + 1; j < constellation.enemies.length; j++) {
                    const e1 = constellation.enemies[i];
                    const e2 = constellation.enemies[j];
                    if (!e1 || !e2) continue;

                    const dx = e1.x - e2.x;
                    const dy = e1.y - e2.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq > maxSpreadSq) {
                        // Constellation broken
                        for (const enemy of constellation.enemies) {
                            if (enemy) delete enemy.constellation;
                        }
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Check if enemy is already in a constellation
     */
    isInConstellation(enemy) {
        return !!enemy.constellation;
    }

    /**
     * Render constellation visualizations
     * Always shows subtle visual feedback so players can see constellations forming
     */
    render(ctx) {
        // Always render, but make it subtle if not in debug mode
        const isDebugMode = window.debugManager?.debugMode || false;

        ctx.save();

        for (const constellation of this.constellations) {
            const targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies
            );

            // In debug mode, show full wireframe
            if (isDebugMode) {
                // Draw constellation outline
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);

                // Draw polygon connecting target positions
                if (targetPositions.length > 2) {
                    ctx.beginPath();
                    ctx.moveTo(targetPositions[0].x, targetPositions[0].y);
                    for (let i = 1; i < targetPositions.length; i++) {
                        ctx.lineTo(targetPositions[i].x, targetPositions[i].y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }

            // ALWAYS show subtle constellation center marker (even without debug)
            ctx.fillStyle = isDebugMode ? 'rgba(100, 200, 255, 0.5)' : 'rgba(0, 255, 153, 0.15)';
            ctx.strokeStyle = isDebugMode ? 'rgba(100, 200, 255, 0.7)' : 'rgba(0, 255, 153, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);

            // Draw geometric icon based on pattern type
            const size = isDebugMode ? 12 : 8;
            ctx.beginPath();

            if (constellation.pattern.name === 'PAIR') {
                // Two small dots
                ctx.arc(constellation.centerX - 8, constellation.centerY, 2, 0, Math.PI * 2);
                ctx.arc(constellation.centerX + 8, constellation.centerY, 2, 0, Math.PI * 2);
            } else if (constellation.pattern.name === 'TRIANGLE') {
                // Triangle
                ctx.moveTo(constellation.centerX, constellation.centerY - size);
                ctx.lineTo(constellation.centerX - size * 0.866, constellation.centerY + size * 0.5);
                ctx.lineTo(constellation.centerX + size * 0.866, constellation.centerY + size * 0.5);
                ctx.closePath();
            } else if (constellation.pattern.name === 'DIAMOND') {
                // Diamond
                ctx.moveTo(constellation.centerX, constellation.centerY - size);
                ctx.lineTo(constellation.centerX + size, constellation.centerY);
                ctx.lineTo(constellation.centerX, constellation.centerY + size);
                ctx.lineTo(constellation.centerX - size, constellation.centerY);
                ctx.closePath();
            } else {
                // Circle for pentagon, hexagon, circle patterns
                ctx.arc(constellation.centerX, constellation.centerY, size, 0, Math.PI * 2);
            }

            ctx.fill();
            ctx.stroke();

            // In debug mode, draw lines from enemies to their target positions
            if (isDebugMode) {
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
                ctx.setLineDash([2, 2]);
                for (let i = 0; i < constellation.enemies.length; i++) {
                    const enemy = constellation.enemies[i];
                    const target = targetPositions[i];
                    if (!enemy || !target) continue;

                    ctx.beginPath();
                    ctx.moveTo(enemy.x, enemy.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }

    /**
     * Get debug stats
     */
    getDebugStats() {
        return {
            activeConstellations: this.constellations.length,
            totalEnemies: this.constellations.reduce((sum, c) => sum + c.enemies.length, 0),
            patterns: this.constellations.map(c => c.pattern.name).join(', ')
        };
    }

    /**
     * Reset all constellations
     */
    reset() {
        // Unmark all enemies
        for (const constellation of this.constellations) {
            for (const enemy of constellation.enemies) {
                if (enemy) delete enemy.constellation;
            }
        }

        this.constellations = [];
        this.detectionTimer = 0;
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.EmergentFormationDetector = EmergentFormationDetector;
    window.logger?.log('EmergentFormationDetector class loaded');
}

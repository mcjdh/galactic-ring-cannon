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

        // Visual effects system
        this.effects = null; // Will be initialized when FormationEffects is available

        // Constellation pattern templates (similar to formations but for emergent clustering)
        this.patterns = {
            PAIR: {
                minEnemies: 2,
                maxEnemies: 2,
                strength: 0.18,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const separation = 40;
                    const dx = Math.cos(rotation) * separation / 2;
                    const dy = Math.sin(rotation) * separation / 2;
                    return [
                        { x: centerX - dx, y: centerY - dy },
                        { x: centerX + dx, y: centerY + dy }
                    ];
                }
            },
            ARROW: {
                minEnemies: 3,
                maxEnemies: 3,
                strength: 0.2,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const size = 35;
                    // Tip at rotation angle
                    const tipX = centerX + Math.cos(rotation) * size;
                    const tipY = centerY + Math.sin(rotation) * size;

                    const backAngle1 = rotation + Math.PI * 0.8;
                    const backAngle2 = rotation - Math.PI * 0.8;

                    return [
                        { x: tipX, y: tipY },
                        { x: centerX + Math.cos(backAngle1) * size, y: centerY + Math.sin(backAngle1) * size },
                        { x: centerX + Math.cos(backAngle2) * size, y: centerY + Math.sin(backAngle2) * size }
                    ];
                }
            },
            TRIANGLE: {
                minEnemies: 3,
                maxEnemies: 3,
                strength: 0.15,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 50;
                    const positions = [];
                    for (let i = 0; i < 3; i++) {
                        const angle = rotation + (i * Math.PI * 2 / 3) - Math.PI / 2;
                        positions.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius
                        });
                    }
                    return positions;
                }
            },
            DIAMOND: {
                minEnemies: 4,
                maxEnemies: 4,
                strength: 0.12,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 55;
                    const positions = [];
                    for (let i = 0; i < 4; i++) {
                        const angle = rotation + (i * Math.PI * 2 / 4) - Math.PI / 2;
                        positions.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius
                        });
                    }
                    return positions;
                }
            },
            CROSS: {
                minEnemies: 5,
                maxEnemies: 5,
                strength: 0.15,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const size = 35;
                    const positions = [{ x: centerX, y: centerY }]; // Center

                    for (let i = 0; i < 4; i++) {
                        const angle = rotation + i * Math.PI / 2;
                        positions.push({
                            x: centerX + Math.cos(angle) * size,
                            y: centerY + Math.sin(angle) * size
                        });
                    }
                    return positions;
                }
            },
            STAR: {
                minEnemies: 5,
                maxEnemies: 5,
                strength: 0.15,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 50;
                    const positions = [];
                    // Star order: 0, 2, 4, 1, 3 to draw the star shape with lines
                    const indices = [0, 2, 4, 1, 3];
                    for (let i = 0; i < 5; i++) {
                        const angle = rotation + (indices[i] * Math.PI * 2 / 5) - Math.PI / 2;
                        positions.push({
                            x: centerX + Math.cos(angle) * radius,
                            y: centerY + Math.sin(angle) * radius
                        });
                    }
                    return positions;
                }
            },
            PENTAGON: {
                minEnemies: 5,
                maxEnemies: 5,
                strength: 0.1,
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 60;
                    const positions = [];
                    for (let i = 0; i < 5; i++) {
                        const angle = rotation + (i * Math.PI * 2 / 5) - Math.PI / 2;
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
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 65;
                    const positions = [];
                    for (let i = 0; i < 6; i++) {
                        const angle = rotation + i * Math.PI / 3;
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
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const count = enemies.length;
                    const radius = 40 + count * 5;
                    const positions = [];
                    for (let i = 0; i < count; i++) {
                        const angle = rotation + (i * Math.PI * 2 / count);
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

        // Lazy-initialize effects system
        if (!this.effects && window.FormationEffects) {
            this.effects = new window.FormationEffects(this.game);
        }

        // Update effects
        if (this.effects) {
            this.effects.update(deltaTime);
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
    /**
     * Find clusters of nearby enemies using spatial hashing (O(N) complexity)
     */
    findClusters(enemies) {
        const clusters = [];
        const visited = new Set();
        const cellSize = this.detectionRadius; // Cell size = detection radius
        const grid = new Map();

        // Step 1: Populate spatial grid
        for (const enemy of enemies) {
            const cellX = Math.floor(enemy.x / cellSize);
            const cellY = Math.floor(enemy.y / cellSize);
            const key = `${cellX},${cellY}`;

            if (!grid.has(key)) {
                grid.set(key, []);
            }
            grid.get(key).push(enemy);
        }

        // Step 2: Find clusters
        const radiusSq = this.detectionRadius * this.detectionRadius;

        for (const enemy of enemies) {
            if (visited.has(enemy.id)) continue;

            const cluster = [enemy];
            visited.add(enemy.id);

            // Queue for BFS expansion of cluster
            const queue = [enemy];

            while (queue.length > 0) {
                const current = queue.shift();
                const cellX = Math.floor(current.x / cellSize);
                const cellY = Math.floor(current.y / cellSize);

                // Check current cell and neighbors
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${cellX + dx},${cellY + dy}`;
                        const cellEnemies = grid.get(key);

                        if (!cellEnemies) continue;

                        for (const neighbor of cellEnemies) {
                            if (visited.has(neighbor.id)) continue;

                            const distSq = (current.x - neighbor.x) ** 2 + (current.y - neighbor.y) ** 2;

                            if (distSq < radiusSq) {
                                visited.add(neighbor.id);
                                cluster.push(neighbor);
                                queue.push(neighbor); // Expand cluster from this neighbor
                            }
                        }
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
        // 1. Calculate initial centroid of the potential cluster
        let centerX = 0, centerY = 0;
        for (const enemy of enemies) {
            centerX += enemy.x;
            centerY += enemy.y;
        }
        centerX /= enemies.length;
        centerY /= enemies.length;

        // 2. Sort enemies by distance to centroid to find the most compact group
        // This prevents "stringy" clusters from forming constellations across vast distances
        enemies.sort((a, b) => {
            const distA = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
            const distB = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
            return distA - distB;
        });

        // 3. Select the closest N enemies for the pattern
        const targetEnemies = enemies.slice(0, pattern.maxEnemies);

        // 4. Recalculate centroid for the actual selected group
        centerX = 0;
        centerY = 0;
        for (const enemy of targetEnemies) {
            centerX += enemy.x;
            centerY += enemy.y;
        }
        centerX /= targetEnemies.length;
        centerY /= targetEnemies.length;

        // 5. Sort selected enemies by angle around the new center
        // This ensures that the visual "loop" (i -> i+1) connects adjacent enemies
        // preventing crossing lines and visual distortions
        targetEnemies.sort((a, b) => {
            const angleA = Math.atan2(a.y - centerY, a.x - centerX);
            const angleB = Math.atan2(b.y - centerY, b.x - centerX);
            return angleA - angleB;
        });

        const constellation = {
            id: `constellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            enemies: targetEnemies,
            pattern,
            centerX,
            centerY,
            createdAt: Date.now(),
            age: 0,
            rotation: Math.random() * Math.PI * 2, // Random initial rotation
            rotationSpeed: (Math.random() - 0.5) * 1.0 // Slow rotation (-0.5 to 0.5 rad/s)
        };

        // Mark enemies as part of this constellation
        for (const enemy of targetEnemies) {
            enemy.constellation = constellation.id;
        }

        this.constellations.push(constellation);

        // ALWAYS LOG constellation creation for visibility
        window.logger?.log(`✨ [Emergent] Created ${pattern.name} constellation with ${targetEnemies.length} enemies at (${Math.round(centerX)}, ${Math.round(centerY)})`);

        // Trigger visual effects
        if (this.effects) {
            this.effects.onConstellationFormed(constellation);
        }
    }

    /**
     * Apply subtle forces to pull enemies into constellation patterns
     */
    applyConstellationForces(deltaTime) {
        for (const constellation of this.constellations) {
            constellation.age += deltaTime;

            // Update center position (slowly follow enemies)
            let centerX = 0, centerY = 0;
            let validEnemies = 0;
            for (const enemy of constellation.enemies) {
                if (enemy && !enemy.isDead) {
                    centerX += enemy.x;
                    centerY += enemy.y;
                    validEnemies++;
                }
            }

            if (validEnemies === 0) continue;

            centerX /= validEnemies;
            centerY /= validEnemies;

            // Smooth center movement
            constellation.centerX += (centerX - constellation.centerX) * 0.1;
            constellation.centerY += (centerY - constellation.centerY) * 0.1;

            // Update rotation
            constellation.rotation += constellation.rotationSpeed * deltaTime;

            // Get target positions for this constellation
            const targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            );

            // Apply forces to each enemy
            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                const target = targetPositions[i];

                if (!enemy || enemy.isDead || !target) continue;

                // Calculate force toward target position
                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 2) { // Only apply if not already at target
                    // Gentle nudge - doesn't override enemy AI, just suggests position
                    const strength = constellation.pattern.strength;

                    // Use velocity if available for smoother physics integration
                    if (enemy.movement && enemy.movement.velocity) {
                        // Apply spring force (Hooke's Law: F = -k * x)
                        // Force increases with distance to pull stragglers in
                        const springK = strength * 5.0; // Tuned spring constant
                        const force = springK * dist;

                        // Clamp maximum force to prevent crazy flinging
                        const maxForce = 800;
                        const clampedForce = Math.min(force, maxForce);

                        enemy.movement.velocity.x += (dx / dist) * clampedForce * deltaTime;
                        enemy.movement.velocity.y += (dy / dist) * clampedForce * deltaTime;

                        // Apply damping to prevent oscillation
                        // F_damp = -c * v
                        const damping = 3.0;
                        enemy.movement.velocity.x -= enemy.movement.velocity.x * damping * deltaTime;
                        enemy.movement.velocity.y -= enemy.movement.velocity.y * damping * deltaTime;
                    } else {
                        // Fallback to direct position modification
                        enemy.x += (dx / dist) * strength * deltaTime * 60;
                        enemy.y += (dy / dist) * strength * deltaTime * 60;
                    }
                }
            }

            // Note: Separation is now handled by the global atomic forces in EnemyMovement
            // We don't need to apply it twice here
        }
    }

    /**
     * Apply separation force to enemies in a constellation
     * @deprecated Handled by EnemyMovement.applyAtomicForces
     */
    applySeparation(constellation, deltaTime) {
        // Deprecated - logic moved to EnemyMovement for global consistency
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
     * Get color for constellation pattern type
     */
    getPatternColor(patternName) {
        const colors = {
            'PAIR': { r: 100, g: 200, b: 255 },
            'ARROW': { r: 255, g: 50, b: 50 },
            'TRIANGLE': { r: 0, g: 255, b: 153 },
            'CROSS': { r: 255, g: 200, b: 50 },
            'DIAMOND': { r: 153, g: 0, b: 255 },
            'STAR': { r: 255, g: 255, b: 0 },
            'PENTAGON': { r: 255, g: 153, b: 0 },
            'HEXAGON': { r: 255, g: 0, b: 153 },
            'CIRCLE': { r: 0, g: 153, b: 255 }
        };
        return colors[patternName] || { r: 0, g: 255, b: 153 };
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
                constellation.enemies,
                constellation.rotation
            );

            // Draw constellation outline - ALWAYS visible now (not just debug)
            const patternColor = this.getPatternColor(constellation.pattern.name);
            const outlineAlpha = isDebugMode ? 0.4 : 0.2;

            ctx.strokeStyle = `rgba(${patternColor.r}, ${patternColor.g}, ${patternColor.b}, ${outlineAlpha})`;
            ctx.lineWidth = isDebugMode ? 2 : 1.5;
            ctx.setLineDash(isDebugMode ? [5, 5] : [10, 5]);

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

            // ALWAYS show subtle constellation center marker (even without debug)
            // Make it more visible!
            const pulseIntensity = 0.5 + Math.sin(constellation.age * 3) * 0.5; // 0-1 pulse
            const baseAlpha = isDebugMode ? 0.5 : 0.3;
            const pulsingAlpha = baseAlpha * pulseIntensity;

            ctx.fillStyle = isDebugMode ? `rgba(100, 200, 255, ${pulsingAlpha})` : `rgba(0, 255, 153, ${pulsingAlpha})`;
            ctx.strokeStyle = isDebugMode ? `rgba(100, 200, 255, ${pulsingAlpha + 0.2})` : `rgba(0, 255, 153, ${pulsingAlpha + 0.2})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);

            // Draw geometric icon based on pattern type
            const size = isDebugMode ? 12 : 8;
            ctx.beginPath();

            if (constellation.pattern.name === 'PAIR') {
                // Two small dots
                const rot = constellation.rotation || 0;
                const dx = Math.cos(rot) * 8;
                const dy = Math.sin(rot) * 8;
                ctx.arc(constellation.centerX - dx, constellation.centerY - dy, 2, 0, Math.PI * 2);
                ctx.arc(constellation.centerX + dx, constellation.centerY + dy, 2, 0, Math.PI * 2);
            } else if (constellation.pattern.name === 'TRIANGLE' || constellation.pattern.name === 'ARROW') {
                // Triangle/Arrow
                const rot = constellation.rotation || 0;
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 2.6) * size, constellation.centerY + Math.sin(rot + 2.6) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot - 2.6) * size, constellation.centerY + Math.sin(rot - 2.6) * size);
                ctx.closePath();
            } else if (constellation.pattern.name === 'DIAMOND' || constellation.pattern.name === 'CROSS') {
                // Diamond/Cross
                const rot = constellation.rotation || 0;
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 1.57) * size, constellation.centerY + Math.sin(rot + 1.57) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 3.14) * size, constellation.centerY + Math.sin(rot + 3.14) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 4.71) * size, constellation.centerY + Math.sin(rot + 4.71) * size);
                ctx.closePath();
            } else if (constellation.pattern.name === 'STAR') {
                // Star
                const rot = constellation.rotation || 0;
                for (let i = 0; i < 5; i++) {
                    const angle = rot + i * Math.PI * 2 / 5 - Math.PI / 2;
                    const x = constellation.centerX + Math.cos(angle) * size;
                    const y = constellation.centerY + Math.sin(angle) * size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
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

        // Render effects (particles, beams, etc.)
        if (this.effects) {
            this.effects.render(ctx);
        }
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

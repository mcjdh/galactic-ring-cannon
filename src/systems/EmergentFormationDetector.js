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
        this.detectionRadius = 200; // Enemies within this radius can form constellations (wider to encourage larger shapes)
        this.minEnemiesForConstellation = 2; // BUFFED: Was 3 - Allow smaller clusters
        this.maxConstellations = 8; // BUFFED: Was 5 - More simultaneous constellations
        this.detectionInterval = 0.25; // Check every 0.25 seconds for snappier linking
        this.detectionTimer = 0;
        this.maxConstellationRadius = 300; // Prevent stringy constellations that span too far (softened further)
        this.maxConstellationRadiusSq = this.maxConstellationRadius * this.maxConstellationRadius;
        this.integrityStrikeLimit = 12; // Grace frames before dismantling after a violation
        this.constellationStandoffDistance = 220; // Desired distance from player for constellation centers
        this.constellationChaseGain = 1.5; // How quickly centers correct toward/away from player
        this.constellationOrbitGain = 0.6; // Tangential motion to keep shapes moving as a unit
        this.constellationRotationAlign = 1.0; // Radians/sec alignment toward the player (so rotation is steadier)
        this.constellationReformCooldownMs = 800; // Allow re-link sooner; rely on hysteresis for stability
        this.mergeInterval = 9999; // Effectively pause merging to reduce churn
        this.mergeTimer = 0;

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
        const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

        const freeEnemies = enemies.filter(e =>
            !e.isDead &&
            !e.isBoss &&
            !e.formationId && // FIXED: Was checking .formation, should be .formationId
            !this.isInConstellation(e) && // Not already in an emergent constellation
            (!e.constellationCooldown || e.constellationCooldown <= now) // Not cooling down
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

            this.carveConstellationsFromCluster(cluster);
        }

        // Merge is currently disabled to prioritize stability over consolidation
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
            if (visited.has(enemy)) continue;

            const cluster = [enemy];
            visited.add(enemy);

            // Queue for BFS expansion of cluster
            const queue = [enemy];

            while (queue.length > 0) {
                const current = queue.shift();
                const cellX = Math.floor(current.x / cellSize);
                const cellY = Math.floor(current.y / cellSize);

                // Check current and neighboring cells
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${cellX + dx},${cellY + dy}`;
                        const cellEnemies = grid.get(key);

                        if (!cellEnemies) continue;

                        for (const neighbor of cellEnemies) {
                            if (visited.has(neighbor)) continue;

                            const distSq = (current.x - neighbor.x) ** 2 + (current.y - neighbor.y) ** 2;

                            if (distSq < radiusSq) {
                                visited.add(neighbor);
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
     * Carve one or more constellations out of a cluster, favoring the largest patterns that fit
     */
    carveConstellationsFromCluster(cluster) {
        const remaining = [...cluster];
        const created = [];

        while (
            remaining.length >= this.minEnemiesForConstellation &&
            (this.constellations.length + created.length) < this.maxConstellations
        ) {
            // Recompute centroid of remaining enemies
            let centerX = 0, centerY = 0;
            for (const enemy of remaining) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= remaining.length;
            centerY /= remaining.length;

            const pattern = this.selectPattern(remaining.length, { allowSubset: true });
            if (!pattern) break;

            // Take the closest enemies to the centroid up to the pattern capacity
            const groupSize = Math.min(pattern.maxEnemies, remaining.length);
            remaining.sort((a, b) => {
                const distA = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
                const distB = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
                return distA - distB;
            });
            const selected = remaining.slice(0, groupSize);

            const constellation = this.createConstellation(selected, pattern);
            if (!constellation) {
                // Drop the farthest enemy and try again to find a tighter subset
                let farthestIndex = 0;
                let farthestDistSq = -1;
                for (let i = 0; i < remaining.length; i++) {
                    const e = remaining[i];
                    const dx = e.x - centerX;
                    const dy = e.y - centerY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > farthestDistSq) {
                        farthestDistSq = distSq;
                        farthestIndex = i;
                    }
                }
                remaining.splice(farthestIndex, 1);
                continue;
            }

            created.push(constellation);

            // Remove selected enemies from remaining pool
            const selectedIds = new Set(selected.map(e => e.id));
            const filtered = remaining.filter(e => !selectedIds.has(e.id));
            remaining.length = 0;
            remaining.push(...filtered);
        }

        return created;
    }

    /**
     * Merge nearby constellations into larger shapes when possible
     */
    mergeNearbyConstellations() {
        if (this.constellations.length < 2) return;

        const mergeRadiusSq = 200 * 200;
        let mergedAny = false;

        // Try to merge larger constellations first
        this.constellations.sort((a, b) => (b?.enemies?.length || 0) - (a?.enemies?.length || 0));

        const attemptMerge = (a, b) => {
            const dx = a.centerX - b.centerX;
            const dy = a.centerY - b.centerY;
            const distSq = dx * dx + dy * dy;
            if (distSq > mergeRadiusSq) return null;

            const combinedEnemies = [];
            const seen = new Set();
            for (const enemy of [...(a.enemies || []), ...(b.enemies || [])]) {
                if (!enemy || enemy.isDead) continue;
                if (seen.has(enemy)) continue;
                seen.add(enemy);
                combinedEnemies.push(enemy);
            }

            const pattern = this.selectPattern(combinedEnemies.length, { allowSubset: true });
            if (!pattern || pattern.maxEnemies < 3) return null; // Skip merging into pairs

            // Spatial sanity check: ensure combined cluster isn't too spread out
            let cx = 0, cy = 0;
            for (const e of combinedEnemies) {
                cx += e.x; cy += e.y;
            }
            cx /= combinedEnemies.length;
            cy /= combinedEnemies.length;
            let maxDistSq = 0;
            for (const e of combinedEnemies) {
                const ddx = e.x - cx;
                const ddy = e.y - cy;
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 > maxDistSq) maxDistSq = d2;
            }
            const maxSpreadSq = this.maxConstellationRadiusSq * 1.1;
            if (maxDistSq > maxSpreadSq) return null;

            // Clear old constellation tags without cooldown so we can reform immediately
            for (const enemy of combinedEnemies) {
                delete enemy.constellation;
                delete enemy.constellationJoinedAt;
                delete enemy.constellationAnchor;
                enemy.constellationCooldown = 0;
            }

            return this.createConstellation(combinedEnemies, pattern);
        };

        const kept = [];
        for (let i = 0; i < this.constellations.length; i++) {
            const a = this.constellations[i];
            if (!a) continue;
            // Avoid merging constellations that are still settling
            if (a.age < 2.0) {
                kept.push(a);
                continue;
            }
            let merged = null;

            for (let j = i + 1; j < this.constellations.length; j++) {
                const b = this.constellations[j];
                if (!b) continue;
                if (b.age < 2.0) continue;

                merged = attemptMerge(a, b);
                if (merged) {
                    this.constellations[j] = null; // consume b
                    mergedAny = true;
                    break;
                }
            }

            if (merged) {
                kept.push(merged);
            } else if (a) {
                kept.push(a);
            }
        }

        if (mergedAny) {
            this.constellations = kept.filter(Boolean);
        }
    }

    /**
     * Select best pattern for a cluster size
     */
    selectPattern(count, options = {}) {
        const { allowSubset = false } = options;
        // Find exact match first
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count <= pattern.maxEnemies) {
                return { name, ...pattern };
            }
        }

        if (!allowSubset) return null;

        // Otherwise, pick the largest pattern that fits within the available count
        let best = null;
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count >= pattern.maxEnemies) {
                if (!best || pattern.maxEnemies > best.maxEnemies) {
                    best = { name, ...pattern };
                }
            }
        }
        return best;
    }

    /**
     * Create a constellation from a cluster
     */
    createConstellation(enemies, patternInput) {
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
        let pattern = patternInput;
        let targetEnemies = enemies.slice(0, pattern.maxEnemies);

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
        const allowedRadiusSq = this.maxConstellationRadiusSq * 1.1; // Slightly lenient to avoid over-culling
        targetEnemies = targetEnemies.filter(enemy => {
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            return (dx * dx + dy * dy) <= allowedRadiusSq;
        });

        // Recenter after culling distant outliers to avoid string-like shapes
        if (targetEnemies.length >= this.minEnemiesForConstellation) {
            centerX = 0;
            centerY = 0;
            for (const enemy of targetEnemies) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= targetEnemies.length;
            centerY /= targetEnemies.length;
        }

        // If the remaining group no longer fits the selected pattern, gracefully downgrade to best-fit
        if (targetEnemies.length < pattern.minEnemies || targetEnemies.length > pattern.maxEnemies) {
            const fallback = this.selectPattern(targetEnemies.length, { allowSubset: true });
            if (!fallback) {
                window.logger?.log('[Emergent] Skipping constellation: spread too large for pattern');
                return null;
            }
            pattern = fallback;
            targetEnemies = targetEnemies.slice(0, pattern.maxEnemies);

            // Recenter after trimming to fallback size
            centerX = 0;
            centerY = 0;
            for (const enemy of targetEnemies) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= targetEnemies.length;
            centerY /= targetEnemies.length;
        }

        targetEnemies.sort((a, b) => {
            const angleA = Math.atan2(a.y - centerY, a.x - centerX);
            const angleB = Math.atan2(b.y - centerY, b.x - centerX);
            return angleA - angleB;
        });

        // Assign stable anchor indices so targets/visuals don't reshuffle every frame
        for (let i = 0; i < targetEnemies.length; i++) {
            targetEnemies[i].constellationAnchor = i;
        }

        const constellation = {
            id: `constellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            enemies: targetEnemies,
            pattern,
            centerX,
            centerY,
            createdAt: Date.now(),
            age: 0,
            rotation: Math.random() * Math.PI * 2, // Random initial rotation
            rotationSpeed: (Math.random() - 0.5) * 1.0, // Slow rotation (-0.5 to 0.5 rad/s)
            integrityStrikes: 0 // Hysteresis counter for edge/deviation violations
        };

        // Mark enemies as part of this constellation
        const joinTimestamp = (this.game?.timeMs) ??
            (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

        for (const enemy of targetEnemies) {
            enemy.constellation = constellation.id;
            enemy.constellationJoinedAt = joinTimestamp;
            enemy.constellationCooldown = 0;
            if (enemy.movement && enemy.movement.velocity) {
                // Clear residual momentum from prior behavior to let formation forces take over
                enemy.movement.velocity.x *= 0.2;
                enemy.movement.velocity.y *= 0.2;
            }
        }

        this.constellations.push(constellation);

        // ALWAYS LOG constellation creation for visibility
        window.logger?.log(`✨ [Emergent] Created ${pattern.name} constellation with ${targetEnemies.length} enemies at (${Math.round(centerX)}, ${Math.round(centerY)})`);

        // Trigger visual effects
        if (this.effects) {
            this.effects.onConstellationFormed(constellation);
        }

        return constellation;
    }

    /**
     * Apply subtle forces to pull enemies into constellation patterns
     */
    applyConstellationForces(deltaTime) {
        const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

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

            // Smooth center movement toward current mass center
            constellation.centerX += (centerX - constellation.centerX) * 0.1;
            constellation.centerY += (centerY - constellation.centerY) * 0.1;

            // Group-level steering toward player with standoff and mild orbit
            const player = this.game?.player;
            if (player) {
                const dxp = player.x - constellation.centerX;
                const dyp = player.y - constellation.centerY;
                const dist = Math.sqrt(dxp * dxp + dyp * dyp) || 1;

                const standoff = this.constellationStandoffDistance;
                const distError = dist - standoff;
                const clampedError = Math.max(-standoff * 1.5, Math.min(standoff * 1.5, distError));
                const chaseStep = clampedError * this.constellationChaseGain * deltaTime;

                constellation.centerX += (dxp / dist) * chaseStep;
                constellation.centerY += (dyp / dist) * chaseStep;

                // Add tangential orbit motion when near desired distance
                const orbitScale = Math.max(0, 1 - Math.abs(distError) / (standoff * 0.6));
                const orbitStep = orbitScale * this.constellationOrbitGain * deltaTime * standoff * 0.2;
                constellation.centerX += (-dyp / dist) * orbitStep;
                constellation.centerY += (dxp / dist) * orbitStep;
            }

            // Update rotation
            constellation.rotation += constellation.rotationSpeed * deltaTime;

            // Slightly align rotation to face the player so shapes present coherently
            if (player) {
                const dxp2 = player.x - constellation.centerX;
                const dyp2 = player.y - constellation.centerY;
                const targetRot = Math.atan2(dyp2, dxp2);
                const delta = Math.atan2(Math.sin(targetRot - constellation.rotation), Math.cos(targetRot - constellation.rotation));
                const maxStep = this.constellationRotationAlign * deltaTime;
                const step = Math.max(-maxStep, Math.min(maxStep, delta));
                constellation.rotation += step;
            }

            // Get target positions for this constellation
            let targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            );
            // Safety: recompute if anchor count mismatches to prevent undefined targets
            if (!Array.isArray(targetPositions) || targetPositions.length !== constellation.enemies.length) {
                targetPositions = constellation.pattern.getTargetPositions(
                    constellation.centerX,
                    constellation.centerY,
                    constellation.enemies,
                    constellation.rotation
                );
            }

            // Apply forces to each enemy
            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                const anchorIndex = enemy?.constellationAnchor ?? i;
                const target = targetPositions[targetPositions.length ? anchorIndex % targetPositions.length : i];

                if (!enemy || enemy.isDead || !target) continue;
                const joinAge = now - (enemy.constellationJoinedAt || now);
                const isFreshJoin = joinAge < 1200; // ms since joining shape

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
                        const baseSpringK = strength * 5.0;
                        const springK = isFreshJoin ? baseSpringK * 2.0 : baseSpringK; // Stronger during settling
                        const force = springK * dist;

                        // Clamp maximum force to prevent crazy flinging
                        const maxForce = isFreshJoin ? 1300 : 800;
                        const clampedForce = Math.min(force, maxForce);

                        enemy.movement.velocity.x += (dx / dist) * clampedForce * deltaTime;
                        enemy.movement.velocity.y += (dy / dist) * clampedForce * deltaTime;

                        // Apply damping to prevent oscillation
                        // F_damp = -c * v
                        const damping = isFreshJoin ? 4.5 : 3.0;
                        enemy.movement.velocity.x -= enemy.movement.velocity.x * damping * deltaTime;
                        enemy.movement.velocity.y -= enemy.movement.velocity.y * damping * deltaTime;

                        // Extra catch-up pull if enemy drifts beyond the intended radius
                        const toCenterX = constellation.centerX - enemy.x;
                        const toCenterY = constellation.centerY - enemy.y;
                        const distToCenterSq = toCenterX * toCenterX + toCenterY * toCenterY;
                        const catchUpThresholdSq = this.maxConstellationRadiusSq * 0.49; // ~70% of max radius
                        if (distToCenterSq > catchUpThresholdSq) {
                            const distToCenter = Math.sqrt(distToCenterSq);
                            const pullStrength = Math.min(distToCenter / this.maxConstellationRadius, 1.8);
                            const catchUpForce = (isFreshJoin ? 1300 : 900) * pullStrength; // Stronger pull for stragglers
                            enemy.movement.velocity.x += (toCenterX / distToCenter) * catchUpForce * deltaTime;
                            enemy.movement.velocity.y += (toCenterY / distToCenter) * catchUpForce * deltaTime;
                        }
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
    /**
     * Remove constellations that have broken apart
     */
    cleanupConstellations() {
        this.constellations = this.constellations.filter(constellation => {
            // Helper to dismantle
            const dismantle = () => {
                for (const enemy of constellation.enemies) {
                    if (enemy) {
                        delete enemy.constellation;
                        delete enemy.constellationJoinedAt;
                        delete enemy.constellationAnchor;
                        const nowTs = (typeof performance !== 'undefined' && performance.now)
                            ? performance.now()
                            : Date.now();
                        enemy.constellationCooldown = nowTs + this.constellationReformCooldownMs;
                    }
                }
                this.effects?.removeConstellationBeams?.(constellation.id);
                // Trigger break effects if available
                if (this.effects) {
                    this.effects.onFormationBroken({
                        center: { x: constellation.centerX, y: constellation.centerY },
                        enemies: constellation.enemies,
                        config: { name: constellation.pattern.name }
                    });
                }
            };

            // Remove if too many enemies died
            const aliveCount = constellation.enemies.filter(e => !e.isDead).length;
            if (aliveCount < constellation.pattern.minEnemies) {
                dismantle();
                return false;
            }

            // Remove if too old (30 seconds max)
            if (constellation.age > 30) {
                dismantle();
                return false;
            }

            // Allow grace period after creation to settle into shape
            if (constellation.age < 3.0) {
                return true;
            }

            // 0. Bounding radius check - if anyone wandered far from the centroid
            let radiusBreached = false;
            for (const enemy of constellation.enemies) {
                if (enemy && !enemy.isDead) {
                    const dx = enemy.x - constellation.centerX;
                    const dy = enemy.y - constellation.centerY;
                    if ((dx * dx + dy * dy) > this.maxConstellationRadiusSq) {
                        radiusBreached = true;
                        break;
                    }
                }
            }

            // 1. Edge Length Check (Visual Connection Lines)
            // If any two connected enemies are too far apart, the visual looks bad.
            const maxEdgeLengthSq = 520 * 520; // Looser edge limit to reduce flicker in dense crowds
            let edgeTooLong = false;
            for (let i = 0; i < constellation.enemies.length; i++) {
                const e1 = constellation.enemies[i];
                const e2 = constellation.enemies[(i + 1) % constellation.enemies.length];

                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    const distSq = (e1.x - e2.x) ** 2 + (e1.y - e2.y) ** 2;
                    if (distSq > maxEdgeLengthSq) {
                        edgeTooLong = true;
                        break;
                    }
                }
            }

            // 2. Target Deviation Check (Distortion)
            // If enemies are too far from where they should be in the pattern
            const targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            );

            const maxDeviationSq = 460 * 460; // Looser deviation to reduce flicker
            let deviationTooHigh = false;
            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                const anchorIndex = enemy?.constellationAnchor ?? i;
                const target = targetPositions[anchorIndex % targetPositions.length];

                if (enemy && !enemy.isDead && target) {
                    const distSq = (enemy.x - target.x) ** 2 + (enemy.y - target.y) ** 2;
                    if (distSq > maxDeviationSq) {
                        deviationTooHigh = true;
                        break;
                    }
                }
            }

            const violated = edgeTooLong || deviationTooHigh || radiusBreached;
            if (violated) {
                constellation.integrityStrikes = (constellation.integrityStrikes || 0) + 1;
                if (constellation.integrityStrikes >= this.integrityStrikeLimit) {
                    dismantle();
                    return false;
                }
                return true; // Grace period before dismantling
            }

            // Healthy constellation, reset strikes
            constellation.integrityStrikes = 0;
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
                const anchorIndex = enemy?.constellationAnchor ?? i;
                const target = targetPositions[anchorIndex % targetPositions.length];
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
                if (enemy) {
                    delete enemy.constellation;
                    delete enemy.constellationJoinedAt;
                    delete enemy.constellationAnchor;
                }
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

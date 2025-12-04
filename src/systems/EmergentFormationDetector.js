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
        // [TUNED] Balanced detection for interesting shapes instead of binary swarms
        this.detectionRadius = 160; // Increased slightly for more clustering opportunities
        this.minEnemiesForConstellation = 3; // [FIX] Increased from 2 - require 3+ for proper shapes
        this.maxConstellations = 10; // BUFFED: Was 8 - Allow more simultaneous constellations
        this.detectionInterval = 0.18; // Slightly faster detection for snappier linking
        this.detectionTimer = 0;
        this.maxConstellationRadius = 280; // Increased from 250 to accommodate larger patterns
        this.maxConstellationRadiusSq = this.maxConstellationRadius * this.maxConstellationRadius;
        this.integrityStrikeLimit = 30; // [TUNED] Increased from 18 for more stable formations
        this.constellationStandoffDistance = 220; // Desired distance from player for constellation centers
        this.constellationChaseGain = 1.0; // [REDUCED] How quickly centers correct toward/away from player
        this.constellationOrbitGain = 0.4; // [REDUCED] Tangential motion to keep shapes moving as a unit
        this.constellationRotationAlign = 1.0; // Radians/sec alignment toward the player
        this.constellationReformCooldownMs = 600; // Faster re-linking after breaks
        this.mergeInterval = 9999; // Effectively pause merging to reduce churn
        this.mergeTimer = 0;
        this.maxConstellationMaxSpeed = 850; // Max speed for enemies in constellations

        // Active constellations (emergent patterns)
        this.constellations = [];

        // Visual effects system
        this.effects = null; // Will be initialized when FormationEffects is available

        // Constellation pattern templates (similar to formations but for emergent clustering)
        // [REBALANCED] Pattern selection now uses weighted random based on strength values
        // Higher strength = more likely to be selected when multiple patterns match
        this.patterns = {
            // LINE formation - enemies arrange in a straight line facing player
            LINE: {
                minEnemies: 4,
                maxEnemies: 5,
                strength: 0.4,  // Medium-high chance for 4-5 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const spacing = 60;
                    const count = enemies.length;
                    const totalWidth = spacing * (count - 1);
                    const startOffset = -totalWidth / 2;
                    
                    // Line perpendicular to rotation (facing direction)
                    const perpAngle = rotation + Math.PI / 2;
                    const positions = [];
                    
                    for (let i = 0; i < count; i++) {
                        const offset = startOffset + i * spacing;
                        positions.push({
                            x: centerX + Math.cos(perpAngle) * offset,
                            y: centerY + Math.sin(perpAngle) * offset
                        });
                    }
                    return positions;
                }
            },
            ARROW: {
                minEnemies: 3,
                maxEnemies: 3,
                strength: 0.35,  // Good chance for 3 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const size = 70;
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
                strength: 0.35,  // Equal chance with arrow for 3 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 90;
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
                strength: 0.5,  // High chance for exactly 4 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 100;
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
                strength: 0.45,  // Good chance for exactly 5 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    // [IMPROVED] Cross without center congestion
                    // Places enemies at the 4 cardinal tips plus one at center but offset
                    const armLength = 80;
                    const centerOffset = 20;  // Small offset so center enemy isn't exactly at center
                    const positions = [];

                    // Center enemy - slightly offset in rotation direction
                    positions.push({
                        x: centerX + Math.cos(rotation) * centerOffset,
                        y: centerY + Math.sin(rotation) * centerOffset
                    });

                    // Four arm tips
                    for (let i = 0; i < 4; i++) {
                        const angle = rotation + i * Math.PI / 2;
                        positions.push({
                            x: centerX + Math.cos(angle) * armLength,
                            y: centerY + Math.sin(angle) * armLength
                        });
                    }
                    return positions;
                }
            },
            STAR: {
                minEnemies: 5,
                maxEnemies: 5,
                strength: 0.45,  // Equal chance with cross for 5 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 95;
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
                strength: 0.35,  // Lower chance - less distinctive than star/cross
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 95;
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
            // V_FORMATION - like flying birds, creates dramatic charge patterns
            V_FORMATION: {
                minEnemies: 5,
                maxEnemies: 7,
                strength: 0.4,  // Good chance for 5-7 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const count = enemies.length;
                    const armSpacing = 55;  // Distance between enemies on each arm
                    const wingAngle = Math.PI / 5;  // 36 degree spread on each side
                    const positions = [];
                    
                    // Leader at the front
                    const tipX = centerX + Math.cos(rotation) * 40;
                    const tipY = centerY + Math.sin(rotation) * 40;
                    positions.push({ x: tipX, y: tipY });
                    
                    // Distribute remaining enemies on two wings
                    const wingEnemies = count - 1;
                    const leftCount = Math.ceil(wingEnemies / 2);
                    const rightCount = Math.floor(wingEnemies / 2);
                    
                    // Left wing
                    for (let i = 0; i < leftCount; i++) {
                        const dist = (i + 1) * armSpacing;
                        const angle = rotation + Math.PI + wingAngle;  // Behind and left
                        positions.push({
                            x: centerX + Math.cos(angle) * dist,
                            y: centerY + Math.sin(angle) * dist
                        });
                    }
                    
                    // Right wing
                    for (let i = 0; i < rightCount; i++) {
                        const dist = (i + 1) * armSpacing;
                        const angle = rotation + Math.PI - wingAngle;  // Behind and right
                        positions.push({
                            x: centerX + Math.cos(angle) * dist,
                            y: centerY + Math.sin(angle) * dist
                        });
                    }
                    
                    return positions;
                }
            },
            HEXAGON: {
                minEnemies: 6,
                maxEnemies: 6,
                strength: 0.5,  // High chance for exactly 6 enemies
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 110;
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
                maxEnemies: 15,  // Increased from 12 to allow larger, more impressive circles
                strength: 0.45,  // Slightly increased for 7+ enemies - impressive when it forms
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const count = enemies.length;
                    // Dynamic radius scales with enemy count for proper spacing
                    const baseRadius = 75;
                    const radiusPerEnemy = 12;
                    const radius = baseRadius + count * radiusPerEnemy;
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

        if (enemies.length < this.minEnemiesForConstellation) return;

        // Get enemies that aren't already in managed formations or constellations
        const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

        const freeEnemies = enemies.filter(e =>
            !e.isDead &&
            !e.isBoss &&
            !e.formationId &&
            !this.isInConstellation(e) &&
            (!e.constellationCooldown || e.constellationCooldown <= now)
        );

        if (freeEnemies.length < this.minEnemiesForConstellation) return;

        // Find clusters using spatial hashing for performance
        const clusters = this.findClusters(freeEnemies);

        if (clusters.length === 0) return;

        // Form constellations from clusters
        for (const cluster of clusters) {
            if (this.constellations.length >= this.maxConstellations) break;
            this.carveConstellationsFromCluster(cluster);
        }
    }

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
     * Carve one or more constellations out of a cluster, favoring variety in patterns
     * [IMPROVED] Better handling of different cluster sizes for more shape variety
     */
    carveConstellationsFromCluster(cluster) {
        const remaining = [...cluster];
        const created = [];

        // Track recently used patterns to encourage variety
        const recentPatterns = this.constellations
            .filter(c => c.age < 10) // Only consider recent constellations
            .map(c => c.pattern.name);

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

            // Try to select a pattern, with preference for variety
            let pattern = this.selectPatternWithVariety(remaining.length, recentPatterns);
            if (!pattern) {
                pattern = this.selectPattern(remaining.length, { allowSubset: true });
            }
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

            // Track this pattern as recently used
            recentPatterns.push(pattern.name);
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
     * Select a pattern with preference for variety (avoid recently used patterns)
     * @param {number} count - Number of enemies available
     * @param {Array<string>} recentPatterns - Names of recently used patterns
     * @returns {Object|null} Selected pattern or null
     */
    selectPatternWithVariety(count, recentPatterns) {
        if (!count || count < 3) return null;

        // Find all patterns that exactly match the count
        const exactMatches = [];
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count <= pattern.maxEnemies) {
                exactMatches.push({ name, ...pattern });
            }
        }

        if (exactMatches.length === 0) return null;

        // Count how often each pattern has been used recently
        const usageCounts = {};
        for (const name of recentPatterns) {
            usageCounts[name] = (usageCounts[name] || 0) + 1;
        }

        // Adjust weights based on recent usage (reduce weight for frequently used patterns)
        const adjustedPatterns = exactMatches.map(pattern => {
            const usageCount = usageCounts[pattern.name] || 0;
            // Reduce strength by 30% for each recent use (minimum 10% of original)
            const adjustedStrength = pattern.strength * Math.max(0.1, Math.pow(0.7, usageCount));
            return { ...pattern, strength: adjustedStrength };
        });

        return this._weightedRandomSelect(adjustedPatterns);
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
     * Select best pattern for a cluster size using weighted random selection
     * [REWRITTEN] Now uses weighted random based on strength values to ensure variety
     * When multiple patterns match the enemy count, one is randomly selected based on strength
     */
    selectPattern(count, options = {}) {
        const { allowSubset = false } = options;
        if (!count || count < 3) return null;

        // Find all patterns that exactly match the count
        const exactMatches = [];
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count <= pattern.maxEnemies) {
                exactMatches.push({ name, ...pattern });
            }
        }

        // If we have exact matches, use weighted random selection
        if (exactMatches.length > 0) {
            return this._weightedRandomSelect(exactMatches);
        }

        if (!allowSubset) return null;

        // For subset mode: find patterns we can fully fill (count >= maxEnemies)
        // Prefer patterns that use more enemies (bigger shapes)
        const subsetMatches = [];
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.maxEnemies) {
                subsetMatches.push({ name, ...pattern });
            }
        }

        if (subsetMatches.length === 0) return null;

        // Sort by maxEnemies descending to prefer larger shapes
        subsetMatches.sort((a, b) => b.maxEnemies - a.maxEnemies);

        // Get all patterns that share the maximum size
        const maxSize = subsetMatches[0].maxEnemies;
        const topTier = subsetMatches.filter(p => p.maxEnemies === maxSize);

        // Weighted random among the largest patterns
        return this._weightedRandomSelect(topTier);
    }

    /**
     * Select a pattern randomly based on strength weights
     * @param {Array} patterns - Array of pattern objects with strength property
     * @returns {Object} Selected pattern
     */
    _weightedRandomSelect(patterns) {
        if (patterns.length === 0) return null;
        if (patterns.length === 1) return patterns[0];

        // Calculate total weight
        let totalWeight = 0;
        for (const pattern of patterns) {
            totalWeight += pattern.strength || 0.1;
        }

        // Pick a random value
        let random = Math.random() * totalWeight;

        // Find which pattern was selected
        for (const pattern of patterns) {
            random -= pattern.strength || 0.1;
            if (random <= 0) {
                return pattern;
            }
        }

        // Fallback to last pattern (shouldn't happen but just in case)
        return patterns[patterns.length - 1];
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

        // [IMPROVED] Smart anchor assignment - assign enemies to nearest target positions
        // This minimizes crossing lines and reduces initial movement needed
        const initialRotation = Math.random() * Math.PI * 2;
        const tempPositions = pattern.getTargetPositions(centerX, centerY, targetEnemies, initialRotation);
        
        if (tempPositions && tempPositions.length === targetEnemies.length) {
            // Use Hungarian-style greedy assignment: each enemy gets nearest unassigned position
            const assigned = new Set();
            const assignments = [];
            
            // Sort enemies by distance to center (assign inner enemies first for stability)
            const sortedByDist = [...targetEnemies].map((e, origIdx) => ({
                enemy: e,
                origIdx,
                distToCenter: Math.hypot(e.x - centerX, e.y - centerY)
            })).sort((a, b) => a.distToCenter - b.distToCenter);
            
            for (const { enemy, origIdx } of sortedByDist) {
                let bestPos = -1;
                let bestDistSq = Infinity;
                
                for (let p = 0; p < tempPositions.length; p++) {
                    if (assigned.has(p)) continue;
                    const dx = enemy.x - tempPositions[p].x;
                    const dy = enemy.y - tempPositions[p].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < bestDistSq) {
                        bestDistSq = distSq;
                        bestPos = p;
                    }
                }
                
                if (bestPos >= 0) {
                    assigned.add(bestPos);
                    assignments.push({ enemy, anchor: bestPos });
                }
            }
            
            // Apply assignments
            for (const { enemy, anchor } of assignments) {
                enemy.constellationAnchor = anchor;
            }
        } else {
            // Fallback: sort by angle and assign sequentially
            targetEnemies.sort((a, b) => {
                const angleA = Math.atan2(a.y - centerY, a.x - centerX);
                const angleB = Math.atan2(b.y - centerY, b.x - centerX);
                return angleA - angleB;
            });
            
            for (let i = 0; i < targetEnemies.length; i++) {
                targetEnemies[i].constellationAnchor = i;
            }
        }

        const constellation = {
            id: `constellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            enemies: targetEnemies,
            pattern,
            centerX,
            centerY,
            createdAt: Date.now(),
            age: 0,
            rotation: initialRotation,
            rotationSpeed: (Math.random() - 0.5) * 0.4 + (Math.random() > 0.5 ? 0.1 : -0.1), // Slower rotation
            integrityStrikes: 0
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
     * Update constellation state (center, rotation) and detect stuck enemies
     * [REFACTORED] Force application moved to EnemyMovement.applyManagedStructureForces()
     * to fix timing issue where forces were reset before being applied.
     */
    applyConstellationForces(deltaTime) {
        const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

        for (const constellation of this.constellations) {
            constellation.age += deltaTime;

            // Update center position (follow enemies' mass center)
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

            // [FIXED] Smoother center tracking - slower blend to prevent jerky movement
            // Blend more slowly when constellation is young (settling in)
            const ageBlendFactor = Math.min(1, constellation.age / 3);  // Ramps up over 3 seconds
            const blendFactor = 0.3 + 0.3 * ageBlendFactor;  // 0.3 to 0.6
            constellation.centerX = constellation.centerX * (1 - blendFactor) + centerX * blendFactor;
            constellation.centerY = constellation.centerY * (1 - blendFactor) + centerY * blendFactor;

            // Group-level steering toward player with standoff and mild orbit
            // [IMPROVED] Slower movement when constellation is young to let it form
            const player = this.game?.player;
            if (player) {
                const dxp = player.x - constellation.centerX;
                const dyp = player.y - constellation.centerY;
                const dist = Math.sqrt(dxp * dxp + dyp * dyp) || 1;

                const standoff = this.constellationStandoffDistance;
                const distError = dist - standoff;
                const clampedError = Math.max(-standoff * 1.5, Math.min(standoff * 1.5, distError));
                
                // Slower chase when young, faster when established
                const chaseMultiplier = 0.3 + 0.5 * ageBlendFactor;  // 0.3 to 0.8 over 3 seconds
                let chaseStep = clampedError * this.constellationChaseGain * chaseMultiplier * deltaTime;

                let moveX = (dxp / dist) * chaseStep;
                let moveY = (dyp / dist) * chaseStep;

                // Check for obstacles in the path
                const obstacles = this.game.obstacles || [];
                for (const obstacle of obstacles) {
                    if (!obstacle || !obstacle.radius) continue;

                    const obDx = obstacle.x - constellation.centerX;
                    const obDy = obstacle.y - constellation.centerY;
                    const obDistSq = obDx * obDx + obDy * obDy;
                    const avoidDist = obstacle.radius + 80;

                    if (obDistSq < avoidDist * avoidDist) {
                        const obDist = Math.sqrt(obDistSq) || 1;
                        const pushX = -(obDx / obDist);
                        const pushY = -(obDy / obDist);

                        moveX += pushX * 100 * deltaTime;  // Reduced from 150
                        moveY += pushY * 100 * deltaTime;

                        const dot = moveX * pushX + moveY * pushY;
                        if (dot < 0) {
                            moveX -= pushX * dot;
                            moveY -= pushY * dot;
                        }
                    }
                }

                // Update constellation center (target for enemies to follow)
                constellation.centerX += moveX;
                constellation.centerY += moveY;

                // Add tangential orbit motion when near desired distance
                // [REDUCED] Less orbit motion for more stable shapes
                const orbitScale = Math.max(0, 1 - Math.abs(distError) / (standoff * 0.6));
                const orbitStep = orbitScale * this.constellationOrbitGain * deltaTime * standoff * 0.12;  // Reduced from 0.2
                constellation.centerX += (-dyp / dist) * orbitStep;
                constellation.centerY += (dxp / dist) * orbitStep;
            }

            // Update rotation - slow and steady
            // [SIMPLIFIED] Just use age-based slowdown, no complex calculations
            const baseRotationSpeed = constellation.rotationSpeed;
            const ageMultiplier = Math.max(0.2, 1.0 - constellation.age * 0.04);  // Slows to 20% over 20 seconds
            constellation.rotation += baseRotationSpeed * ageMultiplier * deltaTime;

            // Gently align rotation to face the player (very subtle)
            if (player) {
                const dxp2 = player.x - constellation.centerX;
                const dyp2 = player.y - constellation.centerY;
                const targetRot = Math.atan2(dyp2, dxp2);
                const delta = Math.atan2(Math.sin(targetRot - constellation.rotation), Math.cos(targetRot - constellation.rotation));
                const maxStep = this.constellationRotationAlign * 0.5 * deltaTime;  // Reduced alignment speed
                const step = Math.max(-maxStep, Math.min(maxStep, delta));
                constellation.rotation += step;
            }

            // Stuck detection (for constellation health monitoring)
            let stuckCount = 0;
            const targetPositions = this._getConstellationPositions(constellation);

            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                if (!enemy || enemy.isDead || enemy.formationId) continue;

                const anchorIndex = enemy.constellationAnchor ?? i;
                const target = targetPositions[anchorIndex % targetPositions.length];
                if (!target) continue;

                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // [TUNED] More lenient stuck detection - only count as stuck if far from target AND not moving
                if (dist > 100) {  // Increased from 60 - give more room before considering stuck
                    const speedSq = enemy.movement.velocity.x * enemy.movement.velocity.x +
                        enemy.movement.velocity.y * enemy.movement.velocity.y;
                    // Only stuck if very slow (< 10 pixels/sec)
                    if (speedSq < 100) {
                        enemy.stuckFrames = (enemy.stuckFrames || 0) + 1;
                        // Need 60 frames of being stuck (about 1 second)
                        if (enemy.stuckFrames > 60) {
                            stuckCount++;
                        }
                    } else {
                        // Decay stuck frames faster when moving
                        enemy.stuckFrames = Math.max(0, (enemy.stuckFrames || 0) - 3);
                    }
                } else {
                    enemy.stuckFrames = 0;
                }
            }

            // If too many enemies are stuck, add integrity strikes (reduced from +5 to +2)
            if (stuckCount >= Math.max(2, constellation.enemies.length * 0.5)) {  // Need half stuck, min 2
                constellation.integrityStrikes += 2;  // Reduced from 5
                if (constellation.integrityStrikes > this.integrityStrikeLimit) {
                    window.logger?.log(`[Emergent] Breaking constellation ${constellation.id} due to stuck enemies`);
                    constellation.enemies = [];
                }
            }
        }
    }

    /**
     * Remove constellations that have broken apart
     */
    cleanupConstellations() {
        this.constellations = this.constellations.filter(constellation => {
            if (!constellation || !constellation.enemies || !constellation.pattern) {
                return false;
            }

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
                        config: { name: constellation.pattern?.name || 'UNKNOWN' }
                    });
                }
            };

            // Remove if too many enemies died
            const aliveEnemies = constellation.enemies.filter(e => e && !e.isDead);
            if (aliveEnemies.length < (constellation.pattern.minEnemies || 2)) {
                dismantle();
                return false;
            }

            // Remove if too old (45 seconds max - increased from 30)
            if (constellation.age > 45) {
                dismantle();
                return false;
            }

            // Allow grace period after creation to settle into shape
            // [TUNED] Extended grace period - scales with pattern complexity
            const patternComplexity = (constellation.pattern.maxEnemies || 3) / 3; // 1.0 for triangle, 2.0 for hexagon
            const gracePeriod = 4.0 + patternComplexity * 1.5; // 5.5s for triangle, 7s for hexagon
            if (constellation.age < gracePeriod) {
                return true;
            }

            // Cache target positions - we use them for multiple checks
            const targetPositions = this._getConstellationPositions(constellation);

            if (!targetPositions || targetPositions.length === 0) {
                dismantle();
                return false;
            }

            // 0. Bounding radius check - if anyone wandered far from the centroid
            let radiusBreached = false;
            for (const enemy of aliveEnemies) {
                const dx = enemy.x - constellation.centerX;
                const dy = enemy.y - constellation.centerY;
                if ((dx * dx + dy * dy) > this.maxConstellationRadiusSq) {
                    radiusBreached = true;
                    break;
                }
            }

            // 1. Edge Length Check (Visual Connection Lines)
            // [IMPROVED] Pattern-specific thresholds for better stability
            const patternMaxEdge = this.getPatternMaxEdgeLength(constellation.pattern.name);
            const maxEdgeLengthSq = patternMaxEdge * patternMaxEdge;
            let edgeTooLong = false;
            let worstEdgeRatio = 0;
            
            for (let i = 0; i < constellation.enemies.length; i++) {
                const e1 = constellation.enemies[i];
                const e2 = constellation.enemies[(i + 1) % constellation.enemies.length];

                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    const distSq = (e1.x - e2.x) ** 2 + (e1.y - e2.y) ** 2;
                    const ratio = distSq / maxEdgeLengthSq;
                    if (ratio > worstEdgeRatio) worstEdgeRatio = ratio;
                    if (distSq > maxEdgeLengthSq * 1.5) {  // 50% over limit = too long
                        edgeTooLong = true;
                        break;
                    }
                }
            }

            // 2. Target Deviation Check using cached positions
            // [TUNED] More lenient deviation threshold - enemies need time to reach targets
            const maxDeviationSq = 300 * 300; // Reduced from 400 but still generous
            let deviationTooHigh = false;
            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                if (!enemy || enemy.isDead) continue;

                const anchorIndex = enemy.constellationAnchor ?? i;
                // [FIX] Safety check for empty targetPositions array to prevent division by zero
                const target = targetPositions.length > 0
                    ? targetPositions[anchorIndex % targetPositions.length]
                    : null;

                if (target) {
                    const distSq = (enemy.x - target.x) ** 2 + (enemy.y - target.y) ** 2;
                    if (distSq > maxDeviationSq) {
                        deviationTooHigh = true;
                        break;
                    }
                }
            }

            const violated = edgeTooLong || deviationTooHigh || radiusBreached;
            if (violated) {
                // [IMPROVED] Graduated strike system - minor violations add less
                let strikeAmount = 1;
                if (edgeTooLong) strikeAmount = 2;  // Edge violations are more serious
                if (radiusBreached) strikeAmount = 2;
                if (deviationTooHigh && !edgeTooLong) strikeAmount = 0.5;  // Minor if just deviation
                
                constellation.integrityStrikes = (constellation.integrityStrikes || 0) + strikeAmount;
                if (constellation.integrityStrikes >= this.integrityStrikeLimit) {
                    dismantle();
                    return false;
                }
                return true; // Grace period before dismantling
            }

            // Healthy constellation - faster recovery
            // [IMPROVED] Decay rate proportional to how well-formed it is
            const decayRate = worstEdgeRatio < 0.5 ? 1.0 : 0.3;  // Faster decay when stable
            constellation.integrityStrikes = Math.max(0, (constellation.integrityStrikes || 0) - decayRate);
            return true;
        });
    }

    /**
     * Get cached constellation target positions to avoid recomputing per enemy
     * Uses the same cache fields as EnemyMovement so both systems share results.
     * [PERFORMANCE] Uses frame number instead of float comparisons
     * @param {Object} constellation
     * @returns {Array<{x:number,y:number}>}
     */
    _getConstellationPositions(constellation) {
        if (!constellation || !constellation.pattern || typeof constellation.pattern.getTargetPositions !== 'function') {
            return [];
        }

        const cache = constellation._targetCache || (constellation._targetCache = {});
        const enemyCount = constellation.enemies?.length || 0;
        
        // [PERFORMANCE] Use frame number as cache key instead of comparing floats
        const currentFrame = this.game?.frameCount || 
                            window.gameManager?.frameCount || 
                            Math.floor(performance.now() / 16.67);

        if (cache.frame !== currentFrame || cache.count !== enemyCount) {
            cache.positions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            ) || [];
            cache.frame = currentFrame;
            cache.count = enemyCount;
        }

        return cache.positions;
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
            'LINE': { r: 50, g: 200, b: 255 },    // Cyan-blue for line
            'ARROW': { r: 255, g: 50, b: 50 },
            'TRIANGLE': { r: 0, g: 255, b: 153 },
            'CROSS': { r: 255, g: 200, b: 50 },
            'DIAMOND': { r: 153, g: 0, b: 255 },
            'STAR': { r: 255, g: 255, b: 0 },
            'PENTAGON': { r: 255, g: 153, b: 0 },
            'V_FORMATION': { r: 255, g: 120, b: 80 },  // Orange-red for V
            'HEXAGON': { r: 255, g: 0, b: 153 },
            'CIRCLE': { r: 0, g: 153, b: 255 }
        };
        return colors[patternName] || { r: 0, g: 255, b: 153 };
    }

    /**
     * Get max edge length for pattern integrity checks
     * Different patterns have different natural spacing
     */
    getPatternMaxEdgeLength(patternName) {
        const lengths = {
            'LINE': 140,        // Lines have longer edges between enemies
            'ARROW': 200,       // Arrow wings can stretch
            'TRIANGLE': 220,    // Triangles have medium-large edges
            'DIAMOND': 240,     // Diamonds are medium-large
            'CROSS': 180,       // Cross arms are medium (center to tip)
            'STAR': 240,        // Stars have longer points
            'PENTAGON': 200,    // Pentagon edges are medium
            'V_FORMATION': 160, // V formation has shorter arm segments
            'HEXAGON': 220,     // Hexagon edges are medium
            'CIRCLE': 180       // Circle edges - smaller for tighter circles
        };
        return lengths[patternName] || 200;
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
            } else if (constellation.pattern.name === 'V_FORMATION') {
                // V shape / Chevron
                const rot = constellation.rotation || 0;
                // Tip of V
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                // Left wing
                ctx.lineTo(constellation.centerX + Math.cos(rot + Math.PI * 0.85) * size, constellation.centerY + Math.sin(rot + Math.PI * 0.85) * size);
                // Back to center-ish then to right wing
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot - Math.PI * 0.85) * size, constellation.centerY + Math.sin(rot - Math.PI * 0.85) * size);
            } else if (constellation.pattern.name === 'LINE') {
                // Horizontal line
                const rot = constellation.rotation || 0;
                const perpAngle = rot + Math.PI / 2;
                ctx.moveTo(constellation.centerX + Math.cos(perpAngle) * size, constellation.centerY + Math.sin(perpAngle) * size);
                ctx.lineTo(constellation.centerX - Math.cos(perpAngle) * size, constellation.centerY - Math.sin(perpAngle) * size);
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

if (typeof module !== 'undefined') {
    module.exports = EmergentFormationDetector;
}

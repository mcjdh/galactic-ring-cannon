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

        // Detection parameters - tuned for emergent behavior
        // [FIX] Tighter detection radius for more cohesive initial clusters
        // This ensures enemies are already fairly close before being grouped
        this.detectionRadius = 100; // Reduced from 150 for tighter initial grouping
        this.minEnemiesForConstellation = 2; // Allow smaller clusters
        this.maxConstellations = 8; // Multiple simultaneous constellations
        this.detectionInterval = 0.3; // Faster detection for quicker response
        this.detectionTimer = 0;

        // Active constellations (emergent patterns)
        this.constellations = [];

        // Visual effects system
        this.effects = null; // Will be initialized when FormationEffects is available

        // [FIX] Constellation pattern templates with tighter spacing for clearer shapes
        // Separation distances tuned to work with atomicRadius (~33px for radius 15)
        this.patterns = {
            PAIR: {
                minEnemies: 2,
                maxEnemies: 2,
                strength: 0.55, // Significantly increased for authoritative shaping
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const separation = 52; // Slightly reduced for tighter pairing
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
                strength: 0.50, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const size = 48; // Tighter for clearer shape
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
                strength: 0.45, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 50; // Tighter radius
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
                strength: 0.40, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 55; // Tighter
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
                strength: 0.35, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const size = 45; // Tighter
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
                strength: 0.35, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 50; // Tighter
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
                strength: 0.30, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 55; // Tighter
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
                strength: 0.28, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const radius = 60; // Tighter
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
                strength: 0.22, // Significantly increased
                getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
                    const count = enemies.length;
                    const radius = 40 + count * 5; // Tighter base
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

        // 5. Calculate initial rotation based on enemy positions
        // [FIX] Use weighted average of enemy positions to determine natural orientation
        // This helps patterns like ARROW point in a meaningful direction
        let initialRotation;
        if (pattern.name === 'ARROW' && targetEnemies.length >= 3) {
            // For ARROW, find the enemy furthest from center and point toward it
            let furthestEnemy = targetEnemies[0];
            let maxDistSq = 0;
            for (const enemy of targetEnemies) {
                const distSq = (enemy.x - centerX) ** 2 + (enemy.y - centerY) ** 2;
                if (distSq > maxDistSq) {
                    maxDistSq = distSq;
                    furthestEnemy = enemy;
                }
            }
            initialRotation = Math.atan2(furthestEnemy.y - centerY, furthestEnemy.x - centerX);
        } else if (pattern.name === 'PAIR' && targetEnemies.length === 2) {
            // For PAIR, align along the line connecting both enemies
            initialRotation = Math.atan2(
                targetEnemies[1].y - targetEnemies[0].y,
                targetEnemies[1].x - targetEnemies[0].x
            );
        } else {
            // Default: random rotation for symmetric patterns
            initialRotation = Math.random() * Math.PI * 2;
        }

        // 6. Sort selected enemies by angle around the new center
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
            rotation: initialRotation,
            // [FIX] Slower initial rotation, will decay further as constellation matures
            rotationSpeed: (Math.random() - 0.5) * 0.6 // (-0.3 to 0.3 rad/s, was -0.5 to 0.5)
        };

        // Mark enemies as part of this constellation
        // [FIX] Store the constellation object reference, not just the ID
        // This allows atomic forces to access constellation.age for smooth transitions
        for (const enemy of targetEnemies) {
            enemy.constellation = constellation; // Now stores object, not ID
            enemy.constellationId = constellation.id; // Keep ID for string comparisons
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

            // Update center position - faster tracking to prevent stretching
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

            // [FIX] Much faster center tracking to prevent lag-induced stretching
            // Young constellations snap quickly, mature ones smooth out
            const centerSmoothing = constellation.age < 1.0 ? 0.5 : (constellation.age < 3.0 ? 0.25 : 0.15);
            constellation.centerX += (centerX - constellation.centerX) * centerSmoothing;
            constellation.centerY += (centerY - constellation.centerY) * centerSmoothing;

            // [FIX] Decay rotation speed over time for more stable mature constellations
            // Rotation slows down as the constellation ages, making it feel more "settled"
            if (constellation.age > 5.0) {
                const rotationDecay = Math.pow(0.98, deltaTime * 60); // ~2% decay per frame at 60fps
                constellation.rotationSpeed *= rotationDecay;
                // Clamp very slow rotation to zero to stop completely
                if (Math.abs(constellation.rotationSpeed) < 0.01) {
                    constellation.rotationSpeed = 0;
                }
            }

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
                const distSq = dx * dx + dy * dy;
                
                // [FIX] Use squared distance comparison for early exit
                if (distSq < 4) continue; // Already at target (within 2px)
                
                const dist = Math.sqrt(distSq);
                const dirX = dx / dist;
                const dirY = dy / dist;

                // Gentle nudge - doesn't override enemy AI, just suggests position
                const baseStrength = constellation.pattern.strength;
                
                // [FIX] Strength increases for young constellations to help them form faster
                const ageMultiplier = constellation.age < 2.0 ? 1.5 : 1.0;
                const strength = baseStrength * ageMultiplier;

                // Use velocity if available for smoother physics integration
                if (enemy.movement && enemy.movement.velocity) {
                    // [FIX] Much stronger spring constants for authoritative shape formation
                    // The constellation forces should DOMINATE over other influences
                    const distanceRatio = Math.min(dist / 80, 2.0); // Normalize to ~0-2 range
                    
                    // Strong base spring that increases with distance (pull harder when far)
                    const springK = strength * (8.0 + distanceRatio * 6.0); // 8-20 range
                    
                    // Calculate force magnitude - stronger for farther enemies
                    let forceMagnitude = springK * dist;
                    
                    // [FIX] Higher force cap for stronger shape authority
                    const softCapForce = 800;
                    if (forceMagnitude > softCapForce) {
                        // Square root falloff above soft cap
                        forceMagnitude = softCapForce + Math.sqrt((forceMagnitude - softCapForce) * 100);
                    }
                    
                    // Clamp maximum force
                    const maxForce = 1200;
                    forceMagnitude = Math.min(forceMagnitude, maxForce);

                    enemy.movement.velocity.x += dirX * forceMagnitude * deltaTime;
                    enemy.movement.velocity.y += dirY * forceMagnitude * deltaTime;

                    // [FIX] Strong damping to settle into shape quickly
                    // More damping when close to target for stable positioning
                    const baseDamping = 3.5;
                    const distanceDampingBonus = distanceRatio < 0.3 
                        ? Math.max(0, 3.0 - distanceRatio * 10) // Very strong settling damping when close
                        : distanceRatio < 1.0 ? 1.0 : 0; // Moderate damping at medium range
                    const damping = baseDamping + distanceDampingBonus;
                    
                    enemy.movement.velocity.x *= (1 - damping * deltaTime);
                    enemy.movement.velocity.y *= (1 - damping * deltaTime);
                    
                    // [FIX] Velocity cap with headroom for formation movement
                    const maxVel = 300;
                    const velMagSq = enemy.movement.velocity.x * enemy.movement.velocity.x + 
                                     enemy.movement.velocity.y * enemy.movement.velocity.y;
                    if (velMagSq > maxVel * maxVel) {
                        const velMag = Math.sqrt(velMagSq);
                        enemy.movement.velocity.x = (enemy.movement.velocity.x / velMag) * maxVel;
                        enemy.movement.velocity.y = (enemy.movement.velocity.y / velMag) * maxVel;
                    }
                } else {
                    // Fallback to direct position modification
                    const moveSpeed = strength * 60;
                    const moveAmount = Math.min(dist, moveSpeed * deltaTime);
                    enemy.x += dirX * moveAmount;
                    enemy.y += dirY * moveAmount;
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
     * [FIX] Improved thresholds for better emergent stability
     */
    cleanupConstellations() {
        this.constellations = this.constellations.filter(constellation => {
            // Helper to dismantle
            const dismantle = () => {
                for (const enemy of constellation.enemies) {
                    if (enemy) {
                        delete enemy.constellation;
                        delete enemy.constellationId;
                    }
                }
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
            const aliveCount = constellation.enemies.filter(e => e && !e.isDead).length;
            if (aliveCount < constellation.pattern.minEnemies) {
                dismantle();
                return false;
            }

            // Remove if too old (45 seconds max - increased from 30)
            if (constellation.age > 45) {
                dismantle();
                return false;
            }

            // [FIX] Grace period - don't break new constellations immediately
            // Give them 1.5 seconds to settle into position
            if (constellation.age < 1.5) {
                return true;
            }

            // 1. Edge Length Check (Visual Connection Lines)
            // If any two connected enemies are too far apart, the visual looks bad.
            // [FIX] Tighter thresholds to break stretched constellations faster
            const patternRadius = this.getPatternRadius(constellation.pattern.name, constellation.enemies.length);
            const maxEdgeLength = Math.max(120, patternRadius * 2.2); // Tighter: was 200, patternRadius * 3
            const maxEdgeLengthSq = maxEdgeLength * maxEdgeLength;
            let tooLongEdges = 0;
            for (let i = 0; i < constellation.enemies.length; i++) {
                const e1 = constellation.enemies[i];
                const e2 = constellation.enemies[(i + 1) % constellation.enemies.length];

                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    const distSq = (e1.x - e2.x) ** 2 + (e1.y - e2.y) ** 2;
                    if (distSq > maxEdgeLengthSq) {
                        tooLongEdges++;
                    }
                }
            }
            // [FIX] Stricter - only allow 1 bad edge regardless of pattern size
            if (tooLongEdges > 1) {
                dismantle();
                return false;
            }

            // 2. Target Deviation Check (Distortion)
            // If enemies are too far from where they should be in the pattern
            const targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            );

            // [FIX] Tighter deviation thresholds to break distorted constellations faster
            const maxDeviation = Math.max(80, patternRadius * 1.8); // Tighter: was 120, patternRadius * 2.5
            const maxDeviationSq = maxDeviation * maxDeviation;
            let totalDeviationSq = 0;
            let deviationCount = 0;
            for (let i = 0; i < constellation.enemies.length; i++) {
                const enemy = constellation.enemies[i];
                const target = targetPositions[i];

                if (enemy && !enemy.isDead && target) {
                    const distSq = (enemy.x - target.x) ** 2 + (enemy.y - target.y) ** 2;
                    totalDeviationSq += distSq;
                    deviationCount++;
                    
                    // Still break if any single enemy is way too far (tighter threshold)
                    const extremeDeviation = Math.max(150, patternRadius * 2.5); // Was 250, patternRadius * 4
                    if (distSq > extremeDeviation * extremeDeviation) {
                        dismantle();
                        return false;
                    }
                }
            }
            
            // Check RMS deviation (root mean square is more sensitive to outliers)
            if (deviationCount > 0) {
                const rmsDeviationSq = totalDeviationSq / deviationCount;
                if (rmsDeviationSq > maxDeviationSq) {
                    dismantle();
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Get approximate radius for a pattern type
     * Used for scaling thresholds based on pattern size
     */
    getPatternRadius(patternName, enemyCount) {
        // [FIX] Updated to match tighter pattern sizes
        const radiusMap = {
            'PAIR': 52,
            'ARROW': 48,
            'TRIANGLE': 50,
            'DIAMOND': 55,
            'CROSS': 45,
            'STAR': 50,
            'PENTAGON': 55,
            'HEXAGON': 60,
            'CIRCLE': 40 + (enemyCount || 7) * 5
        };
        return radiusMap[patternName] || 50;
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
                if (enemy) {
                    delete enemy.constellation;
                    delete enemy.constellationId;
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

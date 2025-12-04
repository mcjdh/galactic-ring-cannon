/**
 * LocalForceProducer - Unified Local Force Calculation
 * 
 * Consolidates atomic forces (separation, bonding) and flocking behaviors
 * (alignment, cohesion) into a single spatial grid traversal.
 * 
 * Replaces:
 * - applyAtomicForces() 
 * - applyFlockingBehavior()
 * 
 * Performance: ~50% reduction in neighbor queries by combining two passes into one.
 */

class LocalForceProducer {
    constructor(entity, game) {
        this.entity = entity;
        this.game = game;

        // [FIXED] Removed frame skipping - it caused stuttery, inconsistent movement
        // The performance gain wasn't worth the visual quality loss
        // Instead, we optimize the neighbor search itself

        // Tuning constants - unified from atomic + flocking
        // Separation (prevent overlap)
        this.separationRadius = (entity.radius || 15) * 2.2;  // Slightly reduced for tighter formations
        this.separationRadiusSq = this.separationRadius * this.separationRadius;
        this.separationStrength = 600;  // Reduced - was causing jitter when too high

        // Group behavior (alignment + cohesion)
        // [TUNED] Reduced cohesion to prevent tight swarming before constellation detection
        // Enemies should cluster loosely, not swarm into tight balls
        this.neighborRadius = this.separationRadius * 1.8;
        this.neighborRadiusSq = this.neighborRadius * this.neighborRadius;
        this.alignmentStrength = 35;  // Reduced from 45 - less herding behavior
        this.cohesionStrength = 6;    // Reduced from 12 - looser clustering allows better shapes

        // Overlap threshold - when enemies are THIS close, apply hard collision
        this.hardOverlapRadius = (entity.radius || 15) * 1.6;
        this.hardOverlapRadiusSq = this.hardOverlapRadius * this.hardOverlapRadius;

        // [STABILITY] Minimum distance for safe division (prevents NaN/Infinity)
        this.EPSILON = 0.1;
    }

    /**
     * Calculate all local forces from neighbors
     * Single spatial grid traversal replaces atomic + flocking
     * 
     * @param {ForceAccumulator} forceAccumulator - Target accumulator
     * @param {number} deltaTime - Time step
     */
    calculateForces(forceAccumulator, deltaTime) {
        const grid = this.game.spatialGrid;
        if (!grid || !this.game.gridSize) return;

        // [FIX] Formations/constellations still need SEPARATION to prevent overlap
        // Only skip alignment/cohesion (handled by their managers)
        const isManaged = !!(this.entity.formationId || this.entity.constellation);

        // Skip entirely if performance mode is critical (rare)
        if (this.game.performanceManager?.performanceMode === 'critical') return;

        // Calculate grid position
        const gridX = Math.floor(this.entity.x / this.game.gridSize);
        const gridY = Math.floor(this.entity.y / this.game.gridSize);

        // Force accumulators
        let separationX = 0, separationY = 0;
        let alignmentX = 0, alignmentY = 0;
        let cohesionX = 0, cohesionY = 0;
        let collisionX = 0, collisionY = 0;
        let neighborCount = 0;

        // [PERFORMANCE] Early exit tracking - limit neighbor checks
        const maxNeighbors = 12;
        let checkedNeighbors = 0;

        // SINGLE PASS through spatial grid (replaces two separate passes)
        outerLoop:
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                // [FIX] Use public encodeGridKey API instead of private _encodeGridKey
                const key = this.game.encodeGridKey(gridX + dx, gridY + dy);
                const cell = grid.get(key);
                if (!cell) continue;

                for (const other of cell) {
                    // Skip self and dead entities
                    if (other === this.entity || other.isDead || other.type !== 'enemy') continue;

                    // [PERFORMANCE] Limit total neighbor checks
                    checkedNeighbors++;
                    if (checkedNeighbors > maxNeighbors) break outerLoop;

                    // Calculate distance (squared first to avoid sqrt when possible)
                    const deltaX = this.entity.x - other.x;
                    const deltaY = this.entity.y - other.y;
                    const distSq = deltaX * deltaX + deltaY * deltaY;

                    // [PERFORMANCE] Early distance check - skip if too far for any interaction
                    if (distSq > this.neighborRadiusSq) continue;

                    // Get combined radii for actual overlap detection
                    const myRadius = this.entity.radius || 15;
                    const otherRadius = other.radius || 15;
                    const combinedRadii = myRadius + otherRadius;
                    
                    // Pre-calculate group membership for collision and separation logic
                    const sameConstellation = this.entity.constellation &&
                        this.entity.constellation === other.constellation;
                    const sameFormation = this.entity.formationId && 
                        this.entity.formationId === other.formationId;
                    const bothInSameGroup = sameConstellation || sameFormation;

                    // === HARD COLLISION FORCE (actual overlap - emergency separation) ===
                    // [SIMPLIFIED] Apply to ALL overlapping enemies, but gentler for same-group
                    if (distSq < this.hardOverlapRadiusSq && distSq > 0.01) {
                        const dist = Math.sqrt(distSq);
                        const penetration = Math.max(0, combinedRadii * 0.9 - dist);
                        
                        if (penetration > 0) {
                            // Gentler force for same-group to prevent jitter, stronger for different groups
                            const forceScale = bothInSameGroup ? 200 : 500;
                            const emergencyForce = forceScale * (penetration / combinedRadii);
                            
                            collisionX += (deltaX / dist) * emergencyForce * deltaTime;
                            collisionY += (deltaY / dist) * emergencyForce * deltaTime;
                        }
                    }

                    // === SEPARATION FORCE (close range) ===
                    // [FIX] Increased same-group separation to maintain geometric shape spacing
                    if (distSq < this.separationRadiusSq && distSq > 0.1) {
                        const dist = Math.sqrt(distSq);
                        const proximityRatio = 1 - (dist / this.separationRadius);  // 1.0 at center, 0.0 at edge

                        // Scale based on group membership
                        // [TUNED] Same group: increased separation to maintain geometric spacing
                        // This helps enemies stay at their target positions in shapes
                        // Different group: full separation to avoid overlap
                        const scale = bothInSameGroup ? 0.55 : 1.0;
                        
                        // Skip negligible forces
                        if (scale * proximityRatio < 0.05) continue;

                        // Calculate separation force - quadratic falloff for smoother behavior
                        const force = this.separationStrength * scale * proximityRatio * proximityRatio;

                        separationX += (deltaX / dist) * force;
                        separationY += (deltaY / dist) * force;
                    }

                    // === ALIGNMENT & COHESION (medium range) ===
                    if (distSq < this.neighborRadiusSq) {
                        // Alignment: match neighbor velocities (prevents crossing paths)
                        if (other.movement && other.movement.velocity) {
                            alignmentX += other.movement.velocity.x;
                            alignmentY += other.movement.velocity.y;
                        }

                        // Cohesion: move toward group center of mass
                        cohesionX += other.x;
                        cohesionY += other.y;

                        neighborCount++;
                    }
                }
            }
        }

        // === COMPUTE FINAL LOCAL FORCE ===

        let totalFx = 0;
        let totalFy = 0;

        // 1. Separation (always apply, even for managed entities)
        // This prevents enemies from overlapping regardless of formation/constellation
        totalFx += separationX * deltaTime;
        totalFy += separationY * deltaTime;

        // 2. Alignment & Cohesion (only if we have neighbors AND not managed)
        // Managed entities get their alignment/cohesion from FormationManager/EmergentFormationDetector
        if (neighborCount > 0 && !isManaged) {
            // Alignment: steer toward average heading
            alignmentX /= neighborCount;
            alignmentY /= neighborCount;

            const alignMag = Math.sqrt(alignmentX * alignmentX + alignmentY * alignmentY);
            // [STABILITY] Use EPSILON for consistent guard threshold
            if (alignMag > this.EPSILON) {
                totalFx += (alignmentX / alignMag) * this.alignmentStrength * deltaTime;
                totalFy += (alignmentY / alignMag) * this.alignmentStrength * deltaTime;
            }

            // Cohesion: steer toward center of mass
            cohesionX /= neighborCount;
            cohesionY /= neighborCount;

            const toCenterX = cohesionX - this.entity.x;
            const toCenterY = cohesionY - this.entity.y;
            const centerDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

            // [STABILITY] Use EPSILON for consistent guard threshold
            if (centerDist > this.EPSILON) {
                totalFx += (toCenterX / centerDist) * this.cohesionStrength * deltaTime;
                totalFy += (toCenterY / centerDist) * this.cohesionStrength * deltaTime;
            }
        }

        // Add to force accumulator (no caching - applied every frame)
        forceAccumulator.addForce('local', totalFx, totalFy);
        forceAccumulator.addForce('collision', collisionX, collisionY);
    }

    /**
     * Update tuning parameters
     * Allows external systems to adjust behavior
     */
    updateParameters(params) {
        if (params.separationStrength !== undefined) {
            this.separationStrength = params.separationStrength;
        }
        if (params.alignmentStrength !== undefined) {
            this.alignmentStrength = params.alignmentStrength;
        }
        if (params.cohesionStrength !== undefined) {
            this.cohesionStrength = params.cohesionStrength;
        }
        if (params.separationRadius !== undefined) {
            this.separationRadius = params.separationRadius;
            this.separationRadiusSq = this.separationRadius * this.separationRadius;
        }
        if (params.neighborRadius !== undefined) {
            this.neighborRadius = params.neighborRadius;
            this.neighborRadiusSq = this.neighborRadius * this.neighborRadius;
        }
    }

    /**
     * Get debug info about last force calculation
     */
    getDebugInfo() {
        return {
            separationRadius: this.separationRadius,
            neighborRadius: this.neighborRadius,
            separationStrength: this.separationStrength,
            alignmentStrength: this.alignmentStrength,
            cohesionStrength: this.cohesionStrength
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.LocalForceProducer = LocalForceProducer;
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalForceProducer };
}

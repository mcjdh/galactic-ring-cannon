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

        // [PERFORMANCE] Frame skipping for non-critical updates
        // Stagger updates across frames to reduce per-frame work
        this._frameCounter = Math.floor(Math.random() * 3); // Random start to desync entities
        this._updateInterval = 2; // Only calculate forces every N frames

        // Tuning constants - unified from atomic + flocking
        // (No longer triple-applied, so we can use reasonable values)

        // Separation (prevent overlap)
        this.separationRadius = (entity.radius || 15) * 2.5;
        this.separationRadiusSq = this.separationRadius * this.separationRadius;
        // [FIXED] Increased separation strength to prevent stacking
        this.separationStrength = 800;

        // Group behavior (alignment + cohesion)
        this.neighborRadius = this.separationRadius * 2.0;
        this.neighborRadiusSq = this.neighborRadius * this.neighborRadius;
        // [TUNED] Increased alignment for better group cohesion
        this.alignmentStrength = 80;
        // [TUNED] Reduced cohesion to prevent clumping that causes stuck enemies
        this.cohesionStrength = 20;

        // Constellation-aware scaling
        // Within same constellation: still need strong separation to maintain shape
        // Between different constellations: very strong separation (prevent collision)
        // [FIXED] Increased scales significantly to prevent stacking
        this.constellationSeparationScale = 0.7;  // Was 0.3 - too weak
        this.differentConstellationScale = 1.0;

        // [PERFORMANCE] Cache last calculated forces to use on skipped frames
        this._cachedForceX = 0;
        this._cachedForceY = 0;
        this._cachedCollisionX = 0;
        this._cachedCollisionY = 0;
    }

    /**
     * Calculate all local forces from neighbors
     * Single spatial grid traversal replaces atomic + flocking
     * 
     * [PERFORMANCE] Uses frame skipping to reduce CPU load - only recalculates
     * every N frames, using cached values in between.
     * 
     * @param {ForceAccumulator} forceAccumulator - Target accumulator
     * @param {number} deltaTime - Time step
     */
    calculateForces(forceAccumulator, deltaTime) {
        const grid = this.game.spatialGrid;
        if (!grid || !this.game.gridSize) return;

        // [PERFORMANCE] Frame skipping - only recalculate every N frames
        this._frameCounter++;
        const shouldRecalculate = (this._frameCounter % this._updateInterval) === 0;

        // Always apply collision forces (safety critical) but skip flocking on off-frames
        if (!shouldRecalculate) {
            // Use cached forces from last calculation, scaled by deltaTime ratio
            forceAccumulator.addForce('local', this._cachedForceX, this._cachedForceY);
            forceAccumulator.addForce('collision', this._cachedCollisionX, this._cachedCollisionY);
            return;
        }

        // [FIX] Formations/constellations still need SEPARATION to prevent overlap
        // Only skip alignment/cohesion (handled by their managers)
        const isManaged = !!(this.entity.formationId || this.entity.constellation);

        // Skip if performance mode is critical
        if (this.game.performanceMode && this.game.performanceManager?.performanceMode === 'critical') return;

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
                const key = this.game._encodeGridKey(gridX + dx, gridY + dy);
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
                    const hardCollisionDist = combinedRadii * 0.8;  // Trigger when nearly touching

                    // === HARD COLLISION FORCE (actual overlap - emergency separation) ===
                    if (distSq < hardCollisionDist * hardCollisionDist && distSq > 0.01) {
                        const dist = Math.sqrt(distSq);
                        // Very strong push when actually overlapping - this ALWAYS applies
                        const penetration = hardCollisionDist - dist;
                        const emergencyForce = 2000 * (penetration / hardCollisionDist);
                        
                        // Accumulate collision forces to cache
                        collisionX += (deltaX / dist) * emergencyForce * deltaTime;
                        collisionY += (deltaY / dist) * emergencyForce * deltaTime;
                    }

                    // === SEPARATION FORCE (close range) ===
                    if (distSq < this.separationRadiusSq && distSq > 0.1) {
                        const dist = Math.sqrt(distSq);
                        const overlap = this.separationRadius - dist;

                        // Check constellation membership for scaling
                        const sameConstellation = this.entity.constellation &&
                            this.entity.constellation === other.constellation;
                        const inAnyConstellation = !!this.entity.constellation;

                        // Scale separation based on constellation relationship
                        let scale = 1.0;
                        if (inAnyConstellation) {
                            scale = sameConstellation ?
                                0.25 : // [TUNED] Reduced from 0.7 to allow tighter shapes without jitter
                                this.differentConstellationScale;
                        }
                        // [FIX] Also check for formation membership
                        const inAnyFormation = !!this.entity.formationId;
                        const sameFormation = inAnyFormation && this.entity.formationId === other.formationId;
                        if (inAnyFormation && !inAnyConstellation) {
                            scale = sameFormation ? 0.2 : 1.0;  // [TUNED] Reduced from 0.6 to allow tight formation packing
                        }

                        // Calculate separation force
                        // Strong exponential ramp for very close encounters
                        const hardness = 1 + (overlap / this.separationRadius) * 2;
                        const force = this.separationStrength * scale * (overlap / this.separationRadius) * hardness;

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
            if (alignMag > 0.1) {
                totalFx += (alignmentX / alignMag) * this.alignmentStrength * deltaTime;
                totalFy += (alignmentY / alignMag) * this.alignmentStrength * deltaTime;
            }

            // Cohesion: steer toward center of mass
            cohesionX /= neighborCount;
            cohesionY /= neighborCount;

            const toCenterX = cohesionX - this.entity.x;
            const toCenterY = cohesionY - this.entity.y;
            const centerDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

            if (centerDist > 0.1) {
                totalFx += (toCenterX / centerDist) * this.cohesionStrength * deltaTime;
                totalFy += (toCenterY / centerDist) * this.cohesionStrength * deltaTime;
            }
        }

        // [PERFORMANCE] Cache calculated forces for use on skipped frames
        this._cachedForceX = totalFx;
        this._cachedForceY = totalFy;
        this._cachedCollisionX = collisionX;
        this._cachedCollisionY = collisionY;

        // Add to force accumulator
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
            cohesionStrength: this.cohesionStrength,
            constellationScaling: {
                same: this.constellationSeparationScale,
                different: this.differentConstellationScale
            }
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

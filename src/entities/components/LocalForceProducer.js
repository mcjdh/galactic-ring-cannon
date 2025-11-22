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

        // Tuning constants - unified from atomic + flocking
        // (No longer triple-applied, so we can use reasonable values)

        // Separation (prevent overlap)
        this.separationRadius = (entity.radius || 15) * 2.5;
        this.separationRadiusSq = this.separationRadius * this.separationRadius;
        this.separationStrength = 600;  // Unified strength (was 1500 + 200 + collision)

        // Group behavior (alignment + cohesion)
        this.neighborRadius = this.separationRadius * 2.0;
        this.neighborRadiusSq = this.neighborRadius * this.neighborRadius;
        this.alignmentStrength = 80;   // Match neighbor velocities
        this.cohesionStrength = 40;    // Move toward group center

        // Constellation-aware scaling
        this.constellationSeparationScale = 0.08;  // Very low separation within constellation
        this.differentConstellationScale = 0.6;    // Medium separation between constellations
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

        // Skip if entity is managed by formation/constellation
        // (Their forces are applied by the managers)
        if (this.entity.formationId || this.entity.constellation) return;

        // Skip if performance mode is critical
        if (this.game.performanceMode && this.game.performanceManager?.performanceMode === 'critical') return;

        // Calculate grid position
        const gridX = Math.floor(this.entity.x / this.game.gridSize);
        const gridY = Math.floor(this.entity.y / this.game.gridSize);

        // Force accumulators
        let separationX = 0, separationY = 0;
        let alignmentX = 0, alignmentY = 0;
        let cohesionX = 0, cohesionY = 0;
        let neighborCount = 0;

        // SINGLE PASS through spatial grid (replaces two separate passes)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = this.game._encodeGridKey(gridX + dx, gridY + dy);
                const cell = grid.get(key);
                if (!cell) continue;

                for (const other of cell) {
                    // Skip self and dead entities
                    if (other === this.entity || other.isDead || other.type !== 'enemy') continue;

                    // Calculate distance
                    const deltaX = this.entity.x - other.x;
                    const deltaY = this.entity.y - other.y;
                    const distSq = deltaX * deltaX + deltaY * deltaY;

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
                                this.constellationSeparationScale :
                                this.differentConstellationScale;
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

        // 1. Separation (always apply)
        totalFx += separationX * deltaTime;
        totalFy += separationY * deltaTime;

        // 2. Alignment & Cohesion (only if we have neighbors)
        if (neighborCount > 0) {
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

        // Add to force accumulator
        forceAccumulator.addForce('local', totalFx, totalFy);
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

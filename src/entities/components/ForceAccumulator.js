/**
 * ForceAccumulator - Unified Force Management System
 * 
 * Replaces fragmented force application (atomic, flocking, collision, etc.)
 * with a clean accumulator pattern that prevents force conflicts.
 * 
 * Design Pattern:
 * 1. Force Producers calculate forces (don't apply)
 * 2. Force Arbiter resolves conflicts via priority weights
 * 3. Physics Integrator applies accumulated force (single step)
 */

class ForceAccumulator {
    constructor(entity) {
        this.entity = entity;

        // Accumulated net force vector (reset each frame)
        this.netForce = { x: 0, y: 0 };

        // Force contributions by source (for debugging and priority resolution)
        this.forces = {
            // Local forces (separation, alignment, cohesion from neighbors)
            local: { x: 0, y: 0 },

            // Managed structure forces (formation steering)
            formation: { x: 0, y: 0 },

            // Emergent structure forces (constellation spring)
            constellation: { x: 0, y: 0 },

            // Emergency collision separation (hard constraint)
            collision: { x: 0, y: 0 },

            // Environmental forces (gravity wells, wind, etc.)
            external: { x: 0, y: 0 }
        };

        // Priority weights (0.0 = suppressed, 1.0 = active)
        // Managed structures (formation/constellation) suppress local behavior
        this.weights = {
            local: 1.0,
            formation: 0.0,      // Set to 1.0 when entity.formationId exists
            constellation: 0.0,  // Set to 1.0 when entity.constellation exists
            collision: 1.0,      // Always active (safety override)
            external: 1.0        // Always active (environmental effects)
        };
        // [INCREASED] Managed entities need stronger local forces for separation
        // 0.8 allows separation forces to prevent overlap while letting formation forces steer
        this.managedLocalWeight = 0.8;

        // Debug tracking
        this.debugEnabled = false;
        this.frameHistory = [];
        this.maxHistoryFrames = 60;
    }

    /**
     * Add force from a named source
     * @param {string} source - Force source name ('local', 'formation', etc.)
     * @param {number} fx - Force X component
     * @param {number} fy - Force Y component
     */
    addForce(source, fx, fy) {
        if (!this.forces[source]) {
            if (window.logger?.isDebugEnabled?.('forces')) {
                window.logger.warn(`[ForceAccumulator] Unknown force source: ${source}`);
            }
            return;
        }

        // Validate inputs
        if (!Number.isFinite(fx) || !Number.isFinite(fy)) {
            if (window.logger?.isDebugEnabled?.('forces')) {
                window.logger.warn(`[ForceAccumulator] Invalid force from ${source}: fx=${fx}, fy=${fy}`);
            }
            return;
        }

        this.forces[source].x += fx;
        this.forces[source].y += fy;
    }

    /**
     * Compute net force with priority rules
     * 
     * Priority Rules:
     * 1. Managed structures (formation/constellation) suppress STEERING local forces
     * 2. Separation forces always apply (prevent overlap) - handled by LocalForceProducer
     * 3. Collision forces always apply (safety)
     * 4. External forces always apply (environmental effects)
     * 
     * @returns {{x: number, y: number}} Net force vector
     */
    computeNetForce() {
        this.netForce.x = 0;
        this.netForce.y = 0;

        // Check if entity is in a managed structure
        const isManaged = this.weights.formation > 0 || this.weights.constellation > 0;

        // [FIX] Local forces are NOT fully suppressed when managed anymore
        // LocalForceProducer handles the separation logic and adds reduced separation
        // for managed entities. We apply local forces at higher weight so separation
        // can properly prevent overlap.
        const localWeight = this._getLocalWeight(isManaged);

        // Accumulate weighted forces
        this.netForce.x += this.forces.local.x * localWeight;
        this.netForce.y += this.forces.local.y * localWeight;

        this.netForce.x += this.forces.formation.x * this.weights.formation;
        this.netForce.y += this.forces.formation.y * this.weights.formation;

        this.netForce.x += this.forces.constellation.x * this.weights.constellation;
        this.netForce.y += this.forces.constellation.y * this.weights.constellation;

        // Collision and external always apply (no suppression)
        this.netForce.x += this.forces.collision.x * this.weights.collision;
        this.netForce.y += this.forces.collision.y * this.weights.collision;

        this.netForce.x += this.forces.external.x * this.weights.external;
        this.netForce.y += this.forces.external.y * this.weights.external;

        // Record for debugging if enabled
        if (this.debugEnabled) {
            this._recordFrame();
        }

        return this.netForce;
    }

    /**
     * Reset force accumulator for next frame
     */
    reset() {
        // Reset all force contributions
        for (const force of Object.values(this.forces)) {
            force.x = 0;
            force.y = 0;
        }

        this.netForce.x = 0;
        this.netForce.y = 0;
    }

    /**
     * Update priority weights based on entity state
     * Called each frame before force accumulation
     */
    updateWeights() {
        // Formation takes priority
        this.weights.formation = this.entity.formationId ? 1.0 : 0.0;

        // Constellation takes priority (if not in formation)
        this.weights.constellation = (this.entity.constellation && !this.entity.formationId) ? 1.0 : 0.0;

        // Note: If somehow both exist, formation wins (checked first)
        if (this.entity.formationId && this.entity.constellation) {
            if (window.logger?.isDebugEnabled?.('forces')) {
                window.logger.warn(`[ForceAccumulator] Entity ${this.entity.id} has both formationId and constellation!`);
            }
            this.weights.constellation = 0.0;
        }
    }

    /**
     * Get force summary for debugging
     * @returns {Object} Summary of all force contributions
     */
    getDebugSummary() {
        const isManaged = this.weights.formation > 0 || this.weights.constellation > 0;
        const localWeight = this._getLocalWeight(isManaged);

        return {
            netForce: { ...this.netForce },
            sources: {
                local: {
                    force: { ...this.forces.local },
                    weight: localWeight,
                    active: localWeight > 0
                },
                formation: {
                    force: { ...this.forces.formation },
                    weight: this.weights.formation,
                    active: this.weights.formation > 0
                },
                constellation: {
                    force: { ...this.forces.constellation },
                    weight: this.weights.constellation,
                    active: this.weights.constellation > 0
                },
                collision: {
                    force: { ...this.forces.collision },
                    weight: this.weights.collision,
                    active: this.weights.collision > 0
                },
                external: {
                    force: { ...this.forces.external },
                    weight: this.weights.external,
                    active: this.weights.external > 0
                }
            },
            isManaged
        };
    }

    /**
     * Return the active local weight, accounting for managed entities
     * @param {boolean} isManaged
     * @returns {number}
     */
    _getLocalWeight(isManaged) {
        return isManaged ? this.managedLocalWeight : this.weights.local;
    }

    /**
     * Enable debug tracking
     */
    enableDebug() {
        this.debugEnabled = true;
        this.frameHistory = [];
    }

    /**
     * Disable debug tracking
     */
    disableDebug() {
        this.debugEnabled = false;
        this.frameHistory = [];
    }

    /**
     * Record frame data for debugging
     * @private
     */
    _recordFrame() {
        const frame = {
            timestamp: performance.now(),
            forces: {},
            netForce: { ...this.netForce }
        };

        // Copy all force sources
        for (const [name, force] of Object.entries(this.forces)) {
            frame.forces[name] = { ...force };
        }

        this.frameHistory.push(frame);

        // Limit history size
        if (this.frameHistory.length > this.maxHistoryFrames) {
            this.frameHistory.shift();
        }
    }

    /**
     * Get force history for analysis
     * @returns {Array} Frame history
     */
    getHistory() {
        return this.frameHistory;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.ForceAccumulator = ForceAccumulator;
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ForceAccumulator };
}

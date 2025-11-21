/**
 * Formation Configurations for Polybius Geometric Enemy Formations
 * 
 * Defines geometric patterns for enemy swarms inspired by the
 * background wireframe shapes (cubes, pyramids, octahedrons).
 */

(function () {
    const FORMATION_CONFIGS = {
        // Cubic Swarm - 8 enemies at cube corners
        CUBIC_SWARM: {
            id: 'cubic_swarm',
            name: 'Cubic Swarm',
            enemyCount: 8,
            radius: 60,
            rotationSpeed: 0.3, // radians per second
            moveSpeed: 80, // pixels per second toward player
            breakDistance: 150, // pixels from player to break formation
            minWave: 1, // TEST: Spawn from wave 1 for testing
            spawnWeight: 2.0, // TEST: Increased for testing

            // Position calculation: 8 corners of a cube projected to 2D
            getPositions(centerX, centerY, rotation, time = 0) {
                // Add breathing effect
                const pulse = 1 + Math.sin(time * 2) * 0.1;
                const r = this.radius * pulse;
                
                const positions = [];
                // Cube corners in 3D, projected to 2D with rotation
                const angles = [
                    { x: 1, y: 1 },   // Front top-right
                    { x: -1, y: 1 },  // Front top-left
                    { x: 1, y: -1 },  // Front bottom-right
                    { x: -1, y: -1 }, // Front bottom-left
                    { x: 0.7, y: 0.7 },   // Back top-right (smaller for depth)
                    { x: -0.7, y: 0.7 },  // Back top-left
                    { x: 0.7, y: -0.7 },  // Back bottom-right
                    { x: -0.7, y: -0.7 }  // Back bottom-left
                ];

                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);

                for (const offset of angles) {
                    // Apply rotation
                    const x = offset.x * cos - offset.y * sin;
                    const y = offset.x * sin + offset.y * cos;

                    positions.push({
                        x: centerX + x * r,
                        y: centerY + y * r
                    });
                }

                return positions;
            }
        },

        // Pyramid Squadron - 5 enemies (1 leader, 4 base)
        PYRAMID_SQUADRON: {
            id: 'pyramid_squadron',
            name: 'Pyramid Squadron',
            enemyCount: 5,
            radius: 50,
            rotationSpeed: 0.2,
            moveSpeed: 100,
            breakDistance: 120,
            minWave: 1,
            spawnWeight: 3.0, // TEST: Very common for testing

            getPositions(centerX, centerY, rotation, time = 0) {
                // Add breathing effect
                const pulse = 1 + Math.sin(time * 1.5) * 0.05;
                const r = this.radius * pulse;
                
                const positions = [];

                // Apex (leader) - slightly forward
                positions.push({
                    x: centerX,
                    y: centerY - r * 0.5,
                    isLeader: true
                });

                // Base - 4 corners of diamond
                const baseAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
                for (const angle of baseAngles) {
                    const totalAngle = angle + rotation;
                    positions.push({
                        x: centerX + Math.cos(totalAngle) * r,
                        y: centerY + Math.sin(totalAngle) * r,
                        isLeader: false
                    });
                }

                return positions;
            }
        },

        // Octahedron Ring - 6 enemies in hexagonal pattern
        OCTAHEDRON_RING: {
            id: 'octahedron_ring',
            name: 'Octahedron Ring',
            enemyCount: 6,
            radius: 55,
            rotationSpeed: 0.4,
            moveSpeed: 90,
            breakDistance: 140,
            minWave: 1, // TEST: Spawn from wave 1
            spawnWeight: 1.5, // TEST: Increased for testing
            pulseAmplitude: 10, // Breathing effect
            pulseSpeed: 2.0, // Hz

            getPositions(centerX, centerY, rotation, time = 0) {
                const baseRadius = this.radius;
                // Pulsing/breathing effect
                const pulse = Math.sin(time * this.pulseSpeed) * this.pulseAmplitude;
                const r = baseRadius + pulse;

                const positions = [];
                const angleStep = (Math.PI * 2) / 6; // Hexagon

                for (let i = 0; i < 6; i++) {
                    const angle = i * angleStep + rotation;
                    positions.push({
                        x: centerX + Math.cos(angle) * r,
                        y: centerY + Math.sin(angle) * r
                    });
                }

                return positions;
            }
        },

        // Line Wedge - 3 enemies in V-formation
        LINE_WEDGE: {
            id: 'line_wedge',
            name: 'Line Wedge',
            enemyCount: 3,
            radius: 40,
            rotationSpeed: 0.0, // No rotation, always points at player
            moveSpeed: 140, // Fast!
            breakDistance: 100,
            minWave: 1,
            spawnWeight: 4.0, // TEST: Very common for testing

            getPositions(centerX, centerY, rotation, time = 0) {
                // Add slight oscillation to wings
                const wingOscillation = Math.sin(time * 5) * 0.1;
                const r = this.radius;
                const positions = [];

                // V-formation pointing toward player
                // Leader at front
                positions.push({
                    x: centerX,
                    y: centerY,
                    isLeader: true
                });

                // Two followers at 45-degree angles behind
                const wingAngle = Math.PI / 4 + wingOscillation; // 45 degrees +/- oscillation
                positions.push({
                    x: centerX - Math.cos(rotation + wingAngle) * r,
                    y: centerY - Math.sin(rotation + wingAngle) * r
                });
                positions.push({
                    x: centerX - Math.cos(rotation - wingAngle) * r,
                    y: centerY - Math.sin(rotation - wingAngle) * r
                });

                return positions;
            }
        }
    };

    // Utility functions for formation selection
    const FormationUtils = {
        /**
         * Get available formations for current wave
         * @param {number} waveNumber - Current wave
         * @returns {Array} Available formation configs
         */
        getAvailableFormations(waveNumber) {
            return Object.values(FORMATION_CONFIGS).filter(config =>
                waveNumber >= config.minWave
            );
        },

        /**
         * Select random formation weighted by spawn probability
         * @param {number} waveNumber - Current wave
         * @returns {Object} Formation config or null
         */
        selectRandomFormation(waveNumber) {
            const available = this.getAvailableFormations(waveNumber);
            if (available.length === 0) return null;

            // Weighted random selection
            const totalWeight = available.reduce((sum, config) => sum + config.spawnWeight, 0);
            let random = Math.random() * totalWeight;

            for (const config of available) {
                random -= config.spawnWeight;
                if (random <= 0) {
                    return config;
                }
            }

            return available[available.length - 1]; // Fallback
        },

        /**
         * Calculate formation spawn position (off-screen)
         * @param {Object} player - Player object
         * @param {number} canvasWidth - Canvas width
         * @param {number} canvasHeight - Canvas height
         * @returns {Object} Position {x, y}
         */
        getFormationSpawnPosition(player, canvasWidth, canvasHeight) {
            // Spawn formations further out than individual enemies
            const minDistance = 400;
            const maxDistance = 600;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const angle = Math.random() * Math.PI * 2;

            return {
                x: player.x + Math.cos(angle) * distance,
                y: player.y + Math.sin(angle) * distance,
                initialAngle: angle // For formation rotation initialization
            };
        }
    };

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.FORMATION_CONFIGS = FORMATION_CONFIGS;
        window.FormationUtils = FormationUtils;

        if (window.logger) {
            window.logger.log('Formation configs loaded:', Object.keys(FORMATION_CONFIGS).length, 'formations');
        }
    }
})();

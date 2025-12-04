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
            radius: 70,
            rotationSpeed: 0.5,
            moveSpeed: 90,
            breakDistance: 130,
            minWave: 2,
            spawnWeight: 1.5,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + rotation;
                    // Add wave motion to radius
                    const r = this.radius + Math.sin(time * 3 + i) * 10;
                    
                    positions.push({
                        x: centerX + Math.cos(angle) * r,
                        y: centerY + Math.sin(angle) * r
                    });
                }
                return positions;
            }
        },

        // [NEW] Hex Lattice - Dense atomic structure
        // 1 Center, 6 Inner Ring, 12 Outer Ring = 19 Enemies
        HEX_LATTICE: {
            id: 'hex_lattice',
            name: 'Hex Lattice',
            enemyCount: 19,
            radius: 40, // Spacing between nodes
            rotationSpeed: 0.1,
            moveSpeed: 60, // Slow, imposing wall
            breakDistance: 180,
            minWave: 4,
            spawnWeight: 1.2,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                const spacing = this.radius;
                
                // Center
                positions.push({ x: centerX, y: centerY, isLeader: true });

                // Ring 1 (6 neighbors)
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + rotation;
                    positions.push({
                        x: centerX + Math.cos(angle) * spacing,
                        y: centerY + Math.sin(angle) * spacing
                    });
                }

                // Ring 2 (12 neighbors)
                // Hexagonal coordinates: 2 steps in direction i, then walk along edge
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + rotation;
                    // Corner of ring 2
                    const cornerX = centerX + Math.cos(angle) * (spacing * 2);
                    const cornerY = centerY + Math.sin(angle) * (spacing * 2);
                    positions.push({ x: cornerX, y: cornerY });

                    // Midpoint between corners
                    const nextAngle = ((i + 1) / 6) * Math.PI * 2 + rotation;
                    const nextCornerX = centerX + Math.cos(nextAngle) * (spacing * 2);
                    const nextCornerY = centerY + Math.sin(nextAngle) * (spacing * 2);
                    
                    positions.push({
                        x: (cornerX + nextCornerX) / 2,
                        y: (cornerY + nextCornerY) / 2
                    });
                }

                return positions;
            }
        },

        // [NEW] Double Helix - DNA Strand
        DOUBLE_HELIX: {
            id: 'double_helix',
            name: 'Double Helix',
            enemyCount: 12,
            radius: 100, // Width of helix
            rotationSpeed: 0, // Direction of travel handled by rotation
            moveSpeed: 110,
            breakDistance: 100,
            minWave: 3,
            spawnWeight: 1.0,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                const length = 300; // Length of strand
                const spacing = length / 6; // 6 pairs
                
                // Direction vector
                const dirX = Math.cos(rotation);
                const dirY = Math.sin(rotation);
                // Perpendicular vector
                const perpX = -dirY;
                const perpY = dirX;

                for (let i = 0; i < 6; i++) {
                    // Position along the line (centered)
                    const dist = (i - 2.5) * spacing;
                    const baseX = centerX + dirX * dist;
                    const baseY = centerY + dirY * dist;

                    // Sine wave offset
                    const phase = time * 2 + (i * 0.5);
                    const offset = Math.sin(phase) * 40;

                    // Strand 1
                    positions.push({
                        x: baseX + perpX * offset,
                        y: baseY + perpY * offset
                    });

                    // Strand 2 (Opposite phase)
                    positions.push({
                        x: baseX - perpX * offset,
                        y: baseY - perpY * offset
                    });
                }
                return positions;
            }
        },

        // [NEW] Electron Shell - Heavy Nucleus with orbiting electrons
        ELECTRON_SHELL: {
            id: 'electron_shell',
            name: 'Electron Shell',
            enemyCount: 9, // 1 Nucleus + 8 Electrons
            radius: 80,
            rotationSpeed: 0,
            moveSpeed: 75,
            breakDistance: 140,
            minWave: 5,
            spawnWeight: 0.8,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                
                // Nucleus (Center) - Should be a tanky enemy ideally
                positions.push({ 
                    x: centerX, 
                    y: centerY, 
                    isLeader: true,
                    type: 'tank' // Hint for spawner
                });

                // Shell 1 (2 electrons, fast orbit)
                for (let i = 0; i < 2; i++) {
                    const angle = time * 3 + (i * Math.PI);
                    const r = 40;
                    positions.push({
                        x: centerX + Math.cos(angle) * r,
                        y: centerY + Math.sin(angle) * r,
                        type: 'fast'
                    });
                }

                // Shell 2 (6 electrons, slower orbit, counter-rotate)
                for (let i = 0; i < 6; i++) {
                    const angle = -time * 1.5 + (i / 6) * Math.PI * 2;
                    const r = 80;
                    positions.push({
                        x: centerX + Math.cos(angle) * r,
                        y: centerY + Math.sin(angle) * r,
                        type: 'fast'
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
        },

        // [NEW] Vortex Swarm - Spiraling inward
        VORTEX_SWARM: {
            id: 'vortex_swarm',
            name: 'Vortex Swarm',
            enemyCount: 16,
            radius: 120,
            rotationSpeed: 0.8, // Fast rotation
            moveSpeed: 70,
            breakDistance: 160,
            minWave: 6,
            spawnWeight: 1.0,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                const arms = 4;
                const enemiesPerArm = 4;
                
                for (let arm = 0; arm < arms; arm++) {
                    for (let i = 0; i < enemiesPerArm; i++) {
                        // Calculate position along the spiral arm
                        const progress = i / enemiesPerArm; // 0 to 1 (inner to outer)
                        const armAngle = (arm / arms) * Math.PI * 2;
                        const spiralOffset = progress * Math.PI; // Twist
                        
                        const angle = rotation + armAngle + spiralOffset + (time * 0.5 * (1 - progress));
                        const r = 30 + (this.radius * progress) + (Math.sin(time * 2 + i) * 5);
                        
                        positions.push({
                            x: centerX + Math.cos(angle) * r,
                            y: centerY + Math.sin(angle) * r,
                            type: i === 0 ? 'tank' : 'fast' // Inner enemies are tanks
                        });
                    }
                }
                return positions;
            }
        },

        // [NEW] Hydra Head - Central boss-like structure with weaving tendrils
        HYDRA_HEAD: {
            id: 'hydra_head',
            name: 'Hydra Head',
            enemyCount: 13, // 1 Head + 3 tendrils of 4
            radius: 80,
            rotationSpeed: 0.1,
            moveSpeed: 50, // Slow and menacing
            breakDistance: 150,
            minWave: 8,
            spawnWeight: 0.8,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                
                // Head (Center)
                positions.push({ 
                    x: centerX, 
                    y: centerY, 
                    isLeader: true,
                    type: 'tank' 
                });

                // 3 Tendrils
                const tendrils = 3;
                const length = 4;
                const spacing = 25;
                
                for (let t = 0; t < tendrils; t++) {
                    const baseAngle = (t / tendrils) * Math.PI * 2 + rotation;
                    
                    for (let i = 1; i <= length; i++) {
                        // Waving motion
                        const wave = Math.sin(time * 3 + i * 0.5) * 0.5;
                        const angle = baseAngle + wave * (i * 0.1);
                        const dist = i * spacing + 20;
                        
                        positions.push({
                            x: centerX + Math.cos(angle) * dist,
                            y: centerY + Math.sin(angle) * dist,
                            type: 'dasher'
                        });
                    }
                }
                return positions;
            }
        },

        // [NEW] Bio Orb - Pulsing organic sphere
        BIO_ORB: {
            id: 'bio_orb',
            name: 'Bio Orb',
            enemyCount: 12,
            radius: 60,
            rotationSpeed: 0.4,
            moveSpeed: 85,
            breakDistance: 140,
            minWave: 4,
            spawnWeight: 1.2,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                // 3 layers of 4 enemies
                for (let layer = 0; layer < 3; layer++) {
                    const layerRadius = this.radius * (0.5 + layer * 0.3);
                    // Pulse effect varies by layer
                    const pulse = 1 + Math.sin(time * 3 + layer) * 0.15;
                    const r = layerRadius * pulse;
                    
                    // Rotate layers in alternating directions
                    const layerRotation = rotation * (layer % 2 === 0 ? 1 : -1);
                    
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2 + layerRotation + (layer * Math.PI / 4);
                        positions.push({
                            x: centerX + Math.cos(angle) * r,
                            y: centerY + Math.sin(angle) * r,
                            type: layer === 0 ? 'tank' : 'basic'
                        });
                    }
                }
                return positions;
            }
        },

        // [NEW] Interceptor Cross - Rotating X formation
        INTERCEPTOR_CROSS: {
            id: 'interceptor_cross',
            name: 'Interceptor Cross',
            enemyCount: 9, // Center + 2 per arm * 4 arms
            radius: 90,
            rotationSpeed: 1.2, // Very fast rotation
            moveSpeed: 110, // Fast approach
            breakDistance: 120,
            minWave: 5,
            spawnWeight: 1.0,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                
                // Center
                positions.push({ x: centerX, y: centerY, isLeader: true });

                // 4 Arms
                for (let arm = 0; arm < 4; arm++) {
                    const armAngle = (arm / 4) * Math.PI * 2 + rotation;
                    
                    // 2 enemies per arm
                    for (let i = 1; i <= 2; i++) {
                        const dist = i * 40;
                        positions.push({
                            x: centerX + Math.cos(armAngle) * dist,
                            y: centerY + Math.sin(armAngle) * dist,
                            type: 'fast'
                        });
                    }
                }
                return positions;
            }
        },

        // [NEW] Chaos Cloud - Swarming loose formation
        CHAOS_CLOUD: {
            id: 'chaos_cloud',
            name: 'Chaos Cloud',
            enemyCount: 15,
            radius: 100,
            rotationSpeed: 0.1,
            moveSpeed: 60,
            breakDistance: 180,
            minWave: 7,
            spawnWeight: 0.9,

            getPositions(centerX, centerY, rotation, time = 0) {
                const positions = [];
                // Deterministic chaos using sine waves
                for (let i = 0; i < this.enemyCount; i++) {
                    // Unique offsets for each enemy
                    const offset1 = i * 1.1;
                    const offset2 = i * 2.3;
                    
                    // Lissajous-like movement relative to center
                    const angle = rotation + offset1 + time * 0.5;
                    const r = this.radius * (0.4 + 0.6 * Math.abs(Math.sin(time * 0.8 + offset2)));
                    
                    // Add some jitter
                    const jitterX = Math.sin(time * 4 + offset1) * 10;
                    const jitterY = Math.cos(time * 3 + offset2) * 10;

                    positions.push({
                        x: centerX + Math.cos(angle) * r + jitterX,
                        y: centerY + Math.sin(angle) * r + jitterY,
                        type: i % 3 === 0 ? 'dasher' : 'basic'
                    });
                }
                return positions;
            }
        },
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

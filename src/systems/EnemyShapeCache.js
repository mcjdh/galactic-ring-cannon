/**
 * [ENEMY VISUAL ENHANCEMENT] EnemyShapeCache
 * 
 * Pre-renders animated 3D wireframe geometry for enemies, similar to CosmicBackground.
 * Each enemy type has a unique geometric shape that rotates and animates.
 * 
 * Design:
 * - Sprite caching with rotation quantization for efficient rendering
 * - Shared cache across all enemies (memory efficient)
 * - Different 3D shapes for each enemy type (visual variety)
 * - Continuous rotation animation (retro hyperdimensional vibe)
 * 
 * Performance:
 * - Renders enemies using drawImage() from pre-rendered sprites
 * - LRU eviction to bound memory usage
 * - FastMath integration for trig operations
 * - Graceful degradation under high load
 */

// Shared cache across all EnemyShapeCache instances
const _enemyShapeCache = new Map();
const _enemyShapeCacheAccessTime = new Map();
let _enemyShapeCacheAccessCounter = 0;

class EnemyShapeCache {
    constructor() {
        // Configuration
        this.rotationSteps = 12; // 12 angles = 30° increments (retro stepped animation feel, minimal cache)
        this.twoPI = Math.PI * 2;
        this._invRotationSteps = this.rotationSteps / this.twoPI;

        // Pre-compute rotation angles
        this.cachedRotationAngles = new Float32Array(this.rotationSteps);
        for (let i = 0; i < this.rotationSteps; i++) {
            this.cachedRotationAngles[i] = (i / this.rotationSteps) * this.twoPI;
        }

        // Cache settings
        this.spriteCache = _enemyShapeCache;
        this._spriteCacheAccessTime = _enemyShapeCacheAccessTime;
        this.spriteCacheMaxSize = 300;
        this.spriteCacheEvictCount = 40;

        // FastMath reference
        this._fastMath = null;
        this._updateFastMathRef();

        // Shape definitions per enemy type
        // Each array entry is a 3D vertex {x, y, z}
        this.shapeDefinitions = this._initShapeDefinitions();

        // Edge definitions per shape type (indices into vertex array)
        this.edgeDefinitions = this._initEdgeDefinitions();
    }

    _updateFastMathRef() {
        this._fastMath = (typeof window !== 'undefined' && window.Game?.FastMath) || null;
    }

    /**
     * Define 3D vertices for each enemy type's shape.
     * Vertices are normalized (unit scale), scaled at render time.
     */
    _initShapeDefinitions() {
        const s = 1.0; // Unit scale

        return {
            // BASIC: Tesseract (4D hypercube projection to 3D)
            // Shows 8 outer + 8 inner vertices for a "cube within cube" look
            basic: {
                type: 'tesseract',
                vertices: [
                    // Outer cube
                    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
                    { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
                    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
                    { x: s, y: s, z: s }, { x: -s, y: s, z: s },
                    // Inner cube (scaled down for tesseract projection)
                    { x: -s * 0.5, y: -s * 0.5, z: -s * 0.5 }, { x: s * 0.5, y: -s * 0.5, z: -s * 0.5 },
                    { x: s * 0.5, y: s * 0.5, z: -s * 0.5 }, { x: -s * 0.5, y: s * 0.5, z: -s * 0.5 },
                    { x: -s * 0.5, y: -s * 0.5, z: s * 0.5 }, { x: s * 0.5, y: -s * 0.5, z: s * 0.5 },
                    { x: s * 0.5, y: s * 0.5, z: s * 0.5 }, { x: -s * 0.5, y: s * 0.5, z: s * 0.5 },
                ]
            },

            // TANK: Solid cube - heavy looking
            tank: {
                type: 'cube',
                vertices: [
                    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
                    { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
                    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
                    { x: s, y: s, z: s }, { x: -s, y: s, z: s }
                ]
            },

            // FAST: Tetrahedron - light, agile
            fast: {
                type: 'tetrahedron',
                vertices: [
                    { x: 0, y: -s, z: 0 },          // Top
                    { x: -s, y: s * 0.5, z: -s * 0.7 },  // Base vertices
                    { x: s, y: s * 0.5, z: -s * 0.7 },
                    { x: 0, y: s * 0.5, z: s * 0.9 }
                ]
            },

            // PHANTOM: Icosahedron - ethereal, complex
            phantom: {
                type: 'icosahedron',
                vertices: (() => {
                    const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
                    const a = s * 0.6;
                    const b = a * phi;
                    return [
                        { x: 0, y: a, z: b }, { x: 0, y: a, z: -b },
                        { x: 0, y: -a, z: b }, { x: 0, y: -a, z: -b },
                        { x: a, y: b, z: 0 }, { x: a, y: -b, z: 0 },
                        { x: -a, y: b, z: 0 }, { x: -a, y: -b, z: 0 },
                        { x: b, y: 0, z: a }, { x: b, y: 0, z: -a },
                        { x: -b, y: 0, z: a }, { x: -b, y: 0, z: -a }
                    ];
                })()
            },

            // TELEPORTER: Double pyramid (bipyramid) - dimensional
            teleporter: {
                type: 'bipyramid',
                vertices: [
                    { x: 0, y: -s * 1.2, z: 0 },   // Top apex
                    { x: 0, y: s * 1.2, z: 0 },    // Bottom apex
                    { x: -s * 0.8, y: 0, z: -s * 0.8 },   // Square middle
                    { x: s * 0.8, y: 0, z: -s * 0.8 },
                    { x: s * 0.8, y: 0, z: s * 0.8 },
                    { x: -s * 0.8, y: 0, z: s * 0.8 }
                ]
            },

            // SHIELDER: Octahedron - defensive, symmetrical
            shielder: {
                type: 'octahedron',
                vertices: [
                    { x: 0, y: -s, z: 0 }, { x: 0, y: s, z: 0 },
                    { x: -s, y: 0, z: 0 }, { x: s, y: 0, z: 0 },
                    { x: 0, y: 0, z: -s }, { x: 0, y: 0, z: s }
                ]
            },

            // EXPLODER: Spiked cube - dangerous looking
            exploder: {
                type: 'spikedCube',
                vertices: [
                    // Core cube vertices
                    { x: -s * 0.6, y: -s * 0.6, z: -s * 0.6 }, { x: s * 0.6, y: -s * 0.6, z: -s * 0.6 },
                    { x: s * 0.6, y: s * 0.6, z: -s * 0.6 }, { x: -s * 0.6, y: s * 0.6, z: -s * 0.6 },
                    { x: -s * 0.6, y: -s * 0.6, z: s * 0.6 }, { x: s * 0.6, y: -s * 0.6, z: s * 0.6 },
                    { x: s * 0.6, y: s * 0.6, z: s * 0.6 }, { x: -s * 0.6, y: s * 0.6, z: s * 0.6 },
                    // Spikes extending from face centers
                    { x: 0, y: 0, z: -s * 1.4 },   // Front spike
                    { x: 0, y: 0, z: s * 1.4 },    // Back spike
                    { x: -s * 1.4, y: 0, z: 0 },   // Left spike
                    { x: s * 1.4, y: 0, z: 0 },    // Right spike
                    { x: 0, y: -s * 1.4, z: 0 },   // Top spike
                    { x: 0, y: s * 1.4, z: 0 }     // Bottom spike
                ]
            },

            // RANGED: Elongated prism - directional
            ranged: {
                type: 'prism',
                vertices: [
                    // Front triangle
                    { x: 0, y: -s * 0.5, z: -s * 1.2 },
                    { x: -s * 0.7, y: s * 0.5, z: -s * 1.2 },
                    { x: s * 0.7, y: s * 0.5, z: -s * 1.2 },
                    // Back triangle
                    { x: 0, y: -s * 0.5, z: s * 1.2 },
                    { x: -s * 0.7, y: s * 0.5, z: s * 1.2 },
                    { x: s * 0.7, y: s * 0.5, z: s * 1.2 }
                ]
            },

            // HEALER: Hourglass / double cone
            healer: {
                type: 'hourglass',
                vertices: [
                    { x: 0, y: -s * 1.2, z: 0 },   // Top apex
                    { x: 0, y: s * 1.2, z: 0 },    // Bottom apex
                    { x: 0, y: 0, z: 0 },          // Center (waist)
                    { x: -s * 0.6, y: -s * 0.4, z: -s * 0.6 },  // Top ring
                    { x: s * 0.6, y: -s * 0.4, z: -s * 0.6 },
                    { x: s * 0.6, y: -s * 0.4, z: s * 0.6 },
                    { x: -s * 0.6, y: -s * 0.4, z: s * 0.6 },
                    { x: -s * 0.6, y: s * 0.4, z: -s * 0.6 },   // Bottom ring
                    { x: s * 0.6, y: s * 0.4, z: -s * 0.6 },
                    { x: s * 0.6, y: s * 0.4, z: s * 0.6 },
                    { x: -s * 0.6, y: s * 0.4, z: s * 0.6 }
                ]
            },

            // DASHER: Arrow / dart shape
            dasher: {
                type: 'dart',
                vertices: [
                    { x: 0, y: 0, z: -s * 1.5 },   // Sharp front point
                    { x: -s * 0.6, y: 0, z: s * 0.5 },  // Back left
                    { x: s * 0.6, y: 0, z: s * 0.5 },   // Back right
                    { x: 0, y: s * 0.5, z: s * 0.3 },   // Back top
                    { x: 0, y: -s * 0.5, z: s * 0.3 },  // Back bottom
                    { x: 0, y: 0, z: s * 0.8 }          // Tail point
                ]
            },

            // SPLITTER: Fractured cube (appears to be splitting)
            splitter: {
                type: 'fracturedCube',
                vertices: [
                    // Main fragment
                    { x: -s * 0.8, y: -s * 0.8, z: -s * 0.5 }, { x: s * 0.4, y: -s * 0.8, z: -s * 0.5 },
                    { x: s * 0.4, y: s * 0.4, z: -s * 0.5 }, { x: -s * 0.8, y: s * 0.4, z: -s * 0.5 },
                    { x: -s * 0.8, y: -s * 0.8, z: s * 0.5 }, { x: s * 0.4, y: -s * 0.8, z: s * 0.5 },
                    { x: s * 0.4, y: s * 0.4, z: s * 0.5 }, { x: -s * 0.8, y: s * 0.4, z: s * 0.5 },
                    // Small detaching fragment
                    { x: s * 0.6, y: s * 0.5, z: -s * 0.3 }, { x: s * 1.0, y: s * 0.5, z: -s * 0.3 },
                    { x: s * 1.0, y: s * 0.9, z: -s * 0.3 }, { x: s * 0.6, y: s * 0.9, z: -s * 0.3 },
                    { x: s * 0.6, y: s * 0.5, z: s * 0.1 }, { x: s * 1.0, y: s * 0.5, z: s * 0.1 },
                    { x: s * 1.0, y: s * 0.9, z: s * 0.1 }, { x: s * 0.6, y: s * 0.9, z: s * 0.1 }
                ]
            },

            // BERSERKER: Jagged, angry-looking polyhedron
            berserker: {
                type: 'jagged',
                vertices: [
                    { x: 0, y: -s * 1.1, z: 0 },       // Top spike
                    { x: -s * 0.9, y: -s * 0.3, z: 0 }, // Left spike
                    { x: s * 0.9, y: -s * 0.3, z: 0 },  // Right spike
                    { x: 0, y: s * 0.5, z: -s * 0.9 },  // Back spike
                    { x: 0, y: s * 0.5, z: s * 0.9 },   // Front spike
                    { x: 0, y: s * 1.1, z: 0 }          // Bottom point
                ]
            },

            // SUMMONER: Arcane sigil shape (pentagram-ish in 3D)
            summoner: {
                type: 'sigil',
                vertices: (() => {
                    const verts = [];
                    // Outer pentagram points
                    for (let i = 0; i < 5; i++) {
                        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                        verts.push({ x: Math.cos(angle) * s, y: 0, z: Math.sin(angle) * s });
                    }
                    // Inner star points (rotated 36 degrees)
                    for (let i = 0; i < 5; i++) {
                        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + Math.PI / 5;
                        verts.push({ x: Math.cos(angle) * s * 0.4, y: 0, z: Math.sin(angle) * s * 0.4 });
                    }
                    // Top and bottom points for 3D effect
                    verts.push({ x: 0, y: -s * 0.6, z: 0 });
                    verts.push({ x: 0, y: s * 0.6, z: 0 });
                    return verts;
                })()
            },

            // MINION: Simple small tetrahedron
            minion: {
                type: 'tetrahedron',
                vertices: [
                    { x: 0, y: -s * 0.8, z: 0 },
                    { x: -s * 0.8, y: s * 0.4, z: -s * 0.5 },
                    { x: s * 0.8, y: s * 0.4, z: -s * 0.5 },
                    { x: 0, y: s * 0.4, z: s * 0.7 }
                ]
            },

            // BOSS: Multi-layered rotating geometry (complex)
            boss: {
                type: 'bossGeometry',
                vertices: [
                    // Outer octahedron
                    { x: 0, y: -s * 1.2, z: 0 }, { x: 0, y: s * 1.2, z: 0 },
                    { x: -s * 1.2, y: 0, z: 0 }, { x: s * 1.2, y: 0, z: 0 },
                    { x: 0, y: 0, z: -s * 1.2 }, { x: 0, y: 0, z: s * 1.2 },
                    // Inner cube
                    { x: -s * 0.5, y: -s * 0.5, z: -s * 0.5 }, { x: s * 0.5, y: -s * 0.5, z: -s * 0.5 },
                    { x: s * 0.5, y: s * 0.5, z: -s * 0.5 }, { x: -s * 0.5, y: s * 0.5, z: -s * 0.5 },
                    { x: -s * 0.5, y: -s * 0.5, z: s * 0.5 }, { x: s * 0.5, y: -s * 0.5, z: s * 0.5 },
                    { x: s * 0.5, y: s * 0.5, z: s * 0.5 }, { x: -s * 0.5, y: s * 0.5, z: s * 0.5 }
                ]
            },

            // Fallback for unknown types
            default: {
                type: 'octahedron',
                vertices: [
                    { x: 0, y: -s, z: 0 }, { x: 0, y: s, z: 0 },
                    { x: -s, y: 0, z: 0 }, { x: s, y: 0, z: 0 },
                    { x: 0, y: 0, z: -s }, { x: 0, y: 0, z: s }
                ]
            }
        };
    }

    /**
     * Define edge connections for each shape type
     * Each edge is [startIndex, endIndex] into the vertices array
     */
    _initEdgeDefinitions() {
        return {
            tesseract: [
                // Outer cube edges
                [0, 1], [1, 2], [2, 3], [3, 0], // Front face
                [4, 5], [5, 6], [6, 7], [7, 4], // Back face
                [0, 4], [1, 5], [2, 6], [3, 7], // Connecting
                // Inner cube edges
                [8, 9], [9, 10], [10, 11], [11, 8],
                [12, 13], [13, 14], [14, 15], [15, 12],
                [8, 12], [9, 13], [10, 14], [11, 15],
                // Outer to inner connections (hypercube projection)
                [0, 8], [1, 9], [2, 10], [3, 11],
                [4, 12], [5, 13], [6, 14], [7, 15]
            ],
            cube: [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7]
            ],
            tetrahedron: [
                [0, 1], [0, 2], [0, 3],
                [1, 2], [2, 3], [3, 1]
            ],
            icosahedron: [
                // Complex but beautiful
                [0, 2], [0, 4], [0, 6], [0, 8], [0, 10],
                [1, 3], [1, 4], [1, 6], [1, 9], [1, 11],
                [2, 5], [2, 7], [2, 8], [2, 10],
                [3, 5], [3, 7], [3, 9], [3, 11],
                [4, 6], [4, 8], [4, 9],
                [5, 7], [5, 8], [5, 9],
                [6, 10], [6, 11],
                [7, 10], [7, 11],
                [8, 9], [10, 11]
            ],
            bipyramid: [
                // Top to middle square
                [0, 2], [0, 3], [0, 4], [0, 5],
                // Bottom to middle square
                [1, 2], [1, 3], [1, 4], [1, 5],
                // Middle square
                [2, 3], [3, 4], [4, 5], [5, 2]
            ],
            octahedron: [
                // Top pyramid
                [0, 2], [0, 3], [0, 4], [0, 5],
                // Bottom pyramid
                [1, 2], [1, 3], [1, 4], [1, 5],
                // Middle ring
                [2, 4], [4, 3], [3, 5], [5, 2]
            ],
            spikedCube: [
                // Core cube
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7],
                // Spikes from face centers
                [8, 0], [8, 1], [8, 2], [8, 3],  // Front
                [9, 4], [9, 5], [9, 6], [9, 7],  // Back
                [10, 0], [10, 3], [10, 4], [10, 7], // Left
                [11, 1], [11, 2], [11, 5], [11, 6], // Right
                [12, 0], [12, 1], [12, 4], [12, 5], // Top
                [13, 2], [13, 3], [13, 6], [13, 7]  // Bottom
            ],
            prism: [
                // Front triangle
                [0, 1], [1, 2], [2, 0],
                // Back triangle
                [3, 4], [4, 5], [5, 3],
                // Connecting edges
                [0, 3], [1, 4], [2, 5]
            ],
            hourglass: [
                // Top cone
                [0, 3], [0, 4], [0, 5], [0, 6],
                // Bottom cone
                [1, 7], [1, 8], [1, 9], [1, 10],
                // Top ring
                [3, 4], [4, 5], [5, 6], [6, 3],
                // Bottom ring
                [7, 8], [8, 9], [9, 10], [10, 7],
                // Waist connections (optional, adds complexity)
                [3, 7], [4, 8], [5, 9], [6, 10]
            ],
            dart: [
                // Front point to back
                [0, 1], [0, 2], [0, 3], [0, 4],
                // Back structure
                [1, 3], [2, 3], [1, 4], [2, 4],
                [1, 5], [2, 5], [3, 5], [4, 5]
            ],
            fracturedCube: [
                // Main fragment cube
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7],
                // Small detaching fragment
                [8, 9], [9, 10], [10, 11], [11, 8],
                [12, 13], [13, 14], [14, 15], [15, 12],
                [8, 12], [9, 13], [10, 14], [11, 15]
            ],
            jagged: [
                // All points connect to all other points (aggressive look)
                [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
                [1, 2], [1, 3], [1, 4], [1, 5],
                [2, 3], [2, 4], [2, 5],
                [3, 4], [3, 5],
                [4, 5]
            ],
            sigil: [
                // Outer star (skip connections for pentagram)
                [0, 2], [2, 4], [4, 1], [1, 3], [3, 0],
                // Inner ring
                [5, 6], [6, 7], [7, 8], [8, 9], [9, 5],
                // Outer to inner
                [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
                // Top/bottom connections
                [10, 0], [10, 1], [10, 2], [10, 3], [10, 4],
                [11, 0], [11, 1], [11, 2], [11, 3], [11, 4]
            ],
            bossGeometry: [
                // Outer octahedron
                [0, 2], [0, 3], [0, 4], [0, 5],
                [1, 2], [1, 3], [1, 4], [1, 5],
                [2, 4], [4, 3], [3, 5], [5, 2],
                // Inner cube
                [6, 7], [7, 8], [8, 9], [9, 6],
                [10, 11], [11, 12], [12, 13], [13, 10],
                [6, 10], [7, 11], [8, 12], [9, 13],
                // Connect inner to outer (energy lines)
                [0, 6], [0, 7], [1, 9], [1, 13],
                [2, 6], [2, 10], [3, 8], [3, 12],
                [4, 7], [4, 11], [5, 9], [5, 13]
            ]
        };
    }

    /**
     * Get shape definition for an enemy type
     */
    getShapeForType(enemyType) {
        return this.shapeDefinitions[enemyType] || this.shapeDefinitions.default;
    }

    /**
     * Get edge definition for a shape type
     */
    getEdgesForShape(shapeType) {
        return this.edgeDefinitions[shapeType] || this.edgeDefinitions.octahedron;
    }

    /**
     * Project a 3D point to 2D with rotation
     */
    project(v, rotX, rotY, rotZ) {
        const FM = this._fastMath;
        let sinRx, cosRx, sinRy, cosRy, sinRz, cosRz;

        if (FM && FM.sincos) {
            const scY = FM.sincos(rotY);
            const scX = FM.sincos(rotX);
            const scZ = FM.sincos(rotZ);
            sinRy = scY.sin; cosRy = scY.cos;
            sinRx = scX.sin; cosRx = scX.cos;
            sinRz = scZ.sin; cosRz = scZ.cos;
        } else {
            sinRy = Math.sin(rotY); cosRy = Math.cos(rotY);
            sinRx = Math.sin(rotX); cosRx = Math.cos(rotX);
            sinRz = Math.sin(rotZ); cosRz = Math.cos(rotZ);
        }

        let x = v.x, y = v.y, z = v.z;

        // Rotate Y
        let x1 = x * cosRy - z * sinRy;
        let z1 = x * sinRy + z * cosRy;
        x = x1; z = z1;

        // Rotate X
        let y1 = y * cosRx - z * sinRx;
        let z2 = y * sinRx + z * cosRx;
        y = y1; z = z2;

        // Rotate Z
        let x2 = x * cosRz - y * sinRz;
        let y2 = x * sinRz + y * cosRz;
        x = x2; y = y2;

        // Simple perspective (FOV-based)
        const fov = 200;
        const scale = fov / (fov + z);

        return { x: x * scale, y: y * scale };
    }

    /**
     * Quantize angle to cache bucket index
     */
    quantizeAngle(angle) {
        let normalized = angle % this.twoPI;
        if (normalized < 0) normalized += this.twoPI;
        return (normalized * this._invRotationSteps) | 0;
    }

    /**
     * Generate cache key for enemy sprite
     */
    _getSpriteCacheKey(enemyType, sizeKey, rotXIdx, rotYIdx) {
        // Encode: type(8bits via string hash) + size(8bits) + rotX(4bits) + rotY(4bits)
        const typeHash = this._hashType(enemyType);
        return (typeHash << 16) | (sizeKey << 8) | (rotXIdx << 4) | rotYIdx;
    }

    _hashType(type) {
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = ((hash << 5) - hash + type.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % 256;
    }

    /**
     * Get or create cached sprite for enemy
     * @param {string} enemyType - Enemy type string
     * @param {number} size - Enemy radius
     * @param {number} rotX - X rotation angle
     * @param {number} rotY - Y rotation angle
     * @param {string} color - Stroke color
     * @returns {Object|null} Sprite object with canvas and metadata
     */
    getSprite(enemyType, size, rotX, rotY, color) {
        if (typeof document === 'undefined') return null;

        // Quantize rotations for cache hit
        const rotXIdx = this.quantizeAngle(rotX);
        const rotYIdx = this.quantizeAngle(rotY);
        const sizeKey = Math.round(size / 4) * 4; // Quantize to 4px increments

        const key = this._getSpriteCacheKey(enemyType, sizeKey, rotXIdx, rotYIdx);

        // Check cache
        if (this.spriteCache.has(key)) {
            this._spriteCacheAccessTime.set(key, ++_enemyShapeCacheAccessCounter);
            return this.spriteCache.get(key);
        }

        // Create sprite
        const shapeDef = this.getShapeForType(enemyType);
        const edges = this.getEdgesForShape(shapeDef.type);

        // Visual scale: reduce size to ~75% so wireframes don't clip in formations
        const visualScale = 0.75;
        const spriteSize = Math.ceil(sizeKey * 3.0); // Canvas size for projected wireframes
        const canvas = document.createElement('canvas');
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext('2d');

        const center = spriteSize / 2;
        const angleX = this.cachedRotationAngles[rotXIdx] || 0;
        const angleY = this.cachedRotationAngles[rotYIdx] || 0;

        // Scale vertices with visual scale factor and project
        const vertices = shapeDef.vertices;
        const scaledSize = sizeKey * visualScale;
        const projected = vertices.map(v => {
            const scaled = { x: v.x * scaledSize, y: v.y * scaledSize, z: v.z * scaledSize };
            return this.project(scaled, angleX, angleY, 0);
        });

        // Draw wireframe
        ctx.strokeStyle = color || '#e74c3c';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.save();
        ctx.translate(center, center);

        ctx.beginPath();
        for (const edge of edges) {
            if (edge[0] < projected.length && edge[1] < projected.length) {
                const p1 = projected[edge[0]];
                const p2 = projected[edge[1]];
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
        }
        ctx.stroke();

        ctx.restore();

        const sprite = { canvas, halfSize: spriteSize / 2, color };

        // LRU eviction
        if (this.spriteCache.size >= this.spriteCacheMaxSize) {
            const entries = Array.from(this._spriteCacheAccessTime.entries());
            entries.sort((a, b) => a[1] - b[1]);
            for (let i = 0; i < this.spriteCacheEvictCount && i < entries.length; i++) {
                const oldKey = entries[i][0];
                this.spriteCache.delete(oldKey);
                this._spriteCacheAccessTime.delete(oldKey);
            }
        }

        this.spriteCache.set(key, sprite);
        this._spriteCacheAccessTime.set(key, ++_enemyShapeCacheAccessCounter);

        return sprite;
    }

    /**
     * Pre-warm cache for common enemy types
     */
    prewarm() {
        if (typeof document === 'undefined') return;

        const types = ['basic', 'tank', 'fast', 'phantom', 'shielder', 'exploder', 'ranged', 'healer'];
        const sizes = [12, 15, 18, 25];
        const color = '#e74c3c';

        for (const type of types) {
            for (const size of sizes) {
                // Pre-render at a few rotation angles
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * this.twoPI;
                    this.getSprite(type, size, angle, angle, color);
                }
            }
        }
    }

    /**
     * Clear the sprite cache
     */
    clearCache() {
        _enemyShapeCache.clear();
        _enemyShapeCacheAccessTime.clear();
        _enemyShapeCacheAccessCounter = 0;
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            cacheSize: this.spriteCache.size,
            maxSize: this.spriteCacheMaxSize,
            rotationSteps: this.rotationSteps
        };
    }
}

// Expose to global namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.EnemyShapeCache = EnemyShapeCache;

    // Create singleton instance
    window.Game.enemyShapeCache = new EnemyShapeCache();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnemyShapeCache;
}

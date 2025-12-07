/**
 * [PLAYER VISUAL ENHANCEMENT] PlayerShapeCache
 * 
 * Pre-renders animated 3D wireframe geometry for player ships, matching the enemy system.
 * Each character class has a unique geometric identity that rotates and animates.
 * 
 * Design Philosophy:
 * - Each class has thematically appropriate 3D geometry
 * - Rotation speeds match character personality
 * - Larger, more detailed sprites than enemies (player is the hero)
 * - Inner glow core for visual polish
 * 
 * Performance:
 * - Sprite caching with rotation quantization (12 steps = 30° increments)
 * - Shared cache across all renders
 * - FastMath integration for trig operations
 */

// Shared cache across all PlayerShapeCache instances
const _playerShapeCache = new Map();
const _playerShapeCacheAccessTime = new Map();
let _playerShapeCacheAccessCounter = 0;

class PlayerShapeCache {
    constructor() {
        // Configuration - 12 rotation steps for retro stepped animation
        this.rotationSteps = 12;
        this.twoPI = Math.PI * 2;
        this._invRotationSteps = this.rotationSteps / this.twoPI;

        // Pre-compute rotation angles
        this.cachedRotationAngles = new Float32Array(this.rotationSteps);
        for (let i = 0; i < this.rotationSteps; i++) {
            this.cachedRotationAngles[i] = (i / this.rotationSteps) * this.twoPI;
        }

        // Cache settings - smaller than enemy cache (only 9 player classes)
        this.spriteCache = _playerShapeCache;
        this._spriteCacheAccessTime = _playerShapeCacheAccessTime;
        this.spriteCacheMaxSize = 150;
        this.spriteCacheEvictCount = 20;

        // FastMath reference
        this._fastMath = null;
        this._updateFastMathRef();

        // Shape definitions per character class
        this.shapeDefinitions = this._initShapeDefinitions();

        // Edge definitions per shape type
        this.edgeDefinitions = this._initEdgeDefinitions();

        // Rotation speed per character class (personality-driven)
        // [TUNED] Increased speeds ~2x for faster, snappier animation cycles
        this.rotationSpeeds = {
            aegis_vanguard: 0.6,        // Steady but responsive
            nova_corsair: 1.4,          // Fast, aggressive
            stormcaller: 1.0,           // Electric energy
            nexus_architect: 0.7,       // Precise but active
            inferno_juggernaut: 0.5,    // Heavy but not sluggish
            crimson_reaver: 1.3,        // Predatory
            void_warden: 0.65,          // Mysterious shimmer
            phantom_striker: 1.5,       // Erratic, phasing
            cybernetic_berserker: 0.7   // Base speed, increases with damage
        };

        // [4D POLISH] Per-class 4D effect intensity
        // Higher values = more pronounced hypercube breathing effect
        this.class4DIntensity = {
            aegis_vanguard: 0.8,        // Moderate - stable shield
            nova_corsair: 1.0,          // Standard - balanced aggression
            stormcaller: 1.2,           // Enhanced - electric energy crackles in 4D
            nexus_architect: 1.3,       // Strong - complex orbital phasing
            inferno_juggernaut: 0.5,    // Minimal - heavy, grounded
            crimson_reaver: 0.9,        // Moderate - predatory focus
            void_warden: 1.4,           // Very strong - dimensional warping
            phantom_striker: 1.6,       // Maximum - ghostly phase shifting
            cybernetic_berserker: 1.1   // Enhanced - glitchy instability
        };

        // Class colors for wireframe glow
        this.classColors = {
            aegis_vanguard: { primary: '#00ffff', glow: '#00ccff', inner: '#88ffff' },
            nova_corsair: { primary: '#f39c12', glow: '#ff6600', inner: '#ffcc66' },
            stormcaller: { primary: '#3498db', glow: '#00aaff', inner: '#66ccff' },
            nexus_architect: { primary: '#9b59b6', glow: '#aa44ff', inner: '#cc88ff' },
            inferno_juggernaut: { primary: '#e74c3c', glow: '#ff4400', inner: '#ff8866' },
            crimson_reaver: { primary: '#c0392b', glow: '#ff0044', inner: '#ff6666' },
            void_warden: { primary: '#8e44ad', glow: '#6600aa', inner: '#aa66cc' },
            phantom_striker: { primary: '#1abc9c', glow: '#00ff88', inner: '#66ffbb' },
            cybernetic_berserker: { primary: '#f1c40f', glow: '#ffcc00', inner: '#ffee66' }
        };
    }

    _updateFastMathRef() {
        this._fastMath = (typeof window !== 'undefined' && (window.FastMath || window.Game?.FastMath)) || null;
    }

    /**
     * Define unique 4D polytope vertices for each character class
     * Each shape is a 4D structure that creates perceivable higher-dimensional animation.
     * 
     * [HYPER-TESSERACT UPDATE]
     * All shapes now include w-coordinates (4th dimension):
     * - Vertices are { x, y, z, w } 4-tuples
     * - 4D rotation in XW/YW planes creates "breathing" effect
     * - Bilateral symmetry is natural (4D polytopes are hyper-symmetric)
     * - Forward direction is -Z (nose points toward negative Z)
     * 
     * Projection pipeline: 4D → (rotW) → 3D → (rotX,rotY) → 2D → (canvas rot) → screen
     */
    _initShapeDefinitions() {
        const s = 0.75; // Unit scale - balanced for visible 4D sprites

        return {
            // AEGIS VANGUARD - Tesseract (Hypercube)
            // 16 vertices at (±1, ±1, ±1, ±1), the classic 4D cube
            // Creates nested cube effect as it rotates in 4D
            aegis_vanguard: {
                type: 'tesseract',
                is4D: true,
                vertices: (() => {
                    const verts = [];
                    // Generate all 16 tesseract vertices with forward bias
                    for (let i = 0; i < 16; i++) {
                        verts.push({
                            x: ((i & 1) ? s : -s),
                            y: ((i & 2) ? s : -s) * 0.6,  // Flatten Y for ship look
                            z: ((i & 4) ? s * 0.8 : -s * 1.4),  // Asymmetric Z - nose forward
                            w: ((i & 8) ? s * 0.5 : -s * 0.5)  // W depth
                        });
                    }
                    return verts;
                })()
            },

            // NOVA CORSAIR - 16-Cell (Hyperoctahedron)
            // 8 vertices on 4D axes, creates sharp star pattern
            // Dual of tesseract - aggressive, dart-like
            nova_corsair: {
                type: 'cell16',
                is4D: true,
                vertices: [
                    // 4D axis vertices - extended for ship shape
                    { x: s * 1.8, y: 0, z: 0, w: 0 },           // Right
                    { x: -s * 1.8, y: 0, z: 0, w: 0 },          // Left
                    { x: 0, y: s * 0.6, z: 0, w: 0 },           // Top
                    { x: 0, y: -s * 0.6, z: 0, w: 0 },          // Bottom
                    { x: 0, y: 0, z: -s * 2.0, w: 0 },          // Nose (forward)
                    { x: 0, y: 0, z: s * 1.2, w: 0 },           // Tail (back)
                    { x: 0, y: 0, z: 0, w: s * 0.8 },           // W+ (phases through)
                    { x: 0, y: 0, z: 0, w: -s * 0.8 }           // W- (phases through)
                ]
            },

            // STORMCALLER - 24-Cell
            // Unique to 4D - 24 vertices, creates electric starburst
            // Vertices at permutations of (±1, ±1, 0, 0)
            stormcaller: {
                type: 'cell24',
                is4D: true,
                vertices: (() => {
                    const verts = [];
                    const coords = [
                        // Permutations of (±1, ±1, 0, 0)
                        [1, 1, 0, 0], [1, -1, 0, 0], [-1, 1, 0, 0], [-1, -1, 0, 0],
                        [1, 0, 1, 0], [1, 0, -1, 0], [-1, 0, 1, 0], [-1, 0, -1, 0],
                        [1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, 1], [-1, 0, 0, -1],
                        [0, 1, 1, 0], [0, 1, -1, 0], [0, -1, 1, 0], [0, -1, -1, 0],
                        [0, 1, 0, 1], [0, 1, 0, -1], [0, -1, 0, 1], [0, -1, 0, -1],
                        [0, 0, 1, 1], [0, 0, 1, -1], [0, 0, -1, 1], [0, 0, -1, -1]
                    ];
                    for (const c of coords) {
                        verts.push({
                            x: c[0] * s * 1.2,
                            y: c[1] * s * 0.5,  // Flatten Y
                            z: c[2] * s * 1.4,  // Stretch Z
                            w: c[3] * s * 0.6
                        });
                    }
                    return verts;
                })()
            },

            // NEXUS ARCHITECT - Rectified 5-Cell
            // 10 vertices forming complex orbital structure
            nexus_architect: {
                type: 'rectified5cell',
                is4D: true,
                vertices: (() => {
                    const verts = [];
                    const phi = (1 + Math.sqrt(5)) / 2;
                    // Rectified 5-cell has 10 vertices
                    const coords = [
                        [1, 1, 1, -1 / phi], [1, 1, -1, -1 / phi], [1, -1, 1, -1 / phi],
                        [1, -1, -1, -1 / phi], [-1, 1, 1, -1 / phi], [-1, 1, -1, -1 / phi],
                        [-1, -1, 1, -1 / phi], [-1, -1, -1, -1 / phi],
                        [0, 0, 0, phi], [0, 0, 0, -phi]
                    ];
                    for (const c of coords) {
                        verts.push({
                            x: c[0] * s * 0.7,
                            y: c[1] * s * 0.5,
                            z: c[2] * s * 0.9,
                            w: c[3] * s * 0.5
                        });
                    }
                    return verts;
                })()
            },

            // INFERNO JUGGERNAUT - Double Tesseract (nested)
            // Two tesseracts at different W-depths - fortress effect
            inferno_juggernaut: {
                type: 'doubleTesseract',
                is4D: true,
                vertices: (() => {
                    const verts = [];
                    // Outer tesseract with forward bias
                    for (let i = 0; i < 16; i++) {
                        verts.push({
                            x: ((i & 1) ? s : -s) * 1.0,
                            y: ((i & 2) ? s : -s) * 0.7,
                            z: ((i & 4) ? s * 0.7 : -s * 1.2),  // Nose forward
                            w: ((i & 8) ? s * 0.5 : -s * 0.5)
                        });
                    }
                    // Inner tesseract (smaller, different W phase)
                    for (let i = 0; i < 16; i++) {
                        verts.push({
                            x: ((i & 1) ? s : -s) * 0.4,
                            y: ((i & 2) ? s : -s) * 0.3,
                            z: ((i & 4) ? s * 0.3 : -s * 0.5),  // Nose forward
                            w: ((i & 8) ? s * 0.25 : -s * 0.25)
                        });
                    }
                    return verts;
                })()
            },

            // CRIMSON REAVER - 5-Cell (Pentachoron/4-Simplex)
            // 5 vertices - minimal, predatory, sharp
            crimson_reaver: {
                type: 'cell5',
                is4D: true,
                vertices: (() => {
                    // 5-cell vertices (4D simplex) - nose centered at x=0, y=0
                    const a = s * 1.2;
                    const h = s * 0.6;
                    return [
                        { x: 0, y: 0, z: -a * 1.5, w: 0 },                // Nose (centered!)
                        { x: -a, y: -h * 0.4, z: a * 0.5, w: -s * 0.4 },  // Left rear
                        { x: a, y: -h * 0.4, z: a * 0.5, w: -s * 0.4 },   // Right rear
                        { x: 0, y: h * 0.8, z: a * 0.4, w: -s * 0.3 },    // Top rear
                        { x: 0, y: -h * 0.3, z: 0, w: s * 0.7 }           // 4D apex (phases through)
                    ];
                })()
            },

            // VOID WARDEN - Duoprism (3,6)
            // Toroidal 4D shape - ring that morphs dimensionally
            void_warden: {
                type: 'duoprism36',
                is4D: true,
                vertices: (() => {
                    const verts = [];
                    // Add centered nose vertex first
                    verts.push({ x: 0, y: 0, z: -s * 1.4, w: 0 }); // 0: Nose
                    // Duoprism ring shifted backward
                    for (let i = 0; i < 3; i++) {
                        const angle1 = (i / 3) * Math.PI * 2;
                        const r1 = s * 0.4;
                        for (let j = 0; j < 6; j++) {
                            const angle2 = (j / 6) * Math.PI * 2;
                            const r2 = s * 0.9;
                            verts.push({
                                x: Math.cos(angle2) * r2,
                                y: Math.sin(angle1) * r1 * 0.5,
                                z: Math.sin(angle2) * r2 * 0.6 + s * 0.3,  // Shifted back
                                w: Math.cos(angle1) * r1
                            });
                        }
                    }
                    // Center point
                    verts.push({ x: 0, y: 0, z: s * 0.2, w: 0 }); // Tail center
                    return verts;
                })()
            },

            // PHANTOM STRIKER - Dual 5-Cells (two pentachora)
            // Two 4D simplices at different phases - ghostly dual
            phantom_striker: {
                type: 'dual5cell',
                is4D: true,
                vertices: (() => {
                    const a = s * 0.8;
                    const verts = [];
                    // Center nose vertex first (most important!)
                    verts.push({ x: 0, y: 0, z: -a * 1.6, w: 0 }); // 0: Centered nose
                    // First 5-cell (left nacelle in W-)
                    verts.push(
                        { x: -a * 0.9, y: 0, z: -a * 0.8, w: -s * 0.5 },
                        { x: -a * 1.2, y: -a * 0.3, z: a * 0.4, w: -s * 0.5 },
                        { x: -a * 1.2, y: a * 0.3, z: a * 0.4, w: -s * 0.5 },
                        { x: -a * 0.6, y: 0, z: a * 0.3, w: -s * 0.3 }
                    );
                    // Second 5-cell (right nacelle in W+), mirrored
                    verts.push(
                        { x: a * 0.9, y: 0, z: -a * 0.8, w: s * 0.5 },
                        { x: a * 1.2, y: -a * 0.3, z: a * 0.4, w: s * 0.5 },
                        { x: a * 1.2, y: a * 0.3, z: a * 0.4, w: s * 0.5 },
                        { x: a * 0.6, y: 0, z: a * 0.3, w: s * 0.3 }
                    );
                    // Center tail
                    verts.push({ x: 0, y: 0, z: a * 0.6, w: 0 }); // Tail
                    return verts;
                })()
            },

            // CYBERNETIC BERSERKER - Truncated Tesseract (fractured)
            // Tesseract with cut corners - glitchy, unstable
            cybernetic_berserker: {
                type: 'truncatedTesseract',
                is4D: true,
                vertices: (() => {
                    const verts = [];

                    // Centered nose vertex first
                    verts.push({ x: 0, y: 0, z: -s * 1.3, w: 0 }); // 0: Nose

                    // Main body vertices (bipyramid-like, shifted back)
                    verts.push(
                        { x: 0, y: -s * 1.1, z: s * 0.2, w: 0 },              // Top apex
                        { x: 0, y: s * 0.9, z: s * 0.2, w: 0 },               // Bottom apex
                        { x: -s * 0.8, y: 0, z: -s * 0.4, w: -s * 0.3 },      // Base left front
                        { x: s * 0.8, y: 0, z: -s * 0.4, w: -s * 0.3 },       // Base right front
                        { x: s * 0.8, y: 0, z: s * 0.6, w: -s * 0.3 },        // Base right rear
                        { x: -s * 0.8, y: 0, z: s * 0.6, w: -s * 0.3 }        // Base left rear
                    );

                    // Left glitch fragment (in W+)
                    verts.push(
                        { x: -s * 1.1, y: -s * 0.2, z: 0, w: s * 0.5 },
                        { x: -s * 0.9, y: 0, z: s * 0.2, w: s * 0.6 },
                        { x: -s * 0.9, y: s * 0.2, z: -s * 0.1, w: s * 0.5 }
                    );

                    // Right glitch fragment (mirrored in W-)
                    verts.push(
                        { x: s * 1.1, y: -s * 0.2, z: 0, w: -s * 0.5 },
                        { x: s * 0.9, y: 0, z: s * 0.2, w: -s * 0.6 },
                        { x: s * 0.9, y: s * 0.2, z: -s * 0.1, w: -s * 0.5 }
                    );

                    // Energy core (center)
                    verts.push({ x: 0, y: -s * 0.1, z: 0, w: s * 0.35 });

                    return verts;
                })()
            },

            // Default fallback (3D octahedron - no 4D)
            default: {
                type: 'octahedron',
                is4D: false,
                vertices: [
                    { x: 0, y: -s, z: 0, w: 0 },
                    { x: 0, y: s, z: 0, w: 0 },
                    { x: -s, y: 0, z: 0, w: 0 },
                    { x: s, y: 0, z: 0, w: 0 },
                    { x: 0, y: 0, z: -s, w: 0 },
                    { x: 0, y: 0, z: s, w: 0 }
                ]
            }
        };
    }

    /**
     * Define edge connections for each 4D polytope type
     * 
     * [HYPER-TESSERACT UPDATE]
     * Edge definitions for 4D polytopes - connecting vertices that differ by exactly
     * one coordinate (for regular polytopes) to create the wireframe structure.
     */
    _initEdgeDefinitions() {
        return {
            // AEGIS VANGUARD - Tesseract (32 edges)
            // In a tesseract, vertices are connected if they differ in exactly one coordinate
            tesseract: (() => {
                const edges = [];
                for (let i = 0; i < 16; i++) {
                    for (let bit = 0; bit < 4; bit++) {
                        const j = i ^ (1 << bit); // Flip one bit
                        if (j > i) edges.push([i, j]); // Only add each edge once
                    }
                }
                return edges;
            })(),

            // NOVA CORSAIR - 16-Cell (24 edges)
            // In a 16-cell, all vertices are connected except opposite pairs
            cell16: [
                // All pairs except opposites (0-1, 2-3, 4-5, 6-7)
                [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
                [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
                [2, 4], [2, 5], [2, 6], [2, 7],
                [3, 4], [3, 5], [3, 6], [3, 7],
                [4, 6], [4, 7],
                [5, 6], [5, 7]
            ],

            // STORMCALLER - 24-Cell (96 edges, simplified to key structure)
            // 24-cell has 96 edges - we show a subset for visual clarity
            cell24: (() => {
                const edges = [];
                // Connect vertices that are "adjacent" in the 24-cell structure
                // Each vertex connects to 8 others at distance sqrt(2)
                for (let i = 0; i < 24; i++) {
                    for (let j = i + 1; j < 24; j++) {
                        // Connect if indices suggest adjacency in the permutation pattern
                        if ((j - i) <= 4 || (j - i) === 8 || (j - i) === 12) {
                            edges.push([i, j]);
                        }
                    }
                }
                // Limit to prevent visual clutter
                return edges.slice(0, 48);
            })(),

            // NEXUS ARCHITECT - Rectified 5-Cell (30 edges)
            rectified5cell: [
                // Connect first 8 vertices (cube-like)
                [0, 1], [0, 2], [0, 4], [1, 3], [1, 5],
                [2, 3], [2, 6], [3, 7], [4, 5], [4, 6],
                [5, 7], [6, 7],
                // Connect to apex vertices
                [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
                [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9],
                // Connect apexes
                [8, 9]
            ],

            // INFERNO JUGGERNAUT - Double Tesseract (64 edges)
            doubleTesseract: (() => {
                const edges = [];
                // Outer tesseract edges (vertices 0-15)
                for (let i = 0; i < 16; i++) {
                    for (let bit = 0; bit < 4; bit++) {
                        const j = i ^ (1 << bit);
                        if (j > i) edges.push([i, j]);
                    }
                }
                // Inner tesseract edges (vertices 16-31)
                for (let i = 16; i < 32; i++) {
                    for (let bit = 0; bit < 4; bit++) {
                        const j = (i - 16) ^ (1 << bit);
                        if (j > (i - 16)) edges.push([i, j + 16]);
                    }
                }
                // Connect outer to inner (energy channels)
                for (let i = 0; i < 16; i++) {
                    edges.push([i, i + 16]);
                }
                return edges;
            })(),

            // CRIMSON REAVER - 5-Cell (10 edges)
            // In a 5-cell, every vertex connects to every other vertex
            cell5: [
                [0, 1], [0, 2], [0, 3], [0, 4],
                [1, 2], [1, 3], [1, 4],
                [2, 3], [2, 4],
                [3, 4]
            ],

            // VOID WARDEN - Duoprism (3,6) - now with nose at vertex 0
            duoprism36: (() => {
                const edges = [];
                // Connect nose to front ring vertices
                edges.push([0, 1], [0, 4], [0, 7]); // Nose to ring
                // Connect within each triangular layer (3 layers of 6 vertices, starting at index 1)
                for (let layer = 0; layer < 3; layer++) {
                    const base = 1 + layer * 6;
                    for (let i = 0; i < 6; i++) {
                        edges.push([base + i, base + ((i + 1) % 6)]);
                    }
                }
                // Connect between layers
                for (let i = 0; i < 6; i++) {
                    edges.push([1 + i, 7 + i]);
                    edges.push([7 + i, 13 + i]);
                    edges.push([13 + i, 1 + i]);
                }
                // Connect to tail center (vertex 19)
                edges.push([4, 19], [10, 19], [16, 19]);
                return edges;
            })(),

            // PHANTOM STRIKER - Dual 5-Cells - now with centered nose at vertex 0
            dual5cell: [
                // Nose connections
                [0, 1], [0, 5], // Nose to both nacelle fronts
                // First 5-cell (left nacelle, vertices 1-4)
                [1, 2], [1, 3], [1, 4],
                [2, 3], [2, 4],
                [3, 4],
                // Second 5-cell (right nacelle, vertices 5-8)
                [5, 6], [5, 7], [5, 8],
                [6, 7], [6, 8],
                [7, 8],
                // Tail (vertex 9)
                [4, 9], [8, 9], // Nacelles to tail
                // Cross connections for visual interest
                [1, 5], [4, 8]
            ],

            // CYBERNETIC BERSERKER - Truncated Tesseract - now with nose at vertex 0
            truncatedTesseract: [
                // Nose connections (vertex 0)
                [0, 3], [0, 4], // Nose to front base vertices
                // Main bipyramid (vertices 1-6)
                [1, 3], [1, 4], [1, 5], [1, 6], // Top apex to base
                [2, 3], [2, 4], [2, 5], [2, 6], // Bottom apex to base
                [3, 4], [4, 5], [5, 6], [6, 3], // Base ring
                // Left glitch fragment (vertices 7-9)
                [7, 8], [8, 9], [9, 7],
                // Right glitch fragment (vertices 10-12)
                [10, 11], [11, 12], [12, 10],
                // Connect fragments to main body
                [3, 7], [6, 9],
                [4, 10], [5, 12],
                // Energy core (vertex 13)
                [1, 13], [2, 13]
            ],

            // Default fallback - Octahedron
            octahedron: [
                [0, 2], [0, 3], [0, 4], [0, 5],
                [1, 2], [1, 3], [1, 4], [1, 5],
                [2, 4], [4, 3], [3, 5], [5, 2]
            ]
        };
    }

    /**
     * Get shape definition for a character class
     */
    getShapeForClass(characterId) {
        return this.shapeDefinitions[characterId] || this.shapeDefinitions.default;
    }

    /**
     * Get edge definition for a shape type
     */
    getEdgesForShape(shapeType) {
        return this.edgeDefinitions[shapeType] || this.edgeDefinitions.octahedron;
    }

    /**
     * Get rotation speed for a character class
     */
    getRotationSpeed(characterId) {
        return this.rotationSpeeds[characterId] || 0.5;
    }

    /**
     * Get 4D effect intensity for a character class
     * Higher values = more pronounced hypercube breathing
     */
    get4DIntensity(characterId) {
        return this.class4DIntensity[characterId] || 1.0;
    }

    /**
     * Get colors for a character class
     */
    getClassColors(characterId) {
        return this.classColors[characterId] || { primary: '#00ffff', glow: '#00ccff', inner: '#88ffff' };
    }

    /**
     * Project a 4D point to 3D with rotation in XW and YW planes
     * This creates the "hypercube breathing" effect where inner/outer vertices phase through
     * 
     * @param {Object} v - 4D vertex {x, y, z, w}
     * @param {number} rotXW - Rotation angle in XW plane
     * @param {number} rotYW - Rotation angle in YW plane
     * @returns {Object} 3D point {x, y, z}
     */
    project4Dto3D(v, rotXW, rotYW) {
        let { x, y, z, w } = v;

        // Default w to 0 if not present (for 3D shapes)
        if (w === undefined) w = 0;

        // Rotate in XW plane (affects x and w, keeps y and z stable)
        const cosXW = Math.cos(rotXW);
        const sinXW = Math.sin(rotXW);
        const x1 = x * cosXW - w * sinXW;
        const w1 = x * sinXW + w * cosXW;

        // Rotate in YW plane (affects y and w, keeps x and z stable)
        const cosYW = Math.cos(rotYW);
        const sinYW = Math.sin(rotYW);
        const y1 = y * cosYW - w1 * sinYW;
        const w2 = y * sinYW + w1 * cosYW;

        // [FIXED] Simplified 4D perspective to avoid double-perspective distortion
        // Use linear interpolation instead of division for smoother, non-distorted result
        // Don't scale z - let the 3D→2D projection handle depth perspective
        const wDistance = 8.0; // Large distance for subtle effect
        const normalizedW = w2 / wDistance; // Normalize to approx -1..1 range
        const wScale = 1.0 + normalizedW * 0.12; // ±12% scale based on w position

        return {
            x: x1 * wScale,
            y: y1 * wScale,
            z: z  // Don't scale z - avoids double perspective
        };
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

        // Perspective projection
        const fov = 250;
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
     * Generate cache key for player sprite
     * [FIXED] Changed from bit-packing to string key to eliminate collision risk
     */
    _getSpriteCacheKey(characterId, sizeKey, rotXIdx, rotYIdx) {
        // String key is slightly slower but 100% collision-proof and easier to debug
        return `${characterId}:${sizeKey}:${rotXIdx}:${rotYIdx}`;
    }



    /**
     * Get or create cached sprite for player
     * @param {string} characterId - Character class ID
     * @param {number} size - Player radius
     * @param {number} rotX - X rotation angle (3D wobble)
     * @param {number} rotY - Y rotation angle (3D wobble)
     * @param {string} overrideColor - Optional color override
     * @param {number} rotW - 4D rotation angle (for hyper-tesseract animation)
     * @returns {Object|null} Sprite object with canvas and metadata
     */
    getSprite(characterId, size, rotX, rotY, overrideColor = null, rotW = 0) {
        if (typeof document === 'undefined') return null;

        // [SAFETY] Guard against NaN/undefined inputs
        if (isNaN(size) || isNaN(rotX) || isNaN(rotY)) {
            return null;
        }

        // Default rotW if NaN
        if (isNaN(rotW)) rotW = 0;

        // Quantize rotations for cache hit
        const rotXIdx = this.quantizeAngle(rotX);
        const rotYIdx = this.quantizeAngle(rotY);
        const rotWIdx = this.quantizeAngle(rotW); // Quantize 4D rotation too
        const sizeKey = Math.round(size / 4) * 4;

        // Include rotW in cache key for 4D shapes
        const key = `${characterId}:${sizeKey}:${rotXIdx}:${rotYIdx}:${rotWIdx}`;

        // Check cache
        if (this.spriteCache.has(key)) {
            this._spriteCacheAccessTime.set(key, ++_playerShapeCacheAccessCounter);
            return this.spriteCache.get(key);
        }

        // Create sprite
        const shapeDef = this.getShapeForClass(characterId);
        const edges = this.getEdgesForShape(shapeDef.type);
        const colors = this.getClassColors(characterId);

        // Player sprites are larger and more detailed
        const visualScale = 1.0; // Full scale for proper visibility
        const spriteSize = Math.ceil(sizeKey * 4.0);
        const canvas = document.createElement('canvas');
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext('2d');

        const center = spriteSize / 2;
        const angleX = this.cachedRotationAngles[rotXIdx] || 0;
        const angleY = this.cachedRotationAngles[rotYIdx] || 0;
        const angleW = this.cachedRotationAngles[rotWIdx] || 0;

        // Scale and project vertices - handle 4D if applicable
        const vertices = shapeDef.vertices;
        const scaledSize = sizeKey * visualScale;

        const projected = vertices.map(v => {
            let v3d;

            // For 4D shapes, first project from 4D to 3D
            if (shapeDef.is4D) {
                // Get class-specific 4D intensity for personality expression
                const intensity4D = this.get4DIntensity(characterId);

                // Apply 4D rotation with class-specific intensity
                const rotXW = angleW * 0.4 * intensity4D;
                const rotYW = angleW * 0.3 * intensity4D;

                // Project 4D vertex to 3D with class-specific w-scaling
                const v4dScaled = {
                    x: v.x * scaledSize,
                    y: v.y * scaledSize,
                    z: v.z * scaledSize,
                    w: (v.w || 0) * scaledSize * 0.5 * intensity4D
                };
                v3d = this.project4Dto3D(v4dScaled, rotXW, rotYW);
            } else {
                // Standard 3D vertex
                v3d = {
                    x: v.x * scaledSize,
                    y: v.y * scaledSize,
                    z: v.z * scaledSize
                };
            }

            // Then project 3D to 2D with standard rotation
            return this.project(v3d, angleX, angleY, 0);
        });

        // Draw outer glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = overrideColor || colors.glow;

        // Draw wireframe with glow
        const wireColor = overrideColor || colors.primary;
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 2.5; // Slightly thicker than enemies
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

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

        // Draw inner core glow (center point) - two layer effect for depth
        ctx.shadowBlur = 15;
        ctx.fillStyle = colors.glow;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.shadowBlur = 8;
        ctx.fillStyle = colors.inner || colors.glow;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        const sprite = { canvas, halfSize: spriteSize / 2, color: wireColor };

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
        this._spriteCacheAccessTime.set(key, ++_playerShapeCacheAccessCounter);

        return sprite;
    }

    /**
     * Get dynamic rotation speed for berserker (scales with low HP)
     */
    getBerserkerRotationSpeed(healthPercent) {
        // Base 0.4, scales up to 1.0 at low HP
        const baseSpeed = 0.4;
        const maxBonus = 0.6;
        const lowHpThreshold = 0.5;

        if (healthPercent >= lowHpThreshold) {
            return baseSpeed;
        }

        // Scale up as HP drops below 50%
        const hpFactor = (lowHpThreshold - healthPercent) / lowHpThreshold;
        return baseSpeed + maxBonus * hpFactor;
    }

    /**
     * Clear the sprite cache
     */
    clearCache() {
        _playerShapeCache.clear();
        _playerShapeCacheAccessTime.clear();
        _playerShapeCacheAccessCounter = 0;
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
    window.Game.PlayerShapeCache = PlayerShapeCache;

    // Create singleton instance
    window.Game.playerShapeCache = new PlayerShapeCache();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerShapeCache;
}

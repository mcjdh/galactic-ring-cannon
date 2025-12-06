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
        this.rotationSpeeds = {
            aegis_vanguard: 0.3,       // Slow, steady, reliable
            nova_corsair: 0.8,          // Fast, aggressive
            stormcaller: 0.6,           // Medium-fast, electric
            nexus_architect: 0.4,       // Methodical, precise
            inferno_juggernaut: 0.25,   // Very slow, unstoppable
            crimson_reaver: 0.75,       // Fast, predatory
            void_warden: 0.35,          // Slow, warping
            phantom_striker: 0.85,      // Fast, erratic
            cybernetic_berserker: 0.4   // Base speed, increases with damage
        };

        // Class colors for wireframe glow
        this.classColors = {
            aegis_vanguard: { primary: '#00ffff', glow: '#00ccff' },
            nova_corsair: { primary: '#f39c12', glow: '#ff6600' },
            stormcaller: { primary: '#3498db', glow: '#00aaff' },
            nexus_architect: { primary: '#9b59b6', glow: '#aa44ff' },
            inferno_juggernaut: { primary: '#e74c3c', glow: '#ff4400' },
            crimson_reaver: { primary: '#c0392b', glow: '#ff0044' },
            void_warden: { primary: '#8e44ad', glow: '#6600aa' },
            phantom_striker: { primary: '#1abc9c', glow: '#00ff88' },
            cybernetic_berserker: { primary: '#f1c40f', glow: '#ffcc00' }
        };
    }

    _updateFastMathRef() {
        this._fastMath = (typeof window !== 'undefined' && window.Game?.FastMath) || null;
    }

    /**
     * Define unique 3D vertices for each character class
     * Each shape is designed to match the character's personality and role
     */
    _initShapeDefinitions() {
        const s = 1.0; // Unit scale

        return {
            // AEGIS VANGUARD - Tesseract Shield (hypercube with front emphasis)
            // Protective, solid, layered defense
            aegis_vanguard: {
                type: 'tesseractShield',
                vertices: [
                    // Outer cube (shield frame)
                    { x: -s, y: -s, z: -s * 0.8 }, { x: s, y: -s, z: -s * 0.8 },
                    { x: s, y: s, z: -s * 0.8 }, { x: -s, y: s, z: -s * 0.8 },
                    { x: -s * 0.8, y: -s * 0.8, z: s }, { x: s * 0.8, y: -s * 0.8, z: s },
                    { x: s * 0.8, y: s * 0.8, z: s }, { x: -s * 0.8, y: s * 0.8, z: s },
                    // Inner shield core
                    { x: -s * 0.4, y: -s * 0.4, z: 0 }, { x: s * 0.4, y: -s * 0.4, z: 0 },
                    { x: s * 0.4, y: s * 0.4, z: 0 }, { x: -s * 0.4, y: s * 0.4, z: 0 },
                    // Front shield plate vertices
                    { x: 0, y: -s * 1.2, z: -s * 0.5 }, // Top point
                    { x: s * 1.1, y: 0, z: -s * 0.5 },  // Right
                    { x: 0, y: s * 1.2, z: -s * 0.5 }   // Bottom
                ]
            },

            // NOVA CORSAIR - Spiked Dart (aggressive forward-pointing)
            // Fast, predatory, swept-back design
            nova_corsair: {
                type: 'spikedDart',
                vertices: [
                    // Sharp nose
                    { x: 0, y: 0, z: -s * 1.8 },
                    // Main body diamond
                    { x: -s * 0.6, y: 0, z: -s * 0.2 },
                    { x: 0, y: -s * 0.5, z: -s * 0.2 },
                    { x: s * 0.6, y: 0, z: -s * 0.2 },
                    { x: 0, y: s * 0.5, z: -s * 0.2 },
                    // Swept-back wings
                    { x: -s * 1.4, y: 0, z: s * 0.6 },
                    { x: s * 1.4, y: 0, z: s * 0.6 },
                    // Tail spikes
                    { x: -s * 0.4, y: 0, z: s * 1.0 },
                    { x: s * 0.4, y: 0, z: s * 1.0 },
                    { x: 0, y: 0, z: s * 0.7 }
                ]
            },

            // STORMCALLER - Stellated Octahedron (star burst)
            // Lightning-like, spiky, electric energy
            stormcaller: {
                type: 'stellatedOcta',
                vertices: [
                    // Core octahedron
                    { x: 0, y: -s * 0.7, z: 0 },  // Top
                    { x: 0, y: s * 0.7, z: 0 },   // Bottom
                    { x: -s * 0.7, y: 0, z: 0 },  // Left
                    { x: s * 0.7, y: 0, z: 0 },   // Right
                    { x: 0, y: 0, z: -s * 0.7 },  // Front
                    { x: 0, y: 0, z: s * 0.7 },   // Back
                    // Lightning spikes extending out
                    { x: 0, y: -s * 1.5, z: 0 },  // Top spike
                    { x: 0, y: s * 1.5, z: 0 },   // Bottom spike
                    { x: -s * 1.5, y: 0, z: 0 },  // Left spike
                    { x: s * 1.5, y: 0, z: 0 },   // Right spike
                    { x: 0, y: 0, z: -s * 1.5 },  // Front spike
                    { x: 0, y: 0, z: s * 1.5 }    // Back spike
                ]
            },

            // NEXUS ARCHITECT - Complex Orbital Sphere (icosidodecahedron-inspired)
            // Many facets, precise, orbital control
            nexus_architect: {
                type: 'orbitalSphere',
                vertices: (() => {
                    const verts = [];
                    // Create spherical distribution of points
                    const phi = (1 + Math.sqrt(5)) / 2;
                    const a = s * 0.6;
                    const b = a * phi;
                    // Icosahedral vertices
                    verts.push({ x: 0, y: a, z: b }, { x: 0, y: a, z: -b });
                    verts.push({ x: 0, y: -a, z: b }, { x: 0, y: -a, z: -b });
                    verts.push({ x: a, y: b, z: 0 }, { x: a, y: -b, z: 0 });
                    verts.push({ x: -a, y: b, z: 0 }, { x: -a, y: -b, z: 0 });
                    verts.push({ x: b, y: 0, z: a }, { x: b, y: 0, z: -a });
                    verts.push({ x: -b, y: 0, z: a }, { x: -b, y: 0, z: -a });
                    // Inner orbital ring 
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        verts.push({
                            x: Math.cos(angle) * s * 0.4,
                            y: 0,
                            z: Math.sin(angle) * s * 0.4
                        });
                    }
                    return verts;
                })()
            },

            // INFERNO JUGGERNAUT - Reinforced Heavy Cube (double-walled fortress)
            // Massive, heavy, thick lines
            inferno_juggernaut: {
                type: 'fortressCube',
                vertices: [
                    // Outer heavy cube
                    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
                    { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
                    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
                    { x: s, y: s, z: s }, { x: -s, y: s, z: s },
                    // Inner burning core (slightly offset for dynamic look)
                    { x: -s * 0.35, y: -s * 0.35, z: -s * 0.35 },
                    { x: s * 0.35, y: -s * 0.35, z: -s * 0.35 },
                    { x: s * 0.35, y: s * 0.35, z: -s * 0.35 },
                    { x: -s * 0.35, y: s * 0.35, z: -s * 0.35 },
                    { x: -s * 0.35, y: -s * 0.35, z: s * 0.35 },
                    { x: s * 0.35, y: -s * 0.35, z: s * 0.35 },
                    { x: s * 0.35, y: s * 0.35, z: s * 0.35 },
                    { x: -s * 0.35, y: s * 0.35, z: s * 0.35 }
                ]
            },

            // CRIMSON REAVER - Twisted Prism (predatory, fang-like)
            // Sharp edges, vampiric, aggressive
            crimson_reaver: {
                type: 'twistedPrism',
                vertices: [
                    // Front fang point
                    { x: 0, y: 0, z: -s * 1.6 },
                    // Upper twisted triangle
                    { x: -s * 0.5, y: -s * 0.8, z: -s * 0.3 },
                    { x: s * 0.5, y: -s * 0.8, z: -s * 0.3 },
                    { x: 0, y: -s * 0.6, z: s * 0.5 },
                    // Lower twisted triangle (rotated)
                    { x: -s * 0.7, y: s * 0.5, z: 0 },
                    { x: s * 0.7, y: s * 0.5, z: 0 },
                    { x: 0, y: s * 0.8, z: s * 0.6 },
                    // Tail spike
                    { x: 0, y: 0, z: s * 1.2 }
                ]
            },

            // VOID WARDEN - Toroidal Cage (ring with event horizon center)
            // Hollow center, gravity control, spatial
            void_warden: {
                type: 'toroidalCage',
                vertices: (() => {
                    const verts = [];
                    // Outer torus ring (12 points)
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const r = s * 1.1;
                        verts.push({
                            x: Math.cos(angle) * r,
                            y: Math.sin(angle) * r * 0.3, // Flatten Y
                            z: Math.sin(angle) * r * 0.5  // Add Z depth
                        });
                    }
                    // Inner ring (event horizon)
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        const r = s * 0.5;
                        verts.push({
                            x: Math.cos(angle) * r,
                            y: 0,
                            z: Math.sin(angle) * r
                        });
                    }
                    // Center singularity point
                    verts.push({ x: 0, y: 0, z: 0 });
                    return verts;
                })()
            },

            // PHANTOM STRIKER - Dual Tetrahedrons (phasing, ghostly separation)
            // Two separate pieces, ethereal, ricochet
            phantom_striker: {
                type: 'dualTetra',
                vertices: [
                    // First tetrahedron (left/front)
                    { x: -s * 0.5, y: 0, z: -s * 0.8 },
                    { x: -s * 0.9, y: -s * 0.5, z: s * 0.3 },
                    { x: -s * 0.9, y: s * 0.5, z: s * 0.3 },
                    { x: -s * 0.3, y: 0, z: s * 0.1 },
                    // Second tetrahedron (right/back, offset for "phase" effect)
                    { x: s * 0.5, y: 0, z: -s * 0.6 },
                    { x: s * 0.9, y: -s * 0.5, z: s * 0.5 },
                    { x: s * 0.9, y: s * 0.5, z: s * 0.5 },
                    { x: s * 0.3, y: 0, z: s * 0.3 },
                    // Center connection ghost line
                    { x: 0, y: 0, z: -s * 0.2 },
                    { x: 0, y: 0, z: s * 0.2 }
                ]
            },

            // CYBERNETIC BERSERKER - Fractured Bipyramid (glitchy, asymmetric)
            // Broken appearance, unstable, raw power
            cybernetic_berserker: {
                type: 'fracturedBipyramid',
                vertices: [
                    // Main bipyramid (slightly asymmetric)
                    { x: 0, y: -s * 1.3, z: 0 },      // Top apex
                    { x: 0, y: s * 1.0, z: 0 },       // Bottom apex (asymmetric)
                    { x: -s * 0.9, y: 0, z: -s * 0.6 },  // Base vertices
                    { x: s * 0.8, y: -s * 0.1, z: -s * 0.7 }, // Offset for glitch
                    { x: s * 0.85, y: 0.1, z: s * 0.65 },
                    { x: -s * 0.7, y: -0.05, z: s * 0.8 },
                    // Glitch fragment (floating piece)
                    { x: s * 1.2, y: -s * 0.4, z: 0 },
                    { x: s * 1.4, y: 0, z: s * 0.2 },
                    { x: s * 1.3, y: s * 0.3, z: -s * 0.1 },
                    // Energy core
                    { x: 0, y: -s * 0.2, z: 0 }
                ]
            },

            // Default fallback
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
     */
    _initEdgeDefinitions() {
        return {
            tesseractShield: [
                // Outer cube frame
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7],
                // Inner shield core
                [8, 9], [9, 10], [10, 11], [11, 8],
                // Outer to inner connections
                [0, 8], [1, 9], [2, 10], [3, 11],
                // Front shield plate
                [12, 13], [13, 14], [14, 12],
                [0, 12], [1, 12], [2, 14], [3, 14]
            ],

            spikedDart: [
                // Nose to body
                [0, 1], [0, 2], [0, 3], [0, 4],
                // Body diamond
                [1, 2], [2, 3], [3, 4], [4, 1],
                // Wings
                [1, 5], [3, 6],
                [5, 7], [6, 8],
                // Tail
                [7, 9], [8, 9],
                [5, 9], [6, 9]
            ],

            stellatedOcta: [
                // Core octahedron
                [0, 2], [0, 3], [0, 4], [0, 5],
                [1, 2], [1, 3], [1, 4], [1, 5],
                [2, 4], [4, 3], [3, 5], [5, 2],
                // Spikes from core to extended points
                [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]
            ],

            orbitalSphere: [
                // Icosahedral connections (simplified)
                [0, 2], [0, 4], [0, 6], [0, 8], [0, 10],
                [1, 3], [1, 4], [1, 6], [1, 9], [1, 11],
                [2, 5], [2, 7], [2, 8], [2, 10],
                [3, 5], [3, 7], [3, 9], [3, 11],
                [4, 6], [4, 8], [4, 9],
                [5, 8], [5, 9], [6, 10], [6, 11],
                [7, 10], [7, 11], [8, 9], [10, 11],
                // Inner orbital ring
                [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 12]
            ],

            fortressCube: [
                // Outer cube (heavy)
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7],
                // Inner core cube
                [8, 9], [9, 10], [10, 11], [11, 8],
                [12, 13], [13, 14], [14, 15], [15, 12],
                [8, 12], [9, 13], [10, 14], [11, 15],
                // Connections (energy channels)
                [0, 8], [1, 9], [2, 10], [3, 11],
                [4, 12], [5, 13], [6, 14], [7, 15]
            ],

            twistedPrism: [
                // Front fang connections
                [0, 1], [0, 2], [0, 4], [0, 5],
                // Upper triangle
                [1, 2], [2, 3], [3, 1],
                // Lower triangle
                [4, 5], [5, 6], [6, 4],
                // Cross connections (twist)
                [1, 4], [2, 5], [3, 6],
                // Tail
                [3, 7], [6, 7]
            ],

            toroidalCage: [
                // Outer ring connections
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
                [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
                [10, 11], [11, 0],
                // Cross-ring connections
                [0, 6], [3, 9],
                // Inner ring
                [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 12],
                // Outer to inner (gravity lines)
                [0, 12], [2, 13], [4, 14], [6, 15], [8, 16], [10, 17],
                // Center singularity
                [12, 18], [14, 18], [16, 18]
            ],

            dualTetra: [
                // First tetrahedron
                [0, 1], [0, 2], [0, 3],
                [1, 2], [2, 3], [3, 1],
                // Second tetrahedron
                [4, 5], [4, 6], [4, 7],
                [5, 6], [6, 7], [7, 5],
                // Ghost connection between phases
                [3, 8], [7, 9], [8, 9]
            ],

            fracturedBipyramid: [
                // Main bipyramid
                [0, 2], [0, 3], [0, 4], [0, 5],
                [1, 2], [1, 3], [1, 4], [1, 5],
                [2, 3], [3, 4], [4, 5], [5, 2],
                // Glitch fragment
                [6, 7], [7, 8], [8, 6],
                // Connection to main (breaking away)
                [3, 6],
                // Energy core
                [0, 9], [1, 9]
            ],

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
     * Get colors for a character class
     */
    getClassColors(characterId) {
        return this.classColors[characterId] || { primary: '#00ffff', glow: '#00ccff' };
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
     */
    _getSpriteCacheKey(characterId, sizeKey, rotXIdx, rotYIdx) {
        const typeHash = this._hashType(characterId);
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
     * Get or create cached sprite for player
     * @param {string} characterId - Character class ID
     * @param {number} size - Player radius
     * @param {number} rotX - X rotation angle
     * @param {number} rotY - Y rotation angle  
     * @param {string} overrideColor - Optional color override
     * @returns {Object|null} Sprite object with canvas and metadata
     */
    getSprite(characterId, size, rotX, rotY, overrideColor = null) {
        if (typeof document === 'undefined') return null;

        // Quantize rotations for cache hit
        const rotXIdx = this.quantizeAngle(rotX);
        const rotYIdx = this.quantizeAngle(rotY);
        const sizeKey = Math.round(size / 4) * 4;

        const key = this._getSpriteCacheKey(characterId, sizeKey, rotXIdx, rotYIdx);

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
        const visualScale = 0.85; // Slightly larger than enemies
        const spriteSize = Math.ceil(sizeKey * 4.0);
        const canvas = document.createElement('canvas');
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext('2d');

        const center = spriteSize / 2;
        const angleX = this.cachedRotationAngles[rotXIdx] || 0;
        const angleY = this.cachedRotationAngles[rotYIdx] || 0;

        // Scale vertices and project
        const vertices = shapeDef.vertices;
        const scaledSize = sizeKey * visualScale;
        const projected = vertices.map(v => {
            const scaled = { x: v.x * scaledSize, y: v.y * scaledSize, z: v.z * scaledSize };
            return this.project(scaled, angleX, angleY, 0);
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

        // Draw inner core glow (center point)
        ctx.shadowBlur = 12;
        ctx.fillStyle = colors.glow;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize * 0.15, 0, Math.PI * 2);
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

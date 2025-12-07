/**
 * [C] COSMIC BACKGROUND SYSTEM
 * Polybius Geometric Hyperdimensional Background
 *
 * Features:
 * - Dynamic Vector Grid (warps with player movement)
 * - Floating 3D Wireframe Geometry
 * - Neon Vector Stars
 * - Retro Arcade Aesthetic
 *
 * Performance Optimizations:
 * - Pre-rendered grid canvas with parallax offset
 * - Layered star rendering with depth-based parallax
 * - Shape sprite caching with rotation quantization (SHARED across instances)
 * - FastMath integration for trig operations
 * - LRU cache eviction to bound memory usage
 */

// [PERF OPT-7] Shared sprite cache across all CosmicBackground instances
// This prevents cache rebuilding when switching from menu to game
const _sharedSpriteCache = new Map();
const _sharedSpriteCacheAccessTime = new Map();
let _sharedSpriteCacheAccessCounter = 0;

// [PERF OPT-8] Shared grid canvas cache (keyed by gridSize)
// Note: Star layers are NOT cached because they contain randomized star positions
const _sharedGridCanvasCache = new Map(); // key: gridSize -> canvas

// Track last initialized dimensions to avoid redundant re-initialization
let _lastInitializedWidth = 0;
let _lastInitializedHeight = 0;

class CosmicBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Configuration
        this.colors = {
            bg: '#000000',
            grid: 'rgba(0, 255, 50, 0.08)',
            gridHighlight: 'rgba(255, 0, 85, 0.15)',
            stars: ['#00ff99', '#ff0055', '#ffcc00', '#00ff33'],
            shapes: [
                'rgba(0, 255, 153, 0.3)', // Mint Green
                'rgba(255, 0, 85, 0.3)',  // Deep Red
                'rgba(255, 204, 0, 0.3)', // Gold
                'rgba(0, 255, 51, 0.3)'   // Lime
            ]
        };

        this.time = 0;
        this.lastTime = performance.now();
        // [FIX] Start with full quality so shapes render immediately
        // PerformanceManager will adjust if device is low-end after first frames
        this.lowQuality = false;

        // Grid settings
        this.gridSize = 100;
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;

        // Floating Shapes - Sacred Geometry for hyperdimensional Polybius vibes
        this.shapes = [];
        this.shapeCount = 33;

        // Vector Stars
        this.stars = [];
        this.starCount = 100;

        // World Dimensions for Infinite Scrolling
        this.worldPadding = 2000;
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;

        // [PERF OPT-1] Shape Sprite Cache - Pre-rendered shapes at various rotations
        // [PERF OPT-7] Use shared cache across all instances to avoid rebuilding on scene switch
        this.shapeSpriteCache = _sharedSpriteCache;
        this._spriteCacheAccessTime = _sharedSpriteCacheAccessTime;
        this.rotationSteps = 24; // 24 angles = 15° increments
        this.twoPI = Math.PI * 2;
        this._invRotationSteps = this.rotationSteps / this.twoPI; // Pre-compute for quantization
        this.cachedRotationAngles = new Float32Array(this.rotationSteps);
        for (let i = 0; i < this.rotationSteps; i++) {
            this.cachedRotationAngles[i] = (i / this.rotationSteps) * this.twoPI;
        }
        this.enableShapeCache = true;
        this.spriteCacheMaxSize = 400;
        this.spriteCacheEvictCount = 50;

        // [PERF OPT-2] Star Layer Pre-Rendering
        this.starLayers = null;
        // FIX: Use <= for upper bound to ensure stars at boundaries get assigned
        this.starLayerDepths = [
            { min: 0.5, max: 1.0, layer: 0 },   // Foreground (0.5 <= z < 1.0)
            { min: 1.0, max: 1.5, layer: 1 },   // Midground (1.0 <= z < 1.5)
            { min: 1.5, max: 2.5, layer: 2 }    // Background (1.5 <= z <= 2.5)
        ];
        this.enableStarLayers = true;

        // [PERF OPT-3] Grid Pre-Computation
        this.gridCanvas = null;
        this.enableGridCache = true;

        // [PERF OPT-4] Low-quality throttling
        this._lastRenderTs = 0;
        this._lowQualityMinInterval = 50; // ms (~20fps cap)

        // [PERF OPT-5] Cache FastMath reference to avoid repeated lookups
        this._fastMath = null;
        this._updateFastMathRef();

        this.initialize();
    }

    /**
     * Cache FastMath reference for hot-path trig operations
     */
    _updateFastMathRef() {
        this._fastMath = (typeof window !== 'undefined' && window.Game?.FastMath) || null;
    }

    initialize() {
        // Refresh FastMath reference (may not have been available at construction)
        this._updateFastMathRef();

        // Guard against invalid canvas dimensions
        if (this.canvas.width <= 0 || this.canvas.height <= 0) {
            return;
        }

        // [PERF OPT-9] Skip full re-initialization if dimensions match last init
        // This prevents costly star/shape regeneration on scene switches
        const sameSize = (this.canvas.width === _lastInitializedWidth &&
            this.canvas.height === _lastInitializedHeight);
        if (sameSize && this.stars.length > 0 && this.shapes.length > 0) {
            // Just ensure caches are valid
            if (this.enableGridCache && !this.gridCanvas) {
                this.initializeGridCanvas();
            }
            if (this.enableStarLayers && !this.starLayers) {
                this.initializeStarLayers();
            }
            return;
        }

        // Track dimensions for future calls
        _lastInitializedWidth = this.canvas.width;
        _lastInitializedHeight = this.canvas.height;

        // Update world dimensions in case of resize
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;

        // Initialize Shapes
        this.shapes = [];

        // ✦ Origin Nexus: A special Metatron's Cube at the player spawn point
        // Player spawns at (canvas.width/2, canvas.height/2)
        // 
        // Rendering formula for shapes:
        //   parallaxFactor = min(0.8, 1.0/z) = 0.8 for z=1.0
        //   relX = (shape.x - player.x * parallaxFactor) % worldW
        //   screenX = relX - offset
        //
        // For screenX = canvas.width/2 when player.x = canvas.width/2:
        //   relX = canvas.width/2 + offset
        //   shape.x = relX + player.x * 0.8
        //   shape.x = (canvas.width/2 + offset) + (canvas.width/2) * 0.8
        //   shape.x = canvas.width * 0.9 + offset
        const offset = this.worldPadding / 2;

        // Calculate position so shape appears at screen center when player is at spawn
        const originNexusX = this.canvas.width * 0.9 + offset;
        const originNexusY = this.canvas.height * 0.9 + offset;

        // Store origin nexus world position for minimap indicator (player spawn = canvas center)
        this.originNexusWorldX = this.canvas.width / 2;
        this.originNexusWorldY = this.canvas.height / 2;

        this.shapes.push({
            type: 'origin_nexus',  // Enhanced shape: Metatron's Cube + orbital rings
            x: originNexusX,
            y: originNexusY,
            z: 1.0,  // z=1.0, parallax capped at 0.8 (moves with player at 80% rate)
            size: 65, // Larger for the orbital rings to be visible
            color: 'rgba(100, 180, 255, 0.5)', // Bright cyan-blue for nexus
            rotX: 0,
            rotY: 0,
            rotZ: 0,
            rotSpeedX: 0.05,  // Very slow, contemplative rotation
            rotSpeedY: 0.08,
            rotSpeedZ: 0.03,
            driftX: 0,  // Stationary - anchors the origin
            driftY: 0,
            isOriginNexus: true  // Flag for special handling
        });

        // Regular shapes (one less since we added the Origin Nexus)
        for (let i = 1; i < this.shapeCount; i++) {
            this.shapes.push(this.createShape());
        }

        // Initialize Stars with depth capped to layer range
        this.stars = [];
        const maxStarZ = this.starLayerDepths[this.starLayerDepths.length - 1].max;
        const minStarZ = this.starLayerDepths[0].min;
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                z: minStarZ + Math.random() * (maxStarZ - minStarZ), // Ensure within layer bounds
                size: Math.random() * 2 + 1,
                color: this.colors.stars[Math.floor(Math.random() * this.colors.stars.length)],
                blinkSpeed: Math.random() * 2 + 1,
                blinkOffset: Math.random() * Math.PI * 2,
                type: Math.random() > 0.5 ? 'cross' : 'diamond'
            });
        }

        // [PERF OPT-3] Initialize pre-rendered grid canvas
        if (this.enableGridCache) {
            this.initializeGridCanvas();
        }

        // [PERF OPT-2] Initialize pre-rendered star layers
        if (this.enableStarLayers) {
            this.initializeStarLayers();
        }

        // [PERF OPT-6] Pre-warm shape sprite cache to avoid jank during gameplay
        if (this.enableShapeCache) {
            this.prewarmShapeCache();
        }
    }

    /**
     * [PERF OPT-6] Pre-warm shape sprite cache
     * Creates sprites for all initial shapes to avoid canvas creation during gameplay
     */
    prewarmShapeCache() {
        if (!this.enableShapeCache || typeof document === 'undefined') return;

        // Pre-render sprites for all current shapes
        for (const shape of this.shapes) {
            this.getShapeSprite(shape);
        }
    }

    createShape() {
        // Sacred geometry shapes for hyperdimensional Polybius vibes
        // Weighted distribution: basic shapes slightly more common, complex shapes rarer
        const types = [
            'cube', 'cube',           // Classic - 2x weight
            'pyramid', 'pyramid',     // Classic - 2x weight  
            'octahedron',             // Platonic solid
            'tesseract',              // 4D hypercube projection ★
            'merkaba',                // Star tetrahedron - sacred geometry
            'icosahedron',            // 20-faced Platonic solid
            'stellated_octahedron',   // Spiky cosmic
            'dodecahedron',           // 12 pentagonal faces - ultimate Platonic
            'metatrons_cube'          // Sacred geometry master pattern ✦
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const size = 15 + Math.random() * 35;

        // Z-Depth: 1.0 is standard plane. Higher is further away.
        // Range 0.8 (slightly foreground) to 4.0 (deep background)
        const z = 0.8 + Math.random() * 3.2;

        // Complex shapes get slightly slower rotation for visual clarity
        const isComplex = ['tesseract', 'icosahedron', 'dodecahedron'].includes(type);
        const rotSpeedMult = isComplex ? 0.6 : 1.0;

        return {
            type: type,
            // Spawn across the full virtual world
            x: Math.random() * this.worldW,
            y: Math.random() * this.worldH,
            z: z,
            size: size,
            color: this.colors.shapes[Math.floor(Math.random() * this.colors.shapes.length)],
            rotX: Math.random() * Math.PI * 2,
            rotY: Math.random() * Math.PI * 2,
            rotZ: Math.random() * Math.PI * 2,
            rotSpeedX: (Math.random() - 0.5) * 0.5 * rotSpeedMult,
            rotSpeedY: (Math.random() - 0.5) * 0.5 * rotSpeedMult,
            rotSpeedZ: (Math.random() - 0.5) * 0.5 * rotSpeedMult,
            driftX: (Math.random() - 0.5) * 10,
            driftY: (Math.random() - 0.5) * 10
        };
    }

    update(deltaTime, playerX, playerY) {
        this.time += deltaTime;
        this.lastPlayerX = playerX;
        this.lastPlayerY = playerY;

        // Update Shapes (always update, even in lowQuality - content should be same for all modes)
        const shapes = this.shapes;
        for (let i = 0, len = shapes.length; i < len; i++) {
            const shape = shapes[i];
            shape.rotX += shape.rotSpeedX * deltaTime;
            shape.rotY += shape.rotSpeedY * deltaTime;
            shape.rotZ += shape.rotSpeedZ * deltaTime;

            // Drift (World Space)
            shape.x += shape.driftX * deltaTime;
            shape.y += shape.driftY * deltaTime;

            // Note: We no longer wrap here. Wrapping is handled in render relative to camera.
        }
    }

    render(player) {
        // Calculate delta time
        const now = performance.now();
        let deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Throttle rendering when low quality is enabled to reduce CPU/GPU work
        // [FIX] REMOVED EARLY RETURN for throttling.
        // Returning early means the canvas is NOT cleared, causing "liquifying" trails
        // because GameEngine draws entities on top of the uncleared previous frame.
        // To properly throttle, we would need to render to an offscreen buffer and draw that.
        // For now, correctness > minor perf gain.
        /*
        if (this.lowQuality && this._lastRenderTs) {
            const sinceLast = now - this._lastRenderTs;
            if (sinceLast < this._lowQualityMinInterval) {
                return;
            }
        }
        */
        this._lastRenderTs = now;

        // Safety check for NaN or huge time jumps (lag spikes)
        if (isNaN(deltaTime) || deltaTime > 0.1) {
            deltaTime = 0.016; // Fallback to ~60fps
        }

        // Update state
        if (player) {
            this.update(deltaTime, player.x, player.y);
        } else {
            this.update(deltaTime, this.lastPlayerX, this.lastPlayerY);
        }

        // Clear background
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid (same for all quality modes)
        this.drawGrid();

        // Draw Stars (same for all quality modes)
        this.drawStars();

        // Draw Shapes (same for all quality modes)
        this.drawShapes();
    }

    drawGrid() {
        // [PERF OPT-3] Use pre-rendered grid canvas if available
        if (this.enableGridCache && this.gridCanvas) {
            // Calculate offset for parallax scrolling
            const offsetX = (-this.lastPlayerX * 0.5) % this.gridSize;
            const offsetY = (-this.lastPlayerY * 0.5) % this.gridSize;

            // Pulsing grid for extra retro vibe
            const pulse = 0.08 + 0.04 * Math.sin(this.time * 2);
            this.ctx.globalAlpha = pulse;

            // Draw the cached grid with offset
            this.ctx.drawImage(
                this.gridCanvas,
                offsetX - this.gridSize * 7, // Center the oversized grid
                offsetY - this.gridSize * 7,
                this.gridSize * 15,
                this.gridSize * 15
            );

            this.ctx.globalAlpha = 1.0;
            return;
        }

        // Fallback: Original dynamic grid rendering
        this.ctx.lineWidth = 1;
        // Pulsing grid for extra retro vibe
        const pulse = 0.08 + 0.04 * Math.sin(this.time * 2);
        this.ctx.strokeStyle = `rgba(0, 255, 50, ${pulse})`;

        // Safety check
        if (this.gridSize <= 0) this.gridSize = 100;

        const offsetX = (-this.lastPlayerX * 0.5) % this.gridSize;
        const offsetY = (-this.lastPlayerY * 0.5) % this.gridSize;

        this.ctx.beginPath();

        // Normalize offset to 0..gridSize
        const normOffsetX = ((-this.lastPlayerX * 0.5) % this.gridSize + this.gridSize) % this.gridSize;
        const normOffsetY = ((-this.lastPlayerY * 0.5) % this.gridSize + this.gridSize) % this.gridSize;

        // Vertical lines
        for (let x = normOffsetX - this.gridSize; x < this.canvas.width; x += this.gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }

        // Horizontal lines
        for (let y = normOffsetY - this.gridSize; y < this.canvas.height; y += this.gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();
    }

    drawStars() {
        // [PERF OPT-2] Use pre-rendered star layers if available
        if (this.enableStarLayers && this.starLayers) {
            this.ctx.save();

            // Draw each layer with parallax offset and blink effect
            for (let i = 0; i < this.starLayers.length; i++) {
                const layer = this.starLayers[i];
                const depthRange = this.starLayerDepths[i];
                const avgZ = (depthRange.min + depthRange.max) / 2;
                const parallaxFactor = 0.1 * avgZ;

                // Calculate parallax offset with wrapping
                const wrapW = this.canvas.width;
                const wrapH = this.canvas.height;
                let offsetX = (-this.lastPlayerX * parallaxFactor) % wrapW;
                let offsetY = (-this.lastPlayerY * parallaxFactor) % wrapH;

                if (offsetX < 0) offsetX += wrapW;
                if (offsetY < 0) offsetY += wrapH;

                // Apply gentle global blink (varies per layer for depth)
                const blink = 0.7 + 0.3 * Math.sin(this.time * (1 + i * 0.3));
                this.ctx.globalAlpha = blink;

                // Draw layer with parallax offset
                this.ctx.drawImage(layer.canvas, offsetX, offsetY);

                // Tile to fill gaps (simple 4-tile approach)
                this.ctx.drawImage(layer.canvas, offsetX - wrapW, offsetY);
                this.ctx.drawImage(layer.canvas, offsetX, offsetY - wrapH);
                this.ctx.drawImage(layer.canvas, offsetX - wrapW, offsetY - wrapH);
            }

            this.ctx.restore();
            return;
        }

        // Fallback: Original dynamic star rendering
        this.ctx.save();
        for (const star of this.stars) {
            // Parallax with robust wrapping
            const parallaxFactor = 0.1 * star.z;
            const wrapW = this.canvas.width;
            const wrapH = this.canvas.height;

            // Calculate relative position
            let relX = (star.x - this.lastPlayerX * parallaxFactor) % wrapW;
            let relY = (star.y - this.lastPlayerY * parallaxFactor) % wrapH;

            // Normalize to positive range [0, wrapW]
            if (relX < 0) relX += wrapW;
            if (relY < 0) relY += wrapH;

            // Blink
            const alpha = 0.5 + 0.5 * Math.sin(this.time * star.blinkSpeed + star.blinkOffset);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = star.color;

            if (star.type === 'cross') {
                this.ctx.fillRect(relX - star.size, relY - star.size / 4, star.size * 2, star.size / 2);
                this.ctx.fillRect(relX - star.size / 4, relY - star.size, star.size / 2, star.size * 2);
            } else {
                // Diamond
                this.ctx.beginPath();
                this.ctx.moveTo(relX, relY - star.size);
                this.ctx.lineTo(relX + star.size, relY);
                this.ctx.lineTo(relX, relY + star.size);
                this.ctx.lineTo(relX - star.size, relY);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }

    /**
     * Lightweight star rendering for low-quality mode
     * Skips most stars and avoids layer compositing to reduce CPU/GPU load.
     */
    drawStarsLowQuality() {
        const stars = this.stars;
        const stride = Math.max(1, this._lowQualityStarStride);
        this.ctx.fillStyle = '#00ff99';

        for (let i = 0; i < stars.length; i += stride) {
            const star = stars[i];
            // Simple parallax offset
            const parallaxFactor = 0.08 * star.z;
            let x = (star.x - this.lastPlayerX * parallaxFactor) % this.canvas.width;
            let y = (star.y - this.lastPlayerY * parallaxFactor) % this.canvas.height;

            if (x < 0) x += this.canvas.width;
            if (y < 0) y += this.canvas.height;

            const baseSize = Math.max(1, star.size * 0.6);
            this.ctx.fillRect(x, y, baseSize, baseSize);
        }
    }

    drawShapes() {
        // Use original coordinate system for proper wrapping
        const worldW = this.worldW;
        const worldH = this.worldH;
        const offset = this.worldPadding / 2;
        const isMenu = (Math.abs(this.lastPlayerX) < 1 && Math.abs(this.lastPlayerY) < 1);

        // [PERF OPT-1] Use cached sprites if enabled
        if (this.enableShapeCache) {
            for (const shape of this.shapes) {
                const sprite = this.getShapeSprite(shape);

                if (sprite) {
                    // Use ORIGINAL parallax calculation for consistency
                    const parallaxFactor = Math.min(0.8, 1.0 / shape.z);
                    let relX = (shape.x - this.lastPlayerX * parallaxFactor) % worldW;
                    let relY = (shape.y - this.lastPlayerY * parallaxFactor) % worldH;

                    // Normalize to positive range [0, worldW]
                    if (relX < 0) relX += worldW;
                    if (relY < 0) relY += worldH;

                    // Center the virtual world on the screen
                    const screenX = relX - offset;
                    const screenY = relY - offset;

                    // Cull shapes that are far off-screen
                    if (screenX < -200 || screenX > this.canvas.width + 200 ||
                        screenY < -200 || screenY > this.canvas.height + 200) {
                        continue;
                    }

                    // Menu Mode: Push shapes away from center
                    // [PERF] Use distanceSquared to avoid sqrt
                    if (isMenu) {
                        const centerX = this.canvas.width / 2;
                        const centerY = this.canvas.height / 2;
                        const dx = screenX - centerX;
                        const dy = screenY - centerY;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < 90000) continue; // 300^2 = 90000
                    }

                    // Depth effects
                    const scale = 1.0 / shape.z;
                    const opacity = Math.max(0.1, 1 - (shape.z - 1.0) * 0.25);

                    this.ctx.globalAlpha = opacity;
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.scale(scale, scale);

                    // Draw cached sprite (already has proper rotation baked in)
                    this.ctx.drawImage(
                        sprite.canvas,
                        -sprite.halfSize,
                        -sprite.halfSize
                    );

                    this.ctx.restore();
                    this.ctx.globalAlpha = 1.0;
                } else {
                    // Fallback to dynamic rendering for this shape
                    this.drawSingleShapeDynamic(shape, isMenu);
                }
            }
            return;
        }

        // Fallback: Original dynamic rendering for all shapes
        for (const shape of this.shapes) {
            this.drawSingleShapeDynamic(shape, isMenu);
        }
    }

    /**
     * Helper: Draw a single shape dynamically (fallback)
     */
    drawSingleShapeDynamic(shape, isMenu) {
        const worldW = this.worldW;
        const worldH = this.worldH;
        const offset = this.worldPadding / 2;

        const parallaxFactor = Math.min(0.8, 1.0 / shape.z);
        let relX = (shape.x - this.lastPlayerX * parallaxFactor) % worldW;
        let relY = (shape.y - this.lastPlayerY * parallaxFactor) % worldH;

        if (relX < 0) relX += worldW;
        if (relY < 0) relY += worldH;

        const screenX = relX - offset;
        const screenY = relY - offset;

        if (screenX < -200 || screenX > this.canvas.width + 200 ||
            screenY < -200 || screenY > this.canvas.height + 200) {
            return;
        }

        // [PERF] Use distanceSquared to avoid sqrt
        if (isMenu) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const dx = screenX - centerX;
            const dy = screenY - centerY;
            const distSq = dx * dx + dy * dy;
            if (distSq < 90000) return; // 300^2 = 90000
        }

        const scale = 1.0 / shape.z;
        const opacity = Math.max(0.1, 1 - (shape.z - 1.0) * 0.25);

        this.ctx.strokeStyle = shape.color.replace('0.3)', `${opacity})`);
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.scale(scale, scale);

        // 3D Projection with Polybius warp
        const vertices = this.getVertices(shape.type, shape.size);
        const warpFactor = 0.0005;
        const warpX = (screenX - this.canvas.width / 2) * warpFactor;
        const warpY = (screenY - this.canvas.height / 2) * warpFactor;
        const projected = vertices.map(v => this.project(v, shape.rotX + warpY, shape.rotY + warpX, shape.rotZ));

        this.ctx.beginPath();
        this.drawWireframe(shape.type, projected);
        this.ctx.stroke();

        this.ctx.restore();
    }

    getVertices(type, size) {
        const s = size;

        // Golden ratio for Platonic solids
        const phi = 1.618033988749895;
        const invPhi = 0.618033988749895; // 1/phi

        switch (type) {
            case 'cube':
                return [
                    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s }, { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
                    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s }, { x: s, y: s, z: s }, { x: -s, y: s, z: s }
                ];

            case 'pyramid':
                return [
                    { x: 0, y: -s, z: 0 }, // Top
                    { x: -s, y: s, z: -s }, { x: s, y: s, z: -s }, { x: s, y: s, z: s }, { x: -s, y: s, z: s } // Base
                ];

            case 'octahedron':
                return [
                    { x: 0, y: -s, z: 0 }, { x: 0, y: s, z: 0 }, // Top/Bottom
                    { x: -s, y: 0, z: 0 }, { x: s, y: 0, z: 0 }, { x: 0, y: 0, z: -s }, { x: 0, y: 0, z: s } // Middle ring
                ];

            case 'tesseract':
                // 4D Hypercube projected to 3D - inner and outer cubes
                const innerS = s * 0.5;
                return [
                    // Inner cube (0-7)
                    { x: -innerS, y: -innerS, z: -innerS }, { x: innerS, y: -innerS, z: -innerS },
                    { x: innerS, y: innerS, z: -innerS }, { x: -innerS, y: innerS, z: -innerS },
                    { x: -innerS, y: -innerS, z: innerS }, { x: innerS, y: -innerS, z: innerS },
                    { x: innerS, y: innerS, z: innerS }, { x: -innerS, y: innerS, z: innerS },
                    // Outer cube (8-15)
                    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
                    { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
                    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
                    { x: s, y: s, z: s }, { x: -s, y: s, z: s }
                ];

            case 'merkaba':
                // Star Tetrahedron - two interlocking tetrahedra
                const h = s * 0.816; // Height factor for regular tetrahedron
                return [
                    // Upward tetrahedron (0-3)
                    { x: 0, y: -s, z: 0 },           // Top
                    { x: -s, y: h, z: -s * 0.577 },  // Base vertices
                    { x: s, y: h, z: -s * 0.577 },
                    { x: 0, y: h, z: s * 0.816 },
                    // Downward tetrahedron (4-7)
                    { x: 0, y: s, z: 0 },            // Bottom
                    { x: -s, y: -h, z: s * 0.577 },  // Inverted base
                    { x: s, y: -h, z: s * 0.577 },
                    { x: 0, y: -h, z: -s * 0.816 }
                ];

            case 'icosahedron':
                // 20-faced Platonic solid - vertices based on golden ratio
                const a = s * 0.5;
                const b = s * 0.5 * phi;
                return [
                    // Rectangle 1 (XY plane)
                    { x: 0, y: a, z: b }, { x: 0, y: a, z: -b },
                    { x: 0, y: -a, z: b }, { x: 0, y: -a, z: -b },
                    // Rectangle 2 (YZ plane)
                    { x: a, y: b, z: 0 }, { x: a, y: -b, z: 0 },
                    { x: -a, y: b, z: 0 }, { x: -a, y: -b, z: 0 },
                    // Rectangle 3 (XZ plane)
                    { x: b, y: 0, z: a }, { x: -b, y: 0, z: a },
                    { x: b, y: 0, z: -a }, { x: -b, y: 0, z: -a }
                ];

            case 'stellated_octahedron':
                // Octahedron with extended points (Stella Octangula)
                const ext = s * 1.5; // Extended spike length
                return [
                    // Core octahedron vertices (0-5)
                    { x: 0, y: -s, z: 0 }, { x: 0, y: s, z: 0 },
                    { x: -s, y: 0, z: 0 }, { x: s, y: 0, z: 0 },
                    { x: 0, y: 0, z: -s }, { x: 0, y: 0, z: s },
                    // Stellated points - tetrahedral corners (6-13)
                    { x: ext, y: ext, z: ext },
                    { x: -ext, y: ext, z: -ext },
                    { x: ext, y: -ext, z: -ext },
                    { x: -ext, y: -ext, z: ext },
                    { x: -ext, y: ext, z: ext },
                    { x: ext, y: ext, z: -ext },
                    { x: -ext, y: -ext, z: -ext },
                    { x: ext, y: -ext, z: ext }
                ];

            case 'dodecahedron':
                // 12 pentagonal faces - vertices based on golden ratio
                const d = s * 0.6;
                const dp = d * phi;
                const di = d * invPhi;
                return [
                    // Cube vertices (0-7)
                    { x: d, y: d, z: d }, { x: d, y: d, z: -d },
                    { x: d, y: -d, z: d }, { x: d, y: -d, z: -d },
                    { x: -d, y: d, z: d }, { x: -d, y: d, z: -d },
                    { x: -d, y: -d, z: d }, { x: -d, y: -d, z: -d },
                    // Face centers extended (8-19)
                    { x: 0, y: di, z: dp }, { x: 0, y: di, z: -dp },
                    { x: 0, y: -di, z: dp }, { x: 0, y: -di, z: -dp },
                    { x: di, y: dp, z: 0 }, { x: di, y: -dp, z: 0 },
                    { x: -di, y: dp, z: 0 }, { x: -di, y: -dp, z: 0 },
                    { x: dp, y: 0, z: di }, { x: -dp, y: 0, z: di },
                    { x: dp, y: 0, z: -di }, { x: -dp, y: 0, z: -di }
                ];

            case 'metatrons_cube':
                // Sacred geometry master pattern - 13 circles with all centers connected
                // Structure: 1 center + 6 inner hexagon + 6 outer hexagon vertices
                // Layered in 3D for depth
                const r1 = s * 0.5;  // Inner hexagon radius
                const r2 = s;        // Outer hexagon radius
                const z1 = s * 0.3;  // Z-depth for layering
                const vertices = [
                    // Center (0)
                    { x: 0, y: 0, z: 0 }
                ];
                // Inner hexagon (1-6)
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    vertices.push({
                        x: Math.cos(angle) * r1,
                        y: Math.sin(angle) * r1,
                        z: (i % 2 === 0) ? z1 : -z1  // Alternating depth
                    });
                }
                // Outer hexagon (7-12)
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6; // Offset by 30°
                    vertices.push({
                        x: Math.cos(angle) * r2,
                        y: Math.sin(angle) * r2,
                        z: (i % 2 === 0) ? -z1 : z1  // Opposite alternating depth
                    });
                }
                return vertices;

            case 'origin_nexus':
                // ✦ ENHANCED NEXUS SHAPE - Metatron's Cube Core + Orbital Rings
                // A celestial hyperdimensional structure combining sacred geometry
                // with planetary ring systems (Saturn/Dyson sphere vibes)
                const nexusVerts = [];

                // === CORE: Metatron's Cube (vertices 0-12) ===
                const nr1 = s * 0.35;  // Inner hexagon radius (smaller for core)
                const nr2 = s * 0.7;   // Outer hexagon radius
                const nz1 = s * 0.25;  // Z-depth for layering

                // Center point (0)
                nexusVerts.push({ x: 0, y: 0, z: 0 });

                // Inner hexagon (1-6)
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    nexusVerts.push({
                        x: Math.cos(angle) * nr1,
                        y: Math.sin(angle) * nr1,
                        z: (i % 2 === 0) ? nz1 : -nz1
                    });
                }

                // Outer hexagon (7-12)
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                    nexusVerts.push({
                        x: Math.cos(angle) * nr2,
                        y: Math.sin(angle) * nr2,
                        z: (i % 2 === 0) ? -nz1 : nz1
                    });
                }

                // === ORBITAL RINGS (vertices 13-36) ===
                // Ring 1: Equatorial ring (XY plane) - 8 points (13-20)
                const ringRadius = s * 1.1;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    nexusVerts.push({
                        x: Math.cos(angle) * ringRadius,
                        y: Math.sin(angle) * ringRadius,
                        z: 0
                    });
                }

                // Ring 2: Tilted ring (XZ plane, 45° tilt) - 8 points (21-28)
                const tilt = Math.PI * 0.35;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const rx = Math.cos(angle) * ringRadius;
                    const ry = Math.sin(angle) * ringRadius * Math.cos(tilt);
                    const rz = Math.sin(angle) * ringRadius * Math.sin(tilt);
                    nexusVerts.push({ x: rx, y: ry, z: rz });
                }

                // Ring 3: Opposite tilt ring (-45°) - 8 points (29-36)
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const rx = Math.cos(angle) * ringRadius;
                    const ry = Math.sin(angle) * ringRadius * Math.cos(-tilt);
                    const rz = Math.sin(angle) * ringRadius * Math.sin(-tilt);
                    nexusVerts.push({ x: rx, y: ry, z: rz });
                }

                return nexusVerts;

            default:
                // Fallback to octahedron
                return [
                    { x: 0, y: -s, z: 0 }, { x: 0, y: s, z: 0 },
                    { x: -s, y: 0, z: 0 }, { x: s, y: 0, z: 0 }, { x: 0, y: 0, z: -s }, { x: 0, y: 0, z: s }
                ];
        }
    }

    project(v, rx, ry, rz) {
        // [PERF] Use cached FastMath reference for trig operations
        const FM = this._fastMath;
        let sinRx, cosRx, sinRy, cosRy, sinRz, cosRz;

        if (FM && FM.sincos) {
            // Use FastMath sincos for combined lookup (optimal path)
            const scY = FM.sincos(ry);
            const scX = FM.sincos(rx);
            const scZ = FM.sincos(rz);
            sinRy = scY.sin; cosRy = scY.cos;
            sinRx = scX.sin; cosRx = scX.cos;
            sinRz = scZ.sin; cosRz = scZ.cos;
        } else {
            // Fallback to native Math
            sinRy = Math.sin(ry); cosRy = Math.cos(ry);
            sinRx = Math.sin(rx); cosRx = Math.cos(rx);
            sinRz = Math.sin(rz); cosRz = Math.cos(rz);
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

        // Polybius Perspective Warp
        const fov = 300;
        const scale = fov / (fov + z);
        x = x * scale;
        y = y * scale;

        return { x, y };
    }

    drawWireframe(type, v, ctx = null) {
        const c = ctx || this.ctx; // Use provided context or default to this.ctx

        switch (type) {
            case 'cube':
                // Front face
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[1].x, v[1].y);
                c.lineTo(v[2].x, v[2].y); c.lineTo(v[3].x, v[3].y);
                c.lineTo(v[0].x, v[0].y);
                // Back face
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[5].x, v[5].y);
                c.lineTo(v[6].x, v[6].y); c.lineTo(v[7].x, v[7].y);
                c.lineTo(v[4].x, v[4].y);
                // Connecting lines
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[3].x, v[3].y); c.lineTo(v[7].x, v[7].y);
                break;

            case 'pyramid':
                // Base
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[2].x, v[2].y);
                c.lineTo(v[3].x, v[3].y); c.lineTo(v[4].x, v[4].y);
                c.lineTo(v[1].x, v[1].y);
                // Sides
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[1].x, v[1].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
                break;

            case 'octahedron':
                // Top pyramid
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[5].x, v[5].y);
                // Bottom pyramid
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[5].x, v[5].y);
                // Middle ring
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[4].x, v[4].y);
                c.lineTo(v[3].x, v[3].y); c.lineTo(v[5].x, v[5].y);
                c.lineTo(v[2].x, v[2].y);
                break;

            case 'tesseract':
                // Inner cube (vertices 0-7)
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[1].x, v[1].y);
                c.lineTo(v[2].x, v[2].y); c.lineTo(v[3].x, v[3].y);
                c.lineTo(v[0].x, v[0].y);
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[5].x, v[5].y);
                c.lineTo(v[6].x, v[6].y); c.lineTo(v[7].x, v[7].y);
                c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[3].x, v[3].y); c.lineTo(v[7].x, v[7].y);
                // Outer cube (vertices 8-15)
                c.moveTo(v[8].x, v[8].y); c.lineTo(v[9].x, v[9].y);
                c.lineTo(v[10].x, v[10].y); c.lineTo(v[11].x, v[11].y);
                c.lineTo(v[8].x, v[8].y);
                c.moveTo(v[12].x, v[12].y); c.lineTo(v[13].x, v[13].y);
                c.lineTo(v[14].x, v[14].y); c.lineTo(v[15].x, v[15].y);
                c.lineTo(v[12].x, v[12].y);
                c.moveTo(v[8].x, v[8].y); c.lineTo(v[12].x, v[12].y);
                c.moveTo(v[9].x, v[9].y); c.lineTo(v[13].x, v[13].y);
                c.moveTo(v[10].x, v[10].y); c.lineTo(v[14].x, v[14].y);
                c.moveTo(v[11].x, v[11].y); c.lineTo(v[15].x, v[15].y);
                // Connect inner to outer (the hyperdimensional edges)
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[8].x, v[8].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[9].x, v[9].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[10].x, v[10].y);
                c.moveTo(v[3].x, v[3].y); c.lineTo(v[11].x, v[11].y);
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[12].x, v[12].y);
                c.moveTo(v[5].x, v[5].y); c.lineTo(v[13].x, v[13].y);
                c.moveTo(v[6].x, v[6].y); c.lineTo(v[14].x, v[14].y);
                c.moveTo(v[7].x, v[7].y); c.lineTo(v[15].x, v[15].y);
                break;

            case 'merkaba':
                // Upward tetrahedron (vertices 0-3)
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[1].x, v[1].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[3].x, v[3].y); c.lineTo(v[1].x, v[1].y);
                // Downward tetrahedron (vertices 4-7)
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[7].x, v[7].y);
                c.moveTo(v[5].x, v[5].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[6].x, v[6].y); c.lineTo(v[7].x, v[7].y);
                c.moveTo(v[7].x, v[7].y); c.lineTo(v[5].x, v[5].y);
                break;

            case 'icosahedron':
                // Connect vertices to form 20 triangular faces edges
                // This creates the iconic icosahedron wireframe
                const icoEdges = [
                    [0, 2], [0, 4], [0, 6], [0, 8], [0, 9],
                    [1, 3], [1, 4], [1, 6], [1, 10], [1, 11],
                    [2, 5], [2, 8], [2, 9], [3, 5], [3, 10], [3, 11],
                    [4, 8], [4, 10], [5, 8], [5, 10],
                    [6, 9], [6, 11], [7, 9], [7, 11],
                    [7, 2], [7, 5], [8, 10], [9, 11]
                ];
                for (const [i, j] of icoEdges) {
                    c.moveTo(v[i].x, v[i].y);
                    c.lineTo(v[j].x, v[j].y);
                }
                break;

            case 'stellated_octahedron':
                // Core octahedron (vertices 0-5)
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[4].x, v[4].y);
                c.lineTo(v[3].x, v[3].y); c.lineTo(v[5].x, v[5].y);
                c.lineTo(v[2].x, v[2].y);
                // Stellated spikes - connect octahedron edges to spike points
                // These create the "star" effect
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[3].x, v[3].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[5].x, v[5].y); c.lineTo(v[6].x, v[6].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[7].x, v[7].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[7].x, v[7].y);
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[7].x, v[7].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[8].x, v[8].y);
                c.moveTo(v[3].x, v[3].y); c.lineTo(v[8].x, v[8].y);
                c.moveTo(v[4].x, v[4].y); c.lineTo(v[8].x, v[8].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[9].x, v[9].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[9].x, v[9].y);
                c.moveTo(v[5].x, v[5].y); c.lineTo(v[9].x, v[9].y);
                break;

            case 'dodecahedron':
                // Connect vertices to approximate pentagonal faces
                // Simplified edge representation for wireframe effect
                const dodecEdges = [
                    // Cube-like connections
                    [0, 1], [0, 2], [0, 4], [1, 3], [1, 5],
                    [2, 3], [2, 6], [3, 7], [4, 5], [4, 6],
                    [5, 7], [6, 7],
                    // Golden ratio connections
                    [0, 8], [4, 8], [2, 10], [6, 10],
                    [1, 9], [5, 9], [3, 11], [7, 11],
                    [0, 12], [1, 12], [4, 14], [5, 14],
                    [2, 13], [3, 13], [6, 15], [7, 15],
                    [0, 16], [2, 16], [1, 18], [3, 18],
                    [4, 17], [6, 17], [5, 19], [7, 19],
                    // Connect extended points
                    [8, 10], [9, 11], [12, 14], [13, 15],
                    [16, 17], [18, 19], [8, 12], [9, 14],
                    [10, 13], [11, 15], [16, 18], [17, 19]
                ];
                for (const [i, j] of dodecEdges) {
                    if (v[i] && v[j]) {
                        c.moveTo(v[i].x, v[i].y);
                        c.lineTo(v[j].x, v[j].y);
                    }
                }
                break;

            case 'metatrons_cube':
                // Sacred geometry: Connect all 13 vertices to each other
                // This creates the iconic Metatron's Cube pattern
                // Vertices: 0=center, 1-6=inner hex, 7-12=outer hex
                for (let i = 0; i < 13; i++) {
                    for (let j = i + 1; j < 13; j++) {
                        if (v[i] && v[j]) {
                            c.moveTo(v[i].x, v[i].y);
                            c.lineTo(v[j].x, v[j].y);
                        }
                    }
                }
                break;

            case 'origin_nexus':
                // ✦ ENHANCED NEXUS: Metatron's Cube Core + 3 Orbital Rings
                // Core: vertices 0-12 (fully connected sacred geometry)
                // Ring 1: vertices 13-20 (equatorial)
                // Ring 2: vertices 21-28 (tilted +)
                // Ring 3: vertices 29-36 (tilted -)

                // === Draw Core Metatron's Cube (all 13 vertices connected) ===
                for (let i = 0; i < 13; i++) {
                    for (let j = i + 1; j < 13; j++) {
                        if (v[i] && v[j]) {
                            c.moveTo(v[i].x, v[i].y);
                            c.lineTo(v[j].x, v[j].y);
                        }
                    }
                }

                // === Draw Orbital Rings (connect adjacent vertices in each ring) ===
                // Ring 1: Equatorial (13-20)
                for (let i = 0; i < 8; i++) {
                    const curr = 13 + i;
                    const next = 13 + ((i + 1) % 8);
                    if (v[curr] && v[next]) {
                        c.moveTo(v[curr].x, v[curr].y);
                        c.lineTo(v[next].x, v[next].y);
                    }
                }

                // Ring 2: Tilted + (21-28)
                for (let i = 0; i < 8; i++) {
                    const curr = 21 + i;
                    const next = 21 + ((i + 1) % 8);
                    if (v[curr] && v[next]) {
                        c.moveTo(v[curr].x, v[curr].y);
                        c.lineTo(v[next].x, v[next].y);
                    }
                }

                // Ring 3: Tilted - (29-36)
                for (let i = 0; i < 8; i++) {
                    const curr = 29 + i;
                    const next = 29 + ((i + 1) % 8);
                    if (v[curr] && v[next]) {
                        c.moveTo(v[curr].x, v[curr].y);
                        c.lineTo(v[next].x, v[next].y);
                    }
                }

                // === Connect rings to core (radial connections) ===
                // Connect each outer hexagon vertex to nearby ring points
                for (let i = 0; i < 6; i++) {
                    const outerVert = 7 + i; // Outer hexagon vertices 7-12
                    // Connect to nearest equatorial ring point
                    const ringPoint = 13 + Math.round((i / 6) * 8) % 8;
                    if (v[outerVert] && v[ringPoint]) {
                        c.moveTo(v[outerVert].x, v[outerVert].y);
                        c.lineTo(v[ringPoint].x, v[ringPoint].y);
                    }
                }
                break;

            default:
                // Fallback to octahedron drawing
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[0].x, v[0].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[2].x, v[2].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[3].x, v[3].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[4].x, v[4].y);
                c.moveTo(v[1].x, v[1].y); c.lineTo(v[5].x, v[5].y);
                c.moveTo(v[2].x, v[2].y); c.lineTo(v[4].x, v[4].y);
                c.lineTo(v[3].x, v[3].y); c.lineTo(v[5].x, v[5].y);
                c.lineTo(v[2].x, v[2].y);
                break;
        }
    }

    resize(width, height) {
        // [PERF OPT-8] Skip reinitialization if size unchanged
        const newWidth = width ?? this.canvas.width;
        const newHeight = height ?? this.canvas.height;

        if (this.canvas.width === newWidth && this.canvas.height === newHeight) {
            // Size unchanged - just ensure caches are valid
            if (!this.gridCanvas && this.enableGridCache) {
                this.initializeGridCanvas();
            }
            if (!this.starLayers && this.enableStarLayers) {
                this.initializeStarLayers();
            }
            return;
        }

        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        // Update world dimensions
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;
        this.initialize();
    }

    setLowQuality(enabled) {
        // lowQuality now only affects frame throttling, not content visibility
        // All quality modes render the same stars, grid, and shapes
        this.lowQuality = enabled;
    }

    /**
     * [PERF OPT-3] Initialize pre-rendered grid canvas
     * Pre-renders a large grid pattern to avoid recalculating lines every frame
     * [PERF OPT-8] Uses shared cache to avoid rebuilding on scene switch
     */
    initializeGridCanvas() {
        if (typeof document === 'undefined') return;

        // Guard against invalid dimensions
        if (this.gridSize <= 0) return;

        // [PERF OPT-8] Check shared cache first
        const cacheKey = this.gridSize;
        if (_sharedGridCanvasCache.has(cacheKey)) {
            this.gridCanvas = _sharedGridCanvasCache.get(cacheKey);
            return;
        }

        // Create oversized grid (covers scrolling area)
        const gridWidth = this.gridSize * 15;
        const gridHeight = this.gridSize * 15;

        // Limit max canvas size to avoid GPU memory issues
        const maxDimension = 2048;
        if (gridWidth > maxDimension || gridHeight > maxDimension) {
            // Fall back to dynamic rendering for very large grids
            this.gridCanvas = null;
            return;
        }

        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = gridWidth;
        this.gridCanvas.height = gridHeight;

        const ctx = this.gridCanvas.getContext('2d');
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.colors.grid;
        ctx.beginPath();

        // Draw vertical lines
        for (let x = 0; x < gridWidth; x += this.gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gridHeight);
        }

        // Draw horizontal lines
        for (let y = 0; y < gridHeight; y += this.gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
        }

        ctx.stroke();

        // [PERF OPT-8] Cache for reuse across instances
        _sharedGridCanvasCache.set(cacheKey, this.gridCanvas);
    }

    /**
     * [PERF OPT-2] Initialize pre-rendered star layers
     * Separates stars by depth into 3 canvases for efficient parallax
     */
    initializeStarLayers() {
        if (typeof document === 'undefined') return;

        // Guard against invalid canvas dimensions
        if (this.canvas.width <= 0 || this.canvas.height <= 0) return;

        // Create 3 layer canvases (foreground, midground, background)
        this.starLayers = this.starLayerDepths.map(() => {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            return {
                canvas: canvas,
                ctx: canvas.getContext('2d'),
                stars: []
            };
        });

        // Distribute stars to layers by depth
        // FIX: Use >= min && < max for all but last layer, last layer uses <=
        for (const star of this.stars) {
            let assigned = false;
            for (let i = 0; i < this.starLayerDepths.length; i++) {
                const depthRange = this.starLayerDepths[i];
                const isLastLayer = (i === this.starLayerDepths.length - 1);
                // Last layer includes upper bound, others exclude it
                const inRange = isLastLayer
                    ? (star.z >= depthRange.min && star.z <= depthRange.max)
                    : (star.z >= depthRange.min && star.z < depthRange.max);

                if (inRange) {
                    this.starLayers[depthRange.layer].stars.push(star);
                    assigned = true;
                    break;
                }
            }
            // Fallback: assign to background layer if not matched (shouldn't happen)
            if (!assigned && this.starLayers.length > 0) {
                this.starLayers[this.starLayers.length - 1].stars.push(star);
            }
        }

        // Pre-render stars to each layer
        this.renderStarsToLayers();
    }

    /**
     * Helper: Render stars to their respective layer canvases
     */
    renderStarsToLayers() {
        if (!this.starLayers) return;

        for (const layer of this.starLayers) {
            layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.ctx.save();

            for (const star of layer.stars) {
                layer.ctx.fillStyle = star.color;
                layer.ctx.globalAlpha = 0.7; // Base alpha, blink handled at composite

                if (star.type === 'cross') {
                    layer.ctx.fillRect(star.x - star.size, star.y - star.size / 4, star.size * 2, star.size / 2);
                    layer.ctx.fillRect(star.x - star.size / 4, star.y - star.size, star.size / 2, star.size * 2);
                } else {
                    // Diamond
                    layer.ctx.beginPath();
                    layer.ctx.moveTo(star.x, star.y - star.size);
                    layer.ctx.lineTo(star.x + star.size, star.y);
                    layer.ctx.lineTo(star.x, star.y + star.size);
                    layer.ctx.lineTo(star.x - star.size, star.y);
                    layer.ctx.fill();
                }
            }

            layer.ctx.restore();
        }
    }

    /**
     * Quantize angle to nearest cache bucket index
     * Optimized: uses pre-computed inverse instead of division
     */
    quantizeAngle(angle) {
        // Normalize angle to [0, 2π) using modulo
        let normalized = angle % this.twoPI;
        if (normalized < 0) normalized += this.twoPI;
        // Use pre-computed inverse for fast quantization
        return (normalized * this._invRotationSteps) | 0; // Bitwise OR for fast floor
    }

    /**
     * Generate cache key for shape sprite
     * Optimized: uses numeric encoding instead of string concatenation
     */
    _getSpriteCacheKey(type, sizeKey, rotXIdx, rotYIdx, rotZIdx) {
        // Encode type as 0-7 for 8 shape types, pack into single number
        // Format: type(4bits) + size(9bits) + rotX(5bits) + rotY(5bits) + rotZ(5bits) = 28 bits
        const typeCodes = {
            'cube': 0, 'pyramid': 1, 'octahedron': 2, 'tesseract': 3,
            'merkaba': 4, 'icosahedron': 5, 'stellated_octahedron': 6, 'dodecahedron': 7,
            'metatrons_cube': 8, 'origin_nexus': 9
        };
        const typeCode = typeCodes[type] ?? 2; // Default to octahedron
        return (typeCode << 24) | ((sizeKey & 0x1FF) << 15) | (rotXIdx << 10) | (rotYIdx << 5) | rotZIdx;
    }

    /**
     * [PERF OPT-1] Get or create cached shape sprite
     * Returns pre-rendered sprite for given shape at nearest rotation angle
     * Uses LRU eviction with O(1) access tracking
     */
    getShapeSprite(shape) {
        if (!this.enableShapeCache || typeof document === 'undefined') {
            return null;
        }

        // Quantize all three rotation axes to cache indices
        const rotXIdx = this.quantizeAngle(shape.rotX);
        const rotYIdx = this.quantizeAngle(shape.rotY);
        const rotZIdx = this.quantizeAngle(shape.rotZ);

        const sizeKey = ((shape.size / 5) | 0) * 5; // Fast floor division
        const key = this._getSpriteCacheKey(shape.type, sizeKey, rotXIdx, rotYIdx, rotZIdx);

        // Check cache
        if (this.shapeSpriteCache.has(key)) {
            // [PERF FIX] O(1) LRU update - just set new access time
            this._spriteCacheAccessTime.set(key, ++_sharedSpriteCacheAccessCounter);
            return this.shapeSpriteCache.get(key);
        }

        // Create sprite with size appropriate for shape type
        // Different shapes have different vertex extents:
        // - Basic shapes (cube, pyramid, octahedron): vertices at ±s, diagonal ~1.73s
        // - Tesseract: outer vertices at ±s, inner at ±0.5s
        // - Stellated octahedron: spikes at ±1.5s, diagonal ~2.6s
        // - Icosahedron/Dodecahedron: vertices extend to ~1.0-1.2s with golden ratio
        // Perspective projection can scale up to ~1.5x for front-facing vertices
        // Use shape-specific multipliers to ensure no clipping
        const sizeMultipliers = {
            'cube': 3.5,           // s * √3 * perspective ≈ 3.0, add padding
            'pyramid': 3.5,        // Similar to cube
            'octahedron': 3.5,     // Similar to cube
            'tesseract': 4.0,      // Outer cube diagonal + connecting lines
            'merkaba': 4.0,        // Two interlocking tetrahedra
            'icosahedron': 4.0,    // Golden ratio extends vertices
            'stellated_octahedron': 5.5,  // 1.5x spikes * √3 * perspective ≈ 4.5
            'dodecahedron': 4.5,   // Golden ratio vertices extend further
            'metatrons_cube': 4.5, // 2 hexagonal rings + center
            'origin_nexus': 5.5    // Core + orbital rings at 1.1x radius
        };
        const sizeMult = sizeMultipliers[shape.type] || 4.0;
        const spriteSize = Math.ceil(sizeKey * sizeMult);
        const canvas = document.createElement('canvas');
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext('2d');

        const center = spriteSize / 2;

        // Use the actual quantized rotation angles for all axes
        const angleX = this.cachedRotationAngles[rotXIdx];
        const angleY = this.cachedRotationAngles[rotYIdx];
        const angleZ = this.cachedRotationAngles[rotZIdx];

        // Render shape to sprite
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(center, center);

        const vertices = this.getVertices(shape.type, sizeKey);
        const projected = vertices.map(v => this.project(v, angleX, angleY, angleZ));

        ctx.beginPath();
        this.drawWireframe(shape.type, projected, ctx);
        ctx.stroke();
        ctx.restore();

        const sprite = { canvas, halfSize: spriteSize / 2 };

        // [PERF FIX] LRU eviction when cache is full - O(n) but only on eviction
        if (this.shapeSpriteCache.size >= this.spriteCacheMaxSize) {
            // Find oldest entries by access time
            const entries = Array.from(this._spriteCacheAccessTime.entries());
            entries.sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

            // Remove oldest entries
            for (let i = 0; i < this.spriteCacheEvictCount && i < entries.length; i++) {
                const oldKey = entries[i][0];
                this.shapeSpriteCache.delete(oldKey);
                this._spriteCacheAccessTime.delete(oldKey);
            }
        }

        this.shapeSpriteCache.set(key, sprite);
        this._spriteCacheAccessTime.set(key, ++_sharedSpriteCacheAccessCounter);

        return sprite;
    }

    getDebugInfo() {
        return {
            shapes: this.shapes.length,
            stars: this.stars.length,
            spriteCacheSize: this.shapeSpriteCache.size,
            spriteCacheMaxSize: this.spriteCacheMaxSize,
            starLayerCounts: this.starLayers
                ? this.starLayers.map(l => l.stars.length)
                : [],
            lowQuality: this.lowQuality,
            enableShapeCache: this.enableShapeCache,
            enableStarLayers: this.enableStarLayers,
            enableGridCache: this.enableGridCache
        };
    }

    /**
     * Clear all caches and release memory
     * Call this when switching scenes or during memory pressure
     * Note: Shared sprite cache is NOT cleared to allow reuse across instances
     */
    clearCaches() {
        // [PERF OPT-7] Don't clear shared sprite cache - it persists across instances
        // Only clear instance-specific caches

        // Release star layer canvases
        if (this.starLayers) {
            for (const layer of this.starLayers) {
                layer.canvas.width = 0;
                layer.canvas.height = 0;
            }
            this.starLayers = null;
        }

        // Release grid canvas
        if (this.gridCanvas) {
            this.gridCanvas.width = 0;
            this.gridCanvas.height = 0;
            this.gridCanvas = null;
        }

        if (typeof window !== 'undefined' && window.logger?.debug) {
            window.logger.debug('CosmicBackground instance caches cleared');
        }
    }

    /**
     * Clear the shared sprite cache (call during memory pressure)
     * Static method - affects all instances
     */
    static clearSharedCache() {
        _sharedSpriteCache.clear();
        _sharedSpriteCacheAccessTime.clear();
        _sharedSpriteCacheAccessCounter = 0;
    }

    /**
     * Dispose of this background instance
     * Call when completely done with this instance
     */
    dispose() {
        this.clearCaches();
        this.shapes = [];
        this.stars = [];
        this.canvas = null;
        this.ctx = null;
        this._fastMath = null;
    }
}

// Expose to global namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.CosmicBackground = CosmicBackground;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CosmicBackground;
}

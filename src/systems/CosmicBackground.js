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

        // Floating Shapes
        this.shapes = [];
        this.shapeCount = 25;

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
        for (let i = 0; i < this.shapeCount; i++) {
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
        const types = ['cube', 'pyramid', 'octahedron'];
        const type = types[Math.floor(Math.random() * types.length)];
        const size = 15 + Math.random() * 35;

        // Z-Depth: 1.0 is standard plane. Higher is further away.
        // Range 0.8 (slightly foreground) to 4.0 (deep background)
        const z = 0.8 + Math.random() * 3.2;

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
            rotSpeedX: (Math.random() - 0.5) * 0.5,
            rotSpeedY: (Math.random() - 0.5) * 0.5,
            rotSpeedZ: (Math.random() - 0.5) * 0.5,
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
        // (still renders same content, just at lower framerate)
        if (this.lowQuality && this._lastRenderTs) {
            const sinceLast = now - this._lastRenderTs;
            if (sinceLast < this._lowQualityMinInterval) {
                return;
            }
        }
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
        if (type === 'cube') {
            return [
                { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s }, { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
                { x: -s, y: -s, z: s }, { x: s, y: -s, z: s }, { x: s, y: s, z: s }, { x: -s, y: s, z: s }
            ];
        } else if (type === 'pyramid') {
            return [
                { x: 0, y: -s, z: 0 }, // Top
                { x: -s, y: s, z: -s }, { x: s, y: s, z: -s }, { x: s, y: s, z: s }, { x: -s, y: s, z: s } // Base
            ];
        } else { // Octahedron
            return [
                { x: 0, y: -s, z: 0 }, { x: 0, y: s, z: 0 }, // Top/Bottom
                { x: -s, y: 0, z: 0 }, { x: s, y: 0, z: 0 }, { x: 0, y: 0, z: -s }, { x: 0, y: 0, z: s } // Middle ring
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

        if (type === 'cube') {
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
        } else if (type === 'pyramid') {
            // Base
            c.moveTo(v[1].x, v[1].y); c.lineTo(v[2].x, v[2].y);
            c.lineTo(v[3].x, v[3].y); c.lineTo(v[4].x, v[4].y);
            c.lineTo(v[1].x, v[1].y);
            // Sides
            c.moveTo(v[0].x, v[0].y); c.lineTo(v[1].x, v[1].y);
            c.moveTo(v[0].x, v[0].y); c.lineTo(v[2].x, v[2].y);
            c.moveTo(v[0].x, v[0].y); c.lineTo(v[3].x, v[3].y);
            c.moveTo(v[0].x, v[0].y); c.lineTo(v[4].x, v[4].y);
        } else { // Octahedron
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
        // Encode type as 0/1/2, pack into single number
        // Format: type(2bits) + size(10bits) + rotX(5bits) + rotY(5bits) + rotZ(5bits) = 27 bits
        const typeCode = type === 'cube' ? 0 : (type === 'pyramid' ? 1 : 2);
        return (typeCode << 25) | (sizeKey << 15) | (rotXIdx << 10) | (rotYIdx << 5) | rotZIdx;
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

        // Create sprite
        const spriteSize = Math.ceil(sizeKey * 3);
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

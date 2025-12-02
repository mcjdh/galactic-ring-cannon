/**
 * [C] COSMIC BACKGROUND SYSTEM
 * Polybius Geometric Hyperdimensional Background
 *
 * Features:
 * - Dynamic Vector Grid (warps with player movement)
 * - Floating 3D Wireframe Geometry
 * - Neon Vector Stars
 * - Retro Arcade Aesthetic
 */

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
        this.lowQuality = false;

        // Grid settings
        this.gridSize = 100;
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;

        // Floating Shapes
        this.shapes = [];
        this.shapeCount = 25; // Increased for denser field

        // Vector Stars
        this.stars = [];
        this.starCount = 100; // Unified count

        // World Dimensions for Infinite Scrolling
        this.worldPadding = 2000;
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;

        // [PERF OPT-1] Shape Sprite Cache - Pre-rendered shapes at various rotations
        this.shapeSpriteCache = new Map(); // key: "type_size_rotIndex"
        this.rotationSteps = 36; // 36 angles = 10° increments (good balance)
        this.cachedRotationAngles = [];
        for (let i = 0; i < this.rotationSteps; i++) {
            this.cachedRotationAngles.push((i / this.rotationSteps) * Math.PI * 2);
        }
        this.enableShapeCache = true; // Feature flag

        // [PERF OPT-2] Star Layer Pre-Rendering - Layered canvases by depth
        this.starLayers = null; // Initialized in initializeStarLayers()
        this.starLayerDepths = [
            { min: 0.5, max: 1.0, layer: 0 },  // Foreground
            { min: 1.0, max: 1.5, layer: 1 },  // Midground
            { min: 1.5, max: 2.5, layer: 2 }   // Background
        ];
        this.enableStarLayers = true; // Feature flag

        // [PERF OPT-3] Grid Pre-Computation - Pre-rendered grid
        this.gridCanvas = null; // Initialized in initializeGridCanvas()
        this.enableGridCache = true; // Feature flag

        this.initialize();
    }

    initialize() {
        // Update world dimensions in case of resize
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;

        // Initialize Shapes
        this.shapes = [];
        for (let i = 0; i < this.shapeCount; i++) {
            this.shapes.push(this.createShape());
        }

        // Initialize Stars
        this.stars = [];
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                z: Math.random() * 2 + 0.5, // Depth factor
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

        // Update Shapes
        this.shapes.forEach(shape => {
            shape.rotX += shape.rotSpeedX * deltaTime;
            shape.rotY += shape.rotSpeedY * deltaTime;
            shape.rotZ += shape.rotSpeedZ * deltaTime;

            // Drift (World Space)
            shape.x += shape.driftX * deltaTime;
            shape.y += shape.driftY * deltaTime;

            // Note: We no longer wrap here. Wrapping is handled in render relative to camera.
        });
    }

    render(player) {
        // Calculate delta time
        const now = performance.now();
        let deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

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

        // Draw Grid
        this.drawGrid();

        // Draw Stars
        this.drawStars();

        // Draw Shapes
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
        // [PERF] Use FastMath for blink sin calculation
        const FastMath = window.Game?.FastMath;
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

            // Blink - use FastMath if available
            const blinkAngle = this.time * star.blinkSpeed + star.blinkOffset;
            const alpha = 0.5 + 0.5 * (FastMath ? FastMath.sin(blinkAngle) : Math.sin(blinkAngle));
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
                    if (isMenu) {
                        const centerX = this.canvas.width / 2;
                        const centerY = this.canvas.height / 2;
                        const dist = Math.hypot(screenX - centerX, screenY - centerY);
                        if (dist < 300) continue;
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

        if (isMenu) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const dist = Math.hypot(screenX - centerX, screenY - centerY);
            if (dist < 300) return;
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
        // [PERF] Use FastMath for cached trig lookups (saves ~2400 trig calls/frame)
        const FastMath = window.Game?.FastMath;
        const sin = FastMath ? FastMath.sin.bind(FastMath) : Math.sin;
        const cos = FastMath ? FastMath.cos.bind(FastMath) : Math.cos;
        
        // Pre-compute all trig values once (6 values instead of 12 calls)
        const sinRx = sin(rx), cosRx = cos(rx);
        const sinRy = sin(ry), cosRy = cos(ry);
        const sinRz = sin(rz), cosRz = cos(rz);
        
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
        // Simulate a slight fish-eye or curved CRT effect
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
        this.canvas.width = width;
        this.canvas.height = height;
        // Update world dimensions
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;
        this.initialize();
    }

    setLowQuality(enabled) {
        this.lowQuality = enabled;
        // Unified background: Do not re-initialize or change counts.
        // Just toggle the flag which can be used for rendering optimizations if needed.
    }

    /**
     * [PERF OPT-3] Initialize pre-rendered grid canvas
     * Pre-renders a large grid pattern to avoid recalculating lines every frame
     */
    initializeGridCanvas() {
        if (typeof document === 'undefined') return;

        // Create oversized grid (covers scrolling area)
        const gridWidth = this.gridSize * 15;
        const gridHeight = this.gridSize * 15;

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
    }

    /**
     * [PERF OPT-2] Initialize pre-rendered star layers
     * Separates stars by depth into 3 canvases for efficient parallax
     */
    initializeStarLayers() {
        if (typeof document === 'undefined') return;

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
        for (const star of this.stars) {
            for (const depthRange of this.starLayerDepths) {
                if (star.z >= depthRange.min && star.z < depthRange.max) {
                    this.starLayers[depthRange.layer].stars.push(star);
                    break;
                }
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
     * [PERF OPT-1] Get or create cached shape sprite
     * Returns pre-rendered sprite for given shape at nearest rotation angle
     */
    getShapeSprite(shape) {
        if (!this.enableShapeCache || typeof document === 'undefined') {
            return null; // Fall back to dynamic rendering
        }

        // Find nearest rotation angle index
        const rotIndex = Math.floor((Math.atan2(
            Math.sin(shape.rotY),
            Math.cos(shape.rotY)
        ) + Math.PI) / (Math.PI * 2) * this.rotationSteps) % this.rotationSteps;

        const sizeKey = Math.round(shape.size / 5) * 5; // Round to nearest 5px for cache efficiency
        const key = `${shape.type}_${sizeKey}_${rotIndex}`;

        // Check cache
        if (this.shapeSpriteCache.has(key)) {
            return this.shapeSpriteCache.get(key);
        }

        // Create sprite
        const spriteSize = Math.ceil(sizeKey * 3); // Enough room for rotation
        const canvas = document.createElement('canvas');
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext('2d');

        const center = spriteSize / 2;
        const angle = this.cachedRotationAngles[rotIndex];

        // Render shape to sprite
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(center, center);

        const vertices = this.getVertices(shape.type, sizeKey);
        const projected = vertices.map(v => this.project(v, angle, angle * 0.7, angle * 0.5));

        ctx.beginPath();
        this.drawWireframe(shape.type, projected, ctx); // Pass sprite context
        ctx.stroke();
        ctx.restore();

        const sprite = { canvas, halfSize: spriteSize / 2 };

        // Add to cache with LRU limit
        if (this.shapeSpriteCache.size > 500) {
            const firstKey = this.shapeSpriteCache.keys().next().value;
            this.shapeSpriteCache.delete(firstKey);
        }
        this.shapeSpriteCache.set(key, sprite);

        return sprite;
    }

    getDebugInfo() {
        return {
            shapes: this.shapes.length,
            stars: this.stars.length
        };
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

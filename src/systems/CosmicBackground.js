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

        this.initialize();
    }

    initialize() {
        // Update world dimensions in case of resize
        this.worldW = this.canvas.width + this.worldPadding;
        this.worldH = this.canvas.height + this.worldPadding;

        // Initialize Shapes
        this.shapes = [];
        for(let i=0; i<this.shapeCount; i++) {
            this.shapes.push(this.createShape());
        }

        // Initialize Stars
        this.stars = [];
        for(let i=0; i<this.starCount; i++) {
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
        const normOffsetX = (( -this.lastPlayerX * 0.5 ) % this.gridSize + this.gridSize) % this.gridSize;
        const normOffsetY = (( -this.lastPlayerY * 0.5 ) % this.gridSize + this.gridSize) % this.gridSize;
        
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
                this.ctx.fillRect(relX - star.size, relY - star.size/4, star.size*2, star.size/2);
                this.ctx.fillRect(relX - star.size/4, relY - star.size, star.size/2, star.size*2);
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
        this.ctx.lineWidth = 2;
        
        // Use class properties for world dimensions
        const worldW = this.worldW;
        const worldH = this.worldH;
        const offset = this.worldPadding / 2;
        
        // Menu Mode Detection: If lastPlayerX/Y are 0 (or very close), we assume menu or start.
        // We can also check if the 'player' argument was null in render(), but we don't have access to it here directly.
        // However, render() updates lastPlayerX/Y. In menu, they are usually 0.
        const isMenu = (Math.abs(this.lastPlayerX) < 1 && Math.abs(this.lastPlayerY) < 1);

        for (const shape of this.shapes) {
            // Parallax Factor: Inversely proportional to Z
            // Close objects (z=1) move 1:1. Far objects (z=4) move 0.25:1.
            // We cap it at 0.8 to keep everything slightly "behind" the player plane
            const parallaxFactor = Math.min(0.8, 1.0 / shape.z);
            
            // Calculate position relative to player in the virtual world
            // We use the shape's drift position (shape.x) minus the player's parallax offset
            let relX = (shape.x - this.lastPlayerX * parallaxFactor) % worldW;
            let relY = (shape.y - this.lastPlayerY * parallaxFactor) % worldH;
            
            // Normalize to positive range [0, worldW]
            if (relX < 0) relX += worldW;
            if (relY < 0) relY += worldH;
            
            // Center the virtual world on the screen
            // This ensures shapes wrap smoothly around the edges
            const screenX = relX - offset;
            const screenY = relY - offset;
            
            // Cull shapes that are far off-screen
            if (screenX < -200 || screenX > this.canvas.width + 200 ||
                screenY < -200 || screenY > this.canvas.height + 200) {
                continue;
            }

            // Menu Mode: Push shapes away from center to avoid overlapping buttons
            if (isMenu) {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const dx = screenX - centerX;
                const dy = screenY - centerY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // If too close to center (radius 300), fade out or don't draw
                if (dist < 300) {
                    continue; 
                }
            }

            // Depth Effects
            // Scale based on Z (simulated depth)
            const scale = 1.0 / shape.z; 
            const opacity = Math.max(0.1, 1 - (shape.z - 1.0) * 0.25); // Fade distant shapes

            this.ctx.strokeStyle = shape.color.replace('0.3)', `${opacity})`);
            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            this.ctx.scale(scale, scale); // Apply depth scaling
            
            // 3D Projection
            const vertices = this.getVertices(shape.type, shape.size);
            // Add subtle warp based on screen position for Polybius vibe
            const warpFactor = 0.0005;
            const warpX = (screenX - this.canvas.width/2) * warpFactor;
            const warpY = (screenY - this.canvas.height/2) * warpFactor;
            
            const projected = vertices.map(v => this.project(v, shape.rotX + warpY, shape.rotY + warpX, shape.rotZ));
            
            this.ctx.beginPath();
            this.drawWireframe(shape.type, projected);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }

    getVertices(type, size) {
        const s = size;
        if (type === 'cube') {
            return [
                {x:-s, y:-s, z:-s}, {x:s, y:-s, z:-s}, {x:s, y:s, z:-s}, {x:-s, y:s, z:-s},
                {x:-s, y:-s, z:s}, {x:s, y:-s, z:s}, {x:s, y:s, z:s}, {x:-s, y:s, z:s}
            ];
        } else if (type === 'pyramid') {
            return [
                {x:0, y:-s, z:0}, // Top
                {x:-s, y:s, z:-s}, {x:s, y:s, z:-s}, {x:s, y:s, z:s}, {x:-s, y:s, z:s} // Base
            ];
        } else { // Octahedron
             return [
                {x:0, y:-s, z:0}, {x:0, y:s, z:0}, // Top/Bottom
                {x:-s, y:0, z:0}, {x:s, y:0, z:0}, {x:0, y:0, z:-s}, {x:0, y:0, z:s} // Middle ring
            ];
        }
    }

    project(v, rx, ry, rz) {
        // Simplified rotation
        let x = v.x, y = v.y, z = v.z;
        
        // Rotate Y
        let x1 = x * Math.cos(ry) - z * Math.sin(ry);
        let z1 = x * Math.sin(ry) + z * Math.cos(ry);
        x = x1; z = z1;

        // Rotate X
        let y1 = y * Math.cos(rx) - z * Math.sin(rx);
        let z2 = y * Math.sin(rx) + z * Math.cos(rx);
        y = y1; z = z2;
        
        // Rotate Z
        let x2 = x * Math.cos(rz) - y * Math.sin(rz);
        let y2 = x * Math.sin(rz) + y * Math.cos(rz);
        x = x2; y = y2;

        // Polybius Perspective Warp
        // Simulate a slight fish-eye or curved CRT effect
        const fov = 300;
        const scale = fov / (fov + z);
        x = x * scale;
        y = y * scale;

        return {x, y};
    }

    drawWireframe(type, v) {
        if (type === 'cube') {
            // Front face
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[1].x, v[1].y);
            this.ctx.lineTo(v[2].x, v[2].y); this.ctx.lineTo(v[3].x, v[3].y);
            this.ctx.lineTo(v[0].x, v[0].y);
            // Back face
            this.ctx.moveTo(v[4].x, v[4].y); this.ctx.lineTo(v[5].x, v[5].y);
            this.ctx.lineTo(v[6].x, v[6].y); this.ctx.lineTo(v[7].x, v[7].y);
            this.ctx.lineTo(v[4].x, v[4].y);
            // Connecting lines
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[4].x, v[4].y);
            this.ctx.moveTo(v[1].x, v[1].y); this.ctx.lineTo(v[5].x, v[5].y);
            this.ctx.moveTo(v[2].x, v[2].y); this.ctx.lineTo(v[6].x, v[6].y);
            this.ctx.moveTo(v[3].x, v[3].y); this.ctx.lineTo(v[7].x, v[7].y);
        } else if (type === 'pyramid') {
            // Base
            this.ctx.moveTo(v[1].x, v[1].y); this.ctx.lineTo(v[2].x, v[2].y);
            this.ctx.lineTo(v[3].x, v[3].y); this.ctx.lineTo(v[4].x, v[4].y);
            this.ctx.lineTo(v[1].x, v[1].y);
            // Sides
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[1].x, v[1].y);
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[2].x, v[2].y);
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[3].x, v[3].y);
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[4].x, v[4].y);
        } else { // Octahedron
            // Top pyramid
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[2].x, v[2].y);
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[3].x, v[3].y);
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[4].x, v[4].y);
            this.ctx.moveTo(v[0].x, v[0].y); this.ctx.lineTo(v[5].x, v[5].y);
            // Bottom pyramid
            this.ctx.moveTo(v[1].x, v[1].y); this.ctx.lineTo(v[2].x, v[2].y);
            this.ctx.moveTo(v[1].x, v[1].y); this.ctx.lineTo(v[3].x, v[3].y);
            this.ctx.moveTo(v[1].x, v[1].y); this.ctx.lineTo(v[4].x, v[4].y);
            this.ctx.moveTo(v[1].x, v[1].y); this.ctx.lineTo(v[5].x, v[5].y);
            // Middle ring
            this.ctx.moveTo(v[2].x, v[2].y); this.ctx.lineTo(v[4].x, v[4].y);
            this.ctx.lineTo(v[3].x, v[3].y); this.ctx.lineTo(v[5].x, v[5].y);
            this.ctx.lineTo(v[2].x, v[2].y);
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

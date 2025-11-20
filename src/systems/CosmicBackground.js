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
        this.lowQuality = false;
        
        // Grid settings
        this.gridSize = 100;
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;
        
        // Floating Shapes
        this.shapes = [];
        this.shapeCount = 15;
        
        // Vector Stars
        this.stars = [];
        this.starCount = 150;

        this.initialize();
    }

    initialize() {
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
        const size = 40 + Math.random() * 60;
        
        return {
            type: type,
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            z: Math.random() * 0.5 + 0.2, // Parallax depth
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
            
            // Drift
            shape.x += shape.driftX * deltaTime;
            shape.y += shape.driftY * deltaTime;

            // Wrap around screen
            const margin = 200;
            if (shape.x < -margin) shape.x = this.canvas.width + margin;
            if (shape.x > this.canvas.width + margin) shape.x = -margin;
            if (shape.y < -margin) shape.y = this.canvas.height + margin;
            if (shape.y > this.canvas.height + margin) shape.y = -margin;
        });
    }

    render(player) {
        // Calculate delta time
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

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
        this.ctx.strokeStyle = this.colors.grid;
        
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
            // Parallax
            let x = (star.x - this.lastPlayerX * (0.1 * star.z)) % this.canvas.width;
            let y = (star.y - this.lastPlayerY * (0.1 * star.z)) % this.canvas.height;
            
            // Normalize to screen bounds
            if (x < 0) x += this.canvas.width;
            if (y < 0) y += this.canvas.height;

            // Blink
            const alpha = 0.5 + 0.5 * Math.sin(this.time * star.blinkSpeed + star.blinkOffset);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = star.color;

            if (star.type === 'cross') {
                this.ctx.fillRect(x - star.size, y - star.size/4, star.size*2, star.size/2);
                this.ctx.fillRect(x - star.size/4, y - star.size, star.size/2, star.size*2);
            } else {
                // Diamond
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - star.size);
                this.ctx.lineTo(x + star.size, y);
                this.ctx.lineTo(x, y + star.size);
                this.ctx.lineTo(x - star.size, y);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }

    drawShapes() {
        this.ctx.lineWidth = 2;
        
        for (const shape of this.shapes) {
            // Parallax
            let x = (shape.x - this.lastPlayerX * (0.2 * shape.z)) % (this.canvas.width + 400);
            let y = (shape.y - this.lastPlayerY * (0.2 * shape.z)) % (this.canvas.height + 400);
            
            // Adjust for wrapping with larger bounds
            if (x < -200) x += (this.canvas.width + 400);
            if (y < -200) y += (this.canvas.height + 400);
            
            // Center on screen for drawing
            x -= 200;
            y -= 200;

            this.ctx.strokeStyle = shape.color;
            this.ctx.save();
            this.ctx.translate(x, y);
            
            // 3D Projection
            const vertices = this.getVertices(shape.type, shape.size);
            const projected = vertices.map(v => this.project(v, shape.rotX, shape.rotY, shape.rotZ));
            
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
        this.initialize();
    }

    setLowQuality(enabled) {
        this.lowQuality = enabled;
        if (enabled) {
            this.shapeCount = 5;
            this.starCount = 50;
        } else {
            this.shapeCount = 15;
            this.starCount = 150;
        }
        this.initialize();
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

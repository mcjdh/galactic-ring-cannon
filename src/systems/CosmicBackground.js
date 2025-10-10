/**
 * 🌌 COSMIC BACKGROUND SYSTEM
 * Synthwave-inspired animated starfield and space background
 *
 * Features:
 * - Multi-layer parallax starfield
 * - Animated nebula clouds
 * - Perspective grid floor
 * - Performance-conscious with low-quality mode
 */

class CosmicBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Color palette - Synthwave cosmic theme
        this.colors = {
            deepSpace: '#0a0a1f',      // Deep purple-black
            nebulaPurple: '#6c5ce7',   // Bright purple
            nebulaPink: '#fd79a8',     // Hot pink
            neonCyan: '#00ffff',       // Bright cyan
            neonMagenta: '#ff00ff',    // Magenta
            gridColor: '#8b00ff'       // Purple grid
        };

        // Star layers (parallax effect)
        this.starLayers = [
            { stars: [], count: 150, speed: 0.15, size: 1, brightness: 0.4 },   // Far stars (slow parallax)
            { stars: [], count: 100, speed: 0.4, size: 1.5, brightness: 0.6 },  // Mid stars
            { stars: [], count: 50, speed: 0.7, size: 2, brightness: 0.9 }      // Near stars (faster parallax)
        ];

        // Track last player position for proper parallax
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;

        // Nebula clouds
        this.nebulaClouds = [];
        this.nebulaCount = 8;

        // Grid configuration
        this.grid = {
            enabled: true,
            spacing: 80,
            horizonY: 0.6, // 60% down the screen
            perspectiveDepth: 0.5
        };

        // Animation time
        this.time = 0;

        // Performance settings
        this.lowQuality = false;

        // Cached RGBA strings (optimization - avoid repeated string concat)
        this._cachedRgbaStrings = new Map();

        // Initialize
        this.initialize();
    }

    initialize() {
        // Generate stars for each layer
        for (const layer of this.starLayers) {
            layer.stars = [];
            for (let i = 0; i < layer.count; i++) {
                layer.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.5 + Math.random() * 1.5
                });
            }
        }

        // Generate nebula clouds
        for (let i = 0; i < this.nebulaCount; i++) {
            this.nebulaClouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 100 + Math.random() * 200,
                color: Math.random() > 0.5 ? this.colors.nebulaPurple : this.colors.nebulaPink,
                drift: {
                    x: (Math.random() - 0.5) * 0.1,
                    y: (Math.random() - 0.5) * 0.1
                },
                pulseSpeed: 0.3 + Math.random() * 0.5,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }

    resize() {
        // Redistribute stars when canvas resizes
        this.initialize();
    }

    update(deltaTime, player) {
        this.time += deltaTime;

        // Update stars with proper camera-based parallax
        if (player) {
            // Initialize position on first frame to avoid big jump
            if (this.lastPlayerX === 0 && this.lastPlayerY === 0) {
                this.lastPlayerX = player.x;
                this.lastPlayerY = player.y;
                return; // Skip first frame to establish baseline
            }

            // Calculate camera movement (how much player moved this frame)
            const cameraDeltaX = player.x - this.lastPlayerX;
            const cameraDeltaY = player.y - this.lastPlayerY;

            // Update stars - they move OPPOSITE to camera at different speeds
            for (const layer of this.starLayers) {
                for (const star of layer.stars) {
                    // Parallax: far layers move slower (less affected by camera)
                    // This creates depth - far stars barely move, near stars move more
                    star.x -= cameraDeltaX * layer.speed;
                    star.y -= cameraDeltaY * layer.speed;

                    // Wrap around screen edges with larger buffer for smooth wrapping
                    const wrapBuffer = this.canvas.width * 2;
                    const wrapBufferY = this.canvas.height * 2;

                    if (star.x < -wrapBuffer) star.x += wrapBuffer * 2;
                    if (star.x > wrapBuffer) star.x -= wrapBuffer * 2;
                    if (star.y < -wrapBufferY) star.y += wrapBufferY * 2;
                    if (star.y > wrapBufferY) star.y -= wrapBufferY * 2;
                }
            }

            // Update nebula clouds with parallax (they're farther than stars)
            for (const cloud of this.nebulaClouds) {
                // Nebulae move even slower (0.1x camera speed) + their own drift
                cloud.x -= cameraDeltaX * 0.1 + cloud.drift.x;
                cloud.y -= cameraDeltaY * 0.1 + cloud.drift.y;

                // Wrap clouds with buffer
                const buffer = cloud.radius * 2;
                if (cloud.x < -buffer) cloud.x = this.canvas.width + buffer;
                if (cloud.x > this.canvas.width + buffer) cloud.x = -buffer;
                if (cloud.y < -buffer) cloud.y = this.canvas.height + buffer;
                if (cloud.y > this.canvas.height + buffer) cloud.y = -buffer;
            }

            // Store position for next frame
            this.lastPlayerX = player.x;
            this.lastPlayerY = player.y;
        }
    }

    render(player) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. Fill deep space background
        ctx.fillStyle = this.colors.deepSpace;
        ctx.fillRect(0, 0, w, h);

        // 2. Render nebula clouds (behind stars)
        if (!this.lowQuality) {
            this.renderNebulae();
        }

        // 3. Render star layers (far to near)
        this.renderStars();

        // 4. Render perspective grid (optional, looks cool)
        if (this.grid.enabled && !this.lowQuality) {
            this.renderGrid(player);
        }
    }

    renderNebulae() {
        const ctx = this.ctx;

        // Performance: Set globalCompositeOperation once for all nebulae
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow effect

        for (const cloud of this.nebulaClouds) {
            // Pulsing opacity
            const pulse = Math.sin(this.time * cloud.pulseSpeed + cloud.pulseOffset) * 0.5 + 0.5;
            const opacity = 0.1 + pulse * 0.15;

            // Create radial gradient for nebula
            const gradient = ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.radius
            );

            gradient.addColorStop(0, this.hexToRgba(cloud.color, opacity * 0.3));
            gradient.addColorStop(0.5, this.hexToRgba(cloud.color, opacity * 0.15));
            gradient.addColorStop(1, this.hexToRgba(cloud.color, 0));

            ctx.fillStyle = gradient;
            ctx.fillRect(
                cloud.x - cloud.radius,
                cloud.y - cloud.radius,
                cloud.radius * 2,
                cloud.radius * 2
            );
        }

        ctx.restore();
    }

    renderStars() {
        const ctx = this.ctx;

        // Performance: Batch rendering by layer to reduce style changes
        for (const layer of this.starLayers) {
            ctx.save();

            for (const star of layer.stars) {
                // Twinkling effect
                const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
                const alpha = layer.brightness * (0.5 + twinkle * 0.5);

                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(star.x, star.y, layer.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    renderGrid(player) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const horizonY = h * this.grid.horizonY;
        const spacing = this.grid.spacing;

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(this.colors.gridColor, 0.2);
        ctx.lineWidth = 1.5;

        // Calculate grid offset based on player position (scrolling grid effect)
        const offsetX = player ? (-player.x * 0.3) % spacing : 0;
        const offsetY = player ? (-player.y * 0.3) % spacing : 0;

        // Horizontal lines with perspective (moving with player)
        const gridStartY = horizonY + offsetY;
        for (let i = 0; i < 20; i++) {
            const yOffset = i * spacing * 0.8; // Lines get closer for perspective
            const y = gridStartY + yOffset;

            if (y < horizonY || y > h) continue; // Skip lines outside view

            const progress = (y - horizonY) / (h - horizonY);
            const perspectiveScale = progress;

            // Fade lines near horizon and bottom
            ctx.globalAlpha = 0.05 + perspectiveScale * 0.25;

            ctx.beginPath();
            const leftX = w * 0.5 - (w * perspectiveScale);
            const rightX = w * 0.5 + (w * perspectiveScale);
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.stroke();
        }

        // Vertical lines with perspective (moving with player)
        const numVerticalLines = 25;
        for (let i = -numVerticalLines; i <= numVerticalLines; i++) {
            const x = w * 0.5 + (i * spacing) + offsetX;

            // Skip lines outside screen
            if (x < 0 || x > w) continue;

            // Lines closer to center are more opaque
            const distanceFromCenter = Math.abs(i) / numVerticalLines;
            ctx.globalAlpha = 0.1 + (1 - distanceFromCenter) * 0.15;

            ctx.beginPath();
            ctx.moveTo(x, horizonY);

            // Lines angle toward vanishing point at horizon
            const vanishingX = w * 0.5;
            const perspectiveAngle = (x - vanishingX) * 0.1;
            ctx.lineTo(x + perspectiveAngle, h);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Helper: Convert hex to rgba (with caching for performance)
    hexToRgba(hex, alpha) {
        // Round alpha to 2 decimals for cache key
        const roundedAlpha = Math.round(alpha * 100) / 100;
        const cacheKey = `${hex}_${roundedAlpha}`;

        if (this._cachedRgbaStrings.has(cacheKey)) {
            return this._cachedRgbaStrings.get(cacheKey);
        }

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const rgba = `rgba(${r}, ${g}, ${b}, ${roundedAlpha})`;

        // Cache it (limit cache size to prevent memory leak)
        if (this._cachedRgbaStrings.size < 100) {
            this._cachedRgbaStrings.set(cacheKey, rgba);
        }

        return rgba;
    }

    // Performance toggle
    setLowQuality(enabled) {
        if (this.lowQuality === enabled) return; // No change needed

        this.lowQuality = enabled;
        if (enabled) {
            // Reduce effects for better performance
            this.grid.enabled = false;
            // Store original counts
            this._originalStarCounts = this.starLayers.map(l => l.count);
            // Reduce by 60%
            this.starLayers[0].count = Math.floor(this.starLayers[0].count * 0.4);
            this.starLayers[1].count = Math.floor(this.starLayers[1].count * 0.4);
            this.starLayers[2].count = Math.floor(this.starLayers[2].count * 0.4);
        } else {
            // Restore quality
            this.grid.enabled = true;
            if (this._originalStarCounts) {
                this.starLayers[0].count = this._originalStarCounts[0];
                this.starLayers[1].count = this._originalStarCounts[1];
                this.starLayers[2].count = this._originalStarCounts[2];
            }
        }
        // Reinitialize with new counts
        this.initialize();
    }
}

// Expose to global namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.CosmicBackground = CosmicBackground;
}

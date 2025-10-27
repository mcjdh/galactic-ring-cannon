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
        this._hasPlayerBaseline = false;
        this._pendingParallaxX = 0;
        this._pendingParallaxY = 0;
        this._frameAccumulator = 0;

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
        this._starWrapBounds = null;

        // Cached RGBA strings (optimization - avoid repeated string concat)
        this._cachedRgbaStrings = new Map();
        this._nebulaSpriteCache = new Map();
        this._nebulaCacheLimit = 32;

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

        // Reset parallax baseline after reinitializing
        this._hasPlayerBaseline = false;
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;
        this._pendingParallaxX = 0;
        this._pendingParallaxY = 0;
        this._frameAccumulator = 0;

        // Generate nebula clouds
        this.nebulaClouds.length = 0;
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
            if (!this._hasPlayerBaseline) {
                this.lastPlayerX = player.x;
                this.lastPlayerY = player.y;
                this._hasPlayerBaseline = true;
                return; // Skip first frame to establish baseline
            }

            // Calculate camera movement (how much player moved this frame)
            let cameraDeltaX = player.x - this.lastPlayerX;
            let cameraDeltaY = player.y - this.lastPlayerY;

            if (this.lowQuality) {
                this._pendingParallaxX += cameraDeltaX;
                this._pendingParallaxY += cameraDeltaY;
                this._frameAccumulator = (this._frameAccumulator + 1) % 2;

                // Only update parallax every other frame to cut work in half
                if (this._frameAccumulator !== 0) {
                    this.lastPlayerX = player.x;
                    this.lastPlayerY = player.y;
                    return;
                }

                cameraDeltaX = this._pendingParallaxX;
                cameraDeltaY = this._pendingParallaxY;
                this._pendingParallaxX = 0;
                this._pendingParallaxY = 0;
            }

            if (Math.abs(cameraDeltaX) < 0.001) cameraDeltaX = 0;
            if (Math.abs(cameraDeltaY) < 0.001) cameraDeltaY = 0;

            if (cameraDeltaX === 0 && cameraDeltaY === 0) {
                this.lastPlayerX = player.x;
                this.lastPlayerY = player.y;
                return;
            }

            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;

            let wrap = this._starWrapBounds;
            if (!wrap || wrap.width !== canvasWidth || wrap.height !== canvasHeight) {
                const marginX = Math.max(32, canvasWidth * 0.1);
                const marginY = Math.max(32, canvasHeight * 0.1);
                wrap = this._starWrapBounds = {
                    width: canvasWidth,
                    height: canvasHeight,
                    minX: -marginX,
                    maxX: canvasWidth + marginX,
                    minY: -marginY,
                    maxY: canvasHeight + marginY,
                    spanX: canvasWidth + marginX * 2,
                    spanY: canvasHeight + marginY * 2
                };
            }

            const minStarX = wrap.minX;
            const maxStarX = wrap.maxX;
            const minStarY = wrap.minY;
            const maxStarY = wrap.maxY;
            const spanX = wrap.spanX;
            const spanY = wrap.spanY;

            for (const layer of this.starLayers) {
                const stars = layer.stars;
                if (!stars || stars.length === 0) continue;

                const parallaxX = cameraDeltaX * layer.speed;
                const parallaxY = cameraDeltaY * layer.speed;
                if (parallaxX === 0 && parallaxY === 0) continue;

                const updateX = parallaxX !== 0;
                const updateY = parallaxY !== 0;

                for (let idx = 0; idx < stars.length; idx++) {
                    const star = stars[idx];
                    if (!star) continue;

                    if (updateX) {
                        let newX = star.x - parallaxX;
                        if (newX < minStarX) {
                            newX += spanX;
                        } else if (newX > maxStarX) {
                            newX -= spanX;
                        }
                        star.x = newX;
                    }

                    if (updateY) {
                        let newY = star.y - parallaxY;
                        if (newY < minStarY) {
                            newY += spanY;
                        } else if (newY > maxStarY) {
                            newY -= spanY;
                        }
                        star.y = newY;
                    }
                }
            }

            // Update nebula clouds with parallax (they're farther than stars)
            for (const cloud of this.nebulaClouds) {
                // Nebulae move even slower (0.1x camera speed) + their own drift
                cloud.x -= cameraDeltaX * 0.1 + cloud.drift.x;
                cloud.y -= cameraDeltaY * 0.1 + cloud.drift.y;

                // Wrap clouds with buffer
                const buffer = cloud.radius * 2;
                if (cloud.x < -buffer) cloud.x = canvasWidth + buffer;
                if (cloud.x > canvasWidth + buffer) cloud.x = -buffer;
                if (cloud.y < -buffer) cloud.y = canvasHeight + buffer;
                if (cloud.y > canvasHeight + buffer) cloud.y = -buffer;
            }

            // Store position for next frame
            this.lastPlayerX = player.x;
            this.lastPlayerY = player.y;
        } else {
            // Reset baseline so new players reinitialize smoothly
            this._hasPlayerBaseline = false;
            this._pendingParallaxX = 0;
            this._pendingParallaxY = 0;
            this._frameAccumulator = 0;
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

        const previousComposite = ctx.globalCompositeOperation;
        const previousAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = 'lighter';

        for (const cloud of this.nebulaClouds) {
            // Pulsing opacity
            const pulse = Math.sin(this.time * cloud.pulseSpeed + cloud.pulseOffset) * 0.5 + 0.5;
            const opacity = 0.16 + pulse * 0.2;

            const sprite = this._getNebulaSprite(cloud.color, cloud.radius);
            if (!sprite) {
                continue;
            }

            ctx.globalAlpha = opacity;
            ctx.drawImage(
                sprite,
                cloud.x - cloud.radius,
                cloud.y - cloud.radius,
                cloud.radius * 2,
                cloud.radius * 2
            );
        }

        ctx.globalCompositeOperation = previousComposite;
        ctx.globalAlpha = previousAlpha;
    }
    
    _getNebulaSprite(color, radius) {
        const roundedRadius = Math.max(10, Math.round(radius));
        const key = `${color}_${roundedRadius}`;

        if (this._nebulaSpriteCache.has(key)) {
            return this._nebulaSpriteCache.get(key);
        }

        if (typeof document === 'undefined') {
            return null;
        }

        const size = Math.max(2, roundedRadius * 2);
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) {
            return null;
        }

        const gradient = offCtx.createRadialGradient(
            roundedRadius, roundedRadius, 0,
            roundedRadius, roundedRadius, roundedRadius
        );

        gradient.addColorStop(0, this.hexToRgba(color, 0.3));
        gradient.addColorStop(0.5, this.hexToRgba(color, 0.15));
        gradient.addColorStop(1, this.hexToRgba(color, 0));

        offCtx.fillStyle = gradient;
        offCtx.fillRect(0, 0, size, size);

        if (this._nebulaSpriteCache.size >= this._nebulaCacheLimit) {
            const firstKey = this._nebulaSpriteCache.keys().next().value;
            this._nebulaSpriteCache.delete(firstKey);
        }
        this._nebulaSpriteCache.set(key, offscreen);
        return offscreen;
    }

    renderStars() {
        const ctx = this.ctx;
        const skipTwinkle = this.lowQuality;

        // Performance: Batch rendering by layer to reduce style changes
        const originalAlpha = ctx.globalAlpha;
        ctx.fillStyle = '#ffffff';

        const width = this.canvas.width;
        const height = this.canvas.height;

        for (const layer of this.starLayers) {
            const layerStars = layer.stars;
            if (!layerStars || layerStars.length === 0) continue;

            const cullMargin = Math.max((layer.size || 1) * 4, Math.max(width, height) * 0.05);
            const minX = -cullMargin;
            const maxX = width + cullMargin;
            const minY = -cullMargin;
            const maxY = height + cullMargin;

            for (let i = 0; i < layerStars.length; i++) {
                const star = layerStars[i];
                if (!star) continue;

                const x = star.x;
                const y = star.y;
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    continue;
                }

                const twinkle = skipTwinkle
                    ? 0.5
                    : Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
                const alpha = layer.brightness * (skipTwinkle ? 0.7 : (0.5 + twinkle * 0.5));

                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, layer.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = originalAlpha;
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
            if (!this._originalStarCounts) {
                this._originalStarCounts = this.starLayers.map(l => l.count);
            }
            if (typeof this._originalNebulaCount !== 'number') {
                this._originalNebulaCount = this.nebulaCount;
            }
            // Aggressively reduce draw calls for low-power devices
            this.starLayers[0].count = Math.max(20, Math.floor(this._originalStarCounts[0] * 0.25));
            this.starLayers[1].count = Math.max(15, Math.floor(this._originalStarCounts[1] * 0.25));
            this.starLayers[2].count = Math.max(10, Math.floor(this._originalStarCounts[2] * 0.25));
            this.nebulaCount = Math.max(2, Math.floor(this._originalNebulaCount * 0.3));
        } else {
            // Restore quality
            this.grid.enabled = true;
            if (this._originalStarCounts) {
                this.starLayers[0].count = this._originalStarCounts[0];
                this.starLayers[1].count = this._originalStarCounts[1];
                this.starLayers[2].count = this._originalStarCounts[2];
            }
            if (typeof this._originalNebulaCount === 'number') {
                this.nebulaCount = this._originalNebulaCount;
            }
        }
        this._pendingParallaxX = 0;
        this._pendingParallaxY = 0;
        this._frameAccumulator = 0;
        // Reinitialize with new counts
        this.initialize();
    }
}

// Expose to global namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.CosmicBackground = CosmicBackground;
}

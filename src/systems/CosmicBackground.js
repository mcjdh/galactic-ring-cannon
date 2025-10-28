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
            horizonY: 0.75, // 75% down the screen for more coverage
            perspectiveDepth: 0.5,
            showUpperGrid: true // Add subtle grid in upper area too
        };

        // Animation time
        this.time = 0;

        // Performance settings
        this.lowQuality = false;
        this._starWrapBounds = null;

        // Adaptive update frequency for better performance
        this._updateFrameCounter = 0;
        this._updateFrequency = 1; // Update every N frames (1 = every frame, 2 = every other frame)
        this._cameraMovementThreshold = 0.5; // Skip updates for movements smaller than this (balanced performance/quality)

        // Twinkle cache for performance - update less frequently than every frame
        this._twinkleUpdateCounter = 0;
        this._twinkleUpdateFrequency = 3; // Update twinkle values every N frames

        // Cached RGBA strings (optimization - avoid repeated string concat)
        this._cachedRgbaStrings = new Map();
        this._nebulaSpriteCache = new Map();
        this._nebulaCacheLimit = 32;

        // Initialize
        this.initialize();
    }

    initialize() {
        // Ensure canvas has valid dimensions before initializing
        const canvasWidth = this.canvas.width || 800; // Fallback to reasonable default
        const canvasHeight = this.canvas.height || 600;

        // Generate stars for each layer
        for (const layer of this.starLayers) {
            layer.stars = [];
            for (let i = 0; i < layer.count; i++) {
                layer.stars.push({
                    x: Math.random() * canvasWidth,
                    y: Math.random() * canvasHeight,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.5 + Math.random() * 1.5,
                    cachedTwinkle: 0.5 + Math.random() * 0.5 // Pre-calculated twinkle value
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
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
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

        // Clear sprite cache when reinitializing to ensure fresh rendering
        this._nebulaSpriteCache.clear();
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
                // Don't skip first frame - allow one update cycle to establish position
            }

            // Adaptive frame skipping for better performance (only after baseline established)
            this._updateFrameCounter++;
            const shouldUpdate = (this._updateFrameCounter % this._updateFrequency) === 0;

            if (!shouldUpdate) {
                // Still track player position even when skipping updates
                this.lastPlayerX = player.x;
                this.lastPlayerY = player.y;
                return;
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

            // Use configurable threshold - skip tiny movements to save performance
            const threshold = this._cameraMovementThreshold;
            if (Math.abs(cameraDeltaX) < threshold) cameraDeltaX = 0;
            if (Math.abs(cameraDeltaY) < threshold) cameraDeltaY = 0;

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
            // Only update clouds that might be visible (with generous buffer for smooth wrapping)
            const nebulaUpdateMargin = canvasWidth * 0.5; // Update clouds within 50% screen width/height margin
            const minNebulaX = -nebulaUpdateMargin;
            const maxNebulaX = canvasWidth + nebulaUpdateMargin;
            const minNebulaY = -nebulaUpdateMargin;
            const maxNebulaY = canvasHeight + nebulaUpdateMargin;

            for (const cloud of this.nebulaClouds) {
                // Skip updating clouds that are very far off-screen
                const cloudInUpdateRange = (
                    cloud.x > minNebulaX - cloud.radius && cloud.x < maxNebulaX + cloud.radius &&
                    cloud.y > minNebulaY - cloud.radius && cloud.y < maxNebulaY + cloud.radius
                );

                // Nebulae move even slower (0.1x camera speed) + their own drift
                cloud.x -= cameraDeltaX * 0.1 + (cloudInUpdateRange ? cloud.drift.x : 0);
                cloud.y -= cameraDeltaY * 0.1 + (cloudInUpdateRange ? cloud.drift.y : 0);

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

        // 2. Render nebula clouds (behind stars) - always render for visual appeal
        // In low quality mode, there are just fewer of them (controlled by setLowQuality)
        this.renderNebulae();

        // 3. Render star layers (far to near)
        this.renderStars();

        // 4. Render perspective grid (core visual element)
        // Always render grid - it's part of the synthwave aesthetic!
        if (this.grid.enabled) {
            this.renderGrid(player);
        }
    }

    renderNebulae() {
        if (this.nebulaClouds.length === 0) return;

        const ctx = this.ctx;

        const previousComposite = ctx.globalCompositeOperation;
        const previousAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = 'lighter';

        for (const cloud of this.nebulaClouds) {
            // Pulsing opacity
            const pulse = Math.sin(this.time * cloud.pulseSpeed + cloud.pulseOffset) * 0.5 + 0.5;
            const opacity = 0.16 + pulse * 0.2;

            try {
                const sprite = this._getNebulaSprite(cloud.color, cloud.radius);
                if (!sprite) {
                    // Fallback to simple gradient rendering if sprite creation fails
                    ctx.globalAlpha = opacity * 0.3;
                    const gradient = ctx.createRadialGradient(
                        cloud.x, cloud.y, 0,
                        cloud.x, cloud.y, cloud.radius
                    );
                    gradient.addColorStop(0, this.hexToRgba(cloud.color, 0.3));
                    gradient.addColorStop(0.5, this.hexToRgba(cloud.color, 0.15));
                    gradient.addColorStop(1, this.hexToRgba(cloud.color, 0));
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
                    ctx.fill();
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
            } catch (err) {
                // Silently skip this cloud if rendering fails
                continue;
            }
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

        // Performance: Update twinkle values only every N frames
        this._twinkleUpdateCounter++;
        const shouldUpdateTwinkle = !skipTwinkle && ((this._twinkleUpdateCounter % this._twinkleUpdateFrequency) === 0);

        // Performance: Batch rendering by layer to reduce style changes
        const originalAlpha = ctx.globalAlpha;
        ctx.fillStyle = '#ffffff';

        const width = this.canvas.width;
        const height = this.canvas.height;

        const time = this.time;
        for (const layer of this.starLayers) {
            const layerStars = layer.stars;
            if (!layerStars || layerStars.length === 0) continue;

            const cullMargin = Math.max((layer.size || 1) * 4, Math.max(width, height) * 0.05);
            const minX = -cullMargin;
            const maxX = width + cullMargin;
            const minY = -cullMargin;
            const maxY = height + cullMargin;

            // Use fast LCG for twinkle calculation when updating
            let seed = shouldUpdateTwinkle ? ((layer.seed || 0) + (time * layer.twinkleSpeedScalar || time)) : 0;

            for (let i = 0; i < layerStars.length; i++) {
                const star = layerStars[i];
                if (!star) continue;

                const x = star.x;
                const y = star.y;
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    continue;
                }

                // Update cached twinkle value periodically (not every frame)
                if (shouldUpdateTwinkle) {
                    seed = (seed * 1664525 + 1013904223) | 0;
                    const phase = ((seed >>> 16) & 0xffff) / 0xffff;
                    star.cachedTwinkle = Math.sqrt(phase);
                }

                // Use cached twinkle value for rendering
                const alpha = layer.brightness * (skipTwinkle ? 0.7 : (0.5 + star.cachedTwinkle * 0.5));

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

        // Low-quality mode: fewer lines for better performance
        const maxHorizontalLines = this.lowQuality ? 15 : 25; // Increased for better coverage
        const numVerticalLines = this.lowQuality ? 15 : 25;

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(this.colors.gridColor, 0.2);
        ctx.lineWidth = 1.5;

        // Calculate grid offset based on player position (scrolling grid effect)
        const offsetX = player ? (-player.x * 0.3) % spacing : 0;
        const offsetY = player ? (-player.y * 0.3) % spacing : 0;

        // === UPPER GRID (subtle, integrates with stars) ===
        if (this.grid.showUpperGrid) {
            const upperSpacing = spacing * 1.5;
            const upperOffsetX = player ? (-player.x * 0.15) % upperSpacing : 0; // Slower parallax
            const upperOffsetY = player ? (-player.y * 0.15) % upperSpacing : 0;

            // Subtle horizontal lines in upper area
            for (let i = 0; i < 8; i++) {
                const y = (i * upperSpacing + upperOffsetY) % horizonY;
                if (y < 0 || y > horizonY) continue;

                const fadeFromTop = y / horizonY; // Fade out near top
                ctx.globalAlpha = 0.03 + fadeFromTop * 0.05;

                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Subtle vertical lines in upper area
            const upperVerticalLines = this.lowQuality ? 8 : 12;
            for (let i = -upperVerticalLines; i <= upperVerticalLines; i++) {
                const x = w * 0.5 + (i * upperSpacing) + upperOffsetX;
                if (x < 0 || x > w) continue;

                const distFromCenter = Math.abs(i) / upperVerticalLines;
                ctx.globalAlpha = 0.04 + (1 - distFromCenter) * 0.06;

                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, horizonY);
                ctx.stroke();
            }
        }

        // === LOWER PERSPECTIVE GRID (main grid) ===
        ctx.strokeStyle = this.hexToRgba(this.colors.gridColor, 0.2);

        // Horizontal lines with perspective (moving with player)
        const gridStartY = horizonY + offsetY;
        for (let i = 0; i < maxHorizontalLines; i++) {
            const yOffset = i * spacing * 0.7; // Slightly tighter spacing for more lines
            const y = gridStartY + yOffset;

            if (y < horizonY || y > h) continue; // Skip lines outside view

            const progress = (y - horizonY) / (h - horizonY);
            const perspectiveScale = progress;

            // Fade lines near horizon and bottom
            ctx.globalAlpha = 0.08 + perspectiveScale * 0.3;

            ctx.beginPath();
            const leftX = w * 0.5 - (w * perspectiveScale);
            const rightX = w * 0.5 + (w * perspectiveScale);
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.stroke();
        }

        // Vertical lines with perspective (moving with player)
        for (let i = -numVerticalLines; i <= numVerticalLines; i++) {
            const x = w * 0.5 + (i * spacing) + offsetX;

            // Skip lines outside screen
            if (x < 0 || x > w) continue;

            // Lines closer to center are more opaque
            const distanceFromCenter = Math.abs(i) / numVerticalLines;
            ctx.globalAlpha = 0.12 + (1 - distanceFromCenter) * 0.2;

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

    /**
     * Set update frequency to reduce CPU load (1 = every frame, 2 = every other frame, etc.)
     * Higher values = better performance but less smooth parallax
     */
    setUpdateFrequency(frequency) {
        this._updateFrequency = Math.max(1, Math.floor(frequency));
    }

    /**
     * Set camera movement threshold - movements smaller than this are ignored
     * Higher values = better performance but less responsive parallax
     */
    setCameraThreshold(threshold) {
        this._cameraMovementThreshold = Math.max(0, threshold);
    }

    /**
     * Get current performance settings for monitoring
     */
    getPerformanceSettings() {
        return {
            lowQuality: this.lowQuality,
            updateFrequency: this._updateFrequency,
            cameraThreshold: this._cameraMovementThreshold,
            twinkleUpdateFrequency: this._twinkleUpdateFrequency,
            starCount: this.starLayers.reduce((sum, layer) => sum + layer.stars.length, 0),
            nebulaCount: this.nebulaClouds.length
        };
    }

    // Performance toggle
    setLowQuality(enabled) {
        if (this.lowQuality === enabled) return; // No change needed

        this.lowQuality = enabled;
        if (enabled) {
            // Reduce effects for better performance
            // Grid stays enabled but will render in simplified mode
            // Store original counts
            if (!this._originalStarCounts) {
                this._originalStarCounts = this.starLayers.map(l => l.count);
            }
            if (typeof this._originalNebulaCount !== 'number') {
                this._originalNebulaCount = this.nebulaCount;
            }
            // Reduce draw calls for low-power devices while keeping visual appeal
            this.starLayers[0].count = Math.max(20, Math.floor(this._originalStarCounts[0] * 0.25));
            this.starLayers[1].count = Math.max(15, Math.floor(this._originalStarCounts[1] * 0.25));
            this.starLayers[2].count = Math.max(10, Math.floor(this._originalStarCounts[2] * 0.25));
            // Keep at least 4 nebulae for visual appeal even in low quality
            this.nebulaCount = Math.max(4, Math.floor(this._originalNebulaCount * 0.5));
        } else {
            // Restore quality - grid stays enabled (always on for synthwave aesthetic)
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

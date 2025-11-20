/**
 * [C] COSMIC BACKGROUND SYSTEM
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

        // Configuration constants
        this.RESIZE_THRESHOLD = 10; // Minimum pixel difference to trigger resize (prevents spurious reinitialization)

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
            { stars: [], count: 150, speed: 0.15, size: 1, brightness: 0.4, activeCount: 150 },   // Far stars (slow parallax)
            { stars: [], count: 100, speed: 0.4, size: 1.5, brightness: 0.6, activeCount: 100 },  // Mid stars
            { stars: [], count: 50, speed: 0.7, size: 2, brightness: 0.9, activeCount: 50 }      // Near stars (faster parallax)
        ];
        this._baseStarCounts = this.starLayers.map(l => l.count);

        // Star rendering cache (uses RAM to offload CPU/GPU draw calls)
        this._starBuffer = null;
        this._starBufferCtx = null;
        this._starBufferDirty = true;
        this._starBufferWidth = 0;
        this._starBufferHeight = 0;

        // Grid rendering cache (reduces per-frame draw cost)
        this._gridBuffer = null;
        this._gridBufferCtx = null;
        this._gridBufferWidth = 0;
        this._gridBufferHeight = 0;
        this._gridBufferDirty = true;
        this._lastGridPlayerX = 0;
        this._lastGridPlayerY = 0;
        this._gridDirtyThreshold = 16; // pixels of movement to force redraw

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
        this._nebulaActiveCount = this.nebulaCount;

        // Grid configuration
        this.grid = {
            enabled: true,
            spacing: 80,
            horizonY: 0.75, // 75% down the screen for more coverage
            perspectiveDepth: 0.5,
            showUpperGrid: true // Add subtle grid in upper area too
        };
        this._gridFrameSkip = 1;
        this._gridFrameCounter = 0;

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
        
        // [Pi] GPU Memory Optimization: Reduce nebula sprite cache for Pi5
        // Increased to 12 to prevent cache thrashing with quantized sizes (2 colors * 4 sizes = 8 max)
        this._nebulaCacheLimit = window.isRaspberryPi ? 12 : 32;

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
            layer.activeCount = layer.stars.length;
        }
        // Preserve original/base counts across reinitializations
        if (!this._baseStarCounts) {
            this._baseStarCounts = this.starLayers.map(l => l.count);
        }

        // Reset parallax baseline after reinitializing
        this._hasPlayerBaseline = false;
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;
        this._pendingParallaxX = 0;
        this._pendingParallaxY = 0;
        this._frameAccumulator = 0;

        this._gridBufferDirty = true;

        // Generate nebula clouds
        this.nebulaClouds.length = 0;
        
        // [R] FIX: Use fixed colors in sequence to prevent pop-in when sprites regenerate
        // Alternate purple and pink for variety but consistency
        const nebulaColors = [this.colors.nebulaPurple, this.colors.nebulaPink];
        
        // Quantized sizes to maximize sprite reuse and prevent cache thrashing
        // 4 sizes: 100, 150, 200, 250
        const quantizedSizes = [100, 150, 200, 250];
        
        for (let i = 0; i < this.nebulaCount; i++) {
            // Pick a size from the quantized set
            const sizeIndex = Math.floor(Math.random() * quantizedSizes.length);

            this.nebulaClouds.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                radius: quantizedSizes[sizeIndex],
                // Use alternating pattern instead of random to ensure consistent sprite cache
                color: nebulaColors[i % nebulaColors.length],
                drift: {
                    x: (Math.random() - 0.5) * 0.1,
                    y: (Math.random() - 0.5) * 0.1
                },
                pulseSpeed: 0.3 + Math.random() * 0.5,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }

        // Keep the active nebula count aligned with the generated set
        this._nebulaActiveCount = Math.min(this._nebulaActiveCount, this.nebulaCount);

        // Clear sprite cache when reinitializing to ensure fresh rendering
        this._nebulaSpriteCache.clear();
        
        // [PERFORMANCE] Defer nebula sprite pre-warming to avoid early-game lag
        // Pre-warm on first render instead of initialization
        this._needsPreWarm = true;

        this._starBufferDirty = true;
    }

    /**
     * [PERFORMANCE] Pre-warm nebula sprite cache to prevent pop-in
     * Called on first render to avoid blocking game start
     */
    _preWarmNebulaCache() {
        if (!this._needsPreWarm) return;
        this._needsPreWarm = false;
        
        // Generate sprites for all nebula clouds
        for (const cloud of this.nebulaClouds) {
            this._getNebulaSprite(cloud.color, cloud.radius);
        }
    }

    resize() {
        // [R] FIX: Only reinitialize if canvas size actually changed
        // Prevents unnecessary nebula flashing on spurious resize events
        const currentWidth = this.canvas.width || 0;
        const currentHeight = this.canvas.height || 0;
        
        // Store last known canvas dimensions
        if (!this._lastCanvasWidth) this._lastCanvasWidth = currentWidth;
        if (!this._lastCanvasHeight) this._lastCanvasHeight = currentHeight;
        
        // Only reinitialize if dimensions actually changed significantly (>RESIZE_THRESHOLD px difference)
        const widthChanged = Math.abs(currentWidth - this._lastCanvasWidth) > this.RESIZE_THRESHOLD;
        const heightChanged = Math.abs(currentHeight - this._lastCanvasHeight) > this.RESIZE_THRESHOLD;
        
        if (widthChanged || heightChanged) {
            this._lastCanvasWidth = currentWidth;
            this._lastCanvasHeight = currentHeight;
            // Redistribute stars when canvas resizes
            this.initialize();
            this._gridBufferDirty = true;
            if (window.logger?.isDebugEnabled?.('systems')) {
                window.logger.log(`[C] CosmicBackground resized (${currentWidth}x${currentHeight})`);
            }
        }
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

            let starsShifted = false;
            for (const layer of this.starLayers) {
                const stars = layer.stars;
                if (!stars || stars.length === 0) continue;

                const parallaxX = cameraDeltaX * layer.speed;
                const parallaxY = cameraDeltaY * layer.speed;
                if (parallaxX === 0 && parallaxY === 0) continue;

                starsShifted = true;

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

            if (starsShifted) {
                this._starBufferDirty = true;
            }

            if (Math.abs(cameraDeltaX) > this._gridDirtyThreshold || Math.abs(cameraDeltaY) > this._gridDirtyThreshold) {
                this._gridBufferDirty = true;
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
        // [PERFORMANCE] Pre-warm nebula cache on first render (deferred from init)
        if (this._needsPreWarm) {
            this._preWarmNebulaCache();
        }

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
            this._gridFrameCounter = (this._gridFrameCounter + 1) % this._gridFrameSkip;
            if (this._gridFrameCounter === 0) {
                this.renderGrid(player);
            }
        }
    }

    renderNebulae() {
        if (this.nebulaClouds.length === 0) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const activeNebulae = Math.min(
            this._nebulaActiveCount ?? this.nebulaClouds.length,
            this.nebulaClouds.length
        );
        if (activeNebulae <= 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Ensure smooth scaling for nebulas, especially if using low-res sprites
        ctx.imageSmoothingEnabled = true;

        // 🌟 OPTIMIZATION & FIX: Ensure nebulae never "pop" by always using sprites
        // with smooth culling and consistent rendering
        for (let i = 0; i < activeNebulae; i++) {
            const cloud = this.nebulaClouds[i];
            // Skip clouds that are completely off-screen (with generous buffer to prevent popping)
            const buffer = cloud.radius * 1.5; // 1.5x radius buffer for smooth transitions
            if (cloud.x + buffer < 0 || cloud.x - buffer > w || 
                cloud.y + buffer < 0 || cloud.y - buffer > h) {
                continue;
            }

            // Smooth pulsing opacity using sine wave
            const pulse = Math.sin(this.time * cloud.pulseSpeed + cloud.pulseOffset) * 0.5 + 0.5;
            const baseOpacity = 0.16 + pulse * 0.2;
            
            // Add distance fade to prevent hard edges when nebulae move off-screen
            const distFadeX = Math.min(1, Math.min(
                (cloud.x + buffer) / buffer,
                (w - cloud.x + buffer) / buffer
            ));
            const distFadeY = Math.min(1, Math.min(
                (cloud.y + buffer) / buffer,
                (h - cloud.y + buffer) / buffer
            ));
            const distanceFade = Math.min(distFadeX, distFadeY);
            const opacity = baseOpacity * Math.max(0, Math.min(1, distanceFade));

            if (opacity < 0.01) continue; // Skip if too faint

            // Always use sprite cache for consistent rendering (no fallback = no popping)
            const sprite = this._getNebulaSprite(cloud.color, cloud.radius);
            if (!sprite) continue; // Skip instead of using fallback gradient

            ctx.globalAlpha = opacity;
            ctx.drawImage(
                sprite,
                cloud.x - cloud.radius,
                cloud.y - cloud.radius,
                cloud.radius * 2,
                cloud.radius * 2
            );
        }

        ctx.restore();
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

        // [Pi] Optimization: Use lower resolution sprites on Pi to save memory
        const scale = window.isRaspberryPi ? 0.5 : 1.0;
        const spriteRadius = roundedRadius * scale;
        const size = Math.max(2, Math.ceil(spriteRadius * 2));
        
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) {
            return null;
        }

        const gradient = offCtx.createRadialGradient(
            spriteRadius, spriteRadius, 0,
            spriteRadius, spriteRadius, spriteRadius
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
        const skipTwinkle = this.lowQuality;

        this._twinkleUpdateCounter++;
        const shouldUpdateTwinkle = !skipTwinkle && ((this._twinkleUpdateCounter % this._twinkleUpdateFrequency) === 0);

        const width = this.canvas.width || 1;
        const height = this.canvas.height || 1;

        if (shouldUpdateTwinkle) {
            this._starBufferDirty = true;
        }

        const buffer = this._ensureStarBuffer(width, height);

        if (buffer && buffer.ctx) {
            if (this._starBufferDirty) {
                buffer.ctx.clearRect(0, 0, width, height);
                this._drawStarsToContext(buffer.ctx, width, height, skipTwinkle, shouldUpdateTwinkle);
                this._starBufferDirty = false;
            }
            this.ctx.drawImage(buffer.canvas, 0, 0, width, height);
        } else {
            this._drawStarsToContext(this.ctx, width, height, skipTwinkle, shouldUpdateTwinkle);
        }
    }

    _ensureStarBuffer(width, height) {
        if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') {
            return null;
        }

        const safeWidth = Math.max(1, Math.floor(width));
        const safeHeight = Math.max(1, Math.floor(height));
        const needsNewBuffer = !this._starBuffer ||
            this._starBufferWidth !== safeWidth ||
            this._starBufferHeight !== safeHeight;

        if (needsNewBuffer) {
            if (typeof OffscreenCanvas !== 'undefined') {
                this._starBuffer = new OffscreenCanvas(safeWidth, safeHeight);
            } else if (typeof document !== 'undefined') {
                const canvas = document.createElement('canvas');
                canvas.width = safeWidth;
                canvas.height = safeHeight;
                this._starBuffer = canvas;
            } else {
                this._starBuffer = null;
            }

            this._starBufferCtx = this._starBuffer ? this._starBuffer.getContext('2d') : null;
            this._starBufferWidth = safeWidth;
            this._starBufferHeight = safeHeight;
            this._starBufferDirty = true;
        }

        if (!this._starBuffer || !this._starBufferCtx) {
            return null;
        }

        return { canvas: this._starBuffer, ctx: this._starBufferCtx };
    }

    _drawStarsToContext(ctx, width, height, skipTwinkle, shouldUpdateTwinkle) {
        if (!ctx) return;

        const cullMarginFactor = 0.05;
        const cullMargin = Math.max(width, height) * cullMarginFactor;
        const minX = -cullMargin;
        const maxX = width + cullMargin;
        const minY = -cullMargin;
        const maxY = height + cullMargin;
        const time = this.time;

        for (const layer of this.starLayers) {
            const layerStars = layer.stars;
            if (!layerStars || layerStars.length === 0) continue;
            const activeCount = Math.min(layer.activeCount ?? layerStars.length, layerStars.length);
            if (activeCount === 0) continue;

            const size = layer.size;
            const brightness = layer.brightness;

            if (size < 2) {
                ctx.fillStyle = '#ffffff';
                const baseAlpha = brightness * (skipTwinkle ? 0.7 : 0.8);
                ctx.globalAlpha = baseAlpha;

                for (let i = 0; i < activeCount; i++) {
                    const star = layerStars[i];
                    if (!star) continue;

                    const x = star.x;
                    const y = star.y;

                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
                    }
                }
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();

                let seed = shouldUpdateTwinkle ? ((layer.seed || 0) + (time * layer.twinkleSpeedScalar || time)) : 0;

                for (let i = 0; i < activeCount; i++) {
                    const star = layerStars[i];
                    if (!star) continue;

                    const x = star.x;
                    const y = star.y;

                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        if (shouldUpdateTwinkle) {
                            seed = (seed * 1664525 + 1013904223) | 0;
                            const phase = ((seed >>> 16) & 0xffff) / 0xffff;
                            star.cachedTwinkle = phase;
                        }

                        ctx.moveTo(x + size, y);
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                    }
                }

                ctx.globalAlpha = brightness * (skipTwinkle ? 0.7 : 0.8);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1.0;
    }

    renderGrid(player) {
        const width = this.canvas.width || 1;
        const height = this.canvas.height || 1;
        const playerX = player && typeof player.x === 'number' ? player.x : 0;
        const playerY = player && typeof player.y === 'number' ? player.y : 0;

        if (Math.abs(playerX - this._lastGridPlayerX) > this._gridDirtyThreshold ||
            Math.abs(playerY - this._lastGridPlayerY) > this._gridDirtyThreshold) {
            this._gridBufferDirty = true;
        }

        const buffer = this._ensureGridBuffer(width, height);

        if (buffer && buffer.ctx) {
            if (this._gridBufferDirty) {
                buffer.ctx.clearRect(0, 0, width, height);
                this._drawGridToContext(buffer.ctx, width, height, player);
                this._gridBufferDirty = false;
                this._lastGridPlayerX = playerX;
                this._lastGridPlayerY = playerY;
            }
            this.ctx.drawImage(buffer.canvas, 0, 0, width, height);
        } else {
            this._drawGridToContext(this.ctx, width, height, player);
            this._lastGridPlayerX = playerX;
            this._lastGridPlayerY = playerY;
            this._gridBufferDirty = false;
        }
    }

    _ensureGridBuffer(width, height) {
        if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') {
            return null;
        }

        const safeWidth = Math.max(1, Math.floor(width));
        const safeHeight = Math.max(1, Math.floor(height));
        const needsNewBuffer = !this._gridBuffer ||
            this._gridBufferWidth !== safeWidth ||
            this._gridBufferHeight !== safeHeight;

        if (needsNewBuffer) {
            if (typeof OffscreenCanvas !== 'undefined') {
                this._gridBuffer = new OffscreenCanvas(safeWidth, safeHeight);
            } else if (typeof document !== 'undefined') {
                const canvas = document.createElement('canvas');
                canvas.width = safeWidth;
                canvas.height = safeHeight;
                this._gridBuffer = canvas;
            } else {
                this._gridBuffer = null;
            }
            this._gridBufferCtx = this._gridBuffer ? this._gridBuffer.getContext('2d') : null;
            this._gridBufferWidth = safeWidth;
            this._gridBufferHeight = safeHeight;
            this._gridBufferDirty = true;
        }

        if (!this._gridBuffer || !this._gridBufferCtx) {
            return null;
        }

        return { canvas: this._gridBuffer, ctx: this._gridBufferCtx };
    }

    _drawGridToContext(ctx, w, h, player) {
        if (!ctx) return;

        const horizonY = h * this.grid.horizonY;
        const spacing = this.grid.spacing;

        const maxHorizontalLines = this.lowQuality ? 15 : 25;
        const numVerticalLines = this.lowQuality ? 15 : 25;

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(this.colors.gridColor, 0.2);
        ctx.lineWidth = 1.5;

        const playerX = player && typeof player.x === 'number' ? player.x : 0;
        const playerY = player && typeof player.y === 'number' ? player.y : 0;

        const offsetX = (-playerX * 0.3) % spacing;
        const offsetY = (-playerY * 0.3) % spacing;

        ctx.beginPath();

        if (this.grid.showUpperGrid) {
            const upperSpacing = spacing * 1.5;
            const upperOffsetX = (-playerX * 0.15) % upperSpacing;
            const upperOffsetY = (-playerY * 0.15) % upperSpacing;

            for (let i = 0; i < 8; i++) {
                const y = (i * upperSpacing + upperOffsetY) % horizonY;
                if (y < 0 || y > horizonY) continue;
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
            }

            const upperVerticalLines = this.lowQuality ? 8 : 12;
            for (let i = -upperVerticalLines; i <= upperVerticalLines; i++) {
                const x = w * 0.5 + (i * upperSpacing) + upperOffsetX;
                if (x < 0 || x > w) continue;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, horizonY);
            }
        }

        const gridStartY = horizonY + offsetY;
        for (let i = 0; i < maxHorizontalLines; i++) {
            const yOffset = i * spacing * 0.7;
            const y = gridStartY + yOffset;
            if (y < horizonY || y > h) continue;
            const progress = (y - horizonY) / (h - horizonY);
            const perspectiveScale = progress;
            const leftX = w * 0.5 - (w * perspectiveScale);
            const rightX = w * 0.5 + (w * perspectiveScale);
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
        }

        for (let i = -numVerticalLines; i <= numVerticalLines; i++) {
            const x = w * 0.5 + (i * spacing) + offsetX;
            if (x < 0 || x > w) continue;
            const vanishingX = w * 0.5;
            const perspectiveAngle = (x - vanishingX) * 0.1;
            ctx.moveTo(x, horizonY);
            ctx.lineTo(x + perspectiveAngle, h);
        }

        ctx.globalAlpha = 0.15;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Ensure star layers have enough stars for requested active counts without clearing or reinitializing.
     * Keeps parallax and buffers stable while letting quality toggles thin the drawn set.
     */
    _setActiveStarCounts(targetCounts) {
        const width = this.canvas.width || 800;
        const height = this.canvas.height || 600;

        for (let i = 0; i < this.starLayers.length; i++) {
            const layer = this.starLayers[i];
            const targetCount = Math.max(0, Math.floor(targetCounts[i] ?? layer.count ?? 0));
            const stars = layer.stars || (layer.stars = []);

            // Never trim; keep full parallax history stable and just adjust how many we draw
            if (stars.length < targetCount) {
                const needed = targetCount - stars.length;
                for (let n = 0; n < needed; n++) {
                    stars.push(this._createStar(width, height));
                }
            }

            layer.activeCount = targetCount;
        }

        this._starBufferDirty = true;
    }

    _createStar(width, height) {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            twinkleOffset: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.5 + Math.random() * 1.5,
            cachedTwinkle: 0.5 + Math.random() * 0.5
        };
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
     * > PERFORMANCE PRESET: Raspberry Pi 5 & Low-End Devices
     * Applies optimized settings for smooth 60fps on ARM/integrated GPUs
     */
    enablePi5Mode() {
        this.setLowQuality(true);
        this.setUpdateFrequency(2); // Update every other frame
        this.setCameraThreshold(1.0); // Ignore small camera movements
        this._twinkleUpdateFrequency = 5; // Update twinkle less often

        // Reduce nebula cache aggressively for Pi memory limits
        this._nebulaCacheLimit = Math.min(this._nebulaCacheLimit, 8);
        if (this._nebulaSpriteCache && this._nebulaSpriteCache.size > this._nebulaCacheLimit) {
            while (this._nebulaSpriteCache.size > this._nebulaCacheLimit) {
                const oldestKey = this._nebulaSpriteCache.keys().next().value;
                if (typeof oldestKey === 'undefined') {
                    break;
                }
                this._nebulaSpriteCache.delete(oldestKey);
            }
        }

        // Thin out grid rendering to cut draw calls
        this._gridFrameSkip = 2; // render every other frame
        this.grid.showUpperGrid = false;
        this.grid.spacing = Math.max(this.grid.spacing, 100);
        this._gridFrameCounter = 0;

        if (window.logger?.isDebugEnabled?.('systems')) {
            window.logger.log('[Pi] CosmicBackground: Pi5 optimization mode enabled');
        }
    }

    /**
     * > PERFORMANCE PRESET: High-End Desktop
     * Maximum visual quality for modern GPUs
     */
    enableDesktopMode() {
        this.setLowQuality(false);
        this.setUpdateFrequency(1); // Update every frame
        this.setCameraThreshold(0.5); // Smooth parallax
        this._twinkleUpdateFrequency = 3; // More frequent twinkle updates
        this._nebulaCacheLimit = 32;
        this._gridFrameSkip = 1;
        this.grid.showUpperGrid = true;
        this.grid.spacing = 80;
        this._gridFrameCounter = 0;
        if (window.logger?.isDebugEnabled?.('systems')) {
            window.logger.log('[D] CosmicBackground: Desktop quality mode enabled');
        }
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
            starCount: this.starLayers.reduce((sum, layer) => sum + (layer.activeCount ?? layer.stars.length), 0),
            nebulaCount: this._nebulaActiveCount ?? this.nebulaClouds.length
        };
    }

    // Performance toggle
    setLowQuality(enabled) {
        if (this.lowQuality === enabled) return; // No change needed

        this.lowQuality = enabled;
        this._starBufferDirty = true;
        
        // [R] FIX: Track if counts actually changed to avoid unnecessary reinitialization
        // This prevents nebula flashing when _applyBackgroundQuality() is called repeatedly
        const baseCounts = this._originalStarCounts || this._baseStarCounts || this.starLayers.map(l => l.stars.length || l.count);
        const targetStarCounts = [...baseCounts];
        const isPi = typeof window !== 'undefined' && window.isRaspberryPi;
        
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
            let newCount0 = Math.max(20, Math.floor(this._originalStarCounts[0] * 0.25));
            let newCount1 = Math.max(15, Math.floor(this._originalStarCounts[1] * 0.25));
            let newCount2 = Math.max(10, Math.floor(this._originalStarCounts[2] * 0.25));
            // Nebulae stay at full count for visual stability; Pi can opt into a lighter set
            const baseNebulaCount = this._originalNebulaCount;
            const piNebulaTarget = Math.max(4, Math.floor(baseNebulaCount * 0.5));
            const newNebulaCount = isPi
                ? Math.max(3, Math.floor(piNebulaTarget * 0.75))
                : baseNebulaCount;

            const starScale = isPi ? 0.6 : 1;
            newCount0 = Math.max(12, Math.floor(newCount0 * starScale));
            newCount1 = Math.max(9, Math.floor(newCount1 * starScale));
            newCount2 = Math.max(6, Math.floor(newCount2 * starScale));

            targetStarCounts[0] = newCount0;
            targetStarCounts[1] = newCount1;
            targetStarCounts[2] = newCount2;

            this.nebulaCount = newNebulaCount;
            this._nebulaActiveCount = newNebulaCount;
        } else {
            // Restore quality - grid stays enabled (always on for synthwave aesthetic)
            if (this._originalStarCounts) {
                targetStarCounts[0] = this._originalStarCounts[0];
                targetStarCounts[1] = this._originalStarCounts[1];
                targetStarCounts[2] = this._originalStarCounts[2];
            }
            if (typeof this._originalNebulaCount === 'number') {
                this.nebulaCount = this._originalNebulaCount;
                this._nebulaActiveCount = this._originalNebulaCount;
            }

            this._gridFrameSkip = 1;
            this.grid.showUpperGrid = true;
            this.grid.spacing = 80;
        }

        if (typeof this._nebulaActiveCount !== 'number') {
            this._nebulaActiveCount = this.nebulaCount;
        }
        this._nebulaActiveCount = Math.min(this._nebulaActiveCount, this.nebulaClouds.length || this.nebulaCount || 0);

        // Adjust stars in place instead of reinitializing (prevents parallax and nebula pop-in)
        this._setActiveStarCounts(targetStarCounts);
        this._gridFrameCounter = 0;
        this._gridBufferDirty = true;

        if (window.logger?.isDebugEnabled?.('systems')) {
            window.logger.log(`[C] CosmicBackground quality set to ${enabled ? 'low' : 'high'} (stars=${targetStarCounts.join('/')}, nebulae=${this._nebulaActiveCount})`);
        }
    }
}

// Expose to global namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.CosmicBackground = CosmicBackground;
}

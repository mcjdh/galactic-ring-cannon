/**
 * ProjectileRenderer - Handles all projectile visual rendering
 * Extracted from Projectile class for better separation of concerns
 */
class ProjectileRenderer {
    /**
     * Main render method
     */
    static render(projectile, ctx) {
        ctx.save();

        // Draw trail
        if (projectile.trail && projectile.trailCount > 1) {
            this.renderTrail(projectile, ctx);
        }

        // Draw projectile body
        this.renderBody(projectile, ctx);

        // Draw glow for special types
        if (projectile.behaviorManager?.behaviors.length > 0) {
            this.renderGlow(projectile, ctx);
        }

        // Draw crit indicator
        if (projectile.isCrit) {
            this.renderCritGlow(projectile, ctx);
        }

        ctx.restore();
    }

    /**
     * Batched render path to minimize canvas state churn when drawing many projectiles
     */
    static renderBatch(projectiles, ctx) {
        if (!projectiles || projectiles.length === 0) return;

        const originalFill = ctx.fillStyle;
        const originalStroke = ctx.strokeStyle;
        const originalLineWidth = ctx.lineWidth;
        const originalLineCap = ctx.lineCap;
        const originalAlpha = ctx.globalAlpha;

        const bodySpriteBatches = this._batchBodySpriteBatches || (this._batchBodySpriteBatches = new Map());
        const bodyFallbackBatches = this._batchBodyFallbackBatches || (this._batchBodyFallbackBatches = new Map());
        const glowSpriteBatches = this._batchGlowSpriteBatches || (this._batchGlowSpriteBatches = new Map());
        const glowFallbackBatches = this._batchGlowFallbackBatches || (this._batchGlowFallbackBatches = new Map());
        const critSpriteBatches = this._batchCritSpriteBatches || (this._batchCritSpriteBatches = new Map());
        const critFallbackBatches = this._batchCritFallbackBatches || (this._batchCritFallbackBatches = new Map());
        const trailProjectiles = this._batchTrailProjectiles || (this._batchTrailProjectiles = []);

        bodySpriteBatches.clear();
        bodyFallbackBatches.clear();
        glowSpriteBatches.clear();
        glowFallbackBatches.clear();
        critSpriteBatches.clear();
        critFallbackBatches.clear();
        trailProjectiles.length = 0;

        for (let i = 0; i < projectiles.length; i++) {
            const projectile = projectiles[i];
            if (!projectile || projectile.isDead) continue;

            if (projectile.trail && projectile.trailCount > 1) {
                trailProjectiles.push(projectile);
            }

            const bodyColor = this.getBodyColor(projectile);
            const bodySprite = this._getBodySprite(projectile.radius, bodyColor, projectile.isCrit);
            if (bodySprite) {
                let batch = bodySpriteBatches.get(bodySprite);
                if (!batch) {
                    batch = [];
                    bodySpriteBatches.set(bodySprite, batch);
                }
                batch.push(projectile);
            } else {
                const key = `${bodyColor}|${projectile.radius}|${projectile.isCrit ? 1 : 0}`;
                let batch = bodyFallbackBatches.get(key);
                if (!batch) {
                    batch = [];
                    bodyFallbackBatches.set(key, batch);
                }
                batch.push(projectile);
            }

            const glowColor = this.getGlowColor(projectile);
            if (glowColor) {
                const glowSprite = this._getGlowSprite(projectile.radius, glowColor);
                if (glowSprite) {
                    let batch = glowSpriteBatches.get(glowSprite);
                    if (!batch) {
                        batch = [];
                        glowSpriteBatches.set(glowSprite, batch);
                    }
                    batch.push(projectile);
                } else {
                    const key = `${glowColor}|${projectile.radius}`;
                    let batch = glowFallbackBatches.get(key);
                    if (!batch) {
                        batch = [];
                        glowFallbackBatches.set(key, batch);
                    }
                    batch.push(projectile);
                }
            }

            if (projectile.isCrit) {
                const critSprite = this._getCritGlowSprite(projectile.radius);
                if (critSprite) {
                    let batch = critSpriteBatches.get(critSprite);
                    if (!batch) {
                        batch = [];
                        critSpriteBatches.set(critSprite, batch);
                    }
                    batch.push(projectile);
                } else {
                    const key = projectile.radius.toString();
                    let batch = critFallbackBatches.get(key);
                    if (!batch) {
                        batch = [];
                        critFallbackBatches.set(key, batch);
                    }
                    batch.push(projectile);
                }
            }
        }

        // Trails still rely on per-projectile alpha modulation
        if (trailProjectiles.length) {
            const previousStroke = ctx.strokeStyle;
            const previousLineWidth = ctx.lineWidth;
            const previousLineCap = ctx.lineCap;

            for (let i = 0; i < trailProjectiles.length; i++) {
                const projectile = trailProjectiles[i];
                if (!projectile.trail || projectile.trailCount < 2) continue;

                ctx.strokeStyle = this.getTrailColor(projectile);
                ctx.lineWidth = projectile.radius * 0.5;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.6;

                ctx.beginPath();

                // Read from circular buffer: oldest to newest
                const startIdx = projectile.trailCount < projectile.maxTrailLength ? 0 : projectile.trailIndex;
                const firstPoint = projectile.trail[startIdx];
                if (!firstPoint) continue;

                ctx.moveTo(firstPoint.x, firstPoint.y);

                for (let j = 1; j < projectile.trailCount; j++) {
                    const idx = (startIdx + j) % projectile.maxTrailLength;
                    const point = projectile.trail[idx];
                    if (!point) continue;
                    const alpha = j / projectile.trailCount;
                    ctx.globalAlpha = alpha * 0.6;
                    ctx.lineTo(point.x, point.y);
                }
                ctx.stroke();

                ctx.globalAlpha = originalAlpha;
            }

            ctx.strokeStyle = previousStroke;
            ctx.lineWidth = previousLineWidth;
            ctx.lineCap = previousLineCap;
        }
        trailProjectiles.length = 0;

        for (const [sprite, batch] of bodySpriteBatches) {
            if (!batch || batch.length === 0) continue;
            const { canvas, halfSize } = sprite;
            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                ctx.drawImage(canvas, projectile.x - halfSize, projectile.y - halfSize);
            }
            batch.length = 0;
        }
        for (const [key, batch] of bodyFallbackBatches) {
            if (!batch || batch.length === 0) continue;
            const [color, radiusStr, critFlag] = key.split('|');
            const radius = parseFloat(radiusStr);

            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                ctx.moveTo(projectile.x + radius, projectile.y);
                ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
            }
            ctx.fill();

            const highlightColor = critFlag === '1' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
            const innerRadius = radius * 0.4;
            ctx.fillStyle = highlightColor;
            ctx.beginPath();
            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                ctx.moveTo(projectile.x + innerRadius, projectile.y);
                ctx.arc(projectile.x, projectile.y, innerRadius, 0, Math.PI * 2);
            }
            ctx.fill();

            batch.length = 0;
        }
        for (const [sprite, batch] of glowSpriteBatches) {
            if (!batch || batch.length === 0) continue;
            const { canvas, halfSize } = sprite;
            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                ctx.drawImage(canvas, projectile.x - halfSize, projectile.y - halfSize);
            }
            batch.length = 0;
        }
        for (const [key, batch] of glowFallbackBatches) {
            if (!batch || batch.length === 0) continue;
            const [color, radiusStr] = key.split('|');
            const radius = parseFloat(radiusStr) * 2;

            ctx.fillStyle = this._colorWithAlpha(color, 0.35);
            ctx.beginPath();
            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                ctx.moveTo(projectile.x + radius, projectile.y);
                ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
            }
            ctx.fill();

            batch.length = 0;
        }
        if (critSpriteBatches.size || critFallbackBatches.size) {
            const pulseIntensity = Math.sin(Date.now() / 100) * 0.3 + 0.7;

            if (critSpriteBatches.size) {
                ctx.globalAlpha = pulseIntensity;
                for (const [sprite, batch] of critSpriteBatches) {
                    if (!batch || batch.length === 0) continue;
                    const { canvas, halfSize } = sprite;
                    for (let i = 0; i < batch.length; i++) {
                        const projectile = batch[i];
                        ctx.drawImage(canvas, projectile.x - halfSize, projectile.y - halfSize);
                    }
                    batch.length = 0;
                }
            }

            if (critFallbackBatches.size) {
                ctx.globalAlpha = 1;
                const fillAlpha = 0.35 * pulseIntensity;
                const fillStyle = `rgba(255, 215, 0, ${fillAlpha})`;
                ctx.fillStyle = fillStyle;

                for (const [radiusKey, batch] of critFallbackBatches) {
                    if (!batch || batch.length === 0) continue;
                    const radius = parseFloat(radiusKey) * 2.5;
                    ctx.beginPath();
                    for (let i = 0; i < batch.length; i++) {
                        const projectile = batch[i];
                        ctx.moveTo(projectile.x + radius, projectile.y);
                        ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    batch.length = 0;
                }
            }
        }
        ctx.fillStyle = originalFill;
        ctx.strokeStyle = originalStroke;
        ctx.lineWidth = originalLineWidth;
        ctx.lineCap = originalLineCap;
        ctx.globalAlpha = originalAlpha;
    }

    /**
     * Render projectile trail
     */
    static renderTrail(projectile, ctx) {
        if (projectile.trailCount < 2) return;

        ctx.strokeStyle = this.getTrailColor(projectile);
        ctx.lineWidth = projectile.radius * 0.5;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;

        ctx.beginPath();

        // Read from circular buffer: oldest to newest
        const startIdx = projectile.trailCount < projectile.maxTrailLength ? 0 : projectile.trailIndex;
        const firstPoint = projectile.trail[startIdx];
        if (!firstPoint) return;

        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < projectile.trailCount; i++) {
            const idx = (startIdx + i) % projectile.maxTrailLength;
            const point = projectile.trail[idx];
            if (!point) continue;
            const alpha = i / projectile.trailCount;
            ctx.globalAlpha = alpha * 0.6;
            ctx.lineTo(point.x, point.y);
        }

        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Render main projectile body - Enhanced with glow
     */
    static renderBody(projectile, ctx) {
        const color = this.getBodyColor(projectile);
        const sprite = this._getBodySprite(projectile.radius, color, projectile.isCrit);

        if (sprite) {
            ctx.drawImage(
                sprite.canvas,
                projectile.x - sprite.halfSize,
                projectile.y - sprite.halfSize
            );
            return;
        }

        // Fallback: direct draw if canvas caching unavailable
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = projectile.isCrit ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render special type glow
     */
    static renderGlow(projectile, ctx) {
        const glowColor = this.getGlowColor(projectile);
        if (!glowColor) return;

        const sprite = this._getGlowSprite(projectile.radius, glowColor);
        if (sprite) {
            ctx.drawImage(
                sprite.canvas,
                projectile.x - sprite.halfSize,
                projectile.y - sprite.halfSize
            );
            return;
        }

        ctx.fillStyle = this._colorWithAlpha(glowColor, 0.35);
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render crit glow/pulse
     */
    static renderCritGlow(projectile, ctx) {
        const pulseIntensity = Math.sin(Date.now() / 100) * 0.3 + 0.7;
        const sprite = this._getCritGlowSprite(projectile.radius);

        if (sprite) {
            ctx.save();
            ctx.globalAlpha = pulseIntensity;
            ctx.drawImage(
                sprite.canvas,
                projectile.x - sprite.halfSize,
                projectile.y - sprite.halfSize
            );
            ctx.restore();
            return;
        }

        ctx.fillStyle = `rgba(255, 215, 0, ${0.35 * pulseIntensity})`;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    static _getBodySprite(radius, color, isCrit) {
        const cacheKey = `${color}|${isCrit ? 'crit' : 'base'}|${radius.toFixed(2)}`;
        const cache = this._bodySpriteCache;

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        const glowBlur = 10;
        const glowPadding = Math.max(glowBlur * 2, radius * 0.5);
        const outerRadius = radius + glowPadding;
        const size = Math.max(4, Math.ceil(outerRadius * 2));
        const canvas = this._createOffscreen(size);
        if (!canvas) return null;

        const offCtx = canvas.getContext('2d');
        if (!offCtx) return null;

        const center = size / 2;
        offCtx.shadowBlur = glowBlur;
        offCtx.shadowColor = color;

        offCtx.fillStyle = color;
        offCtx.beginPath();
        offCtx.arc(center, center, radius, 0, Math.PI * 2);
        offCtx.fill();

        offCtx.shadowBlur = 0;
        offCtx.fillStyle = isCrit ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        offCtx.beginPath();
        offCtx.arc(center, center, radius * 0.4, 0, Math.PI * 2);
        offCtx.fill();

        const sprite = { canvas, halfSize: size / 2 };
        this._storeSprite(cache, cacheKey, sprite, this._BODY_CACHE_LIMIT);
        return sprite;
    }

    static _colorWithAlpha(color, alpha) {
        const key = `${color}|${alpha}`;
        const cache = this._glowColorCache || (this._glowColorCache = new Map());
        if (cache.has(key)) {
            return cache.get(key);
        }
        const parsed = this._parseColor(color);
        const value = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
        cache.set(key, value);
        return value;
    }

    static _parseColor(color) {
        const cache = this._parsedColorCache || (this._parsedColorCache = new Map());
        if (cache.has(color)) {
            return cache.get(color);
        }
        const parsed = this._extractRGBComponents(color);
        cache.set(color, parsed);
        return parsed;
    }

    static _extractRGBComponents(color) {
        const clamp = (value) => {
            const num = parseFloat(value);
            if (!Number.isFinite(num)) return 255;
            return Math.max(0, Math.min(255, Math.round(num)));
        };

        if (typeof color === 'string') {
            if (color.startsWith('#')) {
                const hex = color.slice(1);
                if (hex.length === 3) {
                    return {
                        r: parseInt(hex[0] + hex[0], 16),
                        g: parseInt(hex[1] + hex[1], 16),
                        b: parseInt(hex[2] + hex[2], 16)
                    };
                }
                if (hex.length >= 6) {
                    return {
                        r: parseInt(hex.slice(0, 2), 16),
                        g: parseInt(hex.slice(2, 4), 16),
                        b: parseInt(hex.slice(4, 6), 16)
                    };
                }
            } else {
                const rgbaMatch = color.match(/^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)(?:\s*,\s*[0-9]+(?:\.[0-9]+)?)?\s*\)$/i);
                if (rgbaMatch) {
                    return {
                        r: clamp(rgbaMatch[1]),
                        g: clamp(rgbaMatch[2]),
                        b: clamp(rgbaMatch[3])
                    };
                }
            }
        }

        return { r: 255, g: 255, b: 255 };
    }

    static _getGlowSprite(radius, color) {
        const cacheKey = `${color}|${radius.toFixed(2)}`;
        const cache = this._glowSpriteCache;

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        const outerRadius = radius * 2;
        const padding = Math.max(outerRadius * 0.2, 6);
        const size = Math.max(4, Math.ceil((outerRadius + padding) * 2));
        const canvas = this._createOffscreen(size);
        if (!canvas) return null;

        const offCtx = canvas.getContext('2d');
        if (!offCtx) return null;

        const center = size / 2;
        const gradient = offCtx.createRadialGradient(
            center, center, radius * 0.5,
            center, center, outerRadius
        );

        gradient.addColorStop(0, `${color}80`);
        gradient.addColorStop(1, `${color}00`);

        offCtx.fillStyle = gradient;
        offCtx.beginPath();
        offCtx.arc(center, center, outerRadius, 0, Math.PI * 2);
        offCtx.fill();

        const sprite = { canvas, halfSize: size / 2 };
        this._storeSprite(cache, cacheKey, sprite, this._GLOW_CACHE_LIMIT);
        return sprite;
    }

    static _getCritGlowSprite(radius) {
        const cacheKey = radius.toFixed(2);
        const cache = this._critGlowCache;

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        const outerRadius = radius * 2.5;
        const padding = Math.max(outerRadius * 0.1, 6);
        const size = Math.max(4, Math.ceil((outerRadius + padding) * 2));
        const canvas = this._createOffscreen(size);
        if (!canvas) return null;

        const offCtx = canvas.getContext('2d');
        if (!offCtx) return null;

        const center = size / 2;
        const gradient = offCtx.createRadialGradient(
            center, center, 0,
            center, center, outerRadius
        );

        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        offCtx.fillStyle = gradient;
        offCtx.beginPath();
        offCtx.arc(center, center, outerRadius, 0, Math.PI * 2);
        offCtx.fill();

        const sprite = { canvas, halfSize: size / 2 };
        this._storeSprite(cache, cacheKey, sprite, this._CRIT_CACHE_LIMIT);
        return sprite;
    }

    static _createOffscreen(size) {
        if (typeof document === 'undefined') {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    }

    static _storeSprite(cache, key, sprite, limit) {
        if (!cache || !sprite) {
            return;
        }
        if (limit > 0 && cache.size >= limit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) {
                cache.delete(oldestKey);
            }
        }
        cache.set(key, sprite);
    }

    /**
     * Get trail color based on behaviors - Synthwave themed
     */
    static getTrailColor(projectile) {
        if (!projectile.behaviorManager) return '#00ffff';

        const behaviors = projectile.behaviorManager.behaviors;

        // Priority: Chain > Explosive > Homing > Piercing > Default
        if (behaviors.some(b => b.getType() === 'chain')) return '#a855f7';
        if (behaviors.some(b => b.getType() === 'explosive')) return '#ff0080';
        if (behaviors.some(b => b.getType() === 'homing')) return '#ff00ff';
        if (behaviors.some(b => b.getType() === 'piercing')) return '#00ff88';

        return '#00ffff';
    }

    /**
     * Get body color based on behaviors - Synthwave themed
     */
    static getBodyColor(projectile) {
        if (projectile.isCrit) return '#ffff00'; // Bright yellow for crits

        if (!projectile.behaviorManager) return '#00ff88'; // Neon green default

        const behaviors = projectile.behaviorManager.behaviors;

        // Synthwave colors based on behaviors
        if (behaviors.some(b => b.getType() === 'chain')) return '#a855f7'; // Purple
        if (behaviors.some(b => b.getType() === 'explosive')) return '#ff0080'; // Hot pink
        if (behaviors.some(b => b.getType() === 'homing')) return '#ff00ff'; // Magenta
        if (behaviors.some(b => b.getType() === 'ricochet')) return '#00ffff'; // Cyan

        return '#00ff88'; // Neon green default
    }

    /**
     * Get glow color
     */
    static getGlowColor(projectile) {
        if (!projectile.behaviorManager) return null;

        const behaviors = projectile.behaviorManager.behaviors;

        if (behaviors.some(b => b.getType() === 'chain')) return '#6c5ce7';
        if (behaviors.some(b => b.getType() === 'explosive')) return '#ff6b35';
        if (behaviors.some(b => b.getType() === 'homing')) return '#e74c3c';

        return null;
    }
}

ProjectileRenderer._bodySpriteCache = new Map();
ProjectileRenderer._glowSpriteCache = new Map();
ProjectileRenderer._critGlowCache = new Map();

// 🍓 GPU Memory Optimization: Adaptive cache limits for Pi5 (256MB GPU memory)
// Default limits for desktop: ~5-10MB GPU memory
ProjectileRenderer._BODY_CACHE_LIMIT = 120;
ProjectileRenderer._GLOW_CACHE_LIMIT = 80;
ProjectileRenderer._CRIT_CACHE_LIMIT = 40;

// Apply Pi5 aggressive limits if detected (reduce GPU memory by 70%)
if (typeof window !== 'undefined' && window.isRaspberryPi) {
    ProjectileRenderer._BODY_CACHE_LIMIT = 30;  // 120 → 30 (75% reduction)
    ProjectileRenderer._GLOW_CACHE_LIMIT = 20;  // 80 → 20 (75% reduction)
    ProjectileRenderer._CRIT_CACHE_LIMIT = 10;  // 40 → 10 (75% reduction)
    console.log('🍓 ProjectileRenderer: Pi5 GPU memory limits applied (60 sprites total)');
}

/**
 * 🍓 GPU MEMORY: Clear sprite caches to free GPU memory
 * Call this when performance degrades or between game sessions
 */
ProjectileRenderer.clearSpriteCache = function() {
    const totalSprites = this._bodySpriteCache.size + this._glowSpriteCache.size + this._critGlowCache.size;
    this._bodySpriteCache.clear();
    this._glowSpriteCache.clear();
    this._critGlowCache.clear();
    console.log(`🧹 Cleared ${totalSprites} sprite caches (freed GPU memory)`);
};

/**
 * 🍓 GPU MEMORY: Reduce cache sizes dynamically during gameplay
 */
ProjectileRenderer.reduceCacheSizes = function(factor = 0.5) {
    const reduceCache = (cache, newLimit) => {
        while (cache.size > newLimit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey) cache.delete(oldestKey);
        }
    };
    
    reduceCache(this._bodySpriteCache, Math.floor(this._BODY_CACHE_LIMIT * factor));
    reduceCache(this._glowSpriteCache, Math.floor(this._GLOW_CACHE_LIMIT * factor));
    reduceCache(this._critGlowCache, Math.floor(this._CRIT_CACHE_LIMIT * factor));
    
    console.log(`🍓 Reduced sprite caches by ${(1-factor)*100}% to free GPU memory`);
};

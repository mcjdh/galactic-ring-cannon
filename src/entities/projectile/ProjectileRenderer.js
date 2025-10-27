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
        if (projectile.trail && projectile.trail.length > 1) {
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
     * Render projectile trail
     */
    static renderTrail(projectile, ctx) {
        if (projectile.trail.length < 2) return;

        ctx.strokeStyle = this.getTrailColor(projectile);
        ctx.lineWidth = projectile.radius * 0.5;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;

        ctx.beginPath();
        ctx.moveTo(projectile.trail[0].x, projectile.trail[0].y);

        for (let i = 1; i < projectile.trail.length; i++) {
            const alpha = i / projectile.trail.length;
            ctx.globalAlpha = alpha * 0.6;
            ctx.lineTo(projectile.trail[i].x, projectile.trail[i].y);
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
        let r = 255;
        let g = 255;
        let b = 255;
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else if (hex.length >= 6) {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            }
        }
        const parsed = { r, g, b };
        cache.set(color, parsed);
        return parsed;
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
ProjectileRenderer._BODY_CACHE_LIMIT = 120;
ProjectileRenderer._GLOW_CACHE_LIMIT = 80;
ProjectileRenderer._CRIT_CACHE_LIMIT = 40;

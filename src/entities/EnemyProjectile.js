// Cache sprite rendering to trade RAM for fewer draw commands per frame.
const ProjectileSpriteCache = (() => {
    class Cache {
        constructor() {
            this.cache = new Map();
        }

        _createCanvas(size) {
            if (typeof OffscreenCanvas !== 'undefined') {
                return new OffscreenCanvas(size, size);
            }
            if (typeof document !== 'undefined') {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                return canvas;
            }
            return null;
        }

        _createSprite(color, radius, glowColor) {
            const padding = glowColor ? Math.max(6, radius * 0.8) : 4;
            const size = Math.ceil((radius + padding) * 2);
            const canvas = this._createCanvas(size);
            if (!canvas) return null;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            const center = size / 2;

            if (glowColor) {
                const gradient = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius + padding);
                gradient.addColorStop(0, `${glowColor}`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(center, center, radius + padding, 0, Math.PI * 2);
                ctx.fill();
            }

            // Polybius Style: Diamond Projectile
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(center, center - radius);
            ctx.lineTo(center + radius, center);
            ctx.lineTo(center, center + radius);
            ctx.lineTo(center - radius, center);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Bright Core
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.rect(center - 2, center - 2, 4, 4);
            ctx.fill();

            const drawable = (typeof canvas.transferToImageBitmap === 'function')
                ? canvas.transferToImageBitmap()
                : canvas;

            return {
                image: drawable,
                halfSize: size / 2,
                key: `${color}|${radius}|${glowColor || ''}`
            };
        }

        getSprite(color, radius, glowColor) {
            const key = `${color}|${radius}|${glowColor || ''}`;
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }
            const sprite = this._createSprite(color, radius, glowColor);
            if (sprite) {
                this.cache.set(key, sprite);
            }
            return sprite;
        }

        draw(ctx, projectile, lowQuality = false) {
            const glowColor = lowQuality ? null : projectile.glowColor;
            const sprite = this.getSprite(projectile.color, projectile.radius, glowColor);
            if (!sprite) return false;
            ctx.drawImage(
                sprite.image,
                projectile.x - sprite.halfSize,
                projectile.y - sprite.halfSize
            );
            return true;
        }
    }

    return new Cache();
})();

/**
 * Enemy Projectile - Handles projectiles fired by enemies
 * Extracted from enemy.js for better organization
 */
class EnemyProjectile {
    constructor(x, y, vx, vy, damage = 20) {
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for collision tracking
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = 'enemyProjectile';
        this.radius = 5;
        this.damage = damage;
        this.isDead = false;
        this.lifetime = 3; // seconds before projectile expires
        this.timer = 0;
        
        // Visual properties
        this.color = '#9b59b6';
        this.trailLength = 0.02; // Trail length multiplier
        // Default glow color to prevent undefined access in renderGlow
        this.glowColor = 'rgba(155, 89, 182, 0.45)';
    }
    
    /**
     * Update projectile position and check collisions
     * @param {number} deltaTime - Time since last update
     * @param {Game} game - Game instance
     */
    update(deltaTime, game) {
        // Move projectile
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Update lifetime
        this.timer += deltaTime;
        if (this.timer >= this.lifetime) {
            this.isDead = true;
            return;
        }
        
        // Collision with player is handled centrally by the CollisionSystem/GameEngine
        
        // Check if projectile is off-screen (performance optimization)
        this.checkBounds(game);
    }
    
    /**
     * Check collision with player
     * @param {Game} game - Game instance
     */
    // Deprecated: Collision handled centrally
    checkPlayerCollision(game) { /* no-op */ }
    
    /**
     * Check if projectile is outside reasonable bounds (camera-aware)
     */
    checkBounds(game) {
        // Remove projectiles that are too far from camera viewport
        if (game?.player && game?.canvas) {
            const maxDistance = 2000; // pixels from camera center
            const player = game.player;
            const distanceFromCamera = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);

            if (distanceFromCamera > maxDistance) {
                this.isDead = true;
            }
        }
    }
    
    /**
     * Render projectile with trail effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        ctx.save();
        
        const lowQuality = window.gameManager?.lowQuality;

        // Draw trail effect
        this.renderTrail(ctx);
        
        // Draw cached sprite (fallback to manual draw if cache unavailable)
        const drewSprite = ProjectileSpriteCache.draw(ctx, this, lowQuality);
        if (!drewSprite) {
            this.renderBody(ctx);
            if (!lowQuality) {
                this.renderGlow(ctx);
            }
        }
        
        ctx.restore();
    }

    /**
     * Batched render path used by the game engine for performance-sensitive frames
     */
    static renderBatch(projectiles, ctx) {
        if (!projectiles || projectiles.length === 0) return;

        const originalFill = ctx.fillStyle;
        const originalStroke = ctx.strokeStyle;
        const originalLineWidth = ctx.lineWidth;
        const originalLineCap = ctx.lineCap;
        const originalAlpha = ctx.globalAlpha;

        const trailBatches = this._batchTrailBatches || (this._batchTrailBatches = new Map());
        const spriteBatches = this._spriteBatches || (this._spriteBatches = new Map());
        const fallbackBatch = this._fallbackSpriteBatch || (this._fallbackSpriteBatch = []);

        trailBatches.clear();
        spriteBatches.clear();
        fallbackBatch.length = 0;

        const lowQuality = window.gameManager?.lowQuality;

        for (let i = 0; i < projectiles.length; i++) {
            const projectile = projectiles[i];
            if (!projectile || projectile.isDead) continue;

            const trailKey = `${projectile.color}|${(projectile.radius * 1.5).toFixed(3)}|${projectile.trailLength}`;
            let trailBatch = trailBatches.get(trailKey);
            if (!trailBatch) {
                trailBatch = [];
                trailBatches.set(trailKey, trailBatch);
            }
            trailBatch.push(projectile);

            const sprite = ProjectileSpriteCache.getSprite(
                projectile.color,
                projectile.radius,
                lowQuality ? null : projectile.glowColor
            );

            if (!sprite) {
                fallbackBatch.push(projectile);
                continue;
            }

            let spriteBatch = spriteBatches.get(sprite);
            if (!spriteBatch) {
                spriteBatch = [];
                spriteBatches.set(sprite, spriteBatch);
            }
            spriteBatch.push(projectile);
        }

        for (const [key, batch] of trailBatches) {
            const [color, lineWidthStr, trailLengthStr] = key.split('|');
            const lineWidth = parseFloat(lineWidthStr);
            const trailLength = parseFloat(trailLengthStr);

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();

            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                const trailX = projectile.x - projectile.vx * trailLength;
                const trailY = projectile.y - projectile.vy * trailLength;
                ctx.moveTo(projectile.x, projectile.y);
                ctx.lineTo(trailX, trailY);
            }

            ctx.stroke();
            batch.length = 0;
        }
        trailBatches.clear();

        ctx.lineCap = originalLineCap;
        ctx.lineWidth = originalLineWidth;
        ctx.strokeStyle = originalStroke;
        ctx.globalAlpha = originalAlpha;

        for (const [sprite, batch] of spriteBatches) {
            const half = sprite.halfSize;
            for (let i = 0; i < batch.length; i++) {
                const projectile = batch[i];
                ctx.drawImage(sprite.image, projectile.x - half, projectile.y - half);
            }
            batch.length = 0;
        }
        spriteBatches.clear();

        if (fallbackBatch.length) {
            for (let i = 0; i < fallbackBatch.length; i++) {
                const projectile = fallbackBatch[i];
                if (!projectile || projectile.isDead) continue;
                projectile.renderBody(ctx);
                if (!lowQuality) {
                    projectile.renderGlow(ctx);
                }
            }
            fallbackBatch.length = 0;
        }

        ctx.fillStyle = originalFill;
        ctx.strokeStyle = originalStroke;
        ctx.lineWidth = originalLineWidth;
        ctx.lineCap = originalLineCap;
        ctx.globalAlpha = originalAlpha;
    }
    
    /**
     * Render projectile trail
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderTrail(ctx) {
        const trailX = this.x - this.vx * this.trailLength;
        const trailY = this.y - this.vy * this.trailLength;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(trailX, trailY);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    
    /**
     * Render main projectile body
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderBody(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Add inner highlight
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
    }
    
    /**
     * Render glow effect around projectile
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderGlow(ctx) {
        if (!this.glowColor) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = EnemyProjectile._colorWithAlpha(this.glowColor, 0.35);
        ctx.fill();
    }
    
    /**
     * Get projectile data for debugging
     * @returns {Object} Projectile state
     */
    getDebugInfo() {
        return {
            position: { x: this.x, y: this.y },
            velocity: { x: this.vx, y: this.vy },
            damage: this.damage,
            lifetime: this.lifetime,
            timer: this.timer,
            isDead: this.isDead
        };
    }
    
    /**
     * Create explosion effect when projectile is destroyed
     * @param {ParticleManager} particleManager - Particle system
     */
    explode(particleManager) {
        if (particleManager) {
            particleManager.createExplosion(this.x, this.y, 15, this.color);
        }
        this.isDead = true;
    }
    
    /**
     * Set custom visual properties
     * @param {Object} props - Visual properties
     */
    setVisualProperties(props) {
        if (props.color) this.color = props.color;
        if (props.glowColor) this.glowColor = props.glowColor;
        if (props.radius) this.radius = props.radius;
        if (props.trailLength) this.trailLength = props.trailLength;
    }
    
    /**
     * Static method to create projectile from enemy towards target
     * @param {Enemy} enemy - Source enemy
     * @param {Player} target - Target player
     * @param {number} speed - Projectile speed
     * @param {number} damage - Projectile damage
     * @returns {EnemyProjectile} New projectile
     */
    static createTargeted(enemy, target, speed = 200, damage = 20) {
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            // Avoid division by zero
            return new EnemyProjectile(enemy.x, enemy.y, speed, 0, damage);
        }
        
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;
        
        return new EnemyProjectile(enemy.x, enemy.y, vx, vy, damage);
    }
    
    /**
     * Static method to create projectile with specific angle
     * @param {number} x - Start X position
     * @param {number} y - Start Y position
     * @param {number} angle - Angle in radians
     * @param {number} speed - Projectile speed
     * @param {number} damage - Projectile damage
     * @returns {EnemyProjectile} New projectile
     */
    static createAngled(x, y, angle, speed = 200, damage = 20) {
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        return new EnemyProjectile(x, y, vx, vy, damage);
    }
    
    /**
     * Static method to create spread of projectiles
     * @param {number} x - Start X position
     * @param {number} y - Start Y position
     * @param {number} centerAngle - Center angle in radians
     * @param {number} spread - Spread angle in radians
     * @param {number} count - Number of projectiles
     * @param {number} speed - Projectile speed
     * @param {number} damage - Projectile damage
     * @returns {EnemyProjectile[]} Array of projectiles
     */
    static createSpread(x, y, centerAngle, spread, count, speed = 200, damage = 20) {
        const projectiles = [];
        const angleStep = spread / (count - 1);
        const startAngle = centerAngle - spread / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = startAngle + angleStep * i;
            projectiles.push(EnemyProjectile.createAngled(x, y, angle, speed, damage));
        }
        
        return projectiles;
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.EnemyProjectile = EnemyProjectile;
}

EnemyProjectile._alphaColorCache = new Map();
EnemyProjectile._parsedColorCache = new Map();

EnemyProjectile._colorWithAlpha = function(color, alpha) {
    const key = `${color}|${alpha}`;
    const cache = EnemyProjectile._alphaColorCache;
    if (cache.has(key)) {
        return cache.get(key);
    }
    const parsed = EnemyProjectile._parseColor(color);
    const value = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
    cache.set(key, value);
    return value;
};

EnemyProjectile._parseColor = function(color) {
    const cache = EnemyProjectile._parsedColorCache;
    if (cache.has(color)) {
        return cache.get(color);
    }
    const parsed = EnemyProjectile._extractRGBComponents(color);
    cache.set(color, parsed);
    return parsed;
};

EnemyProjectile._extractRGBComponents = function(color) {
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
};

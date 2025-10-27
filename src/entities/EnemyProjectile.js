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
        
        // Draw trail effect
        this.renderTrail(ctx);
        
        // Draw main projectile body
        this.renderBody(ctx);
        
        // Draw glow effect (if not in low quality mode)
        if (!window.gameManager?.lowQuality) {
            this.renderGlow(ctx);
        }
        
        ctx.restore();
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

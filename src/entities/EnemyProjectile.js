/**
 * Enemy Projectile - Handles projectiles fired by enemies
 * Extracted from enemy.js for better organization
 */
class EnemyProjectile {
    constructor(x, y, vx, vy, damage = 20) {
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
        this.checkBounds();
    }
    
    /**
     * Check collision with player
     * @param {Game} game - Game instance
     */
    // Deprecated: Collision handled centrally
    checkPlayerCollision(game) { /* no-op */ }
    
    /**
     * Check if projectile is outside reasonable bounds
     */
    checkBounds() {
        // Remove projectiles that are way off screen
        const maxDistance = 2000;
        if (Math.abs(this.x) > maxDistance || Math.abs(this.y) > maxDistance) {
            this.isDead = true;
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
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 3
        );
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(155, 89, 182, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
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

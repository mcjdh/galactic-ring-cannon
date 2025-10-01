class Particle {
    constructor(x, y, vx, vy, size, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;
        this.isDead = false;
        this.type = 'particle';
        
        // Physics
        this.gravity = 0;
        this.friction = 0.95;
        
        // Visual effects
        this.alpha = 1.0;
        this.startSize = size;
    }
    
    update(deltaTime) {
        // Update age
        this.age += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.isDead = true;
            return;
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Kill particles that are too far from camera viewport to prevent memory bloat
        const gameRef = window.game || window.gameEngine;
        if (gameRef?.player && gameRef?.canvas) {
            const maxDistance = 2000; // pixels from camera center
            const player = gameRef.player;
            const distanceFromCamera = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);

            if (distanceFromCamera > maxDistance) {
                this.isDead = true;
                return;
            }
        }
        
        // Apply gravity
        if (this.gravity !== 0) {
            this.vy += this.gravity * deltaTime;
        }
        
        // Apply friction
        if (this.friction !== 1) {
            this.vx *= this.friction;
            this.vy *= this.friction;
        }
        
        // Fade out over lifetime
        const ageRatio = this.age / this.lifetime;
        this.alpha = 1 - ageRatio;
        
        // Shrink over time
        this.size = this.startSize * (1 - ageRatio * 0.5);
    }
    
    render(ctx) {
        if (this.isDead || this.alpha <= 0 || this.size <= 0.1) return;
        
        // Use simplified rendering for small particles
        if (this.size < 2) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            return;
        }
        
        // Full circle rendering for larger particles
        const previousAlpha = ctx.globalAlpha;
        ctx.globalAlpha = this.alpha;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.globalAlpha = previousAlpha;
    }
}

// Export to window.Game namespace (preferred) and window (legacy fallback)
if (typeof window !== 'undefined') {
    // Namespace export (preferred)
    if (!window.Game) window.Game = {};
    window.Game.Particle = Particle;

    // Legacy export (will be deprecated)
    window.Particle = Particle;
}

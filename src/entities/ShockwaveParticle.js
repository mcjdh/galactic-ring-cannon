// Prevent duplicate declaration errors
if (typeof ShockwaveParticle === 'undefined') {
    class ShockwaveParticle extends Particle {
        constructor(x, y, maxRadius, color, lifetime) {
            super(x, y, 0, 0, 0, color, lifetime);
            this.maxRadius = maxRadius;
            this.currentRadius = 0;
            this.type = 'shockwave';
        }
        
        update(deltaTime) {
            super.update(deltaTime);
            
            // Expand the shockwave
            const progress = this.age / this.lifetime;
            this.currentRadius = this.maxRadius * progress;
        }
        
        render(ctx) {
            if (this.isDead) return;
            
            ctx.save();
            ctx.globalAlpha = this.alpha * 0.5; // Semi-transparent
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Make globally available
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.ShockwaveParticle = ShockwaveParticle;
        window.ShockwaveParticle = ShockwaveParticle;
    }
}

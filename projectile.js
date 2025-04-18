class Projectile {
    constructor(x, y, vx, vy, damage, piercing = 0, isCrit = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.piercing = piercing;
        this.isCrit = isCrit;
        this.radius = 5;
        this.active = true;
        this.trail = [];
        this.maxTrailLength = 10;
    }

    update(deltaTime) {
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Update trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Handle chain lightning
        if (this.chainLightning && this.chainLightning.chainsUsed < this.chainLightning.maxChains) {
            // Chain lightning logic here
        }

        // Handle explosive shots
        if (this.explosive && !this.explosive.exploded) {
            // Explosion logic here
        }

        // Handle ricochet
        if (this.ricochet && this.ricochet.bounced < this.ricochet.bounces) {
            // Ricochet logic here
        }
    }

    render(ctx) {
        // Draw trail
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw projectile
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Set color based on type
        if (this.isCrit) {
            ctx.fillStyle = '#ff4444';
        } else if (this.chainLightning) {
            ctx.fillStyle = '#3498db';
        } else if (this.explosive) {
            ctx.fillStyle = '#ff8800';
        } else if (this.ricochet) {
            ctx.fillStyle = '#44ff44';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        
        ctx.fill();

        // Add glow effect
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
    }

    // Helper method to check if projectile is off screen
    isOffScreen(canvas) {
        return this.x < -this.radius || 
               this.x > canvas.width + this.radius || 
               this.y < -this.radius || 
               this.y > canvas.height + this.radius;
    }
} 
class DamageZone {
    constructor(x, y, radius, damage, duration) {
        this.x = x;
        this.y = y;
        this.type = 'damageZone';
        this.radius = radius;
        this.damage = damage;
        this.damagePerSecond = damage; // Apply damage per second
        this.duration = duration;
        this.timer = 0;
        this.isDead = false;
        this.color = '#e74c3c';
        
        // Animation properties
        this.pulseRate = 1.5; // Pulses per second
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase
        this.tickTimer = 0; // Timer for damage ticks
        this.tickInterval = 0.5; // Apply damage every half second
    }
    
    update(deltaTime, game) {
        // Update timers
        this.timer += deltaTime;
        this.tickTimer += deltaTime;
        
        // Check if damage zone should expire
        if (this.timer >= this.duration) {
            this.isDead = true;
            return;
        }
        
        // Apply damage to player at intervals
        if (game.player && this.tickTimer >= this.tickInterval) {
            this.tickTimer = 0;
            
            // Check if player is in the zone
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Apply damage if player is in range
            if (distance < this.radius + game.player.radius) {
                // Apply damage proportional to time slice
                const tickDamage = this.damagePerSecond * this.tickInterval;
                game.player.takeDamage(tickDamage);
                
                // Create visual effect
                if (gameManager && gameManager.createHitEffect) {
                    gameManager.createHitEffect(
                        game.player.x, 
                        game.player.y, 
                        tickDamage
                    );
                }
            }
        }
        
        // Create particles occasionally
        if (Math.random() < deltaTime * 5) {
            this.createParticle();
        }
    }
    
    createParticle() {
        // Only create particle if gameManager exists and visuals are allowed
        if (!gameManager || !gameManager.particles || gameManager.lowQuality) return;
        
        // Random position within the zone
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.radius * 0.8;
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;
        
        // Create rising particle (pool-first)
        if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
            window.optimizedParticles.spawnParticle({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: -30 - Math.random() * 20,
                size: 2 + Math.random() * 3,
                color: this.color,
                life: 0.5 + Math.random() * 0.5,
                type: 'smoke'
            });
        } else if (gameManager.addParticleViaEffectsManager) {
            const particle = new Particle(
                x, y,
                (Math.random() - 0.5) * 10,
                -30 - Math.random() * 20,
                2 + Math.random() * 3,
                this.color,
                0.5 + Math.random() * 0.5
            );
            gameManager.addParticleViaEffectsManager(particle);
        }
    }
    
    render(ctx) {
        // Calculate pulse factor
        const pulseFactor = 1 + 0.2 * Math.sin(this.pulseRate * this.timer * Math.PI * 2 + this.pulsePhase);
        
        // Draw outer glow
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * pulseFactor
        );
        
        // Fade out towards the end of duration
        const alpha = this.timer > (this.duration * 0.7) ? 
            0.6 * (1 - (this.timer - this.duration * 0.7) / (this.duration * 0.3)) : 
            0.6;
        
        gradient.addColorStop(0, `rgba(231, 76, 60, 0)`);
        gradient.addColorStop(0.7, `rgba(231, 76, 60, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(231, 76, 60, 0)`);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw border
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.95 * pulseFactor, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(231, 76, 60, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw warning pattern (concentric circles)
        for (let i = 0; i < 3; i++) {
            const radiusFactor = 0.3 + (i * 0.25);
            ctx.beginPath();
            ctx.arc(
                this.x, 
                this.y, 
                this.radius * radiusFactor * pulseFactor, 
                0, 
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(231, 76, 60, ${alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw danger symbol in center
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.timer * Math.PI);
        
        // Exclamation mark
        ctx.beginPath();
        ctx.rect(-3, -15, 6, 20);
        ctx.arc(0, 10, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        
        ctx.restore();
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.DamageZone = DamageZone;
}

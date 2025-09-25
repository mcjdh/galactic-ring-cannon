// Optimized particle pool system for better performance
class OptimizedParticlePool {
    constructor(initialSize = 100) {
        this.pool = [];
        this.activeParticles = [];
        this.maxParticles = 200;
        this.poolSize = initialSize;
        
        // Pre-allocate particle objects to avoid GC pressure
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createParticleObject());
        }
        
        // Batching for rendering optimization
        this.batchedParticles = new Map(); // Group by type/color for batched rendering
        this.batchSize = 50;
        
        // Performance tracking
        this.lastCleanupTime = 0;
        this.cleanupInterval = 1000; // Clean up dead particles every second
    }
    
    createParticleObject() {
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            size: 1,
            color: '#ffffff',
            alpha: 1,
            life: 1,
            maxLife: 1,
            type: 'basic',
            active: false,
            // Pre-allocated for physics
            friction: 0.95,
            gravity: 0,
            // Rendering optimization
            batchKey: 'basic_white',
            lastUpdateTime: 0
        };
    }
    
    getParticle() {
        // Try to reuse from pool first
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        
        // Create new if pool is empty and under limit
        if (this.activeParticles.length < this.maxParticles) {
            return this.createParticleObject();
        }
        
        // Reuse oldest active particle as last resort
        return this.recycleOldestParticle();
    }
    
    recycleOldestParticle() {
        if (this.activeParticles.length === 0) {
            return this.createParticleObject();
        }
        
        // Find and recycle the oldest particle
        let oldestIndex = 0;
        let oldestTime = this.activeParticles[0].lastUpdateTime;
        
        for (let i = 1; i < this.activeParticles.length; i++) {
            if (this.activeParticles[i].lastUpdateTime < oldestTime) {
                oldestTime = this.activeParticles[i].lastUpdateTime;
                oldestIndex = i;
            }
        }
        
        const recycled = this.activeParticles[oldestIndex];
        this.activeParticles.splice(oldestIndex, 1);
        return recycled;
    }
    
    spawnParticle(config) {
        const particle = this.getParticle();
        
        // Configure particle
        particle.x = config.x || 0;
        particle.y = config.y || 0;
        particle.vx = config.vx || 0;
        particle.vy = config.vy || 0;
        particle.size = config.size || 2;
        particle.color = config.color || '#ffffff';
        particle.alpha = config.alpha || 1;
        particle.life = config.life || 1;
        particle.maxLife = config.life || 1;
        particle.type = config.type || 'basic';
        particle.friction = config.friction || 0.95;
        particle.gravity = config.gravity || 0;
        particle.active = true;
        particle.lastUpdateTime = performance.now();
        
        // Create batch key for rendering optimization
        particle.batchKey = `${particle.type}_${particle.color}`;
        
        this.activeParticles.push(particle);
        return particle;
    }
    
    update(deltaTime) {
        const currentTime = performance.now();
        
        // Clear batched particles for this frame
        this.batchedParticles.clear();
        
        // Update active particles in reverse order for safe removal
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            
            if (!this.updateParticle(particle, deltaTime)) {
                // Particle is dead, return to pool
                particle.active = false;
                this.pool.push(particle);
                this.activeParticles.splice(i, 1);
            } else {
                // Add to batch for rendering
                this.addToBatch(particle);
                particle.lastUpdateTime = currentTime;
            }
        }
        
        // Periodic cleanup to prevent pool from growing too large
        if (currentTime - this.lastCleanupTime > this.cleanupInterval) {
            this.cleanupPool();
            this.lastCleanupTime = currentTime;
        }
    }
    
    updateParticle(particle, deltaTime) {
        // Update physics
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        
        // Apply friction
        particle.vx *= particle.friction;
        particle.vy *= particle.friction;
        
        // Apply gravity
        particle.vy += particle.gravity * deltaTime;
        
        // Update life
        particle.life -= deltaTime;
        particle.alpha = particle.life / particle.maxLife;
        
        // Check if particle should die
        return particle.life > 0 && particle.alpha > 0.01;
    }
    
    addToBatch(particle) {
        const key = particle.batchKey;
        
        if (!this.batchedParticles.has(key)) {
            this.batchedParticles.set(key, []);
        }
        
        const batch = this.batchedParticles.get(key);
        if (batch.length < this.batchSize) {
            batch.push(particle);
        }
    }
    
    render(ctx) {
        // Render particles in batches for better performance
        for (const [batchKey, particles] of this.batchedParticles) {
            if (particles.length === 0) continue;
            
            this.renderBatch(ctx, particles, batchKey);
        }
    }
    
    renderBatch(ctx, particles, batchKey) {
        const [type, color] = batchKey.split('_');
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        
        switch (type) {
            case 'basic':
                this.renderBasicBatch(ctx, particles);
                break;
            case 'spark':
                this.renderSparkBatch(ctx, particles);
                break;
            case 'smoke':
                this.renderSmokeBatch(ctx, particles);
                break;
            default:
                this.renderBasicBatch(ctx, particles);
        }
        
        ctx.restore();
    }
    
    renderBasicBatch(ctx, particles) {
        for (const particle of particles) {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    renderSparkBatch(ctx, particles) {
        ctx.lineWidth = 1;
        for (const particle of particles) {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x - particle.vx * 0.05, particle.y - particle.vy * 0.05);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    renderSmokeBatch(ctx, particles) {
        for (const particle of particles) {
            ctx.save();
            ctx.globalAlpha = particle.alpha * 0.3;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    cleanupPool() {
        // Keep pool size reasonable to avoid memory bloat
        const maxPoolSize = Math.max(this.poolSize, this.activeParticles.length);

        while (this.pool.length > maxPoolSize) {
            this.pool.pop();
        }
    }

    // Performance-aware cleanup method for external calls
    cleanup() {
        // Reduce particle count if performance is struggling
        const performanceMode = window.gameManager?.lowPerformanceMode || false;

        if (performanceMode) {
            // Aggressively reduce particles in low performance mode
            const maxAllowed = Math.floor(this.maxParticles * 0.3); // Only 30% in performance mode

            while (this.activeParticles.length > maxAllowed) {
                const particle = this.activeParticles.pop();
                particle.active = false;
                this.pool.push(particle);
            }

            // Also reduce maximum to prevent future overload
            this.maxParticles = Math.min(this.maxParticles, 80);
        }

        // Clean up batches
        this.batchedParticles.clear();

        // Run standard pool cleanup
        this.cleanupPool();
    }
    
    // Spawn common particle types with optimized settings
    spawnHitEffect(x, y, intensity = 1) {
        const count = Math.min(8, Math.ceil(intensity * 5));
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 50 + Math.random() * 100 * intensity;
            
            this.spawnParticle({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3 * intensity,
                color: intensity > 0.8 ? '#ff6b6b' : '#ffa726',
                life: 0.3 + Math.random() * 0.4,
                type: 'spark',
                friction: 0.9
            });
        }
    }
    
    spawnTrailEffect(x, y, vx, vy) {
        this.spawnParticle({
            x: x + (Math.random() - 0.5) * 5,
            y: y + (Math.random() - 0.5) * 5,
            vx: vx * 0.3 + (Math.random() - 0.5) * 20,
            vy: vy * 0.3 + (Math.random() - 0.5) * 20,
            size: 1 + Math.random() * 2,
            color: '#4ecdc4',
            life: 0.5 + Math.random() * 0.3,
            type: 'basic',
            friction: 0.95
        });
    }
    
    // Get performance stats
    getStats() {
        return {
            activeParticles: this.activeParticles.length,
            poolSize: this.pool.length,
            batches: this.batchedParticles.size,
            memoryEfficiency: (this.pool.length / (this.activeParticles.length + this.pool.length)).toFixed(2)
        };
    }
    
    // Clear all particles (for performance mode switches)
    clear() {
        while (this.activeParticles.length > 0) {
            const particle = this.activeParticles.pop();
            particle.active = false;
            this.pool.push(particle);
        }
        this.batchedParticles.clear();
    }
}

// Create global optimized particle system
window.optimizedParticles = new OptimizedParticlePool();

// Provide a ParticleManager-compatible adapter so legacy calls work
if (!window.ParticleManager) {
    class ParticleManagerAdapter {
        constructor() {
            this.pool = window.optimizedParticles;
        }
        setPerformanceSettings(opts) {
            if (!opts) return;
            if (typeof opts.maxParticles === 'number') {
                this.pool.maxParticles = opts.maxParticles;
            }
        }
        tryAddParticle(particle) {
            this.pool.spawnParticle({
                x: particle.x,
                y: particle.y,
                vx: particle.vx || 0,
                vy: particle.vy || 0,
                size: particle.size || 2,
                color: particle.color || '#ffffff',
                life: particle.lifetime || particle.life || 0.5,
                type: particle.type || 'basic'
            });
            return true;
        }
        createExplosion(x, y, radius, color) {
            const count = Math.min(20, Math.floor((radius || 60) / 3));
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const speed = 50 + Math.random() * 100;
                this.pool.spawnParticle({
                    x: x + (Math.random() - 0.5) * 10,
                    y: y + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    color: color || '#ff6b35',
                    life: 0.5 + Math.random() * 0.5,
                    type: 'spark'
                });
            }
        }
        createHitEffect(x, y, intensity = 1) { this.pool.spawnHitEffect(x, y, intensity); }
        createLevelUpEffect(x, y) {
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const speed = 60 + Math.random() * 80;
                this.pool.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: '#f39c12',
                    life: 1 + Math.random() * 0.5,
                    type: 'spark'
                });
            }
        }
        update(dt) { this.pool.update(dt); }
        render(ctx) { this.pool.render(ctx); }
        clear() { this.pool.clear(); }
    }
    window.ParticleManager = ParticleManagerAdapter;
}
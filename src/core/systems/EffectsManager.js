/**
 * 🌊 UNIFIED EFFECTS MANAGER - Resonant Multi-Agent Architecture
 * 🤖 RESONANT NOTE: Extracted from massive GameManager.js (2,400+ lines)
 * Handles all visual effects, particles, screen shake, and floating text
 * 
 * Single responsibility: Coordinate all visual feedback and effects
 * Integrates with OptimizedParticlePool and other effect systems
 */
const EFFECTS_GC = (typeof window !== 'undefined' && window.GAME_CONSTANTS)
    ? window.GAME_CONSTANTS
    : { PARTICLES: { MAX_PARTICLES_NORMAL: 150 } };

class EffectsManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Screen shake system
        this.screenShakeAmount = 0;
        this.screenShakeDuration = 0;
        this.screenShakeTimer = 0;
        
        // Floating text system
        this.floatingText = null;
        this.initializeFloatingText();
        
        // Particle management
        this.particleManager = null;
        this.particles = []; // Fallback array
        this.maxParticles = EFFECTS_GC.PARTICLES && EFFECTS_GC.PARTICLES.MAX_PARTICLES_NORMAL
            ? EFFECTS_GC.PARTICLES.MAX_PARTICLES_NORMAL
            : 150;
        this.particleReductionFactor = 1.0;
        
        // Effect pools for performance
        this.effectPools = {
            hitEffects: [],
            explosions: [],
            levelUpEffects: [],
            trailEffects: []
        };
        
        // Performance settings
        this.lowQuality = false;
        this.effectsEnabled = true;

        // Temp lightning arcs for quick visual flashes
        this.activeLightningArcs = [];
        
        // Initialize particle system
        this.initializeParticleSystem();
    }
    
    /**
     * Initialize floating text system
     */
    initializeFloatingText() {
        if (window.FloatingTextSystem) {
            this.floatingText = new window.FloatingTextSystem();
        }
    }
    
    /**
     * Initialize particle system
     */
    initializeParticleSystem() {
        // Use OptimizedParticlePool as primary system
        if (window.optimizedParticles) {
            this.particleManager = window.optimizedParticles;
        } else if (window.ParticleManager) {
            // Use global adapter instead of creating a new instance if available
            this.particleManager = (typeof window.ParticleManager === 'function' && window.ParticleManager.prototype && window.ParticleManager.prototype.update)
                ? new window.ParticleManager()
                : window.ParticleManager;
        } else {
            this.particleManager = null;
            (window.logger && window.logger.warn ? window.logger.warn('No particle system available, using fallback') : console.warn('No particle system available, using fallback'));
        }
    }
    
    /**
     * Main effects update loop
     */
    update(deltaTime) {
        // Update screen shake
        this.updateScreenShake(deltaTime);
        
        // Update floating text
        this.updateFloatingText(deltaTime);
        
        // Update particle systems
        this.updateParticles(deltaTime);
        
        // Update performance settings
        this.updatePerformanceSettings();

        // Fade temporary lightning arcs
        if (this.activeLightningArcs.length > 0) {
            for (let i = this.activeLightningArcs.length - 1; i >= 0; i--) {
                const arc = this.activeLightningArcs[i];
                arc.timeRemaining -= deltaTime;
                if (arc.timeRemaining <= 0) {
                    this.activeLightningArcs.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Update screen shake effect
     */
    updateScreenShake(deltaTime) {
        if (this.screenShakeTimer > 0) {
            this.screenShakeTimer -= deltaTime;
            
            if (this.screenShakeTimer <= 0) {
                this.screenShakeAmount = 0;
                this.screenShakeTimer = 0;
            } else {
                // Decay shake amount over time
                const shakePercent = this.screenShakeTimer / this.screenShakeDuration;
                this.screenShakeAmount = this.screenShakeAmount * shakePercent;
            }
        }
    }
    
    /**
     * Update floating text system
     */
    updateFloatingText(deltaTime) {
        if (this.floatingText && typeof this.floatingText.update === 'function') {
            this.floatingText.update(deltaTime);
        }
    }
    
    /**
     * Update particle systems
     */
    updateParticles(deltaTime) {
        // Update primary particle system
        if (this.particleManager && typeof this.particleManager.update === 'function') {
            this.particleManager.setPerformanceSettings({
                lowQuality: this.lowQuality,
                maxParticles: this.maxParticles,
                particleReductionFactor: this.particleReductionFactor
            });
            this.particleManager.update(deltaTime);
            return;
        }
        
        // Fallback particle management
        this.updateFallbackParticles(deltaTime);
    }
    
    /**
     * Update fallback particle system
     */
    updateFallbackParticles(deltaTime) {
        if (!this.particles || this.particles.length === 0) return;
        
        // Enforce particle limit
        if (this.particles.length > this.maxParticles) {
            this.particles.splice(0, this.particles.length - this.maxParticles);
        }
        
        // Update and remove dead particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle) {
                this.particles.splice(i, 1);
                continue;
            }
            
            if (typeof particle.update === 'function') {
                particle.update(deltaTime);
            }
            
            if (particle.isDead || particle.lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Update performance settings based on current mode
     */
    updatePerformanceSettings() {
        const performanceMode = window.performanceManager?.performanceMode || 'normal';
        
        switch (performanceMode) {
            case 'low':
                this.particleReductionFactor = 0.5;
                this.maxParticles = Math.floor((EFFECTS_GC.PARTICLES?.MAX_PARTICLES_NORMAL || 150) * 0.7);
                break;
            case 'critical':
                this.particleReductionFactor = 0.2;
                this.maxParticles = Math.floor((EFFECTS_GC.PARTICLES?.MAX_PARTICLES_NORMAL || 150) * 0.3);
                this.effectsEnabled = false;
                break;
            default:
                this.particleReductionFactor = 1.0;
                this.maxParticles = (EFFECTS_GC.PARTICLES?.MAX_PARTICLES_NORMAL || 150);
                this.effectsEnabled = true;
        }
    }
    
    /**
     * Add screen shake effect
     */
    addScreenShake(amount, duration) {
        if (!this.effectsEnabled) return;
        
        this.screenShakeAmount = Math.max(this.screenShakeAmount, amount);
        this.screenShakeDuration = duration;
        this.screenShakeTimer = duration;
    }
    
    /**
     * Get current screen shake offset
     */
    getScreenShakeOffset() {
        if (this.screenShakeAmount <= 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: (Math.random() - 0.5) * this.screenShakeAmount * 2,
            y: (Math.random() - 0.5) * this.screenShakeAmount * 2
        };
    }
    
    /**
     * Show floating text
     */
    showFloatingText(text, x, y, color = 'white', size = 16) {
        if (!this.effectsEnabled) return;
        
        if (this.floatingText && typeof this.floatingText.spawn === 'function') {
            this.floatingText.spawn({ text, color, size, x, y });
        }
    }
    
    /**
     * Show combat text with special effects
     */
    showCombatText(text, x, y, effect = 'normal', size = 16) {
        if (!this.effectsEnabled) return;
        
        const colors = {
            normal: '#ffffff',
            damage: '#e74c3c',
            heal: '#2ecc71',
            xp: '#f1c40f',
            combo: '#9b59b6',
            critical: '#e67e22',
            ricochet: '#3498db'
        };
        
        const color = colors[effect] || colors.normal;
        
        if (this.floatingText && typeof this.floatingText.spawn === 'function') {
            this.floatingText.spawn({ 
                text, 
                color, 
                size, 
                x, 
                y, 
                effect: effect !== 'normal' ? effect : undefined 
            });
        }
    }
    
    /**
     * Create hit effect particles
     */
    createHitEffect(x, y, damage) {
        if (!this.effectsEnabled) return;
        
        // Use ParticleHelpers if available
        if (window.ParticleHelpers && window.ParticleHelpers.createHitEffect) {
            window.ParticleHelpers.createHitEffect(x, y, damage);
            return;
        }
        
        // Use primary particle system
        if (this.particleManager && this.particleManager.spawnHitEffect) {
            const intensity = Math.min(3, damage / 25);
            this.particleManager.spawnHitEffect(x, y, intensity);
            return;
        }
        
        // Fallback effect
        this.createFallbackHitEffect(x, y, damage);
    }
    
    /**
     * Create explosion effect
     */
    createExplosion(x, y, radius = 60, color = '#ff6b35') {
        if (!this.effectsEnabled) return;
        
        // Use ParticleHelpers if available
        if (window.ParticleHelpers && window.ParticleHelpers.createExplosion) {
            window.ParticleHelpers.createExplosion(x, y, radius, color);
            return;
        }
        
        // Use primary particle system
        if (this.particleManager && this.particleManager.spawnParticle) {
            const particleCount = Math.min(20, Math.floor(radius / 3));
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 100 + Math.random() * 150;
                
                this.particleManager.spawnParticle({
                    x: x + (Math.random() - 0.5) * 10,
                    y: y + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: color,
                    life: 0.8,
                    type: 'spark'
                });
            }
            return;
        }
        
        // Fallback effect
        this.createFallbackExplosion(x, y, radius, color);
    }
    
    /**
     * Create level up effect
     */
    createLevelUpEffect(x, y) {
        if (!this.effectsEnabled) return;
        
        // Use ParticleHelpers if available
        if (window.ParticleHelpers && window.ParticleHelpers.createLevelUpEffect) {
            window.ParticleHelpers.createLevelUpEffect(x, y);
            return;
        }
        
        // Create burst effect
        if (this.particleManager && this.particleManager.spawnParticle) {
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const speed = 60 + Math.random() * 80;
                
                this.particleManager.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: '#f39c12',
                    life: 1 + Math.random() * 0.5,
                    type: 'spark'
                });
            }
            return;
        }
        
        // Fallback effect
        this.createFallbackLevelUpEffect(x, y);
    }
    
    /**
     * Create chain lightning effect
     */
    createChainLightning(fromX, fromY, toX, toY) {
        if (!this.effectsEnabled) return;

        // Use ParticleHelpers if available
        if (window.ParticleHelpers && window.ParticleHelpers.createLightningEffect) {
            window.ParticleHelpers.createLightningEffect(fromX, fromY, toX, toY);
            this.flashLightningArc(fromX, fromY, toX, toY, {
                duration: 0.6,  // Longer duration for better visibility
                thickness: 8,   // Thicker line
                jitter: 35,     // More dramatic jitter
                colorStops: [
                    { stop: 0, color: 'rgba(255, 255, 255, 1)' },      // Bright white start
                    { stop: 0.3, color: 'rgba(150, 220, 255, 1)' },   // Light blue
                    { stop: 0.7, color: 'rgba(100, 180, 255, 1)' },   // Medium blue
                    { stop: 1, color: 'rgba(60, 140, 255, 1)' }       // Deeper blue end
                ]
            });
            return;
        }

        // Create lightning path
        if (this.particleManager && this.particleManager.spawnParticle) {
            const dx = toX - fromX;
            const dy = toY - fromY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const segments = Math.max(3, Math.floor(distance / 20));

            for (let i = 0; i <= segments; i++) {
                const ratio = i / segments;
                const x = fromX + dx * ratio + (Math.random() - 0.5) * 20;
                const y = fromY + dy * ratio + (Math.random() - 0.5) * 20;

                this.particleManager.spawnParticle({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    size: 2 + Math.random() * 2,
                    color: '#74b9ff',
                    life: 0.3,
                    type: 'spark'
                });
            }
        }

        this.flashLightningArc(fromX, fromY, toX, toY, {
            duration: 0.6,  // Longer duration for better visibility
            thickness: 8,   // Thicker line
            jitter: 35,     // More dramatic jitter
            colorStops: [
                { stop: 0, color: 'rgba(255, 255, 255, 1)' },      // Bright white start
                { stop: 0.3, color: 'rgba(150, 220, 255, 1)' },   // Light blue
                { stop: 0.7, color: 'rgba(100, 180, 255, 1)' },   // Medium blue
                { stop: 1, color: 'rgba(60, 140, 255, 1)' }       // Deeper blue end
            ]
        });
    }

    flashLightningArc(fromX, fromY, toX, toY, options = {}) {
        if (!this.effectsEnabled) return;

        const duration = options.duration ?? 0.35;
        const jitter = options.jitter ?? 26;
        const maxSegments = options.segments ?? Math.max(4, Math.floor(Math.hypot(toX - fromX, toY - fromY) / 45));

        const points = [];
        for (let i = 0; i <= maxSegments; i++) {
            const ratio = i / maxSegments;
            const baseX = fromX + (toX - fromX) * ratio;
            const baseY = fromY + (toY - fromY) * ratio;

            if (i === 0 || i === maxSegments) {
                points.push({ x: baseX, y: baseY });
            } else {
                const offsetX = (Math.random() - 0.5) * jitter;
                const offsetY = (Math.random() - 0.5) * jitter;
                points.push({ x: baseX + offsetX, y: baseY + offsetY });
            }
        }

        this.activeLightningArcs.push({
            points,
            timeRemaining: duration,
            duration,
            thickness: options.thickness ?? 4,
            colorStops: options.colorStops || [
                { stop: 0, color: 'rgba(164, 227, 255, 0.9)' },
                { stop: 1, color: 'rgba(80, 174, 255, 0.9)' }
            ]
        });
    }
    
    /**
     * Create boss death effect
     */
    createBossDeathEffect(x, y) {
        if (!this.effectsEnabled) return;
        
        // Multiple explosion rings
        for (let ring = 0; ring < 3; ring++) {
            setTimeout(() => {
                this.createExplosion(x, y, 80 + ring * 40, '#c0392b');
            }, ring * 200);
        }
        
        // Screen shake
        this.addScreenShake(15, 1.0);
        
        // Floating text
        this.showCombatText('BOSS DEFEATED!', x, y - 50, 'critical', 32);
    }
    
    /**
     * Fallback effect implementations
     */
    createFallbackHitEffect(x, y, damage) {
        const particleCount = Math.min(8, Math.floor(damage / 5));
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 70;
            
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1 + Math.random() * 3,
                    color: '#e74c3c',
                    life: 0.3 + Math.random() * 0.3,
                    type: 'spark'
                });
            } else {
                const particle = new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    1 + Math.random() * 3,
                    '#e74c3c',
                    0.3 + Math.random() * 0.3
                );
                this.particles.push(particle);
            }
        }
    }
    
    createFallbackExplosion(x, y, radius, color) {
        const particleCount = Math.min(15, Math.floor(radius / 4));
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    color,
                    life: 0.5 + Math.random() * 0.5,
                    type: 'spark'
                });
            } else {
                const particle = new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    2 + Math.random() * 4,
                    color,
                    0.5 + Math.random() * 0.5
                );
                this.particles.push(particle);
            }
        }
    }
    
    createFallbackLevelUpEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    color: '#f39c12',
                    life: 1 + Math.random() * 0.5,
                    type: 'spark'
                });
            } else {
                const particle = new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    2 + Math.random() * 4,
                    '#f39c12',
                    1 + Math.random() * 0.5
                );
                this.particles.push(particle);
            }
        }
    }
    
    /**
     * Render all effects (called by game engine)
     */
    render(ctx) {
        ctx.save();

        // Render temporary lightning arcs first (beneath text)
        if (this.activeLightningArcs.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            this.activeLightningArcs.forEach(arc => {
                if (!arc.points || arc.points.length < 2) return;

                const t = Math.max(0, Math.min(1, arc.timeRemaining / arc.duration));
                const width = (arc.thickness || 4) * (0.6 + 0.4 * t);

                const start = arc.points[0];
                const end = arc.points[arc.points.length - 1];
                const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
                (arc.colorStops || []).forEach(stop => {
                    const alphaColor = stop.color.replace(/rgba?\(([^)]+)\)/, (match, inner) => {
                        const parts = inner.split(',').map(p => p.trim());
                        if (parts.length === 4) {
                            const newAlpha = parseFloat(parts[3]) * (0.4 + 0.6 * t);
                            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${newAlpha.toFixed(3)})`;
                        }
                        return `rgba(${parts.join(',')}, ${0.4 + 0.6 * t})`;
                    });
                    gradient.addColorStop(stop.stop, alphaColor);
                });

                ctx.strokeStyle = gradient;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                for (let i = 1; i < arc.points.length; i++) {
                    ctx.lineTo(arc.points[i].x, arc.points[i].y);
                }
                ctx.stroke();

                // Multiple glow layers for better visibility
                // Inner bright glow
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * t})`;
                ctx.lineWidth = width * 0.5;
                ctx.stroke();

                // Outer glow for visibility
                ctx.strokeStyle = `rgba(164, 227, 255, ${0.3 * t})`;
                ctx.lineWidth = width * 2.5;
                ctx.stroke();

                // Extra outer glow
                ctx.strokeStyle = `rgba(100, 180, 255, ${0.15 * t})`;
                ctx.lineWidth = width * 4;
                ctx.stroke();
            });
        }

        ctx.restore();

        // Render floating text after lightning so text sits on top
        if (this.floatingText && typeof this.floatingText.render === 'function') {
            this.floatingText.render(ctx);
        }

        // Render fallback particles
        if (this.particles && this.particles.length > 0) {
            this.particles.forEach(particle => {
                if (particle && typeof particle.render === 'function') {
                    particle.render(ctx);
                }
            });
        }
    }
    
    /**
     * Clear all effects
     */
    clearAllEffects() {
        // Clear screen shake
        this.screenShakeAmount = 0;
        this.screenShakeTimer = 0;
        
        // Clear particles
        if (this.particleManager && this.particleManager.clear) {
            this.particleManager.clear();
        }
        this.particles = [];
        
        // Clear floating text
        if (this.floatingText && this.floatingText.clear) {
            this.floatingText.clear();
        }
    }
    
    /**
     * Set quality mode
     */
    setQualityMode(mode) {
        this.lowQuality = (mode === 'low' || mode === 'critical');
        this.effectsEnabled = (mode !== 'critical');
        
        // Update particle system settings
        if (this.particleManager && this.particleManager.setPerformanceSettings) {
            this.particleManager.setPerformanceSettings({
                lowQuality: this.lowQuality,
                maxParticles: this.maxParticles,
                particleReductionFactor: this.particleReductionFactor
            });
        }
    }
    
    /**
     * Get effects state for debugging
     */
    getEffectsState() {
        return {
            screenShakeActive: this.screenShakeTimer > 0,
            screenShakeAmount: this.screenShakeAmount,
            particleCount: this.particleManager ? 
                (this.particleManager.getActiveCount ? this.particleManager.getActiveCount() : 0) : 
                this.particles.length,
            effectsEnabled: this.effectsEnabled,
            lowQuality: this.lowQuality,
            particleReductionFactor: this.particleReductionFactor
        };
    }
}

// Export for ES6 module system
// Also make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.EffectsManager = EffectsManager;
}

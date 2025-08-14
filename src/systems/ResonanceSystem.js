// Advanced resonance and feedback system for enhanced game feel
class ResonanceSystem {
    constructor() {
        this.activeResonances = [];
        this.screenShakeIntensity = 0;
        this.screenShakeDecay = 0.95;
        this.timeScale = 1.0;
        this.lastImpactTime = 0;
        this.combatRhythm = 0;
        
        // Visual resonance effects
        this.chromaticAberration = 0;
        this.bloomIntensity = 0;
        this.pulseEffects = new Map();
        
        // Audio-visual sync
        this.audioContext = null;
        this.analyser = null;
        this.frequencyData = null;
        
        this.init();
    }
    
    init() {
        // Initialize audio context for advanced effects
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        } catch (e) {
            console.warn('AudioContext not available, advanced audio-visual sync disabled');
        }
    }
    
    // Trigger resonance effect based on impact intensity
    triggerImpactResonance(intensity, type = 'hit', position = null) {
        const now = performance.now();
        const timeSinceLastImpact = now - this.lastImpactTime;
        
        // Build up combat rhythm
        if (timeSinceLastImpact < 500) {
            this.combatRhythm = Math.min(this.combatRhythm + 0.1, 1.0);
        } else {
            this.combatRhythm *= 0.95;
        }
        
        // Scale effects based on intensity and combat rhythm
        const effectMultiplier = intensity * (1 + this.combatRhythm * 0.5);
        
        switch (type) {
            case 'hit':
                this.addScreenShake(effectMultiplier * 2);
                this.addChromaticAberration(effectMultiplier * 0.5);
                this.triggerTimeHiccup(effectMultiplier);
                break;
                
            case 'critical':
                this.addScreenShake(effectMultiplier * 4);
                this.addChromaticAberration(effectMultiplier * 1.0);
                this.triggerTimeHiccup(effectMultiplier * 1.5);
                this.addBloom(effectMultiplier * 0.8);
                break;
                
            case 'kill':
                this.addScreenShake(effectMultiplier * 3);
                this.triggerTimeHiccup(effectMultiplier * 1.2);
                this.addPulseEffect(position, effectMultiplier);
                break;
                
            case 'levelup':
                this.addBloom(1.0);
                this.addPulseEffect(position, 2.0);
                this.triggerTimeHiccup(0.5);
                break;
        }
        
        this.lastImpactTime = now;
    }
    
    addScreenShake(intensity) {
        this.screenShakeIntensity += intensity;
        this.screenShakeIntensity = Math.min(this.screenShakeIntensity, 10);
    }
    
    addChromaticAberration(intensity) {
        this.chromaticAberration += intensity;
        this.chromaticAberration = Math.min(this.chromaticAberration, 5);
    }
    
    addBloom(intensity) {
        this.bloomIntensity += intensity;
        this.bloomIntensity = Math.min(this.bloomIntensity, 3);
    }
    
    triggerTimeHiccup(intensity) {
        // Brief slow-motion effect for impact
        if (intensity > 0.5) {
            this.timeScale = Math.max(0.3, 1.0 - intensity * 0.3);
            setTimeout(() => {
                this.timeScale = 1.0;
            }, 100 + intensity * 50);
        }
    }
    
    addPulseEffect(position, intensity) {
        if (!position) return;
        
        const pulse = {
            x: position.x,
            y: position.y,
            radius: 0,
            maxRadius: intensity * 50,
            intensity: intensity,
            lifetime: 1.0,
            age: 0
        };
        
        this.pulseEffects.set(Date.now() + Math.random(), pulse);
    }
    
    update(deltaTime) {
        // Apply time scale
        const scaledDeltaTime = deltaTime * this.timeScale;
        
        // Decay effects
        this.screenShakeIntensity *= this.screenShakeDecay;
        this.chromaticAberration *= 0.9;
        this.bloomIntensity *= 0.92;
        this.combatRhythm *= 0.995;
        
        // Update pulse effects
        for (const [id, pulse] of this.pulseEffects) {
            pulse.age += scaledDeltaTime;
            pulse.radius = (pulse.age / pulse.lifetime) * pulse.maxRadius;
            
            if (pulse.age >= pulse.lifetime) {
                this.pulseEffects.delete(id);
            }
        }
        
        // Audio-visual sync
        if (this.analyser && this.frequencyData) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            // Could use this data for reactive visual effects
        }
        
        return scaledDeltaTime;
    }
    
    applyEffectsToContext(ctx) {
        // Apply screen shake
        if (this.screenShakeIntensity > 0.1) {
            const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
            ctx.translate(shakeX, shakeY);
        }
        
        // Apply chromatic aberration effect
        if (this.chromaticAberration > 0.1) {
            const blur = Math.min(this.chromaticAberration, 2);
            ctx.filter = `blur(${blur}px) contrast(${1 + this.chromaticAberration * 0.1})`;
        }
        
        // Apply bloom effect
        if (this.bloomIntensity > 0.1) {
            ctx.shadowBlur = this.bloomIntensity * 5;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        }
    }
    
    renderPulseEffects(ctx) {
        for (const pulse of this.pulseEffects.values()) {
            const alpha = 1 - (pulse.age / pulse.lifetime);
            const hue = (pulse.intensity * 60) % 360;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
            ctx.lineWidth = pulse.intensity * 3;
            ctx.beginPath();
            ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner pulse
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
            ctx.beginPath();
            ctx.arc(pulse.x, pulse.y, pulse.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    resetEffects(ctx) {
        // Reset all applied effects
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = 'none';
        ctx.shadowBlur = 0;
    }
    
    // Get current intensity for external systems
    getIntensity() {
        return Math.max(
            this.screenShakeIntensity * 0.1,
            this.chromaticAberration * 0.2,
            this.bloomIntensity * 0.3,
            this.combatRhythm
        );
    }
    
    // Cleanup
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.pulseEffects.clear();
    }
}

// Create global instance
window.resonanceSystem = new ResonanceSystem();

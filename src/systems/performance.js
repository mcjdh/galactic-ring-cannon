// Performance monitoring and optimization utilities
class PerformanceManager {
    constructor() {
        this.frameCount = 0;
        this.lastTime = 0;
        this.fps = 0;
        this.fpsHistory = [];
        this.maxHistorySize = 60;
        
        // Performance thresholds - more aggressive switching
        this.lowFpsThreshold = 50; // Raised from 45
        this.criticalFpsThreshold = 35; // Raised from 30
        
        // Current performance mode
        this.performanceMode = 'normal'; // normal, low, critical
        
        // Memory monitoring
        this.memoryUsage = 0;
        this.lastMemoryCheck = 0;
        this.memoryCheckInterval = 3000; // Check every 3 seconds (faster)
        
        // Optimization flags
        this.optimizations = {
            reducedParticles: false,
            simplifiedRendering: false,
            culledOffscreenEntities: false,
            reducedUpdateFrequency: false
        };
        
        // Add hysteresis to prevent rapid mode switching - tighter windows
        this.modeChangeThreshold = {
            critical: { enter: 25, exit: 40 }, // More aggressive critical mode
            low: { enter: 40, exit: 55 }, // Quicker low mode activation
        };
        
        // Cooldown between mode changes - reduced for faster response
        this.minModeChangeCooldown = 2000; // 2 seconds instead of 3
        this.lastModeChange = 0;
        
        this.init();
    }
    
    init() {
        // Start monitoring
        this.startMonitoring();
        
        // Add performance toggle hotkey
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F1' || (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
                this.togglePerformanceMode();
            }
        });
        
        console.log('Performance Manager initialized. Press F1 or Ctrl+P to toggle performance mode.');
    }
    
    update(deltaTime) {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round(this.frameCount / ((currentTime - this.lastTime) / 1000));
            this.fpsHistory.push(this.fps);
            
            if (this.fpsHistory.length > this.maxHistorySize) {
                this.fpsHistory.shift();
            }
            
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Check and adjust performance
            this.checkPerformance();
        }
        
        // Memory monitoring
        if (currentTime - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.checkMemoryUsage();
            this.lastMemoryCheck = currentTime;
        }
    }
    
    checkPerformance() {
        const avgFps = this.getAverageFps();
        const currentTime = performance.now();
        
        // Don't change modes too frequently
        if (currentTime - this.lastModeChange < this.minModeChangeCooldown) {
            return;
        }
        
        const newMode = this.determinePerformanceModeWithHysteresis(avgFps);
        
        if (newMode !== this.performanceMode) {
            this.changePerformanceMode(newMode);
            this.lastModeChange = currentTime;
        }
    }
    
    getAverageFps() {
        if (this.fpsHistory.length === 0) return 60;
        return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    }
    
    determinePerformanceModeWithHysteresis(avgFps) {
        const current = this.performanceMode;
        
        // Use different thresholds for entering vs exiting modes
        switch (current) {
            case 'normal':
                if (avgFps <= this.modeChangeThreshold.low.enter) {
                    return avgFps <= this.modeChangeThreshold.critical.enter ? 'critical' : 'low';
                }
                return 'normal';
                
            case 'low':
                if (avgFps <= this.modeChangeThreshold.critical.enter) {
                    return 'critical';
                } else if (avgFps >= this.modeChangeThreshold.low.exit) {
                    return 'normal';
                }
                return 'low';
                
            case 'critical':
                if (avgFps >= this.modeChangeThreshold.critical.exit) {
                    return avgFps >= this.modeChangeThreshold.low.exit ? 'normal' : 'low';
                }
                return 'critical';
                
            default:
                return 'normal';
        }
    }
    
    // Legacy method for compatibility
    determinePerformanceMode(avgFps) {
        return this.determinePerformanceModeWithHysteresis(avgFps);
    }
    
    changePerformanceMode(newMode) {
        const oldMode = this.performanceMode;
        this.performanceMode = newMode;
        
        switch (newMode) {
            case 'critical':
                this.enableCriticalOptimizations();
                break;
            case 'low':
                this.enableLowOptimizations();
                break;
            case 'normal':
                this.disableOptimizations();
                break;
        }
        
        console.log(`Performance mode changed: ${oldMode} -> ${newMode} (FPS: ${this.getAverageFps().toFixed(1)})`);
        
        // Notify game manager of performance change
        if (window.gameManager && typeof window.gameManager.onPerformanceModeChange === 'function') {
            window.gameManager.onPerformanceModeChange(newMode);
        }
    }
    
    enableCriticalOptimizations() {
        this.optimizations.reducedParticles = true;
        this.optimizations.simplifiedRendering = true;
        this.optimizations.culledOffscreenEntities = true;
        this.optimizations.reducedUpdateFrequency = true;
        
        // Very aggressive particle reduction
        if (window.gameManager) {
            window.gameManager.maxParticles = Math.min(window.gameManager.maxParticles || 200, 30);
            window.gameManager.particleReductionFactor = 0.15; // Even more aggressive
            
            // Clear excess particles immediately
            if (window.gameManager.particles && window.gameManager.particles.length > 30) {
                window.gameManager.particles.splice(30);
            }
        }
        
        // Force low-quality rendering mode
        if (window.gameEngine && window.gameEngine.ctx) {
            window.gameEngine.ctx.imageSmoothingEnabled = false;
            window.gameEngine.targetFps = 30; // Reduce target FPS
        }
    }
    
    enableLowOptimizations() {
        this.optimizations.reducedParticles = true;
        this.optimizations.simplifiedRendering = false;
        this.optimizations.culledOffscreenEntities = true;
        this.optimizations.reducedUpdateFrequency = false;
        
        // Reduce particle limits moderately
        if (window.gameManager) {
            window.gameManager.maxParticles = Math.min(window.gameManager.maxParticles || 200, 100);
            window.gameManager.particleReductionFactor = 0.5;
        }
    }
    
    disableOptimizations() {
        this.optimizations.reducedParticles = false;
        this.optimizations.simplifiedRendering = false;
        this.optimizations.culledOffscreenEntities = false;
        this.optimizations.reducedUpdateFrequency = false;
        
        // Restore normal particle limits
        if (window.gameManager) {
            window.gameManager.maxParticles = 200;
            window.gameManager.particleReductionFactor = 1.0;
        }
    }
    
    togglePerformanceMode() {
        const modes = ['normal', 'low', 'critical'];
        const currentIndex = modes.indexOf(this.performanceMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        this.changePerformanceMode(nextMode);
        
        // Show notification
        if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
            window.gameManager.showFloatingText(
                `Performance Mode: ${nextMode.toUpperCase()}`,
                window.gameManager.game?.player?.x || 400,
                window.gameManager.game?.player?.y - 100 || 200,
                '#00ff00',
                18
            );
        }
    }
    
    checkMemoryUsage() {
        if (performance.memory) {
            this.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            
            // Trigger garbage collection hint if memory usage is high
            if (this.memoryUsage > 100 && window.gc) {
                window.gc();
            }
        }
    }
    
    startMonitoring() {
        // Create performance display if debug mode is enabled
        if (window.location.search.includes('debug') || localStorage.getItem('debugMode') === 'true') {
            this.createPerformanceDisplay();
        }
    }
    
    createPerformanceDisplay() {
        const display = document.createElement('div');
        display.id = 'performance-display';
        display.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            border-radius: 5px;
            min-width: 150px;
        `;
        document.body.appendChild(display);
        
        // Update display every second
        setInterval(() => {
            const fpsColor = this.fps >= 60 ? '#00ff00' : this.fps >= 30 ? '#ffff00' : '#ff0000';
            display.innerHTML = `
                <div>FPS: <span style="color:${fpsColor}">${this.fps}</span></div>
                <div>Mode: ${this.performanceMode}</div>
                <div>Memory: ${this.memoryUsage.toFixed(1)} MB</div>
                <div>Particles: ${this.optimizations.reducedParticles ? 'Reduced' : 'Normal'}</div>
            `;
        }, 1000);
    }
    
    // Static method to initialize performance manager
    static init() {
        if (!window.performanceManager) {
            window.performanceManager = new PerformanceManager();
        }
        return window.performanceManager;
    }
}

// Initialize performance manager
PerformanceManager.init();

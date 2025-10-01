// Performance monitoring and optimization utilities
// 🤖 RESONANT NOTE: Simplified performance system - removed overengineering

class PerformanceManager {
    constructor() {
        this.frameCount = 0;
        this.lastTime = 0;
        this.fps = 0;
        this.fpsHistory = [];
        this.maxHistorySize = 20; // Reduced for simplicity
        
        // Simple performance thresholds - work well across devices
        this.lowFpsThreshold = 45;
        this.criticalFpsThreshold = 30;
        
        // Current performance mode
        this.performanceMode = 'normal';
        
        // Memory monitoring (simplified)
        this.memoryUsage = 0;
        this.lastMemoryCheck = 0;
        this.memoryCheckInterval = 5000;
        
        // Mode change cooldown to prevent thrashing
        this.lastModeChange = 0;
        this.modeChangeCooldown = 3000;
        
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
            
            // Check and adjust performance automatically
            this.checkPerformance();
        }
        
        // Simple memory monitoring
        if (currentTime - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.checkMemoryUsage();
            this.lastMemoryCheck = currentTime;
        }
    }
    
    checkPerformance() {
        const avgFps = this.getAverageFps();
        const currentTime = Date.now();
        
        // Don't change modes too frequently
        if (currentTime - this.lastModeChange < this.modeChangeCooldown) {
            return;
        }
        
        let newMode = this.performanceMode;
        
        // Simple threshold-based mode switching
        if (avgFps < this.criticalFpsThreshold) {
            newMode = 'critical';
        } else if (avgFps < this.lowFpsThreshold) {
            newMode = 'low';
        } else if (avgFps > this.lowFpsThreshold + 10) { // Add buffer for switching back
            newMode = 'normal';
        }
        
        if (newMode !== this.performanceMode) {
            this.changePerformanceMode(newMode);
            this.lastModeChange = currentTime;
        }
    }
    
    getAverageFps() {
        if (this.fpsHistory.length === 0) return 60;
        return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
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
        
        // Notify game manager of performance change
        if (window.gameManager && typeof window.gameManager.onPerformanceModeChange === 'function') {
            window.gameManager.onPerformanceModeChange(newMode);
        }
    }
    
    enableCriticalOptimizations() {
        // Simplified critical optimizations
        if (window.gameManager) {
            window.gameManager.maxParticles = 30;
            window.gameManager.particleReductionFactor = 0.25;
        }
    }
    
    enableLowOptimizations() {
        // Simplified low optimizations
        if (window.gameManager) {
            window.gameManager.maxParticles = 100;
            window.gameManager.particleReductionFactor = 0.6;
        }
    }
    
    disableOptimizations() {
        // Restore normal limits
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
                <div>Particles: ${(window.gameManager && window.gameManager.maxParticles < 150) ? 'Reduced' : 'Normal'}</div>
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

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.PerformanceManager = PerformanceManager;
}

// Initialize performance manager
PerformanceManager.init();

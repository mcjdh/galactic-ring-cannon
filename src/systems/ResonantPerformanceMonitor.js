/**
 * 🌊 RESONANT PERFORMANCE MONITOR
 * 
 * Real-time performance tracking system that monitors the improvements
 * Applied to the Galactic Ring Cannon optimization initiatives.
 * 
 * Tracks:
 * - Collision system performance
 * - Particle system efficiency
 * - Component architecture benefits
 * - Frame time stability
 */

class ResonantPerformanceMonitor {
    constructor() {
        this.metrics = {
            collisionSystem: {
                checksPerFrame: 0,
                avgCheckTime: 0,
                cullPercent: 0,
                layerSkips: 0
            },
            particleSystem: {
                activeParticles: 0,
                poolUtilization: 0,
                batchEfficiency: 0,
                cullRate: 0
            },
            framePerformance: {
                avgFrameTime: 16.67, // Target 60fps
                frameTimeHistory: [],
                droppedFrames: 0,
                performanceScore: 100
            },
            componentPerformance: {
                playerUpdateTime: 0,
                enemyUpdateTime: 0,
                systemUpdateTime: 0
            }
        };
        
        this.isEnabled = false;
        this.updateInterval = 1000; // Update metrics every second
        this.lastUpdateTime = 0;
        this.displayElement = null;
        
        // Performance thresholds
        this.thresholds = {
            frameTime: 16.67,      // 60fps target
            collisionTime: 2,      // Max 2ms per frame
            particleTime: 1,       // Max 1ms per frame
            componentTime: 0.5     // Max 0.5ms per component
        };
        
        this.initializeMonitoring();
    }
    
    /**
     * Initialize performance monitoring
     */
    initializeMonitoring() {
        // Create performance display element
        this.createDisplayElement();
        
        // Hook into existing systems
        this.hookCollisionSystem();
        this.hookParticleSystem();
        this.hookComponentSystems();
        
        if (window.logger?.debug) {
            window.logger.debug('🌊 ResonantPerformanceMonitor initialized');
        }
    }
    
    /**
     * Create floating performance display
     */
    createDisplayElement() {
        const display = document.createElement('div');
        display.id = 'resonant-performance-display';
        display.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff88;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 8px;
            border-radius: 4px;
            z-index: 10000;
            min-width: 200px;
            display: none;
            border: 1px solid #00ff88;
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        `;
        
        document.body.appendChild(display);
        this.displayElement = display;
    }
    
    /**
     * Hook into collision system for performance tracking
     */
    hookCollisionSystem() {
        if (typeof CollisionSystem !== 'undefined') {
            const originalCheckCollisions = CollisionSystem.prototype.checkCollisions;
            const monitor = this;
            
            CollisionSystem.prototype.checkCollisions = function() {
                const startTime = performance.now();
                const result = originalCheckCollisions.call(this);
                const endTime = performance.now();
                
                // Update collision metrics
                if (this.stats) {
                    monitor.metrics.collisionSystem.checksPerFrame = this.stats.collisionsChecked || 0;
                    monitor.metrics.collisionSystem.avgCheckTime = endTime - startTime;
                    monitor.metrics.collisionSystem.cullPercent = this.stats.cellsProcessed > 0 ? 
                        ((this.stats.collisionsChecked - this.stats.collisionsDetected) / this.stats.collisionsChecked * 100) : 0;
                }
                
                return result;
            };
            
            if (window.logger?.debug) {
                window.logger.debug('✅ Hooked collision system performance monitoring');
            }
        }
    }
    
    /**
     * Hook into particle system for performance tracking
     */
    hookParticleSystem() {
        // Hook OptimizedParticlePool
        if (window.optimizedParticles) {
            const monitor = this;
            
            if (window.optimizedParticles.render) {
                const originalRender = window.optimizedParticles.render.bind(window.optimizedParticles);
                
                window.optimizedParticles.render = function(ctx, viewport) {
                    const startTime = performance.now();
                    const result = originalRender(ctx, viewport);
                    const endTime = performance.now();
                    
                    // Update particle metrics
                    monitor.metrics.particleSystem.activeParticles = this.activeParticles?.length || 0;
                    monitor.metrics.particleSystem.poolUtilization = this.pool?.length ? 
                        ((100 - this.pool.length) / 100 * 100) : 0;
                    
                    return result;
                };
            }
        }
        
        // Hook ResonantParticleEnhancer
        if (window.resonantParticleEnhancer) {
            const originalUpdate = window.resonantParticleEnhancer.updatePerformanceMode.bind(window.resonantParticleEnhancer);
            const monitor = this;
            
            window.resonantParticleEnhancer.updatePerformanceMode = function(deltaTime) {
                const result = originalUpdate(deltaTime);
                
                // Get enhanced particle stats
                const stats = this.getStatistics();
                monitor.metrics.particleSystem.batchEfficiency = stats.batchRenderCalls || 0;
                monitor.metrics.particleSystem.cullRate = stats.particlesCulled || 0;
                
                return result;
            };
        }
        
        if (window.logger?.debug) {
            window.logger.debug('✅ Hooked particle system performance monitoring');
        }
    }
    
    /**
     * Hook into component systems
     */
    hookComponentSystems() {
        // Hook Player updates
        if (typeof Player !== 'undefined') {
            const originalUpdate = Player.prototype.update;
            const monitor = this;
            
            Player.prototype.update = function(deltaTime, game) {
                const startTime = performance.now();
                const result = originalUpdate.call(this, deltaTime, game);
                const endTime = performance.now();
                
                monitor.metrics.componentPerformance.playerUpdateTime = endTime - startTime;
                return result;
            };
        }
        
        // Hook PlayerRefactored updates if available
        if (typeof PlayerRefactored !== 'undefined') {
            const originalUpdate = PlayerRefactored.prototype.update;
            const monitor = this;
            
            PlayerRefactored.prototype.update = function(deltaTime, game) {
                const startTime = performance.now();
                const result = originalUpdate.call(this, deltaTime, game);
                const endTime = performance.now();
                
                monitor.metrics.componentPerformance.playerUpdateTime = endTime - startTime;
                return result;
            };
        }
        
        // Hook Enemy updates
        if (typeof Enemy !== 'undefined') {
            const originalUpdate = Enemy.prototype.update;
            const monitor = this;
            
            Enemy.prototype.update = function(deltaTime, game) {
                const startTime = performance.now();
                const result = originalUpdate.call(this, deltaTime, game);
                const endTime = performance.now();
                
                monitor.metrics.componentPerformance.enemyUpdateTime = endTime - startTime;
                return result;
            };
        }
        
        if (window.logger?.debug) {
            window.logger.debug('✅ Hooked component system performance monitoring');
        }
    }
    
    /**
     * Start performance monitoring
     */
    start() {
        this.isEnabled = true;
        this.displayElement.style.display = 'block';
        
        // Start update loop
        this.updateLoop();
        
        window.logger?.log('🌊 ResonantPerformanceMonitor started');
    }
    
    /**
     * Stop performance monitoring
     */
    stop() {
        this.isEnabled = false;
        this.displayElement.style.display = 'none';
        
        window.logger?.log('🌊 ResonantPerformanceMonitor stopped');
    }
    
    /**
     * Toggle performance monitoring
     */
    toggle() {
        if (this.isEnabled) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    /**
     * Update performance metrics
     */
    updateLoop() {
        if (!this.isEnabled) return;
        
        const currentTime = performance.now();
        
        if (currentTime - this.lastUpdateTime >= this.updateInterval) {
            this.updateFrameMetrics();
            this.updateDisplay();
            this.calculatePerformanceScore();
            
            this.lastUpdateTime = currentTime;
        }
        
        requestAnimationFrame(() => this.updateLoop());
    }
    
    /**
     * Update frame time metrics
     */
    updateFrameMetrics() {
        const currentTime = performance.now();
        
        if (this.lastFrameTime) {
            const frameTime = currentTime - this.lastFrameTime;
            
            this.metrics.framePerformance.frameTimeHistory.push(frameTime);
            if (this.metrics.framePerformance.frameTimeHistory.length > 60) {
                this.metrics.framePerformance.frameTimeHistory.shift();
            }
            
            // Calculate average frame time
            const history = this.metrics.framePerformance.frameTimeHistory;
            this.metrics.framePerformance.avgFrameTime = 
                history.reduce((sum, time) => sum + time, 0) / history.length;
            
            // Count dropped frames (>33ms = below 30fps)
            if (frameTime > 33) {
                this.metrics.framePerformance.droppedFrames++;
            }
        }
        
        this.lastFrameTime = currentTime;
    }
    
    /**
     * Calculate overall performance score
     */
    calculatePerformanceScore() {
        let score = 100;
        const metrics = this.metrics;
        
        // Frame time penalty (target 16.67ms for 60fps)
        const frameTimePenalty = Math.max(0, 
            (metrics.framePerformance.avgFrameTime - this.thresholds.frameTime) * 2);
        score -= frameTimePenalty;
        
        // Collision system penalty
        if (metrics.collisionSystem.avgCheckTime > this.thresholds.collisionTime) {
            score -= (metrics.collisionSystem.avgCheckTime - this.thresholds.collisionTime) * 5;
        }
        
        // Component performance penalty
        if (metrics.componentPerformance.playerUpdateTime > this.thresholds.componentTime) {
            score -= (metrics.componentPerformance.playerUpdateTime - this.thresholds.componentTime) * 10;
        }
        
        // Bonus for good optimization utilization
        if (metrics.collisionSystem.cullPercent > 50) {
            score += 5; // Bonus for good collision culling
        }
        
        if (metrics.particleSystem.batchEfficiency > 10) {
            score += 5; // Bonus for good particle batching
        }
        
        this.metrics.framePerformance.performanceScore = Math.max(0, Math.min(100, score));
    }
    
    /**
     * Update performance display
     */
    updateDisplay() {
        if (!this.displayElement) return;
        
        const m = this.metrics;
        const fps = 1000 / m.framePerformance.avgFrameTime;
        
        const html = `
            <div style="color: #00ff88; font-weight: bold; margin-bottom: 4px;">
                🌊 RESONANT PERFORMANCE MONITOR
            </div>
            
            <div style="color: ${fps >= 55 ? '#00ff88' : fps >= 30 ? '#ffaa00' : '#ff4444'};">
                FPS: ${fps.toFixed(1)} | Score: ${m.framePerformance.performanceScore.toFixed(0)}%
            </div>
            
            <div style="margin-top: 6px; font-size: 10px;">
                <div style="color: #88ccff;">COLLISION SYSTEM:</div>
                <div>Checks: ${m.collisionSystem.checksPerFrame}</div>
                <div>Time: ${m.collisionSystem.avgCheckTime.toFixed(2)}ms</div>
                <div>Cull: ${m.collisionSystem.cullPercent.toFixed(1)}%</div>
                
                <div style="color: #88ccff; margin-top: 4px;">PARTICLES:</div>
                <div>Active: ${m.particleSystem.activeParticles}</div>
                <div>Pool: ${m.particleSystem.poolUtilization.toFixed(0)}%</div>
                <div>Batches: ${m.particleSystem.batchEfficiency}</div>
                
                <div style="color: #88ccff; margin-top: 4px;">COMPONENTS:</div>
                <div>Player: ${m.componentPerformance.playerUpdateTime.toFixed(2)}ms</div>
                <div>Enemy: ${m.componentPerformance.enemyUpdateTime.toFixed(2)}ms</div>
            </div>
            
            <div style="margin-top: 6px; font-size: 9px; color: #666;">
                Press Ctrl+Shift+P to toggle
            </div>
        `;
        
        this.displayElement.innerHTML = html;
    }
    
    /**
     * Get performance report
     */
    getPerformanceReport() {
        return {
            timestamp: new Date().toISOString(),
            metrics: { ...this.metrics },
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const m = this.metrics;
        
        if (m.framePerformance.avgFrameTime > 20) {
            recommendations.push('Frame rate below target - consider reducing particle count or visual effects');
        }
        
        if (m.collisionSystem.avgCheckTime > 2) {
            recommendations.push('Collision system slow - ensure CollisionSystem optimizations are loaded');
        }
        
        if (m.particleSystem.activeParticles > 150) {
            recommendations.push('High particle count - ResonantParticleEnhancer should help with culling');
        }
        
        if (m.collisionSystem.cullPercent < 30) {
            recommendations.push('Low collision culling - check collision layer configuration');
        }
        
        if (m.componentPerformance.playerUpdateTime > 1) {
            recommendations.push('Player updates slow - consider PlayerRefactored component architecture');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Performance looks good! All systems operating efficiently.');
        }
        
        return recommendations;
    }
}

// Initialize performance monitor
window.ResonantPerformanceMonitor = ResonantPerformanceMonitor;
window.resonantPerformanceMonitor = new ResonantPerformanceMonitor();

// Hotkey support
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
        window.resonantPerformanceMonitor.toggle();
        e.preventDefault();
    }
});

// Auto-enable in debug mode
if (window.debugManager?.enabled || window.location.search.includes('debug=true')) {
    setTimeout(() => {
        window.resonantPerformanceMonitor.start();
        console.log('🌊 ResonantPerformanceMonitor auto-enabled in debug mode');
        console.log('Press Ctrl+Shift+P to toggle performance display');
    }, 2000);
}

// Global convenience functions
window.getPerformanceReport = () => window.resonantPerformanceMonitor.getPerformanceReport();
window.togglePerformanceMonitor = () => window.resonantPerformanceMonitor.toggle();
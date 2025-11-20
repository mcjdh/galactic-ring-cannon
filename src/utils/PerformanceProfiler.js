/**
 * [Pi] Performance Profiler for Raspberry Pi 5 Testing
 * Provides detailed performance metrics and profiling for optimization work
 */

class PerformanceProfiler {
    constructor() {
        this.metrics = new Map();
        this.frameTimes = [];
        this.maxFrameSamples = 120; // 2 seconds at 60fps
        this.enabled = false;
        this.verbose = false;
        
        // Auto-enable on Pi5 or when debug mode is active
        this.enabled = window.isRaspberryPi || window.logger?.debug || false;
        
        // Performance targets for Pi5
        this.targets = {
            cosmicBackground: 5,    // ms per frame
            particleRender: 3,      // ms for 100 particles
            enemyAI: 5,             // ms for 50 enemies
            collisionDetection: 4,  // ms
            totalFrame: 16.67,      // ms (60fps)
            warningFrame: 25,       // ms (40fps - warning threshold)
            criticalFrame: 33       // ms (30fps - critical threshold)
        };
        
        // Cumulative stats
        this.stats = {
            totalFrames: 0,
            droppedFrames: 0,
            avgFrameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0
        };
        
        // System-specific timings
        this.systemTimings = {
            cosmicBackground: [],
            particles: [],
            enemyAI: [],
            collision: [],
            rendering: [],
            update: []
        };
        
        this.lastReportTime = 0;
        this.reportInterval = 5000; // Report every 5 seconds
    }
    
    /**
     * Enable or disable profiler
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            window.logger.log('[I] Performance Profiler enabled');
        }
    }
    
    /**
     * Enable verbose logging
     */
    setVerbose(verbose) {
        this.verbose = verbose;
    }
    
    /**
     * Start timing a labeled section
     */
    start(label) {
        if (!this.enabled) return;
        this.metrics.set(label, performance.now());
    }
    
    /**
     * End timing and optionally log
     */
    end(label, category = null) {
        if (!this.enabled) return;
        
        const start = this.metrics.get(label);
        if (!start) return;
        
        const duration = performance.now() - start;
        this.metrics.delete(label);
        
        // Store in category if provided
        if (category && this.systemTimings[category]) {
            this.systemTimings[category].push(duration);
            
            // Keep only last 60 samples per category
            if (this.systemTimings[category].length > 60) {
                this.systemTimings[category].shift();
            }
        }
        
        // Log if verbose or if exceeds target
        const target = this.targets[category];
        if (this.verbose || (target && duration > target)) {
            const status = target && duration > target ? '!' : '+';
            window.logger.log(`${status} ${label}: ${duration.toFixed(2)}ms${target ? ` (target: ${target}ms)` : ''}`);
        }
        
        return duration;
    }
    
    /**
     * Start frame timing
     */
    frameStart() {
        if (!this.enabled) return;
        this.start('frame');
    }
    
    /**
     * End frame timing
     */
    frameEnd() {
        if (!this.enabled) return;
        
        const frameTime = this.end('frame');
        if (!frameTime) return;
        
        // Track frame times
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameSamples) {
            this.frameTimes.shift();
        }
        
        // Update stats
        this.stats.totalFrames++;
        this.stats.minFrameTime = Math.min(this.stats.minFrameTime, frameTime);
        this.stats.maxFrameTime = Math.max(this.stats.maxFrameTime, frameTime);
        
        if (frameTime > this.targets.totalFrame) {
            this.stats.droppedFrames++;
        }
        
        // Calculate rolling average
        const sum = this.frameTimes.reduce((a, b) => a + b, 0);
        this.stats.avgFrameTime = sum / this.frameTimes.length;
        
        // Periodic reporting
        const now = performance.now();
        if (now - this.lastReportTime > this.reportInterval) {
            this.report();
            this.lastReportTime = now;
        }
    }
    
    /**
     * Generate performance report
     */
    report() {
        if (!this.enabled) return;

        window.logger.log('[S] ═══════════════════════════════════════════════════');
        window.logger.log('[S] PERFORMANCE REPORT (Pi5 Optimization)');
        window.logger.log('[S] ═══════════════════════════════════════════════════');

        // Overall stats
        const fps = 1000 / this.stats.avgFrameTime;
        const dropRate = (this.stats.droppedFrames / this.stats.totalFrames * 100).toFixed(1);
        window.logger.log(`[S] Overall:`);
        window.logger.log(`   FPS: ${fps.toFixed(1)} (avg: ${this.stats.avgFrameTime.toFixed(2)}ms)`);
        window.logger.log(`   Min/Max: ${this.stats.minFrameTime.toFixed(2)}ms / ${this.stats.maxFrameTime.toFixed(2)}ms`);
        window.logger.log(`   Dropped: ${this.stats.droppedFrames} / ${this.stats.totalFrames} (${dropRate}%)`);

        // System timings
        window.logger.log(`\n[S] System Timings (avg over last 60 frames):`);

        for (const [system, timings] of Object.entries(this.systemTimings)) {
            if (timings.length === 0) continue;

            const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
            const max = Math.max(...timings);
            const target = this.targets[system];
            const status = target && avg > target ? '!' : '+';

            window.logger.log(`   ${status} ${system}: ${avg.toFixed(2)}ms (max: ${max.toFixed(2)}ms)${target ? ` [target: ${target}ms]` : ''}`);
        }

        // Performance grade
        window.logger.log(`\n[S] Performance Grade:`);
        if (fps >= 55) {
            window.logger.log(`   + EXCELLENT - Smooth 60fps gameplay!`);
        } else if (fps >= 45) {
            window.logger.log(`   🟡 GOOD - Minor frame drops, playable`);
        } else if (fps >= 30) {
            window.logger.log(`   ! FAIR - Noticeable lag, needs optimization`);
        } else {
            window.logger.log(`   !! POOR - Severe lag, unplayable`);
        }

        window.logger.log('[S] ═══════════════════════════════════════════════════\n');
    }
    
    /**
     * Get current stats
     */
    getStats() {
        return {
            ...this.stats,
            currentFPS: 1000 / this.stats.avgFrameTime,
            systemTimings: Object.fromEntries(
                Object.entries(this.systemTimings).map(([k, v]) => [
                    k,
                    v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0
                ])
            )
        };
    }
    
    /**
     * Reset all stats
     */
    reset() {
        this.frameTimes = [];
        this.stats = {
            totalFrames: 0,
            droppedFrames: 0,
            avgFrameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0
        };
        
        for (const key in this.systemTimings) {
            this.systemTimings[key] = [];
        }

        window.logger.log('@ Performance profiler reset');
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.performanceProfiler = new PerformanceProfiler();
    
    // Expose to Game namespace
    if (!window.Game) window.Game = {};
    window.Game.PerformanceProfiler = PerformanceProfiler;
    
    // Add console commands for easy access
    window.profileOn = () => {
        window.performanceProfiler.setEnabled(true);
        window.performanceProfiler.setVerbose(true);
        window.logger.log('[I] Performance profiling enabled (verbose mode)');
    };

    window.profileOff = () => {
        window.performanceProfiler.setEnabled(false);
        window.logger.log('[I] Performance profiling disabled');
    };
    
    window.profileReport = () => {
        window.performanceProfiler.report();
    };
    
    window.profileReset = () => {
        window.performanceProfiler.reset();
    };
}

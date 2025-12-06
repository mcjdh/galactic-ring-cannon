/**
 * PerformanceManager - Handles device detection and performance optimization
 * Extracted from GameEngine.js to improve maintainability
 */
class SystemPerformanceManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;

        // Performance state
        this.performanceMode = false;
        this.lowGpuMode = false;
        this.lowPerformanceMode = false;
        this._autoLowQualityCosmic = false;
        this._autoParticleLowQuality = false;
        this._manualPerformanceOverride = null;
        this._lastBackgroundQuality = null;
        this._lastBackgroundSwitchTime = 0;
        this._backgroundSwitchBurst = 0;

        // Device info
        this.isRaspberryPi = false;
        this.isLowEndDevice = false;
        this.deviceInfo = '';

        // Initialize
        this._detectDeviceCapabilities();
    }

    /**
     * Detect device capabilities and set initial performance flags
     */
    _detectDeviceCapabilities() {
        const deviceStats = this._detectLowEndDevice();
        this.isRaspberryPi = deviceStats.isRaspberryPi;
        this.isLowEndDevice = deviceStats.isLowEnd;
        this.deviceInfo = deviceStats.deviceInfo;

        if (this.isRaspberryPi) {
            window.logger.info('[Pi] Raspberry Pi detected - enabling optimizations');
            if (typeof window !== 'undefined') window.isRaspberryPi = true;

            this._autoLowQualityCosmic = true;
            this._autoParticleLowQuality = true;
            this.lowGpuMode = true;

            // OPTIMIZED: Apply low-end CSS class for UI performance gains
            if (typeof document !== 'undefined') {
                document.documentElement.classList.add('low-end-device');
            }

            // Ensure Pi-specific subsystems activate immediately
            this._activatePiOptimizations();
        } else if (this.isLowEndDevice) {
            window.logger.info('[P] Low-end device detected - enabling optimizations');
            this._autoLowQualityCosmic = true;
            this._autoParticleLowQuality = true;
            this.lowGpuMode = true;

            if (typeof document !== 'undefined') {
                document.documentElement.classList.add('low-end-device');
            }
        } else {
            // Auto-enable low quality on constrained devices or reduced-motion preference
            this._checkAutoQuality();
        }

        // Apply initial settings
        this.updateQualitySettings();
    }

    /**
     * Activate specific optimizations for Raspberry Pi
     */
    _activatePiOptimizations() {
        if (typeof window === 'undefined') return;

        if (window.performanceProfiler && typeof window.performanceProfiler.setEnabled === 'function') {
            window.performanceProfiler.setEnabled(true);
        }

        // ProjectileRenderer might not be loaded yet, but if it is:
        const ProjectileRenderer = window.ProjectileRenderer || window.Game?.ProjectileRenderer;
        if (ProjectileRenderer && typeof ProjectileRenderer.applyPi5GpuLimits === 'function') {
            ProjectileRenderer.applyPi5GpuLimits();
        }

        if (window.gpuMemoryManager && typeof window.gpuMemoryManager.enable === 'function') {
            window.gpuMemoryManager.enable();
        }

        if (typeof window.initTrigCache === 'function') {
            window.trigCache = window.trigCache || window.initTrigCache();
        }

        if (window.FastMath && typeof window.FastMath.installGlobals === 'function') {
            window.FastMath.installGlobals();
        }

        // Enemy AI optimizations (cache lifetime)
        if (window.Game?.EnemyAI && window.Game.EnemyAI.prototype) {
            window.Game.EnemyAI.prototype._pi5OptimizationApplied = true;
        }
    }

    /**
     * Check for reduced motion or low power mode
     */
    _checkAutoQuality() {
        try {
            const prefersReducedMotion = typeof window !== 'undefined'
                && typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            const hardwareConcurrency = typeof navigator !== 'undefined'
                ? navigator.hardwareConcurrency
                : undefined;
            const deviceMemory = typeof navigator !== 'undefined'
                ? navigator.deviceMemory
                : undefined;

            const lowPowerDevice =
                (typeof hardwareConcurrency === 'number' && hardwareConcurrency > 0 && hardwareConcurrency <= 2) ||
                (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 2);

            const autoLowQuality = prefersReducedMotion || lowPowerDevice;

            this._autoLowQualityCosmic = !!autoLowQuality;
            this._autoParticleLowQuality = !!autoLowQuality;
        } catch (autoQualityError) {
            window.logger.warn('Auto quality adjustment failed', autoQualityError);
        }
    }

    /**
     * Detect Raspberry Pi and low-end devices
     */
    _detectLowEndDevice() {
        const result = {
            isRaspberryPi: false,
            isLowEnd: false,
            deviceInfo: ''
        };

        try {
            if (typeof navigator === 'undefined') return result;

            const ua = navigator.userAgent.toLowerCase();
            const platform = (navigator.platform || '').toLowerCase();

            // Check for ARM architecture
            const isARM = /arm|aarch64/.test(platform) || /arm|aarch64/.test(ua);
            const isLinux = /linux/.test(platform) || /linux/.test(ua);

            // Check GPU renderer
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            let gpu = '';

            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                }
            }

            // Raspberry Pi detection
            result.isRaspberryPi = isARM && isLinux && (
                /mali|videocore|broadcom|v3d/i.test(gpu) ||
                /raspberry/i.test(ua)
            );

            // Other low-end indicators
            const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
            const hasLowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
            // Note: 'mesa' is the standard Linux OpenGL stack, NOT a low-end indicator
            // Only flag Intel integrated graphics as low-end when combined with low memory
            const hasWeakIntegratedGPU = /intel.*hd|intel.*uhd|swiftshader/i.test(gpu) && hasLowMemory;

            result.isLowEnd = !result.isRaspberryPi && (
                (hasLowMemory && hasLowCores) ||
                /android/i.test(ua) ||
                hasWeakIntegratedGPU
            );

            result.deviceInfo = `Platform: ${platform}, GPU: ${gpu || 'unknown'}`;

        } catch (error) {
            window.logger.warn('Device detection failed:', error);
        }

        return result;
    }

    /**
     * Update all quality settings based on current state
     */
    updateQualitySettings() {
        this._updateParticleQuality();
        this._applyBackgroundQuality();
    }

    _updateParticleQuality() {
        const manualOverride = this._manualPerformanceOverride;
        let shouldEnable;

        if (manualOverride === 'on') {
            shouldEnable = true;
        } else if (manualOverride === 'off') {
            shouldEnable = false;
        } else {
            shouldEnable = !!(this.lowGpuMode || this._autoParticleLowQuality);
        }

        this.lowPerformanceMode = shouldEnable;

        if (typeof window !== 'undefined' && window.optimizedParticles && typeof window.optimizedParticles.setLowQuality === 'function') {
            window.optimizedParticles.setLowQuality(shouldEnable);

            // Pi5 specific particle limits
            if (this.isRaspberryPi && shouldEnable) {
                window.optimizedParticles.maxParticles = 80;
                window.optimizedParticles.densityMultiplier = 0.5;
            }
        }

        if (typeof window !== 'undefined' && window.gameManager) {
            window.gameManager.lowPerformanceMode = shouldEnable;
        }
    }

    _applyBackgroundQuality() {
        // [STABILITY FIX] Increased debounce from 1s to 3s to prevent startup flickering
        // This ensures background quality doesn't flip-flop during JIT warmup
        const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();

        // Initialize _lastApplyTime if needed
        if (!this._lastApplyTime) this._lastApplyTime = 0;
        if (now - this._lastApplyTime < 3000) {
            return;
        } // Enforce hard debounce on applying settings

        // Access cosmic background from game engine or global
        const cosmicBackground = this.gameEngine?.cosmicBackground || (typeof window !== 'undefined' ? window.cosmicBackground : null);

        if (!cosmicBackground || typeof cosmicBackground.setLowQuality !== 'function') {
            return;
        }

        // Pi specific mode
        if (this.isRaspberryPi && typeof cosmicBackground.enablePi5Mode === 'function') {
            cosmicBackground.enablePi5Mode();
        }

        const manualOverride = this._manualPerformanceOverride;
        let shouldUseLowQuality;

        if (manualOverride === 'on') {
            shouldUseLowQuality = true;
        } else if (manualOverride === 'off') {
            shouldUseLowQuality = false;
        } else {
            shouldUseLowQuality = !!(this.lowGpuMode || this._autoLowQualityCosmic);
        }

        const debugEnabled = this.gameEngine?.debugMode || (typeof window !== 'undefined' && window.logger?.debug);
        if (debugEnabled) {
            window.logger.log(`[R] _applyBackgroundQuality: lowGpuMode=${this.lowGpuMode}, _autoLowQualityCosmic=${this._autoLowQualityCosmic}, override=${manualOverride}, result=${shouldUseLowQuality}`);
        }

        // Detect rapid flipping between quality states for diagnostics
        if (shouldUseLowQuality !== this._lastBackgroundQuality) {
            const timeSinceLastSwitch = now - this._lastBackgroundSwitchTime;
            if (timeSinceLastSwitch < 2000) {
                this._backgroundSwitchBurst += 1;
                // Only warn if we haven't warned recently? 
                // With the new debounce above, this branch should be harder to hit unless updateQualitySettings is called repeatedly with DIFFERENT results
                if (this._backgroundSwitchBurst >= 3 && window.logger?.warn) {
                    window.logger.warn(`[R] CosmicBackground quality flapped ${this._backgroundSwitchBurst} times in ${(timeSinceLastSwitch).toFixed(0)}ms`);
                }
            } else {
                this._backgroundSwitchBurst = 1;
            }
            this._lastBackgroundSwitchTime = now;
            this._lastBackgroundQuality = shouldUseLowQuality;

            // Apply change
            cosmicBackground.setLowQuality(shouldUseLowQuality);
            this._lastApplyTime = now;
        } else {
            // Re-apply to ensure consistency even if state matches (idempotent usually)
            // But we respect debounce, so we skip if redundant? No, idempotent is safe.
            cosmicBackground.setLowQuality(shouldUseLowQuality);
        }
    }

    /**
     * Set manual performance override
     * @param {string|null} value 'on', 'off', or null (auto)
     */
    setPerformanceOverride(value) {
        this._manualPerformanceOverride = value;

        if (value === 'on') {
            this.performanceMode = true;
            this.lowGpuMode = true;
            if (typeof document !== 'undefined') document.documentElement.classList.add('low-end-device');
        } else if (value === 'off') {
            this.performanceMode = false;
            this.lowGpuMode = false;
            if (typeof document !== 'undefined') document.documentElement.classList.remove('low-end-device');
        } else {
            // Reset to auto-detected values
            this.performanceMode = false;
            // Don't reset lowGpuMode here, let _detectDeviceCapabilities handle it or keep existing
        }

        this.updateQualitySettings();
    }

    /**
     * Reset for new run
     */
    reset() {
        // Preserve auto-detected settings unless manually overridden
        if (this._manualPerformanceOverride === 'on') {
            this.performanceMode = true;
            this.lowGpuMode = true;
        } else if (this._manualPerformanceOverride === 'off') {
            this.performanceMode = false;
            this.lowGpuMode = false;
            if (typeof document !== 'undefined') document.documentElement.classList.remove('low-end-device');
        } else {
            this.performanceMode = false;
            // Keep auto-detected lowGpuMode
        }

        this.lowPerformanceMode = false;
        this.updateQualitySettings();
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.SystemPerformanceManager = SystemPerformanceManager;
}

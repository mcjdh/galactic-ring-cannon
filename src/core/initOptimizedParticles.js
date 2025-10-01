(function() {
    function initOptimizedParticles() {
        if (typeof OptimizedParticlePool !== 'undefined') {
            window.optimizedParticles = new OptimizedParticlePool(150);
            (window.logger?.log || console.log)('OptimizedParticlePool initialized');
        } else {
            (window.logger?.warn || console.warn)('OptimizedParticlePool not available');
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initOptimizedParticles, { once: true });
    } else {
        initOptimizedParticles();
    }
})();

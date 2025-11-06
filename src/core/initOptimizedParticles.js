(function() {
    function initOptimizedParticles() {
        const OptimizedParticlePool = window.Game?.OptimizedParticlePool;
        if (typeof OptimizedParticlePool === 'function') {
            window.optimizedParticles = new OptimizedParticlePool(150);
            window.logger.log('OptimizedParticlePool initialized');
        } else {
            window.logger.warn('OptimizedParticlePool not available');
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initOptimizedParticles, { once: true });
    } else {
        initOptimizedParticles();
    }
})();

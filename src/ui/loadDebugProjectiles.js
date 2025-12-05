(function() {
    const params = window.urlParams;
    const shouldLoad = params?.has('debug') || params?.has('debugProjectiles');
    if (!shouldLoad) {
        return;
    }

    const script = document.createElement('script');
    // Script is in scripts/debug/ relative to project root
    script.src = 'scripts/debug/debug-projectiles.js';
    script.defer = true;
    script.onerror = () => {
        window.logger?.warn?.('Failed to load debug-projectiles.js');
    };
    document.head.appendChild(script);
})();

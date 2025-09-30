(function() {
    const params = window.urlParams;
    const shouldLoad = params?.has('debug') || params?.has('debugProjectiles');
    if (!shouldLoad) {
        return;
    }

    const script = document.createElement('script');
    script.src = 'debug-projectiles.js';
    script.defer = true;
    document.head.appendChild(script);
})();

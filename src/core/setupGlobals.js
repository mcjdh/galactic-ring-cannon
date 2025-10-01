(function() {
    let assigned = false;

    function log(...args) {
        (window.logger?.log || console.log)(...args);
    }

    function error(...args) {
        (window.logger?.error || console.error)(...args);
    }

    function assignGlobals() {
        if (assigned) {
            return true;
        }

        const coreReady = typeof Player !== 'undefined'
            && typeof GameEngine !== 'undefined'
            && typeof Particle !== 'undefined';

        if (!coreReady) {
            return false;
        }

        log('All scripts loaded. Checking class availability...');
        log('Player class available:', typeof Player !== 'undefined');
        log('GameEngine class available:', typeof GameEngine !== 'undefined');
        log('Enemy class available:', typeof Enemy !== 'undefined');
        log('Projectile class available:', typeof Projectile !== 'undefined');

        try {
            const testPlayer = new Player(0, 0);
            log('Player instantiation test: SUCCESS');
            if (typeof testPlayer.destroy === 'function') {
                testPlayer.destroy();
            }
        } catch (e) {
            error('Player instantiation test: FAILED', e);
        }

        window.Player = Player;
        window.GameEngine = GameEngine;
        if (typeof Enemy !== 'undefined') window.Enemy = Enemy;
        if (typeof Projectile !== 'undefined') window.Projectile = Projectile;
        if (typeof XPOrb !== 'undefined') window.XPOrb = XPOrb;
        window.Particle = typeof Particle !== 'undefined' ? Particle : window.Particle;

        log('Class references set on window object');
        assigned = true;
        return true;
    }

    function attemptAssign() {
        if (!assignGlobals()) {
            window.addEventListener('load', assignGlobals, { once: true });
        }
    }

    if (document.readyState === 'complete') {
        assignGlobals();
    } else if (document.readyState === 'interactive') {
        setTimeout(attemptAssign, 0);
    } else {
        document.addEventListener('DOMContentLoaded', attemptAssign, { once: true });
    }

    window.addEventListener('load', assignGlobals, { once: true });
})();

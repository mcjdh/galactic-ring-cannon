/**
 * Legacy-friendly ProjectileBehaviorManager used by lightweight unit tests.
 * This intentionally implements a minimal API surface (add/remove/has/get)
 * and is NOT tied to the full behavior system under src/entities/projectile/behaviors.
 */
class SimpleProjectileBehaviorManager {
    constructor(projectile) {
        this.projectile = projectile;
        this._behaviors = new Map();
    }

    addBehavior(type, config = {}) {
        if (!type || typeof type !== 'string') {
            return;
        }
        const normalized = type.toLowerCase();
        this._behaviors.set(normalized, { ...config });
    }

    hasBehavior(type) {
        if (!type || typeof type !== 'string') {
            return false;
        }
        return this._behaviors.has(type.toLowerCase());
    }

    getBehaviorConfig(type) {
        if (!type || typeof type !== 'string') {
            return undefined;
        }
        const config = this._behaviors.get(type.toLowerCase());
        return config ? { ...config } : undefined;
    }

    removeBehavior(type) {
        if (!type || typeof type !== 'string') {
            return;
        }
        this._behaviors.delete(type.toLowerCase());
    }
}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.ProjectileBehaviorManager = SimpleProjectileBehaviorManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleProjectileBehaviorManager;
}

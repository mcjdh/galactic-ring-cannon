// UnifiedCollisionSystem: thin alias/wrapper around CollisionSystem for compatibility
// Loads in non-module context and exposes a single unified entrypoint the engine prefers
(function () {
    try {
        if (typeof window !== 'undefined' && window.CollisionSystem) {
            // Provide a named class for clarity in stack traces
            class UnifiedCollisionSystem extends window.CollisionSystem {
                constructor(engine) {
                    super(engine);
                }
            }
            window.UnifiedCollisionSystem = UnifiedCollisionSystem;
        }
    } catch (e) {
        // Fallback: leave undefined; engine will gracefully fall back
    }
})();


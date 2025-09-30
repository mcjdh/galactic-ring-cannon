/**
 * BehaviorBase - Base class for all projectile behaviors
 * Each behavior represents one upgrade/ability (piercing, ricochet, explosive, etc.)
 *
 * 🌊 RESONANT PATTERN: Composition over flags
 * Instead of hasExplosive, hasPiercing flags, we have behavior objects
 */
class ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        this.projectile = projectile;
        this.config = config;
        this.enabled = true;
    }

    /**
     * Called every frame during projectile update
     * @param {number} deltaTime - Time since last frame
     * @param {object} game - Game engine reference
     */
    update(deltaTime, game) {
        // Override in subclasses if behavior needs per-frame logic
    }

    /**
     * Called when projectile hits an enemy
     * @param {object} target - Enemy that was hit
     * @param {object} engine - Game engine reference
     * @returns {boolean} - True if hit was processed, false if should be ignored
     */
    onHit(target, engine) {
        // Override in subclasses for on-hit effects (e.g., chain lightning)
        return true;
    }

    /**
     * Called when checking if projectile should die after hit
     * @param {object} target - Enemy that was hit
     * @param {object} engine - Game engine reference
     * @returns {boolean} - True if projectile should continue living, false if should die
     */
    preventsDeath(target, engine) {
        // Override in subclasses for death-preventing behaviors (e.g., piercing)
        return false;
    }

    /**
     * Called when projectile is about to die
     * Last chance to keep projectile alive (e.g., ricochet)
     * @param {object} target - Enemy that caused death (if any)
     * @param {object} engine - Game engine reference
     * @returns {boolean} - True if death was prevented, false if projectile should die
     */
    onDeath(target, engine) {
        // Override in subclasses for death-triggered effects or revival (e.g., ricochet, explosive)
        return false;
    }

    /**
     * Called when behavior is first added to projectile
     */
    onAdd() {
        // Override if needed
    }

    /**
     * Called when behavior is removed from projectile
     */
    onRemove() {
        // Override if needed
    }

    /**
     * Get behavior type name
     */
    getType() {
        return this.constructor.name.replace('Behavior', '').toLowerCase();
    }

    /**
     * Disable this behavior
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Enable this behavior
     */
    enable() {
        this.enabled = true;
    }
}
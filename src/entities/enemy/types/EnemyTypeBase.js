/**
 * EnemyTypeBase - Base configuration for enemy types
 * All enemy type classes extend this to provide their specific stats and behaviors
 */
class EnemyTypeBase {
    /**
     * Get the configuration for this enemy type
     * Override this in subclasses to provide type-specific stats
     */
    static getConfig() {
        return {
            // Visual
            radius: 15,
            color: '#e74c3c',

            // Stats
            health: 30,
            damage: 10,
            xpValue: 10,
            baseSpeed: 90,

            // Special properties
            damageReduction: 0,
            damageResistance: 0,
            deflectChance: 0,

            // Flags
            isBoss: false,
            isElite: false,
            hasPhases: false,

            // Type identifier
            enemyType: 'basic'
        };
    }

    /**
     * Apply type-specific configuration to enemy instance
     * Override this if you need custom initialization logic
     */
    static configure(enemy) {
        const config = this.getConfig();
        Object.assign(enemy, config);
        enemy.maxHealth = config.health;
    }

    /**
     * Configure AI for this enemy type
     * Override to customize AI behavior
     */
    static configureAI(enemy) {
        // Default: delegate to enemy components
        if (enemy.ai && typeof enemy.ai.configureForEnemyType === 'function') {
            enemy.ai.configureForEnemyType(this.getConfig().enemyType);
        }
    }

    /**
     * Configure abilities for this enemy type
     * Override to customize abilities
     */
    static configureAbilities(enemy) {
        // Default: delegate to enemy components
        if (enemy.abilities && typeof enemy.abilities.configureForEnemyType === 'function') {
            enemy.abilities.configureForEnemyType(this.getConfig().enemyType);
        }
    }

    /**
     * Configure movement for this enemy type
     * Override to customize movement
     */
    static configureMovement(enemy) {
        // Default: delegate to enemy components
        if (enemy.movement && typeof enemy.movement.configureForEnemyType === 'function') {
            enemy.movement.configureForEnemyType(this.getConfig().enemyType);
        }
    }
}
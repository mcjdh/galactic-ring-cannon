/**
 * EnemyTypeRegistry - Central registry for all enemy types
 * Maps enemy type strings to their configuration classes
 *
 * 🌊 RESONANT PATTERN: Adding new enemy types
 * 1. Create new class in types/ folder extending EnemyTypeBase
 * 2. Add to registry below
 * 3. That's it! The enemy system handles the rest
 */

class EnemyTypeRegistry {
    static types = {
        'basic': BasicEnemy,
        'fast': FastEnemy,
        'tank': TankEnemy,
        'ranged': RangedEnemy,
        'dasher': DasherEnemy,
        'exploder': ExploderEnemy,
        'splitter': SplitterEnemy,
        'healer': HealerEnemy,
        'teleporter': TeleporterEnemy,
        'phantom': PhantomEnemy,
        'shielder': ShielderEnemy,
        'summoner': SummonerEnemy,
        'berserker': BerserkerEnemy,
        'minion': MinionEnemy,
        'boss': BossEnemy
    };

    /**
     * Get enemy type class for a given type string
     */
    static getType(typeString) {
        return this.types[typeString] || BasicEnemy;
    }

    /**
     * Check if a type exists
     */
    static hasType(typeString) {
        return this.types.hasOwnProperty(typeString);
    }

    /**
     * Get all available enemy types
     */
    static getAllTypes() {
        return Object.keys(this.types);
    }

    /**
     * Register a new enemy type (for mods/extensions)
     */
    static registerType(typeString, typeClass) {
        if (!typeClass || typeof typeClass.getConfig !== 'function') {
            window.logger.error(`Cannot register enemy type '${typeString}': Invalid type class`);
            return false;
        }

        this.types[typeString] = typeClass;
        return true;
    }
}

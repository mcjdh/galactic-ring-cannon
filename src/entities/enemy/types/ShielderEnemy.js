/**
 * ShielderEnemy - Support enemy with deflection and shielding mechanics
 * Can deflect projectiles and create protective fields
 * 🌊 NEW ENEMY TYPE - Adds tactical depth to combat
 */
class ShielderEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 18,
            color: '#3498db',
            health: 60,
            damage: 15,
            xpValue: 40,
            baseSpeed: 80,
            deflectChance: 0.3,
            enemyType: 'shielder'
        };
    }

    /**
     * Configure abilities for shielder
     * Shielders have periodic shield activation
     */
    static configureAbilities(enemy) {
        super.configureAbilities(enemy);

        // Add shield-specific properties
        if (enemy.abilities) {
            enemy.abilities.shieldCooldown = 0;
            enemy.abilities.shieldDuration = 3000; // 3 seconds
            enemy.abilities.shieldInterval = 8000; // Every 8 seconds
            enemy.abilities.shieldReflection = 0.5; // 50% chance to reflect when shielded
        }
    }
}
/**
 * HealerEnemy - Support enemy that heals nearby allies
 * Low health, prioritizes staying back and healing damaged enemies
 */
class HealerEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 16,
            color: '#2ecc71',  // Green
            health: 50,
            damage: 8,
            xpValue: 55,
            baseSpeed: 75,
            enemyType: 'healer'
        };
    }
}

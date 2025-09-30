/**
 * BasicEnemy - Standard balanced enemy type
 * The most common enemy with balanced stats
 */
class BasicEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 15,
            color: '#e74c3c',
            health: 30,
            damage: 10,
            xpValue: 10,
            baseSpeed: 90,
            enemyType: 'basic'
        };
    }
}
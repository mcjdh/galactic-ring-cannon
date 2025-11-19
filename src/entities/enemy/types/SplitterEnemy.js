/**
 * SplitterEnemy - Divides into smaller enemies on death
 * Medium health, splits into 3 fast mini-splitters when killed
 */
class SplitterEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 22,
            color: '#9b59b6',  // Purple
            health: 65,
            damage: 15,
            xpValue: 45,
            baseSpeed: 85,
            enemyType: 'splitter'
        };
    }
}

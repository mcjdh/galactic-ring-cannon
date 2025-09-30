/**
 * ExploderEnemy - Suicide bomber enemy
 * Explodes on death dealing area damage
 */
class ExploderEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 18,
            color: '#d35400',
            health: 40,
            damage: 25,
            xpValue: 35,
            baseSpeed: 100,
            enemyType: 'exploder'
        };
    }
}
/**
 * DasherEnemy - High-speed charging enemy
 * Periodically dashes at high speed toward the player
 */
class DasherEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 13,
            color: '#c0392b',
            health: 30,
            damage: 15,
            xpValue: 25,
            baseSpeed: 220,
            enemyType: 'dasher'
        };
    }
}
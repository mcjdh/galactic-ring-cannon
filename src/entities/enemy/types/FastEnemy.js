/**
 * FastEnemy - High speed, low health swarm enemy
 * Rushes the player in groups, easy to kill but overwhelming in numbers
 */
class FastEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 12,
            color: '#f39c12',
            health: 20,
            damage: 5,
            xpValue: 15,
            baseSpeed: 170,
            enemyType: 'fast'
        };
    }
}
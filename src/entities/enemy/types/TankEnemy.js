/**
 * TankEnemy - High health, high damage, slow movement
 * A significant threat that requires focus fire to take down
 */
class TankEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 25,
            color: '#8e44ad',
            health: 110,
            damage: 20,
            xpValue: 30,
            baseSpeed: 45,
            enemyType: 'tank'
        };
    }
}
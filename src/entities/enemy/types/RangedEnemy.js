/**
 * RangedEnemy - Projectile-based attacker
 * Keeps distance and shoots at the player
 */
class RangedEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 14,
            color: '#16a085',
            health: 25,
            damage: 8,
            xpValue: 20,
            baseSpeed: 70,
            enemyType: 'ranged'
        };
    }
}
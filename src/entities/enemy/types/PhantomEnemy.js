/**
 * PhantomEnemy - Phasing enemy
 * Can become intangible/invisible periodically
 */
class PhantomEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 14,
            color: 'rgba(108, 92, 231, 0.7)',
            health: 20,
            damage: 8,
            xpValue: 25,
            baseSpeed: 135,
            enemyType: 'phantom'
        };
    }
}
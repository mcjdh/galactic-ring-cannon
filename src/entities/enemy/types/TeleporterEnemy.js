/**
 * TeleporterEnemy - Mobility-focused enemy
 * Can teleport short distances, making it hard to hit
 */
class TeleporterEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 16,
            color: '#9b59b6',
            health: 35,
            damage: 12,
            xpValue: 30,
            baseSpeed: 80, // Slower since they can teleport
            enemyType: 'teleporter'
        };
    }
}
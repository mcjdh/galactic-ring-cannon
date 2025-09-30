/**
 * BossEnemy - Powerful multi-phase boss
 * Large health pool, multiple phases, various attack patterns
 */
class BossEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 35,
            color: '#c0392b',
            health: 600,
            damage: 30,
            xpValue: 200,
            baseSpeed: 60,
            damageResistance: 0.2,
            isBoss: true,
            hasPhases: true,
            enemyType: 'boss'
        };
    }

    static configure(enemy) {
        super.configure(enemy);

        // Boss-specific setup
        enemy.phaseThresholds = [0.7, 0.4, 0.15];
        enemy.setupBossAttackPatterns();
    }
}
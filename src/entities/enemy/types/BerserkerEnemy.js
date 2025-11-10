/**
 * BerserkerEnemy - Late-game bruiser that enrages under low health
 * Gains speed and damage when below a health threshold.
 */
class BerserkerEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            radius: 17,
            color: '#c0392b',
            glowColor: '#f39c12',
            health: 80,
            damage: 18,
            xpValue: 45,
            baseSpeed: 110,
            damageReduction: 0.05,
            enemyType: 'berserker'
        };
    }

    static configure(enemy) {
        super.configure(enemy);

        enemy.berserkerThreshold = 0.45; // 45% health
        enemy._berserkerBaseDamage = enemy.damage;
        enemy._berserkerBaseSpeed = enemy.baseSpeed;
        enemy._berserkerBaseColor = enemy.color;
        enemy.isEnraged = false;

        enemy._updateBerserkerRage = (forceCheck = false) => {
            if (!enemy.maxHealth) return;
            const healthPercent = enemy.health / enemy.maxHealth;
            const shouldEnrage = healthPercent <= enemy.berserkerThreshold;

            if (!forceCheck && shouldEnrage === enemy.isEnraged) {
                return;
            }

            enemy.isEnraged = shouldEnrage;
            if (shouldEnrage) {
                enemy.damage = Math.ceil(enemy._berserkerBaseDamage * 1.35);
                enemy.baseSpeed = enemy._berserkerBaseSpeed * 1.25;
                enemy.color = '#ff6b35';
                enemy.glowColor = '#ffa94d';
                enemy.pulseIntensity = 1.4;
            } else {
                enemy.damage = enemy._berserkerBaseDamage;
                enemy.baseSpeed = enemy._berserkerBaseSpeed;
                enemy.color = enemy._berserkerBaseColor;
                enemy.glowColor = '#f39c12';
                enemy.pulseIntensity = 1.0;
            }
        };

        const originalOnTakeDamage = enemy.onTakeDamage?.bind(enemy);
        enemy.onTakeDamage = function(amount) {
            if (typeof originalOnTakeDamage === 'function') {
                originalOnTakeDamage(amount);
            }
            this._updateBerserkerRage?.();
        };

        enemy._updateBerserkerRage(true);
    }

    static configureAI(enemy) {
        super.configureAI(enemy);
        if (enemy.ai) {
            enemy.ai.isAggressive = true;
            enemy.ai.maxTargetDistance = 1000;
        }
    }
}

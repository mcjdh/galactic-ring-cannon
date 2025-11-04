/**
 * MinionEnemy - Spawned by Summoner enemies
 * Weak, fast, and disposable - designed to overwhelm in numbers
 */
class MinionEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            // Visual - small and dark purple
            radius: 8, // Smaller than basic enemies
            color: 'rgba(147, 87, 177, 0.7)', // Darker purple
            
            // Stats - weak but fast
            health: 12, // Dies in 1-2 hits
            damage: 6, // Low damage
            xpValue: 5, // Low XP reward
            baseSpeed: 140, // Fast movement
            
            // Type identifier
            enemyType: 'minion'
        };
    }
    
    /**
     * Configure AI for aggressive swarming
     */
    static configureAI(enemy) {
        super.configureAI(enemy);
        
        if (enemy.ai) {
            // Minions are very aggressive and chase relentlessly
            enemy.ai.aggressionLevel = 1.2; // Extra aggressive
            enemy.ai.keepDistanceFromPlayer = false;
        }
    }
    
    /**
     * Configure movement for erratic behavior
     */
    static configureMovement(enemy) {
        super.configureMovement(enemy);
        
        if (enemy.movement) {
            // Minions move in slightly erratic patterns
            enemy.movement.wobbleAmount = 0.3;
        }
    }
}

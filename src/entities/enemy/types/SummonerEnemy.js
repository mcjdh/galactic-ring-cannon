/**
 * SummonerEnemy - Summoning enemy type
 * Spawns weaker minion enemies periodically
 * Strategic target - kill summoners first to prevent being overwhelmed!
 */
class SummonerEnemy extends EnemyTypeBase {
    static getConfig() {
        return {
            // Visual - mystical purple/magenta theme
            radius: 18,
            color: window.GAME_CONSTANTS?.COLORS?.SUMMONER || 'rgba(187, 107, 217, 0.85)', // Purple glow
            glowColor: window.GAME_CONSTANTS?.COLORS?.SUMMONER_GLOW || 'rgba(187, 107, 217, 0.5)', // Mystic purple glow
            
            // Stats - tanky but slow
            health: 45,
            damage: 8,
            xpValue: 35, // High reward for killing summoners
            baseSpeed: 70, // Slower than basic enemies
            
            // Defensive capabilities
            damageReduction: 0.1, // 10% damage reduction
            
            // Visual effects - make them stand out
            isElite: false, // Not elite, but we'll use glow effects
            
            // Type identifier
            enemyType: 'summoner'
        };
    }
    
    /**
     * Configure summoning abilities
     */
    static configureAbilities(enemy) {
        super.configureAbilities(enemy);
        
        if (enemy.abilities) {
            // Enable minion spawning
            enemy.abilities.canSpawnMinions = true;
            enemy.abilities.spawnMinionCooldown = 6.0; // Spawn every 6 seconds
            // Countdown timer (in seconds) until next minion spawn. Initialized to 2.0 for an initial 2-second delay before the first spawn. Timer counts down to zero; after each spawn, it resets to the cooldown value.
            enemy.abilities.spawnMinionTimer = 2.0;
            enemy.abilities.minionCount = 2; // Spawn 2 minions at a time
            enemy.abilities.minionTypes = ['minion']; // Only spawn minion type
            enemy.abilities.maxMinionsAlive = 4; // Don't spam too many
        }
    }
    
    /**
     * Configure AI to stay at medium range
     */
    static configureAI(enemy) {
        super.configureAI(enemy);
        
        if (enemy.ai) {
            // Summoners prefer to keep distance while spawning
            enemy.ai.preferredDistance = 150; // Stay at medium range
            enemy.ai.keepDistanceFromPlayer = true;
        }
    }
    
    /**
     * Apply type-specific configuration with visual enhancements
     */
    static configure(enemy) {
        super.configure(enemy);
        
        // Add subtle pulsing effect to make summoners visually distinct
        enemy.pulseIntensity = 1.0;
        enemy.pulseSpeed = 2.0; // Pulse faster than bosses
        
        // Ensure glow color is set for visual effect
        if (!enemy.glowColor) {
            enemy.glowColor = window.GAME_CONSTANTS?.COLORS?.SUMMONER_GLOW || 'rgba(187, 107, 217, 0.5)';
        }
    }
}

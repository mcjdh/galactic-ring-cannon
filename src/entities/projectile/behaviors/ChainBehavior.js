/**
 * ChainBehavior - Chains electricity to nearby enemies on hit
 * This is an on-hit effect
 */
class ChainBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.maxChains = config.maxChains || 2;
        this.chainsUsed = 0;
        this.range = config.range || 180;
        this.damageMultiplier = config.damageMultiplier || 0.75;
        this.chainedEnemies = new Set(); // Track who we've chained to
    }

    /**
     * Trigger chain lightning on hit
     */
    onHit(target, engine) {
        if (this.chainsUsed >= this.maxChains) return true; // No more chains
        if (this.chainedEnemies.has(target.id)) return true; // Already chained this enemy

        this.chainedEnemies.add(target.id);
        this._chainToNearby(target, engine);

        return true;
    }

    /**
     * Chain to nearby enemy
     */
    _chainToNearby(fromEnemy, engine) {
        const enemies = engine?.enemies || [];
        if (enemies.length === 0) return;

        // Find nearest unchained enemy
        let nearest = null;
        let minDist = this.range;

        for (const enemy of enemies) {
            if (!enemy || enemy.isDead) continue;
            if (enemy === fromEnemy) continue;
            if (this.chainedEnemies.has(enemy.id)) continue;

            const dx = enemy.x - fromEnemy.x;
            const dy = enemy.y - fromEnemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        if (nearest) {
            // Apply chain damage
            const chainDamage = this.projectile.damage * this.damageMultiplier;

            if (typeof nearest.takeDamage === 'function') {
                nearest.takeDamage(Math.max(1, chainDamage));
            }

            this.chainedEnemies.add(nearest.id);
            this.chainsUsed++;

            // Visual lightning effect
            this._createLightningVisual(fromEnemy, nearest);

            // Show damage
            if (window.gameEngine?.unifiedUI) {
                window.gameEngine.unifiedUI.addDamageNumber(
                    Math.round(chainDamage),
                    nearest.x,
                    nearest.y,
                    false
                );
            }

            // Audio (use 'hit' sound since 'chain' doesn't exist)
            if (window.audioSystem?.play) {
                window.audioSystem.play('hit', 0.25);
            }

            if (window.debugProjectiles) {
                console.log(`[ChainBehavior] Projectile ${this.projectile.id} chained to enemy ${nearest.id}. Chains: ${this.chainsUsed}/${this.maxChains}`);
            }
        }
    }

    /**
     * Create lightning particle effect between enemies
     */
    _createLightningVisual(from, to) {
        if (!window.optimizedParticles) return;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.ceil(dist / 12); // More segments

        // Bright core bolt - stays longest
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = from.x + dx * t;
            const y = from.y + dy * t;

            window.optimizedParticles.spawnParticle({
                x: x,
                y: y,
                vx: 0,
                vy: 0,
                size: 7,
                color: '#ffffff',
                life: 0.4,
                type: 'spark'
            });
        }

        // Purple lightning segments - longer life
        for (let i = 0; i < segments * 2; i++) {
            const t = i / (segments * 2);
            const x = from.x + dx * t;
            const y = from.y + dy * t;

            const perpX = -dy / dist;
            const perpY = dx / dist;
            const offset = (Math.random() - 0.5) * 25;

            window.optimizedParticles.spawnParticle({
                x: x + perpX * offset,
                y: y + perpY * offset,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                size: 5,
                color: '#a29bfe',
                life: 0.5, // Much longer!
                type: 'lightning'
            });
        }

        // Impact explosion at target
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            window.optimizedParticles.spawnParticle({
                x: to.x,
                y: to.y,
                vx: Math.cos(angle) * 120,
                vy: Math.sin(angle) * 120,
                size: 6,
                color: '#6c5ce7',
                life: 0.6,
                type: 'spark'
            });
        }

        // Source burst
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            window.optimizedParticles.spawnParticle({
                x: from.x,
                y: from.y,
                vx: Math.cos(angle) * 90,
                vy: Math.sin(angle) * 90,
                size: 5,
                color: '#dfe6e9',
                life: 0.5,
                type: 'spark'
            });
        }
    }
}
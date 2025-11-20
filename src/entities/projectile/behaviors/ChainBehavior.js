/**
 * ChainBehavior - Chains electricity to nearby enemies on hit
 * This is an on-hit effect
 * 
 * CHAIN COUNT LOGIC:
 * - maxChains represents TOTAL enemies that can be affected (including initial hit)
 * - Example: maxChains=2 means hit initial enemy + chain to 1 more = 2 total
 * - Example: maxChains=4 means hit initial enemy + chain to 3 more = 4 total
 * - Example: maxChains=6 means hit initial enemy + chain to 5 more = 6 total
 * 
 * Upgrade descriptions align with this:
 * - "Chain Lightning" (maxChains: 2) → "can chain to a nearby enemy" (1+1=2)
 * - "Improved Chains" (maxChains: 4) → "can hit four targets" (1+3=4)
 * - "Storm Chains" (maxChains: 6) → "can hit six targets" (1+5=6)
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
        if (this.chainsUsed >= this.maxChains) {
            if (window.debugProjectiles) {
                window.logger.log(`[ChainBehavior] Projectile ${this.projectile.id} already at maxChains (${this.chainsUsed}/${this.maxChains}), ignoring hit on ${target.id}`);
            }
            return true; // No more chains
        }
        if (this.chainedEnemies.has(target.id)) {
            if (window.debugProjectiles) {
                window.logger.log(`[ChainBehavior] Projectile ${this.projectile.id} already chained to ${target.id}, ignoring`);
            }
            return true; // Already chained this enemy
        }

        this.chainedEnemies.add(target.id);
        this.chainsUsed++; // Count the initial hit!

        if (window.debugProjectiles) {
            window.logger.log(`[ChainBehavior] Projectile ${this.projectile.id} hit enemy ${target.id}. Chains used: ${this.chainsUsed}/${this.maxChains}`);
        }

        // Only chain further if we have chains left
        if (this.chainsUsed < this.maxChains) {
            this._chainToNearby(target, engine);
        }

        return true;
    }

    /**
     * Called when projectile is destroyed - track achievement
     */
    onDestroy(engine) {
        // Report total enemies hit (initial hit + chains) for achievement tracking
        const totalHits = this.chainedEnemies.size;
        if (totalHits > 0) {
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm?.onChainLightningHit) {
                gm.onChainLightningHit(totalHits);
            }
        }
    }

    /**
     * Chain to nearby enemies iteratively (prevents stack overflow)
     */
    _chainToNearby(startEnemy, engine) {
        const enemies = engine?.enemies || [];
        if (enemies.length === 0) return;

        let currentSource = startEnemy;
        let safetyCounter = 0;
        const MAX_ITERATIONS = 50; // Hard limit to prevent infinite loops

        while (this.chainsUsed < this.maxChains && safetyCounter < MAX_ITERATIONS) {
            safetyCounter++;

            // Find nearest unchained enemy
            let nearest = null;
            let minDist = this.range;

            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;
                if (enemy === currentSource) continue;
                if (this.chainedEnemies.has(enemy.id)) continue;

                const dx = enemy.x - currentSource.x;
                const dy = enemy.y - currentSource.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
            }

            if (!nearest) {
                break; // No more valid targets in range
            }

            // Apply chain damage
            const chainDamage = this.projectile.damage * this.damageMultiplier;

            const burnBehavior = this.projectile.behaviorManager?.getBehavior?.('burn');

            if (typeof nearest.takeDamage === 'function') {
                const damageOptions = burnBehavior ? { damageType: 'burn' } : {};
                nearest.takeDamage(Math.max(1, chainDamage), damageOptions);
            }

            // IMPORTANT: Apply burn to chained enemies if projectile has burn
            // This ensures burn damage tracking works for chain builds!
            if (burnBehavior && nearest.statusEffects?.applyEffect) {
                // Apply burn with same parameters as original projectile
                nearest.statusEffects.applyEffect('burn', {
                    damage: burnBehavior.damage || 5,
                    explosionDamage: burnBehavior.explosionDamage || 0,
                    explosionRadius: burnBehavior.explosionRadius || 0
                }, burnBehavior.duration || 3.0);
            }

            this.chainedEnemies.add(nearest.id);
            this.chainsUsed++;

            // Visual lightning effect
            this._createLightningVisual(currentSource, nearest);

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
                window.logger.log(`[ChainBehavior] Projectile ${this.projectile.id} chained to enemy ${nearest.id}. Chains: ${this.chainsUsed}/${this.maxChains}`);
            }

            // Update source for next iteration
            currentSource = nearest;
        }
    }

    /**
     * Create lightning particle effect between enemies - ENHANCED!
     */
    _createLightningVisual(from, to) {
        if (!window.optimizedParticles) return;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.ceil(dist / 10); // Denser segments

        // BRIGHT WHITE CORE BOLT - intense center beam
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = from.x + dx * t;
            const y = from.y + dy * t;

            window.optimizedParticles.spawnParticle({
                x, y,
                vx: 0, vy: 0,
                size: 9, // Bigger core
                color: '#ffffff',
                life: 0.5, // Longer life
                type: 'spark'
            });
        }

        // ELECTRIC PURPLE BRANCHES - jagged lightning effect
        for (let i = 0; i < segments * 3; i++) { // More branches
            const t = i / (segments * 3);
            const x = from.x + dx * t;
            const y = from.y + dy * t;

            const perpX = -dy / dist;
            const perpY = dx / dist;
            const offset = (Math.random() - 0.5) * 35; // More jagged

            window.optimizedParticles.spawnParticle({
                x: x + perpX * offset,
                y: y + perpY * offset,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: 6,
                color: i % 2 === 0 ? '#a29bfe' : '#6c5ce7', // Alternating purple shades
                life: 0.6,
                type: 'lightning'
            });
        }

        // BRIGHT CYAN EDGE SPARKS - electric energy
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = from.x + dx * t;
            const y = from.y + dy * t;

            window.optimizedParticles.spawnParticle({
                x: x + (Math.random() - 0.5) * 15,
                y: y + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30,
                size: 4,
                color: '#00ffff', // Bright cyan
                life: 0.4,
                type: 'spark'
            });
        }

        // TARGET IMPACT EXPLOSION - radial burst at hit point
        const impactParticles = 20; // More impact particles
        for (let i = 0; i < impactParticles; i++) {
            const angle = (Math.PI * 2 * i) / impactParticles;
            window.optimizedParticles.spawnParticle({
                x: to.x,
                y: to.y,
                vx: Math.cos(angle) * 150, // Faster burst
                vy: Math.sin(angle) * 150,
                size: 7,
                color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#6c5ce7' : '#a29bfe'),
                life: 0.7,
                type: 'spark'
            });
        }

        // SOURCE BURST - energy leaving first enemy
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16;
            window.optimizedParticles.spawnParticle({
                x: from.x,
                y: from.y,
                vx: Math.cos(angle) * 110,
                vy: Math.sin(angle) * 110,
                size: 6,
                color: '#dfe6e9', // Bright white-purple
                life: 0.6,
                type: 'spark'
            });
        }

        // SCREEN SHAKE for dramatic impact
        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(2, 0.15); // Subtle shake per chain
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.ChainBehavior = ChainBehavior;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChainBehavior;
}

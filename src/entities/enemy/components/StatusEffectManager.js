/**
 * StatusEffectManager - Handles temporary status effects on enemies
 * 
 * Supported Effects:
 * - burn: Deals damage over time
 * - freeze: Slows movement (future)
 * - stun: Prevents action (future)
 * - weaken: Increases damage taken (future)
 */
class StatusEffectManager {
    constructor(enemy) {
        this.enemy = enemy;
        this.effects = null; // Lazy initialization
        this.visualTimer = 0;
    }

    /**
     * Apply a status effect
     * @param {string} type - Effect type ('burn', 'freeze', etc.)
     * @param {object} data - Effect configuration
     * @param {number} duration - Duration in seconds
     */
    applyEffect(type, data, duration) {
        if (!this.effects) {
            this.effects = new Map();
        }

        const existing = this.effects.get(type);

        // Create new effect state
        const effectState = {
            type,
            data: data || {},
            duration: duration,
            elapsed: 0,
            tickTimer: 0,
            stacks: 1
        };

        // Handle stacking/refreshing logic
        if (existing) {
            // Refresh duration
            effectState.duration = Math.max(existing.duration - existing.elapsed, duration);

            // Stack if applicable (e.g. burn intensity)
            if (type === 'burn') {
                // Keep highest damage, maybe add stack count for visuals
                effectState.data.damage = Math.max(existing.data.damage, data.damage);
                effectState.stacks = (existing.stacks || 1) + 1;
            }
        }

        this.effects.set(type, effectState);
    }

    /**
     * Update all active effects
     */
    update(deltaTime, game) {
        if (!this.effects || this.effects.size === 0) return;

        let toRemove = null;

        for (const [type, effect] of this.effects) {
            effect.elapsed += deltaTime;

            // Handle effect logic
            this._updateEffect(effect, deltaTime, game);

            // Check expiration
            if (effect.elapsed >= effect.duration) {
                if (!toRemove) toRemove = [];
                toRemove.push(type);
            }
        }

        // Remove expired effects
        if (toRemove) {
            toRemove.forEach(type => {
                this.effects.delete(type);
                this._onEffectEnd(type);
            });
        }

        // Update visuals
        this._updateVisuals(deltaTime);
    }

    _updateEffect(effect, deltaTime, game) {
        switch (effect.type) {
            case 'burn':
                this._updateBurn(effect, deltaTime);
                break;
            // Add other effects here
        }
    }

    _updateBurn(effect, deltaTime) {
        // Burn ticks every 0.5 seconds
        const TICK_RATE = 0.5;
        effect.tickTimer += deltaTime;

        if (effect.tickTimer >= TICK_RATE) {
            effect.tickTimer -= TICK_RATE;

            // Apply damage
            if (this.enemy && !this.enemy.isDead) {
                const damage = effect.data.damage || 5;

                // Use EnemyStats if available, otherwise direct modification
                if (window.Game?.EnemyStats) {
                    window.Game.EnemyStats.takeDamage(this.enemy, damage, {
                        isCritical: false,
                        label: 'BURN',
                        showText: true
                    });
                } else {
                    this.enemy.health -= damage;
                    // Basic floating text fallback
                    const gm = window.gameManager || window.gameManagerBridge;
                    if (gm?.showFloatingText) {
                        gm.showFloatingText(
                            `${Math.round(damage)}`,
                            this.enemy.x,
                            this.enemy.y - 20,
                            '#e67e22',
                            14
                        );
                    }
                }
            }
        }
    }

    _onEffectEnd(type) {
        // Cleanup logic if needed (e.g. reset speed after freeze)
    }

    _updateVisuals(deltaTime) {
        this.visualTimer += deltaTime;

        // Example: Spawn burn particles
        if (this.effects.has('burn') && this.visualTimer > 0.2) {
            this.visualTimer = 0;
            if (window.optimizedParticles) {
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x + (Math.random() - 0.5) * 20,
                    y: this.enemy.y + (Math.random() - 0.5) * 20,
                    vx: 0,
                    vy: -20 - Math.random() * 30,
                    size: 2 + Math.random() * 3,
                    color: '#e74c3c',
                    life: 0.5,
                    type: 'spark'
                });
            }
        }
    }

    hasEffect(type) {
        return this.effects.has(type);
    }

    getEffect(type) {
        return this.effects.get(type);
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.StatusEffectManager = StatusEffectManager;
}

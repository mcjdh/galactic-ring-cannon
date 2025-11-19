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
        this._burnParticleTimer = 0;
        this._burnGlowPhase = Math.random() * Math.PI * 2;
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
                this._updateBurn(effect, deltaTime, game);
                break;
            // Add other effects here
        }
    }

    _updateBurn(effect, deltaTime, game) {
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

                if (effect.data?.explosionDamage > 0) {
                    this._triggerBurnPulse(effect, game);
                }
            }
        }
    }

    _triggerBurnPulse(effect, game) {
        const damage = effect.data?.explosionDamage || 0;
        const radius = effect.data?.explosionRadius || 0;
        if (damage <= 0 || radius <= 0) return;

        if (game?.getEnemiesWithinRadius) {
            const enemies = game.getEnemiesWithinRadius(this.enemy.x, this.enemy.y, radius, {
                includeDead: false
            }) || [];

            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;
                enemy.takeDamage(damage);
            }
        }

        const gm = window.gameManager || window.gameManagerBridge;
        gm?.createExplosion?.(this.enemy.x, this.enemy.y, radius, '#ff8c42');
    }

    _onEffectEnd(type) {
        // Cleanup logic if needed (e.g. reset speed after freeze)
    }

    _updateVisuals(deltaTime) {
        if (!this.effects || this.effects.size === 0) return;
        this.visualTimer += deltaTime;

        if (this.effects.has('burn')) {
            this._updateBurnVisuals(deltaTime);
        }
    }

    hasEffect(type) {
        return this.effects ? this.effects.has(type) : false;
    }

    getEffect(type) {
        return this.effects ? this.effects.get(type) : undefined;
    }

    _updateBurnVisuals(deltaTime) {
        const burnEffect = this.effects?.get('burn');
        if (!burnEffect) return;

        if (typeof this.enemy._burnSeed !== 'number') {
            this.enemy._burnSeed = Math.random() * Math.PI * 2;
        }

        this._burnGlowPhase += deltaTime * 6;
        burnEffect._visualFlicker = 0.75 + 0.25 * Math.sin(this._burnGlowPhase + this.enemy._burnSeed);

        if (!window.optimizedParticles) return;

        const lowQuality = !!window.optimizedParticles.lowQuality;
        const interval = lowQuality ? 0.3 : 0.18;
        this._burnParticleTimer += deltaTime;

        if (this._burnParticleTimer < interval) {
            return;
        }
        this._burnParticleTimer = 0;

        const stacks = burnEffect.stacks || 1;
        const emberCount = lowQuality ? 1 : Math.min(5, 2 + stacks);
        const baseRadius = (this.enemy.radius || 15) * 0.6;

        for (let i = 0; i < emberCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const ringDistance = baseRadius + Math.random() * (this.enemy.radius || 15) * 0.45;
            const x = this.enemy.x + Math.cos(angle) * ringDistance;
            const y = this.enemy.y + Math.sin(angle) * ringDistance;

            window.optimizedParticles.spawnParticle({
                x,
                y,
                vx: Math.cos(angle) * 20 + (Math.random() - 0.5) * 25,
                vy: -25 - Math.random() * 35,
                size: 2 + Math.random() * 2.5,
                color: '#ff8c42',
                life: 0.45 + Math.random() * 0.35,
                type: 'spark'
            });

            if (!lowQuality && Math.random() < 0.45) {
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x + (Math.random() - 0.5) * (this.enemy.radius || 15),
                    y: this.enemy.y + (Math.random() - 0.3) * (this.enemy.radius || 10),
                    vx: (Math.random() - 0.5) * 35,
                    vy: -40 - Math.random() * 35,
                    size: 3 + Math.random() * 2.5,
                    color: '#ffd166',
                    life: 0.35 + Math.random() * 0.25,
                    type: 'flame'
                });
            }
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.StatusEffectManager = StatusEffectManager;
}

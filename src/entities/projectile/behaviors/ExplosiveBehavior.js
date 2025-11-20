/**
 * ExplosiveBehavior - Causes area damage when projectile dies
 * This is a death-triggered effect (doesn't prevent death)
 * 
 * 🎮 TUNING: Increased base radius and damage for better game feel
 * - Radius: 70 (was 60) - more impactful AoE
 * - Damage: 0.7 of projectile damage (was 0.7, keeping same)
 * - With upgrades can reach 105+ radius and 65%+ trigger chance
 */
class ExplosiveBehavior extends ProjectileBehaviorBase {
    constructor(projectile, config = {}) {
        super(projectile, config);

        this.radius = config.radius || 70;  // INCREASED from 60
        this.damageMultiplier = config.damageMultiplier || 0.7;
        this.lastExplosionTime = 0;
    }

    /**
     * Trigger explosion on hit (allows explosive bounces!)
     */
    onHit(target, engine) {
        // Explode on contact
        this._tryExplode(engine);
        return true; // Continue processing other behaviors
    }

    /**
     * Trigger explosion on destruction (if caused by collision)
     */
    onDestroy(engine, context = {}) {
        // Only explode on collision (impact) if we haven't just exploded
        // Unless configured to explode on timeout (e.g. grenades)
        if (context.cause !== 'collision' && !this.config.explodeOnTimeout) {
            return;
        }

        this._tryExplode(engine);
    }

    _tryExplode(engine) {
        const now = engine?.lastTime || Date.now();
        // Prevent double explosions in the same frame (e.g. onHit + onDestroy)
        if (now - this.lastExplosionTime < 0.1) {
            return;
        }
        this.lastExplosionTime = now;
        this._explode(engine);
    }

    /**
     * Perform explosion - damage all enemies in radius
     */
    _explode(engine) {
        const enemies = engine?.enemies || [];
        
        const baseDamage = this.projectile.damage * this.damageMultiplier;
        let enemiesHit = 0;

        // Check for status effects to proliferate (Synergy!)
        const burnBehavior = this.projectile.behaviorManager?.getBehavior('burn');
        const freezeBehavior = this.projectile.behaviorManager?.getBehavior('freeze'); // Future proofing

        if (enemies.length > 0) {
            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;

                const dx = enemy.x - this.projectile.x;
                const dy = enemy.y - this.projectile.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= this.radius) {
                    // Damage falloff based on distance
                    const falloff = Math.max(0.3, 1 - (dist / this.radius));
                    const damage = baseDamage * falloff;

                    if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(Math.max(1, damage));
                        enemiesHit++;

                        // SYNERGY: Proliferate Burn Status
                        if (burnBehavior && enemy.statusEffects) {
                            // Apply burn with slightly reduced duration/damage for AoE
                            enemy.statusEffects.applyEffect('burn', {
                                damage: burnBehavior.damage * 0.8,
                                explosionDamage: 0, // Prevent infinite loops
                                explosionRadius: 0
                            }, burnBehavior.duration * 0.8);
                        }

                        // Show damage text
                        if (window.gameEngine?.unifiedUI) {
                            window.gameEngine.unifiedUI.addDamageNumber(
                                Math.round(damage),
                                enemy.x,
                                enemy.y,
                                false
                            );
                        }
                    }
                }
            }
        }

        // Visual explosion effect
        this._createExplosionVisual(burnBehavior);

        // Audio
        if (window.audioSystem?.play) {
            window.audioSystem.play('explosion', 0.4);
        }

        if (window.logger?.isDebugEnabled?.('projectiles')) {
            window.logger.log(`[ExplosiveBehavior] Projectile ${this.projectile.id} exploded, hit ${enemiesHit} enemies`);
        }
    }

    /**
     * Create visual explosion particles - ENHANCED with shockwave rings!
     */
    _createExplosionVisual(burnBehavior) {
        // Capture position at explosion time (projectile may be destroyed during setTimeout)
        const explosionX = this.projectile.x;
        const explosionY = this.projectile.y;

        // Default colors (Orange/Fire)
        let primaryColor = '#ff6b35';
        let secondaryColor = '#ff8c42';
        let sparkColor = '#ffd93d';
        
        // Check for Burn behavior (Fire combo) - prioritize passed behavior or check manager
        const hasBurn = !!burnBehavior || this.projectile.behaviorManager?.hasBehavior('burn');
        
        if (hasBurn) {
            primaryColor = '#c0392b'; // Deep red
            secondaryColor = '#e74c3c'; // Bright red
            sparkColor = '#f1c40f'; // Yellow sparks
        }
        // Check for Chain/Ricochet (Energy combo) - only if not burning (Fire overrides Energy visually)
        else if (this.projectile.behaviorManager?.hasBehavior('chain') || 
                 this.projectile.behaviorManager?.hasBehavior('ricochet')) {
            primaryColor = '#8e44ad'; // Purple
            secondaryColor = '#9b59b6'; // Light purple
            sparkColor = '#3498db'; // Blue sparks
        }

        // Flash effect through game manager (Fallback / Additional effect)
        if (window.gameManager?.createExplosion) {
            window.gameManager.createExplosion(
                explosionX,
                explosionY,
                this.radius,
                primaryColor
            );
        }

        if (!window.optimizedParticles) return;

        // PERFORMANCE: Check pool pressure
        const pool = window.optimizedParticles;
        const poolPressure = pool.activeParticles.length / pool.maxParticles;
        const isHighLoad = poolPressure > 0.7;
        const isCriticalLoad = poolPressure > 0.9;

        if (isCriticalLoad) {
            // Minimal visual for critical load
            this._createMinimalExplosion(explosionX, explosionY, primaryColor);
            return;
        }

        // Scale particle count based on radius and load
        const scaleFactor = Math.min(1.5, Math.max(0.5, this.radius / 70));
        const loadFactor = isHighLoad ? 0.5 : 1.0;
        
        // EXPANDING SHOCKWAVE RINGS - staggered for depth effect
        const ringCount = isHighLoad ? 1 : 3;
        
        for (let ring = 0; ring < ringCount; ring++) {
            const ringRadius = this.radius * 0.4 + (ring * this.radius * 0.2);
            const particlesInRing = Math.floor((24 + (ring * 8)) * scaleFactor * loadFactor);
            
            for (let i = 0; i < particlesInRing; i++) {
                const angle = (Math.PI * 2 * i) / particlesInRing;
                const x = explosionX + Math.cos(angle) * ringRadius;
                const y = explosionY + Math.sin(angle) * ringRadius;
                
                pool.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * (80 - ring * 20), // Slower outer rings
                    vy: Math.sin(angle) * (80 - ring * 20),
                    size: (8 - ring * 2) * scaleFactor,  // Smaller outer rings
                    color: ring === 0 ? primaryColor : (ring === 1 ? secondaryColor : '#ffaa52'),
                    life: 0.8 - ring * 0.15,
                    type: 'explosion'
                });
            }
        }

        // RADIAL BURST - bright fiery particles
        const burstCount = Math.floor(32 * scaleFactor * loadFactor); 
        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount;
            const speed = 100 + Math.random() * 120;

            pool.spawnParticle({
                x: explosionX,
                y: explosionY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: (5 + Math.random() * 4) * scaleFactor,
                color: i % 2 === 0 ? sparkColor : secondaryColor, 
                life: 0.7 + Math.random() * 0.3,
                type: 'spark'
            });
        }

        // CENTRAL FLASH - white-hot core
        const flashCount = isHighLoad ? 4 : 12;
        for (let i = 0; i < flashCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;

            pool.spawnParticle({
                x: explosionX,
                y: explosionY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6 * scaleFactor,
                color: '#ffffff', // Bright white core
                life: 0.5,
                type: 'spark'
            });
        }

        // SCREEN SHAKE for impact
        if (window.gameManager?.addScreenShake) {
            const shakeIntensity = Math.min(8, this.radius / 15); // Scaled to explosion size
            window.gameManager.addScreenShake(shakeIntensity, 0.3);
        }
    }

    _createMinimalExplosion(x, y, color) {
        const pool = window.optimizedParticles;
        // Just a few sparks and a flash
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            pool.spawnParticle({
                x, y,
                vx: Math.cos(angle) * 100,
                vy: Math.sin(angle) * 100,
                size: 6,
                color: color,
                life: 0.5,
                type: 'spark'
            });
        }
    }
}

if (typeof window !== 'undefined') {
    window.ExplosiveBehavior = ExplosiveBehavior;
}

if (typeof module !== 'undefined') {
    module.exports = ExplosiveBehavior;
}
/**
 * PlayerAbilities Component
 * 🤖 RESONANT NOTE: Extracted from massive Player.js to improve maintainability
 * Handles all special abilities: orbital attacks, chain lightning, explosions, etc.
 */

class PlayerAbilities {
    constructor(player) {
        this.player = player;
        
        // Orbital attack system
        this.hasOrbitalAttack = false;
        this.orbitProjectiles = [];
        this.orbitCount = 0;
        this.orbitDamage = 0;
        this.orbitSpeed = 0;
        this.orbitRadius = 0;
        this.orbitAngle = 0;
        
        // Chain lightning system
        this.hasChainLightning = false;
        this.chainChance = 0;
        this.chainDamage = 0;
        this.chainRange = 0;
        this.maxChains = 0;
        
        // Explosive shots system
        this.hasExplosiveShots = false;
        this.explosionRadius = 0;
        this.explosionDamage = 0;
        this.explosionChainChance = 0;
        
        // Ricochet system
        this.hasRicochet = false;
        this.ricochetBounces = 0;
        this.ricochetRange = 0;
        this.ricochetDamage = 0;
        
        // Homing projectiles system
        this.hasHomingShots = false;
        this.homingTurnSpeed = 3.0;
        this.homingRange = 250;
        
        // Passive abilities
        this.magnetRange = 120; // XP attraction radius
        this.regeneration = 0; // Health per second
        this.regenTimer = 0;
        
        // Defensive abilities
        this.damageReduction = 0; // Percentage (0-1)
        this.dodgeChance = 0; // Percentage (0-1)
    }
    
    /**
     * Update all special abilities
     */
    update(deltaTime, game) {
        this.updateOrbitalAttacks(deltaTime, game);
        this.updateRegeneration(deltaTime);
        this.updateXPMagnetism(game);
    }
    
    /**
     * Update orbital attack system
     */
    updateOrbitalAttacks(deltaTime, game) {
        if (!this.hasOrbitalAttack || this.orbitCount === 0) return;
        
        // Update orbit angle
        this.orbitAngle += this.orbitSpeed * deltaTime;
        
        // Update each orbital projectile position
        for (let i = 0; i < this.orbitProjectiles.length; i++) {
            const orb = this.orbitProjectiles[i];
            if (!orb || orb.isDead) continue;
            
            // Calculate orbital position
            const angleOffset = (i / this.orbitCount) * Math.PI * 2;
            const totalAngle = this.orbitAngle + angleOffset;
            
            orb.x = this.player.x + Math.cos(totalAngle) * this.orbitRadius;
            orb.y = this.player.y + Math.sin(totalAngle) * this.orbitRadius;
            
            // Check for collisions with enemies
            this.checkOrbitalCollisions(orb, game);
        }
        
        // Clean up dead orbitals
        this.orbitProjectiles = this.orbitProjectiles.filter(orb => !orb.isDead);
        
        // Maintain orbital count
        while (this.orbitProjectiles.length < this.orbitCount) {
            this.createOrbitalProjectile();
        }
    }
    
    /**
     * Check collisions for orbital projectiles
     */
    checkOrbitalCollisions(orb, game) {
        if (!game.enemies) return;
        
        for (const enemy of game.enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - orb.x;
            const dy = enemy.y - orb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (enemy.radius + orb.radius)) {
                // Apply damage
                enemy.takeDamage(this.orbitDamage);
                
                // Create hit effect
                if (window.gameManager) {
                    window.gameManager.createHitEffect(enemy.x, enemy.y, this.orbitDamage);
                }
                
                // Trigger chain lightning if enabled
                if (this.hasChainLightning && Math.random() < this.chainChance) {
                    this.triggerChainLightning(enemy, game);
                }
                
                // Trigger explosion if enabled
                if (this.hasExplosiveShots && Math.random() < this.explosionChainChance) {
                    this.triggerExplosion(enemy.x, enemy.y, game);
                }
                
                break; // Orb can only hit one enemy per frame
            }
        }
    }
    
    /**
     * Create a new orbital projectile
     */
    createOrbitalProjectile() {
        const orb = {
            x: this.player.x,
            y: this.player.y,
            radius: 8,
            color: '#9b59b6',
            isDead: false,
            type: 'orbital'
        };
        
        this.orbitProjectiles.push(orb);
    }
    
    /**
     * Trigger chain lightning effect
     */
    triggerChainLightning(initialTarget, game) {
        if (!this.hasChainLightning || !game.enemies) return;
        
        let currentTarget = initialTarget;
        let chainsRemaining = this.maxChains;
        const hitTargets = new Set([initialTarget]);
        
        while (chainsRemaining > 0 && currentTarget) {
            // Find nearest enemy within chain range that hasn't been hit
            let nextTarget = null;
            let nearestDistance = this.chainRange;
            
            for (const enemy of game.enemies) {
                if (enemy.isDead || hitTargets.has(enemy)) continue;
                
                const dx = enemy.x - currentTarget.x;
                const dy = enemy.y - currentTarget.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nextTarget = enemy;
                }
            }
            
            if (!nextTarget) break;
            
            // Apply chain damage
            nextTarget.takeDamage(this.chainDamage);
            hitTargets.add(nextTarget);
            
            // Create lightning effect
            this.createLightningEffect(currentTarget.x, currentTarget.y, nextTarget.x, nextTarget.y);
            
            // Move to next target
            currentTarget = nextTarget;
            chainsRemaining--;
        }
        
        // Play chain lightning sound
        if (window.audioSystem) {
            window.audioSystem.play('chainLightning', 0.4);
        }
    }
    
    /**
     * Trigger explosion effect
     */
    triggerExplosion(x, y, game) {
        if (!this.hasExplosiveShots || !game.enemies) return;
        
        // Find enemies within explosion radius
        const enemiesInRange = game.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance <= this.explosionRadius;
        });
        
        // Apply explosion damage
        enemiesInRange.forEach(enemy => {
            enemy.takeDamage(this.explosionDamage);
            
            // Create hit effect
            if (window.gameManager) {
                window.gameManager.createHitEffect(enemy.x, enemy.y, this.explosionDamage);
            }
        });
        
        // Create explosion visual effect
        this.createExplosionEffect(x, y);
        
        // Play explosion sound
        if (window.audioSystem) {
            window.audioSystem.play('explosion', 0.5);
        }
    }
    
    /**
     * Update health regeneration
     */
    updateRegeneration(deltaTime) {
        if (this.regeneration <= 0) return;
        
        this.regenTimer += deltaTime;
        if (this.regenTimer >= 1.0) { // Regenerate every second
            const healAmount = this.regeneration;
            this.player.heal(healAmount);
            
            // Show regen text
            if (window.gameManager && healAmount > 0) {
                window.gameManager.showFloatingText(
                    `+${Math.round(healAmount)}`, 
                    this.player.x, 
                    this.player.y - 40, 
                    '#2ecc71', 
                    14
                );
            }
            
            this.regenTimer = 0;
        }
    }
    
    /**
     * Update XP magnetism
     */
    updateXPMagnetism(game) {
        if (this.magnetRange <= 0 || !game.xpOrbs) return;
        
        game.xpOrbs.forEach(orb => {
            if (orb.isDead || orb.isBeingAttracted) return;
            
            const dx = this.player.x - orb.x;
            const dy = this.player.y - orb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.magnetRange) {
                // Start attracting the orb
                orb.isBeingAttracted = true;
                orb.attractionTarget = { x: this.player.x, y: this.player.y };
            }
        });
    }
    
    /**
     * Create lightning effect between two points
     */
    createLightningEffect(fromX, fromY, toX, toY) {
        if (window.ParticleHelpers) {
            window.ParticleHelpers.createLightningEffect(fromX, fromY, toX, toY);
        } else if (window.optimizedParticles) {
            // Fallback lightning effect
            const dx = toX - fromX;
            const dy = toY - fromY;
            const segments = Math.max(3, Math.floor(Math.sqrt(dx * dx + dy * dy) / 20));
            
            for (let i = 0; i <= segments; i++) {
                const ratio = i / segments;
                const x = fromX + dx * ratio + (Math.random() - 0.5) * 20;
                const y = fromY + dy * ratio + (Math.random() - 0.5) * 20;
                
                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    size: 2 + Math.random() * 2,
                    color: '#74b9ff',
                    life: 0.3,
                    type: 'spark'
                });
            }
        }
    }
    
    /**
     * Create explosion visual effect
     */
    createExplosionEffect(x, y) {
        if (window.ParticleHelpers) {
            window.ParticleHelpers.createExplosion(x, y, this.explosionRadius, '#ff6b35');
        } else if (window.optimizedParticles) {
            // Fallback explosion effect
            const particleCount = Math.min(20, Math.floor(this.explosionRadius / 3));
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 100 + Math.random() * 150;
                
                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    color: '#ff6b35',
                    life: 0.8,
                    type: 'spark'
                });
            }
        }
    }
    
    /**
     * Enable orbital attack ability
     */
    enableOrbitalAttack(count, damage, speed, radius) {
        this.hasOrbitalAttack = true;
        this.orbitCount = count;
        this.orbitDamage = damage;
        this.orbitSpeed = speed;
        this.orbitRadius = radius;
        
        // Create initial orbital projectiles
        this.orbitProjectiles = [];
        for (let i = 0; i < count; i++) {
            this.createOrbitalProjectile();
        }
    }
    
    /**
     * Enable chain lightning ability
     */
    enableChainLightning(chance, damage, range, maxChains) {
        this.hasChainLightning = true;
        this.chainChance = chance;
        this.chainDamage = damage;
        this.chainRange = range;
        this.maxChains = maxChains;
    }
    
    /**
     * Enable explosive shots ability
     */
    enableExplosiveShots(radius, damage, chainChance = 0) {
        this.hasExplosiveShots = true;
        this.explosionRadius = radius;
        this.explosionDamage = damage;
        this.explosionChainChance = chainChance;
    }
    
    /**
     * Enable ricochet ability
     */
    enableRicochet(bounces, range, damage) {
        this.hasRicochet = true;
        this.ricochetBounces = bounces;
        this.ricochetRange = range;
        this.ricochetDamage = damage;
    }
    
    /**
     * Enable homing shots ability
     */
    enableHomingShots(turnSpeed, range) {
        this.hasHomingShots = true;
        this.homingTurnSpeed = turnSpeed;
        this.homingRange = range;
    }
    
    /**
     * Increase XP magnetism range
     */
    increaseMagnetRange(amount) {
        this.magnetRange += amount;
    }
    
    /**
     * Add health regeneration
     */
    addRegeneration(amount) {
        this.regeneration += amount;
    }
    
    /**
     * Add damage reduction
     */
    addDamageReduction(amount) {
        this.damageReduction = Math.min(0.8, this.damageReduction + amount); // Cap at 80%
    }
    
    /**
     * Add dodge chance
     */
    addDodgeChance(amount) {
        this.dodgeChance = Math.min(0.5, this.dodgeChance + amount); // Cap at 50%
    }
    
    /**
     * Get current abilities state for UI/other components
     */
    getAbilitiesState() {
        return {
            hasOrbitalAttack: this.hasOrbitalAttack,
            orbitCount: this.orbitCount,
            hasChainLightning: this.hasChainLightning,
            hasExplosiveShots: this.hasExplosiveShots,
            hasRicochet: this.hasRicochet,
            hasHomingShots: this.hasHomingShots,
            magnetRange: this.magnetRange,
            regeneration: this.regeneration,
            damageReduction: this.damageReduction,
            dodgeChance: this.dodgeChance
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.PlayerAbilities = PlayerAbilities;
}

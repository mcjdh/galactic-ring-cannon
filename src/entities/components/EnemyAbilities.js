/**
 * EnemyAbilities Component
 * 🤖 RESONANT NOTE: Extracted from massive Enemy.js to improve maintainability
 * Handles all special abilities: dash, teleport, phase, range attacks, boss abilities, etc.
 */

class EnemyAbilities {
    constructor(enemy) {
        this.enemy = enemy;
        
        // Range attack system
        this.canRangeAttack = false;
        this.rangeAttackCooldown = 3.0;
        this.rangeAttackTimer = 0;
        this.projectileSpeed = 200;
        this.projectileDamage = 5;
        
        // Dash ability
        this.canDash = false;
        this.dashCooldown = 5.0;
        this.dashTimer = 0;
        this.dashSpeed = 400;
        this.dashDuration = 0.5;
        this.isDashing = false;
        this.dashDirection = { x: 0, y: 0 };
        
        // Teleport ability
        this.canTeleport = false;
        this.teleportCooldown = 4.0;
        this.teleportTimer = 0;
        this.teleportRange = 200;
        
        // Phase ability (phantom enemies)
        this.canPhase = false;
        this.phaseTimer = 0;
        this.phaseDuration = 2.0;
        this.phaseInvisibleDuration = 1.5;
        this.isVisible = true;
        
        // Shield ability
        this.hasShield = false;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 3.0;
        this.shieldCooldown = 8.0;
        this.shieldReflection = 0.3;
        
        // Boss-specific abilities
        this.canSpawnMinions = false;
        this.spawnMinionCooldown = 8.0;
        this.spawnMinionTimer = 0;
        this.minionCount = 2;
        this.minionTypes = ['basic', 'fast'];
        
        this.canCreateDamageZones = false;
        this.damageZoneTimer = 0;
        this.damageZoneCooldown = 6.0;
        
        // Death effects
        this.deathEffect = 'normal';
        this.explosionRadius = 80;
        this.explosionDamage = 30;
    }
    
    /**
     * Update all abilities
     */
    update(deltaTime, game) {
        // Update cooldown timers
        this.updateCooldowns(deltaTime);
        
        // Update active abilities
        this.updateActiveAbilities(deltaTime, game);
        
        // Handle automatic ability usage
        this.handleAutomaticAbilities(deltaTime, game);
    }
    
    /**
     * Update all cooldown timers
     */
    updateCooldowns(deltaTime) {
        if (this.rangeAttackTimer > 0) {
            this.rangeAttackTimer -= deltaTime;
        }
        
        if (this.dashTimer > 0) {
            this.dashTimer -= deltaTime;
        }
        
        if (this.teleportTimer > 0) {
            this.teleportTimer -= deltaTime;
        }
        
        if (this.spawnMinionTimer > 0) {
            this.spawnMinionTimer -= deltaTime;
        }
        
        if (this.damageZoneTimer > 0) {
            this.damageZoneTimer -= deltaTime;
        }
    }
    
    /**
     * Update currently active abilities
     */
    updateActiveAbilities(deltaTime, game) {
        // Handle active dash
        if (this.isDashing) {
            this.updateDash(deltaTime);
        }
        
        // Handle phase ability
        if (this.canPhase) {
            this.updatePhase(deltaTime);
        }
        
        // Handle active shield
        if (this.hasShield) {
            this.updateShield(deltaTime);
        }
    }
    
    /**
     * Handle abilities that trigger automatically
     */
    handleAutomaticAbilities(deltaTime, game) {
        // Boss minion spawning
        if (this.canSpawnMinions && this.spawnMinionTimer <= 0) {
            this.spawnMinions(game);
            this.spawnMinionTimer = this.spawnMinionCooldown;
        }
        
        // Boss damage zones
        if (this.canCreateDamageZones && this.damageZoneTimer <= 0) {
            this.createDamageZone(game);
            this.damageZoneTimer = this.damageZoneCooldown;
        }
    }
    
    /**
     * Perform attack based on current pattern
     */
    performAttack(game, target, attackPattern = 0) {
        if (!target || !game) return;
        
        // Boss enemies have special attack patterns
        if (this.enemy.isBoss && this.enemy.attackPatterns) {
            const pattern = this.enemy.attackPatterns[attackPattern] || this.enemy.attackPatterns[0];
            
            switch (pattern.name) {
                case 'spread':
                    this.performSpreadAttack(game, target, pattern.projectiles || 3);
                    break;
                case 'circle':
                    this.performCircleAttack(game, target, pattern.projectiles || 8);
                    break;
                case 'random':
                    this.performRandomAttack(game, target, pattern.projectiles || 5);
                    break;
                default:
                    this.performBasicRangeAttack(game, target);
                    break;
            }
        } else if (this.canRangeAttack && this.rangeAttackTimer <= 0) {
            // Regular ranged attack
            this.performBasicRangeAttack(game, target);
            this.rangeAttackTimer = this.rangeAttackCooldown;
        }
    }
    
    /**
     * Basic ranged attack
     */
    performBasicRangeAttack(game, target) {
        if (!game.spawnEnemyProjectile) return;
        
        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const angle = Math.atan2(dy, dx);
        
        game.spawnEnemyProjectile(
            this.enemy.x,
            this.enemy.y,
            Math.cos(angle) * this.projectileSpeed,
            Math.sin(angle) * this.projectileSpeed,
            this.projectileDamage
        );
        
        // Create muzzle flash effect
        this.createMuzzleFlash(angle);
    }
    
    /**
     * Spread attack pattern (boss ability)
     */
    performSpreadAttack(game, target, projectileCount) {
        if (!game.spawnEnemyProjectile) return;
        
        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const baseAngle = Math.atan2(dy, dx);
        const spreadAngle = Math.PI / 4; // 45 degree spread
        
        for (let i = 0; i < projectileCount; i++) {
            const angle = baseAngle - spreadAngle / 2 + (spreadAngle / (projectileCount - 1)) * i;
            
            game.spawnEnemyProjectile(
                this.enemy.x,
                this.enemy.y,
                Math.cos(angle) * this.projectileSpeed,
                Math.sin(angle) * this.projectileSpeed,
                this.projectileDamage
            );
        }
        
        // Create enhanced muzzle flash for spread attack
        this.createSpreadMuzzleFlash(baseAngle, spreadAngle);
    }
    
    /**
     * Circle attack pattern (boss ability)
     */
    performCircleAttack(game, target, projectileCount) {
        if (!game.spawnEnemyProjectile) return;
        
        const angleStep = (Math.PI * 2) / projectileCount;
        
        for (let i = 0; i < projectileCount; i++) {
            const angle = angleStep * i;
            
            game.spawnEnemyProjectile(
                this.enemy.x,
                this.enemy.y,
                Math.cos(angle) * this.projectileSpeed,
                Math.sin(angle) * this.projectileSpeed,
                this.projectileDamage
            );
        }
        
        // Create circular muzzle flash effect
        this.createCircularMuzzleFlash();
    }
    
    /**
     * Random attack pattern (boss ability)
     */
    performRandomAttack(game, target, projectileCount) {
        if (!game.spawnEnemyProjectile) return;
        
        for (let i = 0; i < projectileCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = this.projectileSpeed * (0.8 + Math.random() * 0.4); // Vary speed
            
            game.spawnEnemyProjectile(
                this.enemy.x,
                this.enemy.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.projectileDamage
            );
        }
        
        // Create chaotic muzzle flash effect
        this.createChaoticMuzzleFlash();
    }
    
    /**
     * Dash ability
     */
    startDash(target) {
        if (!this.canDash || this.dashTimer > 0 || this.isDashing) return false;
        
        // Calculate dash direction towards target
        const dx = target.x - this.enemy.x;
        const dy = target.y - this.enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.dashDirection.x = dx / distance;
            this.dashDirection.y = dy / distance;
        } else {
            this.dashDirection.x = 1;
            this.dashDirection.y = 0;
        }
        
        this.isDashing = true;
        this.dashTimer = this.dashCooldown;
        
        // Create dash effect
        this.createDashEffect();
        
        return true;
    }
    
    /**
     * Update dash movement
     */
    updateDash(deltaTime) {
        if (!this.isDashing) return;
        
        this.dashDuration -= deltaTime;
        
        if (this.dashDuration <= 0) {
            this.isDashing = false;
            this.dashDuration = 0.5; // Reset for next dash
        }
    }
    
    /**
     * Teleport ability
     */
    performTeleport(target) {
        if (!this.canTeleport || this.teleportTimer > 0) return false;
        
        // Teleport to a position near the target
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * this.teleportRange;
        
        const newX = target.x + Math.cos(angle) * distance;
        const newY = target.y + Math.sin(angle) * distance;
        
        // Create teleport out effect
        this.createTeleportEffect(this.enemy.x, this.enemy.y);
        
        // Move enemy
        this.enemy.x = newX;
        this.enemy.y = newY;
        
        // Create teleport in effect
        this.createTeleportEffect(newX, newY);
        
        this.teleportTimer = this.teleportCooldown;
        
        return true;
    }
    
    /**
     * Update phase ability (phantom enemies)
     */
    updatePhase(deltaTime) {
        this.phaseTimer += deltaTime;
        
        const cycleDuration = this.phaseDuration + this.phaseInvisibleDuration;
        const cycleTime = this.phaseTimer % cycleDuration;
        
        if (cycleTime < this.phaseDuration) {
            this.isVisible = true;
        } else {
            this.isVisible = false;
        }
    }
    
    /**
     * Update shield ability
     */
    updateShield(deltaTime) {
        if (this.shieldActive) {
            this.shieldTimer += deltaTime;
            
            if (this.shieldTimer >= this.shieldDuration) {
                this.shieldActive = false;
                this.shieldTimer = 0;
            }
        } else {
            this.shieldTimer += deltaTime;
            
            if (this.shieldTimer >= this.shieldCooldown) {
                this.activateShield();
            }
        }
    }
    
    /**
     * Activate shield
     */
    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = 0;
        
        // Create shield activation effect
        this.createShieldEffect();
    }
    
    /**
     * Spawn minions (boss ability)
     */
    spawnMinions(game) {
        if (!this.canSpawnMinions || !game.addEntity) return;
        
        for (let i = 0; i < this.minionCount; i++) {
            const angle = (i / this.minionCount) * Math.PI * 2;
            const distance = 80 + Math.random() * 40;
            
            const x = this.enemy.x + Math.cos(angle) * distance;
            const y = this.enemy.y + Math.sin(angle) * distance;
            
            // Pick random minion type
            const minionType = this.minionTypes[Math.floor(Math.random() * this.minionTypes.length)];
            
            const minion = new Enemy(x, y, minionType);
            
            // Scale minion based on boss difficulty
            if (window.gameManager && window.gameManager.difficultyFactor) {
                const scaling = window.gameManager.difficultyFactor * 0.7; // Minions are weaker than boss
                minion.maxHealth = Math.ceil(minion.maxHealth * scaling);
                minion.health = minion.maxHealth;
                minion.damage = Math.ceil(minion.damage * scaling);
            }
            
            game.addEntity(minion);
        }
        
        // Create minion spawn effect
        this.createMinionSpawnEffect();
        
        // Show floating text
        if (window.gameManager) {
            window.gameManager.showFloatingText(
                'MINIONS SUMMONED!',
                this.enemy.x,
                this.enemy.y - 40,
                '#e74c3c',
                20
            );
        }
    }
    
    /**
     * Create damage zone (boss ability)
     */
    createDamageZone(game) {
        if (!this.canCreateDamageZones || !game.addEntity) return;
        
        // Create damage zone at player location
        if (game.player && !game.player.isDead) {
            const damageZone = new DamageZone(
                game.player.x,
                game.player.y,
                60, // radius
                this.enemy.damage * 0.8, // damage
                3.0 // duration
            );
            
            game.addEntity(damageZone);
            
            // Create warning effect
            this.createDamageZoneWarning(game.player.x, game.player.y);
        }
    }
    
    /**
     * Handle death effects
     */
    onDeath(game) {
        switch (this.deathEffect) {
            case 'explosion':
                this.createDeathExplosion(game);
                break;
            case 'poison':
                this.createPoisonCloud(game);
                break;
            case 'normal':
            default:
                this.createNormalDeathEffect();
                break;
        }
    }
    
    /**
     * Create death explosion
     */
    createDeathExplosion(game) {
        if (!game.enemies) return;
        
        // Damage nearby enemies and player
        const nearbyEntities = [];
        
        // Check player
        if (game.player) {
            const dx = game.player.x - this.enemy.x;
            const dy = game.player.y - this.enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.explosionRadius) {
                nearbyEntities.push({ entity: game.player, distance });
            }
        }
        
        // Check other enemies
        game.enemies.forEach(enemy => {
            if (enemy === this.enemy || enemy.isDead) return;
            
            const dx = enemy.x - this.enemy.x;
            const dy = enemy.y - this.enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.explosionRadius) {
                nearbyEntities.push({ entity: enemy, distance });
            }
        });
        
        // Apply damage
        nearbyEntities.forEach(({ entity, distance }) => {
            const damageMultiplier = 1 - (distance / this.explosionRadius);
            const damage = this.explosionDamage * damageMultiplier;
            
            if (entity.takeDamage) {
                entity.takeDamage(damage);
            }
        });
        
        // Create explosion effect
        if (window.ParticleHelpers) {
            window.ParticleHelpers.createExplosion(
                this.enemy.x,
                this.enemy.y,
                this.explosionRadius,
                '#ff6b35'
            );
        }
        
        // Play explosion sound
        if (window.audioSystem) {
            window.audioSystem.play('explosion', 0.6);
        }
    }
    
    /**
     * Visual effect methods
     */
    createMuzzleFlash(angle) {
        if (window.optimizedParticles) {
            for (let i = 0; i < 3; i++) {
                const spread = (Math.random() - 0.5) * 0.3;
                const flashAngle = angle + spread;
                const speed = 150 + Math.random() * 100;
                
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x + Math.cos(angle) * 20,
                    y: this.enemy.y + Math.sin(angle) * 20,
                    vx: Math.cos(flashAngle) * speed,
                    vy: Math.sin(flashAngle) * speed,
                    size: 2 + Math.random() * 2,
                    color: '#f39c12',
                    life: 0.2,
                    type: 'spark'
                });
            }
        }
    }
    
    createDashEffect() {
        if (window.optimizedParticles) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 40;
                
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x,
                    y: this.enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 2,
                    color: this.enemy.color,
                    life: 0.5,
                    type: 'spark'
                });
            }
        }
    }
    
    createTeleportEffect(x, y) {
        if (window.optimizedParticles) {
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const speed = 120 + Math.random() * 60;
                
                window.optimizedParticles.spawnParticle({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 2,
                    color: '#9b59b6',
                    life: 0.8,
                    type: 'spark'
                });
            }
        }
    }
    
    createNormalDeathEffect() {
        if (window.optimizedParticles) {
            for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 60 + Math.random() * 80;
                
                window.optimizedParticles.spawnParticle({
                    x: this.enemy.x,
                    y: this.enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 3,
                    color: this.enemy.color,
                    life: 0.6,
                    type: 'spark'
                });
            }
        }
    }
    
    /**
     * Configure abilities for specific enemy type
     */
    configureForEnemyType(enemyType) {
        switch (enemyType) {
            case 'ranged':
                this.canRangeAttack = true;
                this.rangeAttackCooldown = 3.0;
                break;
            case 'dasher':
                this.canDash = true;
                this.dashCooldown = 5.0;
                this.dashSpeed = 400;
                break;
            case 'teleporter':
                this.canTeleport = true;
                this.teleportCooldown = 4.0;
                break;
            case 'phantom':
                this.canPhase = true;
                this.phaseDuration = 2.0;
                this.phaseInvisibleDuration = 1.5;
                break;
            case 'shielder':
                this.hasShield = true;
                this.shieldReflection = 0.3;
                break;
            case 'exploder':
                this.deathEffect = 'explosion';
                this.explosionRadius = 80;
                this.explosionDamage = 30;
                break;
            case 'boss':
                this.canRangeAttack = true;
                this.canSpawnMinions = true;
                this.canCreateDamageZones = true;
                this.hasShield = true;
                this.rangeAttackCooldown = 2.0;
                this.spawnMinionCooldown = 8.0;
                this.damageZoneCooldown = 6.0;
                break;
        }
    }
    
    /**
     * Get current abilities state
     */
    getAbilitiesState() {
        return {
            canRangeAttack: this.canRangeAttack,
            rangeAttackReady: this.rangeAttackTimer <= 0,
            canDash: this.canDash,
            dashReady: this.dashTimer <= 0,
            isDashing: this.isDashing,
            canTeleport: this.canTeleport,
            teleportReady: this.teleportTimer <= 0,
            isVisible: this.isVisible,
            shieldActive: this.shieldActive,
            deathEffect: this.deathEffect
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.EnemyAbilities = EnemyAbilities;
}

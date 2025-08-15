/**
 * PlayerCombat Component
 * 🤖 RESONANT NOTE: Extracted from massive Player.js to improve maintainability
 * Handles all attack systems, damage calculation, and combat mechanics
 */

class PlayerCombat {
    constructor(player) {
        this.player = player;
        
        // Basic attack properties
        this.attackSpeed = 1.2; // Attacks per second
        this.attackDamage = 25; // Base damage
        this.attackRange = 300; // Attack range in pixels
        this.attackTimer = 0;
        this.attackCooldown = 1 / this.attackSpeed;
        
        // Projectile properties
        this.projectileSpeed = 450;
        this.projectileCount = 1;
        this.projectileSpread = 0; // Spread angle in degrees
        this.piercing = 0; // Number of enemies projectile can pierce
        
        // Critical hit properties
        this.critChance = 0.10; // 10% base crit chance
        this.critMultiplier = 2.2; // 2.2x damage on crit
        
        // Attack type flags
        this.hasBasicAttack = true;
        this.hasSpreadAttack = false;
        this.hasAOEAttack = false;
        
        // AOE attack properties
        this.aoeAttackCooldown = 2.0; // seconds between AOE attacks
        this.aoeAttackTimer = 0;
        this.aoeAttackRange = 150;
        this.aoeDamageMultiplier = 0.6; // AOE does less damage per hit
        
        // Defensive combat properties
        this.lifestealAmount = 0; // Percentage of damage healed
        this.lifestealCritMultiplier = 1; // Extra lifesteal on crits
        this.lifestealAOE = false; // Whether lifesteal applies to AOE
        
        // Killstreak tracking
        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.killStreakTimeout = 5; // seconds
    }
    
    /**
     * Update combat systems
     */
    update(deltaTime, game) {
        this.updateAttackTimer(deltaTime);
        this.updateAOETimer(deltaTime);
        this.updateKillStreak(deltaTime);
        this.handleAutoAttack(deltaTime, game);
    }
    
    /**
     * Update attack cooldown timer
     */
    updateAttackTimer(deltaTime) {
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
    }
    
    /**
     * Update AOE attack timer
     */
    updateAOETimer(deltaTime) {
        if (this.aoeAttackTimer > 0) {
            this.aoeAttackTimer -= deltaTime;
        }
    }
    
    /**
     * Update killstreak tracking
     */
    updateKillStreak(deltaTime) {
        if (this.killStreak > 0) {
            this.killStreakTimer += deltaTime;
            if (this.killStreakTimer >= this.killStreakTimeout) {
                this.killStreak = 0;
                this.killStreakTimer = 0;
            }
        }
    }
    
    /**
     * Handle automatic attacking
     */
    handleAutoAttack(deltaTime, game) {
        if (this.attackTimer <= 0 && game.enemies && game.enemies.length > 0) {
            this.attack(game);
            this.attackTimer = this.attackCooldown;
        }
    }
    
    /**
     * Execute main attack sequence
     */
    attack(game) {
        // Find nearest enemy for targeting
        const nearestEnemy = this.findNearestEnemy(game.enemies);
        if (!nearestEnemy) return;
        
        // Calculate direction to enemy
        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        const baseAngle = Math.atan2(dy, dx);
        
        // Execute projectile attacks
        this.executeProjectileAttack(game, baseAngle);
        
        // Execute AOE attack if available and ready
        if (this.hasAOEAttack && this.aoeAttackTimer <= 0) {
            this.executeAOEAttack(game);
            this.aoeAttackTimer = this.aoeAttackCooldown;
        }
    }
    
    /**
     * Execute projectile-based attacks (basic and spread)
     */
    executeProjectileAttack(game, baseAngle) {
        if (this.hasBasicAttack && this.projectileCount === 1) {
            // Single projectile attack
            this.fireProjectile(game, baseAngle);
        } else if (this.hasSpreadAttack || (this.hasBasicAttack && this.projectileCount > 1)) {
            // Spread attack with multiple projectiles
            this.executeSpreadAttack(game, baseAngle);
        }
    }
    
    /**
     * Execute spread attack pattern
     */
    executeSpreadAttack(game, baseAngle) {
        let totalSpread = this.projectileSpread;
        
        // Dynamically adjust spread for more projectiles
        if (this.projectileCount > 5) {
            totalSpread *= (1 + (this.projectileCount - 5) * 0.1);
        }
        
        for (let i = 0; i < this.projectileCount; i++) {
            let spreadAngle;
            if (this.projectileCount <= 1) {
                spreadAngle = 0;
            } else {
                // Evenly distribute projectiles across spread angle
                spreadAngle = -totalSpread / 2 + (totalSpread / (this.projectileCount - 1)) * i;
            }
            const angle = baseAngle + (spreadAngle * Math.PI / 180);
            this.fireProjectile(game, angle);
        }
    }
    
    /**
     * Fire a single projectile
     */
    fireProjectile(game, angle) {
        const vx = Math.cos(angle) * this.projectileSpeed;
        const vy = Math.sin(angle) * this.projectileSpeed;
        
        // Calculate damage with potential critical hit
        let damage = this.attackDamage;
        let isCritical = Math.random() < this.critChance;
        
        if (isCritical) {
            damage *= this.critMultiplier;
        }
        
        // Create projectile
        const projectile = new Projectile(
            this.player.x, 
            this.player.y, 
            vx, 
            vy, 
            damage, 
            this.attackRange
        );
        
        // Apply projectile modifiers
        projectile.piercing = this.piercing;
        projectile.isCritical = isCritical;
        projectile.owner = 'player';
        
        // Add to game
        game.addEntity(projectile);
        
        // Create muzzle flash effect
        this.createMuzzleFlash(angle);
        
        // Play attack sound
        if (window.audioSystem) {
            const soundType = isCritical ? 'criticalHit' : 'playerAttack';
            window.audioSystem.play(soundType, 0.3);
        }
    }
    
    /**
     * Execute AOE attack around player
     */
    executeAOEAttack(game) {
        if (!game.enemies) return;
        
        const enemiesInRange = game.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance <= this.aoeAttackRange;
        });
        
        // Damage all enemies in range
        enemiesInRange.forEach(enemy => {
            let damage = this.attackDamage * this.aoeDamageMultiplier;
            let isCritical = Math.random() < this.critChance;
            
            if (isCritical) {
                damage *= this.critMultiplier;
            }
            
            // Apply damage
            enemy.takeDamage(damage);
            
            // Apply lifesteal if enabled for AOE
            if (this.lifestealAOE && this.lifestealAmount > 0) {
                this.applyLifesteal(damage, isCritical);
            }
            
            // Create hit effect
            if (window.gameManager && window.gameManager.createHitEffect) {
                window.gameManager.createHitEffect(enemy.x, enemy.y, damage);
            }
        });
        
        // Create AOE visual effect
        this.createAOEEffect();
        
        // Play AOE sound
        if (window.audioSystem) {
            window.audioSystem.play('aoeAttack', 0.4);
        }
    }
    
    /**
     * Apply lifesteal healing
     */
    applyLifesteal(damage, isCritical) {
        if (this.lifestealAmount <= 0) return;
        
        let healAmount = damage * this.lifestealAmount;
        
        if (isCritical) {
            healAmount *= this.lifestealCritMultiplier;
        }
        
        this.player.heal(healAmount);
        
        // Show lifesteal effect
        if (window.gameManager) {
            window.gameManager.showFloatingText(
                `+${Math.round(healAmount)} HP`, 
                this.player.x, 
                this.player.y - 30, 
                '#e74c3c', 
                16
            );
        }
    }
    
    /**
     * Handle enemy kill for killstreak tracking
     */
    onEnemyKilled() {
        this.killStreak++;
        this.killStreakTimer = 0; // Reset timeout
        
        // Show killstreak milestone
        if (this.killStreak % 5 === 0 && window.gameManager) {
            window.gameManager.showFloatingText(
                `${this.killStreak} KILL STREAK!`, 
                this.player.x, 
                this.player.y - 50, 
                '#f1c40f', 
                20
            );
        }
    }
    
    /**
     * Find nearest enemy within attack range
     */
    findNearestEnemy(enemies) {
        let nearestEnemy = null;
        let nearestDistance = this.attackRange;
        
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }
        
        return nearestEnemy;
    }
    
    /**
     * Create muzzle flash effect
     */
    createMuzzleFlash(angle) {
        if (window.optimizedParticles) {
            // Create directional muzzle flash
            for (let i = 0; i < 3; i++) {
                const spread = (Math.random() - 0.5) * 0.5; // Small spread
                const flashAngle = angle + spread;
                const speed = 200 + Math.random() * 100;
                
                window.optimizedParticles.spawnParticle({
                    x: this.player.x + Math.cos(angle) * 25, // Offset from player center
                    y: this.player.y + Math.sin(angle) * 25,
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
    
    /**
     * Create AOE attack visual effect
     */
    createAOEEffect() {
        if (window.optimizedParticles) {
            // Create circular burst effect
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const speed = 150 + Math.random() * 100;
                
                window.optimizedParticles.spawnParticle({
                    x: this.player.x,
                    y: this.player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 2,
                    color: '#e74c3c',
                    life: 0.6,
                    type: 'spark'
                });
            }
        }
    }
    
    /**
     * Get current combat state for UI/other components
     */
    getCombatState() {
        return {
            attackTimer: this.attackTimer,
            attackCooldown: this.attackCooldown,
            aoeAttackTimer: this.aoeAttackTimer,
            aoeAttackCooldown: this.aoeAttackCooldown,
            killStreak: this.killStreak,
            canAttack: this.attackTimer <= 0,
            canAOE: this.aoeAttackTimer <= 0
        };
    }
    
    /**
     * Apply damage modifier from upgrades
     */
    modifyDamage(multiplier) {
        this.attackDamage *= multiplier;
    }
    
    /**
     * Apply attack speed modifier from upgrades
     */
    modifyAttackSpeed(multiplier) {
        this.attackSpeed *= multiplier;
        this.attackCooldown = 1 / this.attackSpeed;
    }
    
    /**
     * Apply critical hit chance modifier from upgrades
     */
    modifyCritChance(increase) {
        this.critChance = Math.min(1.0, this.critChance + increase);
    }
    
    /**
     * Add piercing to projectiles
     */
    addPiercing(amount) {
        this.piercing += amount;
    }
    
    /**
     * Enable spread attack
     */
    enableSpreadAttack(projectileCount, spreadAngle) {
        this.hasSpreadAttack = true;
        this.projectileCount = projectileCount;
        this.projectileSpread = spreadAngle;
    }
    
    /**
     * Enable AOE attack
     */
    enableAOEAttack(range, damageMultiplier) {
        this.hasAOEAttack = true;
        this.aoeAttackRange = range;
        this.aoeDamageMultiplier = damageMultiplier;
    }
    
    /**
     * Add lifesteal capability
     */
    addLifesteal(amount, critMultiplier = 1, includeAOE = false) {
        this.lifestealAmount += amount;
        this.lifestealCritMultiplier = critMultiplier;
        this.lifestealAOE = includeAOE;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.PlayerCombat = PlayerCombat;
}

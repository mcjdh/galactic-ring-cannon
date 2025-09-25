/**
 * Enemy Class - Modern Component-Based Architecture
 * 🤖 RESONANT NOTE: Refactored from massive 2,000+ line monolith to clean composition
 * Uses component composition for better maintainability and separation of concerns
 * 
 * Components:
 * - EnemyAI: AI behaviors, targeting, attack patterns, decision making
 * - EnemyAbilities: Special abilities, range attacks, boss mechanics
 * - EnemyMovement: Movement patterns, physics, collision detection
 */

class Enemy {
    constructor(x, y, type = 'basic') {
        // Core enemy properties
        this.x = x;
        this.y = y;
        this.type = 'enemy';
        this.enemyType = type;
        this.id = Math.random().toString(36).substr(2, 9);
        
        // Health and combat stats
        this.radius = 15;
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.xpValue = 10;
        this.isDead = false;
        this.color = '#e74c3c';
        
        // Boss properties
        this.isBoss = false;
        this.isMegaBoss = false;
        this.isElite = false;
        this.glowColor = null;
        
        // Combat properties
        this.damageReduction = 0;
        this.damageResistance = 0;
        this.deflectChance = 0;
        
        // Phase system for bosses
        this.hasPhases = false;
        this.currentPhase = 1;
        this.phaseThresholds = [0.7, 0.4, 0.15];
        
        // Attack patterns for bosses
        this.attackPatterns = [];
        this.currentAttackPattern = 0;
        
        // Visual properties
        this.renderEffects = [];
        
        // Visual effect properties
        this.pulseTimer = 0;
        this.pulseIntensity = 1.0;
        this.damageFlashTimer = 0;
        this.deathTimer = 0;
        this.opacity = 1.0;
        
        // Initialize components using composition
        this.ai = new EnemyAI(this);
        this.abilities = new EnemyAbilities(this);
        this.movement = new EnemyMovement(this);
        
        // Configure based on enemy type
        this.configureEnemyType(type);
        
        // Collision properties
        this.collidedThisFrame = false;
        this.collisionCooldown = 0;
        this.lastCollisionTime = 0;
        
        // Target direction for movement (set by AI, used by movement)
        this.targetDirection = { x: 0, y: 0 };
    }
    
    /**
     * Main update loop - delegates to components
     */
    update(deltaTime, game) {
        // Skip update if dead
        if (this.isDead) return;
        
        // Update collision cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        }
        
        // Reset collision flag
        this.collidedThisFrame = false;
        
        // Update components
        this.ai.update(deltaTime, game);
        this.abilities.update(deltaTime, game);
        this.movement.update(deltaTime, game);
        
        // Update boss-specific mechanics
        if (this.isBoss) {
            this.updateBossSpecifics(deltaTime, game);
        }
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
    }
    
    /**
     * Update boss-specific mechanics
     */
    updateBossSpecifics(deltaTime, game) {
        // Handle phase transitions
        if (this.hasPhases) {
            const healthPercent = this.health / this.maxHealth;
            let newPhase = 1;
            
            for (let i = 0; i < this.phaseThresholds.length; i++) {
                if (healthPercent <= this.phaseThresholds[i]) {
                    newPhase = i + 2;
                    break;
                }
            }
            
            if (newPhase !== this.currentPhase) {
                this.onPhaseChange(newPhase, game);
                this.currentPhase = newPhase;
            }
        }
    }
    
    /**
     * Handle phase changes
     */
    onPhaseChange(newPhase, game) {
        // Create phase change visual effect
        this.createPhaseChangeEffect();
        
        // Show phase change text
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm) {
            gm.showFloatingText(
                `PHASE ${newPhase}!`,
                this.x,
                this.y - 50,
                '#ff6b35',
                28
            );
        }
        
        // Update attack pattern based on phase
        if (this.attackPatterns.length > 0) {
            const patternsPerPhase = Math.ceil(this.attackPatterns.length / 4);
            const basePattern = (newPhase - 1) * patternsPerPhase;
            this.currentAttackPattern = Math.min(basePattern, this.attackPatterns.length - 1);
        }
    }
    
    /**
     * Update visual effects like pulsing, glowing, etc.
     */
    updateVisualEffects(deltaTime) {
        // Update pulsing effect for elites and bosses
        if (this.isElite || this.isBoss) {
            this.pulseTimer += deltaTime;
            this.pulseIntensity = Math.sin(this.pulseTimer * 3) * 0.3 + 0.7;
        }
        
        // Update damage flash effect
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            if (this.damageFlashTimer <= 0) {
                this.damageFlashTimer = 0;
            }
        }
        
        // Update death animation
        if (this.isDead && this.deathTimer > 0) {
            this.deathTimer -= deltaTime * 1000; // Convert deltaTime from seconds to milliseconds
            this.opacity = Math.max(0, this.deathTimer / 500); // 500ms fade out
        }
    }
    
    /**
     * Take damage with defensive calculations
     */
    takeDamage(amount) {
        if (this.isDead) return;
        
        // Apply damage reduction
        if (this.damageReduction > 0) {
            amount *= (1 - this.damageReduction);
        }
        
        // Apply damage resistance (boss mechanic)
        if (this.damageResistance > 0) {
            amount *= (1 - this.damageResistance);
        }
        
        // Check for projectile deflection (shielder enemies)
        if (this.deflectChance > 0 && Math.random() < this.deflectChance) {
            if (typeof this.deflectProjectile === 'function') {
                this.deflectProjectile();
            }
            return; // No damage taken
        }
        
        // Check for shield reflection (shielder enemies with active shield)
        if (this.abilities.shieldActive && this.abilities.shieldReflection > 0) {
            if (Math.random() < this.abilities.shieldReflection) {
                if (typeof this.reflectAttack === 'function') {
                    this.reflectAttack(amount);
                }
                return; // No damage taken
            }
        }
        
        // Apply damage
        const actualDamage = Math.max(1, Math.floor(amount)); // Minimum 1 damage
        this.health = Math.max(0, this.health - actualDamage);
        
        // Trigger damage flash effect
        this.damageFlashTimer = 100; // 100ms flash
        
        // Create hit effect
        this.createHitEffect(actualDamage);
        
        // Show damage text
        this.showDamageText(actualDamage);
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        } else {
            // Trigger special abilities on taking damage
            this.onTakeDamage(actualDamage);
        }
    }
    
    /**
     * Handle enemy death
     */
    die() {
        this.isDead = true;
        this.deathTimer = 500; // 500ms fade out animation
        
        // Trigger death effects through abilities component
        this.abilities.onDeath((window.gameManager || window.gameManagerBridge)?.game);
        
        // Drop XP orb
        this.dropXP();
        
        // Create death effect
        this.createDeathEffect();
        
        // Notify game manager
        if (window.gameManager) {
            window.gameManager.incrementKills();
            
            // Track boss kills
            if (this.isBoss) {
                window.gameManager.onBossKilled();
            }

            // Keep enemy spawner statistics accurate
            if (window.gameManager.enemySpawner?.onEnemyKilled) {
                try {
                    window.gameManager.enemySpawner.onEnemyKilled(this);
                } catch (_) { /* no-op */ }
            }
        }

        if (window.gameManagerBridge?.enemySpawner?.onEnemyKilled) {
            try {
                window.gameManagerBridge.enemySpawner.onEnemyKilled(this);
            } catch (_) { /* no-op */ }
        }
        
        // Play death sound
        if (window.audioSystem) {
            const soundType = this.isBoss ? 'bossKilled' : 'enemyKilled';
            window.audioSystem.play(soundType, 0.4);
        }
    }
    
    /**
     * Handle reactions to taking damage
     */
    onTakeDamage(damage) {
        // Teleporter enemies might teleport when low on health
        if (this.enemyType === 'teleporter' && this.health < this.maxHealth * 0.3) {
            if (this.abilities.canTeleport && this.abilities.teleportTimer <= 0) {
                const target = this.ai.target;
                if (target) {
                    this.abilities.performTeleport(target);
                }
            }
        }
        
        // Dasher enemies might dash when hit
        if (this.enemyType === 'dasher' && Math.random() < 0.3) {
            const target = this.ai.target;
            if (target && this.abilities.canDash) {
                this.abilities.startDash(target);
            }
        }
        
        // Apply knockback
        if (window.gameManager?.game?.player) {
            const player = window.gameManager.game.player;
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const knockbackForce = damage * 2;
                this.movement.applyKnockback(
                    (dx / distance) * knockbackForce,
                    (dy / distance) * knockbackForce,
                    0.2
                );
            }
        }
    }
    
    /**
     * Drop XP orb on death
     */
    dropXP() {
        if (window.gameManager?.game?.addEntity) {
            // Calculate XP value with bonuses
            let xpValue = this.xpValue;
            // Slightly increase XP per enemy early to smooth early levels
            try {
                const boost = (typeof window.GameMath?.earlyXPBoostMultiplier === 'function')
                    ? window.GameMath.earlyXPBoostMultiplier(window.gameManager?.gameTime || 0)
                    : 1.0;
                xpValue = Math.max(1, Math.floor(xpValue * boost));
            } catch (_) {}
            
            // Elite bonus
            if (this.isElite) {
                xpValue *= 2;
            }
            
            // Boss bonus
            if (this.isBoss) {
                xpValue *= 3;
                
                // Mega boss gets even more XP
                if (this.isMegaBoss) {
                    xpValue *= 2;
                }
            }
            
            // Create XP orb
            const xpOrb = new XPOrb(this.x, this.y, xpValue);
            
            // Add some randomness to XP orb position
            xpOrb.x += (Math.random() - 0.5) * 20;
            xpOrb.y += (Math.random() - 0.5) * 20;
            
            window.gameManager.game.addEntity(xpOrb);
        }
    }
    
    /**
     * Render the enemy
     */
    render(ctx) {
        // Skip rendering if not visible (phantom enemies)
        if (this.abilities.canPhase && !this.abilities.isVisible) {
            return;
        }
        
        // Save context state
        ctx.save();
        
        // Apply opacity for death animation
        if (this.opacity !== undefined && this.opacity < 1.0) {
            ctx.globalAlpha = this.opacity;
        }
        
        // Apply transparency for phantom enemies
        if (this.abilities.canPhase && this.abilities.isVisible) {
            ctx.globalAlpha = 0.7;
        }
        
        // Apply damage flash effect
        if (this.damageFlashTimer > 0) {
            ctx.filter = 'brightness(150%) saturate(150%)';
        }
        
        // Draw shield effect if active
        if (this.abilities.shieldActive) {
            this.renderShieldEffect(ctx);
        }
        
        // Draw elite glow if elite
        if (this.isElite && this.glowColor) {
            this.renderEliteGlow(ctx);
        }
        
        // Calculate pulsing effect for elites and bosses
        const pulseScale = (this.isElite || this.isBoss) ? (this.pulseIntensity || 1.0) : 1.0;
        const drawRadius = this.radius * pulseScale;
        
        // Draw main enemy body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw boss crown if boss
        if (this.isBoss) {
            this.renderBossCrown(ctx);
        }
        
        // Health bars now handled by UnifiedUIManager for better performance and positioning
        // (Removed from individual enemy rendering to prevent coordinate system conflicts)
        
        // Draw phase indicator for multi-phase bosses
        if (this.hasPhases && this.currentPhase > 1) {
            this.renderPhaseIndicator(ctx);
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Configure enemy based on type
     */
    configureEnemyType(type) {
        // Configure base stats
        this.setBaseStats(type);
        
        // Configure components
        this.ai.configureForEnemyType(type);
        this.abilities.configureForEnemyType(type);
        this.movement.configureForEnemyType(type);
        
        // Configure special properties
        this.configureSpecialProperties(type);
    }
    
    /**
     * Set base stats for enemy type
     */
    setBaseStats(type) {
        switch (type) {
            case 'basic':
                // Default values already set
                this.baseSpeed = 90;
                break;
            case 'fast':
                this.radius = 12;
                this.health = this.maxHealth = 20;
                this.damage = 5;
                this.xpValue = 15;
                this.baseSpeed = 170;
                this.color = '#f39c12';
                break;
            case 'tank':
                this.radius = 25;
                this.health = this.maxHealth = 110;
                this.damage = 20;
                this.xpValue = 30;
                this.baseSpeed = 45;
                this.color = '#8e44ad';
                break;
            case 'ranged':
                this.radius = 14;
                this.health = this.maxHealth = 25;
                this.damage = 8;
                this.xpValue = 20;
                this.baseSpeed = 70;
                this.color = '#16a085';
                break;
            case 'dasher':
                this.radius = 13;
                this.health = this.maxHealth = 30;
                this.damage = 15;
                this.xpValue = 25;
                this.baseSpeed = 220; // Fast for dashing
                this.color = '#c0392b';
                break;
            case 'exploder':
                this.radius = 18;
                this.health = this.maxHealth = 40;
                this.damage = 25;
                this.xpValue = 35;
                this.baseSpeed = 100;
                this.color = '#d35400';
                break;
            case 'teleporter':
                this.radius = 16;
                this.health = this.maxHealth = 35;
                this.damage = 12;
                this.xpValue = 30;
                this.baseSpeed = 80; // Slower since they can teleport
                this.color = '#9b59b6';
                break;
            case 'phantom':
                this.radius = 14;
                this.health = this.maxHealth = 20;
                this.damage = 8;
                this.xpValue = 25;
                this.baseSpeed = 135;
                this.color = 'rgba(108, 92, 231, 0.7)';
                break;
            case 'shielder':
                this.radius = 18;
                this.health = this.maxHealth = 60;
                this.damage = 15;
                this.xpValue = 40;
                this.color = '#3498db';
                this.deflectChance = 0.3;
                break;
            case 'boss':
                this.radius = 35;
                this.health = this.maxHealth = 600;
                this.damage = 30;
                this.xpValue = 200;
                this.color = '#c0392b';
                this.isBoss = true;
                this.hasPhases = true;
                this.setupBossAttackPatterns();
                break;
        }
    }
    
    /**
     * Configure special properties for enemy type
     */
    configureSpecialProperties(type) {
        switch (type) {
            case 'boss':
                // Setup boss-specific mechanics
                this.damageResistance = 0.2;
                this.phaseThresholds = [0.7, 0.4, 0.15];
                break;
        }
    }
    
    /**
     * Setup attack patterns for boss enemies
     */
    setupBossAttackPatterns() {
        this.attackPatterns = [
            { name: "basic", cooldown: 2.0 },
            { name: "spread", cooldown: 1.8, projectiles: 3 },
            { name: "circle", cooldown: 1.5, projectiles: 8 },
            { name: "random", cooldown: 1.0, projectiles: 5 }
        ];
    }
    
    /**
     * Visual effect methods
     */
    createHitEffect(damage) {
        if (window.gameManager && window.gameManager.createHitEffect) {
            window.gameManager.createHitEffect(this.x, this.y, damage);
        }
    }
    
    createDeathEffect() {
        // Death effect is handled by abilities component
        this.abilities.onDeath(window.gameManager?.game);
    }
    
    createPhaseChangeEffect() {
        if (window.optimizedParticles) {
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const speed = 150 + Math.random() * 100;
                
                window.optimizedParticles.spawnParticle({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 4 + Math.random() * 3,
                    color: '#ff6b35',
                    life: 1.0,
                    type: 'spark'
                });
            }
        }
    }
    
    showDamageText(damage, isCritical = false) {
        // Use UnifiedUIManager for better damage number display
        if (window.gameEngine?.unifiedUI) {
            window.gameEngine.unifiedUI.addDamageNumber(damage, this.x, this.y, isCritical);
        } else if (window.gameManager) {
            // Fallback to old system
            const color = damage > this.maxHealth * 0.2 ? '#e74c3c' : '#f39c12';
            window.gameManager.showFloatingText(
                `-${damage}`,
                this.x,
                this.y - 20,
                color,
                14
            );
        }
    }
    
    /**
     * Render helper methods
     */
    renderShieldEffect(ctx) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    renderEliteGlow(ctx) {
        const glowRadius = this.radius + 5;
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, glowRadius);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, this.glowColor + '40'); // 40 = 25% opacity in hex
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderBossCrown(ctx) {
        ctx.fillStyle = '#f1c40f';
        const crownSize = 6;
        
        // Simple crown shape
        ctx.beginPath();
        ctx.moveTo(this.x - crownSize, this.y - this.radius - 5);
        ctx.lineTo(this.x, this.y - this.radius - 12);
        ctx.lineTo(this.x + crownSize, this.y - this.radius - 5);
        ctx.closePath();
        ctx.fill();
    }
    
    renderHealthBar(ctx) {
        try {
            // Save context state to avoid interference
            ctx.save();
            
            // Reset filters and alpha but preserve camera transform
            ctx.filter = 'none';
            ctx.globalAlpha = 1.0;
            
            const barWidth = Math.max(this.radius * 2, 20); // Minimum bar width
            const barHeight = 4;
            const barY = this.y - this.radius - 15;
            
            // Ensure valid health values
            const healthPercent = Math.max(0, Math.min(1, (this.health || 0) / (this.maxHealth || 1)));
            
            // Background (black with border)
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
            
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
            
            // Health
            const healthColor = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            
            ctx.fillStyle = healthColor;
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
            
            // Restore context state
            ctx.restore();
        } catch (error) {
            // Use logger instead of console.warn for better error handling
            (window.logger?.warn || (() => {}))('Error rendering enemy health bar:', error);
            // Graceful degradation - continue without health bar
        }
    }
    
    renderPhaseIndicator(ctx) {
        ctx.fillStyle = '#ff6b35';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`P${this.currentPhase}`, this.x, this.y - this.radius - 25);
    }
    
    /**
     * Get comprehensive enemy state for debugging/UI
     */
    getState() {
        return {
            // Core properties
            x: this.x,
            y: this.y,
            health: this.health,
            maxHealth: this.maxHealth,
            enemyType: this.enemyType,
            isDead: this.isDead,
            isBoss: this.isBoss,
            isElite: this.isElite,
            currentPhase: this.currentPhase,
            
            // Component states
            ai: this.ai.getAIState(),
            abilities: this.abilities.getAbilitiesState(),
            movement: this.movement.getMovementState()
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
}

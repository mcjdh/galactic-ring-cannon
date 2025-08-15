// Player class - Core player entity for the game
// Fixed: Replaced magic numbers with named constants from GameConstants
// Fixed: Improved const access pattern for better performance and readability

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = 'player';
        
        // Get constants reference once for better performance
        const PLAYER_CONSTANTS = window.GAME_CONSTANTS?.PLAYER || {};
        const COLORS = window.GAME_CONSTANTS?.COLORS || {};
        
        this.radius = PLAYER_CONSTANTS.RADIUS || 20;
        
        // Core player stats - using named constants instead of magic numbers
        this.speed = PLAYER_CONSTANTS.BASE_SPEED || 220;
        this.health = PLAYER_CONSTANTS.BASE_HEALTH || 120;
        this.maxHealth = PLAYER_CONSTANTS.BASE_HEALTH || 120;
        this.xp = 0;
        this.xpToNextLevel = PLAYER_CONSTANTS.INITIAL_XP_TO_LEVEL || 212;
        this.level = 1;
        this.isDead = false;
        this.isInvulnerable = false;
        this.invulnerabilityTime = PLAYER_CONSTANTS.INVULNERABILITY_TIME || 0.5;
        this.invulnerabilityTimer = 0;
        this.color = COLORS.PLAYER || '#3498db';
        
        // Attack properties - using named constants
        this.attackSpeed = PLAYER_CONSTANTS.BASE_ATTACK_SPEED || 1.2;
        this.attackDamage = PLAYER_CONSTANTS.BASE_ATTACK_DAMAGE || 25;
        this.attackRange = PLAYER_CONSTANTS.BASE_ATTACK_RANGE || 300;
        this.attackTimer = 0;
        this.attackCooldown = 1 / this.attackSpeed;
        
        // Replace single attackType with separate flags
        // TODO: Use a proper ability system instead of boolean flags
        this.hasBasicAttack = true;
        this.hasSpreadAttack = false;
        this.hasAOEAttack = false;
        
        this.projectileSpeed = PLAYER_CONSTANTS.BASE_PROJECTILE_SPEED || 450;
        this.projectileCount = 1;
        this.projectileSpread = 0; // angle in degrees
        this.piercing = 0; // Number of enemies projectile can pierce through
        this.critChance = PLAYER_CONSTANTS.BASE_CRIT_CHANCE || 0.10;
        this.critMultiplier = PLAYER_CONSTANTS.BASE_CRIT_MULTIPLIER || 2.2;
        
        // AOE attack specific properties - using named constants
        this.aoeAttackCooldown = PLAYER_CONSTANTS.AOE_ATTACK_COOLDOWN || 2.0;
        this.aoeAttackTimer = 0;
        this.aoeAttackRange = PLAYER_CONSTANTS.AOE_ATTACK_RANGE || 150;
        this.aoeDamageMultiplier = PLAYER_CONSTANTS.AOE_DAMAGE_MULTIPLIER || 0.6;
        
        // Defensive properties
        // TODO: Group related properties into configuration objects
        this.damageReduction = 0; // percentage (0-1)
        this.dodgeChance = 0; // percentage (0-1)
        this.regeneration = 0; // health per second
        this.regenTimer = 0;
        
        // Special abilities - using named constants
        this.magnetRange = PLAYER_CONSTANTS.BASE_MAGNET_RANGE || 120;
        
        // Upgrade-related properties
        // TODO: Move upgrade system to separate UpgradeManager
        this.upgrades = [];
        
        // Dodge ability - using named constants instead of magic numbers
        // TODO: Extract dodge system to PlayerAbilities component
        this.canDodge = true;
        this.dodgeCooldown = PLAYER_CONSTANTS.DODGE_COOLDOWN || 2;
        this.dodgeTimer = 0;
        this.isDodging = false;
        this.dodgeDuration = PLAYER_CONSTANTS.DODGE_DURATION || 0.3;
        this.dodgeSpeed = PLAYER_CONSTANTS.DODGE_SPEED || 600;
        this.dodgeDirection = { x: 0, y: 0 };
    // Separate timers to avoid double-counting between active-dodge and cooldown
    this.dodgeCooldownTimer = 0; // progresses while dodge is cooling down
    this.dodgeActiveTimer = 0;   // measures active dodge duration
        
        // Trail effect properties
        // TODO: Move visual effects to PlayerRenderer component
        this.lastTrailPos = { x: 0, y: 0 };
        this.trailDistance = PLAYER_CONSTANTS.TRAIL_DISTANCE || 15;
        this.isMoving = false;
        
        // Orbit attack properties
        this.hasOrbitalAttack = false;
        this.orbitProjectiles = [];
        this.orbitCount = 0;
        this.orbitDamage = 0;
        this.orbitSpeed = 0;
        this.orbitRadius = 0;
        this.orbitAngle = 0;
        
        // Chain lightning properties
        this.hasChainLightning = false;
        this.chainChance = 0;
        this.chainDamage = 0;
        this.chainRange = 0;
        this.maxChains = 0;
        
        // Explosion properties
        this.hasExplosiveShots = false;
        this.explosionRadius = 0;
        this.explosionDamage = 0;
        this.explosionChainChance = 0;        // Lifesteal properties
        this.lifestealAmount = 0;
        this.lifestealCritMultiplier = 1;
        this.lifestealAOE = false;
        
        // Ricochet properties
        this.hasRicochet = false;
        this.ricochetBounces = 0;
        this.ricochetRange = 0;
        this.ricochetDamage = 0;
        
        // Homing projectile properties
        this.hasHomingShots = false;
        this.homingTurnSpeed = 3.0;
        this.homingRange = 250;

        // Add a killstreak counter
        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.killStreakTimeout = 5.0; // seconds
    }
    
    // Prefer pooled particles with graceful fallback
    spawnParticleViaPoolOrFallback(x, y, vx, vy, size, color, life, type = 'basic') {
        try {
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({ x, y, vx, vy, size, color, life, type });
                return true;
            }
            const gm = window.gameManager;
            if (gm && typeof gm.tryAddParticle === 'function') {
                if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                    window.optimizedParticles.spawnParticle({ x, y, vx, vy, size, color, life, type });
                } else {
                    const particle = new Particle(x, y, vx, vy, size, color, life);
                    gm.tryAddParticle(particle);
                }
                return true;
            }
        } catch (e) {
            (window.logger?.warn || (() => {}))('Particle spawn failed in Player', e);
        }
        return false;
    }
    
    update(deltaTime, game) {
        this.handleMovement(deltaTime, game);
        this.handleAttacks(deltaTime, game);
        this.handleInvulnerability(deltaTime);
        this.handleRegeneration(deltaTime);
        this.handleDodge(deltaTime, game);
        this.updateOrbitalAttacks(deltaTime, game); // Add orbital attack handling

        // Update killstreak timer
        if (this.killStreak > 0) {
            this.killStreakTimer += deltaTime;
            if (this.killStreakTimer >= this.killStreakTimeout) {
                this.killStreak = 0;
            }
        }
    }
    
    handleMovement(deltaTime, game) {
        if (this.isDodging) {
            // Apply dodge movement
            this.x += this.dodgeDirection.x * this.dodgeSpeed * deltaTime;
            this.y += this.dodgeDirection.y * this.dodgeSpeed * deltaTime;
            return; // Skip normal movement during dodge
        }

        let inputX = 0;
        let inputY = 0;
        
        // Get keys from the game engine (fix for movement bug)
        const keys = game.keys || {};
        
        if (keys['w'] || keys['W'] || keys['ArrowUp']) inputY -= 1;
        if (keys['s'] || keys['S'] || keys['ArrowDown']) inputY += 1;
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) inputX -= 1;
        if (keys['d'] || keys['D'] || keys['ArrowRight']) inputX += 1;
        
        // Enhanced movement physics with acceleration and momentum
        const acceleration = 1200; // pixels/sec²
        const friction = 0.85; // friction coefficient
        const maxSpeed = this.speed;
        
        // Initialize velocity if not exists
        if (!this.velocity) {
            this.velocity = { x: 0, y: 0 };
        }
        
        // Apply input acceleration
        if (inputX !== 0 || inputY !== 0) {
            // Normalize diagonal input
            const inputMagnitude = Math.sqrt(inputX * inputX + inputY * inputY);
            if (inputMagnitude > 0) {
                inputX /= inputMagnitude;
                inputY /= inputMagnitude;
            }
            
            // Accelerate towards input direction
            this.velocity.x += inputX * acceleration * deltaTime;
            this.velocity.y += inputY * acceleration * deltaTime;
            
            // Store movement direction for dodge
            this.dodgeDirection.x = inputX;
            this.dodgeDirection.y = inputY;
            this.isMoving = true;
        } else {
            // Apply friction when no input
            this.velocity.x *= Math.pow(friction, deltaTime * 60);
            this.velocity.y *= Math.pow(friction, deltaTime * 60);
            this.isMoving = Math.abs(this.velocity.x) > 5 || Math.abs(this.velocity.y) > 5;
        }
        
        // Clamp velocity to max speed
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
        
        // Apply movement with improved responsiveness
        const moveX = this.velocity.x * deltaTime;
        const moveY = this.velocity.y * deltaTime;
        
        // Store previous position
        const oldX = this.x;
        const oldY = this.y;
        
        // Update position directly (velocity already accounts for speed)
        this.x += moveX;
        this.y += moveY;
        
        // Create trail effect when moving
        if (this.isMoving || this.isDodging) {
            // Calculate distance moved
            const distance = Math.sqrt(
                Math.pow(this.x - this.lastTrailPos.x, 2) +
                Math.pow(this.y - this.lastTrailPos.y, 2)
            );
            
            // Create trail particles at regular intervals
            if (distance > this.trailDistance) {
                this.createTrailParticle(oldX, oldY);
                this.lastTrailPos = { x: this.x, y: this.y };
            }
        }
    }
        
    createTrailParticle(x, y) {
        // Respect performance settings
        if (!window.gameManager || window.gameManager.lowQuality) return;
        const trailSize = this.isDodging ? this.radius * 0.8 : this.radius * 0.5;
        // Slightly shorten in constrained modes
        const baseDuration = this.isDodging ? 0.4 : 0.3;
        const factor = (window.gameManager.particleReductionFactor || 1.0);
        const duration = baseDuration * (factor < 1 ? Math.max(0.6, factor + 0.4) : 1);

        this.spawnParticleViaPoolOrFallback(x, y, 0, 0, trailSize, this.color, duration, 'trail');
    }
    
    handleAttacks(deltaTime, game) {
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            // Play boss beat on attack cadence; shooting SFX plays once per volley inside attack()
            if (window.audioSystem?.playBossBeat) {
                window.audioSystem.playBossBeat();
            }
            this.attack(game);
        }
        
        // Handle AOE attack cooldown separately
        if (this.hasAOEAttack) {
            this.aoeAttackTimer += deltaTime;
            if (this.aoeAttackTimer >= this.aoeAttackCooldown) {
                this.aoeAttackTimer = 0;
                this.executeAOEAttack(game);
            }
        }
    }
    
    handleRegeneration(deltaTime) {
        if (this.regeneration > 0) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1) { // Regenerate every second
                this.regenTimer = 0;
                this.heal(this.regeneration);
            }
        }
    }
    
    heal(amount) {
        if (this.isDead || typeof amount !== 'number' || amount <= 0) return;
        
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        // Update health bar if health actually changed
        if (oldHealth !== this.health) {
            const healthBar = document.getElementById('health-bar');
            if (healthBar && typeof this.maxHealth === 'number' && this.maxHealth > 0) {
                const healthPercentage = (this.health / this.maxHealth) * 100;
                healthBar.style.setProperty('--health-width', `${healthPercentage}%`);
            }
            
            // Show healing text
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm && gm.showFloatingText) {
                gm.showFloatingText(`+${Math.round(this.health - oldHealth)}`, this.x, this.y - 30, '#2ecc71', 16);
            }
        }
    }
    
    // CRITICAL FIX: Add missing XP collection method
    addXP(amount) {
        if (this.isDead || typeof amount !== 'number' || amount <= 0) return;
        
        this.xp += amount;
        
        // Track XP collected for achievements (guarded)
        if (window.gameManager && typeof window.gameManager.addXpCollected === 'function') {
            window.gameManager.addXpCollected(amount);
        }
        
        // Show XP gain text using UnifiedUIManager for better positioning
        if (window.gameEngine?.unifiedUI) {
            window.gameEngine.unifiedUI.addXPGain(amount, this.x, this.y);
        } else {
            // Fallback to old system
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm && typeof gm.showFloatingText === 'function') {
                gm.showFloatingText(`+${amount} XP`, this.x, this.y - 20, '#f1c40f', 14);
            }
        }
        
        // Check for level up
        while (this.xp >= this.xpToNextLevel && typeof this.xpToNextLevel === 'number' && this.xpToNextLevel > 0) {
            this.levelUp();
        }
        
        // Update XP bar
        this.updateXPBar();
    }
    
    addExperience(amount) {
        // Alias for addXP to handle different calling conventions
        this.addXP(amount);
    }
    
    updateXPBar() {
        const xpBar = document.getElementById('xp-bar');
        if (xpBar && typeof this.xp === 'number' && typeof this.xpToNextLevel === 'number' && this.xpToNextLevel > 0) {
            const xpPercentage = (this.xp / this.xpToNextLevel) * 100;
            xpBar.style.setProperty('--xp-width', `${Math.min(xpPercentage, 100)}%`);
        }
        // Update level display
        const levelDisplayEl = document.getElementById('level-display');
        if (levelDisplayEl) levelDisplayEl.textContent = `Level: ${this.level}`;
    }
    
    
    
    attack(game) {
        // Find nearest enemy
        if (!game || !Array.isArray(game.enemies) || game.enemies.length === 0) return;
        
        // Find closest enemy for reference
        const nearestEnemy = this.findNearestEnemy(game.enemies);
        if (!nearestEnemy) return;
        
        // Calculate direction to enemy
        const dx = nearestEnemy.x - this.x;
        const dy = nearestEnemy.y - this.y;
        const baseAngle = Math.atan2(dy, dx);
        
        // Execute basic or spread attack
        if (this.hasBasicAttack && this.projectileCount === 1) {
            this.fireProjectile(game, baseAngle);
        } else if (this.hasSpreadAttack || (this.hasBasicAttack && this.projectileCount > 1)) {
            // Improved spread calculation for more projectiles
            let totalSpread = this.projectileSpread;
            
            // Dynamically adjust spread angle based on projectile count
            // More projectiles = slightly wider total spread
            if (this.projectileCount > 5) {
                totalSpread *= (1 + (this.projectileCount - 5) * 0.1);
            }
            
            for (let i = 0; i < this.projectileCount; i++) {
                let spreadAngle;
                if (this.projectileCount <= 1) {
                    spreadAngle = 0;
                } else {
                    // Evenly distribute projectiles across the spread angle
                    spreadAngle = -totalSpread / 2 + (totalSpread / (this.projectileCount - 1)) * i;
                }
                const angle = baseAngle + (spreadAngle * Math.PI / 180);
                this.fireProjectile(game, angle);
            }
        }
        
    // Note: AOE attack cooldown is handled in handleAttacks()
    }
    
    executeAOEAttack(game) {
        if (!game || !Array.isArray(game.enemies) || game.enemies.length === 0) return;
        // Create visual effect for AOE attack
        this.createAOEEffect();
        
        // Create AOE damage around player
        game.enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.aoeAttackRange) {
                const isCrit = Math.random() < this.critChance;
                const baseDamage = this.attackDamage * this.aoeDamageMultiplier;
                const damage = isCrit ? 
                    baseDamage * this.critMultiplier : 
                    baseDamage;
                    
                enemy.takeDamage(damage);
                
                if (isCrit) {
                    const gm = window.gameManager || window.gameManagerBridge;
                    if (gm?.showFloatingText) {
                        gm.showFloatingText(`CRIT! ${Math.round(damage)}`, enemy.x, enemy.y - 20, '#f1c40f', 16);
                    }
                }
            }
        });
        
        // Play AOE attack sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('aoeAttack', 0.4);
        }
    }
    
    createAOEEffect() {
        // Visual effect for AOE attack
        const gm = window.gameManager;
        if (!gm || gm.lowQuality) return;
        const factor = (gm.particleReductionFactor || 1.0);
        const baseCount = 24;
        const particleCount = window.MathUtils ? 
            window.MathUtils.budget(baseCount, factor, gm.maxParticles || 150, gm.particles?.length || 0) :
            Math.floor(baseCount * Math.min(factor || 1, 1));
        if (particleCount <= 0) return;
        const radius = this.aoeAttackRange;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            this.spawnParticleViaPoolOrFallback(
                this.x,
                this.y,
                Math.cos(angle) * 300,
                Math.sin(angle) * 300,
                3 + Math.random() * 3,
                '#3498db',
                0.3,
                'spark'
            );
        }
    }
    
    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.12); // Smoother XP scaling (12% instead of 15%)
        
        // Heal player on level up
        this.heal(this.maxHealth * 0.3); // Heal 30% of max health (increased from 20%)
        
        // Update level display
    const levelDisplayEl = document.getElementById('level-display');
    if (levelDisplayEl) levelDisplayEl.textContent = `Level: ${this.level}`;
        
        // Track level up achievement
        if (window.gameManager && typeof window.gameManager.onPlayerLevelUp === 'function') {
            window.gameManager.onPlayerLevelUp(this.level);
        }
        
        // Show level up message
        if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
            window.gameManager.showFloatingText(`LEVEL UP!`, this.x, this.y - 50, '#f39c12', 24);
        }
        
        // Create level up effect
        if (window.gameManager && typeof window.gameManager.createLevelUpEffect === 'function') {
            window.gameManager.createLevelUpEffect(this.x, this.y);
        }
        
        // Show upgrade options
        setTimeout(() => {
            if (window.upgradeSystem && typeof window.upgradeSystem.showUpgradeOptions === 'function') {
                window.upgradeSystem.showUpgradeOptions();
            }
        }, 0);
        
        // Play level up sound
        if (window.audioSystem && typeof window.audioSystem.play === 'function') {
            window.audioSystem.play('levelUp', 0.6);
        }
    }
    
    takeDamage(amount) {
        if (this.isInvulnerable || typeof amount !== 'number' || amount <= 0) return;
        
        // Apply damage reduction if present
        if (this.damageReduction && this.damageReduction > 0) {
            amount = amount * (1 - this.damageReduction);
        }
        
        // Apply dodge chance
        if (this.dodgeChance && Math.random() < this.dodgeChance) {
            if (window.gameManager && window.gameManager.showFloatingText) {
                window.gameManager.showFloatingText(`DODGE!`, this.x, this.y - 20, '#3498db', 18);
            }
            return;
        }
        
        this.health = Math.max(0, this.health - amount);
        
        // Notify game manager for achievement tracking
        if (window.gameManager) {
            window.gameManager.onPlayerDamaged();
        }
        
        // Show damage text
        if (window.gameManager && window.gameManager.showFloatingText) {
            window.gameManager.showFloatingText(`-${Math.round(amount)}`, this.x, this.y - 20, '#e74c3c', 18);
        }
        
        // Update health bar
        const healthBar = document.getElementById('health-bar');
        if (healthBar && typeof this.maxHealth === 'number' && this.maxHealth > 0) {
            const healthPercentage = (this.health / this.maxHealth) * 100;
            healthBar.style.setProperty('--health-width', `${healthPercentage}%`);
        }
        
        // Trigger invulnerability
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityTime;
        
        // Check if player died
        if (this.health <= 0) {
            this.isDead = true;
        }
        
        // Play hit sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('playerHit', 0.5);
        }
    }
    
    applyUpgrade(upgrade) {
        // Track if this is a stacked upgrade
        const isUpgradeStacked = this.upgrades.some(existing => 
            existing.id === upgrade.id && existing.stackCount);
        
        // Initialize stack count
        if (!upgrade.stackCount) {
            upgrade.stackCount = 1;
            upgrade.tier = 'I';
        } else {
            upgrade.stackCount++;
            
            // Set tier indicator based on stack count
            const tiers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            upgrade.tier = tiers[Math.min(upgrade.stackCount - 1, tiers.length - 1)];
        }
        
        this.upgrades.push(upgrade);
        
        // Apply the upgrade effects with improved stacking logic
        switch (upgrade.type) {
            case 'attackSpeed':
                // Apply diminishing returns for attack speed after multiple stacks
                const speedMultiplier = upgrade.stackCount > 3 ? 
                    Math.pow(upgrade.multiplier, 0.85) : upgrade.multiplier;
                this.attackSpeed *= speedMultiplier;
                this.attackCooldown = 1 / this.attackSpeed;
                break;
                
            case 'attackDamage':
                // Progressive damage scaling for better stacking
                const damageMultiplier = upgrade.stackCount > 2 ? 
                    1 + ((upgrade.multiplier - 1) * 0.9) : upgrade.multiplier;
                this.attackDamage *= damageMultiplier;
                break;
                
            case 'projectileCount':
                // Track how many projectiles were added
                const previousCount = this.projectileCount;
                this.projectileCount += upgrade.value;
                
                // Only enable spread if we have multiple projectiles
                if (this.projectileCount > 1) {
                    this.hasSpreadAttack = true;
                    
                    // Adjust projectile spread based on projectile count
                    const baseSpread = 30;
                    const projectilesAdded = upgrade.value;
                    this.projectileSpread = Math.max(
                        this.projectileSpread, 
                        baseSpread * (1 + (this.projectileCount - 2) * 0.15)
                    );
                    
                    // Show additional information about current projectile count
                    window.gameManager.showFloatingText(
                        `Now firing ${this.projectileCount} projectiles!`, 
                        this.x, this.y - 60, 
                        '#f39c12', 16
                    );
                }
                break;
                
            case 'projectileSpread':
                this.projectileSpread += upgrade.value;
                break;
                
            case 'piercing':
                this.piercing += upgrade.value || 1; // Add piercing count
                break;
                
            case 'speed':
                this.speed *= upgrade.multiplier;
                break;
                
            case 'maxHealth':
                const oldMaxHealth = this.maxHealth;
                this.maxHealth *= upgrade.multiplier;
                this.health += (this.maxHealth - oldMaxHealth);
                break;
                
            case 'critChance':
                // Diminishing returns for crit chance after getting high
                if (this.critChance > 0.4) {
                    this.critChance += upgrade.value * 0.7; // 70% effectiveness at high levels
                } else {
                    this.critChance += upgrade.value;
                }
                break;
                
            case 'critDamage':
                // Crit damage can keep stacking effectively
                this.critMultiplier += upgrade.value;
                break;
                
            case 'regeneration':
                // Regeneration also scales well with stacking
                this.regeneration += upgrade.value;
                break;
                
            case 'magnet':
                this.magnetRange += upgrade.value;
                break;
                
            case 'projectileSpeed':
                this.projectileSpeed *= upgrade.multiplier;
                break;
                
            case 'damageReduction':
                this.damageReduction = Math.min(0.75, (this.damageReduction || 0) + upgrade.value);
                break;
                
            case 'dodgeCooldown':
                this.dodgeCooldown *= upgrade.multiplier;
                break;
                
            case 'dodgeDuration':
                this.dodgeDuration *= upgrade.multiplier;
                break;
                
            case 'dodgeInvulnerability':
                this.invulnerabilityTime += upgrade.value;
                break;
                
            case 'special':
                if (upgrade.specialType === 'orbit') {
                    this.hasOrbitalAttack = true;
                    this.orbitCount += upgrade.value || 1;
                    this.orbitDamage = upgrade.damage || 0.4;
                    this.orbitSpeed = upgrade.orbitSpeed || 2;
                    this.orbitRadius = upgrade.orbitRadius || 80;
                }
                else if (upgrade.specialType === 'chain') {
                    this.hasChainLightning = true;
                    this.chainChance = upgrade.value || 0.3;
                    this.chainDamage = upgrade.chainDamage || 0.7;
                    this.chainRange = upgrade.chainRange || 150;
                    this.maxChains = upgrade.maxChains || 1;
                }
                else if (upgrade.specialType === 'explosion') {
                    this.hasExplosiveShots = true;
                    this.explosionRadius = upgrade.explosionRadius || 60;
                    this.explosionDamage = upgrade.explosionDamage || 0.5;
                }
                else if (upgrade.specialType === 'ricochet') {
                    this.hasRicochet = true;
                    this.ricochetBounces = upgrade.bounces || 1;
                    this.ricochetRange = upgrade.bounceRange || 180;
                    this.ricochetDamage = upgrade.bounceDamage || 0.8;
                }
                else if (upgrade.specialType === 'aoe') {
                    this.hasAOEAttack = true;
                    this.aoeAttackRange = Math.max(150, this.aoeAttackRange);
                    this.aoeAttackTimer = this.aoeAttackCooldown;
                }
                break;
                
            case 'orbit':
                this.orbitCount += upgrade.value || 1;
                break;
                
            case 'orbitDamage':
                this.orbitDamage *= upgrade.multiplier || 1;
                break;
                
            case 'orbitSpeed':
                this.orbitSpeed *= upgrade.multiplier || 1;
                break;
                
            case 'orbitSize':
                this.orbitRadius += upgrade.value || 0;
                break;
                
            case 'chain':
                this.chainChance = upgrade.value || this.chainChance;
                if (upgrade.maxChains) this.maxChains = upgrade.maxChains;
                break;
                
            case 'chainDamage':
                this.chainDamage = upgrade.value || this.chainDamage;
                break;
                
            case 'chainRange':
                this.chainRange *= upgrade.multiplier || 1;
                break;
                
            case 'explosionSize':
                this.explosionRadius *= upgrade.multiplier || 1;
                break;
                
            case 'explosionDamage':
                this.explosionDamage = upgrade.value || this.explosionDamage;
                break;
                
            case 'explosionChain':
                this.explosionChainChance = upgrade.value || 0;
                break;
                
            case 'lifesteal':
                // Diminishing returns for high lifesteal
                if (this.lifestealAmount > 0.15) {
                    this.lifestealAmount += upgrade.value * 0.7; // 70% effectiveness at high levels
                } else {
                    this.lifestealAmount += upgrade.value;
                }
                break;
                
            case 'lifestealCrit':
                this.lifestealCritMultiplier = upgrade.multiplier || 1;
                break;
                
            case 'lifestealAOE':
                this.lifestealAOE = true;
                break;
                
            case 'ricochetBounces':
                this.ricochetBounces += upgrade.value || 1;
                break;
                
            case 'ricochetDamage':
                this.ricochetDamage = upgrade.value || this.ricochetDamage;
                break;
        }
        
        // Show upgraded message with tier for stacked upgrades
        if (isUpgradeStacked) {
            const tierText = upgrade.tier ? ` ${upgrade.tier}` : '';
            if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
                window.gameManager.showFloatingText(
                    `${upgrade.name}${tierText} upgraded!`, 
                    this.x, 
                    this.y - 30, 
                    '#e67e22', // Orange color for upgrades
                    18
                );
            }
            
            // Add more dramatic visual effect for stacked upgrades
            this.createUpgradeStackEffect();
        } else {
            if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
                window.gameManager.showFloatingText(
                    `${upgrade.name} acquired!`, 
                    this.x, 
                    this.y - 30, 
                    '#3498db', 
                    18
                );
            }
        }
    }
    
    createUpgradeStackEffect() {
        if (!window.gameManager?.particles || window.gameManager.lowQuality) return;
        
        // Use simplified budget calculation
        const count = window.MathUtils ? 
            window.MathUtils.budget(16, window.gameManager.particleReductionFactor, window.gameManager.maxParticles, window.gameManager.particles.length) :
            Math.floor(16 * Math.min(window.gameManager.particleReductionFactor || 1, 1));
        if (count <= 0) return;
        
        // Create simple spiral effect
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 30;
            this.spawnParticleViaPoolOrFallback(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                Math.cos(angle) * 60,
                Math.sin(angle) * 60,
                4,
                '#e67e22',
                0.5,
                'spark'
            );
        }
        
        // Simple effects
        if (window.gameManager?.addScreenShake) {
            window.gameManager.addScreenShake(2, 0.2);
        }
        if (window.audioSystem?.play) {
            window.audioSystem.play('levelUp', 0.3);
        }
    }
    
    handleDodge(deltaTime, game) {
        // Progress cooldown timer when dodge is unavailable
        if (!this.canDodge) {
            this.dodgeCooldownTimer += deltaTime;
            if (!this.isDodging && this.dodgeCooldownTimer >= this.dodgeCooldown) {
                this.canDodge = true;
                this.dodgeCooldownTimer = 0;
            }
        }
        
        // Handle active dodge duration independently
        if (this.isDodging) {
            this.dodgeActiveTimer += deltaTime;
            // Cooldown also progresses during active dodge
            this.dodgeCooldownTimer += deltaTime;
            if (this.dodgeActiveTimer >= this.dodgeDuration) {
                this.isDodging = false;
                this.dodgeActiveTimer = 0;
                this.isInvulnerable = false;
            }
        }
        
        // Get keys from the game engine (fix for dodge bug)
        const keys = game.keys || {};
        
        // Only activate dodge if game is active (not paused or in level-up menu)
        if (keys[' '] && this.canDodge && !this.isDodging && 
            (!window.gameManager?.isMenuActive || !window.gameManager.isMenuActive())) {
            keys[' '] = false; // Prevent holding space
            this.doDodge();
        }
    }
    
    doDodge() {
        if (!this.canDodge || this.isDodging) return;
        
        // Check for perfect dodge (dodging just before being hit)
        let wasPerfectDodge = false;
        if (window.gameManager && window.gameManager.game) {
            for (const enemy of window.gameManager.game.enemies) {
                if (enemy.isAttacking && this.distanceTo(enemy) < 50) {
                    wasPerfectDodge = true;
                    break;
                }
            }
        }
        
    this.isDodging = true;
    this.isInvulnerable = true;
    this.canDodge = false;
    this.dodgeActiveTimer = 0;
    this.dodgeCooldownTimer = 0;
        
        // Track dodge achievement
        if (window.gameManager) {
            window.gameManager.onDodge(wasPerfectDodge);
        }
        
        // Visual effect for dodge
        {
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm && typeof gm.showFloatingText === 'function') {
                gm.showFloatingText("Dodge!", this.x, this.y - 30, '#3498db', 18);
            }
        }
        
        // Create dodge effect
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm && !gm.lowQuality) {
            const factor = (gm.particleReductionFactor || 1.0);
            const baseCount = 10;
            const count = window.MathUtils && typeof window.MathUtils.budget === 'function' ? 
                window.MathUtils.budget(baseCount, factor, gm.maxParticles || 150, gm.particles?.length || 0) :
                Math.floor(baseCount * Math.min(factor || 1, 1));
            for (let i = 0; i < count; i++) {
                this.spawnParticleViaPoolOrFallback(
                    this.x,
                    this.y,
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50,
                    this.radius / 2,
                    this.color,
                    0.3,
                    'spark'
                );
            }
        }
        
        // Play dodge sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('dodge', 0.7);
        }
    }
    
    handleInvulnerability(deltaTime) {
        // Handle invulnerability period after taking damage
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }
    
    render(ctx) {
        // Draw player
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (this.isInvulnerable) {
            ctx.strokeStyle = this.isDodging ? '#3498db' : this.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Add dash effect when dodging
            if (this.isDodging) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        // Draw attack range indicator (optional)
        if (this.hasAOEAttack) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.aoeAttackRange, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
        }
        
        // Draw dodge cooldown indicator
        if (!this.canDodge) {
            const cooldownPercent = Math.min(1, this.dodgeCooldownTimer / this.dodgeCooldown);
            ctx.beginPath();
            ctx.arc(
                this.x, 
                this.y, 
                this.radius + 8, 
                -Math.PI / 2, 
                -Math.PI / 2 + (2 * Math.PI * cooldownPercent)
            );
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw orbital projectiles if player has them
        if (this.hasOrbitalAttack && this.orbitProjectiles.length > 0) {
            // Draw orbit path (faintly)
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.orbitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw each orbital projectile
            for (const orb of this.orbitProjectiles) {
                // Draw the orbital projectile
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#3498db';
                ctx.fill();
                
                // Draw glow effect
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, 12, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                ctx.fill();
            }
        }
    }
    
    updateOrbitalAttacks(deltaTime, game) {
        if (!this.hasOrbitalAttack || this.orbitCount <= 0) return;
        
        // Update orbit angle based on orbit speed
        this.orbitAngle += this.orbitSpeed * deltaTime;
        if (this.orbitAngle >= Math.PI * 2) {
            this.orbitAngle -= Math.PI * 2;
        }
        
        // Update orbital projectile positions
        const angleStep = (Math.PI * 2) / this.orbitCount;
        
        // Create orbit projectiles if they don't exist
        if (this.orbitProjectiles.length !== this.orbitCount) {
            this.orbitProjectiles = [];
            for (let i = 0; i < this.orbitCount; i++) {
                this.orbitProjectiles.push({
                    angle: this.orbitAngle + (i * angleStep),
                    x: 0,
                    y: 0,
                    hitEnemies: new Set(), // Track enemies hit in current rotation
                    cooldown: 0 // Cooldown before the same enemy can be hit again
                });
            }
        }
        
        // Update orbit positions and check for collisions
        for (let i = 0; i < Math.min(this.orbitProjectiles.length, this.orbitCount); i++) {
            const orb = this.orbitProjectiles[i];
            if (!orb || typeof orb !== 'object') continue; // Skip invalid orb objects
            orb.angle = this.orbitAngle + (i * angleStep);
            orb.x = this.x + Math.cos(orb.angle) * this.orbitRadius;
            orb.y = this.y + Math.sin(orb.angle) * this.orbitRadius;
              // Reduce cooldown for orbital hits
            if (orb.cooldown > 0) {
                orb.cooldown -= deltaTime;
            }
            
            // Reset hit enemies when projectile has moved enough (more frequent reset)
            if (i === 0 && Math.abs(orb.angle % (Math.PI / 4)) < 0.05) {
                for (const orbProjectile of this.orbitProjectiles) {
                    orbProjectile.hitEnemies.clear();
                    orbProjectile.cooldown = 0;
                }
            }
            
            // Check for enemy collisions with improved detection
            if (!game?.enemies || !Array.isArray(game.enemies)) continue;
            
            for (const enemy of game.enemies) {
                if (!enemy || enemy.isDead || orb.hitEnemies.has(enemy.id) || orb.cooldown > 0) continue;
                  const dx = enemy.x - orb.x;
                const dy = enemy.y - orb.y;
                // Use squared distance to avoid expensive sqrt
                const distanceSquared = dx * dx + dy * dy;
                const collisionRadius = enemy.radius + 10; // 10 = orbital projectile size
                
                if (distanceSquared < collisionRadius * collisionRadius) {
                    // Calculate damage
                    let damage = this.attackDamage * this.orbitDamage;
                    const isCrit = Math.random() < this.critChance;
                    if (isCrit) {
                        damage *= this.critMultiplier;
                    }
                    
                    // Apply damage to enemy
                    enemy.takeDamage(damage);
                    
                    // Display damage number
                    if ((window.gameManager || window.gameManagerBridge) && typeof (window.gameManager || window.gameManagerBridge).showFloatingText === 'function') {
                        const gm = window.gameManager || window.gameManagerBridge;
                        if (isCrit) {
                            gm.showFloatingText(`CRIT! ${Math.round(damage)}`, 
                                                        enemy.x, enemy.y - 20, '#f1c40f', 16);
                        } else {
                            gm.showFloatingText(`${Math.round(damage)}`, 
                                                        enemy.x, enemy.y - 20, '#ffffff', 14);
                        }
                    }
                    
                    // Apply lifesteal if player has it
                    if (this.lifestealAmount > 0) {
                        const healAmount = damage * this.lifestealAmount * 
                            (isCrit ? this.lifestealCritMultiplier : 1);
                        this.heal(healAmount);
                    }
                      // Add to set of hit enemies for this orbit with cooldown
                    orb.hitEnemies.add(enemy.id);
                    orb.cooldown = 0.1; // Small cooldown to prevent rapid repeated hits
                    
                    // Create hit effect
                    if ((window.gameManager || window.gameManagerBridge)?.createHitEffect) {
                        (window.gameManager || window.gameManagerBridge).createHitEffect(enemy.x, enemy.y);
                    }
                    
                    // Play hit sound
                    if (window.audioSystem?.play) {
                        window.audioSystem.play('hit', 0.2);
                    }
                }
            }
        }
        
        // Track orbital count for achievement
        if (window.gameManager || window.gameManagerBridge) {
            (window.gameManager || window.gameManagerBridge).onOrbitalCountChanged?.(this.orbitCount);
        }
    }
      processChainLightning(startEnemy, baseDamage, chainsLeft, hitEnemies = new Set()) {
        // Enhanced safety checks to prevent infinite loops
        if (chainsLeft <= 0 || !startEnemy || hitEnemies.size > 20) return;
        
        // Add recursion depth limit as backup safety
        if (!this._chainDepth) this._chainDepth = 0;
        this._chainDepth++;
        if (this._chainDepth > 10) {
            this._chainDepth = 0; // Reset counter
            return;
        }
        
        // Validate start enemy
        if (!startEnemy || startEnemy.isDead || typeof startEnemy.x !== 'number' || typeof startEnemy.y !== 'number') {
            this._chainDepth = Math.max(0, this._chainDepth - 1);
            return;
        }
        
        // Find closest enemy that hasn't been hit
        let closestEnemy = null;
        let closestDistance = this.chainRange || 150; // Fallback range
        
        // Make sure we're accessing the enemies array correctly with validation
        const enemies = window.gameManager?.game?.enemies || [];
        if (!Array.isArray(enemies) || enemies.length === 0) {
            this._chainDepth--;
            return;
        }
        
        for (const enemy of enemies) {
            // Enhanced validation and skip conditions
            if (!enemy || hitEnemies.has(enemy.id) || enemy.isDead || 
                typeof enemy.x !== 'number' || typeof enemy.y !== 'number') continue;
            
            const dx = enemy.x - startEnemy.x;
            const dy = enemy.y - startEnemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance && distance > 0) { // Ensure distance > 0
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }
        
        // If we found an enemy to chain to
        if (closestEnemy && !hitEnemies.has(closestEnemy.id)) {
            // Calculate damage for chain hit
            const chainDamage = baseDamage * this.chainDamage;
            const isCrit = Math.random() < this.critChance;
            const finalDamage = isCrit ? chainDamage * this.critMultiplier : chainDamage;
            
            // Create lightning visual effect
            this.createLightningEffect(startEnemy, closestEnemy);
            
            // Apply damage to enemy
            closestEnemy.takeDamage(finalDamage);
            
            // Display damage number
            if ((window.gameManager || window.gameManagerBridge) && typeof (window.gameManager || window.gameManagerBridge).showFloatingText === 'function') {
                const gm = window.gameManager || window.gameManagerBridge;
                if (isCrit) {
                    gm.showFloatingText(`CHAIN CRIT! ${Math.round(finalDamage)}`, 
                                               closestEnemy.x, closestEnemy.y - 20, '#3498db', 16);
                } else {
                    gm.showFloatingText(`CHAIN ${Math.round(finalDamage)}`, 
                                               closestEnemy.x, closestEnemy.y - 20, '#3498db', 14);
                }
            }
            
            // Apply lifesteal if player has it
            if (this.lifestealAmount > 0) {
                const healAmount = finalDamage * this.lifestealAmount * 
                    (isCrit ? this.lifestealCritMultiplier : 1);
                this.heal(healAmount);
            }
            
            // Add to hit enemies
            hitEnemies.add(closestEnemy.id);
            
            // Track chain hits for achievement
            if (window.gameManager || window.gameManagerBridge) {
                (window.gameManager || window.gameManagerBridge).onChainLightningHit?.(hitEnemies.size);
            }
              // Continue chain with safety checks
            if (chainsLeft > 1 && hitEnemies.size < 15) {
                this.processChainLightning(closestEnemy, baseDamage, chainsLeft - 1, hitEnemies);
            }
        }
        
        // Reset recursion depth counter
        this._chainDepth = Math.max(0, this._chainDepth - 1);
    }
    
    processRicochet(sourceX, sourceY, damage, bouncesLeft, hitEnemies = new Set()) {
        if (bouncesLeft <= 0 || hitEnemies.size > 15) return; // Prevent excessive chains
        
        // Safety checks for parameters
        if (typeof sourceX !== 'number' || typeof sourceY !== 'number' || 
            typeof damage !== 'number' || damage <= 0) {
            return;
        }
        
        // Make sure we're accessing the enemies array correctly
        const enemies = (window.gameManager || window.gameManagerBridge)?.game?.enemies || [];
        if (enemies.length === 0) return;
        
        // Find closest enemy that hasn't been hit
        let closestEnemy = null;
        let closestDistance = this.ricochetRange || 200; // Fallback range
        
        for (const enemy of enemies) {
            // Skip if already hit, dead, or invalid
            if (!enemy || hitEnemies.has(enemy.id) || enemy.isDead || 
                typeof enemy.x !== 'number' || typeof enemy.y !== 'number') continue;
            
            const dx = enemy.x - sourceX;
            const dy = enemy.y - sourceY;
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);
            
            // Prevent division by zero or invalid distance
            if (distance > 0 && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }
        
        // If we found an enemy to ricochet to
        if (closestEnemy) {
            // Calculate ricochet damage with safety checks
            const critChance = this.critChance || 0;
            const critMultiplier = this.critMultiplier || 1;
            const ricochetDamageMultiplier = this.ricochetDamage || 0.5;
            
            const isCrit = Math.random() < critChance;
            const ricochetDamage = damage * ricochetDamageMultiplier * 
                (isCrit ? critMultiplier : 1);
            
            // Create ricochet visual effect with safety checks
            if (typeof this.createRicochetEffect === 'function') {
                this.createRicochetEffect(sourceX, sourceY, closestEnemy.x, closestEnemy.y);
            }
            
            // Apply damage to enemy
            closestEnemy.takeDamage(ricochetDamage);
            
            // Display damage number with ricochet indicator
            if ((window.gameManager || window.gameManagerBridge) && typeof (window.gameManager || window.gameManagerBridge).showFloatingText === 'function') {
                const gm = window.gameManager || window.gameManagerBridge;
                if (isCrit) {
                    gm.showFloatingText(`BOUNCE CRIT! ${Math.round(ricochetDamage)}`, 
                                              closestEnemy.x, closestEnemy.y - 20, '#f39c12', 16);
                } else {
                    gm.showFloatingText(`BOUNCE ${Math.round(ricochetDamage)}`, 
                                              closestEnemy.x, closestEnemy.y - 20, '#f39c12', 14);
                }
            }
            
            // Apply lifesteal if player has it
            if (this.lifestealAmount > 0) {
                const healAmount = ricochetDamage * this.lifestealAmount * 
                    (isCrit ? this.lifestealCritMultiplier : 1);
                this.heal(healAmount);
            }
            
            // Add to hit enemies
            hitEnemies.add(closestEnemy.id);
            
            // Track ricochet hits for achievement
            if (window.gameManager || window.gameManagerBridge) {
                (window.gameManager || window.gameManagerBridge).onRicochetHit?.(hitEnemies.size);
            }
            
            // Continue ricochet IMMEDIATELY (no setTimeout)
            // This makes the ricochet appear faster
            this.processRicochet(
                closestEnemy.x, closestEnemy.y,
                damage, 
                bouncesLeft - 1,
                hitEnemies
            );
        }
    }

    createLightningEffect(from, to) {
        // Create lightning particles within performance budget
        const gm = window.gameManager || window.gameManagerBridge;
        if (!gm || gm.lowQuality) return;
        const factor = (gm.particleReductionFactor || 1.0);
        const segments = Math.max(3, Math.floor(8 * factor)); // scale detail by perf factor
        const baseX = from.x;
        const baseY = from.y;
        const targetX = to.x;
        const targetY = to.y;
        
        // Add initial spark effect at the source
        for (let i = 0, n = Math.max(0, Math.floor(5 * factor)); i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            const size = 2 + Math.random() * 2;
            this.spawnParticleViaPoolOrFallback(
                baseX,
                baseY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#81ecec',
                0.15,
                'spark'
            );
        }
        
        // Calculate main lightning path with increased randomization
        let prevX = baseX;
        let prevY = baseY;
        const points = []; // Store points for potential branch creation
        
        for (let i = 1; i <= segments; i++) {
            const ratio = i / segments;
            const straightX = baseX + (targetX - baseX) * ratio;
            const straightY = baseY + (targetY - baseY) * ratio;
            
            // Add increased randomness to path
            const randomness = 30 * (1 - ratio); // Increased from 20
            const x = straightX + (Math.random() * randomness * 2 - randomness);
            const y = straightY + (Math.random() * randomness * 2 - randomness);
            
            // Draw lightning segment with glowing effect
            this.spawnParticleViaPoolOrFallback(
                prevX,
                prevY,
                (x - prevX) * 12,
                (y - prevY) * 12,
                4,
                '#74b9ff',
                0.2,
                'spark'
            );
            
            // Create parallel faint lightning traces for glow effect
            const offsetDist = 3;
            const offsetAngle = Math.atan2(y - prevY, x - prevX) + Math.PI/2;
            
            // Create glow particles on either side of main bolt
            for (let j = -1; j <= 1; j += 2) {
                const offsetX = prevX + Math.cos(offsetAngle) * offsetDist * j;
                const offsetY = prevY + Math.sin(offsetAngle) * offsetDist * j;
                this.spawnParticleViaPoolOrFallback(
                    offsetX,
                    offsetY,
                    (x - prevX) * 12,
                    (y - prevY) * 12,
                    3,
                    'rgba(116, 185, 255, 0.4)',
                    0.15,
                    'spark'
                );
            }
            
            // Store points for branches
            points.push({x, y});
            prevX = x;
            prevY = y;
        }
        
        // Create random branches (forks) in the lightning
        const branchCount = Math.max(0, Math.floor((1 + Math.floor(Math.random() * 2)) * factor));
        for (let i = 0; i < branchCount; i++) {
            if (points.length < 3) continue; // Need enough points for branching
            
            // Select a random point from the first 70% of the lightning path
            const sourceIndex = Math.floor(Math.random() * (points.length * 0.7));
            const source = points[sourceIndex];
            
            // Create a short branch (2-3 segments)
            let branchX = source.x;
            let branchY = source.y;
            const branchSegments = Math.max(1, Math.floor((2 + Math.floor(Math.random())) * factor));
            
            for (let j = 0; j < branchSegments; j++) {
                // Random angle deviation within 60 degrees of main bolt
                const angle = Math.random() * Math.PI / 3 - Math.PI / 6;
                const distance = 10 + Math.random() * 20;
                
                const nextX = branchX + Math.cos(angle) * distance;
                const nextY = branchY + Math.sin(angle) * distance;
                
                // Create branch particle
                if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                    window.optimizedParticles.spawnParticle({
                        x: branchX, y: branchY,
                        vx: (nextX - branchX) * 10,
                        vy: (nextY - branchY) * 10,
                        size: 2,
                        color: '#0984e3',
                        life: 0.15,
                        type: 'spark'
                    });
                } else {
                    const branchParticle = new Particle(
                        branchX, branchY,
                        (nextX - branchX) * 10,
                        (nextY - branchY) * 10,
                        2,
                        '#0984e3',
                        0.15
                    );
                    gm.tryAddParticle(branchParticle);
                }
                
                branchX = nextX;
                branchY = nextY;
            }
        }
        
        // Create enhanced impact flash at target
        this.spawnParticleViaPoolOrFallback(
            to.x,
            to.y,
            0,
            0,
            18,
            '#74b9ff',
            0.2,
            'basic'
        );
        
        // Add secondary expanding ring for impact
        if (typeof ShockwaveParticle !== 'undefined') {
            const impactRing = new ShockwaveParticle(
                to.x, to.y,
                40, // Size of ring
                '#0984e3',
                0.3 // Duration
            );
            gm.tryAddParticle(impactRing);
        }
        
        // Add small sparks at impact point
        for (let i = 0, n = Math.max(0, Math.floor(8 * factor)); i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            const size = 1 + Math.random() * 3;
            
            this.spawnParticleViaPoolOrFallback(
                to.x,
                to.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                i % 2 === 0 ? '#74b9ff' : '#0984e3',
                0.2 + Math.random() * 0.2,
                'spark'
            );
        }
        
        // Add subtle screen shake for impact
        if ((window.gameManager || window.gameManagerBridge)?.addScreenShake) {
            (window.gameManager || window.gameManagerBridge).addScreenShake(2, 0.2);
        }
        
        // Play lightning sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('hit', 0.3);
        }
    }

    findNearestEnemy(enemies) {
        if (!enemies || enemies.length === 0) return null;
        
        let nearestEnemy = null;
        let shortestDistanceSquared = Infinity;
        
        for (const enemy of enemies) {
            // Validate enemy object
            if (!enemy || typeof enemy.x !== 'number' || typeof enemy.y !== 'number' || 
                enemy.isDead) continue;
            
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distanceSquared = dx * dx + dy * dy;
            
            // Use squared distance to avoid expensive sqrt calculation
            // Ensure we have a valid distance and it's not the same position
            if (distanceSquared < shortestDistanceSquared && distanceSquared >= 1) {
                shortestDistanceSquared = distanceSquared;
                nearestEnemy = enemy;
            }
        }
        
        return nearestEnemy;
    }

    fireProjectile(game, angle) {
        // Calculate base projectile count (split shot)
        const projectileCount = this.projectileCount || 1;
        
        // Calculate spread for multiple projectiles
        const baseSpread = (this.projectileSpread || 30) * (Math.PI / 180); // Convert to radians
        const spreadStep = projectileCount > 1 ? baseSpread / (projectileCount - 1) : 0;
        const spreadStart = projectileCount > 1 ? -baseSpread / 2 : 0;
        
        // Fire each projectile
        for (let i = 0; i < projectileCount; i++) {
            // Calculate angle for this projectile (with spread for multi-shot)
            const projectileAngle = angle + spreadStart + (spreadStep * i);
            const vx = Math.cos(projectileAngle) * this.projectileSpeed;
            const vy = Math.sin(projectileAngle) * this.projectileSpeed;
            
            // Determine if this shot is a critical hit
            const isCrit = Math.random() < this.critChance;
            const damage = isCrit ? 
                this.attackDamage * this.critMultiplier : 
                this.attackDamage;
            
            // Determine special projectile type for each projectile independently
            // Allow multiple special types with reduced probability for combinations
            let specialTypes = [];
            
            if (this.hasChainLightning && Math.random() < this.chainChance) {
                specialTypes.push('chain');
            }
            if (this.hasExplosiveShots && Math.random() < 0.3) {
                specialTypes.push('explosive');
            }
            if (this.hasRicochet && Math.random() < 0.25) {
                specialTypes.push('ricochet');
            }
            if (this.hasHomingShots && Math.random() < 0.2) {
                specialTypes.push('homing');
            }
            
            // Select primary special type (simplified array access)
            let specialType = specialTypes[0] || null;
            
            // Create projectile via engine pool
            const projectile = game.spawnProjectile(
                this.x,
                this.y,
                vx,
                vy,
                damage,
                this.piercing,
                isCrit,
                specialType
            );
            
            // Add secondary special effects for combination builds
            if (specialTypes.length > 1) {
                for (let i = 1; i < specialTypes.length; i++) {
                    const secondaryType = specialTypes[i];
                    if (secondaryType === 'explosive' && !projectile.explosive) {
                        projectile.initializeSpecialType('explosive');
                    } else if (secondaryType === 'chain' && !projectile.chainLightning) {
                        projectile.initializeSpecialType('chain');
                    } else if (secondaryType === 'ricochet' && !projectile.ricochet) {
                        projectile.initializeSpecialType('ricochet');
                    } else if (secondaryType === 'homing' && !projectile.homing) {
                        projectile.initializeSpecialType('homing');
                    }
                }
            }
            
            // For critical hits, make projectiles larger and faster
            if (isCrit) {
                projectile.radius *= 1.3;
                projectile.vx *= 1.15;
                projectile.vy *= 1.15;
            }
            
            // Add lifesteal if player has it
            if (this.lifestealAmount > 0) {
                projectile.lifesteal = this.lifestealAmount;
                if (isCrit && this.lifestealCritMultiplier > 1) {
                    projectile.lifesteal *= this.lifestealCritMultiplier;
                }
            }
            
            // Override special properties with player's upgraded values for all special types
            for (const type of specialTypes) {
                if (type === 'chain' && projectile.chainLightning) {
                    projectile.chainLightning.chainRange = this.chainRange || 150;
                    projectile.chainLightning.maxChains = this.maxChains || 3;
                    projectile.chainLightning.chainDamage = (this.chainDamage || damage) * 0.7;
                } else if (type === 'explosive' && projectile.explosive) {
                    projectile.explosive.radius = this.explosionRadius || 80;
                    // Fix explosion damage calculation - explosionDamage is a multiplier
                    const damageMultiplier = this.explosionDamage > 0 ? this.explosionDamage : 0.8;
                    projectile.explosive.damage = damage * damageMultiplier;
                } else if (type === 'ricochet' && projectile.ricochet) {
                    projectile.ricochet.bounces = this.ricochetBounces || 3;
                    projectile.ricochet.range = this.ricochetRange || 200;
                }
            }
            
            // Entity already added by spawnProjectile
        }
        
    // Play shooting sound (once per volley)
    if (window.audioSystem?.play) {
        window.audioSystem.play('shoot', 0.3);
    }
    }

    createRicochetEffect(fromX, fromY, toX, toY) {
        // Calculate direction vector
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Create tracer line with multiple particles
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm && gm.lowQuality) return;
        const factor = gm ? (gm.particleReductionFactor || 1.0) : 1.0;
        const baseParticles = Math.floor(distance / 10);
        const particleCount = window.MathUtils ? 
            Math.max(0, Math.floor(window.MathUtils.clamp(baseParticles, 0, 15) * factor)) :
            Math.max(0, Math.floor(Math.min(Math.max(baseParticles, 0), 15) * factor));
        if (particleCount <= 0) return;
        for (let i = 0; i < particleCount; i++) {
            const ratio = i / particleCount;
            const x = fromX + dx * ratio;
            const y = fromY + dy * ratio;
            
            // Create particle for tracer line
            this.spawnParticleViaPoolOrFallback(
                x,
                y,
                0,
                0,
                3 * (1 - ratio),
                '#f39c12',
                0.2 + ratio * 0.1,
                'spark'
            );
        }
        
        // Create impact flash at destination
        this.spawnParticleViaPoolOrFallback(
            toX,
            toY,
            0,
            0,
            12,
            '#e67e22',
            0.2,
            'basic'
        );
        
        // Add small spark particles at ricochet point
        for (let i = 0, n = Math.max(0, Math.floor(6 * (factor || 1.0))); i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            const size = 2 + Math.random() * 2;
            
            this.spawnParticleViaPoolOrFallback(
                toX,
                toY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#f39c12',
                0.3,
                'spark'
            );
        }
        
        // Create small shockwave at ricochet point
        if (typeof ShockwaveParticle !== 'undefined') {
            const shockwave = new ShockwaveParticle(
                toX, toY,
                30, // Size of shockwave
                '#f39c12',
                0.25 // Duration
            );
            gm?.tryAddParticle(shockwave);
        }
        
        // Add subtle screen shake for ricochet impact
        if ((window.gameManager || window.gameManagerBridge)?.addScreenShake) {
            (window.gameManager || window.gameManagerBridge).addScreenShake(1, 0.15);
        }
        
        // Play ricochet sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('hit', 0.25);
        }
    }
    
    /**
     * Calculate distance to another entity
     * @param {Object} other - Entity with x and y properties
     * @returns {number} Distance in pixels
     */
    distanceTo(other) {
        if (!other || typeof other.x !== 'number' || typeof other.y !== 'number') {
            return Infinity;
        }
        if (typeof this.x !== 'number' || typeof this.y !== 'number') {
            return Infinity; // Ensure this player instance is also valid
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
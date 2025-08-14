class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = 'player';
        this.radius = 20;
        this.speed = 220; // Slightly faster base speed
        this.health = 120; // More starting health
        this.maxHealth = 120;
        this.xp = 0;
        this.xpToNextLevel = 212; // Lower first level XP requirement (from 80)
        this.level = 1;
        this.isDead = false;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0.5; // seconds
        this.invulnerabilityTimer = 0;
        this.color = '#3498db';
        
        // Attack properties
        this.attackSpeed = 1.2; // Slightly faster base attack speed
        this.attackDamage = 25; // Increased from 15 for better early game balance
        this.attackRange = 300;
        this.attackTimer = 0;
        this.attackCooldown = 1 / this.attackSpeed;
        
        // Replace single attackType with separate flags
        this.hasBasicAttack = true;
        this.hasSpreadAttack = false;
        this.hasAOEAttack = false;
        
        this.projectileSpeed = 450; // Faster projectiles
        this.projectileCount = 1;
        this.projectileSpread = 0; // angle in degrees
        this.piercing = 0; // Number of enemies projectile can pierce through
        this.critChance = 0.10; // 10% base chance (up from 8%)
        this.critMultiplier = 2.2; // 2.2x damage on crit (up from 2.0)
        
        // AOE attack specific properties
        this.aoeAttackCooldown = 2.0; // seconds between AOE attacks
        this.aoeAttackTimer = 0;
        this.aoeAttackRange = 150; // shorter than projectile range
        this.aoeDamageMultiplier = 0.6; // AOE does less damage per hit than projectiles
        
        // Defensive properties
        this.damageReduction = 0; // percentage (0-1)
        this.dodgeChance = 0; // percentage (0-1)
        this.regeneration = 0; // health per second
        this.regenTimer = 0;
        
        // Special abilities
        this.magnetRange = 120; // Increased base XP attraction radius
        
        // Upgrade-related properties
        this.upgrades = [];
        
        // Dodge ability
        this.canDodge = true;
        this.dodgeCooldown = 2; // seconds
        this.dodgeTimer = 0;
        this.isDodging = false;
        this.dodgeDuration = 0.3; // seconds
        this.dodgeSpeed = 600; // faster speed during dodge
        this.dodgeDirection = { x: 0, y: 0 };
        
        // Trail effect properties
        this.lastTrailPos = { x: 0, y: 0 };
        this.trailDistance = 15; // Distance before creating a new trail particle
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
        this.explosionChainChance = 0;
        
        // Lifesteal properties
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
        let dx = 0;
        let dy = 0;
        
        // Get keys from the game engine (fix for movement bug)
        const keys = game.keys || {};
        
        if (keys['w'] || keys['W']) dy -= 1;
        if (keys['s'] || keys['S']) dy += 1;
        if (keys['a'] || keys['A']) dx -= 1;
        if (keys['d'] || keys['D']) dx += 1;
        // Alternative arrow key controls
        if (keys['ArrowUp']) dy -= 1;
        if (keys['ArrowDown']) dy += 1;
        if (keys['ArrowLeft']) dx -= 1;
        if (keys['ArrowRight']) dx += 1;
        
        // Store movement direction for dodge
        if (dx !== 0 || dy !== 0) {
            this.dodgeDirection.x = dx;
            this.dodgeDirection.y = dy;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const norm = 1 / Math.sqrt(dx * dx + dy * dy);
            dx *= norm;
            dy *= norm;
        }
        
        // Use dodge speed if dodging
        const speed = this.isDodging ? this.dodgeSpeed : this.speed;
        
        // Store previous position
        const oldX = this.x;
        const oldY = this.y;
        
        // Update position
        this.x += dx * speed * deltaTime;
        this.y += dy * speed * deltaTime;
        
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
        // Create trail particle
        const trailSize = this.isDodging ? this.radius * 0.8 : this.radius * 0.5;
        const duration = this.isDodging ? 0.4 : 0.3;
        
        const particle = new Particle(
            x, y, 0, 0, trailSize, this.color, duration
        );
        
        // Add to game particles
        gameManager.particles.push(particle);
    }
    
    handleAttacks(deltaTime, game) {
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            // Play shooting sound and boss beat
            audioSystem.play('shoot', 0.3);
            audioSystem.playBossBeat();
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
        if (this.isDead) return;
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        // Update health bar if health actually changed
        if (oldHealth !== this.health) {
            const healthBar = document.getElementById('health-bar');
            const healthPercentage = (this.health / this.maxHealth) * 100;
            healthBar.style.setProperty('--health-width', `${healthPercentage}%`);
            
            // Show healing text
            gameManager.showFloatingText(`+${Math.round(this.health - oldHealth)}`, this.x, this.y - 30, '#2ecc71', 16);
        }
    }
    
    // CRITICAL FIX: Add missing XP collection method
    addXP(amount) {
        if (this.isDead) return;
        
        this.xp += amount;
        
        // Track XP collected for achievements
        if (gameManager) {
            gameManager.addXpCollected(amount);
        }
        
        // Show XP gain text
        gameManager.showFloatingText(`+${amount} XP`, this.x, this.y - 20, '#f1c40f', 14);
        
        // Check for level up
        while (this.xp >= this.xpToNextLevel) {
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
        if (xpBar) {
            const xpPercentage = (this.xp / this.xpToNextLevel) * 100;
            xpBar.style.setProperty('--xp-width', `${Math.min(xpPercentage, 100)}%`);
        }
        
        // Update level display
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) {
            levelDisplay.textContent = `Level: ${this.level}`;
        }
    }
    
    levelUp() {
        this.xp -= this.xpToNextLevel;
        this.level++;
        
        // Increase stats
        this.maxHealth += 10;
        this.health = this.maxHealth; // Full heal on level up
        
        // Scale XP requirement
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.15);
        
        // Show level up effect
        gameManager.createLevelUpEffect(this.x, this.y);
        gameManager.showFloatingText('LEVEL UP!', this.x, this.y - 40, '#e74c3c', 20);
        
        // Play level up sound
        if (audioSystem) {
            audioSystem.play('levelUp', 0.6);
        }
        
        // Track achievement
        if (achievementSystem) {
            achievementSystem.updateAchievement('level_up', this.level);
        }
        
        // Trigger upgrade selection
        if (upgradeSystem) {
            upgradeSystem.showUpgradeChoice();
        }
        
        this.updateXPBar();
    }
    
    attack(game) {
        // Find nearest enemy
        if (game.enemies.length === 0) return;
        
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
        
        // Execute AOE attack separately if enabled
        if (this.hasAOEAttack) {
            this.aoeAttackTimer += game.deltaTime || 0;
            if (this.aoeAttackTimer >= this.aoeAttackCooldown) {
                this.aoeAttackTimer = 0;
                this.executeAOEAttack(game);
            }
        }
    }
    
    executeAOEAttack(game) {
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
                    gameManager.showFloatingText(`CRIT! ${Math.round(damage)}`, 
                                                enemy.x, enemy.y - 20, '#f1c40f', 16);
                }
            }
        });
        
        // Play AOE attack sound
        audioSystem.play('aoeAttack', 0.4);
    }
    
    createAOEEffect() {
        // Visual effect for AOE attack
        const particleCount = 24;
        const radius = this.aoeAttackRange;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            // Create particles moving from player to edge of range
            const particle = new Particle(
                this.x,
                this.y,
                Math.cos(angle) * 300,
                Math.sin(angle) * 300,
                3 + Math.random() * 3,
                '#3498db',
                0.3
            );
            
            gameManager.particles.push(particle);
        }
    }
    
    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.12); // Smoother XP scaling (12% instead of 15%)
        
        // Heal player on level up
        this.heal(this.maxHealth * 0.3); // Heal 30% of max health (increased from 20%)
        
        // Update level display
        document.getElementById('level-display').textContent = `Level: ${this.level}`;
        
        // Track level up achievement
        if (gameManager) {
            gameManager.onPlayerLevelUp(this.level);
        }
        
        // Show level up message
        gameManager.showFloatingText(`LEVEL UP!`, this.x, this.y - 50, '#f39c12', 24);
        
        // Create level up effect
        gameManager.createLevelUpEffect(this.x, this.y);
        
        // Show upgrade options
        setTimeout(() => {
            upgradeSystem.showUpgradeOptions();
        }, 0);
        
        // Play level up sound
        audioSystem.play('levelUp', 0.6);
    }
    
    takeDamage(amount) {
        if (this.isInvulnerable) return;
        
        // Apply damage reduction if present
        if (this.damageReduction && this.damageReduction > 0) {
            amount = amount * (1 - this.damageReduction);
        }
        
        // Apply dodge chance
        if (this.dodgeChance && Math.random() < this.dodgeChance) {
            gameManager.showFloatingText(`DODGE!`, this.x, this.y - 20, '#3498db', 18);
            return;
        }
        
        this.health = Math.max(0, this.health - amount);
        
        // Notify game manager for achievement tracking
        if (gameManager) {
            gameManager.onPlayerDamaged();
        }
        
        // Show damage text
        gameManager.showFloatingText(`-${Math.round(amount)}`, this.x, this.y - 20, '#e74c3c', 18);
        
        // Update health bar
        const healthBar = document.getElementById('health-bar');
        const healthPercentage = (this.health / this.maxHealth) * 100;
        healthBar.style.setProperty('--health-width', `${healthPercentage}%`);
        
        // Trigger invulnerability
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityTime;
        
        // Check if player died
        if (this.health <= 0) {
            this.isDead = true;
        }
        
        // Play hit sound
        audioSystem.play('playerHit', 0.5);
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
                    gameManager.showFloatingText(
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
            gameManager.showFloatingText(
                `${upgrade.name}${tierText} upgraded!`, 
                this.x, 
                this.y - 30, 
                '#e67e22', // Orange color for upgrades
                18
            );
            
            // Add more dramatic visual effect for stacked upgrades
            this.createUpgradeStackEffect();
        } else {
            gameManager.showFloatingText(
                `${upgrade.name} acquired!`, 
                this.x, 
                this.y - 30, 
                '#3498db', 
                18
            );
        }
    }
    
    createUpgradeStackEffect() {
        if (!gameManager || !gameManager.particles) return;
        
        // Create spiral effect with upgrade color
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const distance = 20 + (i % 4) * 10;
            
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            // Create outward moving particles with spiral pattern
            const particle = new Particle(
                x, y,
                Math.cos(angle) * 60,
                Math.sin(angle) * 60,
                3 + Math.random() * 3,
                '#e67e22', // Orange for upgrade stacks
                0.5
            );
            
            gameManager.particles.push(particle);
        }
        
        // Add screen shake for powerful feeling
        if (gameManager.addScreenShake) {
            gameManager.addScreenShake(2, 0.2);
        }
        
        // Play sound effect
        if (audioSystem && audioSystem.play) {
            audioSystem.play('levelUp', 0.3);
        }
    }
    
    handleDodge(deltaTime, game) {
        // Update dodge cooldown
        if (!this.canDodge) {
            this.dodgeTimer += deltaTime;
            if (this.dodgeTimer >= this.dodgeCooldown) {
                this.canDodge = true;
                this.dodgeTimer = 0;
            }
        }
        
        // Check if dodge is active
        if (this.isDodging) {
            this.dodgeTimer += deltaTime;
            if (this.dodgeTimer >= this.dodgeDuration) {
                this.isDodging = false;
                this.dodgeTimer = 0;
                this.isInvulnerable = false;
            }
        }
        
        // Get keys from the game engine (fix for dodge bug)
        const keys = game.keys || {};
        
        // Only activate dodge if game is active (not paused or in level-up menu)
        if (keys[' '] && this.canDodge && !this.isDodging && !gameManager.isMenuActive()) {
            keys[' '] = false; // Prevent holding space
            this.doDodge();
        }
    }
    
    doDodge() {
        if (!this.canDodge || this.isDodging) return;
        
        // Check for perfect dodge (dodging just before being hit)
        let wasPerfectDodge = false;
        if (gameManager && gameManager.game) {
            for (const enemy of gameManager.game.enemies) {
                if (enemy.isAttacking && this.distanceTo(enemy) < 50) {
                    wasPerfectDodge = true;
                    break;
                }
            }
        }
        
        this.isDodging = true;
        this.isInvulnerable = true;
        this.canDodge = false;
        this.dodgeTimer = 0;
        
        // Track dodge achievement
        if (gameManager) {
            gameManager.onDodge(wasPerfectDodge);
        }
        
        // Visual effect for dodge
        gameManager.showFloatingText("Dodge!", this.x, this.y - 30, '#3498db', 18);
        
        // Create dodge effect
        for (let i = 0; i < 10; i++) {
            const particle = new Particle(
                this.x, 
                this.y,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                this.radius / 2,
                this.color,
                0.3
            );
            gameManager.particles.push(particle);
        }
        
        // Play dodge sound
        audioSystem.play('dodge', 0.7);
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
            const cooldownPercent = this.dodgeTimer / this.dodgeCooldown;
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
        for (let i = 0; i < this.orbitProjectiles.length; i++) {
            const orb = this.orbitProjectiles[i];
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
                    if (isCrit) {
                        gameManager.showFloatingText(`CRIT! ${Math.round(damage)}`, 
                                                    enemy.x, enemy.y - 20, '#f1c40f', 16);
                    } else {
                        gameManager.showFloatingText(`${Math.round(damage)}`, 
                                                    enemy.x, enemy.y - 20, '#ffffff', 14);
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
                    if (gameManager.createHitEffect) {
                        gameManager.createHitEffect(enemy.x, enemy.y);
                    }
                    
                    // Play hit sound
                    audioSystem.play('hit', 0.2);
                }
            }
        }
        
        // Track orbital count for achievement
        if (gameManager) {
            gameManager.onOrbitalCountChanged(this.orbitCount);
        }
    }
      processChainLightning(startEnemy, baseDamage, chainsLeft, hitEnemies = new Set()) {
        // Enhanced safety checks to prevent infinite loops
        if (chainsLeft <= 0 || !startEnemy || hitEnemies.size > 20) return;
        
        // Add recursion depth limit as backup safety
        if (!this._chainDepth) this._chainDepth = 0;
        this._chainDepth++;
        if (this._chainDepth > 10) {
            this._chainDepth = 0;
            return;
        }
        
        // Find closest enemy that hasn't been hit
        let closestEnemy = null;
        let closestDistance = this.chainRange;
        
        // Make sure we're accessing the enemies array correctly with validation
        const enemies = gameManager?.game?.enemies || [];
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
            if (isCrit) {
                gameManager.showFloatingText(`CHAIN CRIT! ${Math.round(finalDamage)}`, 
                                           closestEnemy.x, closestEnemy.y - 20, '#3498db', 16);
            } else {
                gameManager.showFloatingText(`CHAIN ${Math.round(finalDamage)}`, 
                                           closestEnemy.x, closestEnemy.y - 20, '#3498db', 14);
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
            if (gameManager) {
                gameManager.onChainLightningHit(hitEnemies.size);
            }
              // Continue chain with safety checks
            if (chainsLeft > 1 && hitEnemies.size < 15) {
                this.processChainLightning(closestEnemy, baseDamage, chainsLeft - 1, hitEnemies);
            }
        }
        
        // Reset recursion depth counter
        this._chainDepth = Math.max(0, this._chainDepth - 1);
    }processRicochet(sourceX, sourceY, damage, bouncesLeft, hitEnemies = new Set()) {
        if (bouncesLeft <= 0) return;
        
        // Safety checks for parameters
        if (typeof sourceX !== 'number' || typeof sourceY !== 'number' || 
            typeof damage !== 'number' || damage <= 0) {
            return;
        }
        
        // Make sure we're accessing the enemies array correctly
        const enemies = gameManager?.game?.enemies || [];
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
            if (isCrit) {
                gameManager.showFloatingText(`BOUNCE CRIT! ${Math.round(ricochetDamage)}`, 
                                          closestEnemy.x, closestEnemy.y - 20, '#f39c12', 16);
            } else {
                gameManager.showFloatingText(`BOUNCE ${Math.round(ricochetDamage)}`, 
                                          closestEnemy.x, closestEnemy.y - 20, '#f39c12', 14);
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
            if (gameManager) {
                gameManager.onRicochetHit(hitEnemies.size);
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
        // Create more dramatic lightning particles
        const segments = 8; // Increased from 5 for more detailed lightning
        const baseX = from.x;
        const baseY = from.y;
        const targetX = to.x;
        const targetY = to.y;
        
        // Add initial spark effect at the source
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            const size = 2 + Math.random() * 2;
            const sparkParticle = new Particle(
                baseX, baseY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#81ecec', // Lighter blue for the spark
                0.15
            );
            gameManager.particles.push(sparkParticle);
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
            const mainParticle = new Particle(
                prevX, prevY,
                (x - prevX) * 12, // Faster particle movement for more dynamic effect
                (y - prevY) * 12,
                4, // Slightly larger
                '#74b9ff', // Vibrant blue
                0.2
            );
            gameManager.particles.push(mainParticle);
            
            // Create parallel faint lightning traces for glow effect
            const offsetDist = 3;
            const offsetAngle = Math.atan2(y - prevY, x - prevX) + Math.PI/2;
            
            // Create glow particles on either side of main bolt
            for (let j = -1; j <= 1; j += 2) {
                const offsetX = prevX + Math.cos(offsetAngle) * offsetDist * j;
                const offsetY = prevY + Math.sin(offsetAngle) * offsetDist * j;
                const glowParticle = new Particle(
                    offsetX, offsetY,
                    (x - prevX) * 12,
                    (y - prevY) * 12,
                    3,
                    'rgba(116, 185, 255, 0.4)', // Semi-transparent blue
                    0.15
                );
                gameManager.particles.push(glowParticle);
            }
            
            // Store points for branches
            points.push({x, y});
            prevX = x;
            prevY = y;
        }
        
        // Create random branches (forks) in the lightning
        const branchCount = 1 + Math.floor(Math.random() * 2); // 1-2 branches
        for (let i = 0; i < branchCount; i++) {
            if (points.length < 3) continue; // Need enough points for branching
            
            // Select a random point from the first 70% of the lightning path
            const sourceIndex = Math.floor(Math.random() * (points.length * 0.7));
            const source = points[sourceIndex];
            
            // Create a short branch (2-3 segments)
            let branchX = source.x;
            let branchY = source.y;
            const branchSegments = 2 + Math.floor(Math.random());
            
            for (let j = 0; j < branchSegments; j++) {
                // Random angle deviation within 60 degrees of main bolt
                const angle = Math.random() * Math.PI / 3 - Math.PI / 6;
                const distance = 10 + Math.random() * 20;
                
                const nextX = branchX + Math.cos(angle) * distance;
                const nextY = branchY + Math.sin(angle) * distance;
                
                // Create branch particle
                const branchParticle = new Particle(
                    branchX, branchY,
                    (nextX - branchX) * 10,
                    (nextY - branchY) * 10,
                    2,
                    '#0984e3', // Slightly darker blue for branches
                    0.15
                );
                gameManager.particles.push(branchParticle);
                
                branchX = nextX;
                branchY = nextY;
            }
        }
        
        // Create enhanced impact flash at target
        const flash = new Particle(
            to.x, to.y,
            0, 0,
            18, // Larger flash (was 12)
            '#74b9ff',
            0.2 // Longer duration (was 0.15)
        );
        gameManager.particles.push(flash);
        
        // Add secondary expanding ring for impact
        const impactRing = new ShockwaveParticle(
            to.x, to.y,
            40, // Size of ring
            '#0984e3',
            0.3 // Duration
        );
        gameManager.particles.push(impactRing);
        
        // Add small sparks at impact point
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            const size = 1 + Math.random() * 3;
            
            const sparkParticle = new Particle(
                to.x, to.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                i % 2 === 0 ? '#74b9ff' : '#0984e3', // Alternate colors
                0.2 + Math.random() * 0.2
            );
            gameManager.particles.push(sparkParticle);
        }
        
        // Add subtle screen shake for impact
        if (gameManager.addScreenShake) {
            gameManager.addScreenShake(2, 0.2);
        }
        
        // Play lightning sound
        audioSystem.play('hit', 0.3);
    }    findNearestEnemy(enemies) {
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
            if (distanceSquared < shortestDistanceSquared && distanceSquared > 0) {
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
            
            // Select primary special type (first one takes priority for display/behavior)
            let specialType = specialTypes.length > 0 ? specialTypes[0] : null;
            
            // Create projectile with special type
            const projectile = new Projectile(
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
            
            // Add projectile to game entities
            game.addEntity(projectile);
        }
        
        // Play shooting sound (once per volley)
        audioSystem.play('shoot', 0.3);
    }

    createRicochetEffect(fromX, fromY, toX, toY) {
        // Calculate direction vector
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Create tracer line with multiple particles
        const particleCount = Math.min(15, Math.floor(distance / 10));
        for (let i = 0; i < particleCount; i++) {
            const ratio = i / particleCount;
            const x = fromX + dx * ratio;
            const y = fromY + dy * ratio;
            
            // Create particle for tracer line
            const tracerParticle = new Particle(
                x, y,
                0, 0,
                3 * (1 - ratio),  // Size decreases along path
                '#f39c12',        // Orange color
                0.2 + ratio * 0.1 // Duration increases along path
            );
            gameManager.particles.push(tracerParticle);
        }
        
        // Create impact flash at destination
        const flash = new Particle(
            toX, toY,
            0, 0,
            12,
            '#e67e22', // Darker orange
            0.2
        );
        gameManager.particles.push(flash);
        
        // Add small spark particles at ricochet point
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            const size = 2 + Math.random() * 2;
            
            const sparkParticle = new Particle(
                toX, toY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                '#f39c12',
                0.3
            );
            gameManager.particles.push(sparkParticle);
        }
        
        // Create small shockwave at ricochet point
        const shockwave = new ShockwaveParticle(
            toX, toY,
            30, // Size of shockwave
            '#f39c12',
            0.25 // Duration
        );
        gameManager.particles.push(shockwave);
        
        // Add subtle screen shake for ricochet impact
        if (gameManager.addScreenShake) {
            gameManager.addScreenShake(1, 0.15);
        }
        
        // Play ricochet sound
        audioSystem.play('hit', 0.25);
    }

    dodge() {
        if (this.dodgeCooldown > 0) return;
        
        // Check for perfect dodge (dodging just before being hit)
        let wasPerfectDodge = false;
        for (const enemy of this.game.enemies) {
            if (enemy.isAttacking && this.distanceTo(enemy) < 50) {
                wasPerfectDodge = true;
                break;
            }
        }
        
        this.dodgeCooldown = this.maxDodgeCooldown;
        this.dodgeVelocity = this.dodgeSpeed;
        this.dodgeDirection = this.lastMoveDirection;
        
        // Notify game manager about the dodge
        if (typeof gameManager !== 'undefined') {
            gameManager.onDodge(wasPerfectDodge);
        }
    }
}
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
        this.xpToNextLevel = 70; // Lower first level XP requirement (from 80)
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
        this.piercing = false;
        this.critChance = 0.08; // Higher base crit chance
        this.critMultiplier = 2.0; // 2x damage on crit
        
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
    }
    
    update(deltaTime, game) {
        this.handleMovement(deltaTime, game);
        this.handleAttacks(deltaTime, game);
        this.handleInvulnerability(deltaTime);
        this.handleRegeneration(deltaTime);
        this.handleDodge(deltaTime, game); // Add dodge handling
    }
    
    handleMovement(deltaTime, game) {
        let dx = 0;
        let dy = 0;
        
        if (game.keys['w']) dy -= 1;
        if (game.keys['s']) dy += 1;
        if (game.keys['a']) dx -= 1;
        if (game.keys['d']) dx += 1;
        
        // Alternative arrow key controls
        if (game.keys['ArrowUp']) dy -= 1;
        if (game.keys['ArrowDown']) dy += 1;
        if (game.keys['ArrowLeft']) dx -= 1;
        if (game.keys['ArrowRight']) dx += 1;
        
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
            this.attack(game);
        }
        
        // Handle AOE attack cooldown separately
        if (this.hasAOEAttack) {
            this.aoeAttackTimer += deltaTime;
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
        
        // Show level up message
        gameManager.showFloatingText(`LEVEL UP!`, this.x, this.y - 50, '#f39c12', 24);
        
        // Create level up effect (original implementation called in gameManager.js)
        gameManager.createLevelUpEffect(this.x, this.y);
        
        // Show upgrade options - make sure it runs last
        // This will set the pause state internally
        setTimeout(() => {
            upgradeSystem.showUpgradeOptions();
        }, 0);
        
        // Play level up sound
        audioSystem.play('levelUp', 0.6);
    }
    
    takeDamage(amount) {
        if (this.isInvulnerable) return;
        
        this.health = Math.max(0, this.health - amount);
        
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
    }
    
    applyUpgrade(upgrade) {
        this.upgrades.push(upgrade);
        
        // Apply the upgrade effects
        switch (upgrade.type) {
            case 'attackSpeed':
                this.attackSpeed *= upgrade.multiplier;
                this.attackCooldown = 1 / this.attackSpeed;
                break;
            case 'attackDamage':
                this.attackDamage *= upgrade.multiplier;
                break;
            case 'projectileCount':
                // Track how many projectiles were added
                const previousCount = this.projectileCount;
                this.projectileCount += upgrade.value;
                
                // Only enable spread if we have multiple projectiles
                if (this.projectileCount > 1) {
                    this.hasSpreadAttack = true;
                    
                    // Adjust projectile spread based on projectile count
                    // More projectiles = wider spread needed
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
                this.piercing = true;
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
                this.critChance += upgrade.value;
                break;
            case 'critDamage':
                this.critMultiplier += upgrade.value;
                break;
            case 'regeneration':
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
                if (upgrade.specialType === 'aoe') {
                    this.hasAOEAttack = true;
                    this.aoeAttackRange = Math.max(150, this.aoeAttackRange);
                    // Reset AOE timer to allow immediate use after acquisition
                    this.aoeAttackTimer = this.aoeAttackCooldown;
                }
                break;
        }
        
        // Show upgrade applied message
        gameManager.showFloatingText(`${upgrade.name} acquired!`, this.x, this.y - 30, '#3498db', 18);
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
        
        // Only activate dodge if game is active (not paused or in level-up menu)
        if (game.keys[' '] && this.canDodge && !this.isDodging && !gameManager.isMenuActive()) {
            game.keys[' '] = false; // Prevent holding space
            this.doDodge();
        }
    }
    
    doDodge() {
        if (!this.canDodge || this.isDodging) return;
        
        this.isDodging = true;
        this.isInvulnerable = true;
        this.canDodge = false;
        this.dodgeTimer = 0;
        
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
        
        // Create directional motion blur effect
        const trailCount = 5;
        const trailSpacing = 0.05;
        for (let i = 1; i <= trailCount; i++) {
            const trailX = this.x - (this.dodgeDirection.x * this.speed * trailSpacing * i);
            const trailY = this.y - (this.dodgeDirection.y * this.speed * trailSpacing * i);
            
            const trailSize = this.radius * (1 - (i / (trailCount + 2)));
            const particle = new Particle(
                trailX,
                trailY,
                0,
                0,
                trailSize,
                this.color,
                0.2
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
    }

    findNearestEnemy(enemies) {
        if (!enemies || enemies.length === 0) return null;
        
        let nearestEnemy = null;
        let shortestDistance = Infinity;
        
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestEnemy = enemy;
            }
        }
        
        return nearestEnemy;
    }
    
    fireProjectile(game, angle) {
        // Calculate velocity components
        const vx = Math.cos(angle) * this.projectileSpeed;
        const vy = Math.sin(angle) * this.projectileSpeed;
        
        // Determine if this shot is a critical hit
        const isCrit = Math.random() < this.critChance;
        const damage = isCrit ? 
            this.attackDamage * this.critMultiplier : 
            this.attackDamage;
        
        // Create projectile
        const projectile = new Projectile(
            this.x,
            this.y,
            vx,
            vy,
            damage,
            this.piercing,
            isCrit
        );
        
        // Add projectile to game
        game.addEntity(projectile);
    }
}

class Projectile {
    constructor(x, y, vx, vy, damage, piercing = false, isCrit = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = 'projectile';
        this.radius = isCrit ? 7 : 5;
        this.damage = damage;
        this.piercing = piercing;
        this.isCrit = isCrit;
        this.isDead = false;
        this.lifetime = 2; // seconds
        this.timer = 0;
        this.hitEnemies = new Set(); // Track enemies hit for piercing projectiles
    }
    
    update(deltaTime, game) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        this.timer += deltaTime;
        if (this.timer >= this.lifetime) {
            this.isDead = true;
        }
    }
    
    hit(enemy) {
        // For piercing projectiles, only hit each enemy once
        if (this.piercing) {
            if (this.hitEnemies.has(enemy.id)) {
                return false;
            }
            this.hitEnemies.add(enemy.id);
            return true;
        }
        return true;
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (this.isCrit) {
            // Use gradient for critical hits
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, '#f1c40f');
            gradient.addColorStop(1, '#e67e22');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.piercing ? '#e74c3c' : '#f1c40f';
        }
        
        ctx.fill();
        
        // Add glow effect
        if (this.isCrit) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
            ctx.fill();
        } else if (this.piercing) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            ctx.fill();
        }
    }
}

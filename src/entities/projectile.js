class Projectile {
    constructor(x, y, vx, vy, damage, piercing = 0, isCrit = false, specialType = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.piercing = piercing;
        this.isCrit = isCrit;
        this.radius = 5;
        this.type = 'projectile'; // CRITICAL: Add type property
        this.active = true;
        this.isDead = false; // CRITICAL: Add isDead property
    // Circular buffer trail (no push/shift allocations)
    this.maxTrailLength = 10;
    this.trail = new Array(this.maxTrailLength);
    this.trailWrite = 0;
    this.trailCount = 0;
        this.lifetime = 5.0; // Projectiles die after 5 seconds
        this.age = 0;
        this.hitEnemies = new Set(); // Track hit enemies for piercing
        
        // Special attack properties
        this.specialType = specialType;
        this.chainLightning = null;
        this.explosive = null;
        this.ricochet = null;
        this.homing = null;
        
        // Initialize special properties based on type
        if (specialType) {
            this.initializeSpecialType(specialType);
        }
    }
    
    initializeSpecialType(type) {
        switch (type) {
            case 'chain':
                this.chainLightning = {
                    maxChains: 3,
                    chainsUsed: 0,
                    chainRange: 180, // Increased from 150 - better chaining range
                    chainDamage: Math.max(1, this.damage * 0.75)  // Increased from 0.7 - better chain damage
                };
                this.radius = 6;
                break;
                
            case 'explosive':
                this.explosive = {
                    exploded: false,
                    radius: 80,
                    damage: Math.max(1, this.damage * 0.8)  // Ensure minimum damage
                };
                this.radius = 7;
                break;
                
            case 'ricochet':
                this.ricochet = {
                    bounces: 3,
                    bounced: 0,
                    range: 200,
                    damageReduction: 0.1 // Reduced from 0.15 - less damage loss per bounce
                };
                this.radius = 6;
                break;
                
            case 'homing':
                this.homing = {
                    turnSpeed: 3.5, // Reduced from 4.0 - smoother turning
                    range: 280, // Slightly reduced - more balanced acquisition
                    target: null,
                    hasAcquiredTarget: false
                };
                this.radius = 5;
                break;
        }
    }

    update(deltaTime, game) {
        // Update age
        this.age += deltaTime;
        
        // Check lifetime
        if (this.age >= this.lifetime) {
            this.isDead = true;
            return;
        }
        
        // Handle homing behavior
        if (this.homing && !this.homing.hasAcquiredTarget) {
            this.acquireHomingTarget(game);
        }
        
        if (this.homing && this.homing.target && !this.homing.target.isDead) {
            this.updateHomingMovement(deltaTime);
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Check if off-screen and mark for cleanup
        if (game && game.canvas) {
            if (this.isOffScreen(game.canvas, game.player)) {
                // Trigger explosion if explosive type reaches edge
                if (this.explosive && !this.explosive.exploded) {
                    this.explode(game);
                }
                this.isDead = true;
                return;
            }
        }

    // Update circular trail (reuse objects)
    const idx = this.trailWrite;
    let pt = this.trail[idx];
    if (!pt) { pt = this.trail[idx] = { x: this.x, y: this.y }; }
    else { pt.x = this.x; pt.y = this.y; }
    this.trailWrite = (this.trailWrite + 1) % this.maxTrailLength;
    this.trailCount = Math.min(this.trailCount + 1, this.maxTrailLength);
    }
    
    acquireHomingTarget(game) {
    if (!game.enemies || game.enemies.length === 0) return;
        
        // If we already have a valid target that's still alive and reasonably close, keep it
        if (this.homing.target && !this.homing.target.isDead) {
            const currentTarget = this.homing.target;
            const dx = currentTarget.x - this.x;
            const dy = currentTarget.y - this.y;
            const distanceToCurrentTarget = Math.sqrt(dx * dx + dy * dy);
            
            // Keep current target if it's within extended range (hysteresis)
            if (distanceToCurrentTarget <= this.homing.range * 1.3) {
                this.homing.hasAcquiredTarget = true;
                return;
            }
        }
        
        let closestEnemy = null;
        let closestDistance = this.homing.range;
        
        const candidates = this._getNearbyEnemies(game, this.homing.range);
        for (const enemy of candidates) {
            if (!enemy || enemy.isDead || typeof enemy.x !== 'number' || typeof enemy.y !== 'number') continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < closestDistance && distance > 0) {
                const currentAngle = Math.atan2(this.vy, this.vx);
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = Math.abs(targetAngle - currentAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                const anglePreference = angleDiff < Math.PI * 0.5 ? 1.0 : 0.7;
                const effectiveDistance = distance / anglePreference;
                if (effectiveDistance < closestDistance) {
                    closestEnemy = enemy;
                    closestDistance = effectiveDistance;
                }
            }
        }
        
        if (closestEnemy) {
            this.homing.target = closestEnemy;
            this.homing.hasAcquiredTarget = true;
        }
    }
    
    updateHomingMovement(deltaTime) {
        const target = this.homing.target;
        
        // Validate target is still alive and within reasonable range
        if (!target || target.isDead) {
            this.homing.target = null;
            this.homing.hasAcquiredTarget = false;
            return;
        }
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        
        // If target is too far, release it and look for a closer one
        if (distanceToTarget > this.homing.range * 1.5) {
            this.homing.target = null;
            this.homing.hasAcquiredTarget = false;
            return;
        }
        
        // Calculate desired direction
        const desiredAngle = Math.atan2(dy, dx);
        
        // Current velocity direction
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const currentAngle = Math.atan2(this.vy, this.vx);
        
        // Calculate angle difference
        let angleDiff = desiredAngle - currentAngle;
        
        // Normalize angle difference to [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Adaptive turn speed based on distance and angle difference
        const distanceFactor = Math.min(1, distanceToTarget / 120);
        const angleFactor = 1 - Math.abs(angleDiff) / Math.PI; // Slower when turning sharply
        const adaptiveTurnSpeed = this.homing.turnSpeed * (0.2 + 0.8 * distanceFactor) * (0.5 + 0.5 * angleFactor);
        const maxTurn = adaptiveTurnSpeed * deltaTime;
        
        // Apply turn speed limit with smoothing (guard MathUtils)
        if (window.MathUtils && typeof window.MathUtils.clamp === 'function') {
            angleDiff = window.MathUtils.clamp(angleDiff, -maxTurn, maxTurn);
        } else {
            angleDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        }
        
        // Calculate new angle and velocity
        const newAngle = currentAngle + angleDiff;
        this.vx = Math.cos(newAngle) * currentSpeed;
        this.vy = Math.sin(newAngle) * currentSpeed;
    }
    
    explode(game) {
        if (this.explosive.exploded) return;
        this.explosive.exploded = true;
        
        // Create explosion effect
        {
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm?.createExplosion) {
                gm.createExplosion(this.x, this.y, this.explosive.radius, '#ff8800');
            }
        }
        
        // Damage enemies in explosion radius with improved calculation
        const impactedEnemies = [];
        if (game.enemies) {
            let enemiesHit = 0;
            for (const enemy of game.enemies) {
                if (enemy.isDead) continue;
                
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const effectiveRange = this.explosive.radius + enemy.radius;
                
                if (distance <= effectiveRange) {
                    // Calculate damage falloff based on distance
                    const falloffFactor = Math.max(0.3, 1 - (distance / effectiveRange));
                    const explosionDamage = Math.max(1, this.explosive.damage * falloffFactor);
                    
                    enemy.takeDamage(explosionDamage);
                    enemiesHit++;
                    impactedEnemies.push(enemy);
                    
                    // Show explosion damage
                    {
                        const gm = window.gameManager || window.gameManagerBridge;
                        gm?.showFloatingText?.(`${Math.round(explosionDamage)}`, enemy.x, enemy.y - 30, '#ff8800', 16);
                    }
                }
            }
        }

        // Optional: chain reaction explosions (smaller) if player has upgrade
        const player = game?.player;
        if (player && player.explosionChainChance > 0 && impactedEnemies.length > 0) {
            if (Math.random() < player.explosionChainChance) {
                const target = impactedEnemies[Math.floor(Math.random() * impactedEnemies.length)];
                if (target && !target.isDead) {
                    // Visual mini-explosion
                    {
                        const gm = window.gameManager || window.gameManagerBridge;
                        if (gm?.createExplosion) {
                            gm.createExplosion(target.x, target.y, (this.explosive.radius || 60) * 0.6, '#ffbb66');
                        }
                    }
                    // Apply small extra damage in a tight radius
                    for (const e of game.enemies) {
                        if (!e || e.isDead) continue;
                        const dx2 = e.x - target.x; const dy2 = e.y - target.y;
                        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        const range2 = (this.explosive.radius || 60) * 0.6 + e.radius;
                        if (dist2 <= range2) {
                            const fall = Math.max(0.3, 1 - (dist2 / range2));
                            const dmg2 = Math.max(1, (this.explosive.damage || this.damage * 0.5) * 0.5 * fall);
                            e.takeDamage(dmg2);
                            (window.gameManager || window.gameManagerBridge)?.showFloatingText?.(`${Math.round(dmg2)}`, e.x, e.y - 24, '#ffbb66', 12);
                        }
                    }
                }
            }
        }
        
        this.isDead = true;
    }
    
    triggerChainLightning(game, hitEnemy) {
        if (!this.chainLightning || this.chainLightning.chainsUsed >= this.chainLightning.maxChains) {
            return;
        }
        
        // Find nearby enemies for chaining
        let chainTargets = [];
        const candidates = this._getNearbyEnemies(game, this.chainLightning.chainRange);
        for (const enemy of candidates) {
            if (enemy.isDead || this.hitEnemies.has(enemy.id)) continue;
            // Allow chaining through the just-hit enemy if projectile has piercing remaining
            if (enemy === hitEnemy && (!this.piercing || this.piercing <= 0)) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.chainLightning.chainRange) {
                chainTargets.push({ enemy, distance });
            }
        }
        
        // Sort by distance and take closest targets
        chainTargets.sort((a, b) => a.distance - b.distance);
        const chainsToCreate = Math.min(2, chainTargets.length); // Chain to up to 2 enemies
        
        for (let i = 0; i < chainsToCreate; i++) {
            const target = chainTargets[i].enemy;
            
            // Create chain lightning effect
            this.createLightningEffect(this.x, this.y, target.x, target.y);
            
            // Apply chain damage with minimum damage guarantee
            const chainDamage = Math.max(1, this.chainLightning.chainDamage);
            target.takeDamage(chainDamage);
            this.hitEnemies.add(target.id);
            
            // Show chain damage
            {
                const gm = window.gameManager || window.gameManagerBridge;
                gm?.showFloatingText?.(`${Math.round(chainDamage)}`, target.x, target.y - 30, '#3498db', 14);
            }
            
            this.chainLightning.chainsUsed++;
        }
    }
    
    createLightningEffect(x1, y1, x2, y2) {
    const gm = window.gameManager || window.gameManagerBridge;
        if (!gm || gm.lowQuality) return;
        
        // Create lightning particles between points (pool-first)
        const factor = (gm.particleReductionFactor || 1.0);
        const segments = Math.max(3, Math.floor(8 * factor));
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20;
            if (window.optimizedParticles && typeof window.optimizedParticles.spawnParticle === 'function') {
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: (Math.random() - 0.5) * 50,
                    vy: (Math.random() - 0.5) * 50,
                    size: 3,
                    color: '#3498db',
                    life: 0.3,
                    type: 'spark'
                });
            } else if (gm.tryAddParticle) {
                const particle = new Particle(
                    x, y,
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50,
                    3,
                    '#3498db',
                    0.3
                );
                gm.tryAddParticle(particle);
            }
        }
    }
    
    ricochet(game) {
        if (!this.ricochet || this.ricochet.bounced >= this.ricochet.bounces) {
            return false;
        }
        
        // Find nearby enemy to bounce to
        let bounceTarget = null;
        let closestDistance = this.ricochet.range;
        const candidates = this._getNearbyEnemies(game, this.ricochet.range);
        for (const enemy of candidates) {
            if (enemy.isDead || this.hitEnemies.has(enemy.id)) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < closestDistance) {
                bounceTarget = enemy;
                closestDistance = distance;
            }
        }
        
        if (bounceTarget) {
            // Calculate new direction
            const dx = bounceTarget.x - this.x;
            const dy = bounceTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = (dx / distance) * speed;
                this.vy = (dy / distance) * speed;
                
                // Reduce damage for next hit
                this.damage *= (1 - this.ricochet.damageReduction);
                this.ricochet.bounced++;
                
                // Visual effect
                {
                    const gm = window.gameManager || window.gameManagerBridge;
                    if (gm?.createExplosion) {
                        gm.createExplosion(this.x, this.y, 15, '#44ff44');
                    }
                }
                
                return true; // Successfully ricocheted
            }
        }
        
        return false; // No ricochet target found
    }
    
    // Compatibility method for collision system
    hit(enemy) {
        // For piercing projectiles, only hit each enemy once
        if (this.piercing > 0) {
            if (this.hitEnemies.has(enemy.id)) {
                return false; // Already hit this enemy
            }
            this.hitEnemies.add(enemy.id);
        }
        
        return true; // Hit was successful
    }

    render(ctx) {
        // Draw trail with special colors based on type
        if (this.trailCount > 1) {
            ctx.beginPath();
            // Render from oldest to newest across circular buffer
            const count = this.trailCount;
            const start = (this.trailWrite - count + this.maxTrailLength) % this.maxTrailLength;
            let first = true;
            for (let i = 0; i < count; i++) {
                const idx = (start + i) % this.maxTrailLength;
                const p = this.trail[idx];
                if (!p) continue;
                if (first) { ctx.moveTo(p.x, p.y); first = false; }
                else { ctx.lineTo(p.x, p.y); }
            }
            
            // Different trail colors for different types
            if (this.chainLightning) {
                ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
            } else if (this.explosive) {
                ctx.strokeStyle = 'rgba(255, 136, 0, 0.4)';
            } else if (this.ricochet) {
                ctx.strokeStyle = 'rgba(68, 255, 68, 0.4)';
            } else if (this.homing) {
                ctx.strokeStyle = 'rgba(155, 89, 182, 0.4)';
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            }
            
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw projectile with special effects
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Set color and effects based on type
        if (this.isCrit) {
            // Critical hit - bright red with pulsing effect
            const pulse = 1 + 0.3 * Math.sin(this.age * 10);
            ctx.save();
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#ff4444';
        } else if (this.chainLightning) {
            // Chain lightning - blue with electric effect
            ctx.fillStyle = '#3498db';
        } else if (this.explosive) {
            // Explosive - orange with fire effect
            ctx.fillStyle = '#ff8800';
        } else if (this.ricochet) {
            // Ricochet - green with spinning effect
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.age * 5);
            ctx.translate(-this.x, -this.y);
            ctx.fillStyle = '#44ff44';
        } else if (this.homing) {
            // Homing - purple with target-seeking indicator
            ctx.fillStyle = '#9b59b6';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        
        ctx.fill();
        
        // Special visual effects
        if (this.chainLightning) {
            // Electric sparks around chain lightning projectiles
            for (let i = 0; i < 3; i++) {
                const angle = (this.age * 3 + i * Math.PI * 2 / 3) % (Math.PI * 2);
                const sparkX = this.x + Math.cos(angle) * (this.radius + 3);
                const sparkY = this.y + Math.sin(angle) * (this.radius + 3);
                
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#74b9ff';
                ctx.fill();
            }
        } else if (this.explosive) {
            // Flames around explosive projectiles
            const flameCount = 4;
            for (let i = 0; i < flameCount; i++) {
                const angle = (this.age * 4 + i * Math.PI * 2 / flameCount) % (Math.PI * 2);
                const flameX = this.x + Math.cos(angle) * (this.radius + 2);
                const flameY = this.y + Math.sin(angle) * (this.radius + 2);
                
                ctx.beginPath();
                ctx.arc(flameX, flameY, 1, 0, Math.PI * 2);
                ctx.fillStyle = '#fd79a8';
                ctx.fill();
            }
        } else if (this.homing && this.homing.target) {
            // Draw targeting line to homing target (subtle)
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.homing.target.x, this.homing.target.y);
            ctx.strokeStyle = 'rgba(155, 89, 182, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Add glow effect (stronger for special types)
        const glowSize = this.specialType ? this.radius + 4 : this.radius + 2;
        const glowAlpha = this.specialType ? 0.4 : 0.2;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`;
        ctx.fill();
        
        // Restore context if we modified it
        if (this.isCrit || this.ricochet) {
            ctx.restore();
        }
    }

    // Helper method to check if projectile is off screen (accounting for camera)
    isOffScreen(canvas, player) {
        // If no player (camera), use basic screen bounds
        if (!player) {
            return this.x < -this.radius || 
                   this.x > canvas.width + this.radius || 
                   this.y < -this.radius || 
                   this.y > canvas.height + this.radius;
        }
        
        // Calculate screen bounds relative to camera (player position)
        const screenLeft = player.x - canvas.width / 2 - this.radius;
        const screenRight = player.x + canvas.width / 2 + this.radius;
        const screenTop = player.y - canvas.height / 2 - this.radius;
        const screenBottom = player.y + canvas.height / 2 + this.radius;
        
        return this.x < screenLeft || this.x > screenRight || 
               this.y < screenTop || this.y > screenBottom;
    }
} 

// Helper: get nearby enemies using GameEngine.spatialGrid if available
Projectile.prototype._getNearbyEnemies = function(game, range) {
    if (!game || !Array.isArray(game.enemies)) return [];
    if (!game.spatialGrid || !game.gridSize || typeof range !== 'number' || range <= 0) {
        return game.enemies;
    }
    
    const gridRange = Math.ceil(range / game.gridSize);
    const gx = Math.floor(this.x / game.gridSize);
    const gy = Math.floor(this.y / game.gridSize);
    const out = [];
    for (let dx = -gridRange; dx <= gridRange; dx++) {
        for (let dy = -gridRange; dy <= gridRange; dy++) {
            const key = `${gx + dx},${gy + dy}`;
            const bucket = game.spatialGrid.get(key);
            if (!bucket || !Array.isArray(bucket)) continue;
            for (const e of bucket) {
                if (e && e.type === 'enemy' && !e.isDead) out.push(e);
            }
        }
    }
    return out.length ? out : game.enemies;
};
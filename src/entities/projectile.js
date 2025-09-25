class Projectile {
    constructor(x, y, vx, vy, damage, piercing = 0, isCrit = false, specialType = null) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.piercing = piercing;
        this.isCrit = isCrit;
        this.radius = 5;
        this.type = 'projectile';
        this.isDead = false;
        // Calculate initial speed first, before lifetime
        this.initialSpeed = Math.sqrt(vx * vx + vy * vy);
        // Calculate dynamic lifetime based on projectile speed and expected travel distance
        this.calculateLifetime();
        this.age = 0;
        this.hitEnemies = new Set();

        // Simple trail - just store last few positions
        this.trail = [];
        this.maxTrailLength = 5; // Much simpler

        // Simplified special types - one per projectile
        this.specialType = specialType;
        this.special = null;

        // Ability flags and data that can be toggled post-construction
        this.hasChainLightning = false;
        this.hasRicochet = false;
        this.hasExplosive = false;
        this.hasHoming = false;

        this.chainData = null;
        this.ricochetData = null;
        this.explosiveData = null;
        this.homingData = null;

        if (specialType) {
            this.initializeSpecial(specialType);
        }
    }

    calculateLifetime() {
        // Get game constants for enemy spawn distances and screen size
        const ENEMIES = window.GAME_CONSTANTS?.ENEMIES || {};
        const maxSpawnDistance = ENEMIES.SPAWN_DISTANCE_MAX || 800;

        // Calculate maximum expected travel distance
        // Account for: screen diagonal + spawn distance + safety margin
        const screenDiagonal = 1400; // Reasonable estimate for most screens
        const maxTravelDistance = screenDiagonal + maxSpawnDistance + 200;

        // Calculate base lifetime: distance / speed + safety margin
        // Prevent division by zero with minimum speed check
        const speed = Math.max(this.initialSpeed, 10); // Minimum speed of 10
        const baseLifetime = (maxTravelDistance / speed) + 1.0;

        // Apply special type modifiers
        let lifetimeModifier = 1.0;
        if (this.specialType === 'homing') {
            lifetimeModifier = 1.5; // Homing needs more time to track
        } else if (this.specialType === 'ricochet') {
            lifetimeModifier = 1.3; // Ricochet needs time for bounces
        } else if (this.specialType === 'chain') {
            lifetimeModifier = 1.2; // Chain needs time for secondary effects
        }

        // Set minimum and maximum bounds for sanity
        this.lifetime = Math.max(2.0, Math.min(8.0, baseLifetime * lifetimeModifier));
    }

    // Recalculate lifetime when projectile properties change (e.g., speed upgrades)
    updateLifetimeForNewSpeed() {
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > 0 && Math.abs(currentSpeed - this.initialSpeed) > 50) {
            // Significant speed change - recalculate lifetime
            const originalLifetime = this.lifetime;
            this.initialSpeed = currentSpeed;
            this.calculateLifetime();

            // If new lifetime is longer, extend current projectile life
            if (this.lifetime > originalLifetime) {
                // Scale remaining time proportionally
                const remainingTime = Math.max(0, originalLifetime - this.age);
                const timeRatio = this.lifetime / originalLifetime;
                this.age = this.lifetime - (remainingTime * timeRatio);
            }
        }
    }

    initializeSpecial(type) {
        switch (type) {
            case 'chain':
                this.special = { maxChains: 2, used: 0, range: 150, damageMultiplier: 0.7 };
                this.hasChainLightning = true;
                this.radius = 6;
                break;
            case 'explosive':
                this.special = { radius: 60, damage: this.damage * 0.7, exploded: false };
                this.hasExplosive = true;
                this.radius = 7;
                break;
            case 'ricochet':
                this.special = { bounces: 2, used: 0, range: 180, damageMultiplier: 0.8 };
                this.hasRicochet = true;
                this.radius = 6;
                break;
            case 'homing':
                this.special = { target: null, turnSpeed: 2.0, range: 200 };
                this.hasHoming = true;
                this.radius = 5;
                break;
        }
    }

    update(deltaTime, game) {
        this.age += deltaTime;

        // Check for speed changes periodically (every ~0.1 seconds to avoid excessive calculations)
        if (Math.floor(this.age * 10) !== Math.floor((this.age - deltaTime) * 10)) {
            this.updateLifetimeForNewSpeed();
        }

        // Simple lifetime check
        if (this.age >= this.lifetime) {
            this.isDead = true;
            return;
        }

        // Simple homing - just turn towards nearest enemy
        if (this.specialType === 'homing' && game?.enemies?.length > 0) {
            this.updateHoming(deltaTime, game);
        }

        // Update position - add validation
        if (Number.isFinite(this.vx) && Number.isFinite(this.vy)) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
        } else {
            // Invalid velocity - mark as dead
            this.isDead = true;
            return;
        }

        // Simple trail update
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Simple bounds check
        if (this.isOffScreen(game)) {
            if (this.specialType === 'explosive' || this.hasExplosive) {
                this.explode(game);
            }
            this.isDead = true;
        }
    }

    updateHoming(deltaTime, game) {
        // Find nearest enemy if we don't have a target
        if (!this.special.target || this.special.target.isDead) {
            let nearest = null;
            let minDist = this.special.range;

            for (const enemy of game.enemies) {
                if (!enemy || enemy.isDead || this.hitEnemies.has(enemy.id)) continue;

                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist && dist > 0) {
                    nearest = enemy;
                    minDist = dist;
                }
            }
            this.special.target = nearest;
        }

        // Simple steering towards target
        if (this.special.target && !this.special.target.isDead) {
            const dx = this.special.target.x - this.x;
            const dy = this.special.target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);
            const currentAngle = Math.atan2(this.vy, this.vx);

            let angleDiff = targetAngle - currentAngle;
            // Normalize to [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            const maxTurn = this.special.turnSpeed * deltaTime;
            const turn = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);

            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 0) {
                const newAngle = currentAngle + turn;
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
        }
    }

    explode(game) {
        // Check if projectile has explosive ability (multiple ways it can be set)
        const hasExplosiveAbility = this.specialType === 'explosive' || this.hasExplosive;
        if (!hasExplosiveAbility) {
            return;
        }

        let data = null;
        if (this.specialType === 'explosive' && this.special) {
            data = this.special;
        } else if (this.explosiveData) {
            data = this.explosiveData;
        }

        if (!data || typeof data.radius !== 'number') {
            data = { radius: 60, damageMultiplier: 0.7, exploded: false };
        }

        if (data.exploded) return;
        data.exploded = true;

        if (this.specialType === 'explosive') {
            this.special = data;
        } else {
            this.explosiveData = data;
        }

        // Simple explosion - damage nearby enemies
        if (game?.enemies && Array.isArray(game.enemies)) {
            for (const enemy of game.enemies) {
                if (!enemy || enemy.isDead) continue;

                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= data.radius) {
                    const falloff = Math.max(0.3, 1 - (dist / data.radius));
                    const baseDamage = data.damage !== undefined ? data.damage : this.damage * (data.damageMultiplier || 0.7);
                    const damage = baseDamage * falloff;
                    if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(Math.max(1, damage));

                        // Show damage text
                        if (window.gameManager?.showFloatingText) {
                            window.gameManager.showFloatingText(`${Math.round(damage)}`, enemy.x, enemy.y - 30, '#ff8800', 16);
                        }
                    }
                }
            }
        }

        // Simple visual effect
        if (window.gameManager?.createExplosion) {
            window.gameManager.createExplosion(this.x, this.y, data.radius, '#ff8800');
        }

        this.isDead = true;
    }

    triggerChain(game, hitEnemy) {
        // Check if projectile has chain ability (multiple ways it can be set)
        const hasChainAbility = this.specialType === 'chain' || this.hasChainLightning;
        if (!hasChainAbility) {
            return;
        }

        // Initialize chain special data if not already set
        let data = null;
        if (this.specialType === 'chain' && this.special) {
            data = this.special;
        } else if (this.chainData) {
            data = this.chainData;
        }

        if (!data || typeof data.maxChains !== 'number') {
            data = { maxChains: 2, used: 0, range: 180, damageMultiplier: 0.75 };
        }

        if (data.used >= data.maxChains) {
            return;
        }

        // Ensure we have enemies to chain to
        if (!game?.enemies || !Array.isArray(game.enemies) || game.enemies.length === 0) {
            return;
        }

        // Simple chain - find nearest enemy and damage it
        let nearest = null;
        let minDist = data.range || 180;

        for (const enemy of game.enemies) {
            if (!enemy || enemy.isDead || enemy === hitEnemy || this.hitEnemies.has(enemy.id)) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                nearest = enemy;
                minDist = dist;
            }
        }

        if (nearest) {
            const chainDamage = this.damage * (data.damageMultiplier ?? 0.75);
            if (typeof nearest.takeDamage === 'function') {
                nearest.takeDamage(chainDamage);
                this.hitEnemies.add(nearest.id);
                data.used = (data.used || 0) + 1;
                if (this.specialType === 'chain') {
                    this.special = data;
                } else {
                    this.chainData = data;
                }

                // Simple visual effect
                this.createLightningEffect(this.x, this.y, nearest.x, nearest.y);

                // Show damage text
                if (window.gameManager?.showFloatingText) {
                    window.gameManager.showFloatingText(`${Math.round(chainDamage)}`, nearest.x, nearest.y - 30, '#3498db', 14);
                }
            }
        }
    }

    ricochet(game) {
        // Check if projectile has ricochet ability
        const hasRicochetAbility = this.specialType === 'ricochet' || this.hasRicochet;
        if (!hasRicochetAbility) {
            return false;
        }

        // Initialize ricochet special data if not already set
        let data = null;
        if (this.specialType === 'ricochet' && this.special) {
            data = this.special;
        } else if (this.ricochetData) {
            data = this.ricochetData;
        }

        if (!data || typeof data.bounces !== 'number') {
            data = { bounces: 2, used: 0, range: 200, damageMultiplier: 0.8 };
        }

        if (data.used >= data.bounces) {
            return false;
        }

        // Ensure we have enemies to ricochet to
        if (!game?.enemies || !Array.isArray(game.enemies) || game.enemies.length === 0) {
            return false;
        }

        // Simple ricochet - find nearest enemy and bounce towards it
        let nearest = null;
        let minDist = data.range || 200;

        for (const enemy of game.enemies) {
            if (!enemy || enemy.isDead || this.hitEnemies.has(enemy.id)) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist && dist > 0) {
                nearest = enemy;
                minDist = dist;
            }
        }

        if (nearest) {
            const dx = nearest.x - this.x;
            const dy = nearest.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 0) {
                    this.vx = (dx / dist) * speed;
                    this.vy = (dy / dist) * speed;
                    const dmgMultiplier = data.damageMultiplier ?? 0.8;
                    this.damage = Math.max(1, this.damage * dmgMultiplier);
                    data.used = (data.used || 0) + 1;
                    if (this.specialType === 'ricochet') {
                        this.special = data;
                    } else {
                        this.ricochetData = data;
                    }
                    return true;
                }
            }
        }

        return false;
    }

    createLightningEffect(x1, y1, x2, y2) {
        // Use the better ParticleHelpers lightning effect if available
        if (window.ParticleHelpers?.createLightningEffect) {
            window.ParticleHelpers.createLightningEffect(x1, y1, x2, y2);
            return;
        }

        // Enhanced fallback lightning effect - create multiple segments
        if (window.optimizedParticles?.spawnParticle) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const segments = Math.max(3, Math.floor(distance / 15));

            // Create segmented lightning bolt
            for (let i = 0; i <= segments; i++) {
                const ratio = i / segments;
                const baseX = x1 + dx * ratio;
                const baseY = y1 + dy * ratio;

                // Add random deviation for lightning effect
                const deviation = Math.min(25, distance * 0.1);
                const offsetX = (Math.random() - 0.5) * deviation;
                const offsetY = (Math.random() - 0.5) * deviation;

                window.optimizedParticles.spawnParticle({
                    x: baseX + offsetX,
                    y: baseY + offsetY,
                    vx: (Math.random() - 0.5) * 30,
                    vy: (Math.random() - 0.5) * 30,
                    size: 2 + Math.random() * 3,
                    color: i === 0 || i === segments ? '#74b9ff' : '#3498db', // Brighter ends
                    life: 0.3 + Math.random() * 0.2, // Longer life for visibility
                    type: 'spark'
                });
            }

            // Add extra bright flash at both ends for better visibility
            [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(pos => {
                window.optimizedParticles.spawnParticle({
                    x: pos.x,
                    y: pos.y,
                    vx: 0, vy: 0,
                    size: 8,
                    color: '#ffffff',
                    life: 0.15,
                    type: 'glow'
                });
            });
        }
    }

    hit(enemy) {
        // Debug logging for piercing issues
        if (window.debugProjectiles) {
            console.log(`[Projectile ${this.id}] hit() called:`, {
                piercing: this.piercing,
                enemyId: enemy.id,
                alreadyHit: this.hitEnemies.has(enemy.id),
                hitEnemiesSize: this.hitEnemies.size
            });
        }

        // For piercing projectiles, track hit enemies but don't prevent subsequent hits
        if (this.piercing > 0) {
            if (this.hitEnemies.has(enemy.id)) {
                // Already hit this enemy, don't hit again
                if (window.debugProjectiles) {
                    console.log(`[Projectile ${this.id}] Already hit enemy ${enemy.id}, skipping`);
                }
                return false;
            }
            // Add enemy to hit list but allow projectile to continue
            this.hitEnemies.add(enemy.id);
            if (window.debugProjectiles) {
                console.log(`[Projectile ${this.id}] Hit enemy ${enemy.id}, piercing remaining: ${this.piercing}`);
            }
            return true; // Hit successful, projectile continues
        }

        // Non-piercing projectile - normal hit
        if (window.debugProjectiles) {
            console.log(`[Projectile ${this.id}] Non-piercing hit on enemy ${enemy.id}`);
        }
        this.hitEnemies.add(enemy.id);
        return true;
    }

    render(ctx) {
        // Simple trail
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = this.getTrailColor();
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Simple projectile body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.getColor();
        ctx.fill();

        // Simple glow
        if (this.specialType) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.fillStyle = this.getColor().replace(')', ', 0.3)').replace('rgb', 'rgba');
            ctx.fill();
        }
    }

    getColor() {
        if (this.isCrit) return '#ff4444';
        switch (this.specialType) {
            case 'chain': return '#3498db';
            case 'explosive': return '#ff8800';
            case 'ricochet': return '#44ff44';
            case 'homing': return '#9b59b6';
            default: return '#ffffff';
        }
    }

    getTrailColor() {
        const color = this.getColor();
        return color.replace(')', ', 0.4)').replace('rgb', 'rgba');
    }

    isOffScreen(game) {
        if (!game?.canvas || !game?.player) return false;

        // Camera follows player - calculate viewport bounds relative to player position
        const margin = 800; // Very generous margin - projectiles can travel far beyond screen
        const canvas = game.canvas;
        const player = game.player;

        // Calculate camera-relative viewport bounds
        const viewportLeft = player.x - canvas.width / 2 - margin;
        const viewportRight = player.x + canvas.width / 2 + margin;
        const viewportTop = player.y - canvas.height / 2 - margin;
        const viewportBottom = player.y + canvas.height / 2 + margin;

        // Check if projectile is outside the camera-relative viewport
        return this.x < viewportLeft || this.x > viewportRight ||
               this.y < viewportTop || this.y > viewportBottom;
    }
}

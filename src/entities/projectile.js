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
        // Calculate dynamic lifetime based on projectile speed and expected travel distance
        this.calculateLifetime();
        this.age = 0;
        this.initialSpeed = Math.sqrt(vx * vx + vy * vy);
        this.hitEnemies = new Set();

        // Simple trail - just store last few positions
        this.trail = [];
        this.maxTrailLength = 5; // Much simpler

        // Simplified special types - one per projectile
        this.specialType = specialType;
        this.special = null;

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
        const baseLifetime = (maxTravelDistance / this.initialSpeed) + 1.0;

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
                this.special = { maxChains: 2, used: 0, range: 150 };
                this.radius = 6;
                break;
            case 'explosive':
                this.special = { radius: 60, damage: this.damage * 0.7 };
                this.radius = 7;
                break;
            case 'ricochet':
                this.special = { bounces: 2, used: 0, range: 180 };
                this.radius = 6;
                break;
            case 'homing':
                this.special = { target: null, turnSpeed: 2.0, range: 200 };
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
            if (this.specialType === 'explosive' && this.special) {
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
        if (!this.special || this.special.exploded) return;
        this.special.exploded = true;

        // Simple explosion - damage nearby enemies
        if (game?.enemies && Array.isArray(game.enemies)) {
            for (const enemy of game.enemies) {
                if (!enemy || enemy.isDead) continue;

                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= this.special.radius) {
                    const falloff = Math.max(0.3, 1 - (dist / this.special.radius));
                    const damage = this.special.damage * falloff;
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
            window.gameManager.createExplosion(this.x, this.y, this.special.radius, '#ff8800');
        }

        this.isDead = true;
    }

    triggerChain(game, hitEnemy) {
        if (this.specialType !== 'chain' || !this.special || this.special.used >= this.special.maxChains) {
            return;
        }

        // Ensure we have enemies to chain to
        if (!game?.enemies || !Array.isArray(game.enemies) || game.enemies.length === 0) {
            return;
        }

        // Simple chain - find nearest enemy and damage it
        let nearest = null;
        let minDist = this.special.range;

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
            const chainDamage = this.damage * 0.6;
            if (typeof nearest.takeDamage === 'function') {
                nearest.takeDamage(chainDamage);
                this.hitEnemies.add(nearest.id);
                this.special.used++;

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
        if (this.specialType !== 'ricochet' || !this.special || this.special.used >= this.special.bounces) {
            return false;
        }

        // Ensure we have enemies to ricochet to
        if (!game?.enemies || !Array.isArray(game.enemies) || game.enemies.length === 0) {
            return false;
        }

        // Simple ricochet - find nearest enemy and bounce towards it
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

        if (nearest) {
            const dx = nearest.x - this.x;
            const dy = nearest.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 0) {
                    this.vx = (dx / dist) * speed;
                    this.vy = (dy / dist) * speed;
                    this.damage *= 0.8; // Reduce damage slightly
                    this.special.used++;
                    return true;
                }
            }
        }

        return false;
    }

    createLightningEffect(x1, y1, x2, y2) {
        // Simple lightning effect
        if (window.optimizedParticles?.spawnParticle) {
            const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
            const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;

            window.optimizedParticles.spawnParticle({
                x: midX, y: midY,
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                size: 3,
                color: '#3498db',
                life: 0.2,
                type: 'spark'
            });
        }
    }

    hit(enemy) {
        if (this.piercing > 0) {
            if (this.hitEnemies.has(enemy.id)) {
                return false;
            }
            this.hitEnemies.add(enemy.id);
        }
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
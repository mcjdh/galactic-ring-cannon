/**
 * GravityWell - persistent area control entity created by Singularity Cannon shots.
 * Applies slow, pull force, and damage over time to enemies caught in the field.
 */
class GravityWell {
    constructor({
        x = 0,
        y = 0,
        radius = 150,
        duration = 2.5,
        slowAmount = 0.4,
        pullStrength = 0.3,
        damageMultiplier = 0.15,
        baseDamage = 0,
        sourcePlayer = null
    } = {}) {
        this.type = 'gravityWell';
        this.x = x;
        this.y = y;
        this.radius = Math.max(40, radius);
        this.duration = Math.max(0.25, duration);
        this.timer = 0;
        this.isDead = false;

        this.slowAmount = Math.min(0.9, Math.max(0, slowAmount));
        this.pullStrength = Math.max(0, pullStrength);
        this.damageMultiplier = Math.max(0, damageMultiplier);
        this.baseDamage = Math.max(0, baseDamage);
        this.sourcePlayer = sourcePlayer;

        this.damageInterval = 0.25;
        this.damageTimer = 0;

        this.visualRotation = Math.random() * Math.PI * 2;
        this.visualRotationSpeed = 0.7 + Math.random() * 0.6;
        this.particleAccumulator = 0;
        this.fadeDuration = Math.min(0.6, Math.max(0.2, this.duration * 0.35));
        this._pulseOffset = Math.random() * Math.PI * 2;

        if (typeof GravityWell._activeCount !== 'number') {
            GravityWell._activeCount = 0;
        }
        GravityWell._activeCount++;
        this._releasedActiveSlot = false;
    }

    update(deltaTime, game) {
        if (this.isDead) {
            this._releaseActiveSlot();
            return;
        }

        this.timer += deltaTime;
        if (this.timer >= this.duration) {
            this.isDead = true;
            this._releaseActiveSlot();
            return;
        }

        this.visualRotation += this.visualRotationSpeed * deltaTime;

        this._applyDamage(deltaTime, game);
        this._spawnParticles(deltaTime);
    }

    _applyDamage(deltaTime, game) {
        if (!game || this.damageMultiplier <= 0 || this.baseDamage <= 0) {
            return;
        }

        this.damageTimer += deltaTime;
        if (this.damageTimer < this.damageInterval) {
            return;
        }
        this.damageTimer = 0;

        const enemies = typeof game.getEnemiesWithinRadius === 'function'
            ? game.getEnemiesWithinRadius(this.x, this.y, this.radius, { includeDead: false })
            : (Array.isArray(game.enemies) ? game.enemies : []);

        if (!enemies.length) {
            return;
        }

        const baseDamagePerSecond = this.baseDamage * this.damageMultiplier;

        // Level-based scaling for Void Warden
        // This scales ALL gravity well damage including the AOE DoT ticks
        let levelBonus = 1.0;
        if (this.sourcePlayer?.characterDefinition?.id === 'void_warden') {
            const playerLevel = this.sourcePlayer?.stats?.level || 1;
            levelBonus = 1.0 + (playerLevel * 0.15); // +15% damage per level (increased from 8%)

            // Enhanced debug logging to show actual damage
            if (window.logger?.isDebugEnabled?.('projectiles') && playerLevel > 1) {
                const baseDPS = baseDamagePerSecond.toFixed(1);
                const scaledDPS = (baseDamagePerSecond * levelBonus).toFixed(1);
                window.logger.log(`[GravityWell] Void Warden L${playerLevel}: ${baseDPS} → ${scaledDPS} DPS (${levelBonus.toFixed(2)}x)`);
            }
        }

        const tickDamage = baseDamagePerSecond * levelBonus * this.damageInterval;

        for (const enemy of enemies) {
            // [FIX] Add coordinate validation to prevent crashes with NaN values
            if (!enemy || enemy.isDead || typeof enemy.takeDamage !== 'function' ||
                isNaN(enemy.x) || isNaN(enemy.y)) {
                continue;
            }

            // [PERFORMANCE] Use FastMath if available for distance calculation
            let distance;
            if (window.FastMath) {
                distance = window.FastMath.distance(this.x, this.y, enemy.x, enemy.y);
            } else {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                distance = Math.sqrt(dx * dx + dy * dy);
            }

            // Prevent division by zero or negative distance issues
            distance = distance || 0.001;

            if (distance > this.radius) {
                continue;
            }

            const intensity = 1 - (distance / this.radius);
            const damage = Math.max(1, tickDamage * intensity);
            enemy.takeDamage(damage);

            if (window.gameEngine?.unifiedUI?.addDamageNumber) {
                window.gameEngine.unifiedUI.addDamageNumber(
                    Math.round(damage),
                    enemy.x,
                    enemy.y,
                    false,
                    '#a778ff'
                );
            }
        }
    }

    _spawnParticles(deltaTime) {
        if (!window.optimizedParticles) return;

        const activeCount = Math.max(1, GravityWell._activeCount || 1);
        const densityPenalty = Math.max(0.25, 1 - Math.max(0, activeCount - 2) * 0.18);
        const qualityScale = window.optimizedParticles.densityMultiplier ?? 1;
        const visibility = this._getVisibilityFactor();
        const baseRate = 32;
        const spawnRate = baseRate * densityPenalty * qualityScale * visibility;
        if (spawnRate <= 0) {
            return;
        }

        this.particleAccumulator += deltaTime * spawnRate;
        while (this.particleAccumulator >= 1) {
            this.particleAccumulator -= 1;

            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            const inward = Math.random() > 0.35;
            const speedBase = inward ? 60 : 35;

            window.optimizedParticles.spawnParticle({
                x,
                y,
                vx: (inward ? -Math.cos(angle) : Math.cos(angle)) * speedBase,
                vy: (inward ? -Math.sin(angle) : Math.sin(angle)) * speedBase,
                size: 2 + Math.random() * 2.5,
                color: inward ? '#d5c4ff' : '#7f8cfc',
                life: 0.5 + Math.random() * 0.35,
                type: inward ? 'spark' : 'smoke'
            });
        }
    }

    render(ctx) {
        ctx.save();

        const visibility = this._getVisibilityFactor();

        // Enhanced visuals for high-level Void Warden
        let intensityBonus = 1.0;
        if (this.sourcePlayer?.characterDefinition?.id === 'void_warden') {
            const playerLevel = this.sourcePlayer?.stats?.level || 1;
            intensityBonus = 1.0 + Math.min(0.5, playerLevel * 0.03); // Up to +50% intensity at high levels
        }

        const alpha = (0.2 + 0.55 * visibility) * Math.min(1.4, intensityBonus);
        const pulse = 1 + (0.04 * Math.sin(this._pulseOffset + this.timer * 4)) * intensityBonus;
        const drawRadius = this.radius * pulse;

        const gradient = ctx.createRadialGradient(
            this.x,
            this.y,
            drawRadius * 0.12,
            this.x,
            this.y,
            drawRadius
        );
        gradient.addColorStop(0, 'rgba(210, 200, 255, 0.95)');
        gradient.addColorStop(0.45, 'rgba(140, 125, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(60, 55, 180, 0)');

        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.65 * visibility;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#c7b5ff';
        for (let ring = 0; ring < 2; ring++) {
            const ringRadius = drawRadius * (0.45 + ring * 0.25);
            ctx.beginPath();
            ctx.ellipse(
                this.x,
                this.y,
                ringRadius,
                ringRadius * 0.85,
                this.visualRotation + ring * Math.PI * 0.5,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }

        // Outer ripple for subtle fade-out edge
        ctx.globalAlpha = 0.25 * visibility;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#a483ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, drawRadius * 1.05, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    _getVisibilityFactor() {
        const fadeDuration = this.fadeDuration || 0.3;
        const fadeIn = Math.min(1, this.timer / fadeDuration);
        const fadeOut = Math.min(1, (this.duration - this.timer) / fadeDuration);
        return Math.max(0, Math.min(fadeIn, fadeOut));
    }

    _releaseActiveSlot() {
        if (this._releasedActiveSlot) return;
        this._releasedActiveSlot = true;
        if (typeof GravityWell._activeCount === 'number' && GravityWell._activeCount > 0) {
            GravityWell._activeCount--;
        }
    }

    getDebugInfo() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius,
            remaining: Math.max(0, this.duration - this.timer),
            slowAmount: this.slowAmount,
            pullStrength: this.pullStrength
        };
    }
}

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.GravityWell = GravityWell;
}

GravityWell._activeCount = 0;

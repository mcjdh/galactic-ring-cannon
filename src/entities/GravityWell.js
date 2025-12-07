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

        sourcePlayer = null,
        burnData = null // { damage, duration, chance }
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
        this.burnData = burnData;

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
                !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) {
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

            // Apply burn effect if configured (chance checked per tick to avoid guaranteed burn on first frame)
            if (this.burnData && enemy.statusEffects) {
                // Throttle burn application to avoid applying every frame
                // Use a random check against delta time to approximate 'chance per second' or just use flat chance
                // Since this runs every 0.25s (damageInterval), we can use the chance directly
                if (Math.random() < (this.burnData.chance || 0.3)) {
                    enemy.statusEffects.applyEffect('burn', {
                        damage: this.burnData.damage || 5,
                        explosionDamage: 0,
                        explosionRadius: 0
                    }, this.burnData.duration || 3.0);
                }
            }

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
        let loops = 0;
        while (this.particleAccumulator >= 1 && loops < 100) {
            this.particleAccumulator -= 1;
            loops++;

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
        if (visibility <= 0) {
            ctx.restore();
            return;
        }

        // Enhanced visuals for high-level Void Warden
        let intensityBonus = 1.0;
        if (this.sourcePlayer?.characterDefinition?.id === 'void_warden') {
            const playerLevel = this.sourcePlayer?.stats?.level || 1;
            intensityBonus = 1.0 + Math.min(0.5, playerLevel * 0.03);
        }

        // Subtle background-style effect - reduced intensity
        const alpha = (0.12 + 0.28 * visibility) * Math.min(1.2, intensityBonus);
        const pulse = 1 + (0.02 * Math.sin(this._pulseOffset + this.timer * 3)) * intensityBonus;
        const drawRadius = this.radius * pulse;
        const time = this.timer * 2.0;

        // === LAYER 1: Subtle void background gradient ===
        const gradient = ctx.createRadialGradient(
            this.x, this.y, drawRadius * 0.1,
            this.x, this.y, drawRadius
        );
        gradient.addColorStop(0, 'rgba(30, 15, 60, 0.6)');
        gradient.addColorStop(0.4, 'rgba(50, 35, 100, 0.3)');
        gradient.addColorStop(0.8, 'rgba(60, 50, 110, 0.1)');
        gradient.addColorStop(1, 'rgba(40, 30, 80, 0)');

        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        // === LAYER 2 & 3: Cached wireframe sprite ===
        const cache = GravityWell._ensureCache();
        if (cache) {
            // Calculate animation frame from rotation
            const frameCount = GravityWell._CACHE_FRAMES;
            const normalizedRotation = ((this.visualRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const frameIndex = Math.floor((normalizedRotation / (Math.PI * 2)) * frameCount) % frameCount;

            const sprite = cache[frameIndex];
            if (sprite) {
                // Scale cached sprite to match current radius
                const scale = (drawRadius / GravityWell._CACHE_BASE_RADIUS);
                const spriteSize = GravityWell._CACHE_SIZE * scale;

                // Reduced wireframe opacity for subtler effect
                ctx.globalAlpha = visibility * 0.5 * Math.min(1.0, intensityBonus);
                ctx.drawImage(
                    sprite,
                    this.x - spriteSize / 2,
                    this.y - spriteSize / 2,
                    spriteSize,
                    spriteSize
                );
            }
        }

        // === LAYER 4: Subtle central glow ===
        const coreRadius = drawRadius * 0.15;
        const corePulse = 1 + 0.08 * Math.sin(time * 1.5);

        const centerGlow = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, coreRadius * 0.5 * corePulse
        );
        centerGlow.addColorStop(0, 'rgba(200, 180, 255, 0.5)');
        centerGlow.addColorStop(0.5, 'rgba(160, 140, 200, 0.25)');
        centerGlow.addColorStop(1, 'rgba(120, 100, 160, 0)');

        ctx.globalAlpha = 0.5 * visibility * corePulse;
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreRadius * 0.5 * corePulse, 0, Math.PI * 2);
        ctx.fill();

        // === LAYER 5: Subtle outer ripple ===
        ctx.globalAlpha = 0.18 * visibility;
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#8070bb';

        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const ripple = 1 + 0.03 * Math.sin(angle * 6 + time * 3);
            const r = drawRadius * 1.05 * ripple;
            const px = this.x + Math.cos(angle) * r;
            const py = this.y + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    // ========================================
    // STATIC SPRITE CACHE SYSTEM
    // ========================================

    /**
     * Ensure the static wireframe cache is initialized.
     * Returns the cache array or null if not ready.
     */
    static _ensureCache() {
        if (GravityWell._spriteCache) {
            return GravityWell._spriteCache;
        }

        // Initialize cache lazily on first gravity well render
        GravityWell._initCache();
        return GravityWell._spriteCache;
    }

    /**
     * Initialize the static wireframe sprite cache.
     * Pre-renders 32 rotation frames of the hexagonal rings + triangular core.
     */
    static _initCache() {
        if (GravityWell._spriteCache) return;

        const frameCount = GravityWell._CACHE_FRAMES;
        const size = GravityWell._CACHE_SIZE;
        const baseRadius = GravityWell._CACHE_BASE_RADIUS;
        const center = size / 2;

        GravityWell._spriteCache = [];

        for (let frame = 0; frame < frameCount; frame++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const rotation = (frame / frameCount) * Math.PI * 2;

            // Draw hexagonal wireframe rings
            const hexSides = 6;
            const ringLayers = 3;

            for (let layer = 0; layer < ringLayers; layer++) {
                const layerRadius = baseRadius * (0.35 + layer * 0.25);
                const layerRotation = rotation * (1 + layer * 0.3) + layer * Math.PI / 3;
                // Muted colors for background-style appearance
                const layerAlpha = 0.4 - layer * 0.1;

                ctx.globalAlpha = layerAlpha;
                ctx.strokeStyle = layer === 0 ? '#b0a0dd' : (layer === 1 ? '#9080bb' : '#706099');
                ctx.lineWidth = 1.5 - layer * 0.3;
                ctx.shadowColor = '#806099';
                ctx.shadowBlur = 4 - layer;

                ctx.beginPath();
                for (let i = 0; i <= hexSides; i++) {
                    const angle = (i / hexSides) * Math.PI * 2 + layerRotation;
                    const px = center + Math.cos(angle) * layerRadius;
                    const py = center + Math.sin(angle) * layerRadius;
                    if (i === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }
                ctx.stroke();
            }

            // Draw inner triangular core
            const coreRadius = baseRadius * 0.2;
            const coreRotation = -rotation * 2;

            // Subdued core - not bright white
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#d0c8ee';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#a090cc';
            ctx.shadowBlur = 6;

            ctx.beginPath();
            for (let i = 0; i <= 3; i++) {
                const angle = (i / 3) * Math.PI * 2 + coreRotation;
                const px = center + Math.cos(angle) * coreRadius;
                const py = center + Math.sin(angle) * coreRadius;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            GravityWell._spriteCache.push(canvas);
        }

        if (window.logger?.isDebugEnabled?.('systems')) {
            window.logger.log(`[GravityWell] Cached ${frameCount} wireframe sprites`);
        }
    }

    /**
     * Clear the static cache (for memory cleanup or hot reload).
     */
    static clearCache() {
        GravityWell._spriteCache = null;
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

// Static cache configuration
GravityWell._activeCount = 0;
GravityWell._spriteCache = null;
GravityWell._CACHE_FRAMES = 32;       // Number of rotation frames to cache
GravityWell._CACHE_SIZE = 256;        // Sprite canvas size in pixels
GravityWell._CACHE_BASE_RADIUS = 100; // Base radius for cached sprites

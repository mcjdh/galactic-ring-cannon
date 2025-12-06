/**
 * XP Orb - Experience orbs dropped by enemies
 * Extracted from enemy.js for better organization
 */
class XPOrb {
    constructor(x, y, value = 5) {
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;

        // Base XP value with meta progression bonuses and early-game boost
        this.value = this.applyEarlyGameBoost(this.calculateValue(value));
        this.baseValue = value;

        this.type = 'xpOrb';
        this.isDead = false;
        this.collected = false;

        // Size based on value
        this.radius = this.calculateRadius(this.value);

        // Visual properties
        this.color = this.calculateColor(this.value);
        this.glowColor = this.calculateGlowColor(this.value);

        // Add random scatter when dropped
        this.x += (Math.random() - 0.5) * 40;
        this.y += (Math.random() - 0.5) * 40;

        // Animation properties
        this.bobAmplitude = 3;
        this.bobSpeed = 3;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotation = 0;
        this.scale = 1;
        this.pulseSpeed = 2;

        // Physics properties
        this.isBeingMagnetized = false;
        this.magnetSpeed = 300;
    }

    /**
     * Calculate final XP value with meta progression bonuses
     * @param {number} baseValue - Base XP value
     * @returns {number} Final XP value
     */
    calculateValue(baseValue) {
        let finalValue = baseValue;

        // Apply Jupiter XP gain bonus with defensive check
        const StorageManager = window.StorageManager;
        const xpBonusTier = (StorageManager && typeof StorageManager.getInt === 'function')
            ? StorageManager.getInt('meta_jupiter_xp_gain', 0)
            : 0;
        if (xpBonusTier > 0) {
            finalValue = Math.floor(finalValue * (1 + xpBonusTier * 0.05));
        }

        return finalValue;
    }

    applyEarlyGameBoost(baseValue) {
        try {
            const gm = window.gameManager;
            if (!gm || typeof window.GameMath?.earlyXPBoostMultiplier !== 'function') return baseValue;
            const mult = window.GameMath.earlyXPBoostMultiplier(gm.gameTime || 0);
            return Math.max(1, Math.floor(baseValue * mult));
        } catch (_) {
            return baseValue;
        }
    }

    /**
     * Calculate orb radius based on value
     * @param {number} value - XP value
     * @returns {number} Radius
     */
    calculateRadius(value) {
        if (value > 50) return 12;
        if (value > 20) return 8;
        return 5;
    }

    /**
     * Calculate orb color based on value
     * @param {number} value - XP value
     * @returns {string} Color
     */
    calculateColor(value) {
        if (value > 50) return '#f1c40f'; // Gold for high value
        if (value > 20) return '#3498db'; // Blue for medium value
        return '#2ecc71'; // Green for standard
    }

    /**
     * Calculate glow color based on value
     * @param {number} value - XP value
     * @returns {string} Glow color
     */
    calculateGlowColor(value) {
        if (value > 50) return 'rgba(241, 196, 15, 0.4)'; // Gold glow
        if (value > 20) return 'rgba(52, 152, 219, 0.4)'; // Blue glow
        return 'rgba(46, 204, 113, 0.3)'; // Green glow
    }

    /**
     * Update the XP orb (called by GameEngine)
     * @param {number} deltaTime - Time since last update
     * @param {Game} game - Game instance
     */
    update(deltaTime, game) {
        if (this.collected || this.isDead) return;

        // Update magnetism behavior
        this.updateMagnetism(deltaTime, game);

        // Update animations
        this.updateAnimations(deltaTime);
    }

    /**
     * Update magnetism behavior
     * @param {number} deltaTime - Time since last update
     * @param {Game} game - Game instance
     */
    updateMagnetism(deltaTime, game) {
        if (!game.player) return;

        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Check if within magnet range (using squared distance - 8x faster)
        const magnetRange = game.player.magnetRange || 100;
        const magnetRangeSq = magnetRange * magnetRange;

        if (distSq < magnetRangeSq && distSq > 0) {
            this.isBeingMagnetized = true;

            // Calculate pull strength (stronger when closer)
            // [OPTIMIZATION] Use PerformanceCache.sqrt for fast distance calculation
            const distance = window.perfCache
                ? window.perfCache.sqrt(distSq)
                : (window.Game?.FastMath ? window.Game.FastMath.distanceFast(this.x, this.y, game.player.x, game.player.y) : Math.sqrt(distSq));

            const pullFactor = 1 - (distance / magnetRange);
            const pullStrength = this.magnetSpeed * pullFactor;
            const speed = pullStrength * deltaTime;

            // Move towards player (normalize with inverse sqrt)
            const invDist = 1 / distance;
            const vx = dx * invDist * speed;
            const vy = dy * invDist * speed;

            this.x += vx;
            this.y += vy;
        } else {
            this.isBeingMagnetized = false;
        }
    }

    /**
     * Update animations (bobbing, rotation, pulsing)
     * @param {number} deltaTime - Time since last update
     */
    updateAnimations(deltaTime) {
        this.bobOffset += this.bobSpeed * deltaTime;
        this.rotation += deltaTime * 2;

        // Pulsing scale effect with FastMath optimization
        const FastMath = window.Game?.FastMath;
        this.scale = 1 + (FastMath ? FastMath.sin(this.bobOffset * this.pulseSpeed) : Math.sin(this.bobOffset * this.pulseSpeed)) * 0.1;
    }

    /**
     * Check if orb should be collected by player
     * @param {Game} game - Game instance
     */
    checkCollection(game) {
        if (!game.player || this.collected) return;

        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Collection range (use squared distance to avoid sqrt - 8x faster)
        const collectionRange = this.radius + game.player.radius;
        const collectionRangeSq = collectionRange * collectionRange;

        if (distSq < collectionRangeSq) {
            this.collect(game);
        }
    }

    /**
     * Collect the XP orb
     * @param {Game} game - Game instance
     */
    collect(game) {
        // Fallback/manual collection method (not used in normal flow).
        // Central collision system should handle XP and visuals.
        if (this.collected) return;
        this.collected = true;
        this.isDead = true;
        // Award XP via Player API if called manually
        if (game?.player && typeof game.player.addXP === 'function' && typeof this.value === 'number') {
            game.player.addXP(this.value);
        }
        // Optional: small collection effect without duplicating UI text
        this.createCollectionEffect();
    }

    /**
     * Create visual effect when orb is collected
     */
    createCollectionEffect() {
        // Use optimizedParticles for sparkle effect
        if (window.optimizedParticles?.spawnParticle) {
            const pool = window.optimizedParticles;
            const poolPressure = pool.activeParticles.length / pool.maxParticles;
            const isHighLoad = poolPressure > 0.8;

            const particleCount = isHighLoad ? 4 : 8;
            const FastMath = window.Game?.FastMath;

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 50 + Math.random() * 50;
                const { sin, cos } = FastMath ? FastMath.sincos(angle) : { sin: Math.sin(angle), cos: Math.cos(angle) };

                pool.spawnParticle({
                    x: this.x,
                    y: this.y,
                    vx: cos * speed,
                    vy: sin * speed,
                    size: 2 + Math.random() * 2,
                    color: this.color,
                    life: 0.4,
                    type: 'spark'
                });
            }

            // Add a ring effect for high value orbs
            if (this.value > 20 && !isHighLoad) {
                pool.spawnParticle({
                    x: this.x,
                    y: this.y,
                    vx: 0,
                    vy: 0,
                    size: this.radius * 1.5,
                    color: this.color,
                    life: 0.3,
                    type: 'ring'
                });
            }

        } else if (window.Game?.ParticleHelpers?.createHitEffect) {
            window.Game.ParticleHelpers.createHitEffect(this.x, this.y, 25);
        }
    }

    /**
     * Render the XP orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (this.collected) return;

        ctx.save();

        // Use FastMath for bobbing effect (low overhead but consistent optimization)
        const FastMath = window.Game?.FastMath;
        const bobY = (FastMath ? FastMath.sin(this.bobOffset) : Math.sin(this.bobOffset)) * this.bobAmplitude;
        const renderY = this.y + bobY;

        // Apply scaling
        ctx.translate(this.x, renderY);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-this.x, -renderY);

        // Draw glow effect
        if (!window.gameManager?.lowQuality) {
            this.renderGlow(ctx, renderY);
        }

        // Draw main orb (Polybius geometric style - no symbol needed)
        this.renderOrb(ctx, renderY);

        // Draw magnet indicator if being magnetized
        if (this.isBeingMagnetized) {
            this.renderMagnetEffect(ctx, renderY);
        }

        ctx.restore();
    }

    /**
     * Render glow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderGlow(ctx, renderY) {
        // Polybius Style: Square Glow
        const size = this.radius * 2.5;
        ctx.fillStyle = XPOrb._colorWithAlpha(this.glowColor, 0.2);
        ctx.fillRect(this.x - size / 2, renderY - size / 2, size, size);
    }

    /**
     * Render main orb body
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderOrb(ctx, renderY) {
        // Polybius Style: Rotating Square/Diamond
        ctx.save();
        ctx.translate(this.x, renderY);
        ctx.rotate(this.rotation); // Already rotating from updateAnimations

        const size = this.radius * 1.2;

        // Void center
        ctx.fillStyle = '#000000';
        ctx.fillRect(-size, -size, size * 2, size * 2);

        // Neon Outline
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-size, -size, size * 2, size * 2);

        // Inner Core
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        const coreSize = size * 0.4;
        ctx.fillRect(-coreSize, -coreSize, coreSize * 2, coreSize * 2);

        ctx.restore();
    }

    /**
     * Render XP symbol inside orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderSymbol(ctx, renderY) {
        // No symbol needed for the geometric style, the core is enough
        return;
    }

    /**
     * Render magnetic attraction effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderMagnetEffect(ctx, renderY) {
        // Polybius Style: Dashed Square
        const size = this.radius * 3.0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(this.x - size / 2, renderY - size / 2, size, size);
        ctx.setLineDash([]);
    }

    /**
     * Get orb data for debugging
     * @returns {Object} Orb state
     */
    getDebugInfo() {
        return {
            position: { x: this.x, y: this.y },
            value: this.value,
            baseValue: this.baseValue,
            radius: this.radius,
            isBeingMagnetized: this.isBeingMagnetized,
            collected: this.collected,
            isDead: this.isDead
        };
    }

    /**
     * Static method to create XP orb from enemy death
     * @param {Enemy} enemy - Enemy that was killed
     * @returns {XPOrb} New XP orb
     */
    static fromEnemy(enemy) {
        let baseValue = 5;

        // Scale XP based on enemy type
        if (enemy.isBoss) {
            baseValue = enemy.isMegaBoss ? 100 : 50;
        } else if (enemy.isElite) {
            baseValue = 15;
        } else {
            switch (enemy.enemyType) {
                case 'fast':
                    baseValue = 3;
                    break;
                case 'tank':
                    baseValue = 10;
                    break;
                case 'exploder':
                    baseValue = 8;
                    break;
                default:
                    baseValue = 5;
            }
        }

        return new XPOrb(enemy.x, enemy.y, baseValue);
    }

    /**
     * Static method to create bonus XP orb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} multiplier - XP multiplier
     * @returns {XPOrb} Bonus XP orb
     */
    static createBonus(x, y, multiplier = 2) {
        const bonusValue = 10 * multiplier;
        return new XPOrb(x, y, bonusValue);
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.XPOrb = XPOrb;
}

XPOrb._alphaColorCache = new Map();
XPOrb._parsedColorCache = new Map();
XPOrb._MAX_CACHE_SIZE = 500; // Prevent unbounded memory growth

XPOrb._colorWithAlpha = function (color, alpha) {
    const key = `${color}|${alpha}`;
    const cache = XPOrb._alphaColorCache;
    if (cache.has(key)) {
        return cache.get(key);
    }
    // Evict oldest entries if cache is too large
    if (cache.size >= XPOrb._MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    const parsed = XPOrb._parseColor(color);
    const value = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
    cache.set(key, value);
    return value;
};

XPOrb._parseColor = function (color) {
    const cache = XPOrb._parsedColorCache;
    if (cache.has(color)) {
        return cache.get(color);
    }
    // Evict oldest entries if cache is too large
    if (cache.size >= XPOrb._MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    const parsed = XPOrb._extractRGBComponents(color);
    cache.set(color, parsed);
    return parsed;
};

XPOrb._extractRGBComponents = function (color) {
    const clamp = (value) => {
        const num = parseFloat(value);
        if (!Number.isFinite(num)) return 255;
        return Math.max(0, Math.min(255, Math.round(num)));
    };

    if (typeof color === 'string') {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            }
            if (hex.length >= 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16)
                };
            }
        } else {
            const rgbaMatch = color.match(/^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)(?:\s*,\s*[0-9]+(?:\.[0-9]+)?)?\s*\)$/i);
            if (rgbaMatch) {
                return {
                    r: clamp(rgbaMatch[1]),
                    g: clamp(rgbaMatch[2]),
                    b: clamp(rgbaMatch[3])
                };
            }
        }
    }

    return { r: 255, g: 255, b: 255 };
};

/**
 * [OPTIMIZATION] Batch render XP orbs - reduces ctx.save/restore from 400 to 2 with 100 orbs
 * @param {XPOrb[]} orbs - Array of XP orbs to render
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
XPOrb.renderBatch = function (orbs, ctx) {
    if (!orbs || orbs.length === 0) return;

    const FastMath = window.Game?.FastMath;
    const lowQuality = window.gameManager?.lowQuality;

    // Single save for entire batch
    ctx.save();

    // Render all glows first (if not low quality)
    if (!lowQuality) {
        for (let i = 0; i < orbs.length; i++) {
            const orb = orbs[i];
            if (orb.collected) continue;

            const bobY = (FastMath ? FastMath.sin(orb.bobOffset) : Math.sin(orb.bobOffset)) * orb.bobAmplitude;
            const renderY = orb.y + bobY;
            const size = orb.radius * 2.5;

            // Polybius Style: Square Glow
            ctx.fillStyle = XPOrb._colorWithAlpha(orb.glowColor, 0.2);
            ctx.fillRect(orb.x - size / 2, renderY - size / 2, size, size);
        }
    }

    // Render all orb bodies - single pass
    // Polybius Style: Rotating Square/Diamond
    for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        if (orb.collected) continue;

        const bobY = (FastMath ? FastMath.sin(orb.bobOffset) : Math.sin(orb.bobOffset)) * orb.bobAmplitude;
        const renderY = orb.y + bobY;
        const scaledRadius = orb.radius * orb.scale;

        const cos = FastMath ? FastMath.cos(orb.rotation) : Math.cos(orb.rotation);
        const sin = FastMath ? FastMath.sin(orb.rotation) : Math.sin(orb.rotation);
        const size = scaledRadius * 1.2;

        // Transform vertices manually to avoid ctx.translate/rotate overhead in loop
        // Center: (orb.x, renderY)

        // 1. Void Center (Black)
        // Vertices for square of size 'size' centered at 0, rotated by 'rotation'
        // (-size, -size), (size, -size), (size, size), (-size, size)

        ctx.fillStyle = '#000000';
        XPOrb._fillRotatedRect(ctx, orb.x, renderY, size, cos, sin);

        // 2. Inner Core (Color)
        const coreSize = size * 0.4;
        ctx.fillStyle = XPOrb._colorWithAlpha(orb.color, 0.6);
        XPOrb._fillRotatedRect(ctx, orb.x, renderY, coreSize, cos, sin);

        // 3. Neon Outline (Stroke)
        ctx.strokeStyle = orb.color;
        ctx.lineWidth = 2;
        XPOrb._strokeRotatedRect(ctx, orb.x, renderY, size, cos, sin);

        // 4. Highlight (White dot)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        // Offset highlight slightly top-left relative to rotation
        const hOff = -size * 0.3;
        const hX = orb.x + (hOff * cos - hOff * sin);
        const hY = renderY + (hOff * sin + hOff * cos);
        const hSize = size * 0.2;
        ctx.beginPath();
        ctx.arc(hX, hY, hSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render magnet effects for magnetized orbs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); // Matched to single render

    for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        if (orb.collected || !orb.isBeingMagnetized) continue;

        const bobY = (FastMath ? FastMath.sin(orb.bobOffset) : Math.sin(orb.bobOffset)) * orb.bobAmplitude;
        const renderY = orb.y + bobY;
        const size = orb.radius * 3.0;

        // Polybius Style: Dashed Square
        ctx.strokeRect(orb.x - size / 2, renderY - size / 2, size, size);
    }

    // Reset line dash
    ctx.setLineDash([]);

    // Single restore for entire batch
    ctx.restore();
};

// Helper for optimized rendering
XPOrb._fillRotatedRect = function (ctx, cx, cy, imgSize, cos, sin) {
    const x1 = cx + (-imgSize * cos - (-imgSize) * sin);
    const y1 = cy + (-imgSize * sin + (-imgSize) * cos);

    const x2 = cx + (imgSize * cos - (-imgSize) * sin);
    const y2 = cy + (imgSize * sin + (-imgSize) * cos);

    const x3 = cx + (imgSize * cos - imgSize * sin);
    const y3 = cy + (imgSize * sin + imgSize * cos);

    const x4 = cx + (-imgSize * cos - imgSize * sin);
    const y4 = cy + (-imgSize * sin + imgSize * cos);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
};

XPOrb._strokeRotatedRect = function (ctx, cx, cy, imgSize, cos, sin) {
    const x1 = cx + (-imgSize * cos - (-imgSize) * sin);
    const y1 = cy + (-imgSize * sin + (-imgSize) * cos);

    const x2 = cx + (imgSize * cos - (-imgSize) * sin);
    const y2 = cy + (imgSize * sin + (-imgSize) * cos);

    const x3 = cx + (imgSize * cos - imgSize * sin);
    const y3 = cy + (imgSize * sin + imgSize * cos);

    const x4 = cx + (-imgSize * cos - imgSize * sin);
    const y4 = cy + (-imgSize * sin + imgSize * cos);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.stroke();
};


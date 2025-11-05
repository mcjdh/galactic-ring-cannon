class PlayerRenderer {
    constructor(player) {
        this.player = player;
        this._spriteCache = null;
    }

    render(ctx) {
        // Draw player body
        this.renderPlayerBody(ctx);

        // Draw dodge cooldown indicator
        this.player.movement.renderDodgeIndicator(ctx);

        // Draw AOE attack range indicator
        this.player.combat.renderAOEIndicator(ctx);

        // Draw orbital projectiles
        this.player.abilities.renderOrbitalAttacks(ctx);
    }

    renderPlayerBody(ctx) {
        const sprites = this._ensureSprites();
        const x = this.player.x;
        const y = this.player.y;
        const radius = this.player.radius;

        if (!sprites) {
            const haloColor = PlayerRenderer._colorWithAlpha('#00ffff', 0.4);
            const coreColor = '#00aaff';
            const highlightColor = 'rgba(255,255,255,0.6)';

            if (this.player.stats.isInvulnerable) {
                ctx.fillStyle = PlayerRenderer._colorWithAlpha('#00ffff', 0.3);
                ctx.beginPath();
                ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
                ctx.fill();

                if (this.player.movement.isDodging) {
                    ctx.strokeStyle = haloColor;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            ctx.fillStyle = coreColor;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = highlightColor;
            ctx.beginPath();
            ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = haloColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
            return;
        }

        if (this.player.stats.isInvulnerable && sprites.invuln) {
            ctx.drawImage(
                sprites.invuln.canvas,
                x - sprites.invuln.halfSize,
                y - sprites.invuln.halfSize
            );

            if (this.player.movement.isDodging && sprites.dodge) {
                ctx.drawImage(
                    sprites.dodge.canvas,
                    x - sprites.dodge.halfSize,
                    y - sprites.dodge.halfSize
                );
            }
        }

        ctx.drawImage(
            sprites.base.canvas,
            x - sprites.base.halfSize,
            y - sprites.base.halfSize
        );
    }

    _ensureSprites() {
        if (typeof document === 'undefined') {
            return null;
        }

        const radius = this.player.radius;
        const classKey = this.player.characterId || 'default';
        const key = `${classKey}_${radius.toFixed(2)}`;

        if (this._spriteCache && this._spriteCache.key === key) {
            return this._spriteCache;
        }

        const base = this._createBaseSprite(radius, classKey);
        if (!base) {
            this._spriteCache = null;
            return null;
        }

        const invuln = this._createInvulnerabilitySprite(radius);
        const dodge = this._createDodgeSprite(radius);

        this._spriteCache = {
            key,
            base,
            invuln,
            dodge
        };
        return this._spriteCache;
    }

    _createBaseSprite(radius, classKey) {
        const glowBlur = 15;
        const glowPadding = Math.max(glowBlur * 2, radius * 0.6);
        const outerRadius = radius + glowPadding;
        const size = Math.max(4, Math.ceil(outerRadius * 2));
        const canvas = this._createOffscreenCanvas(size);
        if (!canvas) return null;

        const offCtx = canvas.getContext('2d');
        if (!offCtx) return null;

        const center = size / 2;
        const colors = this._resolveClassColors(classKey);
        const gradient = offCtx.createRadialGradient(center, center, 0, center, center, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, colors.glow);
        gradient.addColorStop(1, colors.core);

        offCtx.shadowBlur = glowBlur;
        offCtx.shadowColor = colors.glow;
        offCtx.fillStyle = gradient;
        offCtx.beginPath();
        offCtx.arc(center, center, radius, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.shadowBlur = 0;

        offCtx.strokeStyle = colors.glow;
        offCtx.lineWidth = 2;
        offCtx.beginPath();
        offCtx.arc(center, center, radius, 0, Math.PI * 2);
        offCtx.stroke();

        return { canvas, halfSize: size / 2 };
    }

    _resolveClassColors(classKey) {
        const defaults = { core: '#0088ff', glow: '#00ffff' };
        const table = window.GAME_CONSTANTS?.PLAYER?.CLASS_COLORS;
        if (!table) {
            return defaults;
        }
        return table[classKey] || defaults;
    }

    _createInvulnerabilitySprite(radius) {
        const outerRadius = radius * 2;
        const padding = Math.max(outerRadius * 0.1, 6);
        const size = Math.max(4, Math.ceil((outerRadius + padding) * 2));
        const canvas = this._createOffscreenCanvas(size);
        if (!canvas) return null;

        const offCtx = canvas.getContext('2d');
        if (!offCtx) return null;

        const center = size / 2;
        const gradient = offCtx.createRadialGradient(center, center, 0, center, center, outerRadius);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(0.5, '#00ffff');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

        offCtx.fillStyle = gradient;
        offCtx.beginPath();
        offCtx.arc(center, center, outerRadius, 0, Math.PI * 2);
        offCtx.fill();

        return { canvas, halfSize: size / 2 };
    }

    _createDodgeSprite(radius) {
        const ringRadius = radius + 5;
        const glowBlur = 20;
        const padding = glowBlur + 4;
        const outerRadius = ringRadius + padding;
        const size = Math.max(4, Math.ceil(outerRadius * 2));
        const canvas = this._createOffscreenCanvas(size);
        if (!canvas) return null;

        const offCtx = canvas.getContext('2d');
        if (!offCtx) return null;

        const center = size / 2;
        offCtx.strokeStyle = '#00ffff';
        offCtx.lineWidth = 3;
        offCtx.shadowBlur = glowBlur;
        offCtx.shadowColor = '#00ffff';
        offCtx.beginPath();
        offCtx.arc(center, center, ringRadius, 0, Math.PI * 2);
        offCtx.stroke();
        offCtx.shadowBlur = 0;

        return { canvas, halfSize: size / 2 };
    }

    _createOffscreenCanvas(size) {
        if (typeof document === 'undefined') {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    }

    // Create upgrade stack effect
    createUpgradeStackEffect() {
        const gm = window.gameManager;
        const helpers = window.Game?.ParticleHelpers;
        const stats = helpers?.getParticleStats?.();

        if (stats?.lowQuality) {
            return;
        }

        const count = helpers?.calculateSpawnCount?.(16)
            ?? Math.floor(16 * Math.min(window.gameManager?.particleReductionFactor || 1, 1));

        if (count <= 0) return;

        // Create simple spiral effect
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 30;
            this.player.spawnParticle(
                this.player.x + Math.cos(angle) * distance,
                this.player.y + Math.sin(angle) * distance,
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

    // Get debug information for rendering
    getDebugInfo() {
        return {
            position: { x: this.player.x, y: this.player.y },
            radius: this.player.radius,
            color: this.player.color,
            isInvulnerable: this.player.stats.isInvulnerable,
            isDodging: this.player.movement.isDodging
        };
    }
}

PlayerRenderer._alphaColorCache = new Map();
PlayerRenderer._parsedColorCache = new Map();

PlayerRenderer._colorWithAlpha = function(color, alpha) {
    const key = `${color}|${alpha}`;
    const cache = PlayerRenderer._alphaColorCache;
    if (cache.has(key)) {
        return cache.get(key);
    }
    const parsed = PlayerRenderer._parseColor(color);
    const value = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
    cache.set(key, value);
    return value;
};

PlayerRenderer._parseColor = function(color) {
    const cache = PlayerRenderer._parsedColorCache;
    if (cache.has(color)) {
        return cache.get(color);
    }
    const parsed = PlayerRenderer._extractRGBComponents(color);
    cache.set(color, parsed);
    return parsed;
};

PlayerRenderer._extractRGBComponents = function(color) {
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

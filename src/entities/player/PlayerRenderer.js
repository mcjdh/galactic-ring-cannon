class PlayerRenderer {
    constructor(player) {
        this.player = player;
        this._spriteCache = null;
    }

    render(ctx) {
        // Draw berserker rage aura (behind player)
        this.renderBerserkerAura(ctx);

        // Draw player body
        this.renderPlayerBody(ctx);

        // Draw shield barrier (if active)
        this.renderShieldBarrier(ctx);

        // Draw dodge cooldown indicator
        this.player.movement.renderDodgeIndicator(ctx);

        // Draw AOE attack range indicator
        this.player.combat.renderAOEIndicator(ctx);

        // Draw orbital projectiles
        this.player.abilities.renderOrbitalAttacks(ctx);
    }

    renderPlayerBody(ctx) {
        const x = this.player.x;
        const y = this.player.y;
        const radius = this.player.radius;
        const rotation = this.player.rotation || 0;
        const color = this.player.color || '#00ffff';
        const glowColor = this.player.glowColor || '#00ffff';

        // POLYBIUS VIBE: Vector-style ship
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation + Math.PI / 2); // Point upwards by default

        // Engine Glow (Pulsing)
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        ctx.fillStyle = PlayerRenderer._colorWithAlpha(glowColor, 0.3);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, radius * 0.5);
        ctx.lineTo(0, radius * 1.5 * pulse);
        ctx.lineTo(radius * 0.5, radius * 0.5);
        ctx.fill();

        // Main Ship Body
        ctx.fillStyle = '#000000'; // Black void center
        ctx.strokeStyle = color;   // Neon outline
        ctx.lineWidth = 2;
        
        if (this.player.stats.isInvulnerable) {
            ctx.strokeStyle = '#ffffff'; // White flash when invuln
            ctx.setLineDash([2, 2]);
        }

        ctx.beginPath();
        
        // Unique Geometry per Class
        switch (this.player.characterId) {
            case 'nova_corsair': // Speed/Aggressive - Forward Swept Wing / Trident
                ctx.moveTo(0, -radius * 1.6); // Long nose
                ctx.lineTo(radius * 0.4, -radius * 0.4);
                ctx.lineTo(radius * 1.2, 0); // Wing tip
                ctx.lineTo(radius * 0.6, radius); // Engine
                ctx.lineTo(0, radius * 0.6); // Rear
                ctx.lineTo(-radius * 0.6, radius);
                ctx.lineTo(-radius * 1.2, 0);
                ctx.lineTo(-radius * 0.4, -radius * 0.4);
                break;

            case 'stormcaller': // Lightning - 4-Point Star / Bolt
                ctx.moveTo(0, -radius * 1.5);
                ctx.lineTo(radius * 0.4, -radius * 0.4);
                ctx.lineTo(radius * 1.2, 0);
                ctx.lineTo(radius * 0.4, radius * 0.4);
                ctx.lineTo(0, radius * 1.5);
                ctx.lineTo(-radius * 0.4, radius * 0.4);
                ctx.lineTo(-radius * 1.2, 0);
                ctx.lineTo(-radius * 0.4, -radius * 0.4);
                break;

            case 'nexus_architect': // Orbital/Structure - Hexagon
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    const r = radius * 1.1;
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                break;

            case 'inferno_juggernaut': // Tank - Heavy Block / Fortress
                // Octagon-ish block
                const s = radius * 0.9;
                const c = radius * 0.4;
                ctx.moveTo(-c, -s);
                ctx.lineTo(c, -s);
                ctx.lineTo(s, -c);
                ctx.lineTo(s, c);
                ctx.lineTo(c, s);
                ctx.lineTo(-c, s);
                ctx.lineTo(-s, c);
                ctx.lineTo(-s, -c);
                break;

            case 'crimson_reaver': // Vampire - Spiked Crescent
                ctx.moveTo(0, -radius * 1.2);
                ctx.quadraticCurveTo(radius, -radius * 0.5, radius * 1.2, radius * 0.8);
                ctx.lineTo(0, radius * 0.2);
                ctx.lineTo(-radius * 1.2, radius * 0.8);
                ctx.quadraticCurveTo(-radius, -radius * 0.5, 0, -radius * 1.2);
                break;

            case 'void_warden': // Gravity - Ring/Torus
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.moveTo(radius * 0.5, 0);
                ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2, true); // Hole
                break;

            case 'phantom_striker': // Ghost - Split/Phasing
                // Left half
                ctx.moveTo(-radius * 0.2, -radius * 1.2);
                ctx.lineTo(-radius, radius);
                ctx.lineTo(-radius * 0.2, radius * 0.5);
                // Right half
                ctx.moveTo(radius * 0.2, -radius * 1.2);
                ctx.lineTo(radius, radius);
                ctx.lineTo(radius * 0.2, radius * 0.5);
                break;

            case 'cybernetic_berserker': // Glitch - Asymmetrical
                ctx.moveTo(0, -radius * 1.4);
                ctx.lineTo(radius * 1.1, radius * 0.8);
                ctx.lineTo(radius * 0.2, radius * 0.6);
                ctx.lineTo(-radius * 0.8, radius * 1.1);
                ctx.lineTo(-radius * 0.5, -radius * 0.2);
                break;

            case 'aegis_vanguard': // Shield - Heavy Chevron / Bulwark
            default:
                // Wide Shield Shape
                ctx.moveTo(0, -radius * 1.1); // Top point
                ctx.lineTo(radius * 1.1, -radius * 0.3); // Top right corner
                ctx.lineTo(radius * 0.7, radius * 1.0); // Bottom right
                ctx.lineTo(0, radius * 0.6); // Bottom center indent
                ctx.lineTo(-radius * 0.7, radius * 1.0); // Bottom left
                ctx.lineTo(-radius * 1.1, -radius * 0.3); // Top left corner
                break;
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit / Core (Unique per class)
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        
        if (this.player.characterId === 'void_warden') {
             ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        } else if (this.player.characterId === 'nexus_architect') {
             ctx.rect(-radius * 0.3, -radius * 0.3, radius * 0.6, radius * 0.6);
        } else {
             ctx.moveTo(0, -radius * 0.2);
             ctx.lineTo(radius * 0.2, radius * 0.4);
             ctx.lineTo(-radius * 0.2, radius * 0.4);
        }
        ctx.fill();

        ctx.restore();
    }

    static _colorWithAlpha(color, alpha) {
        // Simple hex to rgba helper
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }

    renderShieldBarrier(ctx) {
        const abilities = this.player.abilities;
        if (!abilities.hasShield) return;

        const x = this.player.x;
        const y = this.player.y;
        const radius = this.player.radius;
        const maxCapacity = abilities.shieldMaxCapacity;
        if (!maxCapacity || maxCapacity <= 0) return;
        const shieldRadius = radius + 15;

        // Shield active - draw hexagonal barrier
        if (abilities.shieldCurrent > 0) {
            ctx.save();

            // Calculate alpha based on shield strength (0.3 to 0.7)
            const shieldStrength = abilities.shieldCurrent / maxCapacity;
            let alpha = 0.3 + (shieldStrength * 0.4);

            // Add hit flash pulse
            if (abilities.shieldHitFlash > 0) {
                alpha += abilities.shieldHitFlash * 0.4;  // Bright flash on hit
                // Add white flash tint
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 15 * abilities.shieldHitFlash;
            }

            ctx.globalAlpha = Math.min(alpha, 1.0);

            // Outer glow
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;

            // Draw hexagon
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = x + Math.cos(angle) * shieldRadius;
                const py = y + Math.sin(angle) * shieldRadius;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.stroke();

            // Inner glow (brighter on hit)
            ctx.globalAlpha = (alpha * 0.3) + (abilities.shieldHitFlash * 0.3);
            ctx.fillStyle = abilities.shieldHitFlash > 0.5 ? '#ffffff' : '#00ffff';
            ctx.fill();

            ctx.restore();

            // Shield capacity bar above player
            this.renderShieldBar(ctx, x, y - radius - 25, abilities.shieldCurrent, abilities.shieldMaxCapacity);
        }
        // Shield recharging - show progress
        else if (abilities.shieldBroken) {
            const rechargeProgress = 1 - (abilities.shieldRechargeTimer / abilities.shieldRechargeTime);

            // Pulsing recharge effect
            if (rechargeProgress > 0) {
                ctx.save();
                const pulseAlpha = 0.1 + (Math.sin(Date.now() / 200) * 0.05);
                ctx.globalAlpha = pulseAlpha;
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;

                // Partial hexagon based on recharge progress
                ctx.beginPath();
                const arcLength = (Math.PI * 2) * rechargeProgress;
                for (let i = 0; i < 6; i++) {
                    const segmentStart = (Math.PI / 3) * i - Math.PI / 6;
                    const segmentEnd = segmentStart + (Math.PI / 3);

                    if (segmentStart < arcLength) {
                        const actualEnd = Math.min(segmentEnd, arcLength);
                        const px1 = x + Math.cos(segmentStart) * shieldRadius;
                        const py1 = y + Math.sin(segmentStart) * shieldRadius;
                        const px2 = x + Math.cos(actualEnd) * shieldRadius;
                        const py2 = y + Math.sin(actualEnd) * shieldRadius;

                        if (i === 0) {
                            ctx.moveTo(px1, py1);
                        }
                        ctx.lineTo(px2, py2);
                    }
                }
                ctx.stroke();
                ctx.restore();

                // Recharge progress bar
                this.renderRechargeBar(ctx, x, y - radius - 25, rechargeProgress);
            }
        }
    }

    renderShieldBar(ctx, x, y, current, max) {
        const barWidth = 40;
        const barHeight = 4;
        const barX = x - barWidth / 2;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, y, barWidth, barHeight);

        // Shield amount
        const fillWidth = (current / max) * barWidth;
        const gradient = ctx.createLinearGradient(barX, y, barX + barWidth, y);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(1, '#0088ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, y, fillWidth, barHeight);

        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, y, barWidth, barHeight);
    }

    renderRechargeBar(ctx, x, y, progress) {
        const barWidth = 40;
        const barHeight = 4;
        const barX = x - barWidth / 2;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, y, barWidth, barHeight);

        // Recharge progress
        const fillWidth = progress * barWidth;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(barX, y, fillWidth, barHeight);

        // Border
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, y, barWidth, barHeight);
    }

    /**
     * Render Low-HP Danger Indicator (Universal for all characters)
     * Enhanced intensity for Berserker characters
     * Shows when player is below 30% health (Edge Walker achievement threshold!)
     */
    renderBerserkerAura(ctx) {
        const stats = this.player.stats;
        const healthPercent = stats.health / stats.maxHealth;
        const missingHealth = 1 - healthPercent;

        // UNIVERSAL: Show danger aura for ALL characters below 30% HP
        const LOW_HP_THRESHOLD = 0.30; // 30% HP - Edge Walker achievement threshold!
        if (healthPercent > LOW_HP_THRESHOLD) return;

        const x = this.player.x;
        const y = this.player.y;
        const radius = this.player.radius;

        // Check if this is a berserker character for enhanced effects
        const isBerserker = this.player.abilities?.hasBerserker || false;

        // Calculate intensity based on missing health (gets stronger as HP drops)
        const dangerIntensity = Math.min((LOW_HP_THRESHOLD - healthPercent) / LOW_HP_THRESHOLD, 1.0);

        // Pulsing effect - faster pulse at lower HP
        const pulseSpeed = isBerserker
            ? (150 - (missingHealth * 100))  // Berserker: Very fast pulse
            : (200 - (dangerIntensity * 80)); // Normal: Moderate pulse
        const pulse = Math.sin(Date.now() / pulseSpeed) * 0.5 + 0.5;

        // Color selection: Orange for warning, Red for berserker rage
        const baseColor = isBerserker ? [255, 0, 0] : [255, 140, 0]; // Red vs Orange
        const glowColor = isBerserker ? [200, 0, 0] : [255, 100, 0];

        // Base intensity multiplier
        const intensityMult = isBerserker ? 1.5 : 1.0;

        // Inner glow (danger energy)
        const innerRadius = radius * (1.8 + pulse * 0.3);
        ctx.save();

        const innerGradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, innerRadius);
        innerGradient.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.15 * dangerIntensity * intensityMult})`);
        innerGradient.addColorStop(0.5, `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, ${0.25 * dangerIntensity * pulse * intensityMult})`);
        innerGradient.addColorStop(1, `rgba(${Math.floor(glowColor[0] * 0.7)}, 0, 0, 0)`);

        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer aura (danger warning halo)
        const outerRadius = radius * (2.5 + pulse * 0.5);
        const outerGradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
        outerGradient.addColorStop(0, `rgba(${baseColor[0]}, ${Math.floor(baseColor[0] * 0.2)}, 0, ${0.2 * dangerIntensity * pulse * intensityMult})`);
        outerGradient.addColorStop(0.6, `rgba(${Math.floor(glowColor[0] * 0.7)}, 0, 0, ${0.1 * dangerIntensity * intensityMult})`);
        outerGradient.addColorStop(1, 'rgba(100, 0, 0, 0)');

        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        // BERSERKER ONLY: Electrical arcs when rage is extremely high (below 15% HP)
        if (isBerserker && healthPercent < 0.15 && pulse > 0.7) {
            const arcIntensity = isBerserker ? 0.6 : 0.3;
            ctx.strokeStyle = `rgba(255, 100, 100, ${arcIntensity * pulse})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff0000';

            const arcCount = 4;
            for (let i = 0; i < arcCount; i++) {
                const angle = (i / arcCount) * Math.PI * 2 + (Date.now() / 500);
                const arcLength = radius * 2;

                ctx.beginPath();
                ctx.moveTo(
                    x + Math.cos(angle) * radius,
                    y + Math.sin(angle) * radius
                );
                ctx.lineTo(
                    x + Math.cos(angle) * arcLength,
                    y + Math.sin(angle) * arcLength
                );
                ctx.stroke();
            }
        }

        ctx.restore();

        // Spawn danger particles when moving (helps visibility)
        const particleChance = isBerserker ? 0.15 : 0.08;
        if (this.player.movement.isMoving && Math.random() < particleChance * dangerIntensity) {
            this.spawnDangerParticle(x, y, dangerIntensity, isBerserker);
        }
    }

    /**
     * Spawn a single danger/rage particle for low-HP indicator
     */
    spawnDangerParticle(x, y, intensity, isBerserker) {
        if (!window.optimizedParticles) return;

        const angle = Math.random() * Math.PI * 2;
        const distance = this.player.radius * 0.8;
        const speed = 20 + Math.random() * 30;

        // Berserker: Red rage particles, Normal: Orange warning particles
        const particleColors = isBerserker
            ? ['#ff2020', '#ff6060']  // Red rage
            : ['#ff8c00', '#ffa500']; // Orange warning

        window.optimizedParticles.spawnParticle({
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed - 30, // Rise upward
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? particleColors[0] : particleColors[1],
            life: 0.4 + Math.random() * 0.3,
            type: 'spark',
            friction: 0.92
        });
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

PlayerRenderer._colorWithAlpha = function (color, alpha) {
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

PlayerRenderer._parseColor = function (color) {
    const cache = PlayerRenderer._parsedColorCache;
    if (cache.has(color)) {
        return cache.get(color);
    }
    const parsed = PlayerRenderer._extractRGBComponents(color);
    cache.set(color, parsed);
    return parsed;
};

PlayerRenderer._extractRGBComponents = function (color) {
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

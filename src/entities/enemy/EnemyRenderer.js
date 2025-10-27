/**
 * EnemyRenderer - Handles all enemy visual rendering
 * Extracted from Enemy class for better separation of concerns
 */
class EnemyRenderer {
    /**
     * Main render method - called from Enemy.render()
     */
    static render(enemy, ctx) {
        // Skip rendering if not visible (phantom enemies)
        if (enemy.abilities.canPhase && !enemy.abilities.isVisible) {
            return;
        }

        const previousAlpha = ctx.globalAlpha;
        const previousFill = ctx.fillStyle;
        const previousStroke = ctx.strokeStyle;
        const previousLineWidth = ctx.lineWidth;
        const previousLineCap = ctx.lineCap;

        let combinedAlpha = previousAlpha;

        if (enemy.opacity !== undefined && enemy.opacity < 1.0) {
            combinedAlpha *= enemy.opacity;
        }

        if (enemy.abilities.canPhase && enemy.abilities.isVisible) {
            combinedAlpha *= 0.7;
        }

        ctx.globalAlpha = combinedAlpha;

        // Draw shield effect if active
        if (enemy.abilities.shieldActive) {
            this.renderShieldEffect(enemy, ctx);
        }

        // Draw elite glow if elite
        if (enemy.isElite && enemy.glowColor) {
            this.renderEliteGlow(enemy, ctx);
        }

        // Calculate pulsing effect for elites and bosses
        const pulseScale = (enemy.isElite || enemy.isBoss) ? (enemy.pulseIntensity || 1.0) : 1.0;
        const drawRadius = enemy.radius * pulseScale;

        const baseColor = enemy.color || '#ffffff';
        const fillColor = enemy.damageFlashTimer > 0
            ? EnemyRenderer._getHitFlashColor(baseColor)
            : baseColor;

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw boss crown if boss
        if (enemy.isBoss) {
            this.renderBossCrown(enemy, ctx);
        }

        // Draw phase indicator for multi-phase bosses
        if (enemy.hasPhases && enemy.currentPhase > 1) {
            this.renderPhaseIndicator(enemy, ctx);
        }

        ctx.globalAlpha = previousAlpha;
        ctx.fillStyle = previousFill;
        ctx.strokeStyle = previousStroke;
        ctx.lineWidth = previousLineWidth;
        ctx.setLineDash([]);
        ctx.lineCap = previousLineCap;
    }

    /**
     * Render shield effect around enemy - Synthwave themed
     */
    static renderShieldEffect(enemy, ctx) {
        const previousAlpha = ctx.globalAlpha;
        ctx.globalAlpha *= 0.6;
        ctx.strokeStyle = EnemyRenderer._colorWithAlpha('#00ffff', 0.6);
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = previousAlpha;
    }

    /**
     * Render elite enemy glow
     */
    static renderEliteGlow(enemy, ctx) {
        const glowRadius = enemy.radius + 6;
        const glowColor = enemy.glowColor || enemy.color || '#ffffff';
        ctx.fillStyle = EnemyRenderer._colorWithAlpha(glowColor, 0.28);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render boss crown indicator - Synthwave themed
     */
    static renderBossCrown(enemy, ctx) {
        ctx.fillStyle = '#ffff00';
        const crownSize = 6;

        // Simple crown shape
        ctx.beginPath();
        ctx.moveTo(enemy.x - crownSize, enemy.y - enemy.radius - 5);
        ctx.lineTo(enemy.x, enemy.y - enemy.radius - 12);
        ctx.lineTo(enemy.x + crownSize, enemy.y - enemy.radius - 5);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Render phase indicator for multi-phase bosses
     */
    static renderPhaseIndicator(enemy, ctx) {
        ctx.fillStyle = '#ff6b35';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`P${enemy.currentPhase}`, enemy.x, enemy.y - enemy.radius - 25);
    }

    /**
     * Render health bar (fallback - usually handled by UnifiedUIManager)
     */
    static renderHealthBar(enemy, ctx) {
        try {
            const previousAlpha = ctx.globalAlpha;
            ctx.globalAlpha = 1.0;

            const barWidth = Math.max(enemy.radius * 2, 20);
            const barHeight = 4;
            const barY = enemy.y - enemy.radius - 15;

            // Ensure valid health values
            const healthPercent = Math.max(0, Math.min(1, (enemy.health || 0) / (enemy.maxHealth || 1)));

            // Background
            ctx.fillStyle = '#000';
            ctx.fillRect(enemy.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);

            ctx.fillStyle = '#333';
            ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);

            // Health
            const healthColor = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillStyle = healthColor;
            ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

            ctx.globalAlpha = previousAlpha;
        } catch (error) {
            (window.logger?.warn || (() => {}))('Error rendering enemy health bar:', error);
        }
    }

    static _getHitFlashColor(color) {
        const cache = EnemyRenderer._flashColorCache || (EnemyRenderer._flashColorCache = new Map());
        if (cache.has(color)) {
            return cache.get(color);
        }
        const parsed = EnemyRenderer._parseColor(color);
        const lighten = (value) => Math.min(255, Math.round(value + (255 - value) * 0.4));
        const flash = `rgb(${lighten(parsed.r)}, ${lighten(parsed.g)}, ${lighten(parsed.b)})`;
        cache.set(color, flash);
        return flash;
    }

    static _colorWithAlpha(color, alpha) {
        const key = `${color}|${alpha}`;
        const cache = EnemyRenderer._alphaColorCache || (EnemyRenderer._alphaColorCache = new Map());
        if (cache.has(key)) {
            return cache.get(key);
        }
        const parsed = EnemyRenderer._parseColor(color);
        const result = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
        cache.set(key, result);
        return result;
    }

    static _parseColor(color) {
        const cache = EnemyRenderer._parsedColorCache || (EnemyRenderer._parsedColorCache = new Map());
        if (cache.has(color)) {
            return cache.get(color);
        }
        const parsed = EnemyRenderer._extractRGBComponents(color);
        cache.set(color, parsed);
        return parsed;
    }

    static _extractRGBComponents(color) {
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
    }
}

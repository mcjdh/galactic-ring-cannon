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
     * Batched rendering for enemies to minimize repeated canvas state changes
     */
    static renderBatch(enemies, ctx) {
        if (!enemies || enemies.length === 0) return;

        const originalAlpha = ctx.globalAlpha;
        const originalFill = ctx.fillStyle;
        const originalStroke = ctx.strokeStyle;
        const originalLineWidth = ctx.lineWidth;
        const originalLineCap = ctx.lineCap;
        const originalFont = ctx.font;
        const originalTextAlign = ctx.textAlign;
        const originalLineDash = ctx.getLineDash ? ctx.getLineDash() : null;

        const bodyBatches = this._bodyBatches || (this._bodyBatches = new Map());
        const shieldBatch = this._shieldBatch || (this._shieldBatch = []);
        const eliteGlowBatches = this._eliteGlowBatches || (this._eliteGlowBatches = new Map());
        const bossCrownBatch = this._bossCrownBatch || (this._bossCrownBatch = []);
        const phaseIndicatorBatch = this._phaseIndicatorBatch || (this._phaseIndicatorBatch = []);

        bodyBatches.clear();
        shieldBatch.length = 0;
        eliteGlowBatches.clear();
        bossCrownBatch.length = 0;
        phaseIndicatorBatch.length = 0;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy || enemy.isDead) continue;
            if (enemy.abilities?.canPhase && !enemy.abilities.isVisible) continue;

            let combinedAlpha = originalAlpha;
            if (typeof enemy.opacity === 'number' && enemy.opacity < 1) {
                combinedAlpha *= Math.max(enemy.opacity, 0);
            }
            if (enemy.abilities?.canPhase && enemy.abilities.isVisible) {
                combinedAlpha *= 0.7;
            }
            combinedAlpha = Math.max(0, Math.min(1, combinedAlpha));

            const baseColor = enemy.color || '#ffffff';
            const fillColor = enemy.damageFlashTimer > 0
                ? EnemyRenderer._getHitFlashColor(baseColor)
                : baseColor;

            const key = `${fillColor}|${combinedAlpha.toFixed(3)}`;
            let batch = bodyBatches.get(key);
            if (!batch) {
                batch = [];
                bodyBatches.set(key, batch);
            }
            batch.push(enemy);

            if (enemy.abilities?.shieldActive) {
                shieldBatch.push(enemy);
            }

            if (enemy.isElite && (enemy.glowColor || enemy.color)) {
                const glowColor = enemy.glowColor || enemy.color || '#ffffff';
                const glowKey = EnemyRenderer._colorWithAlpha(glowColor, 0.28);
                let glowBatch = eliteGlowBatches.get(glowKey);
                if (!glowBatch) {
                    glowBatch = [];
                    eliteGlowBatches.set(glowKey, glowBatch);
                }
                glowBatch.push(enemy);
            }

            if (enemy.isBoss) {
                bossCrownBatch.push(enemy);
            }

            if (enemy.hasPhases && enemy.currentPhase > 1) {
                phaseIndicatorBatch.push(enemy);
            }
        }

        for (const [key, batch] of bodyBatches) {
            const [fillColor, alphaStr] = key.split('|');
            const batchAlpha = parseFloat(alphaStr);
            ctx.globalAlpha = batchAlpha;
            ctx.fillStyle = fillColor;
            ctx.beginPath();

            for (let i = 0; i < batch.length; i++) {
                const enemy = batch[i];
                const pulseScale = (enemy.isElite || enemy.isBoss) ? (enemy.pulseIntensity || 1.0) : 1.0;
                const drawRadius = enemy.radius * pulseScale;
                ctx.moveTo(enemy.x + drawRadius, enemy.y);
                ctx.arc(enemy.x, enemy.y, drawRadius, 0, Math.PI * 2);
            }

            ctx.fill();
            batch.length = 0;
        }
        bodyBatches.clear();

        ctx.globalAlpha = originalAlpha;

        if (shieldBatch.length) {
            const previousStroke = ctx.strokeStyle;
            const previousLineWidth = ctx.lineWidth;
            const previousLineDash = originalLineDash;

            ctx.globalAlpha = originalAlpha * 0.6;
            ctx.strokeStyle = EnemyRenderer._colorWithAlpha('#00ffff', 0.6);
            ctx.lineWidth = 3;
            ctx.setLineDash ? ctx.setLineDash([5, 5]) : null;

            ctx.beginPath();
            for (let i = 0; i < shieldBatch.length; i++) {
                const enemy = shieldBatch[i];
                const radius = enemy.radius + 8;
                ctx.moveTo(enemy.x + radius, enemy.y);
                ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
            }
            ctx.stroke();

            if (ctx.setLineDash) {
                ctx.setLineDash(previousLineDash || []);
            }
            ctx.strokeStyle = previousStroke;
            ctx.lineWidth = previousLineWidth;
            ctx.globalAlpha = originalAlpha;
            shieldBatch.length = 0;
        }

        if (eliteGlowBatches.size) {
            ctx.globalAlpha = originalAlpha;
            for (const [fillStyle, batch] of eliteGlowBatches) {
                ctx.fillStyle = fillStyle;
                ctx.beginPath();
                for (let i = 0; i < batch.length; i++) {
                    const enemy = batch[i];
                    const glowRadius = enemy.radius + 6;
                    ctx.moveTo(enemy.x + glowRadius, enemy.y);
                    ctx.arc(enemy.x, enemy.y, glowRadius, 0, Math.PI * 2);
                }
                ctx.fill();
                batch.length = 0;
            }
            eliteGlowBatches.clear();
        }

        if (bossCrownBatch.length) {
            ctx.globalAlpha = originalAlpha;
            ctx.fillStyle = '#ffff00';
            const crownSize = 6;
            for (let i = 0; i < bossCrownBatch.length; i++) {
                const enemy = bossCrownBatch[i];
                ctx.beginPath();
                ctx.moveTo(enemy.x - crownSize, enemy.y - enemy.radius - 5);
                ctx.lineTo(enemy.x, enemy.y - enemy.radius - 12);
                ctx.lineTo(enemy.x + crownSize, enemy.y - enemy.radius - 5);
                ctx.closePath();
                ctx.fill();
            }
            bossCrownBatch.length = 0;
        }

        if (phaseIndicatorBatch.length) {
            ctx.globalAlpha = originalAlpha;
            const previousFont = originalFont || ctx.font;
            const previousAlign = originalTextAlign || ctx.textAlign;

            ctx.fillStyle = '#ff6b35';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';

            for (let i = 0; i < phaseIndicatorBatch.length; i++) {
                const enemy = phaseIndicatorBatch[i];
                ctx.fillText(`P${enemy.currentPhase}`, enemy.x, enemy.y - enemy.radius - 25);
            }

            ctx.font = previousFont;
            ctx.textAlign = previousAlign;
            phaseIndicatorBatch.length = 0;
        }

        ctx.globalAlpha = originalAlpha;
        ctx.fillStyle = originalFill;
        ctx.strokeStyle = originalStroke;
        ctx.lineWidth = originalLineWidth;
        ctx.lineCap = originalLineCap;
        if (ctx.setLineDash) {
            ctx.setLineDash(originalLineDash || []);
        }
        ctx.font = originalFont;
        ctx.textAlign = originalTextAlign;
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

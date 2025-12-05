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

        // [FIX] Skip rendering if enemy has invalid position (NaN protection)
        if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) || !Number.isFinite(enemy.radius)) {
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

        // Draw boss aura if boss (before body for layering)
        if (enemy.isBoss) {
            this.renderBossAura(enemy, ctx);
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

        // POLYBIUS VIBE: Geometric Shapes
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        // Rotate based on ID to give some variation/spin
        const spin = (Date.now() * 0.001) + (parseInt(enemy.id || '0', 36) % 10);
        if (enemy.isBoss) ctx.rotate(spin * 0.5);
        else if (enemy.isElite) ctx.rotate(-spin);
        
        ctx.fillStyle = '#000000'; // Void center
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = enemy.isBoss ? 3 : 2;

        ctx.beginPath();
        if (enemy.isBoss) {
            // Hexagon for Bosses
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const r = drawRadius;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        } else if (enemy.isElite) {
            // Diamond for Elites
            ctx.moveTo(0, -drawRadius);
            ctx.lineTo(drawRadius, 0);
            ctx.lineTo(0, drawRadius);
            ctx.lineTo(-drawRadius, 0);
        } else {
            // Square/Diamond hybrid for basic enemies (rotated square)
            // Or just a simple shape. Let's do a "Spiked Circle" or just a square for basic.
            // Let's do a square for basic enemies to look "digital"
            const r = drawRadius * 0.8;
            ctx.rect(-r, -r, r * 2, r * 2);
        }
        ctx.closePath();
        
        ctx.fill(); // Black fill
        ctx.stroke(); // Neon outline

        // Inner Core Glow
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = combinedAlpha * 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, drawRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw boss crown if boss
        if (enemy.isBoss) {
            this.renderBossCrown(enemy, ctx);
        }

        // Draw phase indicator for multi-phase bosses
        if (enemy.hasPhases && enemy.currentPhase > 1) {
            this.renderPhaseIndicator(enemy, ctx);
        }

        this.renderStatusEffects(enemy, ctx);

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
        const bossAuraBatch = this._bossAuraBatch || (this._bossAuraBatch = []);
        const bossCrownBatch = this._bossCrownBatch || (this._bossCrownBatch = []);
        const phaseIndicatorBatch = this._phaseIndicatorBatch || (this._phaseIndicatorBatch = []);
        const burnOverlayBatch = this._burnOverlayBatch || (this._burnOverlayBatch = []);

        bodyBatches.clear();
        shieldBatch.length = 0;
        eliteGlowBatches.clear();
        bossAuraBatch.length = 0;
        bossCrownBatch.length = 0;
        phaseIndicatorBatch.length = 0;
        burnOverlayBatch.length = 0;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy || enemy.isDead) continue;
            if (enemy.abilities?.canPhase && !enemy.abilities.isVisible) continue;
            // [FIX] Skip enemies with invalid positions (NaN protection for late game)
            if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) || !Number.isFinite(enemy.radius)) continue;

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
                bossAuraBatch.push(enemy);
                bossCrownBatch.push(enemy);
            }

            if (enemy.hasPhases && enemy.currentPhase > 1) {
                phaseIndicatorBatch.push(enemy);
            }

            const burnEffect = enemy.statusEffects?.getEffect?.('burn');
            if (burnEffect) {
                burnOverlayBatch.push({ enemy, effect: burnEffect });
            }
        }

        // Render boss auras first (underneath everything)
        if (bossAuraBatch.length) {
            ctx.globalAlpha = originalAlpha;
            for (let i = 0; i < bossAuraBatch.length; i++) {
                this.renderBossAura(bossAuraBatch[i], ctx);
            }
            bossAuraBatch.length = 0;
        }

        for (const [key, batch] of bodyBatches) {
            const [fillColor, alphaStr] = key.split('|');
            const batchAlpha = parseFloat(alphaStr);
            
            // Pass 1: Main Body (Black Fill + Neon Stroke)
            ctx.globalAlpha = batchAlpha;
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            for (let i = 0; i < batch.length; i++) {
                const enemy = batch[i];
                const pulseScale = (enemy.isElite || enemy.isBoss) ? (enemy.pulseIntensity || 1.0) : 1.0;
                const r = enemy.radius * pulseScale;
                const x = enemy.x;
                const y = enemy.y;
                
                // Rotation logic (simplified for batching)
                const spin = (Date.now() * 0.001) + (parseInt(enemy.id || '0', 36) % 10);
                let angleOffset = 0;
                if (enemy.isBoss) angleOffset = spin * 0.5;
                else if (enemy.isElite) angleOffset = -spin;

                if (enemy.isBoss) {
                    // Hexagon
                    for (let j = 0; j < 6; j++) {
                        const angle = angleOffset + (j / 6) * Math.PI * 2;
                        const px = x + Math.cos(angle) * r;
                        const py = y + Math.sin(angle) * r;
                        if (j === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else if (enemy.isElite) {
                    // Diamond
                    ctx.moveTo(x + r * Math.sin(angleOffset), y - r * Math.cos(angleOffset));
                    ctx.lineTo(x + r * Math.cos(angleOffset), y + r * Math.sin(angleOffset));
                    ctx.lineTo(x - r * Math.sin(angleOffset), y + r * Math.cos(angleOffset));
                    ctx.lineTo(x - r * Math.cos(angleOffset), y - r * Math.sin(angleOffset));
                    ctx.closePath();
                } else {
                    // Square (Basic)
                    const size = r * 0.8;
                    ctx.rect(x - size, y - size, size * 2, size * 2);
                }
            }
            ctx.fill();
            ctx.stroke();

            // Pass 2: Inner Glow (Color Fill)
            ctx.globalAlpha = batchAlpha * 0.6;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            for (let i = 0; i < batch.length; i++) {
                const enemy = batch[i];
                const pulseScale = (enemy.isElite || enemy.isBoss) ? (enemy.pulseIntensity || 1.0) : 1.0;
                const r = enemy.radius * pulseScale * 0.4;
                ctx.moveTo(enemy.x + r, enemy.y);
                ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
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
            for (let i = 0; i < bossCrownBatch.length; i++) {
                this.renderBossCrown(bossCrownBatch[i], ctx);
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

        if (burnOverlayBatch.length) {
            ctx.globalAlpha = originalAlpha;
            for (let i = 0; i < burnOverlayBatch.length; i++) {
                const entry = burnOverlayBatch[i];
                this.renderBurnOverlay(entry.enemy, entry.effect, ctx);
            }
            burnOverlayBatch.length = 0;
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
     * Render boss aura - animated glowing ring effect
     * Performance-optimized with simple canvas operations
     */
    static renderBossAura(enemy, ctx) {
        const now = Date.now();
        const pulseSpeed = 2.0; // Seconds per pulse cycle
        const pulsePhase = (now % (pulseSpeed * 1000)) / (pulseSpeed * 1000);
        const pulseIntensity = Math.sin(pulsePhase * Math.PI * 2) * 0.3 + 0.7; // 0.4 to 1.0

        // Determine aura color based on boss type
        const isMega = enemy.isMegaBoss;
        const auraColor = isMega ? '#8e44ad' : '#f39c12'; // Purple for mega, golden for regular
        const ringColor = isMega ? '#9b59b6' : '#f1c40f';

        // Outer glow (faint aura)
        const outerGlowRadius = enemy.radius + 12;
        const outerAlpha = pulseIntensity * 0.25;
        ctx.fillStyle = EnemyRenderer._colorWithAlpha(auraColor, outerAlpha);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, outerGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Middle ring (pulsing)
        const middleRingRadius = enemy.radius + 8;
        const middleAlpha = pulseIntensity * 0.4;
        ctx.strokeStyle = EnemyRenderer._colorWithAlpha(ringColor, middleAlpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, middleRingRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring (constant, more visible)
        const innerRingRadius = enemy.radius + 4;
        ctx.strokeStyle = EnemyRenderer._colorWithAlpha(ringColor, 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, innerRingRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Mega boss only: Rotating arc segments (looks like energy arcs)
        if (isMega) {
            const rotationSpeed = 3.0; // Seconds per rotation
            const rotationPhase = (now % (rotationSpeed * 1000)) / (rotationSpeed * 1000);
            const rotationAngle = rotationPhase * Math.PI * 2;
            const arcRadius = enemy.radius + 10;
            const arcLength = Math.PI / 3; // 60 degrees
            const numArcs = 3;

            ctx.strokeStyle = EnemyRenderer._colorWithAlpha('#e74c3c', 0.7); // Red energy
            ctx.lineWidth = 2;

            for (let i = 0; i < numArcs; i++) {
                const startAngle = rotationAngle + (i * Math.PI * 2 / numArcs);
                const endAngle = startAngle + arcLength;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, arcRadius, startAngle, endAngle);
                ctx.stroke();
            }
        }
    }

    /**
     * Render boss crown indicator - Enhanced with glow
     */
    static renderBossCrown(enemy, ctx) {
        const isMega = enemy.isMegaBoss;
        const crownSize = isMega ? 10 : 8;
        const crownY = enemy.y - enemy.radius - (isMega ? 8 : 6);

        // Crown glow (shadow effect)
        const glowColor = isMega ? '#9b59b6' : '#f1c40f';
        ctx.fillStyle = EnemyRenderer._colorWithAlpha(glowColor, 0.4);
        const glowSize = crownSize + 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x - glowSize, crownY - 2);
        ctx.lineTo(enemy.x, crownY - (isMega ? 16 : 14));
        ctx.lineTo(enemy.x + glowSize, crownY - 2);
        ctx.closePath();
        ctx.fill();

        // Main crown
        ctx.fillStyle = isMega ? '#e74c3c' : '#ffff00'; // Red for mega, yellow for regular
        ctx.beginPath();
        ctx.moveTo(enemy.x - crownSize, crownY);
        ctx.lineTo(enemy.x, crownY - (isMega ? 14 : 12));
        ctx.lineTo(enemy.x + crownSize, crownY);
        ctx.closePath();
        ctx.fill();

        // Crown highlight (makes it pop)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        const highlightSize = crownSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(enemy.x - highlightSize, crownY - 3);
        ctx.lineTo(enemy.x, crownY - (isMega ? 10 : 8));
        ctx.lineTo(enemy.x + highlightSize, crownY - 3);
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

    static renderStatusEffects(enemy, ctx) {
        const effects = enemy.statusEffects;
        if (!effects || typeof effects.getEffect !== 'function') {
            return;
        }

        const burnEffect = effects.getEffect('burn');
        if (burnEffect) {
            this.renderBurnOverlay(enemy, burnEffect, ctx);
        }
    }

    static renderBurnOverlay(enemy, burnEffect, ctx) {
        if (!burnEffect) return;
        // [FIX] Validate enemy position before rendering overlay
        if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) || !Number.isFinite(enemy.radius)) return;

        const stacks = Math.max(1, burnEffect.stacks || 1);
        const elapsed = Math.max(0, burnEffect.elapsed || 0);
        const duration = Math.max(0.1, burnEffect.duration || 1);
        const progress = Math.min(1, elapsed / duration);
        const flicker = burnEffect._visualFlicker || 1;
        const baseIntensity = (0.35 + stacks * 0.2) * (1 - progress * 0.35);
        const intensity = Math.min(1, baseIntensity * flicker);

        if (intensity <= 0.05) {
            return;
        }

        ctx.save();
        const prevAlpha = ctx.globalAlpha;
        const radiusMultiplier = 1.05 + 0.07 * Math.sin((elapsed * 6) + (enemy._burnSeed || 0));
        // [FIX] Ensure radius is valid
        const radius = Math.max(1, enemy.radius * radiusMultiplier);

        ctx.globalAlpha = prevAlpha * Math.min(1, 0.9 * intensity);
        const gradient = ctx.createRadialGradient(
            enemy.x,
            enemy.y,
            radius * 0.35,
            enemy.x,
            enemy.y,
            radius * 1.25
        );
        gradient.addColorStop(0, 'rgba(255,140,60,0.8)');
        gradient.addColorStop(0.55, 'rgba(255,90,0,0.35)');
        gradient.addColorStop(1, 'rgba(255,70,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius * 1.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = prevAlpha * Math.min(1, 0.65 * intensity);
        ctx.strokeStyle = 'rgba(255,150,70,0.95)';
        ctx.lineWidth = 1.5 + stacks * 0.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
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
            window.logger.warn('Error rendering enemy health bar:', error);
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

        // [FIX] Handle null/undefined colors gracefully
        if (color == null || color === '') {
            return { r: 255, g: 255, b: 255 };
        }

        if (typeof color === 'string') {
            if (color.startsWith('#')) {
                const hex = color.slice(1);
                if (hex.length === 3) {
                    const r = parseInt(hex[0] + hex[0], 16);
                    const g = parseInt(hex[1] + hex[1], 16);
                    const b = parseInt(hex[2] + hex[2], 16);
                    // [FIX] Validate parsed values
                    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
                        return { r, g, b };
                    }
                }
                if (hex.length >= 6) {
                    const r = parseInt(hex.slice(0, 2), 16);
                    const g = parseInt(hex.slice(2, 4), 16);
                    const b = parseInt(hex.slice(4, 6), 16);
                    // [FIX] Validate parsed values
                    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
                        return { r, g, b };
                    }
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

        // Fallback to white - don't log every occurrence to avoid spam
        return { r: 255, g: 255, b: 255 };
    }
}

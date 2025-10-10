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

        // Save context state
        ctx.save();

        // Apply opacity for death animation
        if (enemy.opacity !== undefined && enemy.opacity < 1.0) {
            ctx.globalAlpha = enemy.opacity;
        }

        // Apply transparency for phantom enemies
        if (enemy.abilities.canPhase && enemy.abilities.isVisible) {
            ctx.globalAlpha = 0.7;
        }

        // Apply damage flash effect
        if (enemy.damageFlashTimer > 0) {
            ctx.filter = 'brightness(150%) saturate(150%)';
        }

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

        // Draw main enemy body with synthwave glow
        ctx.shadowBlur = enemy.isElite || enemy.isBoss ? 15 : 8;
        ctx.shadowColor = enemy.color;

        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Draw boss crown if boss
        if (enemy.isBoss) {
            this.renderBossCrown(enemy, ctx);
        }

        // Draw phase indicator for multi-phase bosses
        if (enemy.hasPhases && enemy.currentPhase > 1) {
            this.renderPhaseIndicator(enemy, ctx);
        }

        // Restore context state
        ctx.restore();
    }

    /**
     * Render shield effect around enemy - Synthwave themed
     */
    static renderShieldEffect(enemy, ctx) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    /**
     * Render elite enemy glow
     */
    static renderEliteGlow(enemy, ctx) {
        const glowRadius = enemy.radius + 5;
        const gradient = ctx.createRadialGradient(
            enemy.x, enemy.y, enemy.radius,
            enemy.x, enemy.y, glowRadius
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, enemy.glowColor + '40'); // 40 = 25% opacity in hex

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render boss crown indicator - Synthwave themed
     */
    static renderBossCrown(enemy, ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        const crownSize = 6;

        // Simple crown shape
        ctx.beginPath();
        ctx.moveTo(enemy.x - crownSize, enemy.y - enemy.radius - 5);
        ctx.lineTo(enemy.x, enemy.y - enemy.radius - 12);
        ctx.lineTo(enemy.x + crownSize, enemy.y - enemy.radius - 5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
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
            // Save context state to avoid interference
            ctx.save();

            // Reset filters and alpha but preserve camera transform
            ctx.filter = 'none';
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

            // Restore context state
            ctx.restore();
        } catch (error) {
            (window.logger?.warn || (() => {}))('Error rendering enemy health bar:', error);
        }
    }
}
/**
 * ProjectileRenderer - Handles all projectile visual rendering
 * Extracted from Projectile class for better separation of concerns
 */
class ProjectileRenderer {
    /**
     * Main render method
     */
    static render(projectile, ctx) {
        ctx.save();

        // Draw trail
        if (projectile.trail && projectile.trail.length > 1) {
            this.renderTrail(projectile, ctx);
        }

        // Draw projectile body
        this.renderBody(projectile, ctx);

        // Draw glow for special types
        if (projectile.behaviorManager?.behaviors.length > 0) {
            this.renderGlow(projectile, ctx);
        }

        // Draw crit indicator
        if (projectile.isCrit) {
            this.renderCritGlow(projectile, ctx);
        }

        ctx.restore();
    }

    /**
     * Render projectile trail
     */
    static renderTrail(projectile, ctx) {
        if (projectile.trail.length < 2) return;

        ctx.strokeStyle = this.getTrailColor(projectile);
        ctx.lineWidth = projectile.radius * 0.5;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;

        ctx.beginPath();
        ctx.moveTo(projectile.trail[0].x, projectile.trail[0].y);

        for (let i = 1; i < projectile.trail.length; i++) {
            const alpha = i / projectile.trail.length;
            ctx.globalAlpha = alpha * 0.6;
            ctx.lineTo(projectile.trail[i].x, projectile.trail[i].y);
        }

        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Render main projectile body
     */
    static renderBody(projectile, ctx) {
        ctx.fillStyle = this.getBodyColor(projectile);
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core for crits
        if (projectile.isCrit) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Render special type glow
     */
    static renderGlow(projectile, ctx) {
        const glowColor = this.getGlowColor(projectile);
        if (!glowColor) return;

        const gradient = ctx.createRadialGradient(
            projectile.x, projectile.y, projectile.radius * 0.5,
            projectile.x, projectile.y, projectile.radius * 2
        );

        gradient.addColorStop(0, glowColor + '80'); // 50% opacity
        gradient.addColorStop(1, glowColor + '00'); // 0% opacity

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render crit glow/pulse
     */
    static renderCritGlow(projectile, ctx) {
        const pulseIntensity = Math.sin(Date.now() / 100) * 0.3 + 0.7;

        const gradient = ctx.createRadialGradient(
            projectile.x, projectile.y, 0,
            projectile.x, projectile.y, projectile.radius * 2.5
        );

        gradient.addColorStop(0, `rgba(255, 215, 0, ${0.4 * pulseIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Get trail color based on behaviors
     */
    static getTrailColor(projectile) {
        if (!projectile.behaviorManager) return '#3498db';

        const behaviors = projectile.behaviorManager.behaviors;

        // Priority: Chain > Explosive > Homing > Piercing > Default
        if (behaviors.some(b => b.getType() === 'chain')) return '#6c5ce7';
        if (behaviors.some(b => b.getType() === 'explosive')) return '#ff6b35';
        if (behaviors.some(b => b.getType() === 'homing')) return '#e74c3c';
        if (behaviors.some(b => b.getType() === 'piercing')) return '#16a085';

        return '#3498db';
    }

    /**
     * Get body color based on behaviors
     */
    static getBodyColor(projectile) {
        if (projectile.isCrit) return '#ffd700'; // Gold for crits

        if (!projectile.behaviorManager) return '#2ecc71';

        const behaviors = projectile.behaviorManager.behaviors;

        // Mix colors based on behaviors
        if (behaviors.some(b => b.getType() === 'chain')) return '#a29bfe';
        if (behaviors.some(b => b.getType() === 'explosive')) return '#fd79a8';
        if (behaviors.some(b => b.getType() === 'homing')) return '#ff7675';
        if (behaviors.some(b => b.getType() === 'ricochet')) return '#4ecdc4';

        return '#2ecc71'; // Default green
    }

    /**
     * Get glow color
     */
    static getGlowColor(projectile) {
        if (!projectile.behaviorManager) return null;

        const behaviors = projectile.behaviorManager.behaviors;

        if (behaviors.some(b => b.getType() === 'chain')) return '#6c5ce7';
        if (behaviors.some(b => b.getType() === 'explosive')) return '#ff6b35';
        if (behaviors.some(b => b.getType() === 'homing')) return '#e74c3c';

        return null;
    }
}
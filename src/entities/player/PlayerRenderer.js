class PlayerRenderer {
    constructor(player) {
        this.player = player;
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
        // 🌌 Synthwave player rendering
        const x = this.player.x;
        const y = this.player.y;
        const radius = this.player.radius;

        if (this.player.stats.isInvulnerable) {
            // Invulnerability effect - bright cyan glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(0.5, '#00ffff');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Add dash effect when dodging
            if (this.player.movement.isDodging) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00ffff';
                ctx.beginPath();
                ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // Core player body - bright cyan with glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#00ffff');
        gradient.addColorStop(1, '#0088ff');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Outer glow
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
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

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
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);

        if (this.player.stats.isInvulnerable) {
            // Draw invulnerability effect
            ctx.strokeStyle = this.player.movement.isDodging ? '#3498db' : this.player.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Add dash effect when dodging
            if (this.player.movement.isDodging) {
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, this.player.radius + 5, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            // Normal player rendering
            ctx.fillStyle = this.player.color;
            ctx.fill();
        }
    }

    // Create upgrade stack effect
    createUpgradeStackEffect() {
        if (!window.gameManager?.particles || window.gameManager.lowQuality) return;

        // Use simplified budget calculation
        const count = window.MathUtils ?
            window.MathUtils.budget(16, window.gameManager.particleReductionFactor, window.gameManager.maxParticles, window.gameManager.particles.length) :
            Math.floor(16 * Math.min(window.gameManager.particleReductionFactor || 1, 1));

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
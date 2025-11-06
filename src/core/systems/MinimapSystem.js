class MinimapSystem {
    constructor(game, options = {}) {
        this.game = game;
        this.width = options.width ?? 150;
        this.height = options.height ?? 150;
        this.scale = options.scale ?? 0.12;
        this.updateInterval = options.updateInterval ?? 100; // ms
        this.containerId = options.containerId ?? 'minimap-container';
        this.canvasId = options.canvasId ?? 'minimap';
        this.ctx = null;
        this.enabled = true;
        this.lastUpdate = 0;
    }

    setGame(game) {
        this.game = game;
    }

    initialize() {
        try {
            const container = document.getElementById(this.containerId);
            const canvas = document.getElementById(this.canvasId);
            if (!container || !canvas) {
                return false;
            }

            canvas.width = this.width;
            canvas.height = this.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return false;
            }

            ctx.imageSmoothingEnabled = false;
            if (typeof ctx.msImageSmoothingEnabled !== 'undefined') {
                ctx.msImageSmoothingEnabled = false;
            }
            if (typeof ctx.webkitImageSmoothingEnabled !== 'undefined') {
                ctx.webkitImageSmoothingEnabled = false;
            }

            this.ctx = ctx;
            return true;
        } catch (error) {
            window.LoggerUtils.warn('Minimap initialization failed:', error);
            return false;
        }
    }

    reset() {
        this.lastUpdate = 0;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (!this.enabled) {
            this.reset();
        }
    }

    setUpdateInterval(intervalMs) {
        const parsed = Number(intervalMs);
        if (!Number.isFinite(parsed)) {
            return;
        }
        const clamped = Math.max(30, Math.round(parsed));
        this.updateInterval = clamped;
    }

    update(force = false) {
        if (!this.enabled) return;
        if (!this.ctx || !this.game || !this.game.player) return;

        const now = performance.now();
        if (!force && now - this.lastUpdate < this.updateInterval) {
            return;
        }
        this.lastUpdate = now;

        const ctx = this.ctx;
        const { width, height, scale } = this;
        const centerX = width / 2;
        const centerY = height / 2;
        const player = this.game.player;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);

        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        let closestBoss = null;
        let closestBossDist = Infinity;

        const enemies = this.game.getEnemies?.() ?? [];
        if (Array.isArray(enemies) && enemies.length > 0) {
            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;

                const dxWorld = enemy.x - player.x;
                const dyWorld = enemy.y - player.y;
                const x = Math.round(centerX + dxWorld * scale);
                const y = Math.round(centerY + dyWorld * scale);

                if (enemy.isBoss) {
                    const distSq = dxWorld * dxWorld + dyWorld * dyWorld;
                    if (distSq < closestBossDist) {
                        closestBossDist = distSq;
                        closestBoss = { x, y, dxWorld, dyWorld };
                    }
                }

                if (x < 0 || x > width || y < 0 || y > height) continue;

                ctx.fillStyle = enemy.isBoss ? '#f1c40f' : (enemy.isElite ? '#e67e22' : '#e74c3c');
                if (enemy.isBoss) {
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            }
        }

        if (closestBoss) {
            this._drawBossIndicator(ctx, closestBoss, width, height, centerX, centerY);
        }

        const xpOrbs = this.game.getXPOrbs?.() ?? [];
        if (Array.isArray(xpOrbs) && xpOrbs.length > 0) {
            ctx.fillStyle = '#2ecc71';
            for (const orb of xpOrbs) {
                if (!orb || orb.isDead) continue;
                const dx = (orb.x - player.x) * scale;
                const dy = (orb.y - player.y) * scale;
                const x = Math.round(centerX + dx);
                const y = Math.round(centerY + dy);
                if (x < 0 || x > width || y < 0 || y > height) continue;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    destroy() {
        this.ctx = null;
    }

    _drawBossIndicator(ctx, bossData, width, height, centerX, centerY) {
        const { x, y, dxWorld, dyWorld } = bossData;
        const inBounds = x >= 0 && x <= width && y >= 0 && y <= height;
        const angle = Math.atan2(dyWorld, dxWorld);
        ctx.save();
        ctx.fillStyle = '#f1c40f';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        if (inBounds) {
            ctx.beginPath();
            ctx.arc(Math.max(0, Math.min(width, x)), Math.max(0, Math.min(height, y)), 6, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            const margin = 8;
            const vx = Math.cos(angle);
            const vy = Math.sin(angle);
            const tx = vx !== 0 ? ((vx > 0 ? (width/2 - margin) : (-width/2 + margin)) / vx) : Infinity;
            const ty = vy !== 0 ? ((vy > 0 ? (height/2 - margin) : (-height/2 + margin)) / vy) : Infinity;
            const t = Math.min(Math.abs(tx), Math.abs(ty));
            const ax = centerX + vx * t;
            const ay = centerY + vy * t;
            ctx.translate(ax, ay);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-8, 4);
            ctx.lineTo(-8, -4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const meters = Math.round((dxWorld * dxWorld + dyWorld * dyWorld) ** 0.5 / 10);
            ctx.rotate(-angle);
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(`${meters}m`, 0, -8);
            ctx.fillText(`${meters}m`, 0, -8);
        }
        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    const namespace = window.Game || (window.Game = {});
    if (typeof namespace.register === 'function') {
        namespace.register('MinimapSystem', MinimapSystem);
    } else {
        namespace.MinimapSystem = MinimapSystem;
    }
}

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

        this._maxEnemyMarkers = options.maxEnemyMarkers ?? 256;
        this._enemyMarkerPositions = new Float32Array(this._maxEnemyMarkers * 2);
        this._enemyMarkerTypes = new Uint8Array(this._maxEnemyMarkers);
        this._enemyMarkerCount = 0;

        this._maxXpMarkers = options.maxXpMarkers ?? 256;
        this._xpMarkerPositions = new Float32Array(this._maxXpMarkers * 2);
        this._xpMarkerCount = 0;

        this._bossIndicatorCache = { x: 0, y: 0, dxWorld: 0, dyWorld: 0, distSq: Infinity, inBounds: false };
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
            window.logger.warn('Minimap initialization failed:', error);
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

        this._enemyMarkerCount = 0;
        this._xpMarkerCount = 0;
        const bossCache = this._bossIndicatorCache;
        bossCache.distSq = Infinity;
        bossCache.inBounds = false;

        const enemies = this.game.getEnemies?.() ?? [];
        if (Array.isArray(enemies) && enemies.length > 0) {
            const enemyPositions = this._enemyMarkerPositions;
            const enemyTypes = this._enemyMarkerTypes;
            const maxMarkers = this._maxEnemyMarkers;
            let markerCount = 0;
            for (const enemy of enemies) {
                if (!enemy || enemy.isDead) continue;
                const dxWorld = enemy.x - player.x;
                const dyWorld = enemy.y - player.y;
                const x = Math.round(centerX + dxWorld * scale);
                const y = Math.round(centerY + dyWorld * scale);
                const inBounds = x >= 0 && x <= width && y >= 0 && y <= height;
                if (enemy.isBoss) {
                    const distSq = dxWorld * dxWorld + dyWorld * dyWorld;
                    if (distSq < bossCache.distSq) {
                        bossCache.distSq = distSq;
                        bossCache.dxWorld = dxWorld;
                        bossCache.dyWorld = dyWorld;
                        bossCache.x = x;
                        bossCache.y = y;
                        bossCache.inBounds = inBounds;
                    }
                }
                if (!inBounds || markerCount >= maxMarkers) {
                    continue;
                }
                const baseIndex = markerCount * 2;
                enemyPositions[baseIndex] = x;
                enemyPositions[baseIndex + 1] = y;
                enemyTypes[markerCount] = enemy.isBoss ? 2 : (enemy.isElite ? 1 : 0);
                markerCount++;
            }
            this._enemyMarkerCount = markerCount;
        }

        const xpOrbs = this.game.getXPOrbs?.() ?? [];
        if (Array.isArray(xpOrbs) && xpOrbs.length > 0) {
            const xpPositions = this._xpMarkerPositions;
            const maxXp = this._maxXpMarkers;
            let xpCount = 0;
            for (const orb of xpOrbs) {
                if (!orb || orb.isDead) continue;
                if (xpCount >= maxXp) break;
                const dx = (orb.x - player.x) * scale;
                const dy = (orb.y - player.y) * scale;
                const x = Math.round(centerX + dx);
                const y = Math.round(centerY + dy);
                if (x < 0 || x > width || y < 0 || y > height) continue;
                const baseIndex = xpCount * 2;
                xpPositions[baseIndex] = x;
                xpPositions[baseIndex + 1] = y;
                xpCount++;
            }
            this._xpMarkerCount = xpCount;
        }

        this._drawEnemyMarkers(ctx);
        this._drawXpMarkers(ctx);

        if (bossCache.distSq !== Infinity) {
            this._drawBossIndicator(ctx, bossCache, width, height, centerX, centerY);
        }
    }

    destroy() {
        this.ctx = null;
    }

    _drawEnemyMarkers(ctx) {
        const count = this._enemyMarkerCount;
        if (!count) return;
        const positions = this._enemyMarkerPositions;
        const types = this._enemyMarkerTypes;

        ctx.fillStyle = '#e74c3c';
        for (let i = 0; i < count; i++) {
            if (types[i] !== 0) continue;
            const base = i * 2;
            const x = positions[base];
            const y = positions[base + 1];
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }

        ctx.fillStyle = '#e67e22';
        for (let i = 0; i < count; i++) {
            if (types[i] !== 1) continue;
            const base = i * 2;
            const x = positions[base];
            const y = positions[base + 1];
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }

        let bossPathStarted = false;
        ctx.fillStyle = '#f1c40f';
        for (let i = 0; i < count; i++) {
            if (types[i] !== 2) continue;
            const base = i * 2;
            const x = positions[base];
            const y = positions[base + 1];
            if (!bossPathStarted) {
                ctx.beginPath();
                bossPathStarted = true;
            }
            ctx.moveTo(x + 3, y);
            ctx.arc(x, y, 3, 0, Math.PI * 2);
        }
        if (bossPathStarted) {
            ctx.fill();
        }
    }

    _drawXpMarkers(ctx) {
        const count = this._xpMarkerCount;
        if (!count) return;
        const positions = this._xpMarkerPositions;
        ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < count; i++) {
            const base = i * 2;
            const x = positions[base];
            const y = positions[base + 1];
            ctx.fillRect(x, y, 1, 1);
        }
    }

    _drawBossIndicator(ctx, bossData, width, height, centerX, centerY) {
        const { x, y, dxWorld, dyWorld } = bossData;
        const inBounds = bossData.inBounds;
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

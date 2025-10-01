// FloatingTextSystem: pooled floating/combat text renderer
(function () {
    class FloatingTextSystem {
        constructor(options = {}) {
            this._textPool = [];
            this._activeTexts = [];
            this._textMax = options.maxActive || 80;
            this._textPoolSize = options.poolSize || 120;
            for (let i = 0; i < this._textPoolSize; i++) this._textPool.push({ active: false });
        }

        spawn(entry) {
            const t = this._textPool.pop() || { active: false };
            // Default lifetime and velocity; allow overrides via entry
            Object.assign(t, { active: true, age: 0, lifetime: 0.9, vy: -30 }, entry);
            this._activeTexts.push(t);
            if (this._activeTexts.length > this._textMax) {
                const old = this._activeTexts.shift();
                if (old) { old.active = false; this._textPool.push(old); }
            }
        }

        update(dt) {
            if (!this._activeTexts || this._activeTexts.length === 0) return;
            for (let i = this._activeTexts.length - 1; i >= 0; i--) {
                const t = this._activeTexts[i];
                t.age += dt;
                if (t.age >= t.lifetime) {
                    this._activeTexts.splice(i, 1);
                    t.active = false; this._textPool.push(t);
                    continue;
                }
                // simple upward drift
                t.y += (t.vy || -30) * dt;
            }
        }

        render(ctx) {
            if (!this._activeTexts || this._activeTexts.length === 0) return;
            ctx.save();
            ctx.textAlign = 'center';
            for (const t of this._activeTexts) {
                const a = 1 - (t.age / t.lifetime);
                ctx.globalAlpha = Math.max(0, a);
                ctx.fillStyle = t.color || 'white';
                ctx.font = `${t.size || 16}px Arial`;
                ctx.fillText(t.text, t.x, t.y);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    // Attach to window namespace
    window.Game = window.Game || {};
    window.Game.FloatingTextSystem = FloatingTextSystem;
})();

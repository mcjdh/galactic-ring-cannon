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
            let writeIndex = 0;
            const list = this._activeTexts;
            for (let i = 0; i < list.length; i++) {
                const t = list[i];
                if (!t) continue;
                t.age += dt;
                if (t.age >= t.lifetime) {
                    t.active = false;
                    this._textPool.push(t);
                    continue;
                }
                t.y += (t.vy || -30) * dt;
                if (writeIndex !== i) {
                    list[writeIndex] = t;
                }
                writeIndex++;
            }
            if (writeIndex < list.length) {
                list.length = writeIndex;
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

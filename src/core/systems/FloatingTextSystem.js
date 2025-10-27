// FloatingTextSystem: pooled floating/combat text renderer
(function () {
    // Cache common font strings (performance optimization)
    const FONT_CACHE = {
        12: '12px Arial',
        14: '14px Arial',
        16: '16px Arial',
        18: '18px Arial',
        20: '20px Arial',
        24: '24px Arial',
        28: '28px Arial',
        32: '32px Arial'
    };

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
                // Use cached font string if available, otherwise create it
                const size = t.size || 16;
                ctx.font = FONT_CACHE[size] || `${size}px Arial`;
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

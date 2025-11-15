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
            this.maxActive = options.maxActive || 96;
            this._activeList = [];
            this._freeStack = [];
            for (let i = 0; i < this.maxActive; i++) {
                this._freeStack.push(this.maxActive - 1 - i);
            }

            this._x = new Float32Array(this.maxActive);
            this._y = new Float32Array(this.maxActive);
            this._vy = new Float32Array(this.maxActive);
            this._age = new Float32Array(this.maxActive);
            this._lifetime = new Float32Array(this.maxActive);
            this._size = new Float32Array(this.maxActive);
            this._texts = new Array(this.maxActive);
            this._colors = new Array(this.maxActive);
        }

        _reclaimOldest() {
            if (!this._activeList.length) return null;
            const idx = this._activeList.shift();
            if (idx === undefined) return null;
            this._freeStack.push(idx);
            return idx;
        }

        spawn(entry = {}) {
            let idx = this._freeStack.pop();
            if (typeof idx !== 'number') {
                idx = this._reclaimOldest();
                if (typeof idx !== 'number') {
                    return;
                }
            }

            this._texts[idx] = String(entry.text ?? '');
            this._colors[idx] = entry.color || 'white';
            this._x[idx] = entry.x ?? 0;
            this._y[idx] = entry.y ?? 0;
            this._vy[idx] = entry.vy ?? -30;
            this._age[idx] = 0;
            this._lifetime[idx] = entry.lifetime ?? 0.9;
            this._size[idx] = entry.size ?? 16;

            this._activeList.push(idx);
        }

        update(dt) {
            if (!this._activeList.length) return;
            const list = this._activeList;
            const xArr = this._x;
            const yArr = this._y;
            const vyArr = this._vy;
            const ageArr = this._age;
            const lifeArr = this._lifetime;
            let write = 0;
            for (let i = 0; i < list.length; i++) {
                const idx = list[i];
                ageArr[idx] += dt;
                if (ageArr[idx] >= lifeArr[idx]) {
                    this._freeStack.push(idx);
                    continue;
                }
                yArr[idx] += vyArr[idx] * dt;
                list[write++] = idx;
            }
            if (write < list.length) {
                list.length = write;
            }
        }

        render(ctx) {
            const activeCount = this._activeList.length;
            if (!activeCount) return;
            ctx.save();
            ctx.textAlign = 'center';
            const xArr = this._x;
            const yArr = this._y;
            const ageArr = this._age;
            const lifeArr = this._lifetime;
            const sizeArr = this._size;
            const texts = this._texts;
            const colors = this._colors;

            for (let i = 0; i < activeCount; i++) {
                const idx = this._activeList[i];
                const life = lifeArr[idx] || 0.0001;
                const alpha = 1 - (ageArr[idx] / life);
                ctx.globalAlpha = alpha > 0 ? alpha : 0;
                ctx.fillStyle = colors[idx] || 'white';
                const size = sizeArr[idx] || 16;
                ctx.font = FONT_CACHE[size] || `${size}px Arial`;
                ctx.fillText(texts[idx], xArr[idx], yArr[idx]);
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        clear() {
            if (!this._activeList.length) return;
            for (let i = 0; i < this._activeList.length; i++) {
                this._freeStack.push(this._activeList[i]);
            }
            this._activeList.length = 0;
        }
    }

    // Attach to window namespace
    window.Game = window.Game || {};
    window.Game.FloatingTextSystem = FloatingTextSystem;
})();

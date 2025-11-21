/**
 * 🌊 UNIFIED UI MANAGER - Next-Generation Architecture
 * [A] RESONANT NOTE: Designed to handle multiple unit types, projectiles, and complex scenarios
 * 
 * Features:
 * - Proper world-space vs screen-space coordinate handling
 * - Optimized rendering for 100+ entities
 * - Unified health bars, floating text, and damage indicators
 * - Clean separation of concerns and proper z-depth management
 */

class UnifiedUIManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.canvas = gameEngine.canvas;
        this.ctx = gameEngine.ctx;
        
        // UI Layer Management
        this.layers = {
            WORLD_BACKGROUND: 0,    // Behind entities (target indicators, etc.)
            WORLD_ENTITIES: 1,      // Health bars, status effects on entities
            WORLD_EFFECTS: 2,       // Floating text, damage numbers
            SCREEN_OVERLAY: 3       // Fixed UI elements (HUD, menus)
        };
        
        // Visual settings (must be defined BEFORE using in pools)
        this.settings = {
            healthBarWidth: 40,
            healthBarHeight: 6,
            healthBarOffset: 20,
            floatingTextSpeed: 60,
            floatingTextLifetime: 2.0,
            enableHealthBars: true,
            enableFloatingText: true,
            enableUIOptimization: true,
            // Do not render player's world-space health bar; HUD handles player health
            showPlayerWorldHealthBar: false
        };

        // Floating Text System (World Space) - typed array storage
        this.maxFloatingTexts = 200;
        this._freeTextIndices = [];
        for (let i = this.maxFloatingTexts - 1; i >= 0; i--) {
            this._freeTextIndices.push(i);
        }
        this._activeTextIndices = [];
        this._textX = new Float32Array(this.maxFloatingTexts);
        this._textY = new Float32Array(this.maxFloatingTexts);
        this._textVX = new Float32Array(this.maxFloatingTexts);
        this._textVY = new Float32Array(this.maxFloatingTexts);
        this._textAge = new Float32Array(this.maxFloatingTexts);
        this._textLifetime = new Float32Array(this.maxFloatingTexts);
        this._textOpacity = new Float32Array(this.maxFloatingTexts);
        this._textSize = new Float32Array(this.maxFloatingTexts);
        this._textStrings = new Array(this.maxFloatingTexts);
        this._textColors = new Array(this.maxFloatingTexts);
        this._fontCache = new Map();
        this._glyphCache = new Map();
        this._glyphCacheLimit = 300;
        this._glyphMeasureCanvas = (typeof OffscreenCanvas !== 'undefined')
            ? new OffscreenCanvas(1, 1)
            : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
        this._glyphMeasureCtx = this._glyphMeasureCanvas ? this._glyphMeasureCanvas.getContext('2d') : null;
        
        // Health Bar System
        this.healthBarCache = new Map(); // Cache for entity health bar data
        this.healthBarCullDistance = 1000; // Don't render health bars too far away
        
        // Performance optimization
        this.lastCameraX = 0;
        this.lastCameraY = 0;
        this.viewportBounds = { left: 0, right: 0, top: 0, bottom: 0 };
        this.updateViewportBounds();
        
        // Visual settings were moved earlier in constructor to ensure availability
    }
    
    initializeTextPool() {}
    
    /**
     * Update all UI systems
     */
    update(deltaTime) {
        this.updateViewportBounds();
        this.updateFloatingTexts(deltaTime);
        this.cullInvisibleElements();
    }
    
    /**
     * Update viewport bounds for culling
     */
    updateViewportBounds() {
        const player = this.gameEngine.player;
        if (!player) return;
        
        const margin = 200; // Extra margin for smooth transitions
        this.viewportBounds.left = player.x - this.canvas.width / 2 - margin;
        this.viewportBounds.right = player.x + this.canvas.width / 2 + margin;
        this.viewportBounds.top = player.y - this.canvas.height / 2 - margin;
        this.viewportBounds.bottom = player.y + this.canvas.height / 2 + margin;
    }
    
    /**
     * Update floating text animations
     */
    updateFloatingTexts(deltaTime) {
        if (!this.settings.enableFloatingText) return;
        const active = this._activeTextIndices;
        if (!active.length) return;

        const xArr = this._textX;
        const yArr = this._textY;
        const vxArr = this._textVX;
        const vyArr = this._textVY;
        const ageArr = this._textAge;
        const lifeArr = this._textLifetime;
        const opacityArr = this._textOpacity;

        let writeIndex = 0;
        for (let i = 0; i < active.length; i++) {
            const idx = active[i];
            xArr[idx] += vxArr[idx] * deltaTime;
            yArr[idx] += vyArr[idx] * deltaTime;
            ageArr[idx] += deltaTime;
            const life = lifeArr[idx] || 0.0001;
            const ratio = ageArr[idx] / life;
            opacityArr[idx] = Math.max(0, 1 - (ratio * ratio));

            if (ageArr[idx] >= life) {
                this._freeTextIndices.push(idx);
                continue;
            }

            active[writeIndex++] = idx;
        }

        if (writeIndex < active.length) {
            active.length = writeIndex;
        }
    }
    
    /**
     * Cull UI elements outside viewport for performance
     */
    cullInvisibleElements() {
        if (!this.settings.enableUIOptimization) return;
        
        const active = this._activeTextIndices;
        if (!active.length) return;
        const bounds = this.viewportBounds;
        const xArr = this._textX;
        const yArr = this._textY;

        let writeIndex = 0;
        for (let i = 0; i < active.length; i++) {
            const idx = active[i];
            const x = xArr[idx];
            const y = yArr[idx];
            const withinBounds = x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
            if (!withinBounds) {
                this._freeTextIndices.push(idx);
                continue;
            }
            active[writeIndex++] = idx;
        }

        if (writeIndex < active.length) {
            active.length = writeIndex;
        }
    }
    
    /**
     * Render all UI elements in proper layer order
     */
    render() {
        if (!this.gameEngine.ctx) return;
        
        // Render world-space UI elements (affected by camera)
        this.renderWorldSpaceUI();
        
        // Render screen-space UI elements (fixed position)
        this.renderScreenSpaceUI();
    }
    
    /**
     * Render UI elements in world space (affected by camera transforms)
     */
    renderWorldSpaceUI() {
        // Health bars (on entities)
        if (this.settings.enableHealthBars) {
            this.renderHealthBars();
        }
        
        // Floating text and damage numbers
        if (this.settings.enableFloatingText) {
            this.renderFloatingTexts();
        }
    }
    
    /**
     * Render health bars for all visible entities
     */
    renderHealthBars() {
        const ctx = this.ctx;
        ctx.save();
        
        // Render enemy health bars
        if (this.gameEngine.enemies) {
            for (const enemy of this.gameEngine.enemies) {
                if (enemy.isDead) continue;
                if (!enemy.maxHealth || enemy.health >= enemy.maxHealth) continue;
                if (!this.isEntityVisible(enemy)) continue;
                this.renderEntityHealthBar(enemy);
            }
        }
        
        // Player health bar is rendered by HUD; only draw here if explicitly enabled
        if (this.settings.showPlayerWorldHealthBar && this.gameEngine.player && this.gameEngine.player.health < this.gameEngine.player.maxHealth) {
            this.renderEntityHealthBar(this.gameEngine.player);
        }
        
        ctx.restore();
    }
    
    /**
     * Render health bar for a specific entity
     */
    renderEntityHealthBar(entity) {
        if (!entity || entity.health <= 0) return;
        
        const ctx = this.ctx;
        const barWidth = this.settings.healthBarWidth;
        const barHeight = this.settings.healthBarHeight;
        const yOffset = entity.radius + this.settings.healthBarOffset;
        
        const barX = entity.x - barWidth / 2;
        const barY = entity.y - yOffset;
        
        // Health percentage with safety bounds
        const healthPercent = Math.max(0, Math.min(1, entity.health / (entity.maxHealth || 1)));
        
        // Background (black border)
        ctx.fillStyle = '#000000';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        
        // Background (dark gray)
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health bar color based on percentage
        let healthColor = '#2ecc71'; // Green
        if (healthPercent < 0.6) healthColor = '#f39c12'; // Orange
        if (healthPercent < 0.3) healthColor = '#e74c3c'; // Red
        
        // Health fill
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Boss health bars get special treatment
        if (entity.isBoss) {
            // Add crown or special indicator
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
            ctx.fillStyle = '#000000';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = healthColor;
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
    }
    
    /**
     * Render floating texts and damage numbers
     */
    renderFloatingTexts() {
        const active = this._activeTextIndices;
        if (!active.length) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const xArr = this._textX;
        const yArr = this._textY;
        const opacityArr = this._textOpacity;
        const textArr = this._textStrings;
        const colorArr = this._textColors;
        const sizeArr = this._textSize;
        
        for (let i = 0; i < active.length; i++) {
            const idx = active[i];
            const x = xArr[idx];
            const y = yArr[idx];
            if (!this.isPositionVisible(x, y)) continue;
            ctx.globalAlpha = opacityArr[idx];
            const size = sizeArr[idx] || 16;
            const color = colorArr[idx] || '#ffffff';
            const glyph = this._getGlyphImage(textArr[idx], size, color);
            if (glyph && glyph.image) {
                ctx.drawImage(glyph.image, x - glyph.width / 2, y - glyph.height / 2);
            } else {
                ctx.fillStyle = color;
                ctx.font = this._getFont(size);
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(textArr[idx], x, y);
                ctx.shadowColor = 'transparent';
            }
        }

        ctx.restore();
    }

    _getFont(size) {
        const cached = this._fontCache.get(size);
        if (cached) {
            return cached;
        }
        const font = `bold ${size}px Arial`;
        this._fontCache.set(size, font);
        return font;
    }

    _getGlyphImage(text, size, color) {
        if (!this._glyphMeasureCtx) {
            return null;
        }

        const key = `${text}|${size}|${color}`;
        if (this._glyphCache.has(key)) {
            return this._glyphCache.get(key);
        }

        const measureCtx = this._glyphMeasureCtx;
        measureCtx.font = this._getFont(size);
        const metrics = measureCtx.measureText(text);
        const width = Math.max(1, Math.ceil((metrics.width + size * 0.4) + 4));
        const height = Math.max(1, Math.ceil(size * 1.6));

        let canvas;
        if (typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(width, height);
        } else if (typeof document !== 'undefined') {
            canvas = document.createElement('canvas');
        } else {
            return null;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }

        ctx.font = this._getFont(size);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(text, width / 2, height / 2);

        const glyph = { image: canvas, width, height };
        this._glyphCache.set(key, glyph);
        if (this._glyphCache.size > this._glyphCacheLimit) {
            const firstKey = this._glyphCache.keys().next().value;
            this._glyphCache.delete(firstKey);
        }
        return glyph;
    }
    
    /**
     * Render screen-space UI (HUD elements, fixed position)
     */
    renderScreenSpaceUI() {
        const ctx = this.ctx;
        ctx.save();
        
        // Reset transform to screen space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Render HUD elements here if needed
        // (Usually handled by UIManager, but could be unified here)
        
        ctx.restore();
    }
    
    /**
     * Add floating text/damage number
     */
    addFloatingText(text, x, y, options = {}) {
        if (!this.settings.enableFloatingText) return;
        if (!this._freeTextIndices.length && !this._activeTextIndices.length) return;

        let idx = this._freeTextIndices.pop();
        if (typeof idx !== 'number') {
            idx = this._activeTextIndices.shift();
            if (typeof idx !== 'number') {
                return;
            }
        }

        this._textStrings[idx] = text;
        this._textColors[idx] = options.color || '#ffffff';
        this._textX[idx] = x + (Math.random() - 0.5) * 10;
        this._textY[idx] = y;
        this._textVX[idx] = (Math.random() - 0.5) * 20;
        this._textVY[idx] = options.vy || -this.settings.floatingTextSpeed;
        this._textSize[idx] = options.size || 16;
        this._textAge[idx] = 0;
        this._textLifetime[idx] = options.lifetime || this.settings.floatingTextLifetime;
        this._textOpacity[idx] = 1;

        this._activeTextIndices.push(idx);
    }
    
    /**
     * Add damage number with appropriate styling
     */
    addDamageNumber(damage, x, y, isCritical = false) {
        const color = isCritical ? '#f1c40f' : '#e74c3c';
        const size = isCritical ? 20 : 16;
        const text = isCritical ? `${Math.round(damage)}!` : Math.round(damage).toString();
        
        this.addFloatingText(text, x, y, { 
            color, 
            size, 
            vy: isCritical ? -80 : -60,
            lifetime: isCritical ? 2.5 : 2.0
        });
    }
    
    /**
     * Add healing number
     */
    addHealingNumber(healing, x, y) {
        if (!Number.isFinite(healing) || healing <= 0) return;
        const amount = Math.round(healing);
        if (amount <= 0) return;
        this.addFloatingText(`+${amount}`, x, y, {
            color: '#2ecc71',
            size: 18,
            vy: -50,
            lifetime: 2.0
        });
    }
    
    /**
     * Add XP gain notification
     */
    addXPGain(xp, x, y) {
        this.addFloatingText(`+${Math.round(xp)} XP`, x, y, {
            color: '#9b59b6',
            size: 14,
            vy: -40,
            lifetime: 1.5
        });
    }
    
    /**
     * Add combo notification
     */
    addComboText(combo, x, y) {
        const comboSymbol = window.GAME_CONSTANTS?.VISUAL_SYMBOLS?.COMBO || 'x';
        this.addFloatingText(`${comboSymbol}${combo}`, x, y, {
            color: '#3498db',
            size: 24,
            vy: -70,
            lifetime: 3.0
        });
    }
    
    /**
     * Utility: Check if entity is visible in viewport
     */
    isEntityVisible(entity) {
        if (!entity) return false;
        const margin = 50; // Small margin for health bars
        return entity.x >= this.viewportBounds.left - margin &&
               entity.x <= this.viewportBounds.right + margin &&
               entity.y >= this.viewportBounds.top - margin &&
               entity.y <= this.viewportBounds.bottom + margin;
    }
    
    /**
     * Utility: Check if position is visible in viewport
     */
    isPositionVisible(x, y) {
        return x >= this.viewportBounds.left &&
               x <= this.viewportBounds.right &&
               y >= this.viewportBounds.top &&
               y <= this.viewportBounds.bottom;
    }
    
    /**
     * Configure UI settings
     */
    configure(settings) {
        Object.assign(this.settings, settings);
    }
    
    /**
     * Clear all floating text (useful for game reset)
     */
    clearAllFloatingText() {
        while (this._activeTextIndices.length) {
            this._freeTextIndices.push(this._activeTextIndices.pop());
        }
    }
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            activeFloatingTexts: this._activeTextIndices.length,
            freeFloatingSlots: this._freeTextIndices.length,
            viewportBounds: this.viewportBounds,
            settings: this.settings
        };
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.UnifiedUIManager = UnifiedUIManager;
}

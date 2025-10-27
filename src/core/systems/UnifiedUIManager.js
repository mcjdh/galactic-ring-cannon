/**
 * 🌊 UNIFIED UI MANAGER - Next-Generation Architecture
 * 🤖 RESONANT NOTE: Designed to handle multiple unit types, projectiles, and complex scenarios
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

        // Floating Text System (World Space)
        this.floatingTexts = [];
        this.textPool = [];
        this.maxFloatingTexts = 150;
        this.textPoolSize = 200;
        this.initializeTextPool();
        
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
    
    initializeTextPool() {
        for (let i = 0; i < this.textPoolSize; i++) {
            this.textPool.push({
                active: false,
                text: '',
                x: 0, y: 0,
                vx: 0, vy: -this.settings.floatingTextSpeed,
                color: '#ffffff',
                size: 16,
                age: 0,
                lifetime: this.settings.floatingTextLifetime,
                opacity: 1.0,
                layer: this.layers.WORLD_EFFECTS
            });
        }
    }
    
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
        const texts = this.floatingTexts;
        let writeIndex = 0;

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            
            // Update position and age
            text.x += text.vx * deltaTime;
            text.y += text.vy * deltaTime;
            text.age += deltaTime;
            
            // Update opacity based on age
            const ageRatio = text.age / text.lifetime;
            text.opacity = Math.max(0, 1 - (ageRatio * ageRatio)); // Quadratic fade
            
            // Remove expired texts
            if (text.age >= text.lifetime) {
                text.active = false;
                if (this.textPool.length < this.textPoolSize) {
                    this.textPool.push(text);
                }
                continue;
            }

            if (writeIndex !== i) {
                texts[writeIndex] = text;
            }
            writeIndex++;
        }

        if (writeIndex < texts.length) {
            texts.length = writeIndex;
        }
    }
    
    /**
     * Cull UI elements outside viewport for performance
     */
    cullInvisibleElements() {
        if (!this.settings.enableUIOptimization) return;
        
        // Cull floating texts outside viewport
        const texts = this.floatingTexts;
        const bounds = this.viewportBounds;
        let writeIndex = 0;

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const withinBounds =
                text.x >= bounds.left &&
                text.x <= bounds.right &&
                text.y >= bounds.top &&
                text.y <= bounds.bottom;

            if (!withinBounds) {
                text.active = false;
                if (this.textPool.length < this.textPoolSize) {
                    this.textPool.push(text);
                }
                continue;
            }

            if (writeIndex !== i) {
                texts[writeIndex] = text;
            }
            writeIndex++;
        }

        if (writeIndex < texts.length) {
            texts.length = writeIndex;
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
                if (enemy.isDead || !this.isEntityVisible(enemy)) continue;
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
        if (this.floatingTexts.length === 0) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (const text of this.floatingTexts) {
            if (!this.isPositionVisible(text.x, text.y)) continue;
            
            ctx.globalAlpha = text.opacity;
            ctx.fillStyle = text.color;
            ctx.font = `bold ${text.size}px Arial`;
            
            // Outline for better visibility
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.max(1, text.size / 8);
            ctx.strokeText(text.text, text.x, text.y);
            ctx.fillText(text.text, text.x, text.y);
        }
        
        ctx.restore();
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
        if (this.floatingTexts.length >= this.maxFloatingTexts) return;
        
        let textObj = this.textPool.pop();
        if (!textObj) {
            textObj = {
                active: false,
                text: '', x: 0, y: 0, vx: 0, vy: 0,
                color: '#ffffff', size: 16, age: 0,
                lifetime: this.settings.floatingTextLifetime, opacity: 1.0
            };
        }
        
        // Configure text object
        textObj.active = true;
        textObj.text = text;
        textObj.x = x + (Math.random() - 0.5) * 10; // Small random offset
        textObj.y = y;
        textObj.vx = (Math.random() - 0.5) * 20; // Slight horizontal drift
        textObj.vy = options.vy || -this.settings.floatingTextSpeed;
        textObj.color = options.color || '#ffffff';
        textObj.size = options.size || 16;
        textObj.age = 0;
        textObj.lifetime = options.lifetime || this.settings.floatingTextLifetime;
        textObj.opacity = 1.0;
        
        this.floatingTexts.push(textObj);
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
        this.addFloatingText(`+${Math.round(healing)}`, x, y, {
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
        this.addFloatingText(`${combo}x COMBO!`, x, y, {
            color: '#3498db',
            size: 22,
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
        for (const text of this.floatingTexts) {
            text.active = false;
            this.textPool.push(text);
        }
        this.floatingTexts = [];
    }
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            activeFloatingTexts: this.floatingTexts.length,
            textPoolSize: this.textPool.length,
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

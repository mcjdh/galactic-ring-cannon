/**
 * XP Orb - Experience orbs dropped by enemies
 * Extracted from enemy.js for better organization
 */
class XPOrb {
    constructor(x, y, value = 5) {
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;
        
        // Base XP value with meta progression bonuses and early-game boost
        this.value = this.applyEarlyGameBoost(this.calculateValue(value));
        this.baseValue = value;
        
        this.type = 'xpOrb';
        this.isDead = false;
        this.collected = false;
        
        // Size based on value
        this.radius = this.calculateRadius(this.value);
        
        // Visual properties
        this.color = this.calculateColor(this.value);
        this.glowColor = this.calculateGlowColor(this.value);
        
        // Add random scatter when dropped
        this.x += (Math.random() - 0.5) * 40;
        this.y += (Math.random() - 0.5) * 40;
        
        // Animation properties
        this.bobAmplitude = 3;
        this.bobSpeed = 3;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotation = 0;
        this.scale = 1;
        this.pulseSpeed = 2;
        
        // Physics properties
        this.isBeingMagnetized = false;
        this.magnetSpeed = 300;
    }
    
    /**
     * Calculate final XP value with meta progression bonuses
     * @param {number} baseValue - Base XP value
     * @returns {number} Final XP value
     */
    calculateValue(baseValue) {
        let finalValue = baseValue;
        
        // Apply Jupiter XP gain bonus
        const xpBonusTier = parseInt(localStorage.getItem('meta_jupiter_xp_gain') || '0', 10);
        if (xpBonusTier > 0) {
            finalValue = Math.floor(finalValue * (1 + xpBonusTier * 0.05));
        }
        
        return finalValue;
    }

    applyEarlyGameBoost(baseValue) {
        try {
            const gm = window.gameManager;
            if (!gm || typeof window.GameMath?.earlyXPBoostMultiplier !== 'function') return baseValue;
            const mult = window.GameMath.earlyXPBoostMultiplier(gm.gameTime || 0);
            return Math.max(1, Math.floor(baseValue * mult));
        } catch (_) {
            return baseValue;
        }
    }
    
    /**
     * Calculate orb radius based on value
     * @param {number} value - XP value
     * @returns {number} Radius
     */
    calculateRadius(value) {
        if (value > 50) return 12;
        if (value > 20) return 8;
        return 5;
    }
    
    /**
     * Calculate orb color based on value
     * @param {number} value - XP value
     * @returns {string} Color
     */
    calculateColor(value) {
        if (value > 50) return '#f1c40f'; // Gold for high value
        if (value > 20) return '#3498db'; // Blue for medium value
        return '#2ecc71'; // Green for standard
    }
    
    /**
     * Calculate glow color based on value
     * @param {number} value - XP value
     * @returns {string} Glow color
     */
    calculateGlowColor(value) {
        if (value > 50) return 'rgba(241, 196, 15, 0.4)'; // Gold glow
        if (value > 20) return 'rgba(52, 152, 219, 0.4)'; // Blue glow
        return 'rgba(46, 204, 113, 0.3)'; // Green glow
    }
    
    /**
     * Update orb position and animations
     * @param {number} deltaTime - Time since last update
     * @param {Game} game - Game instance
     */
    update(deltaTime, game) {
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Handle magnetism
        this.updateMagnetism(deltaTime, game);
    // Do NOT perform direct collection checks here.
    // Centralized collision handling (CollisionSystem/GameEngine) awards XP
    // and marks the orb dead to ensure single-source-of-truth logic.
    }
    
    /**
     * Update animations (bobbing, rotation, pulsing)
     * @param {number} deltaTime - Time since last update
     */
    updateAnimations(deltaTime) {
        this.bobOffset += this.bobSpeed * deltaTime;
        this.rotation += deltaTime * 2;
        
        // Pulsing scale effect
        this.scale = 1 + Math.sin(this.bobOffset * this.pulseSpeed) * 0.1;
    }
    
    /**
     * Handle magnetic attraction to player
     * @param {number} deltaTime - Time since last update
     * @param {Game} game - Game instance
     */
    updateMagnetism(deltaTime, game) {
        if (!game.player) return;
        
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if within magnet range
        const magnetRange = game.player.magnetRange || 100;
        
        if (distance < magnetRange && distance > 0) {
            this.isBeingMagnetized = true;
            
            // Calculate pull strength (stronger when closer)
            const pullFactor = 1 - (distance / magnetRange);
            const pullStrength = this.magnetSpeed * pullFactor;
            const speed = pullStrength * deltaTime;
            
            // Move towards player
            const vx = (dx / distance) * speed;
            const vy = (dy / distance) * speed;
            
            this.x += vx;
            this.y += vy;
        } else {
            this.isBeingMagnetized = false;
        }
    }
    
    /**
     * Check if orb should be collected by player
     * @param {Game} game - Game instance
     */
    checkCollection(game) {
        if (!game.player || this.collected) return;
        
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Collection range
        const collectionRange = this.radius + game.player.radius;
        
        if (distance < collectionRange) {
            this.collect(game);
        }
    }
    
    /**
     * Collect the XP orb
     * @param {Game} game - Game instance
     */
    collect(game) {
        // Fallback/manual collection method (not used in normal flow).
        // Central collision system should handle XP and visuals.
        if (this.collected) return;
        this.collected = true;
        this.isDead = true;
        // Award XP via Player API if called manually
        if (game?.player && typeof game.player.addXP === 'function' && typeof this.value === 'number') {
            game.player.addXP(this.value);
        }
        // Optional: small collection effect without duplicating UI text
        this.createCollectionEffect();
    }
    
    /**
     * Create visual effect when orb is collected
     */
    createCollectionEffect() {
        if (window.gameManager && window.gameManager.particleManager) {
            // Create sparkle effect
            window.gameManager.particleManager.createSparkleEffect(
                this.x, 
                this.y, 
                this.color, 
                8
            );
        }
    }
    
    /**
     * Render the XP orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (this.collected) return;
        
        ctx.save();
        
        const bobY = Math.sin(this.bobOffset) * this.bobAmplitude;
        const renderY = this.y + bobY;
        
        // Apply scaling
        ctx.translate(this.x, renderY);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-this.x, -renderY);
        
        // Draw glow effect
        if (!window.gameManager?.lowQuality) {
            this.renderGlow(ctx, renderY);
        }
        
        // Draw main orb
        this.renderOrb(ctx, renderY);
        
        // Draw XP symbol
        this.renderSymbol(ctx, renderY);
        
        // Draw magnet indicator if being magnetized
        if (this.isBeingMagnetized) {
            this.renderMagnetEffect(ctx, renderY);
        }
        
        ctx.restore();
    }
    
    /**
     * Render glow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderGlow(ctx, renderY) {
        const gradient = ctx.createRadialGradient(
            this.x, renderY, 0,
            this.x, renderY, this.radius * 2
        );
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, renderY, this.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    /**
     * Render main orb body
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderOrb(ctx, renderY) {
        ctx.beginPath();
        ctx.arc(this.x, renderY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Add highlight
        ctx.beginPath();
        ctx.arc(
            this.x - this.radius * 0.3, 
            renderY - this.radius * 0.3, 
            this.radius * 0.3, 
            0, 
            Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
    }
    
    /**
     * Render XP symbol inside orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderSymbol(ctx, renderY) {
        ctx.save();
        ctx.translate(this.x, renderY);
        ctx.rotate(this.rotation);
        
        const symbolSize = this.radius * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(-symbolSize, -symbolSize);
        ctx.lineTo(symbolSize, symbolSize);
        ctx.moveTo(-symbolSize, symbolSize);
        ctx.lineTo(symbolSize, -symbolSize);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = Math.max(1, this.radius * 0.1);
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Render magnetic attraction effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} renderY - Y position with bob effect
     */
    renderMagnetEffect(ctx, renderY) {
        ctx.beginPath();
        ctx.arc(this.x, renderY, this.radius * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    /**
     * Get orb data for debugging
     * @returns {Object} Orb state
     */
    getDebugInfo() {
        return {
            position: { x: this.x, y: this.y },
            value: this.value,
            baseValue: this.baseValue,
            radius: this.radius,
            isBeingMagnetized: this.isBeingMagnetized,
            collected: this.collected,
            isDead: this.isDead
        };
    }
    
    /**
     * Static method to create XP orb from enemy death
     * @param {Enemy} enemy - Enemy that was killed
     * @returns {XPOrb} New XP orb
     */
    static fromEnemy(enemy) {
        let baseValue = 5;
        
        // Scale XP based on enemy type
        if (enemy.isBoss) {
            baseValue = enemy.isMegaBoss ? 100 : 50;
        } else if (enemy.isElite) {
            baseValue = 15;
        } else {
            switch (enemy.enemyType) {
                case 'fast':
                    baseValue = 3;
                    break;
                case 'tank':
                    baseValue = 10;
                    break;
                case 'exploder':
                    baseValue = 8;
                    break;
                default:
                    baseValue = 5;
            }
        }
        
        return new XPOrb(enemy.x, enemy.y, baseValue);
    }
    
    /**
     * Static method to create bonus XP orb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} multiplier - XP multiplier
     * @returns {XPOrb} Bonus XP orb
     */
    static createBonus(x, y, multiplier = 2) {
        const bonusValue = 10 * multiplier;
        return new XPOrb(x, y, bonusValue);
    }
}

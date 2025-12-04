/**
 * FormationEffects - Visual and particle effects for enemy formations
 * 
 * Provides dramatic visual feedback for:
 * - Formation creation (snap-in effect)
 * - Formation maintenance (connecting beams)
 * - Formation breaking (shatter effect)
 * - Geometric constellation visualization
 */

class FormationEffects {
    constructor(game) {
        this.game = game;

        // Active effect instances
        this.constellationBeams = []; // Connecting beam effects
        this.snapEffects = []; // Formation snap-in particles
        this.shatterEffects = []; // Formation break particles

        // Performance settings
        this.enabled = true;
        this.qualityMode = 'high'; // 'high', 'medium', 'low'

        // Visual settings
        this.beamOpacity = 0.5; // Buffed from 0.4 for better visibility
        this.beamWidth = 2.5; // Buffed from 2.0 for thicker lines
        this.beamColor = { r: 0, g: 255, b: 153 }; // Neon cyan
        this.glowIntensity = 1.0; // Buffed from 0.8 for brighter effects
        this.maxBeamLengthSq = 200 * 200; // Prevent stretched links from lingering
        this.beamWarningLengthSq = this.maxBeamLengthSq * 0.75; // Start fading before hard break

        // Particle pool for performance
        this.maxParticles = 400; // Buffed from 300 for richer effects
        this.particlePool = [];
        this.nextFreeIndex = 0; // [OPTIMIZATION] Fast pool lookup
        this.initParticlePool();

        // [OPTIMIZATION] Sprite Cache
        this.spriteCache = new Map();
        this.initSpriteCache();
    }

    /**
     * Initialize particle object pool
     */
    initParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push({
                active: false,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: 0,
                maxLife: 1,
                size: 2,
                color: { r: 0, g: 255, b: 153 },
                alpha: 1,
                type: 'spark'
            });
        }
    }

    /**
     * [OPTIMIZATION] Initialize sprite cache for particles
     */
    initSpriteCache() {
        if (typeof document === 'undefined') return;

        // Pre-render common particle types
        const colors = [
            { r: 0, g: 255, b: 153 }, // Cyan
            { r: 255, g: 100, b: 100 }, // Red
            { r: 100, g: 200, b: 255 }, // Blue
            { r: 255, g: 153, b: 0 },   // Orange
            { r: 255, g: 0, b: 153 },   // Pink
            { r: 153, g: 0, b: 255 }    // Purple
        ];

        colors.forEach(color => {
            this.createCachedSprite('spark', color, 4); // Size 4 (radius 2 * 2)
            this.createCachedSprite('fragment', color, 3); // Size 3
        });
    }

    /**
     * Create and cache a single particle sprite
     */
    createCachedSprite(type, color, size) {
        const key = `${type}_${color.r}_${color.g}_${color.b}`;
        if (this.spriteCache.has(key)) return;

        const canvas = document.createElement('canvas');
        // Size needs to accommodate glow
        const padding = 8;
        const dim = (size + padding) * 2;
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        const center = dim / 2;

        const r = color.r;
        const g = color.g;
        const b = color.b;

        // Draw glow
        const gradient = ctx.createRadialGradient(center, center, 0, center, center, size + padding);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, size + padding, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        this.spriteCache.set(key, {
            canvas: canvas,
            offset: center
        });
    }

    /**
     * Get inactive particle from pool (Optimized)
     */
    getParticle() {
        // Try linear search from last known free index
        let start = this.nextFreeIndex;
        let count = 0;

        while (count < this.maxParticles) {
            const index = (start + count) % this.maxParticles;
            if (!this.particlePool[index].active) {
                this.nextFreeIndex = (index + 1) % this.maxParticles;
                return this.particlePool[index];
            }
            count++;
        }

        return null; // Pool exhausted
    }

    /**
     * Trigger constellation formation effect
     * Dramatic "snap" with particle burst and glow
     */
    onConstellationFormed(constellation) {
        if (!this.enabled) return;

        const { centerX, centerY, enemies, pattern } = constellation;

        // Create pulse effect
        this.createPulseEffect(centerX, centerY, pattern);

        // Create particle burst from center
        this.createFormationBurst(centerX, centerY, pattern);

        // Create connecting beams
        this.createConstellationBeams(constellation);

        // Audio feedback (if audio system available)
        if (this.game.audioSystem?.playSFX) {
            this.game.audioSystem.playSFX('constellation_form', 0.3);
        }
    }

    /**
     * Create expanding pulse effect when constellation forms
     */
    createPulseEffect(x, y, pattern) {
        this.snapEffects.push({
            x,
            y,
            radius: 10,
            maxRadius: 100,
            alpha: 0.8,
            growthRate: 300, // pixels per second
            life: 0,
            maxLife: 0.5,
            pattern: pattern.name
        });
    }

    /**
     * Create particle burst when constellation snaps into place
     */
    createFormationBurst(x, y, pattern) {
        const particleCount = this.qualityMode === 'high' ? 20 :
            this.qualityMode === 'medium' ? 12 : 6;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) break;

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;

            particle.active = true;
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 0;
            particle.maxLife = 0.6 + Math.random() * 0.4;
            particle.size = 2 + Math.random() * 2;
            particle.alpha = 1;
            particle.type = 'spark';

            // Pattern-specific colors
            particle.color = this.getPatternColor(pattern.name);
        }
    }

    /**
     * Create connecting beam effects for constellation
     * [IMPROVED] Store pattern info for proper connection rendering
     */
    createConstellationBeams(constellation) {
        const beam = {
            constellation: constellation.id,
            enemies: [...constellation.enemies],
            pattern: constellation.pattern,
            patternName: constellation.pattern?.name || 'UNKNOWN',
            alpha: 0,
            targetAlpha: this.beamOpacity,
            pulsePhase: 0,
            age: 0
        };

        this.constellationBeams.push(beam);
    }

    /**
     * Trigger formation shatter effect when formation breaks
     */
    onFormationBroken(formation) {
        if (!this.enabled) return;

        const { center, enemies } = formation;

        // Create shatter particles from each enemy position
        for (const enemy of enemies) {
            if (!enemy || enemy.isDead) continue;
            this.createShatterBurst(enemy.x, enemy.y);
        }

        // Create implosion effect at center
        this.createImplosionEffect(center.x, center.y);

        // Audio feedback
        if (this.game.audioSystem?.playSFX) {
            this.game.audioSystem.playSFX('formation_break', 0.25);
        }
    }

    /**
     * Create shatter particles at position
     */
    createShatterBurst(x, y) {
        const particleCount = this.qualityMode === 'high' ? 8 :
            this.qualityMode === 'medium' ? 4 : 2;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) break;

            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 80;

            particle.active = true;
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 0;
            particle.maxLife = 0.4 + Math.random() * 0.3;
            particle.size = 1.5;
            particle.alpha = 1;
            particle.type = 'fragment';
            particle.color = { r: 255, g: 100, b: 100 }; // Red shatter
        }
    }

    /**
     * Create implosion effect (particles rushing inward)
     */
    createImplosionEffect(x, y) {
        this.shatterEffects.push({
            x,
            y,
            radius: 80,
            alpha: 0.6,
            shrinkRate: 200,
            life: 0,
            maxLife: 0.4
        });
    }

    /**
     * Get color for pattern type
     * [IMPROVED] Added glow intensity per pattern for visual variety
     */
    getPatternColor(patternName) {
        const colors = {
            'LINE': { r: 50, g: 200, b: 255, intensity: 1.1 },      // Cyan-blue
            'PAIR': { r: 100, g: 200, b: 255, intensity: 0.8 },
            'ARROW': { r: 255, g: 80, b: 80, intensity: 1.2 },      // Red - aggressive
            'TRIANGLE': { r: 0, g: 255, b: 153, intensity: 1.0 },   // Neon green
            'CROSS': { r: 255, g: 200, b: 50, intensity: 1.3 },     // Gold - prominent
            'DIAMOND': { r: 153, g: 50, b: 255, intensity: 1.15 },  // Purple
            'STAR': { r: 255, g: 255, b: 50, intensity: 1.4 },      // Bright yellow - special
            'PENTAGON': { r: 255, g: 153, b: 0, intensity: 1.1 },   // Orange
            'V_FORMATION': { r: 255, g: 120, b: 80, intensity: 1.25 }, // Orange-red - aggressive V
            'HEXAGON': { r: 255, g: 50, b: 180, intensity: 1.2 },   // Magenta
            'CIRCLE': { r: 50, g: 180, b: 255, intensity: 1.0 }     // Sky blue
        };
        return colors[patternName] || { r: 0, g: 255, b: 153, intensity: 1.0 };
    }

    /**
     * Get max edge length for a pattern type
     * Different patterns have different natural edge lengths
     */
    getPatternMaxEdgeLength(patternName) {
        const lengths = {
            'LINE': 120,        // Lines have longer edges
            'ARROW': 180,       // Arrows can be stretched
            'TRIANGLE': 200,    // Triangles have medium edges
            'DIAMOND': 220,     // Diamonds are medium-large
            'CROSS': 180,       // Cross arms are medium
            'STAR': 220,        // Stars have longer points
            'PENTAGON': 180,    // Pentagon edges are medium
            'V_FORMATION': 140, // V formation has short arm segments  
            'HEXAGON': 200,     // Hexagon edges are medium
            'CIRCLE': 160       // Circle edges depend on enemy count
        };
        return lengths[patternName] || 200;
    }

    /**
     * Update all active effects
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // Update particles
        for (const particle of this.particlePool) {
            if (!particle.active) continue;

            particle.life += deltaTime;

            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;

            // Apply gravity/drag based on type
            if (particle.type === 'spark') {
                particle.vx *= 0.95;
                particle.vy *= 0.95;
            } else if (particle.type === 'fragment') {
                particle.vy += 200 * deltaTime; // Gravity
                particle.vx *= 0.98;
            }

            // Fade out
            const lifeRatio = particle.life / particle.maxLife;
            particle.alpha = 1 - lifeRatio;

            // Deactivate when done
            if (particle.life >= particle.maxLife) {
                particle.active = false;
            }
        }

        // Update snap effects (pulse rings)
        for (let i = this.snapEffects.length - 1; i >= 0; i--) {
            const effect = this.snapEffects[i];
            effect.life += deltaTime;
            effect.radius += effect.growthRate * deltaTime;
            effect.alpha = 1 - (effect.life / effect.maxLife);

            if (effect.life >= effect.maxLife) {
                this.snapEffects.splice(i, 1);
            }
        }

        // Update shatter effects (implosion rings)
        for (let i = this.shatterEffects.length - 1; i >= 0; i--) {
            const effect = this.shatterEffects[i];
            effect.life += deltaTime;
            effect.radius -= effect.shrinkRate * deltaTime;
            effect.alpha = 0.6 * (1 - effect.life / effect.maxLife);

            if (effect.life >= effect.maxLife || effect.radius <= 0) {
                this.shatterEffects.splice(i, 1);
            }
        }

        // Update constellation beams
        for (let i = this.constellationBeams.length - 1; i >= 0; i--) {
            const beam = this.constellationBeams[i];
            beam.age += deltaTime;
            beam.pulsePhase += deltaTime * 2;

            // Fade in smoothly
            if (beam.alpha < beam.targetAlpha) {
                beam.alpha = Math.min(beam.targetAlpha, beam.alpha + deltaTime * 1.5);
            }

            // Remove if constellation is dead or enemies wandered away
            const activeEnemies = beam.enemies.filter(e =>
                e && !e.isDead && e.constellation === beam.constellation
            );

            if (activeEnemies.length < 2) {
                this.constellationBeams.splice(i, 1);
                continue;
            }

            // Sort by anchor index for consistent connection order
            activeEnemies.sort((a, b) => (a.constellationAnchor || 0) - (b.constellationAnchor || 0));

            // Check max edge length - use pattern-specific thresholds
            const patternMaxEdge = this.getPatternMaxEdgeLength(beam.patternName);
            const maxEdgeSq = patternMaxEdge * patternMaxEdge;
            
            let exceedsLength = false;
            let stretchRatio = 0;  // Track how stretched edges are
            
            for (let j = 0; j < activeEnemies.length; j++) {
                const next = (j + 1) % activeEnemies.length;
                const e1 = activeEnemies[j];
                const e2 = activeEnemies[next];
                const dx = e1.x - e2.x;
                const dy = e1.y - e2.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq > maxEdgeSq) {
                    exceedsLength = true;
                    break;
                }
                
                // Track stretch ratio for alpha fading
                const ratio = distSq / maxEdgeSq;
                if (ratio > stretchRatio) stretchRatio = ratio;
            }

            if (exceedsLength) {
                // Fade out before removing
                beam.alpha -= deltaTime * 3;
                if (beam.alpha <= 0) {
                    this.constellationBeams.splice(i, 1);
                }
            } else {
                beam.enemies = activeEnemies;
                // Reduce alpha when edges are stretched (starts fading at 60% of max)
                if (stretchRatio > 0.6) {
                    const fadeFactor = 1 - (stretchRatio - 0.6) / 0.4;
                    beam.targetAlpha = this.beamOpacity * Math.max(0.3, fadeFactor);
                } else {
                    beam.targetAlpha = this.beamOpacity;
                }
            }
        }
    }

    /**
     * Render all effects
     */
    render(ctx) {
        if (!this.enabled) return;

        ctx.save();

        // Render constellation beams
        this.renderConstellationBeams(ctx);

        // Render snap effects
        this.renderSnapEffects(ctx);

        // Render shatter effects
        this.renderShatterEffects(ctx);

        // Render particles
        this.renderParticles(ctx);

        ctx.restore();
    }

    /**
     * Render connecting beams between constellation enemies
     * [IMPROVED] Pattern-aware connection drawing
     */
    renderConstellationBeams(ctx) {
        if (this.constellationBeams.length === 0) return;

        for (const beam of this.constellationBeams) {
            if (beam.enemies.length < 2) continue;

            // Pulsing alpha - gentler pulse
            const pulse = 0.85 + Math.sin(beam.pulsePhase) * 0.15;
            const alpha = beam.alpha * pulse;

            if (alpha < 0.01) continue;

            // Get pattern-specific color
            const patternColor = this.getPatternColor(beam.patternName);
            const r = patternColor.r;
            const g = patternColor.g;
            const b = patternColor.b;
            const intensity = patternColor.intensity || 1.0;

            // [OPTIMIZATION] Manual glow effect (multi-pass stroke)
            if (this.qualityMode === 'high') {
                // Outer glow (wide, low alpha)
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.25 * intensity})`;
                ctx.lineWidth = this.beamWidth * 4 * intensity;
                ctx.beginPath();
                this.drawBeamPath(ctx, beam);
                ctx.stroke();

                // Inner glow (medium, medium alpha)
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4 * intensity})`;
                ctx.lineWidth = this.beamWidth * 2 * intensity;
                ctx.beginPath();
                this.drawBeamPath(ctx, beam);
                ctx.stroke();
            }

            // Core beam (bright, sharp)
            ctx.strokeStyle = `rgba(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)}, ${alpha})`;
            ctx.lineWidth = this.beamWidth;
            ctx.beginPath();
            this.drawBeamPath(ctx, beam);
            ctx.stroke();
        }
    }

    /**
     * Helper to draw lines for a beam
     * [IMPROVED] Pattern-aware drawing - different patterns connect differently
     */
    drawBeamPath(ctx, beam) {
        const enemies = beam.enemies;
        const patternName = beam.patternName;
        
        // Sort by anchor for consistent ordering
        const sorted = [...enemies].sort((a, b) => 
            (a.constellationAnchor || 0) - (b.constellationAnchor || 0)
        );
        
        // STAR pattern: draw as a star (connect every other vertex)
        if (patternName === 'STAR' && sorted.length === 5) {
            // Star order: 0->2->4->1->3->0
            const starOrder = [0, 2, 4, 1, 3];
            for (let i = 0; i < starOrder.length; i++) {
                const curr = sorted[starOrder[i]];
                const next = sorted[starOrder[(i + 1) % starOrder.length]];
                if (curr && next && !curr.isDead && !next.isDead) {
                    ctx.moveTo(curr.x, curr.y);
                    ctx.lineTo(next.x, next.y);
                }
            }
            return;
        }
        
        // CROSS pattern: draw as cross (center to each arm)
        if (patternName === 'CROSS' && sorted.length === 5) {
            const center = sorted[0];  // First position is center
            if (center && !center.isDead) {
                for (let i = 1; i < sorted.length; i++) {
                    const arm = sorted[i];
                    if (arm && !arm.isDead) {
                        ctx.moveTo(center.x, center.y);
                        ctx.lineTo(arm.x, arm.y);
                    }
                }
            }
            return;
        }
        
        // V_FORMATION: draw as V (tip to each wing)
        if (patternName === 'V_FORMATION' && sorted.length >= 3) {
            const tip = sorted[0];  // First is the tip
            if (tip && !tip.isDead) {
                // Connect tip to first wing member, then chain down each wing
                // Left wing: indices 1, 3, 5...
                // Right wing: indices 2, 4, 6...
                let prevLeft = tip;
                let prevRight = tip;
                for (let i = 1; i < sorted.length; i++) {
                    const curr = sorted[i];
                    if (!curr || curr.isDead) continue;
                    
                    if (i % 2 === 1) {  // Left wing
                        ctx.moveTo(prevLeft.x, prevLeft.y);
                        ctx.lineTo(curr.x, curr.y);
                        prevLeft = curr;
                    } else {  // Right wing
                        ctx.moveTo(prevRight.x, prevRight.y);
                        ctx.lineTo(curr.x, curr.y);
                        prevRight = curr;
                    }
                }
            }
            return;
        }
        
        // LINE pattern: draw as a line (don't close the loop)
        if (patternName === 'LINE') {
            for (let i = 0; i < sorted.length - 1; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            return;
        }
        
        // Default: connect adjacent enemies in a loop (polygon)
        for (let i = 0; i < sorted.length; i++) {
            const next = (i + 1) % sorted.length;
            const e1 = sorted[i];
            const e2 = sorted[next];

            if (e1 && e2 && !e1.isDead && !e2.isDead) {
                ctx.moveTo(e1.x, e1.y);
                ctx.lineTo(e2.x, e2.y);
            }
        }
    }

    /**
     * Render snap pulse effects
     */
    renderSnapEffects(ctx) {
        for (const effect of this.snapEffects) {
            const color = this.getPatternColor(effect.pattern);

            // [OPTIMIZATION] Manual glow instead of shadowBlur
            if (this.qualityMode === 'high') {
                // Glow pass
                ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.alpha * 0.3})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Core pass
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.alpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * Render shatter implosion effects
     */
    renderShatterEffects(ctx) {
        for (const effect of this.shatterEffects) {
            ctx.strokeStyle = `rgba(255, 100, 100, ${effect.alpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    /**
     * Render particles
     * [OPTIMIZED] Uses cached sprites and batch rendering
     */
    renderParticles(ctx) {
        // Optimization: Batch by sprite key to minimize texture switches (if using WebGL)
        // For Canvas2D, it just avoids state changes.

        for (const particle of this.particlePool) {
            if (!particle.active) continue;

            const { r, g, b } = particle.color;
            const key = `${particle.type}_${r}_${g}_${b}`;
            const sprite = this.spriteCache.get(key);

            if (sprite) {
                // Use cached sprite
                ctx.globalAlpha = particle.alpha;

                // Draw image centered
                // Scale based on particle size relative to sprite base size
                // Base size was 4 for spark, 3 for fragment
                const baseSize = particle.type === 'spark' ? 4 : 3;
                const scale = particle.size / baseSize;

                const dim = sprite.canvas.width * scale;
                const offset = sprite.offset * scale;

                ctx.drawImage(
                    sprite.canvas,
                    particle.x - offset,
                    particle.y - offset,
                    dim,
                    dim
                );
            } else {
                // Fallback to dynamic rendering if sprite not found
                // [OPTIMIZATION] Manual glow for particles
                if (this.qualityMode === 'high' && particle.type === 'spark') {
                    // Glow pass
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Core pass
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Reset all effects
     */
    reset() {
        // Deactivate all particles
        for (const particle of this.particlePool) {
            particle.active = false;
        }

        this.constellationBeams = [];
        this.snapEffects = [];
        this.shatterEffects = [];
    }

    /**
     * Remove constellation beams tied to a specific constellation id
     */
    removeConstellationBeams(constellationId) {
        if (!constellationId) return;
        this.constellationBeams = this.constellationBeams.filter(
            beam => beam.constellation !== constellationId
        );
    }

    /**
     * Set quality mode
     */
    setQualityMode(mode) {
        if (['low', 'medium', 'high'].includes(mode)) {
            this.qualityMode = mode;
        }
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.FormationEffects = FormationEffects;
    window.logger?.log('FormationEffects class loaded');
}

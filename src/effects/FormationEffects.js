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
        // [STABILITY] Guard against missing canvas context (can happen in some environments)
        if (!ctx) {
            window.logger?.warn('FormationEffects: Failed to create 2D canvas context for sprite cache');
            return;
        }
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
            'CIRCLE': { r: 50, g: 180, b: 255, intensity: 1.0 },    // Sky blue
            // New patterns
            'DOUBLE_TRIANGLE': { r: 0, g: 220, b: 180, intensity: 1.2 },  // Teal
            'DUAL_DIAMOND': { r: 180, g: 80, b: 255, intensity: 1.25 },   // Bright purple
            'OCTAGON': { r: 255, g: 100, b: 150, intensity: 1.15 },       // Pink
            'ARROW_FLIGHT': { r: 255, g: 60, b: 60, intensity: 1.3 },     // Bright red
            'CRESCENT': { r: 200, g: 200, b: 255, intensity: 1.1 },       // Pale blue
            'DOUBLE_V': { r: 255, g: 180, b: 50, intensity: 1.2 },        // Gold-orange
            'SPIRAL': { r: 100, g: 255, b: 200, intensity: 1.2 },         // Mint green
            'DOUBLE_CRESCENT': { r: 255, g: 150, b: 200, intensity: 1.15 }, // Light pink
            // Tactical patterns
            'PINCER': { r: 220, g: 50, b: 100, intensity: 1.3 },     // Crimson - aggressive flanking
            'TRIDENT': { r: 100, g: 150, b: 255, intensity: 1.25 },  // Steel blue - piercing
            'SHIELD_WALL': { r: 180, g: 180, b: 200, intensity: 1.0 }, // Silver - defensive
            'HOURGLASS': { r: 255, g: 100, b: 255, intensity: 1.3 }, // Fuchsia - unique
            'ORBIT': { r: 150, g: 220, b: 255, intensity: 1.15 },    // Light cyan - planetary
            'CROWN': { r: 255, g: 215, b: 0, intensity: 1.35 },      // Gold - royal
            'CLAW': { r: 200, g: 80, b: 80, intensity: 1.25 }        // Dark red - predatory
        };
        return colors[patternName] || { r: 0, g: 255, b: 153, intensity: 1.0 };
    }

    /**
     * Get max edge length for a pattern type
     * Different patterns have different natural edge lengths
     * [UPDATED] Values tuned to match tighter pattern radii
     */
    getPatternMaxEdgeLength(patternName) {
        const lengths = {
            'LINE': 100,           // Lines: 60px spacing, allow some stretch
            'ARROW': 140,          // Arrow: ~55px tip, ~50px wings
            'TRIANGLE': 130,       // Triangle: 65px radius = ~113px edges
            'DIAMOND': 110,        // Diamond: 70px radius = ~99px edges
            'CROSS': 100,          // Cross: 65px arms from center
            'STAR': 120,           // Star: 70px radius = ~82px edges (pentagon)
            'PENTAGON': 130,       // Pentagon: medium edges
            'V_FORMATION': 120,    // V formation: 50px spacing
            'HEXAGON': 140,        // Hexagon: slightly larger
            'DOUBLE_TRIANGLE': 140, // Two triangles
            'DUAL_DIAMOND': 120,   // Two diamonds (inner smaller)
            'OCTAGON': 100,        // Octagon: 105px radius, many edges
            'ARROW_FLIGHT': 120,   // Flying arrow wings
            'CRESCENT': 80,        // Crescent arc: closer spacing
            'DOUBLE_V': 130,       // Double V formation
            'SPIRAL': 100,         // Spiral: varies with position
            'DOUBLE_CRESCENT': 90, // Two crescents
            'CIRCLE': 150,         // Circle: dynamic radius based on count
            // Tactical patterns
            'PINCER': 100,         // Pincer arms: 70px base + 20px per enemy
            'TRIDENT': 90,         // Trident prongs: 50px spacing
            'SHIELD_WALL': 80,     // Shield wall: tight formation
            'HOURGLASS': 100,      // Hourglass: triangle edges
            'ORBIT': 80,           // Orbit: tight circle around center
            'CROWN': 110,          // Crown: peaks and base spacing
            'CLAW': 100            // Claw: prong spacing
        };
        return lengths[patternName] || 120;
    }

    /**
     * Update all active effects
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // [OPTIMIZATION] Use indexed loop instead of for-of for hot path
        const particles = this.particlePool;
        const particleCount = particles.length;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = particles[i];
            if (!particle.active) continue;

            particle.life += deltaTime;

            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;

            // Apply gravity/drag based on type (inlined for perf)
            // [FIX] Frame-rate independent drag using exponential decay
            const type = particle.type;
            if (type === 'spark') {
                const sparkDrag = Math.pow(0.95, deltaTime * 60);
                particle.vx *= sparkDrag;
                particle.vy *= sparkDrag;
            } else if (type === 'fragment') {
                particle.vy += 200 * deltaTime; // Gravity
                const fragDrag = Math.pow(0.98, deltaTime * 60);
                particle.vx *= fragDrag;
            }

            // Fade out
            particle.alpha = 1 - (particle.life / particle.maxLife);

            // Deactivate when done
            if (particle.life >= particle.maxLife) {
                particle.active = false;
            }
        }

        // Update snap effects (pulse rings) - use swap-remove for O(1) removal
        const snapEffects = this.snapEffects;
        for (let i = snapEffects.length - 1; i >= 0; i--) {
            const effect = snapEffects[i];
            effect.life += deltaTime;
            effect.radius += effect.growthRate * deltaTime;
            effect.alpha = 1 - (effect.life / effect.maxLife);

            if (effect.life >= effect.maxLife) {
                // Swap with last element and pop (O(1) instead of O(n) splice)
                const lastIdx = snapEffects.length - 1;
                if (i !== lastIdx) {
                    snapEffects[i] = snapEffects[lastIdx];
                }
                snapEffects.pop();
            }
        }

        // Update shatter effects (implosion rings) - use swap-remove
        const shatterEffects = this.shatterEffects;
        for (let i = shatterEffects.length - 1; i >= 0; i--) {
            const effect = shatterEffects[i];
            effect.life += deltaTime;
            effect.radius -= effect.shrinkRate * deltaTime;
            effect.alpha = 0.6 * (1 - effect.life / effect.maxLife);

            if (effect.life >= effect.maxLife || effect.radius <= 0) {
                // Swap with last element and pop (O(1) instead of O(n) splice)
                const lastIdx = shatterEffects.length - 1;
                if (i !== lastIdx) {
                    shatterEffects[i] = shatterEffects[lastIdx];
                }
                shatterEffects.pop();
            }
        }

        // Update constellation beams
        const beams = this.constellationBeams;
        for (let i = beams.length - 1; i >= 0; i--) {
            const beam = beams[i];
            beam.age += deltaTime;
            beam.pulsePhase += deltaTime * 2;

            // Fade in smoothly
            if (beam.alpha < beam.targetAlpha) {
                beam.alpha = Math.min(beam.targetAlpha, beam.alpha + deltaTime * 1.5);
            }

            // Remove if constellation is dead or enemies wandered away
            const enemies = beam.enemies;
            let activeCount = 0;
            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (e && !e.isDead && e.constellation === beam.constellation) {
                    activeCount++;
                } else {
                    // Remove inactive enemy from array inline
                    const lastIdx = enemies.length - 1;
                    if (j !== lastIdx) {
                        enemies[j] = enemies[lastIdx];
                    }
                    enemies.pop();
                }
            }

            if (activeCount < 2) {
                // Swap with last element and pop
                const lastIdx = beams.length - 1;
                if (i !== lastIdx) {
                    beams[i] = beams[lastIdx];
                }
                beams.pop();
                continue;
            }

            // Sort by anchor index for consistent connection order
            enemies.sort((a, b) => (a.constellationAnchor || 0) - (b.constellationAnchor || 0));

            // Check max edge length - use pattern-specific thresholds
            // [STABILITY] Guard against invalid patternMaxEdge
            const patternMaxEdge = this.getPatternMaxEdgeLength(beam.patternName) || 120;
            if (patternMaxEdge <= 0) continue;

            let exceedsLength = false;
            let stretchRatio = 0;  // Track how stretched edges are (linear, not squared)
            const activeEnemies = enemies;
            const enemyCount = activeEnemies.length;

            for (let j = 0; j < enemyCount; j++) {
                const next = (j + 1) % enemyCount;
                const e1 = activeEnemies[j];
                const e2 = activeEnemies[next];
                // [STABILITY] Guard against null enemies in array
                if (!e1 || !e2) continue;
                const dx = e1.x - e2.x;
                const dy = e1.y - e2.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > patternMaxEdge * patternMaxEdge) {
                    exceedsLength = true;
                    break;
                }

                // [FIX] Track stretch ratio using linear distance, not squared
                // This ensures fadeFactor calculation below works correctly
                const dist = Math.sqrt(distSq);
                const ratio = dist / patternMaxEdge;
                if (ratio > stretchRatio) stretchRatio = ratio;
            }

            if (exceedsLength) {
                // Fade out before removing
                beam.alpha -= deltaTime * 3;
                if (beam.alpha <= 0) {
                    // Swap with last element and pop
                    const lastIdx = beams.length - 1;
                    if (i !== lastIdx) {
                        beams[i] = beams[lastIdx];
                    }
                    beams.pop();
                }
            } else {
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
        
        // DOUBLE_TRIANGLE: draw two triangles
        if (patternName === 'DOUBLE_TRIANGLE' && sorted.length === 6) {
            // First triangle: 0, 1, 2
            for (let i = 0; i < 3; i++) {
                const next = (i + 1) % 3;
                const e1 = sorted[i];
                const e2 = sorted[next];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Second triangle: 3, 4, 5
            for (let i = 3; i < 6; i++) {
                const next = 3 + ((i - 3 + 1) % 3);
                const e1 = sorted[i];
                const e2 = sorted[next];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            return;
        }
        
        // DUAL_DIAMOND: draw two diamonds
        if (patternName === 'DUAL_DIAMOND' && sorted.length === 8) {
            // Outer diamond: 0, 1, 2, 3
            for (let i = 0; i < 4; i++) {
                const next = (i + 1) % 4;
                const e1 = sorted[i];
                const e2 = sorted[next];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Inner diamond: 4, 5, 6, 7
            for (let i = 4; i < 8; i++) {
                const next = 4 + ((i - 4 + 1) % 4);
                const e1 = sorted[i];
                const e2 = sorted[next];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            return;
        }
        
        // ARROW_FLIGHT: draw as flying arrow (tip + two wings)
        if (patternName === 'ARROW_FLIGHT' && sorted.length === 7) {
            const tip = sorted[0];
            if (tip && !tip.isDead) {
                // Connect tip to first of each wing, then chain wings
                // Left wing: 1, 2, 3
                for (let i = 1; i <= 3; i++) {
                    const prev = i === 1 ? tip : sorted[i - 1];
                    const curr = sorted[i];
                    if (prev && curr && !prev.isDead && !curr.isDead) {
                        ctx.moveTo(prev.x, prev.y);
                        ctx.lineTo(curr.x, curr.y);
                    }
                }
                // Right wing: 4, 5, 6
                for (let i = 4; i <= 6; i++) {
                    const prev = i === 4 ? tip : sorted[i - 1];
                    const curr = sorted[i];
                    if (prev && curr && !prev.isDead && !curr.isDead) {
                        ctx.moveTo(prev.x, prev.y);
                        ctx.lineTo(curr.x, curr.y);
                    }
                }
            }
            return;
        }
        
        // CRESCENT, DOUBLE_V, SPIRAL, DOUBLE_CRESCENT: draw as open arc (don't close)
        // These patterns work well with any enemy count within their range
        if (patternName === 'CRESCENT' || patternName === 'DOUBLE_V' || 
            patternName === 'SPIRAL' || patternName === 'DOUBLE_CRESCENT') {
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
        
        // PINCER: draw two curved arms (don't connect tips)
        if (patternName === 'PINCER') {
            const armLength = Math.ceil(sorted.length / 2);
            // Left arm: 0 to armLength-1
            for (let i = 0; i < armLength - 1; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Right arm: armLength to end
            for (let i = armLength; i < sorted.length - 1; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            return;
        }
        
        // TRIDENT: draw three prongs from center
        if (patternName === 'TRIDENT' && sorted.length === 9) {
            // Center prong: 0, 1, 2
            for (let i = 0; i < 2; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Left prong: 3, 4, 5
            for (let i = 3; i < 5; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Right prong: 6, 7, 8
            for (let i = 6; i < 8; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Connect prong bases (indices 2, 5, 8 form base, 5 connects to 2 and 8)
            const base1 = sorted[2];
            const base2 = sorted[5];
            const base3 = sorted[8];
            if (base1 && base2 && !base1.isDead && !base2.isDead) {
                ctx.moveTo(base1.x, base1.y);
                ctx.lineTo(base2.x, base2.y);
            }
            if (base2 && base3 && !base2.isDead && !base3.isDead) {
                ctx.moveTo(base2.x, base2.y);
                ctx.lineTo(base3.x, base3.y);
            }
            return;
        }
        
        // SHIELD_WALL: draw curved front row and support row
        if (patternName === 'SHIELD_WALL') {
            const frontCount = Math.ceil(sorted.length * 0.6);
            // Front row: curved arc
            for (let i = 0; i < frontCount - 1; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Back row: support line
            for (let i = frontCount; i < sorted.length - 1; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Connect front corners to back corners for visual cohesion
            if (sorted[0] && sorted[frontCount] && !sorted[0].isDead && !sorted[frontCount].isDead) {
                ctx.moveTo(sorted[0].x, sorted[0].y);
                ctx.lineTo(sorted[frontCount].x, sorted[frontCount].y);
            }
            if (sorted[frontCount - 1] && sorted[sorted.length - 1] && 
                !sorted[frontCount - 1].isDead && !sorted[sorted.length - 1].isDead) {
                ctx.moveTo(sorted[frontCount - 1].x, sorted[frontCount - 1].y);
                ctx.lineTo(sorted[sorted.length - 1].x, sorted[sorted.length - 1].y);
            }
            return;
        }
        
        // HOURGLASS: draw two triangles meeting at center
        if (patternName === 'HOURGLASS' && sorted.length === 8) {
            // Top triangle: 0 (tip), 1, 2, 3 (base)
            const topTip = sorted[0];
            // Connect tip to base corners
            if (topTip && sorted[1] && !topTip.isDead && !sorted[1].isDead) {
                ctx.moveTo(topTip.x, topTip.y);
                ctx.lineTo(sorted[1].x, sorted[1].y);
            }
            if (topTip && sorted[3] && !topTip.isDead && !sorted[3].isDead) {
                ctx.moveTo(topTip.x, topTip.y);
                ctx.lineTo(sorted[3].x, sorted[3].y);
            }
            // Connect base: 1-2-3
            for (let i = 1; i < 3; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Bottom triangle: 4, 5, 6 (base), 7 (tip)
            const bottomTip = sorted[7];
            // Connect base: 4-5-6
            for (let i = 4; i < 6; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Connect tip to base corners
            if (bottomTip && sorted[4] && !bottomTip.isDead && !sorted[4].isDead) {
                ctx.moveTo(bottomTip.x, bottomTip.y);
                ctx.lineTo(sorted[4].x, sorted[4].y);
            }
            if (bottomTip && sorted[6] && !bottomTip.isDead && !sorted[6].isDead) {
                ctx.moveTo(bottomTip.x, bottomTip.y);
                ctx.lineTo(sorted[6].x, sorted[6].y);
            }
            return;
        }
        
        // ORBIT: draw center to all satellites, and satellite ring
        if (patternName === 'ORBIT' && sorted.length === 7) {
            const center = sorted[0];
            if (center && !center.isDead) {
                // Connect center to all satellites
                for (let i = 1; i < sorted.length; i++) {
                    const sat = sorted[i];
                    if (sat && !sat.isDead) {
                        ctx.moveTo(center.x, center.y);
                        ctx.lineTo(sat.x, sat.y);
                    }
                }
                // Connect satellites in a ring
                for (let i = 1; i < sorted.length; i++) {
                    const next = i === sorted.length - 1 ? 1 : i + 1;
                    const e1 = sorted[i];
                    const e2 = sorted[next];
                    if (e1 && e2 && !e1.isDead && !e2.isDead) {
                        ctx.moveTo(e1.x, e1.y);
                        ctx.lineTo(e2.x, e2.y);
                    }
                }
            }
            return;
        }
        
        // CROWN: draw base line and three peaks
        if (patternName === 'CROWN' && sorted.length === 10) {
            // Base: 0, 1, 2, 3
            for (let i = 0; i < 3; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Each peak: tip (4,6,8) + midpoint (5,7,9)
            // Connect base to peaks
            for (let peakIdx = 0; peakIdx < 3; peakIdx++) {
                const tipIdx = 4 + peakIdx * 2;
                const midIdx = 5 + peakIdx * 2;
                const tip = sorted[tipIdx];
                const mid = sorted[midIdx];
                // Connect midpoint to tip
                if (tip && mid && !tip.isDead && !mid.isDead) {
                    ctx.moveTo(mid.x, mid.y);
                    ctx.lineTo(tip.x, tip.y);
                }
                // Connect base to midpoint (distribute peaks across base)
                const baseIdx = Math.min(peakIdx, 3);
                const base = sorted[baseIdx];
                if (base && mid && !base.isDead && !mid.isDead) {
                    ctx.moveTo(base.x, base.y);
                    ctx.lineTo(mid.x, mid.y);
                }
            }
            return;
        }
        
        // CLAW: draw three curved prongs
        if (patternName === 'CLAW' && sorted.length === 11) {
            // Center prong: 0, 1, 2, 3
            for (let i = 0; i < 3; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Upper prong: 4, 5, 6
            for (let i = 4; i < 6; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Lower prong: 7, 8, 9, 10
            for (let i = 7; i < 10; i++) {
                const e1 = sorted[i];
                const e2 = sorted[i + 1];
                if (e1 && e2 && !e1.isDead && !e2.isDead) {
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                }
            }
            // Connect prong roots (0, 4, 7)
            const root0 = sorted[0];
            const root1 = sorted[4];
            const root2 = sorted[7];
            if (root0 && root1 && !root0.isDead && !root1.isDead) {
                ctx.moveTo(root0.x, root0.y);
                ctx.lineTo(root1.x, root1.y);
            }
            if (root0 && root2 && !root0.isDead && !root2.isDead) {
                ctx.moveTo(root0.x, root0.y);
                ctx.lineTo(root2.x, root2.y);
            }
            return;
        }
        
        // Default: connect adjacent enemies in a loop (polygon)
        // Used for: TRIANGLE, DIAMOND, PENTAGON, HEXAGON, OCTAGON, CIRCLE
        // Also fallback for patterns when enemy count doesn't match expected
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
     * [FIX] Uses swap-and-pop pattern to avoid creating new array (reduces GC)
     */
    removeConstellationBeams(constellationId) {
        if (!constellationId) return;
        const beams = this.constellationBeams;
        for (let i = beams.length - 1; i >= 0; i--) {
            if (beams[i].constellation === constellationId) {
                // Swap with last element and pop (O(1) removal)
                const lastIdx = beams.length - 1;
                if (i !== lastIdx) {
                    beams[i] = beams[lastIdx];
                }
                beams.pop();
            }
        }
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

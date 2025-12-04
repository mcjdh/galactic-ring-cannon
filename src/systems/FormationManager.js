/**
 * FormationManager - Manages geometric enemy formations
 * 
 * Handles formation lifecycle, updates, and rendering of optional visual elements.
 * Designed for performance: updates formations, not individual enemies.
 */

class FormationManager {
    constructor(game) {
        this.game = game;
        this.formations = []; // Active formations
        this.maxFormations = 3; // Reduced from 5 to prevent overcrowding
        this.spawnTimer = 0;
        this.spawnInterval = 5; // Base interval
        this.enabled = true;

        // Entropy Wave System (Order vs Chaos)
        this.entropyPhase = 'CHAOS'; // Start with chaos
        this.entropyTimer = 0;
        this.entropyCycleDuration = 60; // 60s full cycle
        this.orderDuration = 20; // 20s of intense formations

        // Performance tracking
        this.formationUpdateTime = 0;

        // Visual settings (can be disabled for performance)
        this.showFormationMarkers = false; // Debug visual
        this.showConnectingLines = true; // [VISUAL] Enabled by default for better feedback
        this.markerColor = '#FF0000';

        // Visual effects system
        this.effects = null; // Will be initialized when FormationEffects is available
        // [OPTIMIZATION] Marker Sprite Cache
        this.markerCache = new Map();
        this.initMarkerCache();
    }

    /**
     * [OPTIMIZATION] Initialize sprite cache for formation markers
     */
    initMarkerCache() {
        if (typeof document === 'undefined') return;

        const types = ['cubic_swarm', 'pyramid_squadron', 'octahedron_ring', 'hex_lattice', 'double_helix', 'electron_shell', 'line_wedge', 'vortex_swarm', 'hydra_head', 'bio_orb', 'interceptor_cross', 'chaos_cloud', 'default'];
        const size = 15;
        const dim = (size + 2) * 2; // Add padding for line width

        types.forEach(type => {
            const canvas = document.createElement('canvas');
            canvas.width = dim;
            canvas.height = dim;
            const ctx = canvas.getContext('2d');
            const center = dim / 2;

            ctx.strokeStyle = 'rgba(0, 255, 153, 0.15)'; // Faint neon green
            ctx.lineWidth = 1;

            ctx.save();
            ctx.translate(center, center);

            if (type === 'cubic_swarm') {
                // Draw square
                ctx.strokeRect(-size, -size, size * 2, size * 2);
            } else if (type === 'pyramid_squadron') {
                // Draw triangle
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.lineTo(-size, size);
                ctx.lineTo(size, size);
                ctx.closePath();
                ctx.stroke();
            } else if (type === 'octahedron_ring' || type === 'hex_lattice') {
                // Draw hexagon
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const px = Math.cos(angle) * size;
                    const py = Math.sin(angle) * size;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (type === 'vortex_swarm' || type === 'bio_orb') {
                // Draw spiral/circle
                ctx.beginPath();
                for (let i = 0; i < 20; i++) {
                    const angle = i * 0.5;
                    const r = (i / 20) * size;
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            } else if (type === 'hydra_head') {
                // Draw multi-headed symbol
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2); // Center
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -size); // Top
                ctx.moveTo(0, 0);
                ctx.lineTo(-size * 0.8, size * 0.6); // Left
                ctx.moveTo(0, 0);
                ctx.lineTo(size * 0.8, size * 0.6); // Right
                ctx.stroke();
            } else if (type === 'interceptor_cross') {
                // Draw X
                ctx.beginPath();
                ctx.moveTo(-size, -size);
                ctx.lineTo(size, size);
                ctx.moveTo(size, -size);
                ctx.lineTo(-size, size);
                ctx.stroke();
            } else if (type === 'chaos_cloud') {
                // Draw cloud-like shape
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(size * 0.5, -size * 0.3, size * 0.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(-size * 0.5, size * 0.3, size * 0.4, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // Default: circle
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();

            this.markerCache.set(type, canvas);
        });
    }

    /**
     * Render formation center marker (faint wireframe icon)
     * [OPTIMIZED] Uses cached sprites
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} formation - Formation object
     */
    renderFormationMarker(ctx, formation) {
        const { x, y } = formation.center;
        const config = formation.config;

        // Determine type key
        let type = 'default';
        if (this.markerCache.has(config.id)) {
            type = config.id;
        } else if (config.id === 'cubic_swarm') type = 'cubic_swarm';
        else if (config.id === 'pyramid_squadron') type = 'pyramid_squadron';
        else if (config.id === 'octahedron_ring') type = 'octahedron_ring';
        else if (config.id === 'bio_orb') type = 'bio_orb';
        else if (config.id === 'interceptor_cross') type = 'interceptor_cross';
        else if (config.id === 'chaos_cloud') type = 'chaos_cloud';

        const sprite = this.markerCache.get(type) || this.markerCache.get('default');

        if (sprite) {
            const halfSize = sprite.width / 2;

            ctx.save();
            ctx.translate(x, y);
            // Apply formation rotation if desired, though markers usually stay upright or rotate with formation
            // Let's rotate with formation for visual coherence
            if (type !== 'default') {
                ctx.rotate(formation.rotation);
            }

            ctx.drawImage(sprite, -halfSize, -halfSize);
            ctx.restore();
        } else {
            // Fallback to dynamic rendering
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 153, 0.15)'; // Faint neon green
            ctx.lineWidth = 1;

            const size = 15;
            // ... existing fallback code ...
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    }
    update(deltaTime) {
        if (!this.enabled || !this.game.player) return;

        const startTime = performance.now();

        // Update Entropy Phase
        this.entropyTimer += deltaTime;
        if (this.entropyPhase === 'CHAOS') {
            if (this.entropyTimer > (this.entropyCycleDuration - this.orderDuration)) {
                this.entropyPhase = 'ORDER';
                this.entropyTimer = 0;
                // Trigger immediate formation on phase switch
                this.trySpawnFormation();
                if (window.logger?.log) window.logger.log('[FormationManager] Entering ORDER Phase');
            }
        } else { // ORDER Phase
            if (this.entropyTimer > this.orderDuration) {
                this.entropyPhase = 'CHAOS';
                this.entropyTimer = 0;
                if (window.logger?.log) window.logger.log('[FormationManager] Entering CHAOS Phase');
            }
        }

        // Lazy-initialize effects system
        if (!this.effects && window.FormationEffects) {
            this.effects = new window.FormationEffects(this.game);
        }

        // Update effects
        if (this.effects) {
            this.effects.update(deltaTime);
        }

        // Dynamic Spawn Interval based on Phase
        // ORDER: Rapid fire (3s)
        // CHAOS: Rare (15s)
        const currentInterval = this.entropyPhase === 'ORDER' ? 3.0 : 15.0;

        // Update spawn timer
        this.spawnTimer += deltaTime;

        // Try to spawn new formation if timer expired and under limit
        if (this.spawnTimer >= currentInterval && this.formations.length < this.maxFormations) {
            this.trySpawnFormation();
            this.spawnTimer = 0;
        }

        // Update each formation
        for (let i = this.formations.length - 1; i >= 0; i--) {
            const formation = this.formations[i];

            if (formation.active) {
                this.updateFormation(formation, deltaTime);
            } else {
                // Remove inactive formations
                this.formations.splice(i, 1);
            }
        }

        this.formationUpdateTime = performance.now() - startTime;
    }

    /**
     * Attempt to spawn a new formation
     */
    trySpawnFormation() {
        if (!this.game.spawner || !this.game.player) return;

        // Check global enemy cap before spawning a massive formation
        const currentEnemies = this.game.enemies ? this.game.enemies.length : 0;
        const maxEnemies = this.game.spawner.maxEnemies || 50;

        // Allow spawning if we are below 80% of the cap, or if it's the very first formation
        if (this.formations.length > 0 && currentEnemies >= maxEnemies * 0.8) {
            return;
        }

        const utils = this.formationUtils || window.FormationUtils;
        if (!utils) return;

        // Get current wave number from spawner
        const waveNumber = this.game.spawner.waveNumber || 1;

        // Select formation type
        const config = utils.selectRandomFormation(waveNumber);
        if (!config) return; // No formations available for this wave

        // Get spawn position (off-screen)
        const spawnPos = utils.getFormationSpawnPosition(
            this.game.player,
            this.game.canvas.width,
            this.game.canvas.height
        );

        // Create formation
        const formation = {
            id: `formation_${Date.now()}_${Math.random()}`,
            config: config,
            center: { x: spawnPos.x, y: spawnPos.y },
            rotation: spawnPos.initialAngle || 0,
            enemies: [],
            active: true,
            time: 0 // For pulse effects
        };

        // Spawn enemies for this formation
        this.spawnFormationEnemies(formation);

        // Add to active formations
        this.formations.push(formation);

        if (window.logger?.isDebugEnabled?.('formations')) {
            window.logger.log('[FormationManager] Spawned formation:', config.name, 'at wave', waveNumber);
        }
    }

    /**
     * Spawn enemies for a formation
     * @param {Object} formation - Formation object
     */
    spawnFormationEnemies(formation) {
        const config = formation.config;
        const positions = config.getPositions(
            formation.center.x,
            formation.center.y,
            formation.rotation,
            formation.time
        );

        // Get random enemy type (or use fast enemies for LINE_WEDGE)
        const preferFastEnemies = config.id === 'line_wedge';

        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];

            // Select enemy type based on formation config or position hint
            let enemyType;

            if (pos.type) {
                // Use specific type from position config (e.g. 'tank' for nucleus)
                enemyType = pos.type;
            } else if (preferFastEnemies) {
                // Use fast enemy types for wedge formation
                const fastTypes = ['dasher', 'fast'];
                const availableFast = fastTypes.filter(type =>
                    this.game.spawner?.availableEnemyTypes?.includes(type)
                );
                enemyType = availableFast.length > 0
                    ? availableFast[Math.floor(Math.random() * availableFast.length)]
                    : this.game.spawner?.getRandomEnemyType();
            } else {
                enemyType = this.game.spawner?.getRandomEnemyType();
            }

            // Create enemy
            const enemy = this.game.spawner?.createEnemy(enemyType, pos.x, pos.y);
            if (!enemy) continue;

            // Mark enemy as part of formation
            enemy.formationId = formation.id;
            enemy.formationIndex = i;
            enemy.formationIsLeader = pos.isLeader || false;

            // [MUTUAL EXCLUSIVITY] Ensure enemy can't be in constellation while in formation
            enemy.constellation = null;
            delete enemy.constellationAnchor;
            delete enemy.constellationJoinedAt;

            // Add to game
            this.game.addEntity(enemy);
            formation.enemies.push(enemy);
        }
    }

    /**
     * Update a single formation
     * @param {Object} formation - Formation to update
     * @param {number} deltaTime - Time delta
     */
    updateFormation(formation, deltaTime) {
        const config = formation.config;

        // Update formation time (for pulse effects)
        formation.time += deltaTime;

        // Update rotation - speed up when close to player for dramatic effect
        const dx = this.game.player.x - formation.center.x;
        const dy = this.game.player.y - formation.center.y;
        const distance = Math.hypot(dx, dy);
        
        // Rotation speeds up as formation approaches break distance
        const proximityRatio = Math.max(0, 1 - distance / (config.breakDistance * 2));
        const rotationBoost = 1 + proximityRatio * 1.5; // Up to 2.5x rotation when close
        formation.rotation += config.rotationSpeed * rotationBoost * deltaTime;

        // Check if formation should break
        if (distance < config.breakDistance) {
            this.breakFormation(formation);
            return;
        }

        // Move center toward player - accelerate when closer
        if (distance > 0) {
            const speedBoost = 1 + proximityRatio * 0.5; // Up to 1.5x speed when close
            const moveAmount = config.moveSpeed * speedBoost * deltaTime;
            formation.center.x += (dx / distance) * moveAmount;
            formation.center.y += (dy / distance) * moveAmount;
        }

        // Update enemy positions
        this.updateEnemyPositions(formation, deltaTime);

        // Note: Separation is now handled by the global atomic forces in EnemyMovement
        // We don't need to apply it twice here

        // Check if formation is still valid (enemies alive)
        this.validateFormation(formation);
    }

    /**
     * Update positions of enemies in formation
     * Uses steering behaviors to guide enemies to their formation slots
     * while allowing atomic physics to handle local interactions.
     * 
     * @param {Object} formation - Formation object
     * @param {number} deltaTime - Time delta
     */
    updateEnemyPositions(formation, deltaTime) {
        // [REFACTORED] Formation forces are now applied by EnemyMovement.applyManagedStructureForces()
        // This method only updates formation state (center, rotation, time) and validates enemies
        // The actual force application happens during each enemy's movement update to avoid
        // the timing issue where forces were reset before being applied.
        
        // Validate enemies are still alive
        for (let i = formation.enemies.length - 1; i >= 0; i--) {
            const enemy = formation.enemies[i];
            if (!enemy || enemy.isDead) {
                formation.enemies.splice(i, 1);
            }
        }
    }

    /**
     * Validate formation (remove dead enemies, deactivate if too few remain)
     * @param {Object} formation - Formation to validate
     */
    validateFormation(formation) {
        // Remove dead enemies from formation
        formation.enemies = formation.enemies.filter(enemy =>
            enemy && !enemy.isDead
        );

        // Deactivate formation if too few enemies remain
        const minEnemies = Math.ceil(formation.config.enemyCount * 0.3); // 30% threshold
        if (formation.enemies.length < minEnemies) {
            this.breakFormation(formation);
        }
    }

    /**
     * Break formation (enemies now move independently)
     * @param {Object} formation - Formation to break
     */
    breakFormation(formation) {
        formation.active = false;

        // Trigger shatter effects
        if (this.effects) {
            this.effects.onFormationBroken(formation);
        }

        // Remove formation markers from enemies
        for (const enemy of formation.enemies) {
            if (enemy && !enemy.isDead) {
                delete enemy.formationId;
                delete enemy.formationIndex;
                delete enemy.formationIsLeader;
            }
        }

        if (window.logger?.isDebugEnabled?.('formations')) {
            window.logger.log('[FormationManager] Formation broken:', formation.config.name);
        }
    }

    /**
     * Render formation visual elements (optional)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (!this.enabled) return;

        // Check performance mode to determine visual fidelity
        // Use GameEngine's performance flags if available
        const pm = this.game.performanceManager;
        const isLowPerf = this.game.performanceMode ||
            this.game.lowPerformanceMode ||
            (pm && (pm.performanceMode || pm.lowPerformanceMode || pm.lowGpuMode));

        for (const formation of this.formations) {
            if (!formation.active) continue;

            // Render formation center marker
            if (this.showFormationMarkers) {
                this.renderFormationMarker(ctx, formation);
            }

            // Render connecting lines between formation enemies
            // ALWAYS show now (not just when enabled) for better visual feedback
            if (formation.enemies.length > 1) {
                this.renderConnectingLines(ctx, formation);
            }
        }

        // Render effects (particles, beams, explosions)
        if (this.effects) {
            this.effects.render(ctx);
        }
    }

    /**
     * Render connecting lines between formation enemies
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} formation - Formation object
     */
    renderConnectingLines(ctx, formation) {
        ctx.save();

        // Pulsing effect based on formation time
        const pulse = 0.6 + Math.sin(formation.time * 2) * 0.4;
        const alpha = 0.15 * pulse;

        ctx.strokeStyle = `rgba(0, 255, 153, ${alpha})`;
        ctx.lineWidth = 1.5;

        const enemies = formation.enemies.filter(e => e && !e.isDead);

        // Draw lines between adjacent enemies
        for (let i = 0; i < enemies.length; i++) {
            const next = (i + 1) % enemies.length;
            const e1 = enemies[i];
            const e2 = enemies[next];

            if (e1 && e2) {
                ctx.beginPath();
                ctx.moveTo(e1.x, e1.y);
                ctx.lineTo(e2.x, e2.y);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Get debug info for performance monitoring
     * @returns {Object} Debug stats
     */
    getDebugStats() {
        return {
            activeFormations: this.formations.length,
            totalEnemies: this.formations.reduce((sum, f) => sum + f.enemies.length, 0),
            updateTimeMs: this.formationUpdateTime.toFixed(2),
            nextSpawnIn: (this.spawnInterval - this.spawnTimer).toFixed(1)
        };
    }

    /**
     * Reset formation manager
     */
    reset() {
        // Break all active formations
        for (const formation of this.formations) {
            this.breakFormation(formation);
        }

        this.formations = [];
        this.spawnTimer = 0;
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.FormationManager = FormationManager;

    if (window.logger) {
        window.logger.log('FormationManager class loaded');
    }
}

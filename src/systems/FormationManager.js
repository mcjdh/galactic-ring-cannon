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
        this.maxFormations = 5; // BUFFED: Was 3 - More simultaneous formations
        this.spawnTimer = 0;
        this.spawnInterval = 5; // BUFFED: Was 8 - Spawn formations more frequently
        this.enabled = true;

        // Performance tracking
        this.formationUpdateTime = 0;

        // Visual settings (can be disabled for performance)
        this.showFormationMarkers = true;
        this.showConnectingLines = false; // Disabled by default for performance
    }

    /**
     * Update all active formations
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.enabled || !this.game.player) return;

        const startTime = performance.now();

        // Update spawn timer
        this.spawnTimer += deltaTime;

        // Try to spawn new formation if timer expired and under limit
        if (this.spawnTimer >= this.spawnInterval && this.formations.length < this.maxFormations) {
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

            // Select enemy type based on formation
            let enemyType;
            if (preferFastEnemies) {
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

        // Update rotation
        formation.rotation += config.rotationSpeed * deltaTime;

        // Move formation center toward player
        const dx = this.game.player.x - formation.center.x;
        const dy = this.game.player.y - formation.center.y;
        const distance = Math.hypot(dx, dy);

        // Check if formation should break
        if (distance < config.breakDistance) {
            this.breakFormation(formation);
            return;
        }

        // Move center toward player
        if (distance > 0) {
            const moveAmount = config.moveSpeed * deltaTime;
            formation.center.x += (dx / distance) * moveAmount;
            formation.center.y += (dy / distance) * moveAmount;
        }

        // Update enemy positions
        this.updateEnemyPositions(formation, deltaTime);

        // Check if formation is still valid (enemies alive)
        this.validateFormation(formation);
    }

    /**
     * Update positions of enemies in formation
     * @param {Object} formation - Formation object
     * @param {number} deltaTime - Time delta
     */
    updateEnemyPositions(formation, deltaTime) {
        const config = formation.config;
        const positions = config.getPositions(
            formation.center.x,
            formation.center.y,
            formation.rotation,
            formation.time
        );

        for (let i = 0; i < formation.enemies.length; i++) {
            const enemy = formation.enemies[i];
            if (!enemy || enemy.isDead) continue;

            const targetPos = positions[i];
            if (!targetPos) continue;

            // Smoothly move enemy toward formation position
            // This creates the "swarm" effect
            const dx = targetPos.x - enemy.x;
            const dy = targetPos.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 5) { // Only move if not already at position
                const moveSpeed = 200; // Smooth follow speed
                const moveDist = Math.min(dist, moveSpeed * deltaTime);
                enemy.x += (dx / dist) * moveDist;
                enemy.y += (dy / dist) * moveDist;
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
        const isLowPerf = this.game.performanceMode || 
                          this.game.lowPerformanceMode || 
                          (this.game.performanceManager && this.game.performanceManager.isLowPerformance());

        for (const formation of this.formations) {
            if (!formation.active) continue;

            // Render formation center marker
            if (this.showFormationMarkers) {
                this.renderFormationMarker(ctx, formation);
            }

            // Render connecting lines between formation enemies
            // Show if explicitly enabled OR if we have performance headroom (geometric vibes)
            if ((this.showConnectingLines || !isLowPerf) && formation.enemies.length > 1) {
                this.renderConnectingLines(ctx, formation);
            }
        }
    }

    /**
     * Render formation center marker (faint wireframe icon)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} formation - Formation object
     */
    renderFormationMarker(ctx, formation) {
        const { x, y } = formation.center;
        const config = formation.config;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 153, 0.15)'; // Faint neon green
        ctx.lineWidth = 1;

        // Draw simple geometric marker based on formation type
        const size = 15;

        if (config.id === 'cubic_swarm') {
            // Draw square (cube projection)
            ctx.strokeRect(x - size, y - size, size * 2, size * 2);
        } else if (config.id === 'pyramid_squadron') {
            // Draw triangle
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.lineTo(x + size, y + size);
            ctx.closePath();
            ctx.stroke();
        } else if (config.id === 'octahedron_ring') {
            // Draw hexagon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + formation.rotation;
                const px = x + Math.cos(angle) * size;
                const py = y + Math.sin(angle) * size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else {
            // Default: circle
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render connecting lines between formation enemies
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} formation - Formation object
     */
    renderConnectingLines(ctx, formation) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 153, 0.1)'; // Very faint neon
        ctx.lineWidth = 0.5;

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

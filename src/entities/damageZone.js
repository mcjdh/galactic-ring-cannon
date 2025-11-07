// Shared constants for damage zone types
const DAMAGE_ZONE_TYPE_COLORS = {
    standard: '#e74c3c',
    burst: '#ff6b35',
    persistent: '#c0392b',
    expanding: '#e67e22',
    corrupted: '#8e44ad'
};

/**
 * Telegraph - Warning indicator before damage zone spawns
 */
class DamageZoneTelegraph {
    constructor(x, y, radius, duration = 0.7, zoneType = 'standard') {
        this.x = x;
        this.y = y;
        this.type = 'damageZoneTelegraph';
        this.radius = radius;
        this.duration = duration;
        this.timer = 0;
        this.isDead = false;
        this.zoneType = zoneType;

        // Visual properties based on zone type
        this.color = DAMAGE_ZONE_TYPE_COLORS[zoneType] || DAMAGE_ZONE_TYPE_COLORS.standard;
    }

    update(deltaTime, game) {
        this.timer += deltaTime;
        if (this.timer >= this.duration) {
            this.isDead = true;
        }
    }

    render(ctx) {
        const alpha = Math.min(1, this.timer / this.duration);
        const pulse = 0.8 + 0.2 * Math.sin(this.timer * 12);

        // Pulsing circle outline
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = DamageZone._colorWithAlpha(this.color, alpha * 0.8);
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshair in center
        const crossSize = 10;
        ctx.beginPath();
        ctx.moveTo(this.x - crossSize, this.y);
        ctx.lineTo(this.x + crossSize, this.y);
        ctx.moveTo(this.x, this.y - crossSize);
        ctx.lineTo(this.x, this.y + crossSize);
        ctx.strokeStyle = DamageZone._colorWithAlpha(this.color, alpha);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Filled circle that fades in
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = DamageZone._colorWithAlpha(this.color, alpha * 0.15);
        ctx.fill();
    }
}

class DamageZone {
    constructor(x, y, radius, damage, duration, zoneType = 'standard') {
        this.x = x;
        this.y = y;
        this.type = 'damageZone';
        this.radius = radius;
        this.damage = damage;
        this.damagePerSecond = damage; // Apply damage per second
        this.duration = duration;
        this.timer = 0;
        this.isDead = false;
        this.zoneType = zoneType; // NEW: Zone type variant

        // Type-specific properties
        this._initializeZoneType(zoneType);

        // Animation properties
        this.pulseRate = 1.5; // Pulses per second
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase
        this.tickTimer = 0; // Timer for damage ticks
        this.tickInterval = 0.5; // Apply damage every half second

        // Expanding zone properties
        this.initialRadius = radius;
        this.maxRadius = radius;
    }

    /**
     * Configures this damage zone's properties based on the specified zone type.
     *
     * @param {string} zoneType - The type of the damage zone. Valid values are:
     *   - 'standard': Standard damage zone.
     *   - 'burst': Burst damage zone with faster pulse.
     *   - 'persistent': Persistent damage zone with slower pulse.
     *   - 'expanding': Expanding damage zone with increasing radius.
     *   - 'corrupted': Corrupted zone that can damage enemies at reduced rate.
     *
     * This method initializes or overrides the following properties on the instance:
     *   - color: Visual color of the zone.
     *   - damageEnemies: Whether the zone damages enemies.
     *   - enemyDamageMultiplier: Damage multiplier applied to enemies.
     *   - pulseRate: How quickly the zone pulses (if applicable).
     *   - expandRate: How quickly the zone expands (if applicable).
     */
    _initializeZoneType(zoneType) {
        const typeConfigs = {
            standard: {
                color: DAMAGE_ZONE_TYPE_COLORS.standard,
                damageEnemies: false,
                enemyDamageMultiplier: 0
            },
            burst: {
                color: DAMAGE_ZONE_TYPE_COLORS.burst,
                damageEnemies: false,
                enemyDamageMultiplier: 0,
                pulseRate: 2.5
            },
            persistent: {
                color: DAMAGE_ZONE_TYPE_COLORS.persistent,
                damageEnemies: false,
                enemyDamageMultiplier: 0,
                pulseRate: 1.0
            },
            expanding: {
                color: DAMAGE_ZONE_TYPE_COLORS.expanding,
                damageEnemies: false,
                enemyDamageMultiplier: 0,
                expandRate: 1.3 // Multiplier per second
            },
            corrupted: {
                color: DAMAGE_ZONE_TYPE_COLORS.corrupted,
                damageEnemies: true,
                enemyDamageMultiplier: 0.5, // Enemies take 50% damage
                pulseRate: 2.0
            }
        };

        const config = typeConfigs[zoneType] || typeConfigs.standard;
        this.color = config.color;
        this.damageEnemies = config.damageEnemies;
        this.enemyDamageMultiplier = config.enemyDamageMultiplier;
        this.pulseRate = config.pulseRate || 1.5;
        this.expandRate = config.expandRate || 0;
    }

    /**
     * Checks if an entity is within the damage zone's radius.
     *
     * @param {Object} entity - The entity to check (must have x, y, and optionally radius properties).
     * @returns {boolean} True if the entity is within the zone's radius.
     */
    _isEntityWithinRadius(entity) {
        if (!entity) return false;
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const entityRadius = entity.radius ?? 0;
        return distance < this.radius + entityRadius;
    }
    
    update(deltaTime, game) {
        // Update timers
        this.timer += deltaTime;
        this.tickTimer += deltaTime;

        // Handle expanding zones
        if (this.expandRate > 0) {
            // Clamp to maximum expanded radius (initialRadius * expandRate)
            this.radius = Math.min(
                this.initialRadius * this.expandRate,
                this.initialRadius + (this.initialRadius * (this.expandRate - 1) * (this.timer / this.duration))
            );
        }

        // Check if damage zone should expire
        if (this.timer >= this.duration) {
            this.isDead = true;
            return;
        }

        // Apply damage at intervals
        const gm = window.gameManager;

        if (this.tickTimer >= this.tickInterval) {
            this.tickTimer = 0;

            // Damage player
            if (game.player && !game.player.isDead) {
                if (this._isEntityWithinRadius(game.player)) {
                    const tickDamage = this.damagePerSecond * this.tickInterval;
                    game.player.takeDamage(tickDamage);

                    if (gm?.createHitEffect) {
                        gm.createHitEffect(game.player.x, game.player.y, tickDamage);
                    }
                }
            }

            // Damage enemies if this is a corrupted zone
            if (this.damageEnemies && game.getEnemiesWithinRadius) {
                const enemies = game.getEnemiesWithinRadius(this.x, this.y, this.radius, {
                    includeDead: false
                });

                enemies.forEach(enemy => {
                    if (enemy && !enemy.isDead && enemy.takeDamage) {
                        if (this._isEntityWithinRadius(enemy)) {
                            const tickDamage = this.damagePerSecond * this.tickInterval * this.enemyDamageMultiplier;
                            enemy.takeDamage(tickDamage);

                            if (gm?.createHitEffect) {
                                gm.createHitEffect(enemy.x, enemy.y, tickDamage);
                            }
                        }
                    }
                });
            }
        }

        // Create particles occasionally (less frequent for persistent zones)
        const particleRate = this.zoneType === 'persistent' ? 3 : 5;
        if (Math.random() < deltaTime * particleRate) {
            this.createParticle();
        }
    }
    
    createParticle() {
        // Only create particle if gameManager exists and visuals are allowed
        const gm = window.gameManager;
        if (!gm || gm.lowQuality) return;

        // Random position within the zone
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.radius * 0.8;
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;

        if (gm._spawnParticleViaPoolOrFallback?.(
            x,
            y,
            (Math.random() - 0.5) * 10,
            -30 - Math.random() * 20,
            2 + Math.random() * 3,
            this.color,
            0.5 + Math.random() * 0.5,
            'smoke'
        )) {
            return;
        }

        if (window.optimizedParticles?.spawnParticle) {
            window.optimizedParticles.spawnParticle({
                x,
                y,
                vx: (Math.random() - 0.5) * 10,
                vy: -30 - Math.random() * 20,
                size: 2 + Math.random() * 3,
                color: this.color,
                life: 0.5 + Math.random() * 0.5,
                type: 'smoke'
            });
        } else if (gm.addParticleViaEffectsManager && typeof Particle !== 'undefined') {
            const particle = new Particle(
                x,
                y,
                (Math.random() - 0.5) * 10,
                -30 - Math.random() * 20,
                2 + Math.random() * 3,
                this.color,
                0.5 + Math.random() * 0.5
            );
            gm.addParticleViaEffectsManager(particle);
        }
    }
    
    render(ctx) {
        // Calculate pulse factor
        const pulseFactor = 1 + 0.2 * Math.sin(this.pulseRate * this.timer * Math.PI * 2 + this.pulsePhase);

        // Draw outer glow
        const alpha = this.timer > (this.duration * 0.7) ?
            0.6 * (1 - (this.timer - this.duration * 0.7) / (this.duration * 0.3)) :
            0.6;

        // Special visual for corrupted zones (purple with darker core)
        if (this.zoneType === 'corrupted') {
            ctx.fillStyle = DamageZone._colorWithAlpha(this.color, alpha * 0.35);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * pulseFactor, 0, Math.PI * 2);
            ctx.fill();

            // Inner darker zone
            ctx.fillStyle = DamageZone._colorWithAlpha('#5b2c6f', alpha * 0.2);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5 * pulseFactor, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = DamageZone._colorWithAlpha(this.color, alpha * 0.25);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * pulseFactor, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw border (thicker for burst zones)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.95 * pulseFactor, 0, Math.PI * 2);
        ctx.strokeStyle = DamageZone._colorWithAlpha(this.color, alpha);
        ctx.lineWidth = this.zoneType === 'burst' ? 3 : 2;
        ctx.stroke();

        // Draw warning pattern (concentric circles)
        const circleCount = this.zoneType === 'expanding' ? 4 : 3;
        for (let i = 0; i < circleCount; i++) {
            const radiusFactor = 0.3 + (i * 0.25);
            ctx.beginPath();
            ctx.arc(
                this.x,
                this.y,
                this.radius * radiusFactor * pulseFactor,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = DamageZone._colorWithAlpha(this.color, alpha * 0.5);
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw type-specific center symbol
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.timer * Math.PI);

        if (this.zoneType === 'corrupted') {
            // Skull symbol for corrupted
            ctx.beginPath();
            ctx.arc(0, -5, 8, 0, Math.PI * 2);
            ctx.arc(-4, 0, 2, 0, Math.PI * 2);
            ctx.arc(4, 0, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        } else {
            // Exclamation mark for others
            ctx.beginPath();
            ctx.rect(-3, -15, 6, 20);
            ctx.arc(0, 10, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        }

        ctx.restore();
    }
}

/**
 * Damage Zone Pattern Generator
 * Creates interesting spawn patterns instead of just "under player"
 */
class DamageZonePatterns {
    // Pattern distance constants
    static MIN_SPEED_FOR_PREDICTION = 10;
    static SCATTER_MIN_DIST = 80;
    static SCATTER_MAX_DIST = 200;
    static SPIRAL_START_DIST = 100;
    static SPIRAL_SPACING = 40;
    static BARRIER_SPACING = 90;
    static CLUSTER_RADIUS = 50;
    static CHASE_MIN_DIST = 60;
    static CHASE_SPACING = 80;
    static RING_RADIUS = 150;

    /**
     * Predictive - spawns where player is moving towards.
     * Calculates player velocity and predicts their position 0.7-1.5 seconds ahead.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn.
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static predictive(game, enemy, count = 1) {
        if (!game.player) return [];

        const player = game.player;
        const positions = [];

        // Calculate player velocity direction
        const vx = player.vx || 0;
        const vy = player.vy || 0;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > this.MIN_SPEED_FOR_PREDICTION) {
            // Predict where player will be in 0.5-1.5 seconds
            for (let i = 0; i < count; i++) {
                const predictionTime = 0.7 + (i * 0.4);
                positions.push({
                    x: player.x + vx * predictionTime,
                    y: player.y + vy * predictionTime
                });
            }
        } else {
            // Player standing still, spawn around them
            return this.scatter(game, enemy, count);
        }

        return positions;
    }

    /**
     * Scatter - multiple zones randomly around player.
     * Creates a random spread of zones at varying distances from the player.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn (default: 3).
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static scatter(game, enemy, count = 3) {
        if (!game.player) return [];

        const player = game.player;
        const positions = [];

        for (let i = 0; i < count; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const distance = this.SCATTER_MIN_DIST + Math.random() * (this.SCATTER_MAX_DIST - this.SCATTER_MIN_DIST);

            positions.push({
                x: player.x + Math.cos(angle) * distance,
                y: player.y + Math.sin(angle) * distance
            });
        }

        return positions;
    }

    /**
     * Spiral - zones in spiral pattern from boss.
     * Creates an elegant spiral pattern emanating from the enemy toward the player.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn (default: 5).
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static spiral(game, enemy, count = 5) {
        if (!game.player) return [];

        const positions = [];
        const startAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);

        for (let i = 0; i < count; i++) {
            const angle = startAngle + (i * Math.PI * 0.4);
            const distance = this.SPIRAL_START_DIST + (i * this.SPIRAL_SPACING);

            positions.push({
                x: enemy.x + Math.cos(angle) * distance,
                y: enemy.y + Math.sin(angle) * distance
            });
        }

        return positions;
    }

    /**
     * Barrier - line of zones to cut off escape routes.
     * Creates a perpendicular line of zones between the enemy and player.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn (default: 4).
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static barrier(game, enemy, count = 4) {
        if (!game.player) return [];

        const player = game.player;
        const positions = [];

        // Create perpendicular line to player-enemy direction
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;

        const startX = player.x - Math.cos(perpAngle) * (this.BARRIER_SPACING * (count - 1) / 2);
        const startY = player.y - Math.sin(perpAngle) * (this.BARRIER_SPACING * (count - 1) / 2);

        for (let i = 0; i < count; i++) {
            positions.push({
                x: startX + Math.cos(perpAngle) * this.BARRIER_SPACING * i,
                y: startY + Math.sin(perpAngle) * this.BARRIER_SPACING * i
            });
        }

        return positions;
    }

    /**
     * Cluster - tight group at player position.
     * Forces player to reposition by creating a tight cluster of zones.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn (default: 3).
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static cluster(game, enemy, count = 3) {
        if (!game.player) return [];

        const player = game.player;
        const positions = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push({
                x: player.x + Math.cos(angle) * this.CLUSTER_RADIUS,
                y: player.y + Math.sin(angle) * this.CLUSTER_RADIUS
            });
        }

        return positions;
    }

    /**
     * Chase - spawn behind player's movement.
     * Spawns zones in the direction opposite to player movement, chasing them.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn (default: 2).
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static chase(game, enemy, count = 2) {
        if (!game.player) return [];

        const player = game.player;
        const positions = [];

        // Get player movement direction
        const vx = player.vx || 0;
        const vy = player.vy || 0;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > this.MIN_SPEED_FOR_PREDICTION) {
            // Spawn behind movement
            const angle = Math.atan2(vy, vx) + Math.PI; // Opposite direction

            for (let i = 0; i < count; i++) {
                const distance = this.CHASE_MIN_DIST + (i * this.CHASE_SPACING);
                positions.push({
                    x: player.x + Math.cos(angle) * distance,
                    y: player.y + Math.sin(angle) * distance
                });
            }
        } else {
            // Default to cluster if not moving
            return this.cluster(game, enemy, count);
        }

        return positions;
    }

    /**
     * Ring - zones in circle around player.
     * Creates a ring of zones encircling the player at a fixed radius.
     *
     * @param {Object} game - The game instance containing player and enemy data.
     * @param {Object} enemy - The enemy spawning the damage zone.
     * @param {number} count - Number of zones to spawn (default: 6).
     * @returns {Array<{x: number, y: number}>} Array of position objects with x, y properties.
     */
    static ring(game, enemy, count = 6) {
        if (!game.player) return [];

        const player = game.player;
        const positions = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push({
                x: player.x + Math.cos(angle) * this.RING_RADIUS,
                y: player.y + Math.sin(angle) * this.RING_RADIUS
            });
        }

        return positions;
    }
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.DamageZone = DamageZone;
    window.Game.DamageZoneTelegraph = DamageZoneTelegraph;
    window.Game.DamageZonePatterns = DamageZonePatterns;
    window.Game.DAMAGE_ZONE_TYPE_COLORS = DAMAGE_ZONE_TYPE_COLORS;
}

DamageZone._alphaColorCache = new Map();
DamageZone._parsedColorCache = new Map();

DamageZone._colorWithAlpha = function(color, alpha) {
    const key = `${color}|${alpha}`;
    const cache = DamageZone._alphaColorCache;
    if (cache.has(key)) {
        return cache.get(key);
    }
    const parsed = DamageZone._parseColor(color);
    const value = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
    cache.set(key, value);
    return value;
};

DamageZone._parseColor = function(color) {
    const cache = DamageZone._parsedColorCache;
    if (cache.has(color)) {
        return cache.get(color);
    }
    const parsed = DamageZone._extractRGBComponents(color);
    cache.set(color, parsed);
    return parsed;
};

DamageZone._extractRGBComponents = function(color) {
    const clamp = (value) => {
        const num = parseFloat(value);
        if (!Number.isFinite(num)) return 255;
        return Math.max(0, Math.min(255, Math.round(num)));
    };

    if (typeof color === 'string') {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            }
            if (hex.length >= 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16)
                };
            }
        } else {
            const rgbaMatch = color.match(/^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)(?:\s*,\s*[0-9]+(?:\.[0-9]+)?)?\s*\)$/i);
            if (rgbaMatch) {
                return {
                    r: clamp(rgbaMatch[1]),
                    g: clamp(rgbaMatch[2]),
                    b: clamp(rgbaMatch[3])
                };
            }
        }
    }

    return { r: 255, g: 255, b: 255 };
};

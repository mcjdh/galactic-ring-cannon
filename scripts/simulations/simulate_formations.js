
const fs = require('fs');

// --- Mocks ---

class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    add(entity) {
        const key = this.getKey(entity.x, entity.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
    }

    get(key) {
        return this.cells.get(key);
    }

    getKey(x, y) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        return `${gx},${gy}`;
    }
    
    // Helper for the atomic forces loop
    getNeighbors(entity) {
        const gx = Math.floor(entity.x / this.cellSize);
        const gy = Math.floor(entity.y / this.cellSize);
        let neighbors = [];
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                const key = `${gx + x},${gy + y}`;
                const cell = this.cells.get(key);
                if (cell) {
                    neighbors = neighbors.concat(cell);
                }
            }
        }
        return neighbors;
    }
}

class Enemy {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.type = 'enemy';
        this.isDead = false;
        this.formationId = null;
        this.movement = {
            velocity: { x: 0, y: 0 },
            speed: 100,
            enemy: this // Circular reference for the mixin
        };
        // Bind the mixin methods to the movement object
        this.movement.applyAtomicForces = applyAtomicForces.bind(this.movement);
    }
}

// --- Physics Logic (Synced with EnemyMovement.js) ---
// Updated to match the latest atomic forces implementation

function applyAtomicForces(deltaTime, game) {
    // Only apply if spatial grid is available and enemy is active
    if (!game.spatialGrid || !this.enemy || this.enemy.isDead) return;

    const isInConstellation = !!this.enemy.constellation;
    const isInFormation = !!this.enemy.formationId;

    // Atomic parameters - synced with EnemyMovement.js
    const myRadius = this.enemy.radius || 15;
    const equilibriumMultiplier = isInConstellation ? 2.8 : 2.2; // Larger spacing in constellations
    const atomicRadius = myRadius * equilibriumMultiplier; // Equilibrium distance
    const interactionRadius = atomicRadius * 2.5; // Extended cutoff
    const interactionRadiusSq = interactionRadius * interactionRadius;
    
    // Force constants - synced with EnemyMovement.js
    const repulsionStrength = 1200;
    const bondStrength = isInConstellation ? 35 : 50;
    const constellationCohesion = 40;
    const dampingFactor = 8.0;

    // Get neighbors from our mock grid
    const neighbors = game.spatialGrid.getNeighbors(this.enemy);

    for (let i = 0; i < neighbors.length; i++) {
        const other = neighbors[i];
        
        // Skip self, dead, or non-enemies
        if (other === this.enemy || other.isDead || other.type !== 'enemy') continue;

        const dx = this.enemy.x - other.x;
        const dy = this.enemy.y - other.y;
        const distSq = dx * dx + dy * dy;

        // Only interact within cutoff radius
        if (distSq < interactionRadiusSq && distSq > 0.1) {
            const dist = Math.sqrt(distSq);
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Use average radius for interaction calculations
            const otherRadius = other.radius || 15;
            const avgRadius = (myRadius + otherRadius) / 2;
            const pairAtomicRadius = avgRadius * equilibriumMultiplier;
            
            // Lennard-Jones Potential Derivative (Force)
            let force = 0;
            
            if (dist < pairAtomicRadius) {
                // Strong repulsion (1/r^2 falloff approximation)
                const overlap = pairAtomicRadius - dist;
                // Exponential ramp up for very close encounters (Hard Shell)
                const hardness = 1 + (overlap / pairAtomicRadius) * 2;
                force = repulsionStrength * (overlap / pairAtomicRadius) * hardness;

                // Direct Position Correction (prevent stacking)
                const minSeparation = myRadius + otherRadius;
                if (dist < minSeparation) {
                    const pushOut = (minSeparation - dist) * 0.4;
                    this.enemy.x += dirX * pushOut;
                    this.enemy.y += dirY * pushOut;
                    
                    const velDot = this.velocity.x * dirX + this.velocity.y * dirY;
                    if (velDot < 0) {
                        this.velocity.x -= dirX * velDot * 0.8;
                        this.velocity.y -= dirY * velDot * 0.8;
                    }
                }
            } else {
                // Attraction zone
                const stretch = dist - pairAtomicRadius;
                const normalizedStretch = stretch / pairAtomicRadius;
                
                if (isInConstellation || isInFormation) {
                    // Formation/constellation members get cohesion
                    const sameGroup = (isInFormation && other.formationId === this.enemy.formationId);
                    if (sameGroup) {
                        const cohesionRamp = Math.min(1.0, normalizedStretch * 1.5);
                        force = -constellationCohesion * cohesionRamp;
                    } else if (normalizedStretch > 0.5) {
                        force = -bondStrength * 0.3 * normalizedStretch;
                    }
                } else {
                    // Free atoms get normal bonding
                    force = -bondStrength * normalizedStretch;
                }
            }

            // Apply force
            if (Math.abs(force) > 0.01) {
                const accelX = dirX * force * deltaTime;
                const accelY = dirY * force * deltaTime;

                this.velocity.x += accelX;
                this.velocity.y += accelY;
            }

            // Apply damping based on relative velocity (friction)
            if (other.movement && other.movement.velocity) {
                const relVelX = this.velocity.x - other.movement.velocity.x;
                const relVelY = this.velocity.y - other.movement.velocity.y;
                
                const relVelDot = relVelX * dirX + relVelY * dirY;
                
                if (Math.abs(relVelDot) > 0.1) {
                    const dampScale = dampingFactor * deltaTime;
                    const distanceFactor = Math.max(0.5, 1.0 - (dist / interactionRadius) * 0.5);
                    const dampX = dirX * relVelDot * dampScale * distanceFactor;
                    const dampY = dirY * relVelDot * dampScale * distanceFactor;
                    
                    this.velocity.x -= dampX;
                    this.velocity.y -= dampY;
                }
            }
        }
    }
}

// --- Formation Logic (Simplified from FormationManager.js) ---

const CUBIC_SWARM_CONFIG = {
    radius: 60,
    getPositions(centerX, centerY, rotation, time = 0) {
        const pulse = 1 + Math.sin(time * 2) * 0.1;
        const r = this.radius * pulse;
        
        const positions = [];
        const angles = [
            { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
            { x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 }, { x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 }
        ];

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        for (const offset of angles) {
            const x = offset.x * cos - offset.y * sin;
            const y = offset.x * sin + offset.y * cos;
            positions.push({ x: centerX + x * r, y: centerY + y * r });
        }
        return positions;
    }
};

function updateFormationPositions(formation, enemies, deltaTime) {
    const positions = CUBIC_SWARM_CONFIG.getPositions(
        formation.center.x,
        formation.center.y,
        formation.rotation,
        formation.time
    );

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const targetPos = positions[i];
        
        // Calculate vector to target slot
        const dx = targetPos.x - enemy.x;
        const dy = targetPos.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        // Apply "Spring Force"
        if (dist > 5) {
            const springStrength = 8.0; // Increased from 4.0
            const desiredSpeed = enemy.movement.speed * 1.5;
            const targetVelX = (dx / dist) * desiredSpeed;
            const targetVelY = (dy / dist) * desiredSpeed;

            const steerX = (targetVelX - enemy.movement.velocity.x) * springStrength * deltaTime;
            const steerY = (targetVelY - enemy.movement.velocity.y) * springStrength * deltaTime;

            enemy.movement.velocity.x += steerX;
            enemy.movement.velocity.y += steerY;
        }
    }
    return positions; // Return for error calculation
}

// --- Simulation Loop ---

const game = {
    spatialGrid: new SpatialGrid(100),
    gridSize: 100,
    performanceMode: false
};

const enemies = [];
for (let i = 0; i < 8; i++) {
    enemies.push(new Enemy(i, 500 + Math.random()*10, 500 + Math.random()*10));
    enemies[i].formationId = 'sim_formation';
}

const formation = {
    center: { x: 500, y: 500 },
    rotation: 0,
    time: 0
};

console.log('Time(ms),AvgError,MinNeighborDist,MaxNeighborDist');

const DT = 0.016; // 60 FPS
const TOTAL_FRAMES = 600; // 10 seconds

for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const time = frame * DT;
    
    // Update Formation State
    formation.time += DT;
    formation.rotation += 0.3 * DT;
    formation.center.x += 10 * DT; // Slow drift

    // 1. Apply Formation Forces (Springs)
    const targetPositions = updateFormationPositions(formation, enemies, DT);

    // 2. Update Spatial Grid
    game.spatialGrid.clear();
    enemies.forEach(e => game.spatialGrid.add(e));

    // 3. Apply Physics (Repulsion)
    enemies.forEach(e => e.movement.applyAtomicForces(DT, game));

    // 4. Integrate Velocity
    enemies.forEach(e => {
        e.x += e.movement.velocity.x * DT;
        e.y += e.movement.velocity.y * DT;
        
        // Simple friction
        e.movement.velocity.x *= 0.95;
        e.movement.velocity.y *= 0.95;
    });

    // 5. Measure Metrics
    let totalError = 0;
    let minNeighborDist = 9999;
    let maxNeighborDist = 0;

    // Error from target slot
    for (let i = 0; i < enemies.length; i++) {
        const dx = enemies[i].x - targetPositions[i].x;
        const dy = enemies[i].y - targetPositions[i].y;
        totalError += Math.hypot(dx, dy);
    }
    const avgError = totalError / enemies.length;

    // Neighbor distances
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const dx = enemies[i].x - enemies[j].x;
            const dy = enemies[i].y - enemies[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < minNeighborDist) minNeighborDist = dist;
            if (dist > maxNeighborDist) maxNeighborDist = dist;
        }
    }

    if (frame % 10 === 0) {
        console.log(`${(time * 1000).toFixed(0)},${avgError.toFixed(2)},${minNeighborDist.toFixed(2)},${maxNeighborDist.toFixed(2)}`);
    }
}

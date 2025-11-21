
const fs = require('fs');

// --- Mocks ---

class Projectile {
    constructor(x, y, vx, vy, damage, radius, range) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = radius;
        this.range = range;
        this.distanceTraveled = 0;
        this.active = true;
    }

    update(dt) {
        const dx = this.vx * dt;
        const dy = this.vy * dt;
        this.x += dx;
        this.y += dy;
        this.distanceTraveled += Math.hypot(dx, dy);

        if (this.distanceTraveled > this.range) {
            this.active = false;
        }
    }
}

class Game {
    constructor() {
        this.projectiles = [];
    }

    spawnProjectile(x, y, config) {
        const p = new Projectile(
            x, y, 
            config.vx, config.vy, 
            config.damage, 
            5, // radius
            config.range
        );
        this.projectiles.push(p);
        return p;
    }
}

// --- Combat Logic (Copied from PlayerCombat.js) ---

function calculateProjectileAngle(baseAngle, projectileIndex, totalProjectiles, totalSpread) {
    if (totalProjectiles === 1) return baseAngle;
    if (totalProjectiles === 2) {
        return baseAngle + (projectileIndex === 0 ? -totalSpread / 2 : totalSpread / 2);
    }
    const spreadPerGap = totalSpread / (totalProjectiles - 1);
    const offsetFromCenter = (projectileIndex - (totalProjectiles - 1) / 2) * spreadPerGap;
    return baseAngle + offsetFromCenter;
}

function fireProjectile(game, player, angle, overrides = {}) {
    const projectileCount = overrides.projectileCount || player.projectileCount || 1;
    const spreadDegrees = overrides.spreadDegrees || player.projectileSpread || 0;
    const totalSpreadRadians = (spreadDegrees * Math.PI) / 180;
    const baseSpeed = 450;

    for (let i = 0; i < projectileCount; i++) {
        const projectileAngle = calculateProjectileAngle(angle, i, projectileCount, totalSpreadRadians);
        const vx = Math.cos(projectileAngle) * baseSpeed;
        const vy = Math.sin(projectileAngle) * baseSpeed;

        game.spawnProjectile(player.x, player.y, {
            vx, vy,
            damage: player.attackDamage,
            range: 1000
        });
    }
}

// --- Simulation ---

const GRID_SIZE = 50;
const CELL_SIZE = 20;
const MAP_SIZE = GRID_SIZE * CELL_SIZE; // 1000x1000

const grid = new Array(GRID_SIZE * GRID_SIZE).fill(0);

const player = {
    x: MAP_SIZE / 2,
    y: MAP_SIZE / 2,
    projectileCount: 1,
    projectileSpread: 0,
    attackDamage: 10
};

const game = new Game();

// CONFIGURATION: Simulate upgrades
// Example: Split Shot (+2 projectiles, +20 spread)
player.projectileCount = 3;
player.projectileSpread = 20;

console.log(`Simulating Weapon Fire: ${player.projectileCount} projectiles, ${player.projectileSpread} spread`);

const DT = 0.016;
const TOTAL_FRAMES = 600; // 10 seconds
const FIRE_RATE = 0.05; // 20 shots per second
let fireTimer = 0;

for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    // Fire Weapon (Rotating)
    fireTimer += DT;
    if (fireTimer >= FIRE_RATE) {
        fireTimer = 0;
        const angle = (frame / TOTAL_FRAMES) * Math.PI * 16; // Rotate 8 times
        fireProjectile(game, player, angle);
    }

    // Update Projectiles
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        p.update(DT);

        // Map to grid
        if (p.x >= 0 && p.x < MAP_SIZE && p.y >= 0 && p.y < MAP_SIZE) {
            const gx = Math.floor(p.x / CELL_SIZE);
            const gy = Math.floor(p.y / CELL_SIZE);
            const idx = gy * GRID_SIZE + gx;
            grid[idx] += p.damage * DT; // Damage per second density
        }

        if (!p.active) {
            game.projectiles.splice(i, 1);
        }
    }
}

// --- Visualization ---

console.log('\nWeapon DPS Heatmap (Center is Player):');
const symbols = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];

for (let y = 0; y < GRID_SIZE; y += 2) { // Skip lines for aspect ratio
    let line = '';
    for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x;
        const val = grid[idx];
        
        // Normalize value to 0-9
        let symbolIdx = 0;
        if (val > 0) {
            // Log scale: 0.1 -> 1, 1 -> 2, 10 -> 3, etc.
            symbolIdx = Math.min(symbols.length - 1, Math.floor(Math.log(val * 10 + 1)));
        }
        
        // Mark player center
        if (Math.abs(x - GRID_SIZE/2) < 2 && Math.abs(y - GRID_SIZE/2) < 2) {
            line += 'P';
        } else {
            line += symbols[symbolIdx];
        }
    }
    console.log(line);
}

/**
 * Formation Patterns Registry
 * 
 * Defines all constellation patterns used by EmergentFormationDetector.
 * Each pattern specifies how enemies arrange themselves into geometric shapes.
 * 
 * Pattern Properties:
 * - minEnemies: Minimum enemies required for this formation
 * - maxEnemies: Maximum enemies this formation can handle
 * - strength: Selection weight (higher = more likely to be chosen)
 * - getTargetPositions(centerX, centerY, enemies, rotation): Returns array of {x, y} positions
 */

const FORMATION_PATTERNS = {
    // LINE formation - enemies arrange in a straight line facing player
    LINE: {
        name: 'LINE',
        minEnemies: 4,
        maxEnemies: 5,
        strength: 0.4,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const spacing = 50;  // Reduced from 60 for tighter line
            const count = enemies.length;
            const totalWidth = spacing * (count - 1);
            const startOffset = -totalWidth / 2;

            // Line perpendicular to rotation (facing direction)
            const perpAngle = rotation + Math.PI / 2;
            const positions = [];

            for (let i = 0; i < count; i++) {
                const offset = startOffset + i * spacing;
                positions.push({
                    x: centerX + Math.cos(perpAngle) * offset,
                    y: centerY + Math.sin(perpAngle) * offset
                });
            }
            return positions;
        }
    },
    ARROW: {
        name: 'ARROW',
        minEnemies: 3,
        maxEnemies: 3,
        strength: 0.35,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            // Arrow pointing in rotation direction with clear V shape behind
            const tipDist = 55;  // Reduced for tighter formation
            const wingDist = 50;
            const wingAngle = Math.PI * 0.75;  // 135 degrees back from tip

            const tipX = centerX + Math.cos(rotation) * tipDist;
            const tipY = centerY + Math.sin(rotation) * tipDist;

            return [
                { x: tipX, y: tipY },
                {
                    x: centerX + Math.cos(rotation + wingAngle) * wingDist,
                    y: centerY + Math.sin(rotation + wingAngle) * wingDist
                },
                {
                    x: centerX + Math.cos(rotation - wingAngle) * wingDist,
                    y: centerY + Math.sin(rotation - wingAngle) * wingDist
                }
            ];
        }
    },
    TRIANGLE: {
        name: 'TRIANGLE',
        minEnemies: 3,
        maxEnemies: 3,
        strength: 0.35,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            // Equilateral triangle - positions equally spaced
            const radius = 65;  // Reduced for tighter formation
            const positions = [];
            for (let i = 0; i < 3; i++) {
                // Start at top (-90 deg), then 120 degree spacing
                const angle = rotation + (i * Math.PI * 2 / 3) - Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    DIAMOND: {
        name: 'DIAMOND',
        minEnemies: 4,
        maxEnemies: 4,
        strength: 0.5,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const radius = 70;  // Reduced for tighter formation
            const positions = [];
            for (let i = 0; i < 4; i++) {
                // Diamond orientation: points at cardinal directions
                const angle = rotation + (i * Math.PI / 2);
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    CROSS: {
        name: 'CROSS',
        minEnemies: 5,
        maxEnemies: 5,
        strength: 0.45,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            // Cross with center enemy and 4 arms
            const armLength = 65;  // Reduced for tighter formation
            const positions = [];

            // Center enemy (no offset - clean center)
            positions.push({ x: centerX, y: centerY });

            // Four arm tips
            for (let i = 0; i < 4; i++) {
                const angle = rotation + i * Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(angle) * armLength,
                    y: centerY + Math.sin(angle) * armLength
                });
            }
            return positions;
        }
    },
    STAR: {
        name: 'STAR',
        minEnemies: 5,
        maxEnemies: 5,
        strength: 0.45,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const radius = 70;  // Reduced for tighter formation
            const positions = [];
            // Regular pentagon order (not star drawing order)
            for (let i = 0; i < 5; i++) {
                const angle = rotation + (i * Math.PI * 2 / 5) - Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    PENTAGON: {
        name: 'PENTAGON',
        minEnemies: 5,
        maxEnemies: 5,
        strength: 0.35,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const radius = 70;  // Reduced from 95 to match other shapes
            const positions = [];
            for (let i = 0; i < 5; i++) {
                const angle = rotation + (i * Math.PI * 2 / 5) - Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    // V_FORMATION - like flying birds, creates dramatic charge patterns
    V_FORMATION: {
        name: 'V_FORMATION',
        minEnemies: 5,
        maxEnemies: 7,
        strength: 0.4,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            const armSpacing = 45;  // Reduced from 55 for tighter formation
            const wingAngle = Math.PI / 4.5;  // ~40 degree spread (slightly wider for visibility)
            const positions = [];

            // Leader at the front
            const tipX = centerX + Math.cos(rotation) * 35;
            const tipY = centerY + Math.sin(rotation) * 35;
            positions.push({ x: tipX, y: tipY });

            // Distribute remaining enemies on two wings
            const wingEnemies = count - 1;
            const leftCount = Math.ceil(wingEnemies / 2);
            const rightCount = Math.floor(wingEnemies / 2);

            // Left wing
            for (let i = 0; i < leftCount; i++) {
                const dist = (i + 1) * armSpacing;
                const angle = rotation + Math.PI + wingAngle;  // Behind and left
                positions.push({
                    x: centerX + Math.cos(angle) * dist,
                    y: centerY + Math.sin(angle) * dist
                });
            }

            // Right wing
            for (let i = 0; i < rightCount; i++) {
                const dist = (i + 1) * armSpacing;
                const angle = rotation + Math.PI - wingAngle;  // Behind and right
                positions.push({
                    x: centerX + Math.cos(angle) * dist,
                    y: centerY + Math.sin(angle) * dist
                });
            }

            return positions;
        }
    },
    HEXAGON: {
        name: 'HEXAGON',
        minEnemies: 6,
        maxEnemies: 6,
        strength: 0.5,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const radius = 80;  // Reduced from 110 for tighter formation
            const positions = [];
            for (let i = 0; i < 6; i++) {
                const angle = rotation + i * Math.PI / 3;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    // DOUBLE_TRIANGLE - Two overlapping triangles forming star of david
    DOUBLE_TRIANGLE: {
        name: 'DOUBLE_TRIANGLE',
        minEnemies: 6,
        maxEnemies: 6,
        strength: 0.45,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const radius = 75;  // Reduced from 100 for tighter formation
            const positions = [];
            // First triangle (pointing up)
            for (let i = 0; i < 3; i++) {
                const angle = rotation + (i * Math.PI * 2 / 3) - Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            // Second triangle (pointing down, slightly smaller)
            for (let i = 0; i < 3; i++) {
                const angle = rotation + (i * Math.PI * 2 / 3) + Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(angle) * radius * 0.85,
                    y: centerY + Math.sin(angle) * radius * 0.85
                });
            }
            return positions;
        }
    },
    // DUAL_DIAMOND - Two diamonds, inner and outer
    DUAL_DIAMOND: {
        name: 'DUAL_DIAMOND',
        minEnemies: 8,
        maxEnemies: 8,
        strength: 0.5,  // High chance for exactly 8 enemies
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            // Outer diamond
            for (let i = 0; i < 4; i++) {
                const angle = rotation + (i * Math.PI / 2);
                positions.push({
                    x: centerX + Math.cos(angle) * 110,
                    y: centerY + Math.sin(angle) * 110
                });
            }
            // Inner diamond (rotated 45 degrees)
            for (let i = 0; i < 4; i++) {
                const angle = rotation + (i * Math.PI / 2) + Math.PI / 4;
                positions.push({
                    x: centerX + Math.cos(angle) * 60,
                    y: centerY + Math.sin(angle) * 60
                });
            }
            return positions;
        }
    },
    // OCTAGON - 8 enemies in octagon formation
    OCTAGON: {
        name: 'OCTAGON',
        minEnemies: 8,
        maxEnemies: 8,
        strength: 0.45,  // Good chance for 8 enemies
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const radius = 105;
            const positions = [];
            for (let i = 0; i < 8; i++) {
                const angle = rotation + (i * Math.PI * 2 / 8);
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    // ARROW_FLIGHT - 7 enemies in flying arrow/bird formation
    ARROW_FLIGHT: {
        name: 'ARROW_FLIGHT',
        minEnemies: 7,
        maxEnemies: 7,
        strength: 0.5,  // High chance for exactly 7 enemies
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const tipSize = 60;
            // Tip at rotation angle
            const tipX = centerX + Math.cos(rotation) * tipSize;
            const tipY = centerY + Math.sin(rotation) * tipSize;
            positions.push({ x: tipX, y: tipY });

            // Wings - 3 enemies on each side
            for (let side = -1; side <= 1; side += 2) {
                for (let i = 1; i <= 3; i++) {
                    const backDist = i * 45;
                    const sideDist = i * 35 * side;
                    const backAngle = rotation + Math.PI;
                    const perpAngle = rotation + Math.PI / 2;
                    positions.push({
                        x: centerX + Math.cos(backAngle) * backDist + Math.cos(perpAngle) * sideDist,
                        y: centerY + Math.sin(backAngle) * backDist + Math.sin(perpAngle) * sideDist
                    });
                }
            }
            return positions;
        }
    },
    // CRESCENT - 9-11 enemies in crescent moon shape (120 degree arc, not 180)
    CRESCENT: {
        name: 'CRESCENT',
        minEnemies: 9,
        maxEnemies: 11,
        strength: 0.5,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            const radius = 95;
            const positions = [];
            // Arc of 120 degrees (2/3 of half circle) - cleaner crescent shape
            const arcSpan = Math.PI * 0.65;  // ~117 degrees
            for (let i = 0; i < count; i++) {
                const t = count > 1 ? i / (count - 1) : 0.5;
                const arcPos = (t - 0.5) * 2;  // -1 to 1
                const angle = rotation + arcPos * (arcSpan / 2);
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    // PINCER - Two curved arms that flank from sides (8-9 enemies)
    // Creates a tactical "trap" feel - enemies approaching from two directions
    PINCER: {
        name: 'PINCER',
        minEnemies: 8,
        maxEnemies: 9,
        strength: 0.55,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            const positions = [];
            const armLength = Math.ceil(count / 2);
            const radius = 70;
            const armSpread = Math.PI * 0.4;  // 72 degrees per arm

            // Left pincer arm
            for (let i = 0; i < armLength; i++) {
                const t = i / Math.max(1, armLength - 1);
                const angle = rotation + Math.PI / 2 + t * armSpread;
                const armRadius = radius + i * 20;
                positions.push({
                    x: centerX + Math.cos(angle) * armRadius,
                    y: centerY + Math.sin(angle) * armRadius
                });
            }

            // Right pincer arm
            const rightCount = count - armLength;
            for (let i = 0; i < rightCount; i++) {
                const t = i / Math.max(1, rightCount - 1);
                const angle = rotation - Math.PI / 2 - t * armSpread;
                const armRadius = radius + i * 20;
                positions.push({
                    x: centerX + Math.cos(angle) * armRadius,
                    y: centerY + Math.sin(angle) * armRadius
                });
            }
            return positions;
        }
    },
    // TRIDENT - Three-pronged attack formation (9 enemies)
    // Center prong leads, flanking prongs provide support
    TRIDENT: {
        name: 'TRIDENT',
        minEnemies: 9,
        maxEnemies: 9,
        strength: 0.5,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const prongSpacing = 55;
            const prongLength = 50;
            const prongAngle = Math.PI / 5;  // 36 degrees

            // Center prong (3 enemies) - leads the charge
            for (let i = 0; i < 3; i++) {
                const dist = (i - 1) * prongLength;
                positions.push({
                    x: centerX + Math.cos(rotation) * dist,
                    y: centerY + Math.sin(rotation) * dist
                });
            }

            // Left prong (3 enemies)
            const leftAngle = rotation + prongAngle;
            for (let i = 0; i < 3; i++) {
                const dist = (i - 0.5) * prongLength - 20;
                positions.push({
                    x: centerX + Math.cos(leftAngle) * dist - Math.sin(leftAngle) * prongSpacing,
                    y: centerY + Math.sin(leftAngle) * dist + Math.cos(leftAngle) * prongSpacing
                });
            }

            // Right prong (3 enemies)
            const rightAngle = rotation - prongAngle;
            for (let i = 0; i < 3; i++) {
                const dist = (i - 0.5) * prongLength - 20;
                positions.push({
                    x: centerX + Math.cos(rightAngle) * dist + Math.sin(rightAngle) * prongSpacing,
                    y: centerY + Math.sin(rightAngle) * dist - Math.cos(rightAngle) * prongSpacing
                });
            }
            return positions;
        }
    },
    // SHIELD_WALL - Defensive arc formation (7-8 enemies)
    // Enemies form a protective barrier, good for shielder/tank types
    SHIELD_WALL: {
        name: 'SHIELD_WALL',
        minEnemies: 7,
        maxEnemies: 8,
        strength: 0.45,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            const positions = [];
            // Two rows: front row (curved) and back row (support)
            const frontCount = Math.ceil(count * 0.6);
            const backCount = count - frontCount;
            const frontRadius = 60;
            const backRadius = 30;
            const arcSpan = Math.PI * 0.5;  // 90 degree arc

            // Front row - curved shield
            for (let i = 0; i < frontCount; i++) {
                const t = frontCount > 1 ? i / (frontCount - 1) : 0.5;
                const arcPos = (t - 0.5) * 2;
                const angle = rotation + arcPos * (arcSpan / 2);
                positions.push({
                    x: centerX + Math.cos(angle) * frontRadius,
                    y: centerY + Math.sin(angle) * frontRadius
                });
            }

            // Back row - support line
            for (let i = 0; i < backCount; i++) {
                const t = backCount > 1 ? i / (backCount - 1) : 0.5;
                const arcPos = (t - 0.5) * 2;
                const angle = rotation + arcPos * (arcSpan / 2) * 0.6;
                positions.push({
                    x: centerX + Math.cos(angle) * backRadius,
                    y: centerY + Math.sin(angle) * backRadius
                });
            }
            return positions;
        }
    },
    // HOURGLASS - Two triangles meeting at points (8 enemies)
    // Visually striking, enemies flow through the center
    HOURGLASS: {
        name: 'HOURGLASS',
        minEnemies: 8,
        maxEnemies: 8,
        strength: 0.5,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const height = 70;
            const width = 55;

            // Top triangle (4 enemies: 1 tip + 3 base)
            positions.push({
                x: centerX + Math.cos(rotation) * height,
                y: centerY + Math.sin(rotation) * height
            });
            for (let i = 0; i < 3; i++) {
                const t = (i - 1) * width * 0.5;
                const perpAngle = rotation + Math.PI / 2;
                positions.push({
                    x: centerX + Math.cos(rotation) * 15 + Math.cos(perpAngle) * t,
                    y: centerY + Math.sin(rotation) * 15 + Math.sin(perpAngle) * t
                });
            }

            // Bottom triangle (4 enemies: 3 base + 1 tip)
            for (let i = 0; i < 3; i++) {
                const t = (i - 1) * width * 0.5;
                const perpAngle = rotation + Math.PI / 2;
                positions.push({
                    x: centerX - Math.cos(rotation) * 15 + Math.cos(perpAngle) * t,
                    y: centerY - Math.sin(rotation) * 15 + Math.sin(perpAngle) * t
                });
            }
            positions.push({
                x: centerX - Math.cos(rotation) * height,
                y: centerY - Math.sin(rotation) * height
            });

            return positions;
        }
    },
    // ORBIT - Inner core with orbiting satellites (7 enemies)
    // 1 center + 6 orbiting - creates dynamic rotation feel
    ORBIT: {
        name: 'ORBIT',
        minEnemies: 7,
        maxEnemies: 7,
        strength: 0.45,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const orbitRadius = 65;

            // Center enemy (the "planet")
            positions.push({ x: centerX, y: centerY });

            // 6 orbiting enemies (the "moons")
            for (let i = 0; i < 6; i++) {
                const angle = rotation + (i / 6) * Math.PI * 2;
                positions.push({
                    x: centerX + Math.cos(angle) * orbitRadius,
                    y: centerY + Math.sin(angle) * orbitRadius
                });
            }
            return positions;
        }
    },
    // DOUBLE_V - 10 enemies in double-V formation
    DOUBLE_V: {
        name: 'DOUBLE_V',
        minEnemies: 10,
        maxEnemies: 10,
        strength: 0.5,  // High chance for exactly 10 enemies
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const spacing = 50;
            const wingAngle = Math.PI / 5;

            // First V (front)
            positions.push({ x: centerX + Math.cos(rotation) * 60, y: centerY + Math.sin(rotation) * 60 });
            for (let i = 1; i <= 2; i++) {
                const dist = i * spacing;
                positions.push({
                    x: centerX + Math.cos(rotation + Math.PI + wingAngle) * dist,
                    y: centerY + Math.sin(rotation + Math.PI + wingAngle) * dist
                });
                positions.push({
                    x: centerX + Math.cos(rotation + Math.PI - wingAngle) * dist,
                    y: centerY + Math.sin(rotation + Math.PI - wingAngle) * dist
                });
            }

            // Second V (back, offset)
            const offsetDist = 80;
            const backCenterX = centerX + Math.cos(rotation + Math.PI) * offsetDist;
            const backCenterY = centerY + Math.sin(rotation + Math.PI) * offsetDist;
            positions.push({ x: backCenterX + Math.cos(rotation) * 40, y: backCenterY + Math.sin(rotation) * 40 });
            for (let i = 1; i <= 2; i++) {
                const dist = i * spacing * 0.8;
                positions.push({
                    x: backCenterX + Math.cos(rotation + Math.PI + wingAngle) * dist,
                    y: backCenterY + Math.sin(rotation + Math.PI + wingAngle) * dist
                });
                positions.push({
                    x: backCenterX + Math.cos(rotation + Math.PI - wingAngle) * dist,
                    y: backCenterY + Math.sin(rotation + Math.PI - wingAngle) * dist
                });
            }
            return positions.slice(0, 10);
        }
    },
    // CROWN - 10 enemies forming a royal crown shape
    // Base line + 3 pointed peaks - intimidating approach pattern
    CROWN: {
        name: 'CROWN',
        minEnemies: 10,
        maxEnemies: 10,
        strength: 0.45,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const baseWidth = 120;
            const peakHeight = 80;
            const baseY = 30;

            // Base of crown (4 enemies along bottom)
            for (let i = 0; i < 4; i++) {
                const t = (i - 1.5) / 1.5; // -1 to 1
                const x = centerX + t * (baseWidth / 2);
                const y = centerY + baseY;
                // Apply rotation around center
                const dx = x - centerX;
                const dy = y - centerY;
                positions.push({
                    x: centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation),
                    y: centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation)
                });
            }

            // Three peaks (2 enemies each = 6 enemies)
            const peakOffsets = [-0.75, 0, 0.75];
            for (const offset of peakOffsets) {
                // Peak tip
                const tipX = centerX + offset * (baseWidth / 2);
                const tipY = centerY - peakHeight;
                const dx1 = tipX - centerX;
                const dy1 = tipY - centerY;
                positions.push({
                    x: centerX + dx1 * Math.cos(rotation) - dy1 * Math.sin(rotation),
                    y: centerY + dx1 * Math.sin(rotation) + dy1 * Math.cos(rotation)
                });

                // Midpoint below peak
                const midY = centerY - peakHeight / 2;
                const dx2 = tipX - centerX;
                const dy2 = midY - centerY;
                positions.push({
                    x: centerX + dx2 * Math.cos(rotation) - dy2 * Math.sin(rotation),
                    y: centerY + dx2 * Math.sin(rotation) + dy2 * Math.cos(rotation)
                });
            }
            return positions.slice(0, 10);
        }
    },
    // CLAW - 11 enemies in aggressive claw/talon shape
    // Three curved prongs reaching forward - predatory attack formation
    CLAW: {
        name: 'CLAW',
        minEnemies: 11,
        maxEnemies: 11,
        strength: 0.5,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const positions = [];
            const prongLength = 90;
            const prongSpacing = 55;
            const curvature = 0.3;

            // Center prong (4 enemies)
            for (let i = 0; i < 4; i++) {
                const t = i / 3;
                // Curve slightly inward at tips
                const curve = Math.sin(t * Math.PI) * curvature * 20;
                const localX = t * prongLength;
                const localY = curve;
                positions.push({
                    x: centerX + localX * Math.cos(rotation) - localY * Math.sin(rotation),
                    y: centerY + localX * Math.sin(rotation) + localY * Math.cos(rotation)
                });
            }

            // Upper prong (3 enemies) - curves upward
            for (let i = 0; i < 3; i++) {
                const t = (i + 1) / 3;
                const localX = t * prongLength * 0.9;
                const localY = -prongSpacing + Math.sin(t * Math.PI) * curvature * 25;
                positions.push({
                    x: centerX + localX * Math.cos(rotation) - localY * Math.sin(rotation),
                    y: centerY + localX * Math.sin(rotation) + localY * Math.cos(rotation)
                });
            }

            // Lower prong (4 enemies) - curves downward
            for (let i = 0; i < 4; i++) {
                const t = i / 3;
                const localX = t * prongLength * 0.9;
                const localY = prongSpacing - Math.sin(t * Math.PI) * curvature * 25;
                positions.push({
                    x: centerX + localX * Math.cos(rotation) - localY * Math.sin(rotation),
                    y: centerY + localX * Math.sin(rotation) + localY * Math.cos(rotation)
                });
            }
            return positions.slice(0, 11);
        }
    },
    // SPIRAL - Compact dual-arm spiral for 11-12 enemies
    SPIRAL: {
        name: 'SPIRAL',
        minEnemies: 11,
        maxEnemies: 12,
        strength: 0.55,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            const positions = [];

            // Single expanding spiral from center outward
            for (let i = 0; i < count; i++) {
                const progress = i / count;
                // Tighter spiral: 1.5 rotations total
                const angle = rotation + progress * Math.PI * 3;
                // Start small, grow outward
                const radius = 30 + progress * 85;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    // DOUBLE_CRESCENT - Two small crescents forming a shape like )(
    DOUBLE_CRESCENT: {
        name: 'DOUBLE_CRESCENT',
        minEnemies: 13,
        maxEnemies: 14,
        strength: 0.55,
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            const positions = [];
            const perCrescent = Math.ceil(count / 2);
            const radius = 70;  // Smaller radius
            const offset = 40;  // Closer together
            const arcSpan = Math.PI * 0.5;  // 90 degree arcs (not 144 degrees)

            // First crescent (left side, opening right)
            for (let i = 0; i < perCrescent && positions.length < count; i++) {
                const t = perCrescent > 1 ? i / (perCrescent - 1) : 0.5;
                const arcPos = (t - 0.5) * 2;  // -1 to 1
                const angle = rotation + Math.PI / 2 + arcPos * (arcSpan / 2);
                positions.push({
                    x: centerX - offset + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }

            // Second crescent (right side, opening left)
            const remaining = count - positions.length;
            for (let i = 0; i < remaining; i++) {
                const t = remaining > 1 ? i / (remaining - 1) : 0.5;
                const arcPos = (t - 0.5) * 2;
                const angle = rotation - Math.PI / 2 + arcPos * (arcSpan / 2);
                positions.push({
                    x: centerX + offset + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    },
    CIRCLE: {
        name: 'CIRCLE',
        minEnemies: 12,  // Increased from 10 - let other patterns handle smaller groups
        maxEnemies: 15,
        strength: 0.25,  // Further reduced from 0.3 - less dominant
        getTargetPositions: (centerX, centerY, enemies, rotation = 0) => {
            const count = enemies.length;
            // Dynamic radius scales with enemy count for proper spacing
            const baseRadius = 75;
            const radiusPerEnemy = 12;
            const radius = baseRadius + count * radiusPerEnemy;
            const positions = [];
            for (let i = 0; i < count; i++) {
                const angle = rotation + (i * Math.PI * 2 / count);
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
            return positions;
        }
    }
};

// Export for Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FORMATION_PATTERNS;
}

// Expose on window for browser
if (typeof window !== 'undefined') {
    window.FORMATION_PATTERNS = FORMATION_PATTERNS;
}

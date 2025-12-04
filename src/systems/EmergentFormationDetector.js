/**
 * Emergent Formation Detector
 * 
 * Detects when enemies naturally cluster together during gameplay and organizes
 * them into geometric constellations. Unlike FormationManager which spawns enemies
 * in formations, this creates dynamic geometric patterns from existing enemies.
 * 
 * Key Concept: When 3+ enemies are near each other without being in a managed formation,
 * they can "snap" into a geometric constellation pattern for visual cohesion.
 */

class EmergentFormationDetector {
    constructor(game) {
        this.game = game;

        // Detection parameters
        // [TUNED] Optimized for more shapes in late game
        this.detectionRadius = 150;  // Slightly increased to catch more clusters
        this.minEnemiesForConstellation = 3;
        this.maxConstellations = 16;  // Increased from 10 for more late-game shapes
        this.detectionInterval = 0.12;  // Faster detection (was 0.18) for quicker shape formation
        this.detectionTimer = 0;
        this.maxConstellationRadius = 250;
        this.maxConstellationRadiusSq = this.maxConstellationRadius * this.maxConstellationRadius;
        this.integrityStrikeLimit = 25;
        this.constellationStandoffDistance = 180;
        this.constellationChaseGain = 0.8;
        this.constellationOrbitGain = 0.35;
        this.constellationRotationAlign = 0.5;
        this.constellationReformCooldownMs = 350;  // Reduced from 600 - enemies rejoin shapes faster
        this.mergeInterval = 3.5;  // Slightly less frequent merges to let shapes stabilize
        this.mergeTimer = 0;
        this.mergeMinAge = 2.5;  // Reduced from 3.0 - allow merging sooner for dynamic gameplay
        this.maxConstellationMaxSpeed = 600;  // Reduced for smoother movement
        this.strayAbsorptionEnabled = true;  // Actively pull stray enemies into nearby constellations
        this.anchorReoptimizeInterval = 2.0;  // Reoptimize anchors every 2 seconds to fix glitchy shapes
        this.anchorReoptimizeTimer = 0;

        // Active constellations (emergent patterns)
        this.constellations = [];

        // Pattern diversity tracking - promotes variety by boosting underused patterns
        this.patternDiversityEnabled = true;
        this.diversityBoostFactor = 2.0;    // How much to boost underrepresented patterns
        this.overusePenaltyFactor = 0.3;    // Penalty multiplier for overused patterns
        this.circleMaxRatio = 0.25;         // Max ratio of constellations that should be circles
        this.targetPatternVariety = 0.6;    // Target: 60% of patterns should be unique types
        
        // Size diversity - balance small vs large formations
        // [TUNED] Prefer more small shapes for visual variety and coverage
        this.preferSmallFormations = true;   // Prefer smaller formations = more total shapes
        this.smallPatternThreshold = 5;      // Patterns with maxEnemies <= this are "small"
        this.targetSmallRatio = 0.55;        // Increased from 0.4 - more small shapes

        // Visual effects system
        this.effects = null; // Will be initialized when FormationEffects is available

        // Constellation pattern templates (similar to formations but for emergent clustering)
        // [REBALANCED] Pattern selection now uses weighted random based on strength values
        // Higher strength = more likely to be selected when multiple patterns match
        this.patterns = {
            // LINE formation - enemies arrange in a straight line facing player
            LINE: {
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

        this.enabled = true;

        // [PERF] Cache pattern count to avoid Object.keys() calls each frame
        this._patternCount = Object.keys(this.patterns).length;

        // DIAGNOSTIC: Expose to window for debugging
        window.emergentDetector = this;

        if (!this.game) {
            window.logger?.error('CRITICAL: EmergentFormationDetector initialized without game instance!');
        } else {
            window.logger?.log(`EmergentFormationDetector initialized with game instance. Enemies array exists: ${!!this.game.enemies}`);
        }
    }

    /**
     * Update emergent constellation detection and application
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // DIAGNOSTIC: Check if game reference was lost or empty
        if (!this.game) {
            return;
        }

        // Lazy-initialize effects system
        if (!this.effects && window.FormationEffects) {
            this.effects = new window.FormationEffects(this.game);
        }

        // Update effects
        if (this.effects) {
            this.effects.update(deltaTime);
        }

        this.detectionTimer += deltaTime;
        this.mergeTimer += deltaTime;
        this.anchorReoptimizeTimer += deltaTime;

        // Periodic detection to avoid performance overhead
        if (this.detectionTimer >= this.detectionInterval) {
            this.detectionTimer = 0;
            this.detectAndUpdateConstellations();
        }

        // Periodic merge check for combining nearby constellations
        if (this.mergeTimer >= this.mergeInterval) {
            this.mergeTimer = 0;
            this.mergeNearbyConstellations();
        }
        
        // Periodic anchor reoptimization to fix shapes that look glitchy
        if (this.anchorReoptimizeTimer >= this.anchorReoptimizeInterval) {
            this.anchorReoptimizeTimer = 0;
            this.reoptimizeAnchors();
        }

        // Apply constellation forces to enemies (every frame)
        this.applyConstellationForces(deltaTime);
        
        // Apply attraction force to stray enemies near constellations
        if (this.strayAbsorptionEnabled) {
            this.applyStrayAttractionForces(deltaTime);
        }

        // Clean up broken constellations
        this.cleanupConstellations();
    }

    /**
     * Apply weak attraction forces to stray enemies near constellations
     * This encourages free enemies to drift toward existing formations
     * [IMPROVED] Reduces attraction when many constellations exist to prevent swarming
     */
    applyStrayAttractionForces(deltaTime) {
        const enemies = this.game?.enemies || [];
        if (enemies.length === 0 || this.constellations.length === 0) return;

        const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

        const attractRadius = this.detectionRadius * 2.5;  // Pull from further away
        const attractRadiusSq = attractRadius * attractRadius;
        
        // [TUNED] Increased base attraction to help free enemies join shapes faster
        // Still reduces with constellation count to prevent chaos
        const baseStrength = 45;  // Increased from 30
        const constellationCount = this.constellations.length;
        let attractStrength = baseStrength;
        if (constellationCount >= 10) {
            // Reduce attraction when very many constellations
            attractStrength = baseStrength * 0.4;
        } else if (constellationCount >= 6) {
            attractStrength = baseStrength * 0.6;
        } else if (constellationCount >= 4) {
            attractStrength = baseStrength * 0.8;
        }

        for (const enemy of enemies) {
            // Skip enemies already in formations/constellations or on cooldown
            if (enemy.isDead || enemy.isBoss || enemy.formationId || enemy.constellation) continue;
            if (enemy.constellationCooldown && enemy.constellationCooldown > now) continue;

            // Find nearest constellation
            let nearestDist = Infinity;
            let nearestConstellation = null;

            for (const constellation of this.constellations) {
                const dx = constellation.centerX - enemy.x;
                const dy = constellation.centerY - enemy.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < attractRadiusSq && distSq < nearestDist) {
                    nearestDist = distSq;
                    nearestConstellation = constellation;
                }
            }

            // Apply gentle attraction toward nearest constellation
            if (nearestConstellation && enemy.movement?.forceAccumulator) {
                const dx = nearestConstellation.centerX - enemy.x;
                const dy = nearestConstellation.centerY - enemy.y;
                const dist = Math.sqrt(nearestDist);
                
                // Strength falls off with distance
                const falloff = 1 - (dist / attractRadius);
                const force = attractStrength * falloff * deltaTime;
                
                enemy.movement.forceAccumulator.addForce('external',
                    (dx / dist) * force,
                    (dy / dist) * force
                );
            }
        }
    }

    /**
     * Detect enemy clusters and form constellations
     */
    detectAndUpdateConstellations() {
        const enemies = this.game?.enemies || [];

        if (enemies.length < this.minEnemiesForConstellation) return;

        // Get enemies that aren't already in managed formations or constellations
        const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

        const freeEnemies = enemies.filter(e =>
            !e.isDead &&
            !e.isBoss &&
            !e.formationId &&
            !this.isInConstellation(e) &&
            (!e.constellationCooldown || e.constellationCooldown <= now)
        );

        if (freeEnemies.length < this.minEnemiesForConstellation) return;

        // Find clusters using spatial hashing for performance
        const clusters = this.findClusters(freeEnemies);

        if (clusters.length === 0) {
            // Even without new clusters, try to expand existing constellations
            this.tryExpandConstellations(freeEnemies);
            return;
        }

        // Form constellations from clusters
        for (const cluster of clusters) {
            if (this.constellations.length >= this.maxConstellations) break;
            this.carveConstellationsFromCluster(cluster);
        }

        // Also try to expand existing constellations with remaining free enemies
        const usedEnemies = new Set();
        for (const cluster of clusters) {
            for (const e of cluster) usedEnemies.add(e);
        }
        const leftover = freeEnemies.filter(e => !usedEnemies.has(e));
        if (leftover.length > 0) {
            this.tryExpandConstellations(leftover);
        }
    }

    /**
     * Try to expand existing constellations by absorbing nearby free enemies
     * This helps constellations grow when enemies swarm near them
     */
    tryExpandConstellations(freeEnemies) {
        if (freeEnemies.length === 0) return;

        const absorptionRadius = this.detectionRadius * 1.2;  // Slightly larger than detection
        const absorptionRadiusSq = absorptionRadius * absorptionRadius;

        for (const constellation of this.constellations) {
            // Skip constellations that are already at max size or too young
            if (constellation.age < 1.5) continue;
            const currentSize = constellation.enemies.filter(e => e && !e.isDead).length;
            const pattern = constellation.pattern;
            
            // Check if constellation can grow to a larger pattern
            if (currentSize >= pattern.maxEnemies) {
                // Try to find a larger pattern that would fit
                const potentialSize = currentSize + 1;
                const largerPattern = this.selectPattern(potentialSize, { allowSubset: false });
                if (!largerPattern || largerPattern.maxEnemies <= pattern.maxEnemies) continue;
            }

            // Find free enemies near this constellation's center
            const nearbyFree = [];
            for (const enemy of freeEnemies) {
                if (enemy.isDead || enemy.constellation) continue;
                const dx = enemy.x - constellation.centerX;
                const dy = enemy.y - constellation.centerY;
                if (dx * dx + dy * dy < absorptionRadiusSq) {
                    nearbyFree.push(enemy);
                }
            }

            if (nearbyFree.length === 0) continue;

            // Try to reform constellation with additional enemies
            const combinedEnemies = [
                ...constellation.enemies.filter(e => e && !e.isDead),
                ...nearbyFree
            ];

            // Use variety-aware selection to avoid always expanding into CIRCLEs
            const recentPatterns = this.constellations
                .filter(c => c && c.age < 15)
                .map(c => c.pattern?.name).filter(Boolean);
            let newPattern = this.selectPatternWithVariety(combinedEnemies.length, recentPatterns);
            if (!newPattern) {
                newPattern = this.selectPattern(combinedEnemies.length, { allowSubset: true });
            }
            if (!newPattern) continue;

            // Only proceed if new pattern uses more enemies than current
            if (newPattern.maxEnemies <= currentSize) continue;

            // Take only as many as the new pattern can hold
            const finalCount = Math.min(combinedEnemies.length, newPattern.maxEnemies);
            
            // Sort by distance to center and take closest
            // [STABILITY] Guard against NaN in centerX/Y which would break sorting
            const centerX = Number.isFinite(constellation.centerX) ? constellation.centerX : 0;
            const centerY = Number.isFinite(constellation.centerY) ? constellation.centerY : 0;
            combinedEnemies.sort((a, b) => {
                const da = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
                const db = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
                return da - db;
            });
            const finalEnemies = combinedEnemies.slice(0, finalCount);

            // Clear old tags
            for (const enemy of constellation.enemies) {
                if (enemy) {
                    delete enemy.constellation;
                    delete enemy.constellationAnchor;
                }
            }

            // Update constellation in place
            constellation.enemies = finalEnemies;
            constellation.pattern = newPattern;
            delete constellation._targetCache;  // Clear cache since pattern changed
            
            // Assign new anchors
            for (let i = 0; i < finalEnemies.length; i++) {
                const enemy = finalEnemies[i];
                enemy.constellation = constellation.id;
                enemy.constellationAnchor = i;
                enemy.constellationCooldown = 0;
            }

            // Recalculate center
            // [STABILITY] Guard against division by zero
            if (finalEnemies.length === 0) continue;
            let cx = 0, cy = 0;
            for (const e of finalEnemies) {
                cx += e.x;
                cy += e.y;
            }
            constellation.centerX = cx / finalEnemies.length;
            constellation.centerY = cy / finalEnemies.length;

            // Update visual effects - remove old beams and create new ones for the expanded pattern
            if (this.effects) {
                this.effects.removeConstellationBeams(constellation.id);
                this.effects.createConstellationBeams(constellation);
            }

            window.logger?.log(`🔄 [Emergent] Expanded ${pattern.name} to ${newPattern.name} with ${finalEnemies.length} enemies`);
            
            // Remove absorbed enemies from the free list
            const absorbedSet = new Set(finalEnemies);
            freeEnemies = freeEnemies.filter(e => !absorbedSet.has(e));
            
            if (freeEnemies.length === 0) break;
        }
    }

    /**
     * Find clusters of nearby enemies using spatial hashing (O(N) complexity)
     */
    findClusters(enemies) {
        const clusters = [];
        const visited = new Set();
        const cellSize = this.detectionRadius; // Cell size = detection radius
        const grid = new Map();

        // Step 1: Populate spatial grid
        for (const enemy of enemies) {
            const cellX = Math.floor(enemy.x / cellSize);
            const cellY = Math.floor(enemy.y / cellSize);
            const key = `${cellX},${cellY}`;

            if (!grid.has(key)) {
                grid.set(key, []);
            }
            grid.get(key).push(enemy);
        }

        // Step 2: Find clusters
        const radiusSq = this.detectionRadius * this.detectionRadius;

        for (const enemy of enemies) {
            if (visited.has(enemy)) continue;

            const cluster = [enemy];
            visited.add(enemy);

            // Queue for BFS expansion of cluster
            const queue = [enemy];

            while (queue.length > 0) {
                const current = queue.shift();
                const cellX = Math.floor(current.x / cellSize);
                const cellY = Math.floor(current.y / cellSize);

                // Check current and neighboring cells
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${cellX + dx},${cellY + dy}`;
                        const cellEnemies = grid.get(key);

                        if (!cellEnemies) continue;

                        for (const neighbor of cellEnemies) {
                            if (visited.has(neighbor)) continue;

                            const distSq = (current.x - neighbor.x) ** 2 + (current.y - neighbor.y) ** 2;

                            if (distSq < radiusSq) {
                                visited.add(neighbor);
                                cluster.push(neighbor);
                                queue.push(neighbor); // Expand cluster from this neighbor
                            }
                        }
                    }
                }
            }

            // Only consider clusters with enough enemies AND verify they're compact
            if (cluster.length >= this.minEnemiesForConstellation) {
                // Verify cluster compactness - all enemies should be within reasonable distance of centroid
                let cx = 0, cy = 0;
                for (const e of cluster) { cx += e.x; cy += e.y; }
                cx /= cluster.length;
                cy /= cluster.length;
                
                let maxDistSq = 0;
                for (const e of cluster) {
                    const dx = e.x - cx;
                    const dy = e.y - cy;
                    maxDistSq = Math.max(maxDistSq, dx * dx + dy * dy);
                }
                
                // Cluster must be compact enough to form a coherent shape
                const maxClusterRadius = this.maxConstellationRadius * 0.8;
                if (maxDistSq < maxClusterRadius * maxClusterRadius) {
                    clusters.push(cluster);
                }
            }
        }

        return clusters;
    }

    /**
     * Carve one or more constellations out of a cluster, favoring variety in patterns
     * [IMPROVED] Prefers splitting large clusters into multiple smaller formations
     */
    carveConstellationsFromCluster(cluster) {
        const remaining = [...cluster];
        const created = [];

        // Track recently used patterns to encourage variety
        const recentPatterns = this.constellations
            .filter(c => c.age < 10)
            .map(c => c.pattern.name);
        
        // Check size diversity - if too many large formations, prefer small ones
        this.updateSizeDiversity();

        while (
            remaining.length >= this.minEnemiesForConstellation &&
            (this.constellations.length + created.length) < this.maxConstellations
        ) {
            // Recompute centroid of remaining enemies
            let centerX = 0, centerY = 0;
            for (const enemy of remaining) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= remaining.length;
            centerY /= remaining.length;

            // [TUNED] More aggressive splitting for more total shapes
            let targetCount = remaining.length;
            if (remaining.length > 6 && this.preferSmallFormations) {
                // Split into smaller groups - aim for 3-5 enemies per formation
                targetCount = Math.min(5, Math.max(3, Math.floor(remaining.length / 2)));
            } else if (remaining.length > 8) {
                // Even without preference, split large clusters
                // 70% chance to make a medium-sized formation instead
                if (Math.random() < 0.7) {
                    targetCount = Math.min(6, remaining.length);
                }
            }

            // Try to select a pattern, with preference for variety
            let pattern = this.selectPatternWithVariety(targetCount, recentPatterns);
            if (!pattern) {
                pattern = this.selectPattern(targetCount, { allowSubset: true });
            }
            if (!pattern) {
                // Fall back to original count if target count didn't work
                pattern = this.selectPatternWithVariety(remaining.length, recentPatterns);
                if (!pattern) {
                    pattern = this.selectPattern(remaining.length, { allowSubset: true });
                }
            }
            if (!pattern) break;

            // Take the closest enemies to the centroid up to the pattern capacity
            const groupSize = Math.min(pattern.maxEnemies, remaining.length);
            remaining.sort((a, b) => {
                const distA = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
                const distB = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
                return distA - distB;
            });
            const selected = remaining.slice(0, groupSize);

            const constellation = this.createConstellation(selected, pattern);
            if (!constellation) {
                // Drop the farthest enemy and try again to find a tighter subset
                let farthestIndex = 0;
                let farthestDistSq = -1;
                for (let i = 0; i < remaining.length; i++) {
                    const e = remaining[i];
                    const dx = e.x - centerX;
                    const dy = e.y - centerY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > farthestDistSq) {
                        farthestDistSq = distSq;
                        farthestIndex = i;
                    }
                }
                remaining.splice(farthestIndex, 1);
                continue;
            }

            // Track this pattern as recently used
            recentPatterns.push(pattern.name);
            created.push(constellation);

            // Remove selected enemies from remaining pool
            const selectedIds = new Set(selected.map(e => e.id));
            const filtered = remaining.filter(e => !selectedIds.has(e.id));
            remaining.length = 0;
            remaining.push(...filtered);
        }

        return created;
    }

    /**
     * Update size diversity preference based on current constellation distribution
     */
    updateSizeDiversity() {
        if (this.constellations.length < 3) {
            this.preferSmallFormations = false;
            return;
        }
        
        let smallCount = 0;
        let largeCount = 0;
        for (const c of this.constellations) {
            if (c && c.pattern) {
                if (c.pattern.maxEnemies <= this.smallPatternThreshold) {
                    smallCount++;
                } else {
                    largeCount++;
                }
            }
        }
        
        const totalFormations = smallCount + largeCount;
        const smallRatio = smallCount / totalFormations;
        
        // If we have too few small formations, prefer creating them
        this.preferSmallFormations = smallRatio < this.targetSmallRatio;
    }

    /**
     * Select a pattern with preference for variety (avoid recently used patterns)
     * Now includes dynamic diversity balancing based on current constellation distribution
     * [IMPROVED] Also considers size diversity
     * @param {number} count - Number of enemies available
     * @param {Array<string>} recentPatterns - Names of recently used patterns
     * @returns {Object|null} Selected pattern or null
     */
    selectPatternWithVariety(count, recentPatterns) {
        if (!count || count < 3) return null;

        // Find all patterns that exactly match the count
        const exactMatches = [];
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count <= pattern.maxEnemies) {
                exactMatches.push({ name, ...pattern });
            }
        }

        if (exactMatches.length === 0) return null;

        // Get current pattern distribution from active constellations
        const distribution = this.getPatternDistribution();
        const totalActive = this.constellations.length;

        // Count how often each pattern has been used recently
        const usageCounts = {};
        for (const name of recentPatterns) {
            usageCounts[name] = (usageCounts[name] || 0) + 1;
        }

        // Adjust weights based on both recent usage AND current distribution
        const adjustedPatterns = exactMatches.map(pattern => {
            let adjustedStrength = pattern.strength;
            
            // Factor 1: Recent usage penalty (30% reduction per recent use)
            const usageCount = usageCounts[pattern.name] || 0;
            adjustedStrength *= Math.max(0.1, Math.pow(0.7, usageCount));
            
            // Factor 2: Dynamic diversity balancing
            if (this.patternDiversityEnabled && totalActive > 0) {
                const currentCount = distribution[pattern.name] || 0;
                const currentRatio = currentCount / totalActive;
                // [PERF] Use cached pattern count instead of Object.keys() each frame
                const expectedRatio = 1 / this._patternCount;  // Fair share
                
                if (currentRatio > expectedRatio * 2) {
                    // Pattern is overrepresented - penalize heavily
                    adjustedStrength *= this.overusePenaltyFactor;
                } else if (currentRatio < expectedRatio * 0.5) {
                    // Pattern is underrepresented - boost it
                    adjustedStrength *= this.diversityBoostFactor;
                }
                
                // Special handling for CIRCLE - always penalize if over threshold
                if (pattern.name === 'CIRCLE') {
                    const circleRatio = (distribution['CIRCLE'] || 0) / Math.max(1, totalActive);
                    if (circleRatio >= this.circleMaxRatio) {
                        adjustedStrength *= 0.1;  // Heavy penalty when circles dominate
                    }
                }
                
                // [NEW] Size diversity: boost small patterns if we have too many large ones
                if (this.preferSmallFormations) {
                    if (pattern.maxEnemies <= this.smallPatternThreshold) {
                        adjustedStrength *= 1.8;  // Boost small patterns
                    } else if (pattern.maxEnemies >= 10) {
                        adjustedStrength *= 0.5;  // Penalize large patterns
                    }
                }
            }
            
            return { ...pattern, strength: adjustedStrength };
        });

        return this._weightedRandomSelect(adjustedPatterns);
    }

    /**
     * Get distribution of pattern types in active constellations
     * @returns {Object} Map of pattern name to count
     */
    getPatternDistribution() {
        const distribution = {};
        for (const c of this.constellations) {
            if (c && c.pattern && c.pattern.name) {
                distribution[c.pattern.name] = (distribution[c.pattern.name] || 0) + 1;
            }
        }
        return distribution;
    }

    /**
     * Get variety score (0-1) - how diverse are current constellations?
     * @returns {number} Variety score
     */
    getVarietyScore() {
        if (this.constellations.length === 0) return 1;
        const distribution = this.getPatternDistribution();
        const uniquePatterns = Object.keys(distribution).length;
        return uniquePatterns / this.constellations.length;
    }

    /**
     * Merge nearby constellations into larger shapes when possible
     */
    mergeNearbyConstellations() {
        if (this.constellations.length < 2) return;

        const mergeRadiusSq = 200 * 200;
        let mergedAny = false;

        // Try to merge larger constellations first
        this.constellations.sort((a, b) => (b?.enemies?.length || 0) - (a?.enemies?.length || 0));

        const attemptMerge = (a, b) => {
            const dx = a.centerX - b.centerX;
            const dy = a.centerY - b.centerY;
            const distSq = dx * dx + dy * dy;
            if (distSq > mergeRadiusSq) return null;

            const combinedEnemies = [];
            const seen = new Set();
            for (const enemy of [...(a.enemies || []), ...(b.enemies || [])]) {
                if (!enemy || enemy.isDead) continue;
                if (seen.has(enemy)) continue;
                seen.add(enemy);
                combinedEnemies.push(enemy);
            }

            // Use variety selection to avoid always merging into CIRCLEs
            const recentPatterns = this.constellations
                .filter(c => c && c.age < 15)
                .map(c => c.pattern?.name).filter(Boolean);
            let pattern = this.selectPatternWithVariety(combinedEnemies.length, recentPatterns);
            if (!pattern) {
                pattern = this.selectPattern(combinedEnemies.length, { allowSubset: true });
            }
            if (!pattern || pattern.maxEnemies < 3) return null; // Skip merging into pairs

            // Spatial sanity check: ensure combined cluster isn't too spread out
            let cx = 0, cy = 0;
            for (const e of combinedEnemies) {
                cx += e.x; cy += e.y;
            }
            cx /= combinedEnemies.length;
            cy /= combinedEnemies.length;
            let maxDistSq = 0;
            for (const e of combinedEnemies) {
                const ddx = e.x - cx;
                const ddy = e.y - cy;
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 > maxDistSq) maxDistSq = d2;
            }
            const maxSpreadSq = this.maxConstellationRadiusSq * 1.1;
            if (maxDistSq > maxSpreadSq) return null;

            // Clear old constellation tags without cooldown so we can reform immediately
            for (const enemy of combinedEnemies) {
                delete enemy.constellation;
                delete enemy.constellationJoinedAt;
                delete enemy.constellationAnchor;
                enemy.constellationCooldown = 0;
            }

            return this.createConstellation(combinedEnemies, pattern);
        };

        const kept = [];
        for (let i = 0; i < this.constellations.length; i++) {
            const a = this.constellations[i];
            if (!a) continue;
            // Constellations must be mature before merging (prevents churn)
            if (a.age < this.mergeMinAge) {
                kept.push(a);
                continue;
            }
            let merged = null;

            for (let j = i + 1; j < this.constellations.length; j++) {
                const b = this.constellations[j];
                if (!b) continue;
                if (b.age < this.mergeMinAge) continue;  // Both must be mature

                merged = attemptMerge(a, b);
                if (merged) {
                    // Clean up old beam effects before consuming
                    this.effects?.removeConstellationBeams?.(a.id);
                    this.effects?.removeConstellationBeams?.(b.id);
                    this.constellations[j] = null; // consume b
                    mergedAny = true;
                    break;
                }
            }

            if (merged) {
                kept.push(merged);
            } else if (a) {
                kept.push(a);
            }
        }

        if (mergedAny) {
            this.constellations = kept.filter(Boolean);
        }
    }

    /**
     * Select best pattern for a cluster size using weighted random selection
     * [REWRITTEN] Now uses weighted random based on strength values to ensure variety
     * When multiple patterns match the enemy count, one is randomly selected based on strength
     */
    selectPattern(count, options = {}) {
        const { allowSubset = false } = options;
        if (!count || count < 3) return null;

        // Find all patterns that exactly match the count
        const exactMatches = [];
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.minEnemies && count <= pattern.maxEnemies) {
                exactMatches.push({ name, ...pattern });
            }
        }

        // If we have exact matches, use weighted random selection
        if (exactMatches.length > 0) {
            return this._weightedRandomSelect(exactMatches);
        }

        if (!allowSubset) return null;

        // For subset mode: find patterns we can fully fill (count >= maxEnemies)
        const subsetMatches = [];
        for (const [name, pattern] of Object.entries(this.patterns)) {
            if (count >= pattern.maxEnemies) {
                subsetMatches.push({ name, ...pattern });
            }
        }

        if (subsetMatches.length === 0) return null;

        // [IMPROVED] Adjust pattern selection based on size diversity preference
        // When we have too many large formations, prefer smaller patterns
        const adjustedMatches = subsetMatches.map(p => {
            let adjustedStrength = p.strength;
            
            // Reduce CIRCLE weight in subset mode to prevent dominance
            if (p.name === 'CIRCLE') {
                adjustedStrength *= 0.4;
            }
            
            // Apply size diversity preference
            if (this.preferSmallFormations) {
                if (p.maxEnemies <= this.smallPatternThreshold) {
                    adjustedStrength *= 2.0;  // Boost small patterns
                } else if (p.maxEnemies >= 10) {
                    adjustedStrength *= 0.3;  // Strong penalty for large patterns
                } else {
                    adjustedStrength *= 0.7;  // Mild penalty for medium patterns
                }
            } else {
                // Normal mode: slight preference for medium-sized patterns (5-8)
                if (p.maxEnemies >= 5 && p.maxEnemies <= 8) {
                    adjustedStrength *= 1.2;
                }
            }
            
            return { ...p, strength: adjustedStrength };
        });

        // Weighted random among all matching patterns (no tier filtering)
        return this._weightedRandomSelect(adjustedMatches);
    }

    /**
     * Select a pattern randomly based on strength weights
     * @param {Array} patterns - Array of pattern objects with strength property
     * @returns {Object} Selected pattern
     */
    _weightedRandomSelect(patterns) {
        if (patterns.length === 0) return null;
        if (patterns.length === 1) return patterns[0];

        // Calculate total weight
        let totalWeight = 0;
        for (const pattern of patterns) {
            totalWeight += pattern.strength || 0.1;
        }

        // Pick a random value
        let random = Math.random() * totalWeight;

        // Find which pattern was selected
        for (const pattern of patterns) {
            random -= pattern.strength || 0.1;
            if (random <= 0) {
                return pattern;
            }
        }

        // Fallback to last pattern (shouldn't happen but just in case)
        return patterns[patterns.length - 1];
    }

    /**
     * Create a constellation from a cluster
     */
    createConstellation(enemies, patternInput) {
        // 1. Calculate initial centroid of the potential cluster
        let centerX = 0, centerY = 0;
        for (const enemy of enemies) {
            centerX += enemy.x;
            centerY += enemy.y;
        }
        centerX /= enemies.length;
        centerY /= enemies.length;

        // 2. Sort enemies by distance to centroid to find the most compact group
        // This prevents "stringy" clusters from forming constellations across vast distances
        enemies.sort((a, b) => {
            const distA = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
            const distB = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
            return distA - distB;
        });

        // 3. Select the closest N enemies for the pattern
        let pattern = patternInput;
        let targetEnemies = enemies.slice(0, pattern.maxEnemies);

        // 4. Recalculate centroid for the actual selected group
        centerX = 0;
        centerY = 0;
        for (const enemy of targetEnemies) {
            centerX += enemy.x;
            centerY += enemy.y;
        }
        centerX /= targetEnemies.length;
        centerY /= targetEnemies.length;

        // 5. Sort selected enemies by angle around the new center
        // This ensures that the visual "loop" (i -> i+1) connects adjacent enemies
        // preventing crossing lines and visual distortions
        const allowedRadiusSq = this.maxConstellationRadiusSq * 1.1; // Slightly lenient to avoid over-culling
        targetEnemies = targetEnemies.filter(enemy => {
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            return (dx * dx + dy * dy) <= allowedRadiusSq;
        });

        // Recenter after culling distant outliers to avoid string-like shapes
        if (targetEnemies.length >= this.minEnemiesForConstellation) {
            centerX = 0;
            centerY = 0;
            for (const enemy of targetEnemies) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= targetEnemies.length;
            centerY /= targetEnemies.length;
        }

        // If the remaining group no longer fits the selected pattern, gracefully downgrade to best-fit
        if (targetEnemies.length < pattern.minEnemies || targetEnemies.length > pattern.maxEnemies) {
            const fallback = this.selectPattern(targetEnemies.length, { allowSubset: true });
            if (!fallback) {
                window.logger?.log('[Emergent] Skipping constellation: spread too large for pattern');
                return null;
            }
            pattern = fallback;
            targetEnemies = targetEnemies.slice(0, pattern.maxEnemies);

            // Recenter after trimming to fallback size
            centerX = 0;
            centerY = 0;
            for (const enemy of targetEnemies) {
                centerX += enemy.x;
                centerY += enemy.y;
            }
            centerX /= targetEnemies.length;
            centerY /= targetEnemies.length;
        }

        // [IMPROVED] Smart anchor assignment - assign enemies to nearest target positions
        // This minimizes crossing lines and reduces initial movement needed
        const initialRotation = Math.random() * Math.PI * 2;
        const tempPositions = pattern.getTargetPositions(centerX, centerY, targetEnemies, initialRotation);
        
        if (tempPositions && tempPositions.length === targetEnemies.length) {
            // Use Hungarian-style greedy assignment: each enemy gets nearest unassigned position
            const assigned = new Set();
            const assignments = [];
            
            // Sort enemies by distance to center (assign inner enemies first for stability)
            const sortedByDist = [...targetEnemies].map((e, origIdx) => ({
                enemy: e,
                origIdx,
                distToCenter: Math.hypot(e.x - centerX, e.y - centerY)
            })).sort((a, b) => a.distToCenter - b.distToCenter);
            
            for (const { enemy, origIdx } of sortedByDist) {
                let bestPos = -1;
                let bestDistSq = Infinity;
                
                for (let p = 0; p < tempPositions.length; p++) {
                    if (assigned.has(p)) continue;
                    const dx = enemy.x - tempPositions[p].x;
                    const dy = enemy.y - tempPositions[p].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < bestDistSq) {
                        bestDistSq = distSq;
                        bestPos = p;
                    }
                }
                
                if (bestPos >= 0) {
                    assigned.add(bestPos);
                    assignments.push({ enemy, anchor: bestPos });
                }
            }
            
            // Apply assignments
            for (const { enemy, anchor } of assignments) {
                enemy.constellationAnchor = anchor;
            }
        } else {
            // Fallback: sort by angle and assign sequentially
            targetEnemies.sort((a, b) => {
                const angleA = Math.atan2(a.y - centerY, a.x - centerX);
                const angleB = Math.atan2(b.y - centerY, b.x - centerX);
                return angleA - angleB;
            });
            
            for (let i = 0; i < targetEnemies.length; i++) {
                targetEnemies[i].constellationAnchor = i;
            }
        }

        const constellation = {
            id: `constellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            enemies: targetEnemies,
            pattern,
            centerX,
            centerY,
            createdAt: Date.now(),
            age: 0,
            rotation: initialRotation,
            rotationSpeed: (Math.random() - 0.5) * 0.4 + (Math.random() > 0.5 ? 0.1 : -0.1), // Slower rotation
            integrityStrikes: 0
        };

        // Mark enemies as part of this constellation
        const joinTimestamp = (this.game?.timeMs) ??
            (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

        for (const enemy of targetEnemies) {
            enemy.constellation = constellation.id;
            enemy.constellationJoinedAt = joinTimestamp;
            enemy.constellationCooldown = 0;
            if (enemy.movement && enemy.movement.velocity) {
                // Clear residual momentum from prior behavior to let formation forces take over
                enemy.movement.velocity.x *= 0.2;
                enemy.movement.velocity.y *= 0.2;
            }
        }

        this.constellations.push(constellation);

        // ALWAYS LOG constellation creation for visibility
        window.logger?.log(`✨ [Emergent] Created ${pattern.name} constellation with ${targetEnemies.length} enemies at (${Math.round(centerX)}, ${Math.round(centerY)})`);

        // Trigger visual effects
        if (this.effects) {
            this.effects.onConstellationFormed(constellation);
        }

        return constellation;
    }

    /**
     * Reoptimize anchor assignments for all constellations
     * Fixes shapes that look glitchy because enemies are assigned to suboptimal positions
     * Uses greedy nearest-neighbor to minimize total movement needed
     */
    reoptimizeAnchors() {
        for (const constellation of this.constellations) {
            if (!constellation || constellation.age < 1.0) continue;  // Let new constellations settle first
            
            const aliveEnemies = constellation.enemies.filter(e => e && !e.isDead);
            if (aliveEnemies.length < 2) continue;
            
            const positions = this._getConstellationPositions(constellation);
            if (!positions || positions.length === 0) continue;
            
            // Calculate current total distance (sum of all enemy-to-target distances)
            let currentTotalDist = 0;
            for (const enemy of aliveEnemies) {
                const anchor = enemy.constellationAnchor ?? 0;
                const target = positions[anchor % positions.length];
                if (target) {
                    const dx = enemy.x - target.x;
                    const dy = enemy.y - target.y;
                    currentTotalDist += Math.sqrt(dx * dx + dy * dy);
                }
            }
            
            // Try greedy reassignment to minimize crossing
            const assigned = new Set();
            const newAssignments = [];
            
            // Sort enemies by distance from constellation center (inner first)
            const sortedEnemies = [...aliveEnemies].map(e => ({
                enemy: e,
                distToCenter: Math.hypot(e.x - constellation.centerX, e.y - constellation.centerY)
            })).sort((a, b) => a.distToCenter - b.distToCenter);
            
            for (const { enemy } of sortedEnemies) {
                let bestPos = -1;
                let bestDistSq = Infinity;
                
                for (let p = 0; p < positions.length; p++) {
                    if (assigned.has(p)) continue;
                    const dx = enemy.x - positions[p].x;
                    const dy = enemy.y - positions[p].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < bestDistSq) {
                        bestDistSq = distSq;
                        bestPos = p;
                    }
                }
                
                if (bestPos >= 0) {
                    assigned.add(bestPos);
                    newAssignments.push({ enemy, anchor: bestPos, dist: Math.sqrt(bestDistSq) });
                }
            }
            
            // Calculate new total distance
            let newTotalDist = 0;
            for (const { dist } of newAssignments) {
                newTotalDist += dist;
            }
            
            // Only apply if it's an improvement (reduces total distance by at least 10%)
            if (newTotalDist < currentTotalDist * 0.9) {
                for (const { enemy, anchor } of newAssignments) {
                    enemy.constellationAnchor = anchor;
                }
            }
        }
    }

    /**
     * Update constellation state (center, rotation) and detect stuck enemies
     * [SIMPLIFIED] Removed complex calculations that caused lag and oscillation
     */
    applyConstellationForces(deltaTime) {
        for (const constellation of this.constellations) {
            constellation.age += deltaTime;

            // Update center position (follow enemies' mass center)
            let centerX = 0, centerY = 0;
            let validEnemies = 0;
            for (const enemy of constellation.enemies) {
                if (enemy && !enemy.isDead) {
                    centerX += enemy.x;
                    centerY += enemy.y;
                    validEnemies++;
                }
            }

            if (validEnemies === 0) continue;

            centerX /= validEnemies;
            centerY /= validEnemies;

            // [SIMPLIFIED] Smooth center tracking with fixed blend factor
            // No complex age-based calculations that vary per frame
            const blendFactor = 0.4;
            constellation.centerX = constellation.centerX * (1 - blendFactor) + centerX * blendFactor;
            constellation.centerY = constellation.centerY * (1 - blendFactor) + centerY * blendFactor;

            // Group-level steering toward player with standoff
            const player = this.game?.player;
            if (player) {
                const dxp = player.x - constellation.centerX;
                const dyp = player.y - constellation.centerY;
                const dist = Math.sqrt(dxp * dxp + dyp * dyp) || 1;

                // Simple distance error calculation
                const standoff = this.constellationStandoffDistance;
                const distError = dist - standoff;
                
                // [IMPROVED] Scale movement based on constellation count to prevent chaos
                const constellationCount = this.constellations.length;
                let moveScale = 1.0;
                if (constellationCount >= 8) {
                    moveScale = 0.6;  // Much slower when many constellations
                } else if (constellationCount >= 5) {
                    moveScale = 0.8;  // Slightly slower
                }
                
                const moveSpeed = 120 * moveScale;
                const errorSign = distError > 0 ? 1 : -1;
                const errorMagnitude = Math.min(Math.abs(distError), 200);
                
                const moveAmount = errorSign * (errorMagnitude / 150) * moveSpeed * deltaTime;
                constellation.centerX += (dxp / dist) * moveAmount;
                constellation.centerY += (dyp / dist) * moveAmount;

                // [IMPROVED] Reduce orbit motion when many constellations to prevent chaos
                const orbitSpeed = 35 * moveScale * deltaTime;
                constellation.centerX += (-dyp / dist) * orbitSpeed;
                constellation.centerY += (dxp / dist) * orbitSpeed;
                
                // [NEW] Blend rotation toward player for aggressive patterns
                // Arrow-type patterns face the player, circular patterns spin freely
                const facingPatterns = ['ARROW', 'ARROW_FLIGHT', 'V_FORMATION', 'DOUBLE_V', 'LINE'];
                if (facingPatterns.includes(constellation.pattern?.name)) {
                    const targetRotation = Math.atan2(dyp, dxp);
                    // Smooth rotation toward player (blend factor 0.03 = slow turn)
                    let rotDiff = targetRotation - constellation.rotation;
                    // Normalize to -PI to PI
                    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                    constellation.rotation += rotDiff * 0.03;
                }
            }

            // Update rotation - maintain rotation longer for more dynamic feel
            // Slower decay rate so shapes keep spinning
            const rotationRate = constellation.rotationSpeed * Math.max(0.5, 1.0 - constellation.age * 0.01);
            constellation.rotation += rotationRate * deltaTime;
            
            // Normalize rotation to prevent floating point issues over time
            if (constellation.rotation > Math.PI * 2) {
                constellation.rotation -= Math.PI * 2;
            } else if (constellation.rotation < 0) {
                constellation.rotation += Math.PI * 2;
            }
            
            // Periodically clean dead enemies from the array (every ~1 second based on age)
            if (Math.floor(constellation.age) !== Math.floor(constellation.age - deltaTime)) {
                const before = constellation.enemies.length;
                constellation.enemies = constellation.enemies.filter(e => e && !e.isDead);
                if (constellation.enemies.length < before) {
                    // Clear target cache since enemy count changed
                    delete constellation._targetCache;
                    // [FIX] Reassign anchors sequentially to prevent stacking
                    // Without this, enemies with high anchor indices would map to
                    // the same positions as low indices via modulo (e.g., anchor 6 % 6 = 0)
                    for (let i = 0; i < constellation.enemies.length; i++) {
                        constellation.enemies[i].constellationAnchor = i;
                    }
                }
            }
        }
    }

    /**
     * Remove constellations that have broken apart
     */
    cleanupConstellations() {
        this.constellations = this.constellations.filter(constellation => {
            if (!constellation || !constellation.enemies || !constellation.pattern) {
                return false;
            }

            // Helper to dismantle
            const dismantle = () => {
                for (const enemy of constellation.enemies) {
                    if (enemy) {
                        delete enemy.constellation;
                        delete enemy.constellationJoinedAt;
                        delete enemy.constellationAnchor;
                        const nowTs = (typeof performance !== 'undefined' && performance.now)
                            ? performance.now()
                            : Date.now();
                        enemy.constellationCooldown = nowTs + this.constellationReformCooldownMs;
                    }
                }
                this.effects?.removeConstellationBeams?.(constellation.id);
                // Trigger break effects if available
                if (this.effects) {
                    this.effects.onFormationBroken({
                        center: { x: constellation.centerX, y: constellation.centerY },
                        enemies: constellation.enemies,
                        config: { name: constellation.pattern?.name || 'UNKNOWN' }
                    });
                }
            };

            // Remove if too many enemies died
            const aliveEnemies = constellation.enemies.filter(e => e && !e.isDead);
            if (aliveEnemies.length < (constellation.pattern.minEnemies || 2)) {
                dismantle();
                return false;
            }

            // Remove if too old (45 seconds max - increased from 30)
            if (constellation.age > 45) {
                dismantle();
                return false;
            }

            // Allow grace period after creation to settle into shape
            // [TUNED] Extended grace period - scales with pattern complexity
            const patternComplexity = (constellation.pattern.maxEnemies || 3) / 3; // 1.0 for triangle, 2.0 for hexagon
            const gracePeriod = 4.0 + patternComplexity * 1.5; // 5.5s for triangle, 7s for hexagon
            if (constellation.age < gracePeriod) {
                return true;
            }

            // Cache target positions - we use them for multiple checks
            const targetPositions = this._getConstellationPositions(constellation);

            if (!targetPositions || targetPositions.length === 0) {
                dismantle();
                return false;
            }

            // 0. Bounding radius check - if anyone wandered far from the centroid
            let radiusBreached = false;
            for (const enemy of aliveEnemies) {
                const dx = enemy.x - constellation.centerX;
                const dy = enemy.y - constellation.centerY;
                if ((dx * dx + dy * dy) > this.maxConstellationRadiusSq) {
                    radiusBreached = true;
                    break;
                }
            }

            // 1. Edge Length Check (Visual Connection Lines)
            // [IMPROVED] Pattern-specific thresholds for better stability
            const patternMaxEdge = this.getPatternMaxEdgeLength(constellation.pattern.name);
            const maxEdgeLengthSq = patternMaxEdge * patternMaxEdge;
            let edgeTooLong = false;
            let worstEdgeRatio = 0;
            
            // Only check edges between alive enemies
            for (let i = 0; i < aliveEnemies.length; i++) {
                const e1 = aliveEnemies[i];
                const e2 = aliveEnemies[(i + 1) % aliveEnemies.length];

                if (e1 && e2) {
                    const distSq = (e1.x - e2.x) ** 2 + (e1.y - e2.y) ** 2;
                    const ratio = distSq / maxEdgeLengthSq;
                    if (ratio > worstEdgeRatio) worstEdgeRatio = ratio;
                    if (distSq > maxEdgeLengthSq * 1.5) {  // 50% over limit = too long
                        edgeTooLong = true;
                        break;
                    }
                }
            }

            // 2. Target Deviation Check using cached positions
            // [TUNED] More lenient deviation threshold - enemies need time to reach targets
            const maxDeviationSq = 300 * 300;
            let deviationTooHigh = false;
            for (let i = 0; i < aliveEnemies.length; i++) {
                const enemy = aliveEnemies[i];

                const anchorIndex = enemy.constellationAnchor ?? i;
                // [FIX] Safety check for empty targetPositions array
                const target = targetPositions.length > 0
                    ? targetPositions[anchorIndex % targetPositions.length]
                    : null;

                if (target) {
                    const distSq = (enemy.x - target.x) ** 2 + (enemy.y - target.y) ** 2;
                    if (distSq > maxDeviationSq) {
                        deviationTooHigh = true;
                        break;
                    }
                }
            }

            const violated = edgeTooLong || deviationTooHigh || radiusBreached;
            if (violated) {
                // [IMPROVED] Graduated strike system - minor violations add less
                let strikeAmount = 1;
                if (edgeTooLong) strikeAmount = 2;  // Edge violations are more serious
                if (radiusBreached) strikeAmount = 2;
                if (deviationTooHigh && !edgeTooLong) strikeAmount = 0.5;  // Minor if just deviation
                
                constellation.integrityStrikes = (constellation.integrityStrikes || 0) + strikeAmount;
                if (constellation.integrityStrikes >= this.integrityStrikeLimit) {
                    dismantle();
                    return false;
                }
                return true; // Grace period before dismantling
            }

            // Healthy constellation - faster recovery
            // [IMPROVED] Decay rate proportional to how well-formed it is
            const decayRate = worstEdgeRatio < 0.5 ? 1.0 : 0.3;  // Faster decay when stable
            constellation.integrityStrikes = Math.max(0, (constellation.integrityStrikes || 0) - decayRate);
            return true;
        });
    }

    /**
     * Get cached constellation target positions to avoid recomputing per enemy
     * Uses the same cache fields as EnemyMovement so both systems share results.
     * [PERFORMANCE] Uses frame number instead of float comparisons
     * @param {Object} constellation
     * @returns {Array<{x:number,y:number}>}
     */
    _getConstellationPositions(constellation) {
        // [STABILITY] Guard against missing constellation or pattern
        if (!constellation || !constellation.pattern || typeof constellation.pattern.getTargetPositions !== 'function') {
            return [];
        }

        const cache = constellation._targetCache || (constellation._targetCache = {});
        const enemyCount = constellation.enemies?.length || 0;

        // [PERFORMANCE] Use frame number as cache key instead of comparing floats
        const currentFrame = this.game?.frameCount ||
                            window.gameManager?.frameCount ||
                            Math.floor(performance.now() / 16.67);

        if (cache.frame !== currentFrame || cache.count !== enemyCount) {
            cache.positions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            ) || [];
            cache.frame = currentFrame;
            cache.count = enemyCount;
        }

        return cache.positions;
    }

    /**
     * Check if enemy is already in a constellation
     */
    isInConstellation(enemy) {
        return !!enemy.constellation;
    }

    /**
     * Get color for constellation pattern type
     * [UPDATED] Added all patterns including new tactical formations
     */
    getPatternColor(patternName) {
        const colors = {
            'LINE': { r: 50, g: 200, b: 255 },       // Cyan-blue
            'ARROW': { r: 255, g: 80, b: 80 },       // Red
            'TRIANGLE': { r: 0, g: 255, b: 153 },    // Neon green
            'CROSS': { r: 255, g: 200, b: 50 },      // Gold
            'DIAMOND': { r: 153, g: 50, b: 255 },    // Purple
            'STAR': { r: 255, g: 255, b: 50 },       // Bright yellow
            'PENTAGON': { r: 255, g: 153, b: 0 },    // Orange
            'V_FORMATION': { r: 255, g: 120, b: 80 }, // Orange-red
            'HEXAGON': { r: 255, g: 50, b: 180 },    // Magenta
            'CIRCLE': { r: 50, g: 180, b: 255 },     // Sky blue
            'DOUBLE_TRIANGLE': { r: 0, g: 220, b: 180 },   // Teal
            'DUAL_DIAMOND': { r: 180, g: 80, b: 255 },     // Bright purple
            'OCTAGON': { r: 255, g: 100, b: 150 },         // Pink
            'ARROW_FLIGHT': { r: 255, g: 60, b: 60 },      // Bright red
            'CRESCENT': { r: 200, g: 200, b: 255 },        // Pale blue
            'DOUBLE_V': { r: 255, g: 180, b: 50 },         // Gold-orange
            'SPIRAL': { r: 100, g: 255, b: 200 },          // Mint green
            'DOUBLE_CRESCENT': { r: 255, g: 150, b: 200 }, // Light pink
            // New tactical patterns
            'PINCER': { r: 220, g: 50, b: 100 },           // Crimson - aggressive flanking
            'TRIDENT': { r: 100, g: 150, b: 255 },         // Steel blue - piercing attack
            'SHIELD_WALL': { r: 180, g: 180, b: 200 },     // Silver - defensive
            'HOURGLASS': { r: 255, g: 100, b: 255 },       // Fuchsia - unique shape
            'ORBIT': { r: 150, g: 220, b: 255 },           // Light cyan - planetary
            'CROWN': { r: 255, g: 215, b: 0 },             // Gold - royal formation
            'CLAW': { r: 200, g: 80, b: 80 }               // Dark red - predatory
        };
        return colors[patternName] || { r: 0, g: 255, b: 153 };
    }

    /**
     * Get max edge length for pattern integrity checks
     * Different patterns have different natural spacing
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
            // New tactical patterns
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
     * Render constellation visualizations
     * Always shows subtle visual feedback so players can see constellations forming
     */
    render(ctx) {
        // Always render, but make it subtle if not in debug mode
        const isDebugMode = window.debugManager?.debugMode || false;

        ctx.save();

        for (const constellation of this.constellations) {
            const targetPositions = constellation.pattern.getTargetPositions(
                constellation.centerX,
                constellation.centerY,
                constellation.enemies,
                constellation.rotation
            );

            // Draw constellation outline - ALWAYS visible now (not just debug)
            const patternColor = this.getPatternColor(constellation.pattern.name);
            const outlineAlpha = isDebugMode ? 0.4 : 0.2;

            ctx.strokeStyle = `rgba(${patternColor.r}, ${patternColor.g}, ${patternColor.b}, ${outlineAlpha})`;
            ctx.lineWidth = isDebugMode ? 2 : 1.5;
            ctx.setLineDash(isDebugMode ? [5, 5] : [10, 5]);

            // Draw polygon connecting target positions
            if (targetPositions.length > 2) {
                ctx.beginPath();
                ctx.moveTo(targetPositions[0].x, targetPositions[0].y);
                for (let i = 1; i < targetPositions.length; i++) {
                    ctx.lineTo(targetPositions[i].x, targetPositions[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }

            // ALWAYS show subtle constellation center marker (even without debug)
            // Make it more visible!
            const pulseIntensity = 0.5 + Math.sin(constellation.age * 3) * 0.5; // 0-1 pulse
            const baseAlpha = isDebugMode ? 0.5 : 0.3;
            const pulsingAlpha = baseAlpha * pulseIntensity;

            ctx.fillStyle = isDebugMode ? `rgba(100, 200, 255, ${pulsingAlpha})` : `rgba(0, 255, 153, ${pulsingAlpha})`;
            ctx.strokeStyle = isDebugMode ? `rgba(100, 200, 255, ${pulsingAlpha + 0.2})` : `rgba(0, 255, 153, ${pulsingAlpha + 0.2})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);

            // Draw geometric icon based on pattern type
            const size = isDebugMode ? 12 : 8;
            ctx.beginPath();

            if (constellation.pattern.name === 'PAIR') {
                // Two small dots
                const rot = constellation.rotation || 0;
                const dx = Math.cos(rot) * 8;
                const dy = Math.sin(rot) * 8;
                ctx.arc(constellation.centerX - dx, constellation.centerY - dy, 2, 0, Math.PI * 2);
                ctx.arc(constellation.centerX + dx, constellation.centerY + dy, 2, 0, Math.PI * 2);
            } else if (constellation.pattern.name === 'TRIANGLE' || constellation.pattern.name === 'ARROW') {
                // Triangle/Arrow
                const rot = constellation.rotation || 0;
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 2.6) * size, constellation.centerY + Math.sin(rot + 2.6) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot - 2.6) * size, constellation.centerY + Math.sin(rot - 2.6) * size);
                ctx.closePath();
            } else if (constellation.pattern.name === 'DIAMOND' || constellation.pattern.name === 'CROSS') {
                // Diamond/Cross
                const rot = constellation.rotation || 0;
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 1.57) * size, constellation.centerY + Math.sin(rot + 1.57) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 3.14) * size, constellation.centerY + Math.sin(rot + 3.14) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot + 4.71) * size, constellation.centerY + Math.sin(rot + 4.71) * size);
                ctx.closePath();
            } else if (constellation.pattern.name === 'STAR') {
                // Star
                const rot = constellation.rotation || 0;
                for (let i = 0; i < 5; i++) {
                    const angle = rot + i * Math.PI * 2 / 5 - Math.PI / 2;
                    const x = constellation.centerX + Math.cos(angle) * size;
                    const y = constellation.centerY + Math.sin(angle) * size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
            } else if (constellation.pattern.name === 'V_FORMATION') {
                // V shape / Chevron
                const rot = constellation.rotation || 0;
                // Tip of V
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                // Left wing
                ctx.lineTo(constellation.centerX + Math.cos(rot + Math.PI * 0.85) * size, constellation.centerY + Math.sin(rot + Math.PI * 0.85) * size);
                // Back to center-ish then to right wing
                ctx.moveTo(constellation.centerX + Math.cos(rot) * size, constellation.centerY + Math.sin(rot) * size);
                ctx.lineTo(constellation.centerX + Math.cos(rot - Math.PI * 0.85) * size, constellation.centerY + Math.sin(rot - Math.PI * 0.85) * size);
            } else if (constellation.pattern.name === 'LINE') {
                // Horizontal line
                const rot = constellation.rotation || 0;
                const perpAngle = rot + Math.PI / 2;
                ctx.moveTo(constellation.centerX + Math.cos(perpAngle) * size, constellation.centerY + Math.sin(perpAngle) * size);
                ctx.lineTo(constellation.centerX - Math.cos(perpAngle) * size, constellation.centerY - Math.sin(perpAngle) * size);
            } else {
                // Circle for pentagon, hexagon, circle patterns
                ctx.arc(constellation.centerX, constellation.centerY, size, 0, Math.PI * 2);
            }

            ctx.fill();
            ctx.stroke();

            // In debug mode, draw lines from enemies to their target positions
            if (isDebugMode) {
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
                ctx.setLineDash([2, 2]);
                for (let i = 0; i < constellation.enemies.length; i++) {
                    const enemy = constellation.enemies[i];
                    const anchorIndex = enemy?.constellationAnchor ?? i;
                    const target = targetPositions[anchorIndex % targetPositions.length];
                    if (!enemy || !target) continue;

                    ctx.beginPath();
                    ctx.moveTo(enemy.x, enemy.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();

        // Render effects (particles, beams, etc.)
        if (this.effects) {
            this.effects.render(ctx);
        }
    }

    /**
     * Get debug stats
     */
    getDebugStats() {
        return {
            activeConstellations: this.constellations.length,
            totalEnemies: this.constellations.reduce((sum, c) => sum + c.enemies.length, 0),
            patterns: this.constellations.map(c => c.pattern.name).join(', ')
        };
    }

    /**
     * Reset all constellations
     */
    reset() {
        // Unmark all enemies
        for (const constellation of this.constellations) {
            for (const enemy of constellation.enemies) {
                if (enemy) {
                    delete enemy.constellation;
                    delete enemy.constellationJoinedAt;
                    delete enemy.constellationAnchor;
                }
            }
        }

        this.constellations = [];
        this.detectionTimer = 0;
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.EmergentFormationDetector = EmergentFormationDetector;
    window.logger?.log('EmergentFormationDetector class loaded');
}

if (typeof module !== 'undefined') {
    module.exports = EmergentFormationDetector;
}

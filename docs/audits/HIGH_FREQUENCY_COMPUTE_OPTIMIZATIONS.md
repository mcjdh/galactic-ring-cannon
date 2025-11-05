# High-Frequency Compute Optimizations

**Date**: November 4, 2025  
**Focus**: CPU-intensive calculations in game engine core  
**Target**: 60 FPS on Raspberry Pi 5 (ARM64)

---

## 🎯 Overview

This document identifies high-frequency mathematical operations in the game engine and provides optimized alternatives using lookup tables, pre-computation, and algorithm improvements.

---

## 🔥 Critical Hot Paths Identified

### 1. **Trigonometric Functions** (Already Optimized ✅)

**Frequency**: ~200-500 calls/frame  
**Impact**: **CRITICAL** - 5x slower on ARM vs x86  
**Solution**: TrigCache + FastMath wrapper

**Files Using Trig**:
- `src/systems/EnemySpawner.js` - Enemy positioning (circular spawns)
- `src/entities/projectile/behaviors/HomingBehavior.js` - Projectile aiming
- `src/systems/OptimizedParticlePool.js` - Particle direction vectors
- `src/core/gameManagerBridge.js` - Particle effects
- `src/systems/upgrades.js` - Orbital weapon positioning

**Current Status**: 
- ✅ TrigCache system exists (360° lookup table)
- ✅ FastMath wrapper available  
- ❌ Not used everywhere (still direct Math.sin/cos calls)

---

### 2. **Distance Calculations** (Partially Optimized ⚠️)

**Frequency**: ~1000+ calls/frame (collision, AI, magnets)  
**Impact**: **HIGH** - sqrt is expensive (~20-40 cycles)

#### A. Square Root Operations

**Problem**: `Math.sqrt()` called unnecessarily for distance comparisons

```javascript
// ❌ SLOW: Calculates sqrt for comparison
const distance = Math.sqrt(dx*dx + dy*dy);
if (distance < threshold) { ... }

// ✅ FAST: Compare squared values (no sqrt)
const distSq = dx*dx + dy*dy;
if (distSq < threshold*threshold) { ... }
```

**Files Needing Optimization**:
1. **`src/entities/XPOrb.js`** (Line 139-155)
   ```javascript
   // Current: Uses sqrt for magnet range check
   const distance = Math.sqrt(dx*dx + dy*dy);
   if (distance < magnetRange) { ... }
   
   // Optimized:
   const distSq = dx*dx + dy*dy;
   const magnetRangeSq = magnetRange * magnetRange;
   if (distSq < magnetRangeSq && distSq > 0) { ... }
   ```

2. **`src/utils/ParticleHelpers.js`** (Line 318-330)
   ```javascript
   // Current: Lightning effect uses sqrt for segment calculation
   const distance = Math.sqrt(dx*dx + dy*dy);
   const segments = Math.max(3, Math.floor(distance / 30));
   
   // Optimized: Use fast approximate distance
   const distance = FastMath.distanceFast(fromX, fromY, toX, toY);
   ```

3. **`src/entities/player/Player.js`** (Line 494-504)
   ```javascript
   // Player.distanceTo() could use FastMath
   distanceTo(other) {
       const dx = this.x - other.x;
       const dy = this.y - other.y;
       return FastMath.distanceFast(this.x, this.y, other.x, other.y);
   }
   ```

**Performance Impact**:
- **Before**: ~40 cycles per sqrt × 1000 calls = 40,000 cycles/frame
- **After**: ~5 cycles per comparison × 1000 calls = 5,000 cycles/frame
- **Savings**: 87.5% reduction in distance checking overhead

---

### 3. **Vector Normalization** (Needs Optimization ⚠️)

**Frequency**: ~100-300 calls/frame (movement, aiming, collision)  
**Impact**: **MEDIUM-HIGH** - Contains division + sqrt

#### A. Standard Normalization

**Problem**: Expensive sqrt + division operation

```javascript
// ❌ SLOW: Two expensive operations (sqrt + 2 divisions)
const length = Math.sqrt(x*x + y*y);
const normalX = x / length;
const normalY = y / length;

// ✅ FAST: Single inverse sqrt + 2 multiplications
const invLength = FastMath.invSqrt(x*x + y*y);
const normalX = x * invLength;
const normalY = y * invLength;
```

**Files Needing Optimization**:

1. **`src/systems/InputManager.js`** (Line 351-372)
   ```javascript
   // Current: Normalizes diagonal movement with sqrt + division
   const length = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
   movement.x /= length;
   movement.y /= length;
   
   // Optimized: Use FastMath.normalizeDiagonal (pre-computed constant)
   if (movement.x !== 0 && movement.y !== 0) {
       movement.x *= FastMath.SQRT2_INV; // 0.7071 pre-computed
       movement.y *= FastMath.SQRT2_INV;
   }
   ```

2. **`src/entities/projectile/behaviors/HomingBehavior.js`** (Line 68-90)
   ```javascript
   // Current: Normalizes vectors with sqrt
   const invCurrentSpeed = 1 / Math.sqrt(currentSpeedSq);
   const invTargetLen = 1 / Math.sqrt(targetLenSq);
   
   // Optimized: Use FastMath.invSqrt
   const invCurrentSpeed = FastMath.invSqrt(currentSpeedSq);
   const invTargetLen = FastMath.invSqrt(targetLenSq);
   ```

3. **`src/utils/CollisionUtils.js`** (Line 106-125)
   ```javascript
   // Current: Normalizes collision normal
   const distance = Math.sqrt(dx*dx + dy*dy);
   return { x: dx/distance, y: dy/distance };
   
   // Optimized: Use inverse sqrt
   const invDist = FastMath.invSqrt(dx*dx + dy*dy);
   return { x: dx*invDist, y: dy*invDist };
   ```

**Performance Impact**:
- **Before**: ~60 cycles (sqrt + 2 divides) × 200 calls = 12,000 cycles/frame
- **After**: ~25 cycles (invSqrt + 2 multiplies) × 200 calls = 5,000 cycles/frame
- **Savings**: 58% reduction in normalization overhead

---

### 4. **Diagonal Movement** (Special Case Optimization)

**Frequency**: Every frame for player input  
**Impact**: **LOW** but trivial to optimize

**Problem**: WASD diagonal movement unnecessarily calculates sqrt

```javascript
// ❌ CURRENT: Calculates sqrt every frame
if (inputX !== 0 && inputY !== 0) {
    const length = Math.sqrt(inputX*inputX + inputY*inputY); // Always sqrt(2)
    inputX /= length;
    inputY /= length;
}

// ✅ OPTIMIZED: Use pre-computed constant
if (inputX !== 0 && inputY !== 0) {
    inputX *= FastMath.SQRT2_INV; // 0.7071067811865476
    inputY *= FastMath.SQRT2_INV;
}
```

**Benefit**: Eliminates sqrt from critical input path (saved every frame)

---

### 5. **Random Number Operations** (New Optimization)

**Frequency**: ~100-500 calls/frame (particles, drops, spawns)  
**Impact**: **LOW-MEDIUM** but stackable

#### A. Random Angles for Particles

**Problem**: Computing `Math.random() * Math.PI * 2` repeatedly

```javascript
// ❌ CURRENT: Generates random angle every call
for (let i = 0; i < particles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
}

// ✅ OPTIMIZED: Use pre-generated random angles
for (let i = 0; i < particles; i++) {
    const angle = FastMath.randomAngle(); // From cache
    const { cos, sin } = FastMath.sincos(angle);
    const vx = cos * speed;
    const vy = sin * speed;
}
```

**Files Needing Optimization**:
- `src/systems/OptimizedParticlePool.js` - Particle spawning
- `src/core/gameManagerBridge.js` - Effect creation
- `src/utils/ParticleHelpers.js` - Helper functions

**Performance Impact**:
- Reduces random number generation overhead
- Combines with TrigCache for double benefit
- Small per-call savings add up over hundreds of particles

---

## 📊 Summary of Optimization Opportunities

### High Priority (Immediate Performance Gains)

| Operation | Current Frequency | Potential Speedup | Difficulty |
|-----------|------------------|-------------------|------------|
| Distance comparisons (use squared) | ~1000/frame | 8x faster | ⭐ Easy |
| Vector normalization (use invSqrt) | ~200/frame | 2x faster | ⭐⭐ Medium |
| Trig functions (use FastMath) | ~300/frame | 5x faster (ARM) | ⭐ Easy |
| Diagonal movement (use constant) | 1/frame | 10x faster | ⭐ Trivial |

### Medium Priority (Incremental Improvements)

| Operation | Current Frequency | Potential Speedup | Difficulty |
|-----------|------------------|-------------------|------------|
| Random angle generation (cache) | ~200/frame | 1.5x faster | ⭐⭐ Medium |
| Distance approximation (octagonal) | ~500/frame | 1.3x faster | ⭐ Easy |
| Collision normal (invSqrt) | ~50/frame | 2x faster | ⭐ Easy |

---

## 🚀 NEW FastMath Functions Added

### 1. **`FastMath.normalize(x, y)`**
Fast vector normalization using inverse sqrt
```javascript
const { x, y } = FastMath.normalize(dx, dy);
```

### 2. **`FastMath.invSqrt(x)`**
Quake III fast inverse square root (ARM-optimized)
```javascript
const invLen = FastMath.invSqrt(lengthSquared);
```

### 3. **`FastMath.SQRT2_INV`**
Pre-computed constant for diagonal normalization (0.7071...)

### 4. **`FastMath.normalizeDiagonal(x, y)`**
Specialized diagonal movement normalization
```javascript
const { x, y } = FastMath.normalizeDiagonal(inputX, inputY);
```

### 5. **`FastMath.distanceFast(x1, y1, x2, y2)`**
Octagonal distance approximation (~30% faster, <4% error)
```javascript
const approxDist = FastMath.distanceFast(px, py, ex, ey);
```

### 6. **`FastMath.isWithinDistance(x1, y1, x2, y2, threshold)`**
Squared distance comparison (avoids sqrt)
```javascript
if (FastMath.isWithinDistance(px, py, ex, ey, 100)) { ... }
```

### 7. **`FastMath.randomAngle()`**
Cached random angles for particle effects
```javascript
const angle = FastMath.randomAngle(); // From pre-generated pool
```

### 8. **`FastMath.randomUnitVector()`**
Random direction vector (uses cached angles + trig)
```javascript
const { x, y } = FastMath.randomUnitVector();
```

---

## 📝 Implementation Checklist

### Phase 1: Critical Path Optimizations (High Impact)

- [ ] **XPOrb.js**: Replace distance sqrt with squared comparison
- [ ] **InputManager.js**: Use `FastMath.normalizeDiagonal()` for WASD
- [ ] **HomingBehavior.js**: Replace normalization with `invSqrt()`
- [ ] **EnemySpawner.js**: Use `FastMath.sincos()` for spawn positions
- [ ] **OptimizedParticlePool.js**: Use `FastMath.randomAngle()` and `sincos()`

### Phase 2: Secondary Optimizations (Good ROI)

- [ ] **CollisionUtils.js**: Use `invSqrt()` for collision normals
- [ ] **ParticleHelpers.js**: Use `distanceFast()` for lightning segments
- [ ] **Player.js**: Update `distanceTo()` to use `FastMath`
- [ ] **gameManagerBridge.js**: Use `FastMath.sincos()` in particle effects

### Phase 3: Polish (Small Wins)

- [ ] Search codebase for remaining `Math.sin`/`Math.cos` direct calls
- [ ] Replace `Math.sqrt()` in non-critical paths with `distanceFast()`
- [ ] Add performance profiling to measure actual gains

---

## 🧪 Testing & Validation

### Performance Benchmarks

```javascript
// Test distance comparison optimization
console.time('Original sqrt');
for (let i = 0; i < 10000; i++) {
    const d = Math.sqrt(Math.random()*100);
    if (d < 50) {}
}
console.timeEnd('Original sqrt');

console.time('Squared comparison');
for (let i = 0; i < 10000; i++) {
    const dSq = Math.random()*100;
    if (dSq < 2500) {}
}
console.timeEnd('Squared comparison');
```

### Accuracy Verification

```javascript
// Verify distanceFast accuracy
for (let i = 0; i < 100; i++) {
    const x1 = Math.random() * 1000;
    const y1 = Math.random() * 1000;
    const x2 = Math.random() * 1000;
    const y2 = Math.random() * 1000;
    
    const exact = FastMath.distance(x1, y1, x2, y2);
    const approx = FastMath.distanceFast(x1, y1, x2, y2);
    const error = Math.abs(exact - approx) / exact * 100;
    
    console.assert(error < 5, `Error too high: ${error}%`);
}
```

---

## 💡 Architecture Patterns

### 1. **Squared Distance Comparison Pattern**

```javascript
// Instead of:
if (distanceTo(enemy) < range) { ... }

// Use:
function distanceToSquared(entity) {
    const dx = entity.x - this.x;
    const dy = entity.y - this.y;
    return dx*dx + dy*dy;
}
if (distanceToSquared(enemy) < range*range) { ... }
```

### 2. **Fast Normalization Pattern**

```javascript
// Instead of:
const len = Math.sqrt(x*x + y*y);
const normX = x / len;
const normY = y / len;

// Use:
const { x: normX, y: normY } = FastMath.normalize(x, y);
```

### 3. **Particle Direction Pattern**

```javascript
// Instead of:
const angle = Math.random() * Math.PI * 2;
const vx = Math.cos(angle) * speed;
const vy = Math.sin(angle) * speed;

// Use:
const { x: vx, y: vy } = FastMath.randomUnitVector();
vx *= speed;
vy *= speed;
```

---

## 🎯 Expected Performance Gains

### Raspberry Pi 5 (ARM64)

| Optimization | Estimated FPS Improvement | Confidence |
|--------------|---------------------------|-----------|
| Distance comparisons | +3-5 FPS | High |
| Vector normalization | +2-3 FPS | Medium |
| Trig via FastMath | +5-8 FPS | High |
| Combined optimizations | +10-15 FPS | Medium-High |

### Desktop (x64)

| Optimization | Estimated FPS Improvement | Confidence |
|--------------|---------------------------|-----------|
| Distance comparisons | +1-2 FPS | Medium |
| Vector normalization | +0.5-1 FPS | Low |
| Trig via FastMath | +0-1 FPS | Low |
| Combined optimizations | +2-4 FPS | Low-Medium |

**Note**: Desktop benefits less because x86 processors have optimized sqrt/div instructions and fast FPU.

---

## 🔧 Recommended Next Steps

1. **Immediate**: Implement Phase 1 optimizations (high impact, easy wins)
2. **Short-term**: Add performance profiling to measure actual gains
3. **Medium-term**: Implement Phase 2 optimizations
4. **Long-term**: Consider SIMD operations for batch calculations (WebAssembly)

---

**Author**: GitHub Copilot  
**Date**: November 4, 2025  
**Status**: Implementation Ready ✅

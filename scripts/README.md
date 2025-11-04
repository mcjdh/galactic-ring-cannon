# Scripts & Utilities

This folder contains development, testing, and debugging utilities for Galactic Ring Cannon.

---

## Performance Testing Scripts

Location: `performance/`

### check-gpu-memory.sh

**Purpose:** Monitor GPU memory usage on Raspberry Pi 5

**Usage:**
```bash
./scripts/performance/check-gpu-memory.sh
```

**What it does:**
- Queries GPU memory allocation using `vcgencmd`
- Shows current GPU memory usage
- Useful for diagnosing rendering performance issues on Pi 5

**When to use:**
- Testing performance on Raspberry Pi 5
- Debugging visual rendering issues
- Checking if GPU memory is bottleneck

---

### test-pi5-performance.sh

**Purpose:** Comprehensive performance testing suite for Raspberry Pi 5

**Usage:**
```bash
./scripts/performance/test-pi5-performance.sh
```

**What it does:**
- Runs the game with performance monitoring enabled
- Measures FPS, frame times, and rendering metrics
- Tests various game scenarios (enemy counts, effects, etc.)
- Outputs performance report

**When to use:**
- Before/after optimization changes
- Validating game runs at 60 FPS on Pi 5
- Identifying performance bottlenecks

**Requirements:**
- Raspberry Pi 5 hardware
- Game must be running via local server

---

### test-trigcache.sh

**Purpose:** Test and benchmark trigonometry cache performance

**Usage:**
```bash
./scripts/performance/test-trigcache.sh
```

**What it does:**
- Tests the trigonometry lookup table optimization
- Measures cache hit rates
- Compares performance with/without caching
- Validates cache accuracy

**When to use:**
- Verifying trig cache is working correctly
- Benchmarking math optimization improvements
- Testing after changes to MathUtils

**Related code:**
- `src/utils/MathUtils.js` - Contains trig cache implementation

---

## Debug Utilities

Location: `debug/`

### debug-projectiles.js

**Purpose:** Projectile system debugging utility

**Usage:**

1. **Add to HTML (temporary):**
   ```html
   <script src="scripts/debug/debug-projectiles.js"></script>
   ```

2. **Access in browser console:**
   ```javascript
   window.debugProjectiles = true;  // Enable detailed logging
   ```

**What it provides:**
- Logs every projectile creation with full properties
- Traces projectile collision detection
- Shows special type assignments (explosive, ricochet, chain)
- Validates projectile behavior

**When to use:**
- Debugging projectile-related bugs
- Verifying special types apply correctly
- Investigating collision issues
- Testing multi-shot behavior

**Features:**
- Real-time projectile tracking
- Visual overlay (optional)
- Console logging with filtering
- Performance impact minimal

---

## Running Scripts

### Shell Scripts (*.sh)

All shell scripts are executable. Run directly:
```bash
./scripts/performance/check-gpu-memory.sh
```

If permission denied:
```bash
chmod +x scripts/performance/*.sh
./scripts/performance/check-gpu-memory.sh
```

### JavaScript Utilities (*.js)

JavaScript utilities are meant to be included in the game's HTML for debugging:

1. Add script tag to `index.html`
2. Enable via browser console
3. Remove when done debugging

**Never commit these to production builds!**

---

## Adding New Scripts

### Performance Scripts

Place in `performance/` if the script:
- Measures performance metrics
- Benchmarks code
- Tests hardware capabilities
- Profiles the game

### Debug Scripts

Place in `debug/` if the script:
- Helps debug specific systems
- Provides development-time logging
- Visualizes internal state
- Validates behavior

### Other Scripts

Create new subdirectories as needed:
- `scripts/build/` - Build automation
- `scripts/deploy/` - Deployment helpers
- `scripts/test/` - Test automation

---

## Best Practices

1. **Make scripts executable:**
   ```bash
   chmod +x scripts/performance/my-script.sh
   ```

2. **Add usage instructions:**
   - Use comments at top of script
   - Add help flag: `./script.sh --help`

3. **Document what it does:**
   - Update this README
   - Add inline comments

4. **Test on target platform:**
   - Raspberry Pi 5 for Pi-specific scripts
   - Multiple browsers for debug utilities

5. **Clean up after yourself:**
   - Remove debug scripts from HTML before commit
   - Don't leave logging enabled in production

---

## Platform-Specific Notes

### Raspberry Pi 5

Several scripts are Pi 5 specific and use:
- `vcgencmd` - GPU monitoring
- ARM-specific optimizations
- Hardware acceleration checks

These scripts will fail on other platforms - this is expected.

### Browser Debugging

Debug utilities expect:
- Modern ES6+ browser
- Developer console access
- Game running in development mode

---

## Script Dependencies

| Script | Dependencies | Platform |
|--------|-------------|----------|
| check-gpu-memory.sh | vcgencmd | Raspberry Pi 5 |
| test-pi5-performance.sh | Node.js (optional) | Raspberry Pi 5 |
| test-trigcache.sh | Game running | Any |
| debug-projectiles.js | Browser dev tools | Any |

---

## Maintenance

### Updating Scripts

When updating game code, check if scripts need updates:
- `debug-projectiles.js` - Update if projectile API changes
- Performance scripts - Update if metrics change

### Deprecating Scripts

If a script is no longer needed:
1. Move to `archive/scripts/`
2. Update this README
3. Document why it was deprecated

---

## Quick Reference

**Check GPU memory:**
```bash
./scripts/performance/check-gpu-memory.sh
```

**Run performance test:**
```bash
./scripts/performance/test-pi5-performance.sh
```

**Test trig cache:**
```bash
./scripts/performance/test-trigcache.sh
```

**Enable projectile debugging:**
```javascript
// In browser console
window.debugProjectiles = true;
```

---

**Last Updated:** January 4, 2025

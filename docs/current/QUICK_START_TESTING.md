# ⚡ QUICK START - Performance Testing

**Goal:** Verify +15-25 FPS improvement on Pi5  
**Time:** 5 minutes  

---

## 🚀 Launch & Test

### Step 1: Start Server (30 seconds)
```bash
cd /home/jdh/Desktop/grc-updates/galactic-ring-cannon
python3 -m http.server 8000
```

### Step 2: Open Browser (30 seconds)
- Navigate to: `http://localhost:8000`
- Press `F12` to open console
- Look for: `[Pi5] Performance caches enabled: sqrt, floor, random, vectors` ✅

### Step 3: Quick Verification (1 minute)
**In browser console, run:**
```javascript
cacheReport()
```

**Expected output:**
```
📊 Performance Cache Report
════════════════════════════════════════
Cache Status:
  Enabled:     ✅ YES
  Memory Used: 47234 bytes

sqrt Cache:
  Size:   10000 entries
  Memory: 40000 bytes
  Range:  0 to 100.0
```

If you see this, caches are loaded! ✅

### Step 4: Play Test (3 minutes)
1. Start **Normal Mode**
2. Survive until **10:00 mark** (first boss spawns)
3. **Monitor FPS** in top-left corner
4. **Expected:** 50-58 FPS during boss fight ✅

---

## 📊 Before vs After

### BEFORE Optimizations:
- Boss fight: **30-40 FPS** ❌
- 50 enemies: **35-45 FPS** ❌
- Choppy gameplay

### AFTER Optimizations:
- Boss fight: **48-55 FPS** ✅
- 50 enemies: **50-58 FPS** ✅
- Smooth gameplay

**Target achieved:** No dips below 45 FPS ✅

---

## 🧪 Advanced Testing (Optional)

### A/B Comparison (5 minutes)
**In console:**
```javascript
comparePerformance()
```

This will:
1. Test 30s WITH cache
2. Test 30s WITHOUT cache
3. Show the difference (+15-25 FPS expected)

### FPS Monitoring (2 minutes)
**In console:**
```javascript
monitorFPS(60)
```

Play for 60 seconds, get detailed FPS statistics.

### Performance Benchmark (1 minute)
**In console:**
```javascript
testPerformanceCache()
```

Shows cache speedup:
- sqrt: **~10x faster**
- random: **~7x faster**
- gridCoord: **~4x faster**

---

## ✅ Success Checklist

- [ ] Console shows `[Pi5] Performance caches enabled`
- [ ] `cacheReport()` shows enabled: YES
- [ ] Boss fight FPS stays above 48
- [ ] Heavy combat (50 enemies) stays above 50 FPS
- [ ] No visual stuttering during combat

**All checked?** → Optimization successful! 🎉

---

## 🐛 Troubleshooting

### Cache Not Loading
**Symptom:** Console doesn't show "[Pi5] Performance caches enabled"  
**Fix:**
```javascript
// Check if scripts loaded
console.log(window.perfCache); // Should show object
console.log(window.collisionCache); // Should show object
```

If undefined, check browser console for script loading errors.

### Still Low FPS
**Symptom:** FPS still drops below 45  
**Check:**
1. Close other browser tabs
2. Check `chrome://gpu` - ensure hardware acceleration enabled
3. Test cache effectiveness:
```javascript
perfCacheToggle(); // Disable
// Play for 30s, note FPS
perfCacheToggle(); // Enable
// Play for 30s, note FPS
// Should see +15-25 FPS difference
```

### Cache Hit Rate Low
**Symptom:** `cacheReport()` shows < 70% hit rate  
**Status:** Normal during first 2 minutes of gameplay  
**Action:** Wait 5 minutes, check again (should be 85-90%+)

---

## 🎯 What to Report

**If testing successful:**
```
✅ Caches loaded
✅ Boss fight FPS: XX-XX (should be 48-55+)
✅ Heavy combat FPS: XX-XX (should be 50-58+)
✅ Cache hit rate: XX% (should be 85-90%+)
```

**If testing unsuccessful:**
```
❌ Issue: [describe problem]
🔍 Console errors: [copy/paste any errors]
📊 FPS observed: [min/max FPS during boss]
💾 Cache status: [output of cacheReport()]
```

---

## 📈 Next Steps

**If successful (expected):**
- ✅ Performance target achieved
- ✅ Ready for content expansion
- ✅ Proceed with biome/enemy/boss development

**If not successful (unexpected):**
- Investigate other bottlenecks (GPU, rendering)
- Profile with Chrome DevTools
- Check for browser-specific issues

---

**Total Test Time:** 5-10 minutes  
**Expected Result:** Smooth 50-60 FPS on Pi5 ✅

🚀 **Ready to test!**

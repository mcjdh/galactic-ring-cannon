# Unified Logging System - Quick Reference

## 🎯 Problem Solved

**Before:** Dual logging systems causing confusion
- ❌ Logger.js + LoggerUtils.js both existed
- ❌ 159 direct console.log() calls bypassing logging
- ❌ Mixed usage across 29 files
- ❌ Verbose patterns like `(window.logger?.warn || console.warn)`

**After:** Single unified system
- ✅ One system: `window.logger`
- ✅ Backward compatible
- ✅ Production-safe
- ✅ Clean API

## 📖 Usage

```javascript
// Debug-only (hidden in production)
window.logger.log('Debug info')
window.logger.info('Info message')

// Always visible
window.logger.warn('Warning')
window.logger.error('Error')

// Toggle debug mode
window.toggleDebug()
```

## 🔄 Migration

### Option 1: Automatic (Fast)
```bash
chmod +x scripts/migrate-logging.sh
./scripts/migrate-logging.sh
```

### Option 2: Manual (Careful)
```javascript
// Find & replace in your editor:
window.LoggerUtils.log  →  window.logger.log
window.LoggerUtils.warn  →  window.logger.warn
window.LoggerUtils.error  →  window.logger.error
console.warn  →  window.logger.warn
console.error  →  window.logger.error
console.log  →  window.logger.log  (production code only!)
```

## ✅ What's Done

- ✅ Enhanced Logger.js (primary system)
- ✅ Deprecated LoggerUtils.js (compatibility mode)
- ✅ Migrated 6 critical files
- ✅ Created migration script
- ✅ Full documentation

## 📋 Next Steps

1. Test that game still works
2. Run migration script (or continue manual migration)
3. Test with `?debug=true` URL parameter
4. Remove LoggerUtils.js once all code is migrated

## 🎓 Key Files

- `src/utils/Logger.js` - **USE THIS** (primary system)
- `src/utils/LoggerUtils.js` - DEPRECATED (compat only)
- `docs/audits/UNIFIED_LOGGING_SYSTEM.md` - Full docs
- `scripts/migrate-logging.sh` - Auto-migration script

## 💡 Tips

- Keep debug-guarded console.logs (they're intentional):
  ```javascript
  if (window.debugProjectiles) {
      console.log('[Debug] ...'); // OK!
  }
  ```
  
- Test files can keep console.* for output
- Logger initialization messages are OK
- Use `window.logger.log()` for all new code

---

**Status:** ✅ Core system ready  
**Impact:** Eliminates dual logging confusion  
**Breaking:** None (backward compatible)

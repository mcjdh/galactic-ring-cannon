# Low-HP Danger Indicator - Feature Documentation

**Date Added:** 2025-11-19  
**Status:** ✅ Implemented and Active  
**Applies To:** ALL CHARACTERS (Enhanced for Cybernetic Berserker)

---

## Overview

The **Low-HP Danger Indicator** provides dramatic, real-time visual feedback when ANY player character drops below 30% health. This universal warning system helps players:
1. **Know they're in danger** - immediate visual feedback
2. **Track Edge Walker achievement** - shows when you're in the <30% HP achievement range
3. **Feel the risk/reward** - makes low-HP play exciting and tense

The **Cybernetic Berserker** gets enhanced "rage mode" effects for extra intensity!

## Visual Effects

### **UNIVERSAL (All Characters): Orange Warning Aura** (30% HP Threshold)
- **Inner Orange Glow**: Pulsing energy field around the player
- **Outer Warning Halo**: Expanding and contracting danger indicator
- **Moderate Pulse**: Steady warning rhythm
- **Orange Particles** (when moving): Heat distortion effect

### **BERSERKER ONLY: Enhanced Red Rage** (30% HP + hasBerserker)
- **Intense Red Glow**: Crimson energy instead of orange
- **Faster Pulse**: More aggressive pulsing at low HP
- **1.5x Intensity**: Brighter and more threatening
- **Red Electrical Arcs** (15% HP): Crackling lightning tendrils
- **Crimson Particles**: Blood-red energy trails

---

## Technical Details

### Thresholds
- **Universal Activation**: 30% HP or below (ALL characters)
- **Edge Walker Achievement Zone**: Visual indicator shows you're in achievement range!
- **Berserker Arc Effects**: 15% HP or below (electric arcs)

### Color Coding
- **Orange Warning** (Normal characters): "You're in danger!"
- **Red Rage** (Berserker only): "Unleash the fury!"

### Performance
- **Particle Spawn Rate**: 
  - Normal: ~8% chance per frame when moving
  - Berserker: ~15% chance per frame (more intense)
- **Arc Count**: 4 rotating arcs (berserker only, <15% HP)
- **Rendering**: Optimized canvas gradients and particle pooling

### Visual Parameters
```javascript
// Universal danger threshold
const LOW_HP_THRESHOLD = 0.30; // 30% HP

// Intensity calculation
const dangerIntensity = (LOW_HP_THRESHOLD - healthPercent) / LOW_HP_THRESHOLD;

// Berserker multiplier
const intensityMult = isBerserker ? 1.5 : 1.0;

// Pulse speed (faster at lower HP)
const pulseSpeed = isBerserker 
    ? (150 - (missingHealth * 100))  // Very fast
    : (200 - (dangerIntensity * 80)); // Moderate
```

## Integration

### PlayerRenderer.js
- **Method**: `renderBerserkerAura(ctx)` - Universal low-HP indicator
- **Method**: `spawnDangerParticle(x, y, intensity, isBerserker)` - Particle spawner
- **Render Order**: Aura drawn BEFORE player body (behind player)

### Dependencies
- `player.stats.health` / `player.stats.maxHealth` - HP tracking (UNIVERSAL)
- `player.abilities.hasBerserker` - Optional (for enhanced effects)
- `window.optimizedParticles` - Particle system (gracefully degrades)

## Gameplay Impact

### Universal Benefits (All Characters)
- **Danger Awareness**: Immediate visual feedback at 30% HP
- **Edge Walker Tracking**: Know when you're in achievement range (survive 60s <30% HP)
- **Risk/Reward Feeling**: Low-HP play feels exciting and tense

### Berserker-Specific (Cybernetic Berserker)
- **Power Fantasy**: Red rage aura reinforces stat bonuses
- **Visual Intensity**: 1.5x brighter than normal danger indicator
- **Electrical Arcs**: Threatening lightning at critical HP (<15%)
- **Stat Bonuses** (from berserkerScaling):
  - Up to +60% attack speed
  - Up to +60% damage

## Testing

### Test Universal Low-HP Indicator:
1. Select **ANY character**
2. Take damage until below 30% HP
3. **Expected Results:**
   - Orange pulsing aura appears
   - Intensity increases as HP drops further
   - Orange particles trail when moving
   - Clear visual: "I'm in danger!"

### Test Berserker Enhanced Effects:
1. Select **Cybernetic Berserker**
2. Drop below 30% HP
3. **Expected Results:**
   - **Red** pulsing aura (not orange)
   - Faster, more aggressive pulse
   - Brighter intensity (1.5x multiplier)
   - At <15% HP: Red electrical arcs appear

### Test Edge Walker Achievement:
1. Use any character
2. Drop to <30% HP and survive 60 seconds
3. Visual indicator shows you're in achievement zone!

## Future Enhancements

Potential improvements:
- [ ] Screen vignette at critical HP (<20%) - subtle red tint
- [ ] Different aura colors for different characters (blue for Aegis, purple for Void)
- [ ] Sound effect: Heartbeat/alarm at <30% HP
- [ ] HUD text: "DANGER ZONE" or "EDGE WALKER ACTIVE"
- [ ] Optional: Disable for hardcore players (accessibility option)

## Related Files

- `/src/entities/player/PlayerRenderer.js` - Visual rendering ✅
- `/src/entities/player/PlayerCombat.js` - Berserker stat bonuses
- `/src/config/characters.config.js` - Character definitions
- `/src/systems/achievements.js` - Edge Walker achievement tracking

---

## Notes

**Complexity Rating:** 7/10 - Universal system with character-specific enhancements  
**Performance Impact:** Negligible (1-2 draw calls, minimal particle spawn)  
**Visual Polish:** Very High - clear danger indicator + thematic character effects  
**Accessibility:** Helps ALL players understand danger state

This universal low-HP indicator transforms danger awareness from "check the HP bar" to "FEEL the danger" through dramatic visual feedback. The Cybernetic Berserker gets enhanced rage effects that perfectly match their high-risk, high-reward playstyle!

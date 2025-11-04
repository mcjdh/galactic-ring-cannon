# Boss System Architecture - Quick Reference Guide

## Core Files Structure

```
src/
├── entities/enemy/
│   ├── Enemy.js                    # Main boss entity, phase system
│   ├── EnemyStats.js              # Damage, death, XP handling
│   ├── EnemyRenderer.js           # Visual rendering (crown, phases)
│   ├── types/
│   │   ├── BossEnemy.js           # Boss configuration (600 HP, 30 dmg)
│   │   ├── ExploderEnemy.js       # Explode on death (special mechanic)
│   │   └── SummonerEnemy.js       # Spawn minions (boss counter)
│   └── EnemyTypeRegistry.js       # Maps types to configs
│
├── components/
│   ├── EnemyAI.js                 # Boss AI (phases, attack patterns)
│   └── EnemyAbilities.js          # Boss abilities (minions, damage zones)
│
├── systems/
│   ├── EnemySpawner.js            # Boss spawn timing & triggering
│   └── DifficultyManager.js       # Health/damage scaling logic
│
└── core/systems/
    └── UnifiedUIManager.js        # Boss health bar rendering

config/
└── gameConstants.js               # Spawn intervals, scaling factors
```

---

## Boss Lifecycle

### 1. CREATION (90 seconds)
- EnemySpawner.spawnBoss() called
- Creates Enemy(x, y, 'boss')
- Health: 600 base
- Damage: 30 base

### 2. SCALING (instant)
- DifficultyManager.scaleBoss() applies:
  - Health: max(playerDPS * 7-10s, 600 * difficultyScale * megaBonus)
  - Damage: sqrt(difficultyScale) - conservative
  - Resistance: 0.2 + (bossCount * 0.02), max 0.5

### 3. COMBAT (7-10 seconds per phase)
- Phase 1 (100%-70%): "basic" attacks, 2.0s cooldown
- Phase 2 (70%-40%): "spread" attacks, 1.8s cooldown (20% faster)
- Phase 3 (40%-15%): "circle" attacks, minions, damage zones
- Phase 4 (15%-0%): "random" attacks, 1.0s cooldown (40% faster)

### 4. DEATH
- XP drop: 200 * 3 = 600 XP (base boss)
- Mega boss XP: 600 * 2 = 1200 XP
- Difficulty scaled XP: 600 * difficulty factor
- Callbacks: onBossKilled, onBossDefeated
- Next boss spawns: 90 - 6 (for each previous kill) seconds later

---

## Key Mechanics at a Glance

### Health Scaling Formula
```
boss.health = max(
    playerDPS * fightDuration,      // Ensures 7-10s engagement
    600 * difficultyFactor * megaBossMultiplier
)
```

### Damage Scaling (Conservative)
```
boss.damage = base * sqrt(difficultyFactor)
// Prevents one-shots even at 4.0x difficulty
```

### Difficulty Factor Progression
```
Every 20 seconds: +0.2 base increase
Accelerates with time: multiplied by min(2.0, 1 + timeMinutes/10)
Caps at: 4.0x
```

### Phase Transition Effects
- Visual: Orange "PHASE X!" floating text
- Audio: Screen shake (8 units, 0.8 seconds)
- AI: Attack cooldown multiplied by 0.8-0.6
- Abilities: Special abilities enabled in phase 3+

---

## Boss Attack Patterns

| Phase | Pattern    | Projectiles | Cooldown | Behavior |
|-------|-----------|-------------|----------|----------|
| 1     | basic     | 1           | 2.0s     | Single shot toward player |
| 2     | spread    | 3           | 1.8s     | Fan pattern |
| 3     | circle    | 8           | 1.5s     | All directions |
| 4     | random    | 5           | 1.0s     | Chaotic trajectory |

## Special Boss Abilities

### Minion Spawning (every 8 seconds)
- Count: 2-4 minions
- Types: 'basic', 'fast'
- Health: 70% of difficulty scaling
- Max alive: Configurable (default 4)
- XP reward: Base * 0.5

### Damage Zones (every 6 seconds)
- Location: Player's current position
- Radius: 60 units
- Damage: 80% of boss damage
- Duration: 3 seconds
- Warning: Particle ring before activation

---

## Difficulty Scaling Breakdown

### Time-Based
```
0-1 min:   1.0x → 1.2x difficulty
1-3 min:   1.2x → 1.6x difficulty  
3-5 min:   1.6x → 2.0x difficulty
5-10 min:  2.0x → 4.0x difficulty (max)
```

### Boss Count Impact
```
Boss 1: 1.0x scale, 0.20 resistance
Boss 2: 1.2x scale, 0.22 resistance
Boss 3+: 1.5x scale (mega), 0.24+ resistance
```

### Adaptive Performance
```
If player too strong: Difficulty increases faster
If player struggling: Difficulty penalty reduced (max -2% adjustment)
Target: 60% player performance score
```

---

## Integration Points

### EnemySpawner → DifficultyManager
- Reads: enemySpawnRateMultiplier, bossScalingFactor
- Writes: Calls scaleBoss() on every boss creation

### DifficultyManager → EnemySpawner
- Notifies: onDifficultyChange() callback
- Affects: Spawn rate, max enemies, minion difficulty

### Boss → UI Manager
- Health bar: Gold border, shows damage in real-time
- Phase indicator: "PHASE X!" text on transition
- Crown icon: Visual indicator above boss

### Boss → Upgrade System
- Damage scaling: +35% per Sharp Shots
- Attack speed: +30% per Quick Shot (critical)
- Special effects: Chain/Piercing/Ricochet hit minions
- Survival: Health/regen upgrades counter damage zones

---

## Performance Considerations

### Bosses Are NEVER Culled
```javascript
if (distSq > cullDistance && !enemy.isBoss) {
    cullEnemy();  // Regular enemies culled
}
// Bosses always rendered and updated
```

### Minion & Ability Throttling
- Minion spawn: 8 second cooldown
- Damage zones: 6 second cooldown
- Attack pattern: Updated per phase, not per frame
- Phase check: O(1) array lookup every frame

### Performance Awareness
```
Frame time > 33ms (30fps):
- Reduce max enemies: 86 * 0.7 = 60
- Cull distant non-bosses immediately
- Don't spawn new enemy types
- Reduce minion complexity
```

---

## Critical Balance Points

### Health Balance (7-10 second fights)
- Early game: 250-350 HP (new player DPS ~36)
- Mid game: 800-1200 HP (player DPS ~60-80)
- Late game: 2000-4000 HP (player DPS ~100+)

### Damage Balance (never one-shot)
- Phase 1 dmg: ~20-30 (player HP ~120-200)
- Phase 2 dmg: ~25-35 (player HP ~150-300)
- Phase 3+ dmg: ~30-40 (player HP ~200-500)

### Spawn Schedule (escalating pressure)
- Boss 1: 90 seconds
- Boss 2: 154 seconds (90 + 70 - 6)
- Boss 3: 218 seconds (154 + 70 - 6)
- Accelerates with kills: -0.85s per non-boss kill

---

## Testing Checklist

### Boss Creation
- [ ] Boss spawns at correct time
- [ ] Health scales with difficulty
- [ ] Damage resistance applies
- [ ] Mega boss flag set correctly (3rd+)
- [ ] Color/radius changes on mega

### Boss Combat
- [ ] Phases trigger at correct health %
- [ ] Attack patterns progress through phases
- [ ] Minions spawn periodically
- [ ] Damage zones appear at player location
- [ ] Visual effects (crown, phase text) show

### Difficulty Integration
- [ ] Boss health increases over time
- [ ] Adaptive difficulty adjusts spawn rate
- [ ] Player performance tracked correctly
- [ ] Difficulty cap enforced (4.0x)

### Rewards
- [ ] XP drop amount correct
- [ ] XP scales with difficulty
- [ ] Mega boss bonus applied
- [ ] Kill count incremented
- [ ] Next boss spawn timer reset

### Edge Cases
- [ ] Only one boss alive at a time
- [ ] Boss never culled for performance
- [ ] Minions drop with boss
- [ ] Game doesn't crash with 4+ bosses
- [ ] Damage resistance capped at 50%

---

## Common Issues & Fixes

### Bosses Too Easy
1. Check difficultyFactor progression (should reach 2.0x by 3 min)
2. Verify DPS-based health scaling is enabled
3. Ensure mega boss multiplier applied (1.5x)
4. Reduce fightDurationTarget (7→5 seconds)

### Bosses Too Hard
1. Increase minimumFightDuration (7→10 seconds)
2. Add early-game XP boost (1.5x for 60s)
3. Reduce bossScalingFactor multiplier
4. Increase damage resistance cap reduction per boss

### Spawning Issues
1. Check bossTimer is reset to 0 on spawn
2. Verify isBossAlive() checks activeBossId
3. Ensure spawnBoss() called only when boss not alive
4. Check dynamic boss interval calculation

### Performance Issues
1. Verify bosses not in culling logic
2. Check minion spawn throttle (8s cooldown)
3. Monitor particle effects from phase transitions
4. Profile damage zone creation frequency

---

## Quick Debug Commands

```javascript
// Check boss status
window.gameManager.enemySpawner.activeBossId
window.gameManager.difficultyManager.bossCount
window.gameManager.bossActive

// Get boss entity
const boss = window.gameManager.game.enemies
    .find(e => e.isBoss && !e.isDead);

// Check difficulty metrics
window.gameManager.difficultyManager.getDifficultyMetrics()

// Force next boss spawn
window.gameManager.enemySpawner.bossTimer = 
    window.gameManager.enemySpawner.bossInterval - 1

// Check boss phase
boss.currentPhase  // 1-4
boss.health / boss.maxHealth  // Health %
```

---

## Architecture Principles

1. **Separation of Concerns**: Boss stats separate from AI, abilities, rendering
2. **Component-Based**: Enemy types plugged in via registry
3. **Delegation**: DifficultyManager owns scaling logic
4. **Performance-Aware**: Bosses never culled, abilities throttled
5. **Feedback-Rich**: Visual, audio, and UI cues for all phase changes
6. **Fair Scaling**: DPS-based health ensures engagement regardless of player power
7. **Conservative Damage**: Prevents one-shots through sqrt() scaling

---

## File-by-File Responsibility

| File | Responsibility | Key Methods |
|------|-----------------|------------|
| BossEnemy.js | Boss config | getConfig(), setupBossAttackPatterns() |
| Enemy.js | Boss entity | updateBossSpecifics(), onPhaseChange() |
| EnemyStats.js | Boss health/death | takeDamage(), die(), dropXP() |
| EnemyAI.js | Boss behavior | updateBossAI(), handleBossPhaseLogic() |
| EnemyAbilities.js | Boss attacks | performAttack(), spawnMinions() |
| EnemyRenderer.js | Boss visuals | renderBossCrown(), renderPhaseIndicator() |
| EnemySpawner.js | Boss spawning | spawnBoss(), isBossAlive() |
| DifficultyManager.js | Boss scaling | scaleBoss(), bossScalingFactor |
| UnifiedUIManager.js | Boss UI | renderEntityHealthBar() |

---

Generated: 2025-11-04
Total Implementation: ~6,000 lines of boss-specific code across 9 core files

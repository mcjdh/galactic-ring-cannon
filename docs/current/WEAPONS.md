# Weapon System Documentation
**Last Updated**: November 7, 2025
**Version**: 1.1.0
**Status**: Production Ready

## Overview

The Galactic Ring Cannon features a **data-driven weapon system** that allows players to choose from different weapon archetypes. Each weapon has unique firing patterns, projectile behaviors, and upgrade synergies.

---

## Architecture

### WeaponManager (`src/weapons/WeaponManager.js`)

The `WeaponManager` class coordinates weapon selection and updates:

```javascript
class WeaponManager {
    constructor(player, combat)
    equip(weaponId)           // Switch to a different weapon
    update(deltaTime, game)   // Update active weapon each frame
    fireImmediate(game)       // Trigger weapon fire
    applyUpgrade(upgrade)     // Route upgrades to active weapon
}
```

**Key Features:**
- Registry-based weapon loading
- Lazy instantiation (weapons created on first equip)
- Upgrade routing to active weapon
- Cooldown synchronization with combat system

### Weapon Definitions (`src/config/weapons.config.js`)

Weapons are defined declaratively in `WEAPON_DEFINITIONS`:

```javascript
{
    id: 'pulse_cannon',
    name: 'Pulse Cannon',
    description: '...',
    archetype: 'generalist',
    fireRate: 1.2,                // shots per second
    targeting: 'nearest',         // targeting strategy
    projectileTemplate: {
        count: 1,
        spreadDegrees: 0,
        damageMultiplier: 1.0,
        speedMultiplier: 1.0,
        // ...
    },
    upgradeTags: ['core', 'chain', 'ricochet'],
    secondary: null               // optional secondary ability
}
```

---

## Available Weapons

### 1. Pulse Cannon ⚡

**Archetype**: Generalist
**Fire Rate**: 1.2 shots/sec
**Best For**: Balanced gameplay, reliable damage

**Stats:**
- 1 projectile per shot
- 0° spread (single target)
- 1.0x damage multiplier
- 1.0x speed multiplier
- Auto-targets nearest enemy

**Upgrade Synergies:**
- ✅ Chain Lightning
- ✅ Ricochet
- ✅ Explosive
- ✅ All core upgrades

**Description:**
The Pulse Cannon is the standard weapon - reliable, consistent, and easy to understand. It fires single projectiles at the nearest enemy with good frequency. Excellent all-around choice that works well with any upgrade combination.

**Best Character Match:** Aegis Vanguard (balanced defensive playstyle)

---

### 2. Nova Shotgun 💥

**Archetype**: Burst
**Fire Rate**: 0.8 shots/sec
**Best For**: Close-range aggression, clearing crowds

**Stats:**
- 5 projectiles per shot
- 50° spread (wide cone)
- 0.75x damage per projectile
- 0.9x speed multiplier
- Targets nearest enemy cone

**Upgrade Synergies:**
- ✅ Explosive (excellent synergy!)
- ✅ Burst damage upgrades
- ❌ Pierce (not inherited)
- ⚠️ Ricochet (limited effectiveness)

**Secondary Ability:**
- **Nova Knockback**: Short-range blast pushing enemies away
- Cooldown: 6 seconds
- Great for emergency escape or repositioning

**Description:**
High-risk, high-reward weapon that excels at close range. Fires a spread of 5 projectiles in a cone, devastating when all shots connect. Lower fire rate means you need to be aggressive and get close. The Nova Knockback secondary provides a panic button for crowded situations.

**Best Character Match:** Nova Corsair (aggressive raider with lifesteal)

---

### 3. Arc Burst ⚡️🔗

**Archetype**: Control
**Fire Rate**: 1.6 shots/sec
**Best For**: Crowd control, chain reactions

**Stats:**
- 2 projectiles per shot
- 12° spread (slight angle)
- 0.9x damage multiplier
- 1.05x speed multiplier
- Auto-targets nearest enemy

**Upgrade Synergies:**
- ✅✅ Chain Lightning (AMAZING synergy!)
- ✅ Support upgrades
- ✅ Core upgrades
- ⚠️ Single-target upgrades (less effective)

**Secondary Ability:**
- **Storm Surge**: Wide arc pulse shocking nearby targets
- Cooldown: 12 seconds
- Area-of-effect chain lightning burst

**Description:**
The Arc Burst fires rapid twin projectiles optimized for chain lightning builds. Highest fire rate of all weapons makes it excellent for proc-based effects. Works best when enemies are clustered, as chains can jump between multiple targets. Storm Surge secondary provides burst AoE damage.

**Best Character Match:** Stormcaller Adept (built-in chain lightning)

---

## Weapon Selection

### How to Choose

Weapons can be selected via:

1. **Character Selection** - Each character starts with a specific weapon
2. **URL Parameter** - `?weapon=pulse_cannon` (for testing)
3. **Default Fallback** - Pulse Cannon if no weapon specified

### In-Game Selection

Currently, weapons are tied to character selection at game start. Future updates may add weapon switching during runs.

---

## Technical Implementation

### Weapon Class Structure

All weapon classes follow this pattern:

```javascript
class PulseCannon {
    constructor({ player, combat, definition, manager })
    update(deltaTime, game)          // Called each frame
    fireImmediate(game)              // Trigger attack
    applyUpgrade(upgrade)            // Handle upgrade application
    onEquip()                        // Called when equipped
    onUnequip()                      // Called when unequipped
    onCombatStatsChanged()           // Recalculate attack speed
}
```

### Registration System

Weapons register themselves with the WeaponManager:

```javascript
// In weapon class file
if (typeof window !== 'undefined') {
    window.Game.Weapons.registerType('pulse_cannon', PulseCannon);
}
```

### Projectile Creation

Weapons create projectiles via `ProjectileFactory`:

```javascript
const projectile = game.projectileFactory.createPlayerProjectile({
    x, y,
    vx, vy,
    damage: this.getEffectiveDamage(),
    owner: this.player,
    // behaviors applied automatically
});
```

---

## Upgrade Interactions

### How Upgrades Apply

1. **Upgrade Selected** → `UpgradeSystem.applyUpgrade(upgrade)`
2. **Route to Player** → `player.applyUpgrade(upgrade)`
3. **Route to Combat** → `player.combat.applyUpgrade(upgrade)`
4. **Route to Weapon** → `player.combat.weaponManager.applyUpgrade(upgrade)`
5. **Weapon Handles** → Weapon-specific logic (if any)

### Weapon-Specific Upgrades

Upgrades can use `upgradeTags` to create weapon-specific effects:

```javascript
// Example: Shotgun-specific upgrade
if (weapon.definition.upgradeTags.includes('shotgun')) {
    // Apply shotgun-specific bonus
}
```

### Universal Upgrades

Most upgrades work globally:
- **Attack Speed** → Affects all weapons
- **Attack Damage** → Affects all weapons
- **Projectile Behaviors** → Applied via ProjectileFactory
- **Player Stats** → Affect damage calculation

---

## Performance Considerations

### Optimization

- Weapons are instantiated lazily (only created when first equipped)
- Projectile behaviors use object pooling
- Fire rate calculations use pre-computed cooldowns
- No per-frame allocations in hot paths

### Memory

- All weapons share the same `ProjectileFactory`
- Projectile behaviors are reused via behavior system
- Weapon instances persist once created

---

## File Locations

```
src/
├── config/
│   └── weapons.config.js         # Weapon definitions
├── weapons/
│   ├── WeaponManager.js          # Manager class
│   └── types/
│       ├── PulseCannon.js        # Pulse Cannon implementation
│       ├── NovaShotgun.js        # Nova Shotgun implementation
│       └── ArcBurst.js           # Arc Burst implementation
```

---

## Future Enhancements

### Planned Features
- [ ] In-run weapon switching
- [ ] Weapon-specific upgrade trees
- [ ] More weapon archetypes (sniper, beam, missile)
- [ ] Weapon leveling system
- [ ] Weapon mods/attachments

### Design Goals
- Keep weapons data-driven (no hardcoding)
- Maintain upgrade compatibility
- Balance weapon variety with accessibility
- Ensure each weapon has distinct playstyle

---

## Developer Guide

### Adding a New Weapon

1. **Define weapon** in `weapons.config.js`:
```javascript
my_weapon: {
    id: 'my_weapon',
    name: 'My Weapon',
    description: '...',
    fireRate: 1.5,
    projectileTemplate: { /* ... */ }
}
```

2. **Create weapon class** in `src/weapons/types/MyWeapon.js`:
```javascript
class MyWeapon {
    constructor({ player, combat, definition, manager }) { /* ... */ }
    update(deltaTime, game) { /* ... */ }
    // ... implement required methods
}

window.Game.Weapons.registerType('my_weapon', MyWeapon);
```

3. **Load in index.html**:
```html
<script defer src="src/weapons/types/MyWeapon.js"></script>
```

4. **Test with URL parameter**:
```
?weapon=my_weapon
```

---

## Troubleshooting

### Weapon Not Firing

**Check:**
1. Is `WeaponManager` enabled? (`weaponManager.enabled = true`)
2. Is weapon registered? (`WeaponManager.getRegisteredTypes()`)
3. Does weapon definition exist in `WEAPON_DEFINITIONS`?
4. Is weapon file loaded before bootstrap?

### Upgrades Not Applying

**Check:**
1. Is `applyUpgrade()` implemented in weapon class?
2. Are upgrade tags correctly specified?
3. Is upgrade routing working? (check `PlayerCombat.applyUpgrade()`)

### Performance Issues

**Check:**
1. Are you creating new objects each frame? (use pooling)
2. Are behaviors properly registered and reused?
3. Is fire rate reasonable? (>10 shots/sec may cause issues)

---

## API Reference

### WeaponManager

**Constructor:**
```javascript
new WeaponManager(player, combat)
```

**Methods:**
- `equip(weaponId)` - Switch to weapon by ID, returns weapon instance
- `update(deltaTime, game)` - Update active weapon
- `fireImmediate(game)` - Trigger immediate fire
- `applyUpgrade(upgrade)` - Route upgrade to active weapon
- `notifyCombatStatChange()` - Notify weapon of stat changes
- `getActiveWeaponId()` - Get currently equipped weapon ID

**Static Methods:**
- `WeaponManager.registerType(id, constructor)` - Register weapon class
- `WeaponManager.getRegisteredTypes()` - List registered weapon IDs

---

## See Also

- [CHARACTERS.md](CHARACTERS.md) - Character system documentation
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Complete API reference
- [GAME_GUIDE.md](GAME_GUIDE.md) - Player-facing guide
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Architecture overview

---

*Last updated: November 7, 2025*
*Architecture: Data-driven, registry-based weapon system*
*Status: Production ready, 3 weapons implemented*

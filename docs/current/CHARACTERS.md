# Character System Documentation
**Last Updated**: November 7, 2025
**Version**: 1.1.0
**Status**: Production Ready

## Overview

The Galactic Ring Cannon features a **character class system** that provides distinct playstyles through starting weapons and stat modifiers. Each character offers unique strengths, weaknesses, and strategic approaches to survival.

---

## Character Architecture

### Character Definitions (`src/config/characters.config.js`)

Characters are defined declaratively in `CHARACTER_DEFINITIONS`:

```javascript
{
    id: 'aegis_vanguard',
    name: 'Aegis Vanguard',
    icon: '#',
    tagline: 'Bulwark Pilot',
    description: 'Frontline defender...',
    difficulty: 'balanced',
    weaponId: 'pulse_cannon',        // Starting weapon
    highlights: [/* ... */],
    modifiers: {
        stats: { /* health, defense, regen */ },
        combat: { /* attack speed, damage */ },
        movement: { /* speed, dodge */ },
        abilities: { /* special abilities */ }
    },
    flavor: '"Quote..."'
}
```

### Modifier System

Characters modify base stats through multiplicative and additive bonuses:

**Stats Modifiers:**
- `healthMultiplier` - Multiply base health (e.g., 1.3 = +30% health)
- `flatHealth` - Add fixed health amount
- `regeneration` - Health regen per second
- `damageReduction` - Flat % damage reduction (0.12 = 12%)
- `lifesteal` - % of damage returned as health
- `critChance` - Base crit chance modifier
- `critMultiplier` - Crit damage multiplier

**Combat Modifiers:**
- `attackSpeedMultiplier` - Fire rate modifier
- `attackDamageMultiplier` - Damage output modifier
- `projectileSpeedMultiplier` - Projectile velocity modifier
- `piercing` - Base pierce count
- `critChanceBonus` - Additive crit chance

**Movement Modifiers:**
- `speedMultiplier` - Move speed modifier
- `dodgeCooldownMultiplier` - Dodge cooldown modifier (0.85 = 15% faster)
- `magnetRangeBonus` - XP magnet range bonus (flat addition)

**Abilities Modifiers:**
- Structured hints for special ability adjustments
- Example: chain lightning base chance, damage, range

---

## Available Characters

### 1. Aegis Vanguard 🛡️

**Tagline**: Bulwark Pilot
**Difficulty**: Balanced
**Starting Weapon**: Pulse Cannon
**Archetype**: Tank / Defensive

#### Stats
- **+30% max hull integrity** (1.3x health multiplier)
- **+12% flat damage mitigation** (damage reduction)
- **1.8 HP/sec regeneration** (passive healing)
- **-8% attack speed** (0.92x multiplier)
- **-5% movement speed** (0.95x multiplier)

#### Highlights
- Highest survivability of all characters
- Excellent for learning the game
- Can tank multiple hits from bosses
- Regenerates health over time
- Balanced weapon with good upgrade synergy

#### Playstyle
The Aegis Vanguard is the **defensive specialist** - built to survive prolonged encounters. High health pool and damage reduction make this character forgiving for new players. The regeneration allows recovery between fights without relying on pickups.

Trade-offs:
- Slightly slower attacks and movement
- Less burst damage than aggressive characters
- Needs to play closer to danger to maximize XP gain

#### Strategic Tips
1. **Prioritize defensive upgrades** early (health, regen, damage reduction)
2. **Use positioning** - your tankiness allows aggressive XP collection
3. **Take risks** - you can survive mistakes other characters can't
4. **Scale into late game** - survivability becomes critical in later boss fights
5. **Upgrade attack speed** to offset base penalty

#### Best Upgrades
- ❤️ Max Health
- ⚡ Attack Speed (to offset penalty)
- 🔄 Orbital Attacks (passive damage while dodging)
- 💥 Explosive (AoE damage for crowd control)
- 🧲 Magnet Range (safe XP collection)

---

### 2. Nova Corsair ⚡

**Tagline**: Close-Range Raider
**Difficulty**: Aggressive
**Starting Weapon**: Nova Shotgun
**Archetype**: Burst / Glass Cannon

#### Stats
- **-10% max health** (0.9x health multiplier)
- **+18% attack tempo** (1.18x attack speed)
- **+8% damage** (1.08x damage multiplier)
- **+15% thruster speed** (1.15x move speed)
- **5% lifesteal** (heal on damage dealt)
- **-15% dodge cooldown** (0.85x multiplier = faster dodge)
- **+90 magnet range** (flat bonus)

#### Highlights
- Highest damage output
- Lightning-fast movement and dodge
- Built-in lifesteal for sustain
- Requires aggressive close-range play
- Shotgun spreads devastating at point-blank

#### Playstyle
The Nova Corsair is the **aggressive raider** - dive into enemy swarms, unload the shotgun, and dodge out before retaliation. High risk, high reward playstyle that rewards skilled positioning and timing.

Trade-offs:
- Lowest survivability (one mistake can end the run)
- Requires mastery of dodge timing
- Shotgun less effective at range
- Must stay close to enemies (dangerous!)

#### Strategic Tips
1. **Master the dodge** - your survival depends on it
2. **Dive in, burst, retreat** - hit-and-run tactics
3. **Use lifesteal** - deal damage to stay alive
4. **Keep moving** - never stand still
5. **Prioritize targets** - eliminate threats quickly
6. **Use Nova Knockback** (secondary ability) to create space

#### Best Upgrades
- ⚡ Attack Speed (more shots = more lifesteal)
- 💥 Explosive (maximize shotgun AoE)
- ❤️ Lifesteal (stack with base 5%)
- 🏃 Move Speed (enhance mobility advantage)
- ↩️ Ricochet (compensate for missed shots)

#### Advanced Tactics
- **Lifesteal sustain loop**: Attack Speed → More Damage → More Lifesteal → Survive longer
- **Shotgun point-blank**: All 5 pellets hit when touching enemy = massive burst
- **Dodge-weaving**: Dash in → shoot → dash out rhythm
- **Panic button**: Nova Knockback when surrounded

---

### 3. Stormcaller Adept ⚡️🔗

**Tagline**: Arc Lance Savant
**Difficulty**: Control
**Starting Weapon**: Arc Burst
**Archetype**: Crowd Control / AoE Specialist

#### Stats
- **+5% max health** (1.05x health multiplier)
- **0.8 HP/sec regeneration** (light passive healing)
- **+5% attack speed** (1.05x multiplier)
- **-5% damage per hit** (0.95x multiplier)
- **+1 base piercing** (projectiles pierce one enemy)

#### Special Abilities
- **Guaranteed chain lightning on Arc Burst projectiles**
  - 60% base chain chance
  - 0.9x damage per chain
  - 260 range
  - Max 3 chains per projectile

#### Highlights
- Built-in chain lightning synergy
- Excellent against grouped enemies
- Moderate survivability with passive regen
- Crowd control specialist
- High fire rate weapon

#### Playstyle
The Stormcaller Adept is the **crowd control specialist** - chain lightning arcs between enemies, creating devastating chain reactions in dense packs. Play at medium range, kiting enemies into clusters where chains maximize damage.

Trade-offs:
- Lower single-target damage
- Relies on enemy positioning
- Less effective against isolated enemies
- Chain lightning requires target density

#### Strategic Tips
1. **Kite enemies into groups** - chains need proximity
2. **Prioritize clustered packs** - maximize chain potential
3. **Use Storm Surge** (secondary) for burst AoE
4. **Upgrade chain effects** - amplify your core strength
5. **Positioning is key** - control enemy flow
6. **Scale chain damage** - stack chain upgrades

#### Best Upgrades
- ⚡ Chain Lightning (stacks with built-in chains!)
- 🔱 Split Shot (more projectiles = more chains)
- ⚡ Attack Speed (more shots = more chains)
- ↩️ Ricochet (create additional chain opportunities)
- 💥 Explosive (AoE on chain targets)

#### Advanced Tactics
- **Chain cascade**: High fire rate + multiple projectiles = continuous chains
- **Crowd funneling**: Force enemies into corridors for maximum chain density
- **Storm Surge timing**: Wait for maximum enemy density
- **Pierce chains**: Base pierce + chains = hit many targets per shot
- **Boss minions**: Use minion spawns as chain conduits to boss

---

## Character Selection

### How to Choose

Characters are selected at game start through the main menu.

**For New Players:**
- Start with **Aegis Vanguard** - forgiving and balanced
- Learn core mechanics without high punishment
- Graduate to aggressive characters once comfortable

**For Experienced Players:**
- **Nova Corsair** - skill-based, high-ceiling gameplay
- **Stormcaller Adept** - strategic positioning and planning

### Difficulty Ratings

| Character | Difficulty | Skill Floor | Skill Ceiling |
|-----------|-----------|-------------|---------------|
| Aegis Vanguard | Balanced | Low | Medium |
| Nova Corsair | Aggressive | High | Very High |
| Stormcaller Adept | Control | Medium | High |

---

## Character Synergies

### Weapon Matches

| Character | Weapon | Synergy Rating |
|-----------|--------|----------------|
| Aegis Vanguard | Pulse Cannon | ⭐⭐⭐⭐⭐ Perfect |
| Nova Corsair | Nova Shotgun | ⭐⭐⭐⭐⭐ Perfect |
| Stormcaller Adept | Arc Burst | ⭐⭐⭐⭐⭐ Perfect |

*Currently, each character's weapon is optimized for their playstyle.*

### Meta Upgrade Priorities

**Aegis Vanguard:**
1. Reinforced Hull (health)
2. Enhanced Firepower (compensate attack speed)
3. Ion Thrusters (mobility)
4. Stellar Fortune (survivability)
5. Lightning Mastery (good with Pulse Cannon)

**Nova Corsair:**
1. Enhanced Firepower (maximize burst)
2. Ion Thrusters (enhance mobility advantage)
3. Lightning Mastery (if taking chain upgrades)
4. Reinforced Hull (offset health penalty)
5. Stellar Fortune (crit synergy)

**Stormcaller Adept:**
1. Lightning Mastery (amplify chains!)
2. Enhanced Firepower (boost damage)
3. Ion Thrusters (positioning)
4. Stellar Fortune (scaling)
5. Reinforced Hull (durability)

---

## Technical Implementation

### Character Application

Characters are applied during player initialization:

```javascript
// In Player constructor or initialization
if (selectedCharacter) {
    this.applyCharacterModifiers(selectedCharacter);
}
```

### Modifier Application

Modifiers apply to base stats:

```javascript
// Example: Health modifier
this.maxHealth = BASE_HEALTH * character.modifiers.stats.healthMultiplier;
this.maxHealth += character.modifiers.stats.flatHealth || 0;

// Example: Attack speed
this.attackSpeed = BASE_ATTACK_SPEED * character.modifiers.combat.attackSpeedMultiplier;
```

### Weapon Assignment

```javascript
// WeaponManager uses character's weaponId
const weaponId = character.weaponId || 'pulse_cannon';
player.combat.weaponManager.equip(weaponId);
```

---

## Balance Considerations

### Design Philosophy

Characters are balanced for **different skill levels and playstyles**, not for equal power:

- **Aegis Vanguard**: Forgiving, consistent, lower skill ceiling
- **Nova Corsair**: Punishing, high-skill, highest potential
- **Stormcaller Adept**: Strategic, positioning-focused, scaling

### Power Curves

**Early Game (Levels 1-10):**
- Aegis Vanguard: ★★★★★ (tankiness shines)
- Nova Corsair: ★★★☆☆ (risky without upgrades)
- Stormcaller: ★★★★☆ (chains effective early)

**Mid Game (Levels 10-20):**
- Aegis Vanguard: ★★★★☆ (solid scaling)
- Nova Corsair: ★★★★★ (upgrades unlock potential)
- Stormcaller: ★★★★★ (chain scaling peaks)

**Late Game (Boss 3+):**
- Aegis Vanguard: ★★★★☆ (survivability critical)
- Nova Corsair: ★★★★★ (max DPS with skill)
- Stormcaller: ★★★★☆ (scaling depends on upgrades)

---

## Future Enhancements

### Planned Features
- [ ] Character unlocks (start with 1, unlock others)
- [ ] Character-specific achievements
- [ ] Character progression/leveling
- [ ] Alternative skins/appearances
- [ ] More character archetypes (support, summoner, etc.)

### Design Goals
- Maintain distinct playstyle identity
- Balance accessibility with depth
- Reward mastery of character mechanics
- Ensure all characters are viable late-game

---

## Developer Guide

### Adding a New Character

1. **Define character** in `characters.config.js`:
```javascript
{
    id: 'my_character',
    name: 'My Character',
    icon: '@',
    weaponId: 'pulse_cannon',
    modifiers: {
        stats: { healthMultiplier: 1.2 },
        combat: { attackSpeedMultiplier: 1.1 }
    }
}
```

2. **Test in-game** - character should be selectable in main menu

3. **Balance testing** - play through multiple runs

4. **Document** - add to this guide

---

## Troubleshooting

### Character Not Applying Modifiers

**Check:**
1. Is character selected before player initialization?
2. Are modifiers correctly structured?
3. Is `applyCharacterModifiers()` being called?
4. Check console for errors

### Weapon Not Equipping

**Check:**
1. Does `weaponId` match a registered weapon?
2. Is weapon loaded before character selection?
3. Check `WeaponManager` logs

---

## API Reference

### CHARACTER_DEFINITIONS

**Location:** `window.CHARACTER_DEFINITIONS`
**Type:** `Array<CharacterDefinition>`

**CharacterDefinition Structure:**
```javascript
{
    id: string,
    name: string,
    icon: string,
    tagline: string,
    description: string,
    difficulty: 'balanced' | 'aggressive' | 'control',
    weaponId: string,
    highlights: string[],
    modifiers: {
        stats?: { /* ... */ },
        combat?: { /* ... */ },
        movement?: { /* ... */ },
        abilities?: { /* ... */ }
    },
    flavor: string
}
```

---

## See Also

- [WEAPONS.md](WEAPONS.md) - Weapon system documentation
- [GAME_GUIDE.md](GAME_GUIDE.md) - Player-facing guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Complete API reference
- [GAME_DESIGN.md](GAME_DESIGN.md) - Game design philosophy

---

*Last updated: November 7, 2025*
*Architecture: Data-driven character system with stat modifiers*
*Status: Production ready, 3 characters implemented*

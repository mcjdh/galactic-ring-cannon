# Character System Documentation
**Last Updated**: November 19, 2025
**Version**: 1.2.0
**Status**: Production Ready

## Overview

The Galactic Ring Cannon features a **character class system** that provides distinct playstyles through starting weapons and stat modifiers. With **5 unique characters** to choose from, each offers unique strengths, weaknesses, and strategic approaches to survival.

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

### 4. Nexus Architect 🎯

**Tagline**: Orbital Savant
**Difficulty**: Tactical
**Starting Weapon**: Pulse Cannon
**Archetype**: Orbital Specialist / Methodical Control

#### Stats
- **+10% max health** (1.1x health multiplier)
- **1.2 HP/sec regeneration** (passive healing)
- **-6% attack speed** (0.94x multiplier)
- **+10% projectile speed** (1.1x multiplier)
- **+5% movement speed** (1.05x multiplier)

#### Special Abilities
- **Starts with 2 orbital projectiles** (normally requires upgrade)
  - +10% orbital damage (1.1x multiplier)
  - +20% orbital speed (1.2x multiplier)
  - -10% orbital radius (0.9x - tighter, more precise)

#### Highlights
- Only character that starts with orbitals
- Passive damage while focusing on positioning
- Excellent for methodical, sustained combat
- Orbital bonuses scale with upgrades
- Balanced weapon with reliable damage

#### Playstyle
The Nexus Architect is the **orbital specialist** - commands a constellation of weapons that circle protectively. Starting with 2 free orbitals provides constant passive damage, allowing focus on positioning and dodging. Methodical playstyle that rewards patience and precision.

Trade-offs:
- Slightly slower attack speed (offset by orbitals)
- Requires understanding of orbital mechanics
- Less burst damage than aggressive characters
- Relies on positioning for orbital effectiveness

#### Strategic Tips
1. **Always take orbital upgrades** - it's your core identity
2. **Use movement to aim orbitals** - they follow your position
3. **Focus on positioning** - let orbitals do the work
4. **Stack orbital damage** - multiplicative with your bonuses
5. **Prioritize survival** - orbitals work better when you're alive
6. **Combo with support upgrades** - regen, health, magnet range

#### Best Upgrades
- 🔄 **Orbital Upgrades** (Double/Triple/Quad/Penta Orbit)
- 🎯 Orbital Impact (+40% orbital damage)
- ❤️ Max Health (survive longer = more orbital damage)
- 🔄 Regeneration (sustain for extended fights)
- 🧲 Magnet Range (safer XP collection)
- 🏃 Move Speed (better orbital positioning)

#### Advanced Tactics
- **Orbital weaving**: Move in circles to create orbital "walls"
- **Defensive orbiting**: Stay behind orbitals while kiting
- **Orbital saturation**: With 5 orbitals, create an impenetrable ring
- **Hybrid offense**: Use Pulse Cannon for single-target, orbitals for crowds
- **Boss strategy**: Circle bosses to maximize orbital hits per rotation
- **Upgrade synergy**: Orbital Impact + 5 orbitals + damage modifiers = absurd DPS

#### Character Identity
- **Early Game**: ★★★★☆ (2 free orbitals give early advantage)
- **Mid Game**: ★★★★★ (orbital upgrades stack beautifully)
- **Late Game**: ★★★★★ (highest potential with full orbital build)

---

### 5. Void Reaver 💀

**Tagline**: Entropy's Harbinger
**Difficulty**: Expert
**Starting Weapon**: Void Piercer
**Archetype**: Glass Cannon / Risk-Reward Specialist
**Unlock**: Complete the "Edge Walker" achievement (survive 3 minutes below 30% health)

#### Stats
- **-20% max health** (0.8x health multiplier - glass cannon!)
- **15% lifesteal** (heal on damage dealt - keeps you alive)
- **0.5 HP/sec regeneration** (low passive regen)
- **+15% base damage** (1.15x damage multiplier)
- **+2 base piercing** (projectiles pierce two enemies)
- **+8% crit chance** (bonus critical hit chance)
- **+20% movement speed** (1.2x move speed - dodge or die!)
- **+20% projectile speed** (1.2x projectile speed)
- **-10% dodge cooldown** (0.9x multiplier = faster dodge)
- **+120 magnet range** (larger XP collection radius)

#### Special Mechanics - Death's Edge Passive
**The Void Reaver grows exponentially stronger as health decreases:**
- Below 50% health: Gains up to **+30% attack speed** (scales from 50% → 0% HP)
- Below 50% health: Gains up to **+40% damage** (scales from 50% → 0% HP)
- **Critical damage bonus**: +15% crit damage when using Void Piercer
- **Risk-reward loop**: Lower health = higher DPS, but one mistake ends the run

#### Highlights
- **Extreme glass cannon** - lowest health, highest potential damage
- **Scales inversely with health** - becomes a monster at low HP
- **High-precision gameplay** - Void Piercer rewards accuracy
- **Lifesteal sustain** - damage keeps you alive in the danger zone
- **Fastest movement** - +20% speed for dodging and positioning
- **Critical hit specialist** - enhanced crit chance and damage
- **Requires expert-level skill** - unforgiving but incredibly rewarding

#### Playstyle
The Void Reaver is the **ultimate risk-reward character** - designed for expert players who thrive under pressure. With only 80% base health, you're constantly dancing with death. But in that danger zone (below 50% HP), you transform into a devastating force with massive damage and attack speed bonuses.

The key is **controlled aggression**: use lifesteal to stay in the 30-50% health range where you're lethal but not dead. The Void Piercer's long-range precision shots combined with high pierce and crit make every shot count.

Trade-offs:
- **Extremely fragile** - lowest health pool in the game
- **Punishing mistakes** - one wrong move can be fatal
- **Requires constant awareness** - must track health percentage
- **Lifesteal dependency** - need to deal damage to survive
- **No safety net** - low regen means mistakes compound

#### Strategic Tips
1. **Embrace the danger zone** - 30-50% HP is your power spike
2. **Master dodging** - your survival depends on perfect timing
3. **Maximize lifesteal** - it's your only sustain mechanism
4. **Use speed advantage** - outmaneuver everything
5. **Pick targets carefully** - high pierce means line up shots
6. **Track your health** - know when you're in power mode
7. **Play the edge** - too high HP = wasted damage, too low = instant death

#### Best Upgrades
- 💀 **Critical Damage** (synergizes with base +8% crit chance)
- ❤️ **Lifesteal** (stack with base 15% for insane sustain)
- ⚡ **Attack Speed** (more shots = more lifesteal = more survival)
- 💥 **Explosive** (AoE damage for lifesteal on multiple targets)
- 🎯 **Piercing** (stack with base +2 for crowd piercing)
- 🏃 **Move Speed** (enhance already high mobility)
- ⚔️ **Attack Damage** (multiply with low-HP damage bonus)

#### Advanced Tactics
- **Health management**: Let yourself drop to 30-40% HP intentionally
- **Lifesteal loop**: High damage + lifesteal = sustain at low HP
- **Precision sniping**: Void Piercer excels at long-range headshots
- **Kiting mastery**: Use 20% move speed to maintain distance
- **Critical burst**: Stack crit upgrades for massive spike damage
- **Controlled descent**: Slowly drop HP early game to unlock power
- **Emergency escape**: +20% speed and fast dodge for panic situations
- **Pierce lines**: Position to hit multiple enemies per shot for lifesteal

#### Character Identity
- **Early Game**: ★★☆☆☆ (fragile, needs upgrades)
- **Mid Game**: ★★★★☆ (upgrades unlock potential)
- **Late Game**: ★★★★★ (highest DPS ceiling when mastered)
- **Skill Floor**: ★★★★★ (expert players only)
- **Skill Ceiling**: ★★★★★ (unlimited potential with perfect play)

#### Unlock Challenge
**Edge Walker Achievement**: Survive for 3 minutes with less than 30% health in a single run

This achievement teaches the core mechanic: thriving at low health. Practice staying in the danger zone before unlocking this high-skill character.

---

## Character Selection

### How to Choose

Characters are selected at game start through the main menu.

**For New Players:**
- Start with **Aegis Vanguard** - forgiving and balanced
- Or try **Nexus Architect** - methodical and rewards planning
- Learn core mechanics without high punishment
- Graduate to aggressive characters once comfortable
- **Avoid Void Reaver** - requires expert-level skill

**For Experienced Players:**
- **Nova Corsair** - skill-based, high-ceiling gameplay
- **Stormcaller Adept** - strategic positioning and planning
- **Nexus Architect** - orbital mastery and sustained combat
- **Void Reaver** - extreme risk-reward, highest skill ceiling

### Difficulty Ratings

| Character | Difficulty | Skill Floor | Skill Ceiling | Unlock |
|-----------|-----------|-------------|---------------|--------|
| Aegis Vanguard | Balanced | Low | Medium | Default |
| Nova Corsair | Aggressive | High | Very High | Achievement |
| Stormcaller Adept | Control | Medium | High | Achievement |
| Nexus Architect | Tactical | Low-Medium | Very High | Achievement |
| Void Reaver | **Expert** | **Very High** | **Maximum** | Achievement |

---

## Character Synergies

### Weapon Matches

| Character | Weapon | Synergy Rating |
|-----------|--------|----------------|
| Aegis Vanguard | Pulse Cannon | ⭐⭐⭐⭐⭐ Perfect |
| Nova Corsair | Nova Shotgun | ⭐⭐⭐⭐⭐ Perfect |
| Stormcaller Adept | Arc Burst | ⭐⭐⭐⭐⭐ Perfect |
| Nexus Architect | Constellation Array | ⭐⭐⭐⭐⭐ Perfect |
| Void Reaver | Void Piercer | ⭐⭐⭐⭐⭐ Perfect |

*Each character's weapon is uniquely designed and optimized for their playstyle.*

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

**Nexus Architect:**
1. Enhanced Firepower (boost orbital damage!)
2. Ion Thrusters (positioning is critical)
3. Reinforced Hull (survive to maximize orbital uptime)
4. Stellar Fortune (long game scaling)
5. Lightning Mastery (situational, if taking chains)

**Void Reaver:**
1. Enhanced Firepower (amplify damage bonuses!)
2. Stellar Fortune (critical hit synergy!)
3. Ion Thrusters (enhance speed advantage)
4. Reinforced Hull (only if struggling to survive)
5. Lightning Mastery (situational)

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
- Nexus Architect: ★★★★☆ (2 free orbitals give edge)
- Void Reaver: ★★☆☆☆ (extremely fragile, needs upgrades)

**Mid Game (Levels 10-20):**
- Aegis Vanguard: ★★★★☆ (solid scaling)
- Nova Corsair: ★★★★★ (upgrades unlock potential)
- Stormcaller: ★★★★★ (chain scaling peaks)
- Nexus Architect: ★★★★★ (orbital build coming online)
- Void Reaver: ★★★★☆ (power spike begins)

**Late Game (Boss 3+):**
- Aegis Vanguard: ★★★★☆ (survivability critical)
- Nova Corsair: ★★★★★ (max DPS with skill)
- Stormcaller: ★★★★☆ (scaling depends on upgrades)
- Nexus Architect: ★★★★★ (full orbital build is devastating)
- Void Reaver: ★★★★★ (highest DPS ceiling when mastered)

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

*Last updated: November 19, 2025*
*Architecture: Data-driven character system with stat modifiers*
*Status: Production ready, 5 characters implemented*
*Latest Addition: Void Reaver - Expert-level glass cannon character*

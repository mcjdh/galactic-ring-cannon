# Lifesteal System Fixes & Updates - 2025-11-19

## Overview
Addressed reported issues with lifesteal tracking, calculation, and availability.

## Fixes

### 1. Lifesteal Calculation Bug
**Issue:** `Projectile.js` was treating `lifesteal` as a flat healing amount (e.g., healing 0.05 HP) instead of a percentage of damage dealt.
**Fix:** Updated `handleCollision` to calculate healing as `damage * lifesteal`.
- **Before:** `healAmount = this.lifesteal` (Healing ~0.05 HP per hit)
- **After:** `healAmount = this.damage * this.lifesteal` (Healing ~5% of damage per hit)

### 2. Lifesteal Tracking
- Added debug logging to `ProjectileFactory` to trace lifesteal source (Base Stats vs. Kill Streak).
- Added debug logging to `Projectile` to trace actual healing amounts.
- Verified that `achievementSystem.onLifestealHealing` is called correctly for "Crimson Pact" and "Grim Harvest".

### 3. New Upgrade
**Added:** "Vampiric Essence" (Rare Support Upgrade)
- **Effect:** +5% Lifesteal
- **Availability:** All classes (Support path)
- **Description:** "Heal for 5% of damage dealt"

## Notes on "Every Class Starts with Lifesteal"
Investigation suggests this perception likely stems from:
1.  **Regeneration:** Most classes (Aegis, Stormcaller, etc.) have passive HP regeneration, which shows green healing numbers similar to lifesteal.
2.  **Kill Streak Bonuses:** Reaching a 20+ kill streak grants temporary lifesteal to ANY character.
3.  **Calculation Bug:** The previous bug meant lifesteal was incredibly weak (healing <1 HP), so if players *were* seeing significant healing, it was likely Regeneration, not Lifesteal.

The new debug logs will help confirm if any class is erroneously receiving base lifesteal.

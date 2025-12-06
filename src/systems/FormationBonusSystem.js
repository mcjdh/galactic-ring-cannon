/**
 * Formation Bonus System
 * 
 * Applies pattern-specific gameplay bonuses to enemies in constellations.
 * Bonuses scale with formation age (ramp-up) and are removed when formations break.
 * 
 * Design principles:
 * - Bonuses are noticeable (10-25%) but not overwhelming
 * - Breaking formations rewards players (disorientation debuff)
 * - Larger/complex patterns have stronger bonuses
 */

class FormationBonusSystem {
    /**
     * Bonus definitions per pattern type
     * Each pattern can have multiple bonus types applied simultaneously
     */
    static BONUSES = {
        // === OFFENSIVE PATTERNS (Speed/Damage) ===
        ARROW: {
            type: 'offensive',
            speedMult: 1.15,       // +15% speed
            description: 'Leading charge'
        },
        V_FORMATION: {
            type: 'offensive',
            speedMult: 1.12,       // +12% speed
            damageMult: 1.08,      // +8% damage
            description: 'Flying wedge'
        },
        CLAW: {
            type: 'offensive',
            damageMult: 1.10,      // +10% damage
            speedMult: 1.08,       // +8% speed
            description: 'Predatory strike'
        },
        TRIDENT: {
            type: 'offensive',
            damageMult: 1.15,      // +15% damage (all members)
            description: 'Focused assault'
        },
        LINE: {
            type: 'offensive',
            speedMult: 1.10,       // +10% speed
            description: 'Coordinated advance'
        },
        ARROW_FLIGHT: {
            type: 'offensive',
            speedMult: 1.18,       // +18% speed (maximum charge)
            description: 'Full flight'
        },
        DOUBLE_V: {
            type: 'offensive',
            firstHitDamageMult: 1.20,  // +20% on first hit
            description: 'Alpha strike'
        },

        // === DEFENSIVE PATTERNS (Damage Reduction) ===
        SHIELD_WALL: {
            type: 'defensive',
            damageReduction: 0.25, // -25% damage taken
            description: 'Phalanx defense'
        },
        CRESCENT: {
            type: 'defensive',
            damageReduction: 0.15, // -15% damage taken
            description: 'Protective arc'
        },
        DIAMOND: {
            type: 'defensive',
            damageReduction: 0.10, // -10% damage taken
            description: 'Stable geometry'
        },
        HEXAGON: {
            type: 'defensive',
            damageReduction: 0.12, // -12% damage taken
            description: 'Honeycomb strength'
        },

        // === UNITY PATTERNS (Shared Effects) ===
        TRIANGLE: {
            type: 'unity',
            damageSharing: 0.20,   // 20% damage shared to others
            description: 'Basic stability'
        },
        PENTAGON: {
            type: 'unity',
            damageSharing: 0.25,   // 25% damage shared
            description: 'Stronger bonds'
        },
        OCTAGON: {
            type: 'unity',
            damageSharing: 0.30,   // 30% damage shared
            description: 'Maximum cohesion'
        },
        STAR: {
            type: 'unity',
            damageRedirectToCenter: 0.15, // 15% redirected to center
            description: 'Star core'
        },

        // === AURA PATTERNS (Active Effects) ===
        CROSS: {
            type: 'aura',
            centerHealPerSec: 8,   // Center heals 8 HP/sec
            description: 'Cross healing'
        },
        ORBIT: {
            type: 'aura',
            coreProtection: 0.50,  // Outer ring absorbs 50% of core damage
            description: 'Protective satellites'
        },
        PINCER: {
            type: 'aura',
            flankingSpeedMult: 1.15, // +15% speed when flanking
            description: 'Tactical advantage'
        },

        // === SPECIAL PATTERNS (Unique Mechanics) ===
        SPIRAL: {
            type: 'special',
            lifesteal: 0.05,       // 5% lifesteal
            description: 'Cosmic drain'
        },
        DOUBLE_TRIANGLE: {
            type: 'special',
            critChance: 0.10,      // +10% crit chance
            description: 'Dual power'
        },
        HOURGLASS: {
            type: 'special',
            lowHealthSpeedMult: 1.20, // +20% speed below 50% HP
            description: 'Time compression'
        },
        CROWN: {
            type: 'special',
            // Note: XP bonus removed per user feedback - could snowball late game
            damageReduction: 0.08, // +8% DR instead
            description: 'Royal resilience'
        },

        // === SIMPLE/NEUTRAL PATTERNS ===
        CIRCLE: {
            type: 'neutral',
            damageReduction: 0.05, // +5% DR
            description: 'Default containment'
        },
        DOUBLE_CRESCENT: {
            type: 'neutral',
            damageReduction: 0.08, // +8% DR
            description: 'Dual shields'
        },
        DUAL_DIAMOND: {
            type: 'neutral',
            damageMult: 1.10,      // +10% damage
            damageReduction: 0.05, // +5% DR
            description: 'Balanced'
        }
    };

    /**
     * Disorientation debuff applied when formations break
     */
    static BREAK_DEBUFF = {
        speedMult: 0.80,          // -20% speed
        duration: 1.5             // 1.5 seconds
    };

    /**
     * Formation age thresholds for bonus ramp-up
     */
    static RAMP_UP = {
        formingEnd: 2.0,          // 0-2s: 0% bonus
        stabilizingEnd: 4.0,      // 2-4s: 50% bonus
        // 4s+: 100% bonus
    };

    /**
     * Get bonus multiplier based on formation age (prevents flickering exploits)
     * @param {number} age - Formation age in seconds
     * @returns {number} Multiplier 0-1
     */
    static getBonusMultiplier(age) {
        if (age < this.RAMP_UP.formingEnd) return 0;
        if (age < this.RAMP_UP.stabilizingEnd) return 0.5;
        return 1.0;
    }

    /**
     * Get bonus definition for a pattern
     * @param {string} patternName - Pattern name (e.g., 'TRIANGLE')
     * @returns {Object|null} Bonus definition or null
     */
    static getBonus(patternName) {
        return this.BONUSES[patternName] || null;
    }

    /**
     * Apply formation bonuses to all enemies in a constellation
     * Called when constellation is created or pattern changes
     * @param {Object} constellation - Constellation object
     */
    static applyBonuses(constellation) {
        if (!constellation || !constellation.pattern || !constellation.enemies) return;

        const bonus = this.getBonus(constellation.pattern.name);
        if (!bonus) return;

        for (const enemy of constellation.enemies) {
            if (!enemy || enemy.isDead) continue;
            this._applyBonusToEnemy(enemy, bonus, constellation);
        }
    }

    /**
     * Apply bonus to a single enemy
     * @private
     */
    static _applyBonusToEnemy(enemy, bonus, constellation) {
        // Initialize bonus tracking if needed
        if (!enemy._formationBonus) {
            enemy._formationBonus = {
                active: true,
                patternName: constellation.pattern.name,
                appliedAt: Date.now(),
                originalSpeed: enemy.baseSpeed || enemy.speed || 100,
                originalDamage: enemy.damage || 10
            };
        }

        // Store pattern name for later reference
        enemy._formationBonus.patternName = constellation.pattern.name;
        enemy._formationBonus.bonus = bonus;
    }

    /**
     * Remove formation bonuses from all enemies in a constellation
     * Called when constellation breaks
     * @param {Object} constellation - Constellation object
     */
    static removeBonuses(constellation) {
        if (!constellation || !constellation.enemies) return;

        for (const enemy of constellation.enemies) {
            if (!enemy) continue;
            this._removeBonusFromEnemy(enemy);
        }
    }

    /**
     * Remove bonus from a single enemy
     * @private
     */
    static _removeBonusFromEnemy(enemy) {
        if (!enemy._formationBonus) return;

        // Restore original values
        if (enemy._formationBonus.originalSpeed) {
            enemy.baseSpeed = enemy._formationBonus.originalSpeed;
            if (enemy.movement) {
                enemy.movement.speed = enemy._formationBonus.originalSpeed;
            }
        }

        delete enemy._formationBonus;
    }

    /**
     * Apply break debuff to enemies when formation breaks
     * @param {Array} enemies - Array of enemies
     */
    static applyBreakDebuff(enemies) {
        if (!enemies || !Array.isArray(enemies)) return;

        const now = Date.now();
        const debuffEnd = now + (this.BREAK_DEBUFF.duration * 1000);

        for (const enemy of enemies) {
            if (!enemy || enemy.isDead) continue;

            enemy._breakDebuff = {
                speedMult: this.BREAK_DEBUFF.speedMult,
                expiresAt: debuffEnd
            };
        }
    }

    /**
     * Get effective speed multiplier for an enemy
     * Combines formation bonus and break debuff
     * @param {Object} enemy - Enemy object
     * @param {Object} constellation - Optional constellation for age-based ramp-up
     * @returns {number} Speed multiplier
     */
    static getSpeedMultiplier(enemy, constellation = null) {
        let mult = 1.0;

        // Apply break debuff (temporary slowdown)
        if (enemy._breakDebuff) {
            if (Date.now() > enemy._breakDebuff.expiresAt) {
                delete enemy._breakDebuff;
            } else {
                mult *= enemy._breakDebuff.speedMult;
            }
        }

        // Apply formation bonus
        if (enemy._formationBonus && enemy._formationBonus.bonus) {
            const bonus = enemy._formationBonus.bonus;
            const age = constellation?.age || 0;
            const rampUp = this.getBonusMultiplier(age);

            if (bonus.speedMult) {
                // Scale bonus by ramp-up factor
                const bonusAmount = (bonus.speedMult - 1.0) * rampUp;
                mult *= (1.0 + bonusAmount);
            }

            // Special: HOURGLASS speed boost at low health
            if (bonus.lowHealthSpeedMult && enemy.health && enemy.maxHealth) {
                if (enemy.health / enemy.maxHealth < 0.5) {
                    const bonusAmount = (bonus.lowHealthSpeedMult - 1.0) * rampUp;
                    mult *= (1.0 + bonusAmount);
                }
            }

            // Special: PINCER flanking speed
            if (bonus.flankingSpeedMult && constellation) {
                // Simple flanking check: is player between constellation center and enemy?
                const game = constellation.game || window.gameManager?.game;
                if (game?.player) {
                    const isFlanking = this._checkFlanking(enemy, constellation, game.player);
                    if (isFlanking) {
                        const bonusAmount = (bonus.flankingSpeedMult - 1.0) * rampUp;
                        mult *= (1.0 + bonusAmount);
                    }
                }
            }
        }

        return mult;
    }

    /**
     * Get effective damage multiplier for an enemy
     * @param {Object} enemy - Enemy object
     * @param {Object} constellation - Optional constellation for age-based ramp-up
     * @param {boolean} isFirstHit - Whether this is the first hit (for DOUBLE_V)
     * @returns {number} Damage multiplier
     */
    static getDamageMultiplier(enemy, constellation = null, isFirstHit = false) {
        let mult = 1.0;

        if (!enemy._formationBonus || !enemy._formationBonus.bonus) return mult;

        const bonus = enemy._formationBonus.bonus;
        const age = constellation?.age || 0;
        const rampUp = this.getBonusMultiplier(age);

        if (bonus.damageMult) {
            const bonusAmount = (bonus.damageMult - 1.0) * rampUp;
            mult *= (1.0 + bonusAmount);
        }

        // Special: DOUBLE_V first hit bonus
        if (bonus.firstHitDamageMult && isFirstHit) {
            const bonusAmount = (bonus.firstHitDamageMult - 1.0) * rampUp;
            mult *= (1.0 + bonusAmount);
        }

        return mult;
    }

    /**
     * Get effective damage reduction for an enemy
     * @param {Object} enemy - Enemy object
     * @param {Object} constellation - Optional constellation for age-based ramp-up
     * @returns {number} Damage reduction (0-1, e.g., 0.25 = 25% reduced)
     */
    static getDamageReduction(enemy, constellation = null) {
        if (!enemy._formationBonus || !enemy._formationBonus.bonus) return 0;

        const bonus = enemy._formationBonus.bonus;
        const age = constellation?.age || 0;
        const rampUp = this.getBonusMultiplier(age);

        if (bonus.damageReduction) {
            return bonus.damageReduction * rampUp;
        }

        return 0;
    }

    /**
     * Process damage sharing for unity patterns
     * @param {Object} enemy - Enemy that took damage
     * @param {number} damage - Original damage amount
     * @param {Object} constellation - Constellation object
     * @returns {number} Damage to apply to this enemy (after sharing)
     */
    static processDamageSharing(enemy, damage, constellation) {
        if (!enemy._formationBonus || !constellation) return damage;

        const bonus = enemy._formationBonus.bonus;
        if (!bonus) return damage;

        const age = constellation.age || 0;
        const rampUp = this.getBonusMultiplier(age);

        // Damage sharing: distribute portion to allies
        if (bonus.damageSharing && rampUp > 0) {
            const shareRatio = bonus.damageSharing * rampUp;
            const sharedDamage = damage * shareRatio;
            const keptDamage = damage - sharedDamage;

            // Distribute shared damage among other constellation members
            const otherEnemies = constellation.enemies.filter(e =>
                e && !e.isDead && e !== enemy && e._formationBonus
            );

            if (otherEnemies.length > 0) {
                const damagePerEnemy = sharedDamage / otherEnemies.length;
                for (const other of otherEnemies) {
                    // Apply shared damage directly (bypasses further sharing to prevent loops)
                    if (other.stats?.takeDamageRaw) {
                        other.stats.takeDamageRaw(damagePerEnemy);
                    } else if (typeof other.health === 'number') {
                        other.health = Math.max(0, other.health - damagePerEnemy);
                    }
                }
            }

            return keptDamage;
        }

        // Damage redirect to center (STAR pattern)
        if (bonus.damageRedirectToCenter && rampUp > 0) {
            const redirectRatio = bonus.damageRedirectToCenter * rampUp;
            const redirectedDamage = damage * redirectRatio;
            const keptDamage = damage - redirectedDamage;

            // Find center enemy (anchor 0)
            const centerEnemy = constellation.enemies.find(e =>
                e && !e.isDead && e.constellationAnchor === 0
            );

            if (centerEnemy && centerEnemy !== enemy) {
                if (centerEnemy.stats?.takeDamageRaw) {
                    centerEnemy.stats.takeDamageRaw(redirectedDamage);
                } else if (typeof centerEnemy.health === 'number') {
                    centerEnemy.health = Math.max(0, centerEnemy.health - redirectedDamage);
                }
            }

            return keptDamage;
        }

        return damage;
    }

    /**
     * Update aura effects for a constellation (called each frame)
     * @param {Object} constellation - Constellation object
     * @param {number} deltaTime - Time delta in seconds
     */
    static updateAuraEffects(constellation, deltaTime) {
        if (!constellation || !constellation.pattern || !constellation.enemies) return;

        const bonus = this.getBonus(constellation.pattern.name);
        if (!bonus || bonus.type !== 'aura') return;

        const age = constellation.age || 0;
        const rampUp = this.getBonusMultiplier(age);
        if (rampUp === 0) return;

        // CROSS: Heal center enemy
        if (bonus.centerHealPerSec) {
            const centerEnemy = constellation.enemies.find(e =>
                e && !e.isDead && e.constellationAnchor === 0
            );

            if (centerEnemy) {
                const healAmount = bonus.centerHealPerSec * deltaTime * rampUp;
                if (centerEnemy.stats?.heal) {
                    centerEnemy.stats.heal(healAmount);
                } else if (typeof centerEnemy.health === 'number' && centerEnemy.maxHealth) {
                    centerEnemy.health = Math.min(centerEnemy.maxHealth, centerEnemy.health + healAmount);
                }
            }
        }
    }

    /**
     * Get crit chance bonus for an enemy
     * @param {Object} enemy - Enemy object
     * @param {Object} constellation - Optional constellation
     * @returns {number} Additional crit chance (0-1)
     */
    static getCritChanceBonus(enemy, constellation = null) {
        if (!enemy._formationBonus || !enemy._formationBonus.bonus) return 0;

        const bonus = enemy._formationBonus.bonus;
        const age = constellation?.age || 0;
        const rampUp = this.getBonusMultiplier(age);

        if (bonus.critChance) {
            return bonus.critChance * rampUp;
        }

        return 0;
    }

    /**
     * Get lifesteal amount for an enemy
     * @param {Object} enemy - Enemy object
     * @param {Object} constellation - Optional constellation
     * @returns {number} Lifesteal ratio (0-1)
     */
    static getLifesteal(enemy, constellation = null) {
        if (!enemy._formationBonus || !enemy._formationBonus.bonus) return 0;

        const bonus = enemy._formationBonus.bonus;
        const age = constellation?.age || 0;
        const rampUp = this.getBonusMultiplier(age);

        if (bonus.lifesteal) {
            return bonus.lifesteal * rampUp;
        }

        return 0;
    }

    /**
     * Check if an enemy is flanking the player
     * @private
     */
    static _checkFlanking(enemy, constellation, player) {
        // Simple flanking: enemy is on opposite side of player from constellation center
        const centerToPlayer = {
            x: player.x - constellation.centerX,
            y: player.y - constellation.centerY
        };
        const enemyToPlayer = {
            x: player.x - enemy.x,
            y: player.y - enemy.y
        };

        // Dot product < 0 means enemy is generally on opposite side
        const dot = centerToPlayer.x * enemyToPlayer.x + centerToPlayer.y * enemyToPlayer.y;
        return dot < 0;
    }

    /**
     * Handle ORBIT pattern core protection
     * @param {Object} enemy - Enemy that took damage
     * @param {number} damage - Damage amount
     * @param {Object} constellation - Constellation object
     * @returns {number} Damage to apply after protection
     */
    static processOrbitProtection(enemy, damage, constellation) {
        if (!enemy._formationBonus || !constellation) return damage;

        const bonus = enemy._formationBonus.bonus;
        if (!bonus?.coreProtection) return damage;

        // Only applies to center enemy (anchor 0)
        if (enemy.constellationAnchor !== 0) return damage;

        const age = constellation.age || 0;
        const rampUp = this.getBonusMultiplier(age);
        if (rampUp === 0) return damage;

        const protectionRatio = bonus.coreProtection * rampUp;
        const absorbedDamage = damage * protectionRatio;
        const remainingDamage = damage - absorbedDamage;

        // Distribute absorbed damage among outer ring (non-center enemies)
        const outerEnemies = constellation.enemies.filter(e =>
            e && !e.isDead && e.constellationAnchor !== 0
        );

        if (outerEnemies.length > 0) {
            const damagePerOuter = absorbedDamage / outerEnemies.length;
            for (const outer of outerEnemies) {
                if (outer.stats?.takeDamageRaw) {
                    outer.stats.takeDamageRaw(damagePerOuter);
                } else if (typeof outer.health === 'number') {
                    outer.health = Math.max(0, outer.health - damagePerOuter);
                }
            }
        }

        return remainingDamage;
    }
}

// Export for Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormationBonusSystem;
}

if (typeof window !== 'undefined') {
    window.FormationBonusSystem = FormationBonusSystem;
    window.Game = window.Game || {};
    window.Game.FormationBonusSystem = FormationBonusSystem;
}

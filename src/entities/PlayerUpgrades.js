/**
 * Player Upgrades System - Handles upgrade application logic
 * Extracted from player.js to reduce file size and improve maintainability
 */
class PlayerUpgrades {
    /**
     * Apply an upgrade to the player
     * @param {Player} player - Player instance
     * @param {Object} upgrade - Upgrade object
     */
    static apply(player, upgrade) {
        const upgradeHandlers = {
            'damage': (p, u) => p.damage *= u.multiplier,
            'fireRate': (p, u) => p.fireRate *= u.multiplier,
            
            'projectileCount': (p, u) => {
                p.projectileCount += u.value || 1;
                if (p.projectileCount > 1) {
                    p.hasSpreadAttack = true;
                    p.projectileSpread = Math.max(
                        p.projectileSpread, 
                        30 * (1 + (p.projectileCount - 2) * 0.15)
                    );
                    
                    if (window.gameManager) {
                        window.gameManager.showFloatingText(
                            `Now firing ${p.projectileCount} projectiles!`, 
                            p.x, p.y - 60, '#f39c12', 16
                        );
                    }
                }
            },
            
            'projectileSpread': (p, u) => p.projectileSpread += u.value,
            'piercing': (p, u) => p.piercing += u.value || 1,
            'speed': (p, u) => p.speed *= u.multiplier,
            
            'maxHealth': (p, u) => {
                const oldMaxHealth = p.maxHealth;
                p.maxHealth *= u.multiplier;
                p.health += (p.maxHealth - oldMaxHealth);
            },
            
            'critChance': (p, u) => {
                // Diminishing returns for high crit chance
                const effectiveness = p.critChance > 0.4 ? 0.7 : 1.0;
                p.critChance += u.value * effectiveness;
            },
            
            'critDamage': (p, u) => p.critMultiplier += u.value,
            'regeneration': (p, u) => p.regeneration += u.value,
            'magnet': (p, u) => p.magnetRange += u.value,
            'projectileSpeed': (p, u) => p.projectileSpeed *= u.multiplier,
            
            'damageReduction': (p, u) => {
                p.damageReduction = Math.min(0.75, (p.damageReduction || 0) + u.value);
            },
            
            'dodgeCooldown': (p, u) => p.dodgeCooldown *= u.multiplier,
            'dodgeDuration': (p, u) => p.dodgeDuration *= u.multiplier,
            'dodgeInvulnerability': (p, u) => p.invulnerabilityTime += u.value,
            
            'special': (p, u) => {
                const specialHandlers = {
                    'orbit': () => {
                        p.hasOrbitalAttack = true;
                        p.orbitCount += u.value || 1;
                        p.orbitDamage = u.damage || 0.4;
                        p.orbitSpeed = u.orbitSpeed || 2;
                        p.orbitRadius = u.orbitRadius || 80;
                    },
                    
                    'chain': () => {
                        p.hasChainLightning = true;
                        p.chainChance = u.value || 0.3;
                        p.chainDamage = u.chainDamage || 0.7;
                        p.chainRange = u.chainRange || 150;
                        p.maxChains = u.maxChains || 1;
                    },
                    
                    'explosion': () => {
                        p.hasExplosiveShots = true;
                        p.explosionRadius = u.explosionRadius || 60;
                        p.explosionDamage = u.explosionDamage || 0.5;
                    },
                    
                    'ricochet': () => {
                        p.hasRicochet = true;
                        p.ricochetBounces = u.bounces || 1;
                        p.ricochetRange = u.bounceRange || 180;
                        p.ricochetDamage = u.bounceDamage || 0.8;
                    },
                    
                    'aoe': () => {
                        p.hasAOEAttack = true;
                        p.aoeAttackRange = Math.max(150, p.aoeAttackRange);
                        p.aoeAttackTimer = p.aoeAttackCooldown;
                    }
                };
                
                if (specialHandlers[u.specialType]) {
                    specialHandlers[u.specialType]();
                }
            },
            
            'orbit': (p, u) => p.orbitCount += u.value || 1,
            'orbitDamage': (p, u) => p.orbitDamage *= u.multiplier || 1,
            'orbitSpeed': (p, u) => p.orbitSpeed *= u.multiplier || 1,
            'orbitSize': (p, u) => p.orbitRadius += u.value || 0,
            
            'chain': (p, u) => {
                p.chainChance = u.value || p.chainChance;
                if (u.maxChains) p.maxChains = u.maxChains;
            },
            
            'chainDamage': (p, u) => p.chainDamage = u.value || p.chainDamage,
            'chainRange': (p, u) => p.chainRange *= u.multiplier || 1,
            'explosionSize': (p, u) => p.explosionRadius *= u.multiplier || 1,
            'explosionDamage': (p, u) => p.explosionDamage = u.value || p.explosionDamage,
            'explosionChain': (p, u) => p.explosionChainChance = u.value || p.explosionChainChance,
            'ricochetBounces': (p, u) => p.ricochetBounces += u.value || 0,
            'ricochetDamage': (p, u) => p.ricochetDamage *= u.multiplier || 1,
            'ricochetRange': (p, u) => p.ricochetRange *= u.multiplier || 1
        };
        
        const handler = upgradeHandlers[upgrade.type];
        if (handler) {
            handler(player, upgrade);
        } else {
            console.warn(`Unknown upgrade type: ${upgrade.type}`);
        }
    }
}

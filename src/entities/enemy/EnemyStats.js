/**
 * EnemyStats - Handles enemy stats, damage, death, and XP drops
 * Extracted from Enemy class for better separation of concerns
 */
class EnemyStats {
    /**
     * Handle taking damage with defensive calculations
     */
    static takeDamage(enemy, amount, options = {}) {
        if (enemy.isDead) return;

        const {
            isCritical = false,
            label = null,
            showText = true
        } = options || {};

        // Apply damage reduction
        if (enemy.damageReduction > 0) {
            amount *= (1 - enemy.damageReduction);
        }

        // Apply damage resistance (boss mechanic)
        if (enemy.damageResistance > 0) {
            amount *= (1 - enemy.damageResistance);
        }

        // Check for projectile deflection (shielder enemies)
        if (enemy.deflectChance > 0 && Math.random() < enemy.deflectChance) {
            if (typeof enemy.deflectProjectile === 'function') {
                enemy.deflectProjectile();
            }
            return; // No damage taken
        }

        // Check for shield reflection (shielder enemies with active shield)
        if (enemy.abilities.shieldActive && enemy.abilities.shieldReflection > 0) {
            if (Math.random() < enemy.abilities.shieldReflection) {
                if (typeof enemy.reflectAttack === 'function') {
                    enemy.reflectAttack(amount);
                }
                return; // No damage taken
            }
        }

        // Apply damage
        const actualDamage = Math.max(1, Math.floor(amount)); // Minimum 1 damage
        enemy.health = Math.max(0, enemy.health - actualDamage);

        // Track cumulative damage for achievements/stats
        const gm = window.gameManager || window.gameManagerBridge;
        gm?.statsManager?.trackDamageDealt?.(actualDamage);
        // Mirror Match achievement removed; reflected hits still tracked via stats if needed

        // Trigger damage flash effect
        enemy.damageFlashTimer = 100; // 100ms flash

        // Create hit effect with critical hit visual enhancement
        this.createHitEffect(enemy, actualDamage, isCritical);

        // Show damage text
        if (showText !== false) {
            this.showDamageText(enemy, actualDamage, { isCritical, label });
        }

        // Check for death
        if (enemy.health <= 0) {
            this.die(enemy);
        } else {
            // Trigger special abilities on taking damage
            if (typeof enemy.onTakeDamage === 'function') {
                enemy.onTakeDamage(actualDamage);
            }
        }
    }

    /**
     * Handle enemy death
     */
    static die(enemy) {
        enemy.isDead = true;
        enemy.deathTimer = 500; // 500ms fade out animation

        // Trigger death effects through abilities component
        enemy.abilities.onDeath((window.gameManager || window.gameManagerBridge)?.game);

        // Drop XP orb
        this.dropXP(enemy);

        // Create death effect
        if (typeof enemy.createDeathEffect === 'function') {
            enemy.createDeathEffect();
        }

        // Notify game manager for kill tracking
        const gm = window.gameManager || window.gameManagerBridge;
        if (gm) {
            const stats = gm.statsManager;
            if (stats?.registerEnemyKill) {
                stats.registerEnemyKill(enemy);
                gm.killCount = stats.killCount;
                gm.currentCombo = stats.comboCount;
                gm.highestCombo = stats.highestCombo;
                gm.comboTimer = stats.comboTimer;
            } else if (typeof gm.incrementKills === 'function') {
                gm.incrementKills();
            }

            if (enemy.isBoss) {
                // Check for perfect boss kill and reward player
                this.handlePerfectBossKill(enemy, gm.game?.player);

                gm.onBossKilled?.();
                gm.onBossDefeated?.(enemy);
            }

            try {
                gm.enemySpawner?.onEnemyKilled?.(enemy);
            } catch (_) {}
        }
    }

    /**
     * Handle perfect boss kill rewards
     * Perfect kill = player has 90%+ health remaining
     */
    static handlePerfectBossKill(boss, player) {
        if (!boss || !player || !boss.isBoss) return;

        // Get boss constants
        const BOSS_CONST = window.GAME_CONSTANTS?.BOSSES || {};
        const PERFECT_THRESHOLD = BOSS_CONST.PERFECT_KILL_THRESHOLD || 0.90;
        const HEAL_BONUS = BOSS_CONST.PERFECT_KILL_HEAL_BONUS || 0.15;
        const INVULN_DURATION = BOSS_CONST.PERFECT_KILL_INVULN_DURATION || 2.0;
        const XP_BONUS = BOSS_CONST.PERFECT_KILL_XP_BONUS || 1.5;

        // Check if player has high enough health for perfect kill
        const healthPercent = player.health / (player.maxHealth || 1);
        const isPerfectKill = healthPercent >= PERFECT_THRESHOLD;

        if (isPerfectKill) {
            // Bonus heal
            const healAmount = Math.ceil(player.maxHealth * HEAL_BONUS);
            if (player.heal) {
                player.heal(healAmount);
            } else if (player.stats?.heal) {
                player.stats.heal(healAmount);
            }

            // Grant invulnerability
            if (player.stats) {
                player.stats.isInvulnerable = true;
                player.stats.invulnerabilityTimer = INVULN_DURATION;
            } else {
                player.isInvulnerable = true;
                player.invulnerabilityTimer = INVULN_DURATION;
            }

            // Bonus XP (applied to the XP orb drop)
            boss._perfectKillXPBonus = XP_BONUS;

            // Visual feedback
            const gm = window.gameManager || window.gameManagerBridge;
            if (gm) {
                // Show perfect kill text
                gm.showFloatingText?.(
                    '⭐ PERFECT KILL! ⭐',
                    player.x,
                    player.y - 80,
                    '#FFD700',  // Gold
                    28
                );

                // Show heal notification
                gm.showFloatingText?.(
                    `+${healAmount} HP`,
                    player.x,
                    player.y - 50,
                    '#2ecc71',  // Green
                    20
                );

                // Add celebratory screen shake
                gm.effectsManager?.addScreenShake?.(4, 0.4);

                // Create particle burst
                if (window.optimizedParticles) {
                    for (let i = 0; i < 20; i++) {
                        const angle = (i / 20) * Math.PI * 2;
                        const speed = 100 + Math.random() * 150;
                        window.optimizedParticles.spawnParticle({
                            x: player.x,
                            y: player.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: 4 + Math.random() * 4,
                            color: '#FFD700',
                            life: 1.5,
                            type: 'star'
                        });
                    }
                }
            }
        }
    }

    /**
     * Drop XP orb on death
     */
    static dropXP(enemy) {
        if (window.gameManager?.game?.addEntity && typeof XPOrb !== 'undefined') {
            let xpValue = enemy.xpValue;

            // Bonus XP for elite enemies
            if (enemy.isElite) {
                xpValue *= 2;
            }

            // Bonus XP for bosses
            if (enemy.isBoss) {
                xpValue *= 3;

                // Mega boss gets even more XP
                if (enemy.isMegaBoss) {
                    xpValue *= 2;
                }

                // Perfect kill bonus XP
                if (enemy._perfectKillXPBonus) {
                    xpValue *= enemy._perfectKillXPBonus;
                }
            }

            // Create XP orb
            const xpOrb = new XPOrb(enemy.x, enemy.y, Math.ceil(xpValue));

            // Add some randomness to XP orb position
            xpOrb.x += (Math.random() - 0.5) * 20;
            xpOrb.y += (Math.random() - 0.5) * 20;

            // Use optional chaining for defensive programming even though protected by if above
            window.gameManager?.game?.addEntity?.(xpOrb);
        }
    }

    /**
     * Create hit effect visual
     */
    static createHitEffect(enemy, damage, isCritical = false) {
        // Enhanced hit effect for critical hits
        if (isCritical && window.optimizedParticles) {
            // Create more dramatic critical hit effect
            const intensity = Math.min(2.5, 1 + (damage / 100)); // Scale with damage
            window.optimizedParticles.spawnHitEffect(enemy.x, enemy.y, intensity, true);

            // Add extra sparkle ring for crits
            const sparkCount = 12;
            for (let i = 0; i < sparkCount; i++) {
                const angle = (i / sparkCount) * Math.PI * 2;
                const radius = 15 + Math.random() * 10;
                const speed = 80 + Math.random() * 60;
                window.optimizedParticles.spawnParticle({
                    x: enemy.x + Math.cos(angle) * radius,
                    y: enemy.y + Math.sin(angle) * radius,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 2,
                    color: '#f1c40f', // Golden for crits
                    life: 0.6 + Math.random() * 0.3,
                    type: 'spark'
                });
            }
        } else {
            // Normal hit effect
            // Use effectsManager for proper rendering
            if (window.gameManager?.effectsManager?.createHitEffect) {
                window.gameManager.effectsManager.createHitEffect(enemy.x, enemy.y, damage);
            } else if (window.gameManager?.createHitEffect) {
                // Fallback to old API if effectsManager not available
                window.gameManager.createHitEffect(enemy.x, enemy.y, damage);
            } else if (window.optimizedParticles) {
                // Direct fallback to particle pool
                const intensity = Math.min(1.5, 0.5 + (damage / 150));
                window.optimizedParticles.spawnHitEffect(enemy.x, enemy.y, intensity, false);
            }
        }
    }

    /**
     * Show floating damage text
     */
    static showDamageText(enemy, damage, metadata = {}) {
        const {
            isCritical = false,
            label = null
        } = metadata || {};

        // Use UnifiedUIManager for better damage number display
        if (window.gameEngine?.unifiedUI) {
            window.gameEngine.unifiedUI.addDamageNumber(damage, enemy.x, enemy.y, isCritical);
        } else if (window.gameManager) {
            // Fallback to old system
            const displayDamage = Math.round(damage);
            const color = isCritical ? '#f1c40f' : (damage > enemy.maxHealth * 0.2 ? '#e74c3c' : '#f39c12');
            let text;
            if (label) {
                text = isCritical ? `${label} CRIT! ${displayDamage}` : `${label} ${displayDamage}`;
            } else {
                text = isCritical ? `CRIT! ${displayDamage}` : `-${displayDamage}`;
            }
            window.gameManager.showFloatingText(
                text,
                enemy.x,
                enemy.y - 20,
                color,
                isCritical ? 16 : 14
            );
        }
    }

    /**
     * Update visual effects
     */
    static updateVisualEffects(enemy, deltaTime) {
        // Update pulsing effect for elites and bosses
        if (enemy.isElite || enemy.isBoss) {
            enemy.pulseTimer += deltaTime;
            enemy.pulseIntensity = Math.sin(enemy.pulseTimer * 3) * 0.3 + 0.7;
        }

        // Update damage flash effect
        if (enemy.damageFlashTimer > 0) {
            enemy.damageFlashTimer -= deltaTime;
            if (enemy.damageFlashTimer <= 0) {
                enemy.damageFlashTimer = 0;
            }
        }

        // Update death animation
        if (enemy.isDead && enemy.deathTimer > 0) {
            enemy.deathTimer -= deltaTime * 1000; // Convert deltaTime from seconds to milliseconds
            enemy.opacity = Math.max(0, enemy.deathTimer / 500); // 500ms fade out
        }
    }
}

/**
 * EnemyStats - Handles enemy stats, damage, death, and XP drops
 * Extracted from Enemy class for better separation of concerns
 */
class EnemyStats {
    /**
     * Handle taking damage with defensive calculations
     */
    static takeDamage(enemy, amount) {
        if (enemy.isDead) return;

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

        // Trigger damage flash effect
        enemy.damageFlashTimer = 100; // 100ms flash

        // Create hit effect
        this.createHitEffect(enemy, actualDamage);

        // Show damage text
        this.showDamageText(enemy, actualDamage);

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
            // Increment kill count
            if (typeof gm.incrementKills === 'function') {
                gm.incrementKills();
            }

            // Track boss kills
            if (enemy.isBoss) {
                if (typeof gm.onBossKilled === 'function') {
                    gm.onBossKilled();
                }
                if (typeof gm.onBossDefeated === 'function') {
                    gm.onBossDefeated(enemy);
                }
            }

            // Keep enemy spawner statistics accurate
            if (gm.enemySpawner?.onEnemyKilled) {
                try {
                    gm.enemySpawner.onEnemyKilled(enemy);
                } catch (_) { /* no-op */ }
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
            }

            // Create XP orb
            const xpOrb = new XPOrb(enemy.x, enemy.y, xpValue);

            // Add some randomness to XP orb position
            xpOrb.x += (Math.random() - 0.5) * 20;
            xpOrb.y += (Math.random() - 0.5) * 20;

            window.gameManager.game.addEntity(xpOrb);
        }
    }

    /**
     * Create hit effect visual
     */
    static createHitEffect(enemy, damage) {
        // Use effectsManager for proper rendering
        if (window.gameManager?.effectsManager?.createHitEffect) {
            window.gameManager.effectsManager.createHitEffect(enemy.x, enemy.y, damage);
        } else if (window.gameManager?.createHitEffect) {
            // Fallback to old API if effectsManager not available
            window.gameManager.createHitEffect(enemy.x, enemy.y, damage);
        }
    }

    /**
     * Show floating damage text
     */
    static showDamageText(enemy, damage, isCritical = false) {
        // Use UnifiedUIManager for better damage number display
        if (window.gameEngine?.unifiedUI) {
            window.gameEngine.unifiedUI.addDamageNumber(damage, enemy.x, enemy.y, isCritical);
        } else if (window.gameManager) {
            // Fallback to old system
            const color = damage > enemy.maxHealth * 0.2 ? '#e74c3c' : '#f39c12';
            window.gameManager.showFloatingText(
                `-${damage}`,
                enemy.x,
                enemy.y - 20,
                color,
                14
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
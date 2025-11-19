class PlayerStats {
    constructor(player) {
        this.player = player;

        const PLAYER_CONSTANTS = window.GAME_CONSTANTS?.PLAYER || {};

        // Core player stats
        this.health = PLAYER_CONSTANTS.BASE_HEALTH || 120;
        this.maxHealth = PLAYER_CONSTANTS.BASE_HEALTH || 120;
        this.xp = 0;
        this.xpToNextLevel = PLAYER_CONSTANTS.INITIAL_XP_TO_LEVEL || 212;
        this.level = 1;
        this.isDead = false;

        // Defensive stats
        this.damageReduction = 0;
        this.dodgeChance = 0;
        this.regeneration = 0;
        this.regenTimer = 0;
        this.lifestealAmount = 0;
        this.lifestealCritMultiplier = 1;
        this.lifestealAOE = false;

        // Invulnerability system
        this.isInvulnerable = false;
        this.invulnerabilityTime = PLAYER_CONSTANTS.INVULNERABILITY_TIME || 0.5;
        this.invulnerabilityTimer = 0;

        // Kill streak tracking with rewards
        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.killStreakTimeout = 5.0;
        this.highestKillStreak = 0; // Track best streak for session
        this.lastStreakMilestone = 0; // For visual feedback throttling

        this._uiElements = null;
        this._lastUiState = {
            healthWidth: null,
            xpWidth: null,
            levelText: null
        };
        this._nextUiLookupTs = 0;
        this._uiLookupIntervalMs = 750;

        this._pendingHealText = 0;
        this._lastHealTextTime = 0;
        this._healTextThrottleMs = 180;
    }

    update(deltaTime) {
        this.handleRegeneration(deltaTime);
        this.handleInvulnerability(deltaTime);
        this.updateKillStreak(deltaTime);
    }

    handleRegeneration(deltaTime) {
        if (this.regeneration > 0) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1) { // Regenerate every second
                this.regenTimer = 0;
                this.heal(this.regeneration);
            }
        }
    }

    handleInvulnerability(deltaTime) {
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }

    updateKillStreak(deltaTime) {
        if (this.killStreak > 0) {
            this.killStreakTimer += deltaTime;
            if (this.killStreakTimer >= this.killStreakTimeout) {
                // Streak ended - show notification if it was significant
                if (this.killStreak >= 10) {
                    const gm = window.gameManager || window.gameManagerBridge;
                    if (gm?.showFloatingText) {
                        gm.showFloatingText(
                            `Streak Ended: ${this.killStreak}`,
                            this.player.x,
                            this.player.y - 40,
                            '#e67e22',
                            18
                        );
                    }
                }
                this.killStreak = 0;
                this.killStreakTimer = 0;
            }
        }
    }

    /**
     * Add a kill to the streak and reset the timer
     */
    addKillToStreak() {
        this.killStreak++;
        this.killStreakTimer = 0; // Reset timer

        // Track highest streak
        if (this.killStreak > this.highestKillStreak) {
            this.highestKillStreak = this.killStreak;
        }

        // Show visual feedback at milestones
        this.checkStreakMilestone();
    }

    /**
     * Check if we hit a streak milestone and show feedback
     */
    checkStreakMilestone() {
        const milestones = [5, 10, 15, 20, 25, 30, 40, 50];
        const currentMilestone = milestones.find(m => m === this.killStreak);

        if (currentMilestone && currentMilestone > this.lastStreakMilestone) {
            this.lastStreakMilestone = currentMilestone;
            const gm = window.gameManager || window.gameManagerBridge;

            if (gm?.showFloatingText) {
                const messages = {
                    5: '⚡ ON FIRE!',
                    10: '🔥 UNSTOPPABLE!',
                    15: '💥 DOMINATING!',
                    20: '⭐ LEGENDARY!',
                    25: '🌟 GODLIKE!',
                    30: '👑 IMMORTAL!',
                    40: '💫 TRANSCENDENT!',
                    50: '🌌 COSMIC FORCE!'
                };

                const message = messages[currentMilestone] || `STREAK ${currentMilestone}!`;
                gm.showFloatingText(
                    message,
                    this.player.x,
                    this.player.y - 60,
                    '#f39c12',
                    28
                );
            }

            // Play sound effect
            if (window.audioSystem?.play) {
                window.audioSystem.play('levelUp', 0.4);
            }
        }
    }

    /**
     * Get kill streak bonuses as multipliers
     * Returns object with damage, speed, attackSpeed, lifesteal bonuses
     */
    getKillStreakBonuses() {
        if (this.killStreak < 5) {
            return { damage: 1.0, speed: 1.0, attackSpeed: 1.0, lifesteal: 0 };
        }

        let damageBonus = 1.0;
        let speedBonus = 1.0;
        let attackSpeedBonus = 1.0;
        let lifestealBonus = 0;

        // Progressive bonuses based on streak tiers
        if (this.killStreak >= 5) {
            damageBonus += 0.10; // +10% damage
            speedBonus += 0.05;  // +5% speed
        }
        if (this.killStreak >= 10) {
            damageBonus += 0.10; // +20% total
            speedBonus += 0.05;  // +10% total
        }
        if (this.killStreak >= 15) {
            damageBonus += 0.10;      // +30% total
            speedBonus += 0.05;       // +15% total
            attackSpeedBonus += 0.10; // +10% attack speed
        }
        if (this.killStreak >= 20) {
            damageBonus += 0.10;      // +40% total
            speedBonus += 0.05;       // +20% total
            attackSpeedBonus += 0.05; // +15% total
            lifestealBonus += 0.05;   // +5% lifesteal
        }
        if (this.killStreak >= 30) {
            damageBonus += 0.15;      // +55% total
            speedBonus += 0.10;       // +30% total
            attackSpeedBonus += 0.10; // +25% total
            lifestealBonus += 0.05;   // +10% total lifesteal
        }

        return {
            damage: damageBonus,
            speed: speedBonus,
            attackSpeed: attackSpeedBonus,
            lifesteal: lifestealBonus
        };
    }

    heal(amount) {
        if (this.isDead || typeof amount !== 'number' || amount <= 0) return;

        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);

        // Update health bar if health actually changed
        if (oldHealth !== this.health) {
            this._updateHealthBarUI();

            const healedAmount = this.health - oldHealth;
            if (healedAmount > 0) {
                const gm = window.gameManager || window.gameManagerBridge;
                if (gm && typeof gm.showFloatingText === 'function') {
                    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                        ? performance.now()
                        : Date.now();
                    this._pendingHealText += healedAmount;
                    const shouldDisplay = this._pendingHealText >= 1 || (now - this._lastHealTextTime) >= this._healTextThrottleMs;
                    if (shouldDisplay) {
                        const amountToShow = Math.round(this._pendingHealText);
                        if (amountToShow > 0) {
                            gm.showFloatingText(`+${amountToShow}`, this.player.x, this.player.y - 30, '#2ecc71', 16);
                            this._pendingHealText = 0;
                            this._lastHealTextTime = now;
                        }
                    }
                }
            }
        }
    }

    addXP(amount) {
        if (this.isDead || typeof amount !== 'number' || amount <= 0) return;

        const adjustedXP = window.gameManager?.addXpCollected?.(amount) ?? amount;

        this.xp += adjustedXP;

        // Show XP gain using the best UI system available
        const ui = window.gameEngine?.unifiedUI;
        const gm = window.gameManager || window.gameManagerBridge;

        if (ui?.addXPGain) {
            ui.addXPGain(adjustedXP, this.player.x, this.player.y);
        } else if (gm?.showFloatingText) {
            gm.showFloatingText(`+${adjustedXP} XP`, this.player.x, this.player.y - 20, '#f1c40f', 14);
        }

        // Check for level up with safety limit to prevent infinite loops
        let levelUpCount = 0;
        const maxLevelUps = 10; // Prevent more than 10 level ups in one frame
        while (this.xp >= this.xpToNextLevel && typeof this.xpToNextLevel === 'number' && this.xpToNextLevel > 0 && levelUpCount < maxLevelUps) {
            this.levelUp();
            levelUpCount++;
        }

        // Update XP bar
        this.updateXPBar();
    }

    addExperience(amount) {
        // Alias for addXP to handle different calling conventions
        this.addXP(amount);
    }

    updateXPBar() {
        this._updateXPBarUI();
        this._updateLevelDisplayUI();
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.12); // Smoother XP scaling (12% instead of 15%)

        // Update UI
        this._updateLevelDisplayUI(true);
        this._updateXPBarUI(true);

        // Track level up achievement
        if (window.gameManager && typeof window.gameManager.onPlayerLevelUp === 'function') {
            window.gameManager.onPlayerLevelUp(this.level);
        }

        // Show level up message
        if (window.gameManager && typeof window.gameManager.showFloatingText === 'function') {
            window.gameManager.showFloatingText(`LEVEL UP!`, this.player.x, this.player.y - 50, '#f39c12', 24);
        }

        // Create level up effect
        if (window.gameManager && typeof window.gameManager.createLevelUpEffect === 'function') {
            window.gameManager.createLevelUpEffect(this.player.x, this.player.y);
        }

        // Show upgrade options
        setTimeout(() => {
            if (window.upgradeSystem && typeof window.upgradeSystem.showUpgradeOptions === 'function') {
                window.upgradeSystem.showUpgradeOptions();
            }
        }, 0);

        // Play level up sound
        if (window.audioSystem && typeof window.audioSystem.play === 'function') {
            window.audioSystem.play('levelUp', 0.6);
        }
    }

    takeDamage(amount) {
        if (this.isInvulnerable || typeof amount !== 'number' || amount <= 0) return;

        const damageMultiplier = window.GAME_CONSTANTS?.PLAYER?.DAMAGE_INTAKE_MULTIPLIER || 1;
        if (damageMultiplier !== 1) {
            amount *= damageMultiplier;
        }

        // Apply damage reduction if present
        if (this.damageReduction && this.damageReduction > 0) {
            amount = amount * (1 - this.damageReduction);
        }

        // Apply dodge chance
        if (this.dodgeChance && Math.random() < this.dodgeChance) {
            if (window.gameManager && window.gameManager.showFloatingText) {
                window.gameManager.showFloatingText(`DODGE!`, this.player.x, this.player.y - 20, '#3498db', 18);
            }
            return;
        }

        // NEW: Shield absorbs damage before health
        if (this.player.abilities && this.player.abilities.hasShield) {
            const penetratedDamage = this.player.abilities.absorbDamage(amount);

            if (penetratedDamage <= 0) {
                // Shield absorbed all damage, show feedback
                if (window.gameManager && window.gameManager.showFloatingText) {
                    window.gameManager.showFloatingText(`BLOCKED`, this.player.x, this.player.y - 20, '#00ffff', 18);
                }

                return; // No health damage taken
            }

            // Shield absorbed some but not all damage
            amount = penetratedDamage;
        }

        const previousHealth = this.health;
        this.health = Math.max(0, previousHealth - amount);
        const damageApplied = Math.max(0, previousHealth - this.health);
        if (damageApplied > 0) {
            window.gameManager?.statsManager?.trackDamageTaken?.(damageApplied);
        }

        // Notify game manager for achievement tracking
        if (window.gameManager) {
            window.gameManager.onPlayerDamaged();
        }

        // Show damage text
        if (window.gameManager && window.gameManager.showFloatingText && damageApplied > 0) {
            window.gameManager.showFloatingText(`-${Math.round(damageApplied)}`, this.player.x, this.player.y - 20, '#e74c3c', 18);
        }

        // Update health bar
        this._updateHealthBarUI();

        // Trigger invulnerability
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityTime;

        // Check if player died
        if (this.health <= 0) {
            this.isDead = true;
        }

        // Play hit sound
        if (window.audioSystem?.play) {
            window.audioSystem.play('playerHit', 0.5);
        }
    }

    // Upgrade application for stats-related upgrades
    applyStatsUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'maxHealth':
                const oldMaxHealth = this.maxHealth;
                this.maxHealth *= upgrade.multiplier;
                this.health += (this.maxHealth - oldMaxHealth);
                this._updateHealthBarUI(true);
                break;

            case 'regeneration':
                this.regeneration += upgrade.value;
                break;

            case 'damageReduction':
                this.damageReduction = Math.min(0.75, (this.damageReduction || 0) + upgrade.value);
                break;

            case 'lifesteal':
                // Diminishing returns for high lifesteal
                if (this.lifestealAmount > 0.15) {
                    this.lifestealAmount += upgrade.value * 0.7;
                } else {
                    this.lifestealAmount += upgrade.value;
                }
                break;

            case 'lifestealCrit':
                this.lifestealCritMultiplier = upgrade.multiplier || 1;
                break;

            case 'lifestealAOE':
                this.lifestealAOE = true;
                break;
        }
    }

    _ensureUIElements() {
        if (typeof document === 'undefined') {
            return null;
        }

        if (!this._uiElements) {
            this._uiElements = {
                healthBar: null,
                xpBar: null,
                levelDisplay: null
            };
        }

        const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
        let allowLookup = false;
        if (!this._nextUiLookupTs || now >= this._nextUiLookupTs) {
            allowLookup = true;
            this._nextUiLookupTs = now + this._uiLookupIntervalMs;
        }

        this._uiElements.healthBar = this._refreshCachedElement('healthBar', 'health-bar', allowLookup);
        this._uiElements.xpBar = this._refreshCachedElement('xpBar', 'xp-bar', allowLookup);
        this._uiElements.levelDisplay = this._refreshCachedElement('levelDisplay', 'level-display', allowLookup);

        return this._uiElements;
    }

    _refreshCachedElement(key, elementId, allowLookup) {
        let element = this._uiElements[key];
        if (element && typeof element.isConnected === 'boolean' && !element.isConnected) {
            element = null;
        }

        if (!element && allowLookup) {
            element = document.getElementById(elementId);
        }

        this._uiElements[key] = element;
        return element;
    }

    _updateHealthBarUI(force = false) {
        if (typeof this.maxHealth !== 'number' || this.maxHealth <= 0) {
            return;
        }

        const percentage = Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
        if (!Number.isFinite(percentage)) {
            return;
        }

        const rounded = Math.round(percentage * 10) / 10;
        if (!force && this._lastUiState.healthWidth === rounded) {
            return;
        }

        const ui = this._ensureUIElements();
        if (!ui || !ui.healthBar) {
            return;
        }

        ui.healthBar.style.setProperty('--health-width', `${rounded}%`);
        this._lastUiState.healthWidth = rounded;
    }

    _updateXPBarUI(force = false) {
        if (typeof this.xp !== 'number' || typeof this.xpToNextLevel !== 'number' || this.xpToNextLevel <= 0) {
            return;
        }

        const ratio = Math.max(0, Math.min(100, (this.xp / this.xpToNextLevel) * 100));
        if (!Number.isFinite(ratio)) {
            return;
        }

        const rounded = Math.round(ratio * 10) / 10;
        if (!force && this._lastUiState.xpWidth === rounded) {
            return;
        }

        const ui = this._ensureUIElements();
        if (!ui || !ui.xpBar) {
            return;
        }

        ui.xpBar.style.setProperty('--xp-width', `${rounded}%`);
        this._lastUiState.xpWidth = rounded;
    }

    _updateLevelDisplayUI(force = false) {
        if (typeof this.level !== 'number' || !Number.isFinite(this.level)) {
            return;
        }

        const levelText = `Level: ${Math.max(1, Math.floor(this.level))}`;
        if (!force && this._lastUiState.levelText === levelText) {
            return;
        }

        const ui = this._ensureUIElements();
        if (!ui || !ui.levelDisplay) {
            return;
        }

        ui.levelDisplay.textContent = levelText;
        this._lastUiState.levelText = levelText;
    }

    // Get debug information
    getDebugInfo() {
        return {
            health: this.health,
            maxHealth: this.maxHealth,
            xp: this.xp,
            xpToNextLevel: this.xpToNextLevel,
            level: this.level,
            isDead: this.isDead,
            isInvulnerable: this.isInvulnerable,
            regeneration: this.regeneration,
            killStreak: this.killStreak
        };
    }
}

/**
 * 🛠️ UPGRADE HANDLERS
 * 
 * Centralized logic for applying upgrades to the player.
 * Decouples specific upgrade behavior from the main Player class.
 */

class UpgradeHandlers {
    constructor() {
        this.handlers = {
            // Stats upgrades
            'maxHealth': (player, upgrade) => player.stats.applyStatsUpgrade(upgrade),
            'regeneration': (player, upgrade) => player.stats.applyStatsUpgrade(upgrade),
            'damageReduction': (player, upgrade) => player.stats.applyStatsUpgrade(upgrade),
            'lifesteal': (player, upgrade) => player.stats.applyStatsUpgrade(upgrade),
            'lifestealCrit': (player, upgrade) => player.stats.applyStatsUpgrade(upgrade),
            'lifestealAOE': (player, upgrade) => player.stats.applyStatsUpgrade(upgrade),

            // Movement upgrades
            'speed': (player, upgrade) => player.movement.applyMovementUpgrade(upgrade),
            'magnet': (player, upgrade) => player.movement.applyMovementUpgrade(upgrade),
            'dodgeCooldown': (player, upgrade) => player.movement.applyMovementUpgrade(upgrade),
            'dodgeDuration': (player, upgrade) => player.movement.applyMovementUpgrade(upgrade),
            'dodgeInvulnerability': (player, upgrade) => player.movement.applyMovementUpgrade(upgrade),

            // Combat upgrades
            'attackSpeed': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'attackDamage': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'attackRange': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'projectileCount': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'projectileSpread': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'piercing': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'projectileSpeed': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'critChance': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'critDamage': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade),
            'weaponModifier': (player, upgrade) => player.combat.applyCombatUpgrade(upgrade), // Added from switch case analysis

            // Ability upgrades
            'special': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'orbit': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'orbitDamage': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'orbitSpeed': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'orbitSize': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'chain': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'chainDamage': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'chainRange': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'explosionSize': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'explosionDamage': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'explosionChain': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'ricochetBounces': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'ricochetDamage': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'bloodLash': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'bloodNova': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'gravityWell': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'burn': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'burnDamage': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'shieldCapacity': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'shieldReflection': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'shieldAdaptive': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'shieldRecharge': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'shieldExplosion': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'berserkerScaling': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade),
            'berserkerCrit': (player, upgrade) => player.abilities.applyAbilityUpgrade(upgrade)
        };
    }

    /**
     * Apply an upgrade to the player using the registered handler.
     * @param {Object} player - The player instance.
     * @param {Object} upgrade - The upgrade object to apply.
     * @returns {boolean} - True if handled, false otherwise.
     */
    apply(player, upgrade) {
        if (!player || !upgrade) return false;

        const handler = this.handlers[upgrade.type];
        if (handler) {
            handler(player, upgrade);
            return true;
        }

        window.logger?.warn(`No handler found for upgrade type: ${upgrade.type}`);
        return false;
    }

    /**
     * Register a new upgrade handler dynamically.
     * @param {string} type - Upgrade type key.
     * @param {Function} handler - Function(player, upgrade).
     */
    register(type, handler) {
        this.handlers[type] = handler;
    }
}

// Global instance
window.UpgradeHandlers = new UpgradeHandlers();

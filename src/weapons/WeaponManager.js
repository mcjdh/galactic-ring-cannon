/**
 * WeaponManager - coordinates player weapon archetypes.
 *
 * Responsibilities:
 * - Instantiate weapon classes from definitions (data-driven)
 * - Update the active weapon each frame
 * - Route upgrades/stat changes to the equipped weapon
 */

const _weaponRegistry = new Map();

class WeaponManager {
    constructor(player, combat) {
        this.player = player;
        this.combat = combat;
        this.weapons = new Map();
        this.activeWeaponId = null;
        this.activeWeapon = null;
        this.enabled = true;

        this.definitions = typeof window !== 'undefined'
            ? (window.WEAPON_DEFINITIONS || {})
            : {};

        const defaultWeaponId = this._resolveDefaultWeaponId();
        if (defaultWeaponId) {
            this.equip(defaultWeaponId);
        }
    }

    _resolveDefaultWeaponId() {
        if (!this.definitions) return null;

        // Honor explicit starting weapon if defined on player
        const requested = this.player?.startingWeapon;
        if (requested && this.definitions[requested]) {
            return requested;
        }

        const queryWeapon = (typeof window !== 'undefined' && window.Game?.urlParams?.get?.('weapon')) || null;
        if (queryWeapon && this.definitions[queryWeapon]) {
            return queryWeapon;
        }

        if (this.definitions.pulse_cannon) {
            return 'pulse_cannon';
        }

        const keys = Object.keys(this.definitions);
        return keys.length > 0 ? keys[0] : null;
    }

    _getDefinition(id) {
        const definition = this.definitions?.[id];
        if (!definition) {
            window.logger.warn(`[WeaponManager] Unknown weapon id "${id}".`);
        }
        return definition;
    }

    _createWeapon(id, definition) {
        const ctor = _weaponRegistry.get(id);
        if (!ctor) {
            window.logger.warn(`[WeaponManager] No registered constructor for weapon "${id}".`);
            return null;
        }

        try {
            const weapon = new ctor({
                player: this.player,
                combat: this.combat,
                definition,
                manager: this
            });
            return weapon;
        } catch (error) {
            window.logger.error(
                `[WeaponManager] Failed to construct weapon "${id}":`,
                error
            );
            return null;
        }
    }

    equip(id) {
        if (!id) return null;

        const definition = this._getDefinition(id);
        if (!definition) return null;

        let weapon = this.weapons.get(id);
        if (!weapon) {
            weapon = this._createWeapon(id, definition);
            if (!weapon) return null;
            this.weapons.set(id, weapon);
        }

        if (this.activeWeapon && this.activeWeapon.onUnequip) {
            this.activeWeapon.onUnequip();
        }

        this.activeWeaponId = id;
        this.activeWeapon = weapon;

        if (weapon.onEquip) {
            weapon.onEquip();
        }

        return weapon;
    }

    /**
     * Update the active weapon each frame.
     */
    update(deltaTime, game) {
        if (!this.enabled) return;

        const weapon = this.activeWeapon;
        if (!weapon || typeof weapon.update !== 'function') {
            return;
        }

        weapon.update(deltaTime, game);

        if (typeof weapon.getCooldown === 'function') {
            const cooldown = weapon.getCooldown();
            if (Number.isFinite(cooldown)) {
                this.combat.attackCooldown = cooldown;
            }
        }

        if (typeof weapon.getTimer === 'function') {
            const timer = weapon.getTimer();
            if (Number.isFinite(timer)) {
                this.combat.attackTimer = timer;
            }
        }
    }

    /**
     * Force an immediate fire (used by manual triggers / existing API).
     */
    fireImmediate(game) {
        const weapon = this.activeWeapon;
        if (weapon && typeof weapon.fireImmediate === 'function') {
            return weapon.fireImmediate(game);
        }
        return false;
    }

    /**
     * Route upgrades to the active weapon (if relevant).
     */
    applyUpgrade(upgrade) {
        const weapon = this.activeWeapon;
        if (weapon && typeof weapon.applyUpgrade === 'function') {
            weapon.applyUpgrade(upgrade);
        }
    }

    /**
     * Notify weapon that combat stats changed (e.g. attack speed upgrade).
     */
    notifyCombatStatChange() {
        const weapon = this.activeWeapon;
        if (weapon && typeof weapon.onCombatStatsChanged === 'function') {
            weapon.onCombatStatsChanged();
        }
    }

    getActiveWeaponId() {
        return this.activeWeaponId;
    }
}

WeaponManager.registerType = function registerType(id, ctor) {
    if (!id || typeof id !== 'string' || !ctor) {
        window.logger.warn('[WeaponManager] registerType called with invalid arguments.');
        return;
    }
    _weaponRegistry.set(id, ctor);
};

WeaponManager.getRegisteredTypes = function getRegisteredTypes() {
    return Array.from(_weaponRegistry.keys());
};

if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.WeaponManager = WeaponManager;
    window.Game.Weapons = window.Game.Weapons || {};
    window.Game.Weapons.registerType = WeaponManager.registerType;
    window.Game.Weapons.getRegisteredTypes = WeaponManager.getRegisteredTypes;
}

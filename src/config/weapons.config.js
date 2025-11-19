/**
 * ⚔️ WEAPON DEFINITIONS
 * Data-driven definitions for player weapon archetypes.
 *
 * Each weapon entry may include:
 * - id: Unique identifier used internally
 * - name: Display name
 * - description: Short flavor copy for UI
 * - fireRate: Base shots per second (can be modified by upgrades/meta)
 * - startupDelay: Optional warm-up time before the first shot
 * - projectileTemplate: Baseline projectile configuration for this weapon
 * - targeting: Strategy hint for aiming logic (nearest, spread_forward, etc.)
 * - upgradeTags: Tags that map to weapon-specific upgrades
 * - secondary: Optional secondary ability metadata (cooldown, behavior hints)
 */

const WEAPON_DEFINITIONS = {
    pulse_cannon: {
        id: 'pulse_cannon',
        name: 'Pulse Cannon',
        description: 'Balanced auto-targeting cannon built for sustained fire.',
        archetype: 'generalist',
        fireRate: 1.2, // shots per second
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 1,
            spreadDegrees: 0,
            damageMultiplier: 1.0,
            speedMultiplier: 1.0,
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: true,
            appliesBehaviors: true
        },
        upgradeTags: ['core', 'chain', 'ricochet', 'explosive'],
        secondary: null
    },
    nova_shotgun: {
        id: 'nova_shotgun',
        name: 'Nova Shotgun',
        description: 'Close-range cone that vaporizes clustered enemies.',
        archetype: 'burst',
        fireRate: 0.8,
        startupDelay: 0,
        targeting: 'nearest_cone',
        projectileTemplate: {
            count: 5,
            spreadDegrees: 50,
            damageMultiplier: 0.75,
            speedMultiplier: 0.9,
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: false,
            appliesBehaviors: true
        },
        upgradeTags: ['shotgun', 'burst', 'explosive'],
        secondary: {
            id: 'nova_knockback',
            cooldown: 6.0,
            description: 'Short-range blast to push enemies away.'
        }
    },
    arc_burst: {
        id: 'arc_burst',
        name: 'Arc Burst',
        description: 'Rapid lattice of chain-linked bolts that leap across the swarm.',
        archetype: 'control',
        fireRate: 1.6,
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 2,
            spreadDegrees: 12,
            damageMultiplier: 0.9,
            speedMultiplier: 1.05,
            appliesBehaviors: true
        },
        upgradeTags: ['chain', 'support', 'core'],
        secondary: {
            id: 'storm_surge',
            cooldown: 12.0,
            description: 'Unleash a wide arc pulse that shocks nearby targets.'
        }
    },
    constellation_array: {
        id: 'constellation_array',
        name: 'Constellation Array',
        description: 'Synchronizes orbitals into rotating volleys that wash the battlefield.',
        archetype: 'orbit',
        fireRate: 0.95,
        startupDelay: 0,
        targeting: 'omni',
        projectileTemplate: {
            count: 3,
            spreadDegrees: 0,
            damageMultiplier: 0.95,
            speedMultiplier: 0.9,
            appliesBehaviors: true
        },
        volley: {
            min: 2,
            max: 8
        },
        upgradeTags: ['orbit', 'support', 'core'],
        secondary: {
            id: 'orbital_flux',
            cooldown: 10.0,
            description: 'Critical hits briefly overcharge the array, increasing volley size.'
        }
    },
    phantom_repeater: {
        id: 'phantom_repeater',
        name: 'Phantom Repeater',
        description: 'Twin void-charged projectiles that phase through dimensional rifts, bouncing between enemies with ghostly precision.',
        archetype: 'ricochet',
        fireRate: 1.05,
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 2,
            spreadDegrees: 10,
            damageMultiplier: 1.0,
            speedMultiplier: 1.05,
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: false,
            appliesBehaviors: true
        },
        upgradeTags: ['ricochet', 'explosive', 'homing', 'core'],
        secondary: {
            id: 'phase_burst',
            cooldown: 8.0,
            description: 'Release a burst of phantom energy that ricochets to all nearby enemies.'
        }
    }
};

if (typeof window !== 'undefined') {
    window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
}

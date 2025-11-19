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
    magma_launcher: {
        id: 'magma_launcher',
        name: 'Magma Launcher',
        icon: '🔥',
        description: 'Lobs volatile magma charges that explode and ignite enemies.',
        archetype: 'explosive',
        fireRate: 0.9,
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 1,
            spreadDegrees: 0,
            damageMultiplier: 1.2,
            speedMultiplier: 0.8,
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: false, // Explosives don't pierce usually
            appliesBehaviors: true
        },
        upgradeTags: ['explosive', 'core'],
        secondary: {
            id: 'eruption',
            cooldown: 8.0,
            description: 'Create a massive pool of lava that burns all enemies inside.'
        }
    },
    sanguine_lance: {
        id: 'sanguine_lance',
        name: 'Sanguine Lance',
        description: 'Crimson piercing bolts that drain vitality from all they strike.',
        archetype: 'sustain',
        fireRate: 1.4, // Rapid fire for consistent lifesteal
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 1,
            spreadDegrees: 0,
            damageMultiplier: 1.05, // Slightly higher damage
            speedMultiplier: 1.1,   // Fast projectiles
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: true,
            appliesBehaviors: true
        },
        upgradeTags: ['core', 'explosive', 'ricochet'],
        secondary: {
            id: 'blood_frenzy',
            cooldown: 8.0,
            description: 'Brief burst of attack speed when health drops below 40%.'
        }
    },
    singularity_cannon: {
        id: 'singularity_cannon',
        name: 'Singularity Cannon',
        description: 'Fires heavy void orbs that warp spacetime, creating gravity wells that slow and trap enemies.',
        archetype: 'gravity',
        fireRate: 0.7,  // Slowest weapon - deliberate, impactful shots
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 1,
            spreadDegrees: 0,
            damageMultiplier: 1.2,  // High base damage
            speedMultiplier: 0.85,  // Slow-moving void orbs
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: true,
            appliesBehaviors: true,
            gravityWell: true  // Special flag for gravity well creation
        },
        upgradeTags: ['explosive', 'support', 'core'],
        secondary: {
            id: 'event_horizon',
            cooldown: 15.0,
            description: 'Create a massive singularity that pulls all nearby enemies and deals damage over time.'
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
    },
    plasma_cutter: {
        id: 'plasma_cutter',
        name: 'Plasma Cutter',
        icon: '⚡',
        description: 'High-frequency energy beam that slices through armor.',
        archetype: 'precision',
        fireRate: 1.5, // Fast fire rate
        startupDelay: 0,
        targeting: 'nearest',
        projectileTemplate: {
            count: 1,
            spreadDegrees: 0,
            damageMultiplier: 0.8, // Lower per-shot damage but fast
            speedMultiplier: 1.5,   // Very fast projectiles
            inheritsPlayerCrit: true,
            inheritsPlayerPierce: true,
            appliesBehaviors: true
        },
        upgradeTags: ['core', 'chain'],
        secondary: {
            id: 'overcharge',
            cooldown: 10.0,
            description: 'Temporarily double attack speed at the cost of health.'
        }
    }
};

if (typeof window !== 'undefined') {
    window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
}

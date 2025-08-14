/**
 * Service Locator - Simple dependency injection container
 * 🎯 Reduces global coupling by providing centralized service access
 * 🔧 Allows for easier testing and modular architecture
 * 
 * RESONANT NOTE: This replaces window.* global access patterns
 * Use ServiceLocator.get('serviceName') instead of window.serviceName
 */

class ServiceLocator {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.initialized = false;
    }
    
    /**
     * Register a service with the locator
     * @param {string} name - Service name
     * @param {*} service - Service instance or constructor
     * @param {boolean} singleton - Whether to treat as singleton
     */
    register(name, service, singleton = true) {
        if (singleton && typeof service === 'function') {
            // Store constructor for lazy initialization
            this.services.set(name, { constructor: service, singleton: true });
        } else {
            // Store instance directly
            this.services.set(name, { instance: service, singleton: singleton });
            if (singleton) {
                this.singletons.set(name, service);
            }
        }
    }
    
    /**
     * Get a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        // Check if we have a singleton instance
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        // Get service definition
        const serviceInfo = this.services.get(name);
        if (!serviceInfo) {
            console.warn(`🔍 ServiceLocator: Service '${name}' not found`);
            return null;
        }
        
        // Create instance if needed
        if (serviceInfo.constructor) {
            const instance = new serviceInfo.constructor();
            if (serviceInfo.singleton) {
                this.singletons.set(name, instance);
            }
            return instance;
        }
        
        return serviceInfo.instance;
    }
    
    /**
     * Check if a service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name) || this.singletons.has(name);
    }
    
    /**
     * Initialize core game services
     * This replaces the scattered global initialization
     */
    initializeCoreServices() {
        if (this.initialized) return;
        
        // Register core systems
        this.register('logger', Logger);
        this.register('performanceManager', PerformanceManager);
        this.register('debugManager', DebugManager);
        this.register('audioSystem', AudioSystem);
        this.register('achievementSystem', AchievementSystem);
        this.register('upgradeSystem', UpgradeSystem);
        
        // Register particle system (auto-detect best available)
        if (window.optimizedParticles) {
            this.register('particleSystem', window.optimizedParticles, true);
        } else if (window.ParticleManager) {
            this.register('particleSystem', ParticleManager);
        }
        
        // Register ParticleHelpers (unified interface)
        if (window.ParticleHelpers) {
            this.register('particleHelpers', window.ParticleHelpers, true);
        }
        
        this.initialized = true;
        console.log('🎯 ServiceLocator: Core services initialized');
    }
    
    /**
     * Get all registered service names
     * @returns {string[]} Service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }
    
    /**
     * Clear all services (for testing)
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.initialized = false;
    }
    
    /**
     * Create a scoped service locator
     * Useful for isolated testing or modular features
     * @returns {ServiceLocator} New service locator instance
     */
    createScope() {
        const scope = new ServiceLocator();
        // Copy non-singleton services to scope
        for (const [name, serviceInfo] of this.services) {
            if (!serviceInfo.singleton) {
                scope.register(name, serviceInfo.instance || serviceInfo.constructor, false);
            }
        }
        return scope;
    }
}

// Create global instance
const serviceLocator = new ServiceLocator();

// Backward compatibility helper
const Services = {
    get: (name) => serviceLocator.get(name),
    register: (name, service, singleton = true) => serviceLocator.register(name, service, singleton),
    has: (name) => serviceLocator.has(name),
    init: () => serviceLocator.initializeCoreServices()
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ServiceLocator = serviceLocator;
    window.Services = Services;
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServiceLocator: serviceLocator, Services };
}
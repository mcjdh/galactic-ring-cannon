/**
 * EntityManager - Minimal implementation for now
 * TODO: Full entity management system
 */
class EntityManager {
    constructor() {
        this.entities = new Map();
        this.componentsMap = new Map();
    }
    
    addEntity(entity) {
        if (entity && entity.id) {
            this.entities.set(entity.id, entity);
        }
        return entity;
    }
    
    removeEntity(entityId) {
        this.entities.delete(entityId);
    }
    
    getEntity(entityId) {
        return this.entities.get(entityId);
    }
    
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    getEntitiesByType(type) {
        return this.getAllEntities().filter(entity => entity.type === type);
    }
    
    clear() {
        this.entities.clear();
        this.componentsMap.clear();
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.EntityManager = EntityManager;
}
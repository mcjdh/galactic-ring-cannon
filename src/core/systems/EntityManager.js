/**
 * EntityManager - centralizes entity storage for the hybrid refactor.
 * Keeps a single canonical list plus per-type collections that are shared with
 * GameEngine so legacy code that references `game.enemies`, etc., stays valid.
 */
class EntityManager {
    constructor({ all = [], typeCollections = {} } = {}) {
        this.entitiesById = new Map();
        this.allEntities = Array.isArray(all) ? all : [];
        this.typeCollections = new Map();
        this.idCounters = new Map();

        Object.entries(typeCollections).forEach(([type, collection]) => {
            if (Array.isArray(collection)) {
                this.typeCollections.set(type, collection);
            }
        });
    }

    /**
     * Register an external array for a specific entity type.
     * The array reference is preserved so consumers share the same data.
     */
    registerTypeCollection(type, collection) {
        if (!Array.isArray(collection)) {
            throw new Error('EntityManager.registerTypeCollection expects an Array');
        }
        this.typeCollections.set(type, collection);
        return collection;
    }

    /**
     * Ensure a collection exists for the given type and return it.
     */
    _getTypeCollection(type) {
        if (!type) {
            return this.registerTypeCollection('__untyped__', this.typeCollections.get('__untyped__') || []);
        }

        if (!this.typeCollections.has(type)) {
            this.typeCollections.set(type, []);
        }
        return this.typeCollections.get(type);
    }

    /**
     * Generate a fallback identifier when an entity is missing one.
     */
    _generateId(type = 'entity') {
        const current = this.idCounters.get(type) ?? 0;
        const next = current + 1;
        this.idCounters.set(type, next);
        return `${type}_${Date.now()}_${next}`;
    }

    /**
     * Add an entity to the canonical collections.
     */
    addEntity(entity) {
        if (!entity || typeof entity !== 'object') {
            return null;
        }

        if (!entity.id) {
            entity.id = this._generateId(entity.type || 'entity');
        }

        // Prevent duplicates if the same id is reused
        if (this.entitiesById.has(entity.id)) {
            this.removeEntity(entity.id);
        }

        this.entitiesById.set(entity.id, entity);
        this.allEntities.push(entity);

        const typeCollection = this._getTypeCollection(entity.type);
        typeCollection.push(entity);

        return entity;
    }

    /**
     * Remove an entity (by reference or id) from all collections.
     */
    removeEntity(target) {
        if (!target) return false;

        const entity = typeof target === 'object' ? target : this.entitiesById.get(target);
        if (!entity) return false;

        if (entity.id) {
            this.entitiesById.delete(entity.id);
        }

        this._removeFromArray(this.allEntities, entity);

        const typeCollection = this.typeCollections.get(entity.type);
        if (typeCollection) {
            this._removeFromArray(typeCollection, entity);
        }

        return true;
    }

    /**
     * Remove entities that match a predicate. Returns the removed entities.
     */
    prune(predicate, onRemove) {
        if (typeof predicate !== 'function') {
            return [];
        }

        const removed = [];
        const keep = [];

        for (let i = 0; i < this.allEntities.length; i++) {
            const entity = this.allEntities[i];
            if (predicate(entity)) {
                removed.push(entity);
                if (entity?.id) {
                    this.entitiesById.delete(entity.id);
                }
            } else {
                keep.push(entity);
            }
        }

        // Overwrite array while preserving reference
        this.allEntities.length = 0;
        for (let i = 0; i < keep.length; i++) {
            this.allEntities[i] = keep[i];
        }

        if (removed.length > 0) {
            const removedSet = new Set(removed);
            this.typeCollections.forEach((collection, type) => {
                let writeIndex = 0;
                for (let i = 0; i < collection.length; i++) {
                    const entity = collection[i];
                    if (!entity || removedSet.has(entity) || (entity.type && entity.type !== type)) {
                        continue;
                    }
                    if (writeIndex !== i) {
                        collection[writeIndex] = entity;
                    }
                    writeIndex++;
                }
                collection.length = writeIndex;
            });

            if (typeof onRemove === 'function') {
                removed.forEach(entity => {
                    try {
                        onRemove(entity);
                    } catch (error) {
                        console.error('EntityManager prune callback failed:', error);
                    }
                });
            }
        }

        return removed;
    }

    /**
     * Retrieve entity by id.
     */
    getEntity(entityId) {
        return this.entitiesById.get(entityId);
    }

    /**
     * Return a shallow copy of all entities.
     */
    getAllEntities() {
        return [...this.allEntities];
    }

    /**
     * Return the collection for a specific type (shared reference).
     */
    getEntitiesByType(type) {
        return this._getTypeCollection(type);
    }

    /**
     * Clear all tracked entities while preserving shared array references.
     */
    clear() {
        this.entitiesById.clear();
        this.allEntities.length = 0;
        this.typeCollections.forEach(collection => {
            collection.length = 0;
        });
    }

    _removeFromArray(array, item) {
        const index = array.indexOf(item);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.EntityManager = EntityManager;
}

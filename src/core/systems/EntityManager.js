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
     * @param {Object} entity - Entity to add
     * @returns {Object|null} The added entity, or null if invalid
     */
    addEntity(entity) {
        if (!entity || typeof entity !== 'object') {
            return null;
        }

        if (!entity.id) {
            entity.id = this._generateId(entity.type || 'entity');
        }

        // Prevent duplicates if the same id is reused
        // Important: We must fully remove the old entity including from type collections
        const existingEntity = this.entitiesById.get(entity.id);
        if (existingEntity) {
            // Only remove if it's actually a different object instance
            // (same object re-added should be a no-op, not cause duplicate entries)
            if (existingEntity === entity) {
                return entity; // Already added, nothing to do
            }
            this.removeEntity(existingEntity);
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
     * Helper to remove an entity from an array efficiently using swap-and-pop.
     * @private
     */
    _removeFromArray(array, entity) {
        if (!Array.isArray(array)) return false;
        const index = array.indexOf(entity);
        if (index === -1) return false;
        
        // Swap with last element and pop for O(1) removal
        const lastIndex = array.length - 1;
        if (index !== lastIndex) {
            array[index] = array[lastIndex];
        }
        array.pop();
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
        const removedByType = new Map();
        const list = this.allEntities;
        let writeIndex = 0;

        for (let i = 0; i < list.length; i++) {
            const entity = list[i];
            if (predicate(entity)) {
                removed.push(entity);
                if (entity?.id) {
                    this.entitiesById.delete(entity.id);
                }
                if (entity && typeof entity === 'object') {
                    const typeKey = entity.type ?? '__untyped__';
                    let bucket = removedByType.get(typeKey);
                    if (!bucket) {
                        bucket = new Set();
                        removedByType.set(typeKey, bucket);
                    }
                    bucket.add(entity);
                }
            } else {
                if (writeIndex !== i) {
                    list[writeIndex] = entity;
                }
                writeIndex++;
            }
        }

        if (writeIndex < list.length) {
            list.length = writeIndex;
        }

        if (removed.length === 0) {
            return removed;
        }

        removedByType.forEach((removedSet, type) => {
            let typeWrite = 0;
            const collection = this.typeCollections.get(type);
            if (!collection) {
                return;
            }

            for (let i = 0; i < collection.length; i++) {
                const entity = collection[i];
                const entityType = entity?.type ?? '__untyped__';
                if (!entity || removedSet.has(entity) || entityType !== type) {
                    continue;
                }
                if (typeWrite !== i) {
                    collection[typeWrite] = entity;
                }
                typeWrite++;
            }
            collection.length = typeWrite;
        });

        if (typeof onRemove === 'function') {
            removed.forEach(entity => {
                try {
                    onRemove(entity);
                } catch (error) {
                    window.logger.error('EntityManager prune callback failed:', error);
                }
            });
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

    // Note: _removeFromArray is defined above using O(1) swap-and-pop
}

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.EntityManager = EntityManager;
}

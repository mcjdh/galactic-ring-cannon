// Collision detection utilities

const CollisionUtils = {
    /**
     * Check collision between two circular entities
     * @param {Object} entity1 - First entity with x, y, radius
     * @param {Object} entity2 - Second entity with x, y, radius
     * @returns {boolean} True if colliding
     */
    circleCollision(entity1, entity2) {
        if (!entity1 || !entity2) return false;
        
        // Use squared distance to avoid expensive sqrt
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distanceSquared = dx * dx + dy * dy;
        
        const radius1 = entity1.radius || entity1.size || 10;
        const radius2 = entity2.radius || entity2.size || 10;
        const combinedRadiusSquared = (radius1 + radius2) * (radius1 + radius2);
        
        return distanceSquared < combinedRadiusSquared;
    },

    /**
     * Check collision between two rectangular entities
     * @param {Object} entity1 - First entity with x, y, width, height
     * @param {Object} entity2 - Second entity with x, y, width, height
     * @returns {boolean} True if colliding
     */
    rectCollision(entity1, entity2) {
        if (!entity1 || !entity2) return false;
        
        const width1 = entity1.width || entity1.size || 20;
        const height1 = entity1.height || entity1.size || 20;
        const width2 = entity2.width || entity2.size || 20;
        const height2 = entity2.height || entity2.size || 20;
        
        return entity1.x < entity2.x + width2 &&
               entity1.x + width1 > entity2.x &&
               entity1.y < entity2.y + height2 &&
               entity1.y + height1 > entity2.y;
    },

    /**
     * Check collision between circle and rectangle
     * @param {Object} circle - Circle entity with x, y, radius
     * @param {Object} rect - Rectangle entity with x, y, width, height
     * @returns {boolean} True if colliding
     */
    circleRectCollision(circle, rect) {
        if (!circle || !rect) return false;
        
        const radius = circle.radius || circle.size || 10;
        const rectWidth = rect.width || rect.size || 20;
        const rectHeight = rect.height || rect.size || 20;
        
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rectWidth));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rectHeight));
        
        // Calculate distance from circle center to closest point
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        
        return (dx * dx + dy * dy) <= (radius * radius);
    },

    /**
     * Check point collision with circle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {Object} circle - Circle entity with x, y, radius
     * @returns {boolean} True if point is inside circle
     */
    pointInCircle(px, py, circle) {
        if (!circle) return false;
        
        const radius = circle.radius || circle.size || 10;
        const dx = px - circle.x;
        const dy = py - circle.y;
        
        return (dx * dx + dy * dy) <= (radius * radius);
    },

    /**
     * Check point collision with rectangle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {Object} rect - Rectangle entity with x, y, width, height
     * @returns {boolean} True if point is inside rectangle
     */
    pointInRect(px, py, rect) {
        if (!rect) return false;
        
        const width = rect.width || rect.size || 20;
        const height = rect.height || rect.size || 20;
        
        return px >= rect.x && px <= rect.x + width &&
               py >= rect.y && py <= rect.y + height;
    },

    /**
     * Get collision normal vector between two circles
     * @param {Object} entity1 - First entity
     * @param {Object} entity2 - Second entity
     * @returns {Object} Normal vector {x, y}
     */
    getCollisionNormal(entity1, entity2) {
        if (!entity1 || !entity2) return { x: 0, y: 0 };
        
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return { x: 0, y: 0 };
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    },

    /**
     * Calculate overlap distance between two circles
     * @param {Object} entity1 - First entity with x, y, radius
     * @param {Object} entity2 - Second entity with x, y, radius
     * @returns {number} Overlap distance (0 if not overlapping)
     */
    getOverlapDistance(entity1, entity2) {
        if (!entity1 || !entity2) return 0;
        
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distanceSquared = dx * dx + dy * dy;
        
        const radius1 = entity1.radius || entity1.size || 10;
        const radius2 = entity2.radius || entity2.size || 10;
        const combinedRadius = radius1 + radius2;
        
        // Only calculate sqrt when we know there's an overlap
        if (distanceSquared >= combinedRadius * combinedRadius) {
            return 0;
        }
        
        const distance = Math.sqrt(distanceSquared);
        return combinedRadius - distance;
    },

    /**
     * Separate two overlapping circular entities
     * @param {Object} entity1 - First entity (will be moved)
     * @param {Object} entity2 - Second entity (stationary)
     * @returns {Object} Separation vector {x, y}
     */
    separateEntities(entity1, entity2) {
        if (!entity1 || !entity2) return { x: 0, y: 0 };
        
        const normal = this.getCollisionNormal(entity1, entity2);
        const overlap = this.getOverlapDistance(entity1, entity2);
        
        if (overlap > 0) {
            const separationX = normal.x * overlap;
            const separationY = normal.y * overlap;
            
            entity1.x -= separationX;
            entity1.y -= separationY;
            
            return { x: separationX, y: separationY };
        }
        
        return { x: 0, y: 0 };
    },

    /**
     * Check if entity is within viewport bounds
     * @param {Object} entity - Entity to check
     * @param {Object} camera - Camera with x, y properties
     * @param {number} viewWidth - Viewport width
     * @param {number} viewHeight - Viewport height
     * @param {number} margin - Extra margin for culling
     * @returns {boolean} True if entity is visible
     */
    isInViewport(entity, camera, viewWidth, viewHeight, margin = 100) {
        if (!entity || !camera) return false;
        
        const entitySize = entity.radius || entity.size || 10;
        const left = camera.x - viewWidth / 2 - margin;
        const right = camera.x + viewWidth / 2 + margin;
        const top = camera.y - viewHeight / 2 - margin;
        const bottom = camera.y + viewHeight / 2 + margin;
        
        return entity.x + entitySize > left &&
               entity.x - entitySize < right &&
               entity.y + entitySize > top &&
               entity.y - entitySize < bottom;
    },

    /**
     * Check line intersection with circle
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {Object} circle - Circle entity
     * @returns {boolean} True if line intersects circle
     */
    lineCircleIntersection(x1, y1, x2, y2, circle) {
        if (!circle) return false;
        
        const radius = circle.radius || circle.size || 10;
        const cx = circle.x;
        const cy = circle.y;
        
        // Vector from line start to circle center
        const dx1 = cx - x1;
        const dy1 = cy - y1;
        
        // Line vector
        const dx2 = x2 - x1;
        const dy2 = y2 - y1;
        
        // Project circle center onto line
        const lineLength = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (lineLength === 0) return this.pointInCircle(x1, y1, circle);
        
        const dot = (dx1 * dx2 + dy1 * dy2) / lineLength;
        const projection = Math.max(0, Math.min(lineLength, dot));
        
        // Find closest point on line
        const closestX = x1 + (dx2 / lineLength) * projection;
        const closestY = y1 + (dy2 / lineLength) * projection;
        
        // Check distance to circle
        return this.pointInCircle(closestX, closestY, circle);
    }
};

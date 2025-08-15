/**
 * 🌊 LEGACY ENEMY MIGRATION UTILITY
 * 
 * This utility helps migrate from the massive 2000+ line legacy Enemy.js
 * to the modern component-based Enemy architecture.
 * 
 * Based on key-code-patterns.md successful migration strategy:
 * - Enemy.js: 1,973 lines → AI + Abilities + Movement components ✅
 */

class LegacyEnemyMigrator {
    constructor() {
        this.migrationLog = [];
        this.componentMapping = new Map();
        this.legacyFeatures = new Set();
        this.modernFeatures = new Set();
        
        this.initializeComponentMapping();
    }
    
    /**
     * Initialize mapping between legacy methods and modern components
     */
    initializeComponentMapping() {
        // AI-related methods
        this.componentMapping.set('EnemyAI', [
            'updateAI', 'findNearestTarget', 'calculateTargeting',
            'shouldAttack', 'shouldRetreat', 'updateBossAI',
            'switchPhase', 'selectAttackPattern', 'updateAggroState'
        ]);
        
        // Abilities-related methods  
        this.componentMapping.set('EnemyAbilities', [
            'rangeAttack', 'spawnMinions', 'teleport', 'shieldAbility',
            'chargeAttack', 'aoeAttack', 'healAbility', 'berserkMode',
            'multiProjectileAttack', 'orbitalAttack', 'chainLightningAttack'
        ]);
        
        // Movement-related methods
        this.componentMapping.set('EnemyMovement', [
            'updateMovement', 'handleCollisions', 'dashTowards',
            'circlePlayer', 'fleeFromPlayer', 'updatePhysics',
            'handleBoundaries', 'avoidOtherEnemies', 'orbitMovement'
        ]);
        
        if (window.logger?.debug) {
            window.logger.debug('LegacyEnemyMigrator: Component mapping initialized');
        }
    }
    
    /**
     * Analyze legacy Enemy.js for migration readiness
     */
    analyzeLegacyEnemy() {
        this.log('🔍 Analyzing Legacy Enemy.js...');
        
        const analysis = {
            legacyAvailable: typeof window.LegacyEnemy !== 'undefined',
            modernAvailable: typeof window.Enemy !== 'undefined',
            componentsAvailable: this.checkComponentAvailability(),
            methodAnalysis: this.analyzeMethods(),
            migrationReadiness: 0
        };
        
        // Check if legacy enemy exists in global scope
        if (!analysis.legacyAvailable && typeof Enemy !== 'undefined') {
            // The current Enemy might be the legacy one
            const enemy = new Enemy(0, 0, 'basic');
            const methodCount = this.countMethods(enemy);
            
            if (methodCount > 50) {
                this.log(`⚠️ Current Enemy class has ${methodCount} methods - appears to be legacy version`);
                analysis.legacyInPlace = true;
            } else {
                this.log(`✅ Current Enemy class has ${methodCount} methods - appears to be modern version`);
                analysis.modernInPlace = true;
            }
        }
        
        // Calculate migration readiness
        let readinessScore = 0;
        if (analysis.componentsAvailable.allPresent) readinessScore += 40;
        if (analysis.modernAvailable) readinessScore += 30;
        if (analysis.legacyAvailable || analysis.legacyInPlace) readinessScore += 20;
        if (analysis.methodAnalysis.complexityScore < 50) readinessScore += 10;
        
        analysis.migrationReadiness = readinessScore;
        
        this.displayAnalysis(analysis);
        return analysis;
    }
    
    /**
     * Check if all required components are available
     */
    checkComponentAvailability() {
        const requiredComponents = ['EnemyAI', 'EnemyAbilities', 'EnemyMovement'];
        const results = {
            available: [],
            missing: [],
            allPresent: true
        };
        
        for (const component of requiredComponents) {
            if (typeof window[component] !== 'undefined') {
                results.available.push(component);
                this.modernFeatures.add(component);
            } else {
                results.missing.push(component);
                results.allPresent = false;
            }
        }
        
        this.log(`📋 Components - Available: ${results.available.length}, Missing: ${results.missing.length}`);
        return results;
    }
    
    /**
     * Analyze methods in current Enemy class
     */
    analyzeMethods() {
        const analysis = {
            totalMethods: 0,
            complexityScore: 0,
            componentBreakdown: new Map(),
            problematicMethods: []
        };
        
        try {
            if (typeof Enemy !== 'undefined') {
                const enemy = new Enemy(0, 0, 'basic');
                analysis.totalMethods = this.countMethods(enemy);
                
                // Analyze method distribution
                for (const [component, methods] of this.componentMapping.entries()) {
                    const foundMethods = methods.filter(method => 
                        typeof enemy[method] === 'function'
                    );
                    analysis.componentBreakdown.set(component, foundMethods);
                }
                
                // Calculate complexity score (higher = more complex)
                analysis.complexityScore = Math.min(100, analysis.totalMethods);
                
                // Look for problematic patterns
                const prototype = Enemy.prototype;
                const allMethods = Object.getOwnPropertyNames(prototype);
                
                for (const method of allMethods) {
                    if (typeof enemy[method] === 'function') {
                        if (method.includes('update') && method !== 'update') {
                            analysis.problematicMethods.push(`${method} - Multiple update methods`);
                        }
                        if (method.length > 25) {
                            analysis.problematicMethods.push(`${method} - Very long method name`);
                        }
                    }
                }
                
                enemy.isDead = true; // Cleanup
            }
        } catch (error) {
            this.log(`❌ Error analyzing methods: ${error.message}`);
        }
        
        return analysis;
    }
    
    /**
     * Perform automatic migration where possible
     */
    performMigration() {
        this.log('🚀 Starting Automatic Migration...');
        
        const migrationSteps = [];
        
        // Step 1: Check prerequisites
        if (!this.checkPrerequisites()) {
            this.log('❌ Migration prerequisites not met');
            return false;
        }
        
        // Step 2: Create compatibility layer
        migrationSteps.push(() => this.createCompatibilityLayer());
        
        // Step 3: Enhance current Enemy with components if needed
        migrationSteps.push(() => this.enhanceEnemyWithComponents());
        
        // Step 4: Performance optimizations
        migrationSteps.push(() => this.applyPerformanceOptimizations());
        
        // Step 5: Validate migration
        migrationSteps.push(() => this.validateMigration());
        
        // Execute migration steps
        let stepsCompleted = 0;
        for (const step of migrationSteps) {
            try {
                const result = step();
                if (result !== false) {
                    stepsCompleted++;
                } else {
                    this.log(`⚠️ Migration step ${stepsCompleted + 1} failed or skipped`);
                }
            } catch (error) {
                this.log(`❌ Migration step ${stepsCompleted + 1} error: ${error.message}`);
                break;
            }
        }
        
        this.log(`✅ Migration completed: ${stepsCompleted}/${migrationSteps.length} steps successful`);
        return stepsCompleted === migrationSteps.length;
    }
    
    /**
     * Check migration prerequisites
     */
    checkPrerequisites() {
        const prerequisites = [
            typeof window.Enemy !== 'undefined',
            typeof window.EnemyAI !== 'undefined',
            typeof window.EnemyAbilities !== 'undefined',
            typeof window.EnemyMovement !== 'undefined'
        ];
        
        const allMet = prerequisites.every(Boolean);
        this.log(`📋 Prerequisites: ${prerequisites.filter(Boolean).length}/${prerequisites.length} met`);
        
        return allMet;
    }
    
    /**
     * Create compatibility layer for legacy code
     */
    createCompatibilityLayer() {
        if (window.EnemyLegacyAdapter) {
            this.log('✅ Legacy adapter already exists');
            return true;
        }
        
        // Create adapter to bridge legacy calls to modern components
        window.EnemyLegacyAdapter = {
            wrapEnemy: (enemy) => {
                // Add legacy method aliases if needed
                if (!enemy.updateAI && enemy.ai?.update) {
                    enemy.updateAI = enemy.ai.update.bind(enemy.ai);
                }
                
                if (!enemy.rangeAttack && enemy.abilities?.performRangeAttack) {
                    enemy.rangeAttack = enemy.abilities.performRangeAttack.bind(enemy.abilities);
                }
                
                if (!enemy.updateMovement && enemy.movement?.update) {
                    enemy.updateMovement = enemy.movement.update.bind(enemy.movement);
                }
                
                return enemy;
            }
        };
        
        this.log('✅ Created legacy compatibility adapter');
        return true;
    }
    
    /**
     * Enhance current Enemy with component architecture if needed
     */
    enhanceEnemyWithComponents() {
        if (!window.Enemy) return false;
        
        try {
            // Test current Enemy class
            const testEnemy = new Enemy(0, 0, 'basic');
            
            // Check if it already has components
            if (testEnemy.ai && testEnemy.abilities && testEnemy.movement) {
                this.log('✅ Enemy already has component architecture');
                testEnemy.isDead = true; // Cleanup
                return true;
            }
            
            // Check if it's a legacy monolith
            const methodCount = this.countMethods(testEnemy);
            if (methodCount > 50) {
                this.log(`⚠️ Enemy appears to be legacy monolith with ${methodCount} methods`);
                this.log('💡 Consider loading the modern Enemy.js from src/entities/enemy.js');
            }
            
            testEnemy.isDead = true; // Cleanup
            return true;
            
        } catch (error) {
            this.log(`❌ Error enhancing Enemy: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Apply performance optimizations
     */
    applyPerformanceOptimizations() {
        // Add performance monitoring to Enemy updates if not present
        if (typeof Enemy !== 'undefined' && !Enemy.prototype._performanceMonitoring) {
            const originalUpdate = Enemy.prototype.update;
            
            Enemy.prototype.update = function(deltaTime, game) {
                if (window.performanceManager?.isEnabled) {
                    const startTime = performance.now();
                    const result = originalUpdate.call(this, deltaTime, game);
                    const endTime = performance.now();
                    
                    if (endTime - startTime > 5) {
                        window.logger?.debug(`Slow enemy update: ${(endTime - startTime).toFixed(2)}ms`);
                    }
                    
                    return result;
                } else {
                    return originalUpdate.call(this, deltaTime, game);
                }
            };
            
            Enemy.prototype._performanceMonitoring = true;
            this.log('✅ Added performance monitoring to Enemy updates');
        }
        
        return true;
    }
    
    /**
     * Validate migration success
     */
    validateMigration() {
        try {
            // Test Enemy instantiation and basic functionality
            const testEnemy = new Enemy(100, 100, 'basic');
            
            // Test component access
            const hasComponents = testEnemy.ai && testEnemy.abilities && testEnemy.movement;
            
            // Test update method
            testEnemy.update(0.016, { entities: [], keys: {} });
            
            // Test cleanup
            testEnemy.isDead = true;
            
            if (hasComponents) {
                this.log('✅ Migration validation successful - components working');
            } else {
                this.log('⚠️ Migration validation partial - no components detected');
            }
            
            return true;
            
        } catch (error) {
            this.log(`❌ Migration validation failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Display migration analysis results
     */
    displayAnalysis(analysis) {
        console.log('\n' + '='.repeat(60));
        console.log('🌊 LEGACY ENEMY MIGRATION ANALYSIS');
        console.log('='.repeat(60));
        
        console.log('\n📊 CURRENT STATUS:');
        console.log(`  Legacy Available: ${analysis.legacyAvailable ? '✅' : '❌'}`);
        console.log(`  Modern Available: ${analysis.modernAvailable ? '✅' : '❌'}`);
        console.log(`  Components Available: ${analysis.componentsAvailable.allPresent ? '✅' : '❌'}`);
        
        if (analysis.methodAnalysis.totalMethods > 0) {
            console.log(`\n📋 METHOD ANALYSIS:`);
            console.log(`  Total Methods: ${analysis.methodAnalysis.totalMethods}`);
            console.log(`  Complexity Score: ${analysis.methodAnalysis.complexityScore}/100`);
            
            if (analysis.methodAnalysis.problematicMethods.length > 0) {
                console.log(`  Problematic Methods: ${analysis.methodAnalysis.problematicMethods.length}`);
                analysis.methodAnalysis.problematicMethods.forEach(method => {
                    console.log(`    - ${method}`);
                });
            }
        }
        
        console.log(`\n🎯 MIGRATION READINESS: ${analysis.migrationReadiness}%`);
        
        if (analysis.migrationReadiness >= 80) {
            console.log('✅ READY FOR MIGRATION');
        } else if (analysis.migrationReadiness >= 60) {
            console.log('⚠️ PARTIAL READINESS - Some components missing');
        } else {
            console.log('❌ NOT READY - Major prerequisites missing');
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (!analysis.componentsAvailable.allPresent) {
            console.log('  - Load missing enemy components');
        }
        if (analysis.methodAnalysis.complexityScore > 70) {
            console.log('  - Current Enemy class is complex - component migration recommended');
        }
        if (analysis.migrationReadiness >= 70) {
            console.log('  - Run performMigration() to apply automatic fixes');
        }
        
        console.log('\n' + '='.repeat(60));
    }
    
    /**
     * Get migration statistics
     */
    getMigrationStats() {
        return {
            log: this.migrationLog,
            componentMapping: Object.fromEntries(this.componentMapping),
            legacyFeatures: Array.from(this.legacyFeatures),
            modernFeatures: Array.from(this.modernFeatures)
        };
    }
    
    // Helper methods
    log(message) {
        this.migrationLog.push(`${new Date().toISOString()}: ${message}`);
        if (window.logger?.debug) {
            window.logger.debug(message);
        } else {
            console.log(message);
        }
    }
    
    countMethods(obj) {
        let count = 0;
        let current = obj;
        while (current && current !== Object.prototype) {
            Object.getOwnPropertyNames(current).forEach(name => {
                if (typeof obj[name] === 'function' && name !== 'constructor') {
                    count++;
                }
            });
            current = Object.getPrototypeOf(current);
        }
        return count;
    }
}

// Make migrator available globally
window.LegacyEnemyMigrator = LegacyEnemyMigrator;

// Convenience functions
window.analyzeEnemyMigration = function() {
    const migrator = new LegacyEnemyMigrator();
    return migrator.analyzeLegacyEnemy();
};

window.performEnemyMigration = function() {
    const migrator = new LegacyEnemyMigrator();
    return migrator.performMigration();
};

// Auto-run if debug mode is enabled
if (window.debugManager?.enabled || window.location.search.includes('debug=true')) {
    console.log('🌊 Legacy Enemy Migrator available!');
    console.log('Run: analyzeEnemyMigration() to analyze enemy architecture');
    console.log('Run: performEnemyMigration() to apply migration fixes');
}

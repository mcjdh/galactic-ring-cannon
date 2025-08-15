/**
 * 🔧 PLAYER MIGRATION DIAGNOSTIC TOOL
 * 
 * This utility helps identify issues with the Player class migration
 * and provides automated fixes for common problems.
 * 
 * Usage: Run in browser console after game loads
 * Call: runPlayerDiagnostic()
 */

class PlayerMigrationDiagnostic {
    constructor() {
        this.issues = [];
        this.fixes = [];
        this.stats = {
            methodCount: 0,
            lineCount: 0,
            componentPotential: 0
        };
    }
    
    /**
     * Run full diagnostic on player system
     */
    runDiagnostic() {
        console.log('🔍 Running Player Migration Diagnostic...');
        
        this.checkPlayerClassAvailability();
        this.checkComponentAvailability();
        this.checkMethodComplexity();
        this.checkPerformanceIssues();
        this.generateMigrationPlan();
        
        this.displayResults();
    }
    
    /**
     * Check if player classes are available
     */
    checkPlayerClassAvailability() {
        console.log('📋 Checking Player Class Availability...');
        
        if (typeof window.Player !== 'undefined') {
            this.addFix('✅ Original Player class available');
            
            // Test instantiation
            try {
                const testPlayer = new window.Player(0, 0);
                this.addFix('✅ Player instantiation successful');
                this.stats.methodCount = this.countMethods(testPlayer);
                testPlayer.isDead = true; // Cleanup
            } catch (error) {
                this.addIssue('❌ Player instantiation failed: ' + error.message);
            }
        } else {
            this.addIssue('❌ Original Player class not found');
        }
        
        if (typeof window.PlayerRefactored !== 'undefined') {
            this.addFix('✅ PlayerRefactored class available');
            
            // Test instantiation
            try {
                const testPlayer = new window.PlayerRefactored(0, 0);
                this.addFix('✅ PlayerRefactored instantiation successful');
                testPlayer.isDead = true; // Cleanup
            } catch (error) {
                this.addIssue('❌ PlayerRefactored instantiation failed: ' + error.message);
            }
        } else {
            this.addIssue('❌ PlayerRefactored class not found - migration incomplete');
        }
    }
    
    /**
     * Check if player components are available
     */
    checkComponentAvailability() {
        console.log('🧩 Checking Player Component Availability...');
        
        const components = ['PlayerMovement', 'PlayerCombat', 'PlayerAbilities'];
        let availableComponents = 0;
        
        for (const component of components) {
            if (typeof window[component] !== 'undefined') {
                this.addFix(`✅ ${component} component available`);
                availableComponents++;
                
                // Test component instantiation
                try {
                    const testPlayer = { x: 0, y: 0, type: 'player' };
                    const testComponent = new window[component](testPlayer);
                    this.addFix(`✅ ${component} instantiation successful`);
                } catch (error) {
                    this.addIssue(`❌ ${component} instantiation failed: ${error.message}`);
                }
            } else {
                this.addIssue(`❌ ${component} component not found`);
            }
        }
        
        this.stats.componentPotential = (availableComponents / components.length) * 100;
        
        if (availableComponents === components.length) {
            this.addFix('✅ All player components available for migration');
        } else {
            this.addIssue(`⚠️ Only ${availableComponents}/${components.length} components available`);
        }
    }
    
    /**
     * Check method complexity in current player
     */
    checkMethodComplexity() {
        console.log('📊 Analyzing Method Complexity...');
        
        if (typeof window.Player !== 'undefined') {
            const player = window.Player.prototype;
            const methods = Object.getOwnPropertyNames(player);
            
            this.stats.methodCount = methods.length;
            
            if (methods.length > 30) {
                this.addIssue(`❌ Player class has ${methods.length} methods - too complex for maintenance`);
                this.addFix('💡 Recommend: Split into components (Movement, Combat, Abilities)');
            } else {
                this.addFix(`✅ Player class has manageable ${methods.length} methods`);
            }
            
            // Check for problematic method names
            const problematicMethods = methods.filter(method => 
                method.includes('update') && method !== 'update' ||
                method.includes('handle') ||
                method.length > 25
            );
            
            if (problematicMethods.length > 0) {
                this.addIssue(`⚠️ Found ${problematicMethods.length} potentially complex methods`);
                problematicMethods.forEach(method => {
                    this.addIssue(`  - ${method}`);
                });
            }
        }
    }
    
    /**
     * Check for common performance issues
     */
    checkPerformanceIssues() {
        console.log('⚡ Checking Performance Issues...');
        
        // Check for global variable access patterns
        if (window.gameManager && window.gameManager.player) {
            const player = window.gameManager.player;
            
            // Check update frequency
            const startTime = performance.now();
            if (typeof player.update === 'function') {
                try {
                    player.update(0.016, { entities: [], keys: {} }); // Simulate frame
                    const endTime = performance.now();
                    const updateTime = endTime - startTime;
                    
                    if (updateTime > 5) {
                        this.addIssue(`❌ Player update takes ${updateTime.toFixed(2)}ms - too slow`);
                    } else {
                        this.addFix(`✅ Player update takes ${updateTime.toFixed(2)}ms - acceptable`);
                    }
                } catch (error) {
                    this.addIssue(`❌ Player update failed: ${error.message}`);
                }
            }
            
            // Check property count
            const propertyCount = Object.keys(player).length;
            if (propertyCount > 50) {
                this.addIssue(`❌ Player has ${propertyCount} properties - consider grouping into objects`);
            } else {
                this.addFix(`✅ Player has manageable ${propertyCount} properties`);
            }
        } else {
            this.addIssue('⚠️ No active player instance found for performance testing');
        }
    }
    
    /**
     * Generate migration plan
     */
    generateMigrationPlan() {
        console.log('📋 Generating Migration Plan...');
        
        const migrationSteps = [];
        
        if (typeof window.PlayerRefactored === 'undefined') {
            migrationSteps.push('1. Load PlayerRefactored.js in index.html');
        }
        
        if (this.stats.componentPotential < 100) {
            migrationSteps.push('2. Ensure all Player components are loaded');
        }
        
        migrationSteps.push('3. Update GameEngine to use PlayerRefactored instead of Player');
        migrationSteps.push('4. Update GameManager references to use PlayerRefactored');
        migrationSteps.push('5. Test all player mechanics (movement, combat, abilities)');
        migrationSteps.push('6. Update HTML script loading order');
        migrationSteps.push('7. Remove old Player.js once migration confirmed working');
        
        this.migrationPlan = migrationSteps;
        
        this.addFix('📋 Migration plan generated with ' + migrationSteps.length + ' steps');
    }
    
    /**
     * Display diagnostic results
     */
    displayResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🔧 PLAYER MIGRATION DIAGNOSTIC RESULTS');
        console.log('='.repeat(60));
        
        console.log('\n📊 STATISTICS:');
        console.log(`  - Methods in Player: ${this.stats.methodCount}`);
        console.log(`  - Component availability: ${this.stats.componentPotential.toFixed(0)}%`);
        
        console.log('\n❌ ISSUES FOUND:');
        if (this.issues.length === 0) {
            console.log('  ✅ No critical issues found!');
        } else {
            this.issues.forEach(issue => console.log(`  ${issue}`));
        }
        
        console.log('\n✅ POSITIVE FINDINGS:');
        this.fixes.forEach(fix => console.log(`  ${fix}`));
        
        if (this.migrationPlan) {
            console.log('\n📋 MIGRATION PLAN:');
            this.migrationPlan.forEach(step => console.log(`  ${step}`));
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (this.issues.length > 3) {
            console.log('  - High complexity detected - component migration highly recommended');
        }
        if (this.stats.componentPotential === 100) {
            console.log('  - All components available - ready for migration!');
        }
        if (this.stats.methodCount > 30) {
            console.log('  - Consider breaking down large methods into smaller, focused functions');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('Run applyAutomaticFixes() to apply available fixes');
        console.log('='.repeat(60));
    }
    
    /**
     * Apply automatic fixes where possible
     */
    applyAutomaticFixes() {
        console.log('🔧 Applying automatic fixes...');
        
        let fixesApplied = 0;
        
        // Fix 1: Create PlayerRefactored reference for compatibility
        if (typeof window.PlayerRefactored !== 'undefined' && typeof window.Player !== 'undefined') {
            // Create a compatibility layer
            window.PlayerCompatible = window.PlayerRefactored;
            console.log('✅ Created PlayerCompatible reference');
            fixesApplied++;
        }
        
        // Fix 2: Add component availability check
        if (typeof window.PlayerMovement !== 'undefined') {
            window.playerComponentsAvailable = true;
            console.log('✅ Marked player components as available');
            fixesApplied++;
        }
        
        // Fix 3: Create migration utility functions
        window.migrateToPlayerRefactored = () => {
            if (window.gameManager && window.gameManager.player) {
                const oldPlayer = window.gameManager.player;
                const newPlayer = new window.PlayerRefactored(oldPlayer.x, oldPlayer.y);
                
                // Copy essential state
                newPlayer.health = oldPlayer.health;
                newPlayer.maxHealth = oldPlayer.maxHealth;
                newPlayer.level = oldPlayer.level;
                newPlayer.xp = oldPlayer.xp;
                newPlayer.xpToNextLevel = oldPlayer.xpToNextLevel;
                
                window.gameManager.player = newPlayer;
                console.log('✅ Player migrated to PlayerRefactored');
                return newPlayer;
            }
        };
        fixesApplied++;
        
        console.log(`✅ Applied ${fixesApplied} automatic fixes`);
        
        return fixesApplied;
    }
    
    // Helper methods
    addIssue(issue) { this.issues.push(issue); }
    addFix(fix) { this.fixes.push(fix); }
    
    countMethods(obj) {
        const methods = [];
        let current = obj;
        while (current && current !== Object.prototype) {
            Object.getOwnPropertyNames(current).forEach(name => {
                if (typeof obj[name] === 'function' && name !== 'constructor') {
                    methods.push(name);
                }
            });
            current = Object.getPrototypeOf(current);
        }
        return methods.length;
    }
}

// Make diagnostic available globally
window.PlayerMigrationDiagnostic = PlayerMigrationDiagnostic;

// Convenience function
window.runPlayerDiagnostic = function() {
    const diagnostic = new PlayerMigrationDiagnostic();
    diagnostic.runDiagnostic();
    return diagnostic;
};

// Auto-run if debug mode is enabled
if (window.debugManager?.enabled || window.location.search.includes('debug=true')) {
    console.log('🔍 Player Migration Diagnostic available!');
    console.log('Run: runPlayerDiagnostic() to analyze the player system');
    console.log('Run: window.playerDiagnostic.applyAutomaticFixes() to apply fixes');
}

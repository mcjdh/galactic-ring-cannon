/**
 * 🌊 RESONANT DEBUG COMMAND CENTER
 * 
 * Comprehensive debug console for testing all the performance enhancements
 * and architectural improvements applied to Galactic Ring Cannon.
 * 
 * Usage: Open browser console and use the available commands
 */

class ResonantDebugCenter {
    constructor() {
        this.commands = new Map();
        this.history = [];
        this.shortcuts = new Map();
        
        this.initializeCommands();
        this.attachToConsole();
    }
    
    /**
     * Initialize all debug commands
     */
    initializeCommands() {
        // Performance commands
        this.addCommand('perf', 'Performance monitoring and statistics', {
            start: () => this.startPerformanceMonitoring(),
            stop: () => this.stopPerformanceMonitoring(),
            report: () => this.getPerformanceReport(),
            stats: () => this.getPerformanceStats()
        });
        
        // Particle system commands
        this.addCommand('particles', 'Particle system controls', {
            stats: () => this.getParticleStats(),
            explosion: (x, y) => this.createTestExplosion(x, y),
            stress: (count) => this.particleStressTest(count),
            mode: (mode) => this.setParticleMode(mode)
        });
        
        // AI system commands
        this.addCommand('ai', 'AI enhancement controls', {
            enable: () => this.enableAdvancedAI(),
            disable: () => this.disableAdvancedAI(),
            stats: () => this.getAIStats(),
            analyze: () => this.analyzeAIPerformance()
        });
        
        // Component system commands
        this.addCommand('components', 'Component architecture tools', {
            player: () => this.analyzePlayerComponents(),
            enemy: () => this.analyzeEnemyComponents(),
            migrate: () => this.runMigrationDiagnostics()
        });
        
        // Collision system commands
        this.addCommand('collision', 'Collision system analysis', {
            stats: () => this.getCollisionStats(),
            visualize: () => this.visualizeCollisionGrid(),
            test: () => this.collisionStressTest()
        });
        
        // System health commands
        this.addCommand('health', 'Overall system health check', {
            check: () => this.systemHealthCheck(),
            optimize: () => this.autoOptimize(),
            benchmark: () => this.runBenchmark()
        });
        
        // Fun/testing commands
        this.addCommand('test', 'Testing and fun commands', {
            spawn: (type, count) => this.spawnTestEntities(type, count),
            clear: () => this.clearAllEntities(),
            godmode: () => this.toggleGodMode(),
            speed: (multiplier) => this.setGameSpeed(multiplier)
        });
        
        // Setup shortcuts
        this.shortcuts.set('p', 'perf');
        this.shortcuts.set('ai', 'ai');
        this.shortcuts.set('h', 'health');
        this.shortcuts.set('t', 'test');
    }
    
    /**
     * Add a command category
     */
    addCommand(name, description, methods) {
        this.commands.set(name, {
            description,
            methods: new Map(Object.entries(methods))
        });
    }
    
    /**
     * Attach debug center to global console
     */
    attachToConsole() {
        // Main command interface
        window.rc = (command, method, ...args) => {
            return this.executeCommand(command, method, ...args);
        };
        
        // Individual command shortcuts
        for (const [name, data] of this.commands) {
            window[name] = {};
            for (const [methodName, methodFunc] of data.methods) {
                window[name][methodName] = methodFunc.bind(this);
            }
        }
        
        // Help system
        window.rchelp = () => this.showHelp();
        
        // Quick shortcuts
        for (const [shortcut, command] of this.shortcuts) {
            if (!window[shortcut]) {
                window[shortcut] = window[command];
            }
        }
        
        console.log('🌊 Resonant Debug Center initialized!');
        console.log('Type rchelp() for available commands');
        console.log('Quick access: perf.start(), ai.enable(), health.check()');
    }
    
    /**
     * Execute a command
     */
    executeCommand(command, method, ...args) {
        const cmd = this.commands.get(command);
        if (!cmd) {
            console.error(`Command '${command}' not found. Use rchelp() for available commands.`);
            return;
        }
        
        const methodFunc = cmd.methods.get(method);
        if (!methodFunc) {
            console.error(`Method '${method}' not found in '${command}'. Available methods:`, Array.from(cmd.methods.keys()));
            return;
        }
        
        try {
            const result = methodFunc.apply(this, args);
            this.history.push({ command, method, args, result, timestamp: Date.now() });
            return result;
        } catch (error) {
            console.error(`Error executing ${command}.${method}:`, error);
            return null;
        }
    }
    
    /**
     * Show help information
     */
    showHelp() {
        console.log('\n🌊 RESONANT DEBUG CENTER - COMMAND REFERENCE\n' + '='.repeat(60));
        
        for (const [name, data] of this.commands) {
            console.log(`\n📋 ${name.toUpperCase()} - ${data.description}`);
            for (const [methodName, methodFunc] of data.methods) {
                console.log(`  ${name}.${methodName}() - ${this.getMethodDescription(name, methodName)}`);
            }
        }
        
        console.log('\n🔧 SHORTCUTS:');
        for (const [shortcut, command] of this.shortcuts) {
            console.log(`  ${shortcut} = ${command}`);
        }
        
        console.log('\n💡 EXAMPLES:');
        console.log('  perf.start()           - Start performance monitoring');
        console.log('  ai.enable()            - Enable advanced AI');
        console.log('  particles.explosion()  - Create test explosion');
        console.log('  health.check()         - Check system health');
        console.log('  test.spawn("enemy",10) - Spawn 10 test enemies');
        
        console.log('\n' + '='.repeat(60));
    }
    
    /**
     * Get method description
     */
    getMethodDescription(command, method) {
        const descriptions = {
            perf: {
                start: 'Start real-time performance monitoring',
                stop: 'Stop performance monitoring',
                report: 'Get detailed performance report',
                stats: 'Get current performance statistics'
            },
            particles: {
                stats: 'Get particle system statistics',
                explosion: 'Create test explosion at cursor/center',
                stress: 'Run particle stress test with N particles',
                mode: 'Set particle quality mode (high/medium/low)'
            },
            ai: {
                enable: 'Enable advanced AI enhancements',
                disable: 'Disable AI enhancements',
                stats: 'Get AI performance statistics',
                analyze: 'Run AI behavior analysis'
            },
            components: {
                player: 'Analyze player component architecture',
                enemy: 'Analyze enemy component architecture',
                migrate: 'Run component migration diagnostics'
            },
            collision: {
                stats: 'Get collision system performance stats',
                visualize: 'Enable collision grid visualization',
                test: 'Run collision system stress test'
            },
            health: {
                check: 'Run comprehensive system health check',
                optimize: 'Apply automatic optimizations',
                benchmark: 'Run performance benchmark'
            },
            test: {
                spawn: 'Spawn test entities (type, count)',
                clear: 'Clear all entities from game',
                godmode: 'Toggle player invulnerability',
                speed: 'Set game speed multiplier'
            }
        };
        
        return descriptions[command]?.[method] || 'No description available';
    }
    
    // === PERFORMANCE COMMANDS ===
    
    startPerformanceMonitoring() {
        if (window.resonantPerformanceMonitor) {
            window.resonantPerformanceMonitor.start();
            console.log('✅ Performance monitoring started');
            return true;
        } else {
            console.error('❌ Performance monitor not available');
            return false;
        }
    }
    
    stopPerformanceMonitoring() {
        if (window.resonantPerformanceMonitor) {
            window.resonantPerformanceMonitor.stop();
            console.log('✅ Performance monitoring stopped');
            return true;
        }
        return false;
    }
    
    getPerformanceReport() {
        if (window.resonantPerformanceMonitor) {
            return window.resonantPerformanceMonitor.getPerformanceReport();
        }
        return null;
    }
    
    getPerformanceStats() {
        const stats = {};
        
        if (window.resonantPerformanceMonitor) {
            stats.monitor = window.resonantPerformanceMonitor.metrics;
        }
        
        if (window.resonantParticleEnhancer) {
            stats.particles = window.resonantParticleEnhancer.getStatistics();
        }
        
        console.table(stats);
        return stats;
    }
    
    // === PARTICLE COMMANDS ===
    
    getParticleStats() {
        if (window.resonantParticleEnhancer) {
            const stats = window.resonantParticleEnhancer.getStatistics();
            console.log('🎆 Particle System Statistics:');
            console.table(stats);
            return stats;
        }
        return null;
    }
    
    createTestExplosion(x, y) {
        x = x || (window.innerWidth / 2);
        y = y || (window.innerHeight / 2);
        
        if (window.resonantParticleEnhancer) {
            const particles = window.resonantParticleEnhancer.createExplosion(x, y, 100, '#ff6600', 30);
            console.log(`✨ Created explosion with ${particles.length} particles at (${x}, ${y})`);
            return particles;
        } else if (window.optimizedParticles) {
            for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 * i) / 30;
                const speed = 50 + Math.random() * 100;
                window.optimizedParticles.spawnParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 2,
                    color: '#ff6600',
                    life: 1.0,
                    type: 'explosion'
                });
            }
            console.log(`✨ Created basic explosion at (${x}, ${y})`);
        }
    }
    
    particleStressTest(count = 1000) {
        console.log(`🧪 Running particle stress test with ${count} particles...`);
        const startTime = performance.now();
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const vx = (Math.random() - 0.5) * 200;
            const vy = (Math.random() - 0.5) * 200;
            
            if (window.resonantParticleEnhancer) {
                window.resonantParticleEnhancer.spawnParticle({
                    x, y, vx, vy,
                    size: 1 + Math.random() * 3,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    life: 2 + Math.random() * 3,
                    type: 'basic'
                });
            } else if (window.optimizedParticles) {
                window.optimizedParticles.spawnParticle({
                    x, y, vx, vy,
                    size: 1 + Math.random() * 3,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    life: 2 + Math.random() * 3
                });
            }
        }
        
        const endTime = performance.now();
        console.log(`✅ Created ${count} particles in ${(endTime - startTime).toFixed(2)}ms`);
        return endTime - startTime;
    }
    
    setParticleMode(mode) {
        if (window.resonantParticleEnhancer) {
            window.resonantParticleEnhancer.setPerformanceMode(mode);
            console.log(`✅ Particle mode set to: ${mode}`);
            return true;
        }
        return false;
    }
    
    // === AI COMMANDS ===
    
    enableAdvancedAI() {
        if (window.resonantAIEnhancer) {
            window.resonantAIEnhancer.enable();
            console.log('✅ Advanced AI enabled');
            return true;
        } else {
            console.error('❌ AI enhancer not available');
            return false;
        }
    }
    
    disableAdvancedAI() {
        if (window.resonantAIEnhancer) {
            window.resonantAIEnhancer.disable();
            console.log('✅ Advanced AI disabled');
            return true;
        }
        return false;
    }
    
    getAIStats() {
        if (window.resonantAIEnhancer) {
            const stats = window.resonantAIEnhancer.getStatistics();
            console.log('🤖 AI Enhancement Statistics:');
            console.table(stats);
            return stats;
        }
        return null;
    }
    
    analyzeAIPerformance() {
        console.log('🧠 Analyzing AI performance...');
        // Implementation would analyze AI decision times, accuracy, etc.
        return { analysis: 'AI analysis not yet implemented' };
    }
    
    // === COMPONENT COMMANDS ===
    
    analyzePlayerComponents() {
        if (window.runPlayerDiagnostic) {
            return window.runPlayerDiagnostic();
        } else {
            console.error('❌ Player diagnostic not available');
            return null;
        }
    }
    
    analyzeEnemyComponents() {
        if (window.analyzeEnemyMigration) {
            return window.analyzeEnemyMigration();
        } else {
            console.error('❌ Enemy migration analyzer not available');
            return null;
        }
    }
    
    runMigrationDiagnostics() {
        console.log('🔧 Running migration diagnostics...');
        const results = {};
        
        if (window.runPlayerDiagnostic) {
            results.player = window.runPlayerDiagnostic();
        }
        
        if (window.analyzeEnemyMigration) {
            results.enemy = window.analyzeEnemyMigration();
        }
        
        return results;
    }
    
    // === HEALTH COMMANDS ===
    
    systemHealthCheck() {
        console.log('🏥 Running system health check...');
        
        const health = {
            overall: 'good',
            systems: {},
            recommendations: []
        };
        
        // Check core systems
        const coreClasses = ['Player', 'Enemy', 'GameEngine', 'Projectile'];
        for (const className of coreClasses) {
            health.systems[className] = typeof window[className] !== 'undefined';
        }
        
        // Check enhancements
        const enhancements = [
            'resonantPerformanceMonitor',
            'resonantParticleEnhancer', 
            'resonantAIEnhancer'
        ];
        for (const enhancement of enhancements) {
            health.systems[enhancement] = typeof window[enhancement] !== 'undefined';
        }
        
        // Generate recommendations
        if (!health.systems.resonantPerformanceMonitor) {
            health.recommendations.push('Load ResonantPerformanceMonitor for performance tracking');
        }
        if (!health.systems.resonantParticleEnhancer) {
            health.recommendations.push('Load ResonantParticleEnhancer for particle optimization');
        }
        
        console.log('🏥 System Health Report:');
        console.table(health.systems);
        
        if (health.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            health.recommendations.forEach(rec => console.log(`  - ${rec}`));
        } else {
            console.log('✅ All systems healthy!');
        }
        
        return health;
    }
    
    autoOptimize() {
        console.log('🚀 Running auto-optimization...');
        let optimizations = 0;
        
        // Start performance monitoring if available
        if (window.resonantPerformanceMonitor && !window.resonantPerformanceMonitor.isEnabled) {
            window.resonantPerformanceMonitor.start();
            optimizations++;
        }
        
        // Enable AI enhancements if available
        if (window.resonantAIEnhancer && !window.resonantAIEnhancer.isEnabled) {
            window.resonantAIEnhancer.enable();
            optimizations++;
        }
        
        // Set particle system to adaptive mode
        if (window.resonantParticleEnhancer) {
            window.resonantParticleEnhancer.setAdaptiveQuality(true);
            optimizations++;
        }
        
        console.log(`✅ Applied ${optimizations} optimizations`);
        return optimizations;
    }
    
    runBenchmark() {
        console.log('📊 Running performance benchmark...');
        // Implementation would run various performance tests
        return { benchmark: 'Benchmark not yet implemented' };
    }
    
    // === TEST COMMANDS ===
    
    spawnTestEntities(type = 'enemy', count = 5) {
        if (!window.gameManager) {
            console.error('❌ Game manager not available');
            return false;
        }
        
        console.log(`🐣 Spawning ${count} test ${type}s...`);
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * 800 + 100;
            const y = Math.random() * 600 + 100;
            
            if (type === 'enemy' && typeof Enemy !== 'undefined') {
                const enemy = new Enemy(x, y, 'basic');
                if (window.gameManager.addEntity) {
                    window.gameManager.addEntity(enemy);
                } else if (window.gameManager.entities) {
                    window.gameManager.entities.push(enemy);
                }
            }
        }
        
        return true;
    }
    
    clearAllEntities() {
        if (window.gameManager?.entities) {
            const count = window.gameManager.entities.length;
            window.gameManager.entities.length = 0;
            console.log(`🗑️ Cleared ${count} entities`);
            return count;
        }
        return 0;
    }
    
    toggleGodMode() {
        if (window.gameManager?.player) {
            const player = window.gameManager.player;
            player.isInvulnerable = !player.isInvulnerable;
            console.log(`🛡️ God mode: ${player.isInvulnerable ? 'ON' : 'OFF'}`);
            return player.isInvulnerable;
        }
        return false;
    }
    
    setGameSpeed(multiplier = 1.0) {
        // Implementation would adjust game speed
        console.log(`⚡ Game speed set to ${multiplier}x (not yet implemented)`);
        return multiplier;
    }
}

// Initialize debug center
window.ResonantDebugCenter = ResonantDebugCenter;
window.resonantDebugCenter = new ResonantDebugCenter();

// Show welcome message in debug mode
if (window.debugManager?.enabled || window.location.search.includes('debug=true')) {
    setTimeout(() => {
        console.log('\n🌊 RESONANT DEBUG CENTER READY!');
        console.log('═══════════════════════════════════════════════');
        console.log('Quick start:');
        console.log('  perf.start()  - Start performance monitoring');
        console.log('  ai.enable()   - Enable advanced AI');
        console.log('  health.check() - Check system health');
        console.log('  rchelp()      - Show all commands');
        console.log('═══════════════════════════════════════════════');
    }, 1000);
}
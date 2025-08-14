#!/usr/bin/env node
/**
 * Simple development utilities for Galactic Ring Cannon
 * No external dependencies - pure Node.js
 */

const fs = require('fs');
const path = require('path');

const COMMANDS = {
    'convert': 'Convert JavaScript files to ES6 modules',
    'validate': 'Validate module syntax',
    'serve': 'Start development server',
    'help': 'Show this help message'
};

function showHelp() {
    console.log('🚀 Galactic Ring Cannon - Development Utilities\n');
    console.log('Usage: node dev-utils.js <command>\n');
    console.log('Available commands:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(12)} ${desc}`);
    });
    console.log('\nExamples:');
    console.log('  node dev-utils.js convert      # Convert files to modules');
    console.log('  node dev-utils.js validate     # Check module syntax');
    console.log('  node dev-utils.js serve        # Start dev server');
}

function convertToModule(filePath) {
    console.log(`Converting ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Convert class declarations to exports
    content = content.replace(/^class (\w+)/gm, (match, className) => {
        modified = true;
        return `export class ${className}`;
    });
    
    // Convert function declarations to exports
    content = content.replace(/^function (\w+)/gm, (match, funcName) => {
        modified = true;
        return `export function ${funcName}`;
    });
    
    // Convert const/let declarations to exports (simple heuristic)
    content = content.replace(/^const (\w+) = /gm, (match, varName) => {
        if (varName.charAt(0).toUpperCase() === varName.charAt(0)) {
            modified = true;
            return `export const ${varName} = `;
        }
        return match;
    });
    
    if (modified) {
        // Create backup
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
        
        // Write converted content
        const newPath = filePath.replace('.js', '.mjs');
        fs.writeFileSync(newPath, content);
        
        console.log(`✅ Converted ${filePath} → ${newPath} (backup: ${backupPath})`);
        return newPath;
    } else {
        console.log(`⚠️  No exports found in ${filePath}`);
        return null;
    }
}

function convertCommand() {
    console.log('🔄 Converting JavaScript files to ES6 modules...\n');
    
    const srcDir = './src';
    const filesToConvert = [];
    
    // Find all .js files recursively
    function findJSFiles(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                findJSFiles(fullPath);
            } else if (file.endsWith('.js') && !file.endsWith('.backup.js')) {
                filesToConvert.push(fullPath);
            }
        });
    }
    
    if (fs.existsSync(srcDir)) {
        findJSFiles(srcDir);
        
        console.log(`Found ${filesToConvert.length} JavaScript files to convert:\n`);
        filesToConvert.forEach(file => console.log(`  ${file}`));
        console.log('');
        
        const converted = [];
        filesToConvert.forEach(file => {
            const result = convertToModule(file);
            if (result) converted.push(result);
        });
        
        console.log(`\n✅ Converted ${converted.length} files to ES6 modules`);
        
        if (converted.length > 0) {
            console.log('\nNext steps:');
            console.log('1. Update index.html to use index-modules.html');
            console.log('2. Add import statements between modules');
            console.log('3. Test in browser with ES6 module support');
        }
    } else {
        console.log('❌ src/ directory not found');
    }
}

function validateCommand() {
    console.log('🔍 Validating ES6 module syntax...\n');
    
    const mjsFiles = [];
    
    function findMJSFiles(dir) {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                findMJSFiles(fullPath);
            } else if (file.endsWith('.mjs')) {
                mjsFiles.push(fullPath);
            }
        });
    }
    
    findMJSFiles('./src');
    
    console.log(`Found ${mjsFiles.length} module files:\n`);
    
    mjsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const hasExport = /^export\s+/m.test(content);
        const hasImport = /^import\s+/m.test(content);
        
        console.log(`📄 ${file}`);
        console.log(`   Exports: ${hasExport ? '✅' : '❌'}`);
        console.log(`   Imports: ${hasImport ? '✅' : '⚠️  (none)'}`);
        console.log('');
    });
}

function serveCommand() {
    console.log('🌐 Starting development server...\n');
    
    // Try different server options
    const { spawn } = require('child_process');
    
    const serverOptions = [
        { cmd: 'python', args: ['-m', 'http.server', '8000'], name: 'Python 3' },
        { cmd: 'python3', args: ['-m', 'http.server', '8000'], name: 'Python 3 (explicit)' },
        { cmd: 'npx', args: ['http-server', '-p', '8000'], name: 'Node.js http-server' }
    ];
    
    function tryNextServer(index = 0) {
        if (index >= serverOptions.length) {
            console.log('❌ No suitable server found. Install Python 3 or Node.js');
            return;
        }
        
        const option = serverOptions[index];
        console.log(`Trying ${option.name}...`);
        
        const server = spawn(option.cmd, option.args, { stdio: 'inherit' });
        
        server.on('error', (err) => {
            console.log(`Failed to start ${option.name}`);
            tryNextServer(index + 1);
        });
        
        server.on('spawn', () => {
            console.log(`✅ Server started with ${option.name}`);
            console.log('🌐 Open http://localhost:8000 in your browser');
            console.log('📱 Test ES6 modules: http://localhost:8000/index-modules.html');
            console.log('🔧 Legacy version: http://localhost:8000/index.html');
        });
    }
    
    tryNextServer();
}

// Main command processor
const command = process.argv[2];

switch (command) {
    case 'convert':
        convertCommand();
        break;
    case 'validate':
        validateCommand();
        break;
    case 'serve':
        serveCommand();
        break;
    case 'help':
    case undefined:
        showHelp();
        break;
    default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
}

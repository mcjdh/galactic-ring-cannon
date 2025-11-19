const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(PROJECT_ROOT, 'tests');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

function findTestFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                findTestFiles(filePath, fileList);
            }
        } else {
            if (file.endsWith('.test.js')) {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

async function runTest(filePath) {
    return new Promise((resolve, reject) => {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        console.log(`${colors.blue}Running ${relativePath}...${colors.reset}`);

        const child = spawn('node', [filePath], {
            stdio: 'inherit',
            cwd: PROJECT_ROOT,
            env: { ...process.env, NODE_ENV: 'test' }
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ file: relativePath, status: 'passed' });
            } else {
                resolve({ file: relativePath, status: 'failed', code });
            }
        });

        child.on('error', (err) => {
            resolve({ file: relativePath, status: 'error', error: err });
        });
    });
}

async function main() {
    console.log(`${colors.bold}Discovering tests...${colors.reset}`);

    const testFiles = [
        ...findTestFiles(TESTS_DIR),
        ...findTestFiles(SRC_DIR)
    ];

    console.log(`Found ${testFiles.length} test files.\n`);

    const results = {
        passed: 0,
        failed: 0,
        errors: 0,
        details: []
    };

    const startTime = Date.now();

    for (const file of testFiles) {
        const result = await runTest(file);
        results.details.push(result);

        if (result.status === 'passed') {
            results.passed++;
        } else if (result.status === 'failed') {
            results.failed++;
            console.log(`${colors.red}✖ ${result.file} failed with exit code ${result.code}${colors.reset}\n`);
        } else {
            results.errors++;
            console.log(`${colors.red}✖ ${result.file} error: ${result.error}${colors.reset}\n`);
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n${colors.bold}Test Summary:${colors.reset}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Total: ${testFiles.length}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);

    if (results.failed > 0) {
        console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    }
    if (results.errors > 0) {
        console.log(`${colors.red}Errors: ${results.errors}${colors.reset}`);
    }

    if (results.failed > 0 || results.errors > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

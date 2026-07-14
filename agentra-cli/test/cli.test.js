import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.join(__dirname, '..');

console.log('=== Running Agentra CLI Automated Tests ===\n');

function runTest(name, command, cwd = cliRoot) {
  console.log(`[TEST] ${name}...`);
  try {
    const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    console.log(`  ✔ Passed!`);
    return { success: true, output };
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`);
    if (err.stderr) console.error(`  Stderr: ${err.stderr}`);
    return { success: false, error: err };
  }
}

const results = [];

// 1. Verify build
results.push(runTest('NPM Compile Build', 'npm run build'));

// 2. Verify help option
results.push(runTest('CLI Help Menu Output', 'node bin/agentra.js --help'));

// 3. Verify version output
results.push(runTest('CLI Version Command', 'node bin/agentra.js version'));

// 4. Verify doctor output
results.push(runTest('CLI Doctor Diagnostic Check', 'node bin/agentra.js doctor'));

const allPassed = results.every(r => r.success);
if (allPassed) {
  console.log('\n✔ All automated verification checks passed successfully!\n');
  process.exit(0);
} else {
  console.error('\n❌ Automated checks completed with errors.\n');
  process.exit(1);
}

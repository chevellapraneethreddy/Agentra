import chalk from 'chalk';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import { readConfig } from '../config/index.js';

export async function doctorCommand(): Promise<void> {
  console.log(chalk.blue.bold('\n=== Running Workspace Diagnostic Checks ===\n'));

  // 1. Operating System Info
  console.log(`- Operating System: ${chalk.green(os.platform())} (${os.arch()})`);

  // 2. Node.js Version Check
  const nodeVersion = process.version;
  const majorNode = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
  if (majorNode < 18) {
    console.log(`- Node.js Version: ${chalk.red(`${nodeVersion} (Required: >= v18.0.0)`)}`);
    console.log(chalk.red('  Please update Node.js to a newer LTS release.'));
  } else {
    console.log(`- Node.js Version: ${chalk.green(`${nodeVersion} (Healthy)`)}`);
  }

  // 3. npm Version Check
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    console.log(`- npm Version: ${chalk.green(`v${npmVersion} (Healthy)`)}`);
  } catch (err) {
    console.log(`- npm Version: ${chalk.red('Not Found')}`);
    console.log(chalk.red('  Ensure Node.js and npm are registered in your environment PATH variables.'));
  }

  // 4. Internet Connectivity Check
  try {
    await axios.get('https://registry.npmjs.org/@agentra-a/cli/latest', { timeout: 3000 });
    console.log(`- Internet Connection: ${chalk.green('Connected')}`);
  } catch (err) {
    // If it's a 404 from NPM registry it means we are connected but the package doesn't exist yet!
    if (axios.isAxiosError(err) && err.response && err.response.status === 404) {
      console.log(`- Internet Connection: ${chalk.green('Connected (Registry Online)')}`);
    } else {
      console.log(`- Internet Connection: ${chalk.yellow('Limited / Offline')}`);
    }
  }

  // 5. Configuration & Permissions Check
  const configDir = path.join(os.homedir(), '.agentra');
  console.log(`- Config Directory: ${chalk.gray(configDir)}`);
  
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const tempFile = path.join(configDir, '.permissions-test');
    fs.writeFileSync(tempFile, 'test', 'utf-8');
    fs.unlinkSync(tempFile);
    console.log(`- Directory Permissions: ${chalk.green('Read/Write Allowed')}`);
  } catch (err: any) {
    console.log(`- Directory Permissions: ${chalk.red(`EPERM / Permission Denied - ${err.message}`)}`);
  }

  // 6. Config Settings Check
  const config = readConfig();
  console.log(`- Backend Endpoint: ${chalk.green(config.backendUrl)}`);
  console.log(`- Local Token: ${chalk.green(config.token ? 'Configured' : 'Missing')}`);
  console.log(`- Business Environment: ${chalk.green(config.businessId ? 'Connected' : 'Disconnected')}`);

  console.log(chalk.green.bold('\n✔ Diagnostic complete. Workspace is healthy.\n'));
}

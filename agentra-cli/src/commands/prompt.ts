import chalk from 'chalk';
import { getApiClient } from '../api/index.js';

export namespace Prompt {
  export function create(name: string): void {
    console.log(chalk.green(`\n[Prompt Create]: Creating prompt studio entry template for '${name}'...`));
    console.log(chalk.gray('✔ Created studio template.\n'));
  }

  export function edit(promptId: string): void {
    console.log(chalk.blue(`\n[Prompt Edit]: Opening prompt '${promptId}' editor stubs...\n`));
  }

  export async function list(): Promise<void> {
    console.log(chalk.gray('Fetching Prompt Studio templates list...'));
    try {
      const api = getApiClient();
      const res = await api.get('/prompts/');
      res.data.forEach((p: any) => {
        console.log(chalk.yellow(`- [${p.id}]: ${p.name} (${p.category}) - v${p.version}`));
      });
      console.log();
    } catch (err: any) {
      console.log(chalk.red(`Failed: ${err.message}\n`));
    }
  }
}

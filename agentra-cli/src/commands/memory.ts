import chalk from 'chalk';
import { getApiClient } from '../api/index.js';

export namespace Memory {
  export async function search(query: string): Promise<void> {
    console.log(chalk.blue(`\n[Memory Search]: Querying persistent memory database context: "${query}"...`));
    try {
      const api = getApiClient();
      const response = await api.get('/memory/');
      console.log(chalk.gray(`Results found: ${response.data.length} memories.`));
      response.data.forEach((m: any) => {
        console.log(chalk.yellow(`- [${m.id}]: ${m.message || JSON.stringify(m)}`));
      });
      console.log();
    } catch (err: any) {
      console.log(chalk.red(`Failed: ${err.message}\n`));
    }
  }
}

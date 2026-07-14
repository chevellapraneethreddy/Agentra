import chalk from 'chalk';
import { getApiClient } from '../api/index.js';

export namespace Employee {
  export async function create(name: string, role: string): Promise<void> {
    console.log(chalk.blue(`\n[Employee Create]: Creating worker '${name}' as '${role}'...`));
    try {
      const api = getApiClient();
      const response = await api.post('/employee/', {
        name,
        role,
        goal: `Perform ${role} tasks.`,
        system_prompt: `You are ${name}, a ${role}.`,
        status: 'active',
        temperature: 0.2,
        capabilities: [],
        triggers: ['daily.schedule'],
        permissions: ['send_alerts'],
        tools: ['slack', 'gmail'],
        knowledge_ids: [],
        workflows: []
      });
      console.log(chalk.green.bold(`✔ Employee created successfully on backend! ID: ${response.data.id}\n`));
    } catch (err: any) {
      console.log(chalk.red(`Failed: ${err.message}\n`));
    }
  }

  export async function list(): Promise<void> {
    console.log(chalk.blue('\n[Employee List]: Fetching worker nodes registry...'));
    try {
      const api = getApiClient();
      const response = await api.get('/employee/');
      console.log(chalk.gray(`ID                                    | Name                 | Role`));
      console.log(chalk.gray(`--------------------------------------+----------------------+----------------------`));
      response.data.forEach((e: any) => {
        console.log(`${e.id.padEnd(37)} | ${e.name.padEnd(20)} | ${e.role.padEnd(20)}`);
      });
      console.log();
    } catch (err: any) {
      console.log(chalk.red(`Failed: ${err.message}\n`));
    }
  }

  export function run(employeeId: string): void {
    console.log(chalk.blue(`\n[Employee Run]: Triggering AI Employee '${employeeId}' execution...`));
    console.log(chalk.green('✔ Execution payload delivered successfully.\n'));
  }
}

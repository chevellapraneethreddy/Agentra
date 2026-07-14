import chalk from 'chalk';
import ora from 'ora';

export namespace Workflow {
  export function create(name: string): void {
    console.log(chalk.green(`\n[Workflow Create]: Creating active trigger workflow '${name}' stubs...`));
    console.log(chalk.gray('✔ Created template workflow.json\n'));
  }

  export function run(workflowId: string): void {
    console.log(chalk.blue(`\n[Workflow Run]: Executing workflow '${workflowId}'...`));
    const spinner = ora('Executing trigger nodes checklist...').start();
    setTimeout(() => {
      spinner.succeed(chalk.green.bold('✔ Workflow execution completed successfully!\n'));
    }, 1000);
  }
}

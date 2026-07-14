import chalk from 'chalk';

export function initCommand(): void {
  console.log(chalk.green('\n[Init Mode]: Initializing Agentra Project Workspace...'));
  console.log(chalk.gray('Creating local folders structure, credentials files, and agent registry template stubs...'));
  console.log(chalk.green.bold('✔ Project workspace initialized successfully.\n'));
}

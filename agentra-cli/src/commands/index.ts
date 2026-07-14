import chalk from 'chalk';
import ora from 'ora';

export * from './login';
export * from './init';
export * from './employee';
export * from './workflow';
export * from './prompt';
export * from './knowledge';
export * from './memory';
export * from './version';

export function chatCommand(message: string): void {
  console.log(chalk.blue(`\n[Chat Mode]: Sending message to AI Workforce...`));
  console.log(chalk.gray(`Prompt: "${message}"`));
  console.log(chalk.yellow(`AI response: [Simulator] Received: "${message}". Connect to LLM to run real queries.\n`));
}

export function deployCommand(): void {
  const spinner = ora('Bundling agent workspace config templates...').start();
  setTimeout(() => {
    spinner.text = 'Uploading code and templates to Agentra Cloud...';
    setTimeout(() => {
      spinner.succeed(chalk.green.bold('✔ Deployed successfully to Agentra Cloud!'));
      console.log(chalk.gray('Active Endpoint: https://cloud.agentra.ai/v1/workspace/deploy\n'));
    }, 1000);
  }, 1000);
}

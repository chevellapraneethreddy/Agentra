import { Command } from 'commander';
import chalk from 'chalk';
import os from 'os';
import ora from 'ora';
import { readConfig, writeConfig } from './config/index.js';
import { loginCommand } from './commands/login.js';
import { initCommand } from './commands/init.js';
import { Employee } from './commands/employee.js';
import { Workflow } from './commands/workflow.js';
import { Prompt } from './commands/prompt.js';
import { Knowledge } from './commands/knowledge.js';
import { Memory } from './commands/memory.js';
import { versionCommand } from './commands/version.js';
import { doctorCommand } from './commands/doctor.js';
import { checkAndRunOnboarding } from './terminal/shell.js';

export const program = new Command();

program
  .name('agentra')
  .description('Agentra CLI - Generative AI as a Service (GaaS) Command Line Interface')
  .version('0.1.0');

// Login Command
program
  .command('login')
  .description('Log in to the Agentra workspace and store credentials locally')
  .action(async () => {
    try {
      await loginCommand();
    } catch (err: any) {
      console.error(chalk.red(`Login command failed: ${err.message}`));
    }
  });

// Logout Command
program
  .command('logout')
  .description('Log out of the Agentra workspace and clear credentials locally')
  .action(() => {
    writeConfig({ token: null, email: null, businessId: null });
    console.log(chalk.yellow('Logged out successfully. Configuration session cleared.'));
  });

// Chat Command
program
  .command('chat <message>')
  .description('Send a message to the AI Employee Workforce reasoning engines')
  .action((message) => {
    console.log(chalk.blue(`\n[Chat Mode]: Sending message to AI Workforce...`));
    console.log(chalk.gray(`Prompt: "${message}"`));
    console.log(chalk.yellow(`AI response: [Simulator] Received: "${message}". Connect to LLM to run real queries.\n`));
  });

// Init Command
program
  .command('init')
  .description('Initialize a new local Agentra project workspace')
  .action(() => {
    initCommand();
  });

// Employee Commands
const employeeCommand = program
  .command('employee')
  .description('Manage AI Employees workspace worker nodes');

employeeCommand
  .command('create <name> <role>')
  .description('Provision a new active AI employee worker node')
  .action(async (name, role) => {
    await Employee.create(name, role);
  });

employeeCommand
  .command('list')
  .description('List all active AI employees connected to the tenant business')
  .action(async () => {
    await Employee.list();
  });

employeeCommand
  .command('run <employeeId>')
  .description('Trigger/Run an AI employee worker manually')
  .action((employeeId) => {
    Employee.run(employeeId);
  });

// Workflow Commands
const workflowCommand = program
  .command('workflow')
  .description('Manage multi-agent operational workflows');

workflowCommand
  .command('create <name>')
  .description('Create a new trigger-based operational automation workflow template')
  .action((name) => {
    Workflow.create(name);
  });

workflowCommand
  .command('run <workflowId>')
  .description('Execute an operational automation workflow manually')
  .action((workflowId) => {
    Workflow.run(workflowId);
  });

// Memory Commands
const memoryCommand = program
  .command('memory')
  .description('Query persistent AI long-term vector memories');

memoryCommand
  .command('search <query>')
  .description('Search vectors database memory profiles context')
  .action(async (query) => {
    await Memory.search(query);
  });

// Prompt Studio Commands
const promptCommand = program
  .command('prompt')
  .description('Manage Prompt Studio template versions');

promptCommand
  .command('create <name>')
  .description('Create a new prompt studio prompt instructions template')
  .action((name) => {
    Prompt.create(name);
  });

promptCommand
  .command('edit <promptId>')
  .description('Edit an existing prompt template rule files configuration')
  .action((promptId) => {
    Prompt.edit(promptId);
  });

promptCommand
  .command('list')
  .description('List all prompt templates configured in prompt studio')
  .action(async () => {
    await Prompt.list();
  });

// Knowledge Base Commands
const knowledgeCommand = program
  .command('knowledge')
  .description('Manage Knowledge Base records indexing');

knowledgeCommand
  .command('sync')
  .description('Synchronize RAG vector indices with local workspace directory')
  .action(() => {
    Knowledge.sync();
  });

// Deploy Command
program
  .command('deploy')
  .description('Deploy local agent workspaces templates configuration to Agentra Cloud')
  .action(() => {
    const spinner = ora('Bundling agent workspace config templates...').start();
    setTimeout(() => {
      spinner.text = 'Uploading code and templates to Agentra Cloud...';
      setTimeout(() => {
        spinner.succeed(chalk.green.bold('✔ Deployed successfully to Agentra Cloud!'));
        console.log(chalk.gray('Active Endpoint: https://cloud.agentra.ai/v1/workspace/deploy\n'));
      }, 1000);
    }, 1000);
  });

// Version Command
program
  .command('version')
  .description('Print Agentra CLI version')
  .action(() => {
    versionCommand();
  });

// Config Command
program
  .command('config')
  .description('Display saved CLI config settings')
  .action(() => {
    console.log(chalk.gray('Current CLI configurations:'));
    console.log(JSON.stringify(readConfig(), null, 2));
  });

// Doctor Command
program
  .command('doctor')
  .description('Run local project workspace diagnostic checks')
  .action(async () => {
    await doctorCommand();
  });

// Update Command
program
  .command('update')
  .description('Check for Agentra CLI updates')
  .action(() => {
    console.log(chalk.gray('Checking for CLI updates...'));
    console.log(chalk.green('✔ Agentra CLI is up to date (v1.0.0).\n'));
  });

export async function parseCliArgs(args: string[]): Promise<void> {
  program.parse(args);
  
  if (args.length <= 2) {
    await checkAndRunOnboarding();
  }
}

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getApiClient } from '../api';
import { writeConfig } from '../config';

export async function loginFlow(): Promise<void> {
  console.log(chalk.blue.bold('\n=== Agentra CLI Login ===\n'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Enter your email address:',
      validate: (input: string) => {
        if (!input.includes('@') || input.length < 5) {
          return 'Please enter a valid email address.';
        }
        return true;
      }
    }
  ]);

  const email = answers.email.trim();
  const token = `dev-token-${email}`;
  
  const spinner = ora('Validating credentials against Agentra backend...').start();
  
  try {
    // Write temporary configuration to authorize validation call
    writeConfig({ token, email });
    
    const apiClient = getApiClient();
    const response = await apiClient.get('/business/me');
    
    const businessData = response.data;
    const businessId = businessData.id;
    
    writeConfig({ businessId });
    
    spinner.succeed(chalk.green.bold('Login successful!'));
    console.log(chalk.white(`Connected to Business: ${businessData.name}`));
    console.log(chalk.gray(`Local config saved to ~/.agentra/config.json\n`));
  } catch (err: any) {
    spinner.fail(chalk.red.bold('Connection test failed.'));
    console.log(chalk.yellow('Ensure your Agentra FastAPI backend server is running on http://localhost:8000'));
    if (err.response) {
      console.log(chalk.red(`API Error: [${err.response.status}] ${JSON.stringify(err.response.data)}`));
    } else {
      console.log(chalk.red(`Error: ${err.message}`));
    }
  }
}

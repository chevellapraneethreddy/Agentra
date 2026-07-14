import { loginFlow } from '../auth/index.js';

export async function loginCommand(): Promise<void> {
  await loginFlow();
}

import { loginFlow } from '../auth';

export async function loginCommand(): Promise<void> {
  await loginFlow();
}

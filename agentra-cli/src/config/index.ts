import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CliConfig {
  backendUrl: string;
  token?: string | null;
  email?: string | null;
  businessId?: string | null;
  provider?: string | null;
}

const CONFIG_DIR = path.join(os.homedir(), '.agentra');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: CliConfig = {
  backendUrl: 'http://localhost:8000/api/v1'
};

export function readConfig(): CliConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    return DEFAULT_CONFIG;
  }
}

export function writeConfig(config: Partial<CliConfig>): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const current = readConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write configurations to local path:', err);
  }
}

export function clearConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (err) {
    console.error('Failed clearing local configurations:', err);
  }
}

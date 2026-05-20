import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/server/.env'),
  resolve(process.cwd(), 'src/.env'),
  resolve(currentDir, '../../.env'),
  resolve(currentDir, '../.env'),
];

let loaded = false;

export function loadEnv() {
  if (loaded) return;
  loaded = true;

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;

    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

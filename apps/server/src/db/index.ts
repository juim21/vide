import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { resolve } from 'path';
import { mkdirSync } from 'fs';

const dataDir = resolve(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(resolve(dataDir, 'vide.db'));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };

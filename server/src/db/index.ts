import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schemas/index.js';

// Deferred factory only. The Phase 1 app does not import or call it.
// Future services should create one shared pool with the validated DATABASE_URL.
export function createDatabase(connectionString: string) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('A PostgreSQL connection URL is required.');
  }
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

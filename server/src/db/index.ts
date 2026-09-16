import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schemas/index.js';

export type Database = NodePgDatabase<typeof schema>;
// One pool per application; transactions can be injected into tests.
export function createDatabase(connectionString: string) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('A PostgreSQL connection URL is required.');
  }
  const pool = new Pool({
    // Explicit certificate verification preserves current pg security semantics.
    connectionString: (() => {
      if (['require', 'prefer', 'verify-ca'].includes(url.searchParams.get('sslmode') ?? '')) {
        url.searchParams.set('sslmode', 'verify-full');
      }
      return url.toString();
    })(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', () => console.error('Idle database connection failed. Details suppressed.'));
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

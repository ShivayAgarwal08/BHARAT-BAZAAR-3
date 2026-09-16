import { randomBytes, randomUUID } from 'node:crypto';
import type { Database } from '../src/db/index.js';
import { createDatabase } from '../src/db/index.js';
import { env } from '../src/config/env.js';
import { parseEnvironment } from '../src/config/env-schema.js';
export const testConfig = parseEnvironment({
  NODE_ENV: 'test',
  CLIENT_URL: 'http://127.0.0.1:5175',
  JWT_SECRET: randomBytes(48).toString('hex'),
  JWT_EXPIRES_IN: '1h',
});
export function credentials() {
  return {
    fullName: 'Phase2 Test ' + randomUUID().slice(0, 8),
    email: 'bb-test-' + randomUUID() + '@example.test',
    phone:
      '+91' + String((BigInt('0x' + randomBytes(6).toString('hex')) % 9000000000n) + 1000000000n),
    password: randomBytes(24).toString('hex') + 'Aa1',
    preferredLanguage: 'EN' as const,
  };
}
// All test writes live in one outer transaction, including nested service savepoints.
// The transaction is ALWAYS rolled back, on success, failure, or graceful shutdown.
export async function withTestDatabase(work: (db: Database) => Promise<void>) {
  if (!env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for isolated integration tests.');
  const database = createDatabase(env.DATABASE_URL);
  const rollback = new Error('TEST_ROLLBACK');
  try {
    await database.db.transaction(async (tx) => {
      await work(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await database.close();
  }
}

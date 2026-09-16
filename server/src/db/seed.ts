import { env } from '../config/env.js';
import { createDatabase } from './index.js';
import { seedDatabase } from './seed-service.js';

async function run() {
  if (!env.DATABASE_URL) throw new Error('Database configuration missing');
  const database = createDatabase(env.DATABASE_URL);
  try {
    const result = await seedDatabase(database.db, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
    console.info('Skills seeded idempotently. Admin: ' + result + '.');
  } finally {
    await database.close();
  }
}
run().catch(() => {
  console.error(
    'Seed failed. Check database migration and optional admin configuration. Details suppressed.',
  );
  process.exitCode = 1;
});

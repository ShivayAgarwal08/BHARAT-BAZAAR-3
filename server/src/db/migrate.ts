import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../config/env.js';
import { createDatabase } from './index.js';

async function run() {
  if (!env.DATABASE_URL_UNPOOLED) throw new Error('Migration connection missing');
  const database = createDatabase(env.DATABASE_URL_UNPOOLED);
  try {
    await migrate(database.db, {
      migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
    });
    console.info('Migrations applied successfully.');
  } finally {
    await database.close();
  }
}
run().catch(() => {
  console.error(
    'Migration failed. Check the reviewed SQL, database configuration and connectivity. Details suppressed.',
  );
  process.exitCode = 1;
});

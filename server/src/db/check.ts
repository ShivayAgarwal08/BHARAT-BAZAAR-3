import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { createDatabase } from './index.js';

// Only safe summaries leave this command. Driver errors can contain connection details.
async function check() {
  for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED'] as const) {
    const connection = env[key];
    if (!connection) throw new Error('Missing database configuration');
    const database = createDatabase(connection);
    try {
      await database.db.execute(sql`select 1`);
      const tables = await database.db.execute(sql`
        select count(*)::int as count from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
      `);
      console.info(`${key}: connected; public table count: ${tables.rows[0]?.count}`);
    } finally {
      await database.close();
    }
  }
}
check().catch(() => {
  console.error(
    'Database check failed. Check environment, network access and SSL settings. Details suppressed.',
  );
  process.exitCode = 1;
});

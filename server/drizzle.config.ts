import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env.js';

// Guard both commands. Phase 1 must never generate/apply migrations by accident.
if (!env.DATABASE_URL || !env.DATABASE_URL_UNPOOLED) {
  throw new Error(
    'Database tooling is unavailable. Set DATABASE_URL and DATABASE_URL_UNPOOLED in server/.env during Phase 2.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schemas/index.ts',
  out: './drizzle',
  dbCredentials: { url: env.DATABASE_URL_UNPOOLED },
  strict: true,
  verbose: false,
});

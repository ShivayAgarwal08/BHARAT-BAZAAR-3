import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env.js';

// Application traffic uses the pooled URL; migration tooling uses only the direct URL.
if (!env.DATABASE_URL || !env.DATABASE_URL_UNPOOLED) {
  throw new Error('Set DATABASE_URL and DATABASE_URL_UNPOOLED in root .env or server/.env.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schemas/index.ts',
  out: './drizzle',
  dbCredentials: { url: env.DATABASE_URL_UNPOOLED },
  strict: true,
  verbose: false,
});

import { createApp } from './app.js';
import { env } from './config/env.js';
import { createDatabase } from './db/index.js';
import { authSecret } from './services/auth-service.js';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required. Check the environment example.');
authSecret(env);
const database = createDatabase(env.DATABASE_URL);

const server = createApp(env, database.db).listen(env.PORT, () => {
  console.info(`Bharat Bazaar API: http://localhost:${env.PORT}/api/health`);
  console.info('Phase 3: managed free-trial workflow enabled.');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(
    `Server could not start (${error.code ?? 'UNKNOWN'}). Check PORT and local permissions.`,
  );
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => {
    void database.close().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

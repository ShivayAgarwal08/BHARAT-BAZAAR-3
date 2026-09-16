import { createApp } from './app.js';
import { env } from './config/env.js';

const server = createApp(env).listen(env.PORT, () => {
  console.info(`Bharat Bazaar API: http://localhost:${env.PORT}/api/health`);
  console.info('Phase 1: authentication and database operations are not enabled.');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(
    `Server could not start (${error.code ?? 'UNKNOWN'}). Check PORT and local permissions.`,
  );
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

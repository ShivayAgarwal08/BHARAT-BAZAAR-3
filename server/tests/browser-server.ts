import express from 'express';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { users } from '../src/schemas/index.js';
import { login } from '../src/services/auth-service.js';
import { credentials, testConfig, withTestDatabase } from './test-database.js';

// This localhost-only fixture server is excluded from production builds.
// It never commits. Even abrupt process exit closes the connection and rolls back.
withTestDatabase(async (db) => {
  const admin = credentials();
  await db.insert(users).values({
    email: admin.email,
    passwordHash: await bcrypt.hash(admin.password, 12),
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
  });
  const wrapper = express();
  // All fixture requests share one rollback transaction; serialize them to prevent
  // overlapping savepoints. The production app uses a real pool and has no such queue.
  let previous = Promise.resolve();
  wrapper.use(async (_request, response, next) => {
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const waiting = previous;
    previous = current;
    await waiting;
    if (response.destroyed) {
      release();
      return;
    }
    response.once('finish', release);
    response.once('close', release);
    next();
  });
  wrapper.get('/__test__/admin-session', async (_request, response) => {
    response
      .set('Cache-Control', 'no-store')
      .json(await login(db, testConfig, admin.email, admin.password));
  });
  wrapper.use(createApp(testConfig, db));
  await new Promise<void>((resolve, reject) => {
    const server = wrapper.listen(5101, '127.0.0.1', () =>
      console.info('Rollback-only browser fixture API ready on port 5101.'),
    );
    server.once('error', reject);
    const stop = () => {
      server.close(() => resolve());
      server.closeAllConnections();
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
  });
}).catch(() => {
  console.error('Browser fixture server failed. Database details suppressed.');
  process.exitCode = 1;
});

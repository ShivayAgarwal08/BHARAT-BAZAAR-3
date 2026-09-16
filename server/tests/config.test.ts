import assert from 'node:assert/strict';
import { test } from 'node:test';
import { envSchema, parseEnvironment } from '../src/config/env-schema.js';
import { createDatabase } from '../src/db/index.js';

test('Phase 1 starts with safe local defaults and no secrets', () => {
  const env = parseEnvironment({});
  assert.equal(env.PORT, 5000);
  assert.equal(env.CLIENT_URL, 'http://localhost:5173');
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.JWT_SECRET, undefined);
});

test('blank optional example values are accepted', () => {
  const env = parseEnvironment({ DATABASE_URL: '', DATABASE_URL_UNPOOLED: '', JWT_SECRET: '' });
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.DATABASE_URL_UNPOOLED, undefined);
  assert.equal(env.JWT_SECRET, undefined);
});

test('invalid environment values fail without leaking their contents', () => {
  for (const values of [
    { PORT: '0' },
    { PORT: 'not-a-port' },
    { NODE_ENV: 'invalid' },
    { CLIENT_URL: 'https://example.com/path' },
    { CLIENT_URL: 'https://example.com/' },
    { DATABASE_URL: 'https://example.com' },
    { JWT_SECRET: 'do-not-echo' },
    { JWT_EXPIRES_IN: 'forever' },
  ]) {
    assert.equal(envSchema.safeParse(values).success, false);
  }
  assert.throws(
    () => parseEnvironment({ JWT_SECRET: 'do-not-echo' }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes('JWT_SECRET') &&
      !error.message.includes('do-not-echo'),
  );
});

test('PostgreSQL URLs and explicit production config can be validated offline', () => {
  const result = envSchema.safeParse({
    NODE_ENV: 'production',
    PORT: '8080',
    CLIENT_URL: 'https://example.com',
    DATABASE_URL: 'postgresql://localhost/bharat_bazaar',
    DATABASE_URL_UNPOOLED: 'postgresql://localhost/bharat_bazaar',
  });
  assert.equal(result.success, true);
});

test('database factory is deferred and can be closed without querying', async () => {
  assert.throws(() => createDatabase('https://example.com'), /PostgreSQL/);
  const database = createDatabase('postgresql://localhost/bharat_bazaar');
  assert.ok(database.db);
  await database.close();
});

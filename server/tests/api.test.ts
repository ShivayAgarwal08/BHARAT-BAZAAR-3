import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env-schema.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { validateRequest } from '../src/middleware/validate-request.js';
import { paginationSchema } from '../src/validators/request.js';

const app = createApp(envSchema.parse({ NODE_ENV: 'test' }));

for (const path of ['/api/health', '/api/v1/health']) {
  test(`GET ${path} responds without a database`, async () => {
    const response = await request(app).get(path).expect(200).expect('Content-Type', /json/);
    assert.deepEqual(response.body, { success: true, message: 'Bharat Bazaar API is running' });
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-powered-by'], undefined);
  });
}

test('v1 root reports Phase 2 and rejects unexpected query parameters', async () => {
  const response = await request(app).get('/api/v1').expect(200);
  assert.equal(response.body.data.phase, 2);
  const invalid = await request(app).get('/api/v1?unknown=true').expect(400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
});

test('unknown API endpoints return a consistent JSON 404', async () => {
  const response = await request(app).get('/api/v1/not-a-route').expect(404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('health-only app has no auth routes and later-phase workflows remain absent', async () => {
  await request(app).post('/api/v1/auth/login').send({}).expect(404);
  await request(app).post('/api/v1/payments').send({}).expect(404);
});

test('CORS allows CLIENT_URL and rejects unrelated browser origins', async () => {
  const allowed = await request(app)
    .get('/api/health')
    .set('Origin', 'http://localhost:5173')
    .expect(200);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  const denied = await request(app)
    .get('/api/health')
    .set('Origin', 'https://unrelated.example')
    .expect(403);
  assert.equal(denied.body.error.code, 'ORIGIN_NOT_ALLOWED');
  assert.equal(denied.headers['access-control-allow-origin'], undefined);
});

test('CORS preflight supports JSON API requests', async () => {
  await request(app)
    .options('/api/v1')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST')
    .expect(204)
    .expect('Access-Control-Allow-Headers', /Content-Type/);
});

test('invalid JSON returns 400 without echoing the body', async () => {
  const response = await request(app)
    .post('/api/v1')
    .set('Content-Type', 'application/json')
    .send('{"private":"do-not-echo"')
    .expect(400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
  assert.ok(!JSON.stringify(response.body).includes('do-not-echo'));
});

test('oversized payloads return 413', async () => {
  const response = await request(app)
    .post('/api/v1')
    .send({ message: 'x'.repeat(110_000) })
    .expect(413);
  assert.equal(response.body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('request validation supplies parsed values and rejects invalid input', async () => {
  const validationApp = express();
  validationApp.use(express.json());
  const schema = z.object({
    body: z.object({ name: z.string().trim().min(1) }).strict(),
    params: z.object({}),
    query: paginationSchema,
  });
  validationApp.post('/example', validateRequest(schema), (_request, response) =>
    response.json(response.locals.validated),
  );
  validationApp.use(errorHandler);
  const response = await request(validationApp)
    .post('/example?page=2')
    .send({ name: '  Example  ' })
    .expect(200);
  assert.deepEqual(response.body.body, { name: 'Example' });
  assert.deepEqual(response.body.query, { page: 2, limit: 20 });
  const invalid = await request(validationApp)
    .post('/example?page=-1')
    .send({ name: '' })
    .expect(400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  assert.ok(invalid.body.error.details.some((item: { path: string }) => item.path === 'body.name'));
});

test('unexpected errors return a generic response without internal details', async () => {
  const failingApp = express();
  failingApp.get('/fail', () => {
    throw new Error('private-internal-detail');
  });
  failingApp.use(errorHandler);
  const response = await request(failingApp).get('/fail').expect(500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(response.body).includes('private-internal-detail'));
  assert.equal(response.body.stack, undefined);
});

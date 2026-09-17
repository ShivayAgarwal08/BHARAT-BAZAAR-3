import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { count, eq, sql } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { users, skills } from '../src/schemas/index.js';
import { seedDatabase } from '../src/db/seed-service.js';
import { credentials, testConfig, withTestDatabase } from './test-database.js';

test(
  'Phase 2 real PostgreSQL integration (all writes rolled back)',
  { timeout: 180000 },
  async (t) => {
    await withTestDatabase(async (db) => {
      const app = createApp(testConfig, db);
      const artisan = credentials(),
        student = credentials(),
        secondArtisan = credentials(),
        secondStudent = credentials(),
        admin = credentials();
      await db.insert(users).values({
        email: admin.email,
        passwordHash: await bcrypt.hash(admin.password, 12),
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      });
      let artisanToken = '',
        studentToken = '',
        artisan2Token = '',
        student2Token = '',
        adminToken = '',
        studentProfileId = '';
      const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
      await t.test(
        'artisan registration normalizes contacts and never returns a password hash',
        async () => {
          const result = await request(app)
            .post('/api/v1/auth/register/artisan')
            .send({ ...artisan, email: '  ' + artisan.email.toUpperCase() + ' ' })
            .expect(201);
          artisanToken = result.body.data.token;
          assert.equal(result.body.data.user.email, artisan.email);
          assert.equal(result.body.data.user.role, 'ARTISAN');
          assert.equal(result.body.data.user.onboardingCompleted, false);
          assert.ok(!JSON.stringify(result.body).includes('passwordHash'));
          assert.ok(!JSON.stringify(result.body).includes(artisan.password));
          const [stored] = await db
            .select({ hash: users.passwordHash })
            .from(users)
            .where(eq(users.email, artisan.email));
          assert.ok(stored && (await bcrypt.compare(artisan.password, stored.hash)));
          assert.notEqual(stored?.hash, artisan.password);
        },
      );
      await t.test('artisan phone-only registration is supported', async () => {
        const result = await request(app)
          .post('/api/v1/auth/register/artisan')
          .send({ ...secondArtisan, email: '' })
          .expect(201);
        artisan2Token = result.body.data.token;
        assert.equal(result.body.data.user.email, null);
      });
      await t.test('student registration creates a pending student profile', async () => {
        const result = await request(app)
          .post('/api/v1/auth/register/student')
          .send(student)
          .expect(201);
        studentToken = result.body.data.token;
        const profile = await request(app)
          .get('/api/v1/students/me')
          .set(auth(studentToken))
          .expect(200);
        studentProfileId = profile.body.data.id;
        assert.equal(profile.body.data.verificationStatus, 'PENDING');
        const second = await request(app)
          .post('/api/v1/auth/register/student')
          .send({ ...secondStudent, phone: '' })
          .expect(201);
        student2Token = second.body.data.token;
      });
      await t.test('duplicate email is rejected without leaking database details', async () => {
        const result = await request(app)
          .post('/api/v1/auth/register/student')
          .send({ ...credentials(), email: artisan.email.toUpperCase() })
          .expect(409);
        assert.equal(result.body.error.code, 'CONTACT_EXISTS');
        assert.ok(!JSON.stringify(result.body).includes('password_hash'));
      });
      await t.test('duplicate normalized phone is rejected', async () => {
        await request(app)
          .post('/api/v1/auth/register/artisan')
          .send({ ...credentials(), phone: artisan.phone.slice(3) })
          .expect(409);
      });
      await t.test(
        'contact and password validation reject incomplete or privileged registration',
        async () => {
          await request(app)
            .post('/api/v1/auth/register/artisan')
            .send({ ...credentials(), phone: '' })
            .expect(400);
          await request(app)
            .post('/api/v1/auth/register/student')
            .send({ ...credentials(), email: '' })
            .expect(400);
          await request(app)
            .post('/api/v1/auth/register/student')
            .send({ ...credentials(), password: 'weak' })
            .expect(400);
          await request(app)
            .post('/api/v1/auth/register/student')
            .send({ ...credentials(), password: 'अ'.repeat(30) + '1A' })
            .expect(400);
          await request(app)
            .post('/api/v1/auth/register/student')
            .send({ ...credentials(), role: 'ADMIN' })
            .expect(400);
        },
      );
      await t.test(
        'login succeeds with normalized email or phone; errors are generic',
        async () => {
          await request(app)
            .post('/api/v1/auth/login')
            .send({ identifier: student.email.toUpperCase(), password: student.password })
            .expect(200);
          await request(app)
            .post('/api/v1/auth/login')
            .send({ identifier: artisan.phone.slice(3), password: artisan.password })
            .expect(200);
          const wrong = await request(app)
            .post('/api/v1/auth/login')
            .send({ identifier: student.email, password: 'wrong-password1' })
            .expect(401);
          const missing = await request(app)
            .post('/api/v1/auth/login')
            .send({ identifier: credentials().email, password: 'wrong-password1' })
            .expect(401);
          assert.deepEqual(wrong.body, missing.body);
          adminToken = (
            await request(app)
              .post('/api/v1/auth/login')
              .send({ identifier: admin.email, password: admin.password })
              .expect(200)
          ).body.data.token;
        },
      );
      await t.test(
        'missing, malformed, expired and wrong-algorithm tokens are rejected',
        async () => {
          await request(app).get('/api/v1/auth/me').expect(401);
          await request(app).get('/api/v1/artisans/me').set(auth('invalid')).expect(401);
          const [row] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, artisan.email));
          for (const algorithm of ['HS256', 'HS384'] as const) {
            const token = jwt.sign({ ver: 0 }, testConfig.JWT_SECRET!, {
              subject: row!.id,
              issuer: 'bharat-bazaar-api',
              audience: 'bharat-bazaar-client',
              expiresIn: algorithm === 'HS256' ? -1 : 60,
              algorithm,
            });
            await request(app).get('/api/v1/auth/me').set(auth(token)).expect(401);
          }
        },
      );
      await t.test('backend rejects wrong-role access', async () => {
        await request(app).get('/api/v1/artisans/me').set(auth(studentToken)).expect(403);
        await request(app).get('/api/v1/students/me').set(auth(artisanToken)).expect(403);
        await request(app).get('/api/v1/admin/users').set(auth(artisanToken)).expect(403);
      });
      await t.test(
        'artisan profiles are owner-only; drafts persist and completion is validated',
        async () => {
          const other = (
            await request(app).get('/api/v1/artisans/me').set(auth(artisan2Token)).expect(200)
          ).body.data;
          await request(app)
            .put('/api/v1/artisans/me')
            .set(auth(artisanToken))
            .send({ userId: other.userId, businessName: 'Unauthorized' })
            .expect(400);
          await request(app)
            .put('/api/v1/artisans/' + other.id)
            .set(auth(artisanToken))
            .send({ businessName: 'Unauthorized' })
            .expect(404);
          await request(app)
            .put('/api/v1/artisans/me')
            .set(auth(artisanToken))
            .send({ businessName: 'Test Craft Studio' })
            .expect(200);
          await request(app)
            .put('/api/v1/artisans/me')
            .set(auth(artisanToken))
            .send({ onboardingCompleted: true })
            .expect(400);
          await request(app)
            .put('/api/v1/artisans/me')
            .set(auth(artisanToken))
            .send({
              businessName: 'Test Craft Studio',
              craftCategory: 'Pottery',
              city: 'Jaipur',
              state: 'Rajasthan',
              languages: ['Hindi'],
              onlinePresence: 'None yet',
              businessProblems: 'Product photographs',
              onboardingCompleted: true,
            })
            .expect(200);
          assert.equal(
            (await request(app).get('/api/v1/artisans/me').set(auth(artisan2Token))).body.data
              .businessName,
            null,
          );
        },
      );
      await t.test(
        'student profiles and skills are owner-only and require valid skill IDs',
        async () => {
          const other = (await request(app).get('/api/v1/students/me').set(auth(student2Token)))
            .body.data;
          await request(app)
            .put('/api/v1/students/me')
            .set(auth(studentToken))
            .send({ userId: other.userId, fullName: 'Unauthorized' })
            .expect(400);
          await request(app)
            .put('/api/v1/students/' + other.id)
            .set(auth(studentToken))
            .send({ fullName: 'Unauthorized' })
            .expect(404);
          await request(app)
            .put('/api/v1/students/me/skills')
            .set(auth(studentToken))
            .send({ skills: [{ skillId: other.id, proficiencyLevel: 'ADVANCED' }] })
            .expect(400);
          const available = (await request(app).get('/api/v1/skills').expect(200)).body.data;
          const selected = [{ skillId: available[0].id, proficiencyLevel: 'INTERMEDIATE' }];
          await request(app)
            .put('/api/v1/students/me/skills')
            .set(auth(studentToken))
            .send({ skills: [...selected, ...selected] })
            .expect(400);
          await request(app)
            .put('/api/v1/students/me/skills')
            .set(auth(studentToken))
            .send({ skills: selected })
            .expect(200);
          const result = await request(app)
            .put('/api/v1/students/me')
            .set(auth(studentToken))
            .send({
              college: 'Test College',
              course: 'Design',
              studyYear: 2,
              city: 'Jaipur',
              state: 'Rajasthan',
              languages: ['English', 'Hindi'],
              biography: 'I help create catalogues.',
              weeklyAvailabilityHours: 8,
              expectedMonthlyRate: 2000,
              onboardingCompleted: true,
            })
            .expect(200);
          assert.equal(result.body.data.verificationStatus, 'PENDING');
          const reloaded = await request(app)
            .get('/api/v1/students/me')
            .set(auth(studentToken))
            .expect(200);
          assert.equal(reloaded.body.data.onboardingCompleted, true);
          assert.equal(reloaded.body.data.verificationStatus, 'PENDING');
          assert.equal(
            (await request(app).get('/api/v1/students/me').set(auth(student2Token))).body.data
              .college,
            null,
          );
        },
      );
      await t.test('students cannot verify themselves or mass-assign review fields', async () => {
        await request(app)
          .post('/api/v1/admin/students/' + studentProfileId + '/verify')
          .set(auth(studentToken))
          .send({})
          .expect(403);
        await request(app)
          .put('/api/v1/students/me')
          .set(auth(studentToken))
          .send({ verificationStatus: 'VERIFIED' })
          .expect(400);
      });
      await t.test(
        'admin verification, filters, notes and stale-review protection work',
        async () => {
          const detail = (
            await request(app)
              .get('/api/v1/admin/students/' + studentProfileId)
              .set(auth(adminToken))
              .expect(200)
          ).body.data;
          assert.ok(detail.skills.length);
          const body = { expectedUpdatedAt: detail.profile.updatedAt };
          await request(app)
            .post('/api/v1/admin/students/' + studentProfileId + '/reject')
            .set(auth(adminToken))
            .send(body)
            .expect(400);
          const verified = await request(app)
            .post('/api/v1/admin/students/' + studentProfileId + '/verify')
            .set(auth(adminToken))
            .send(body)
            .expect(200);
          assert.equal(verified.body.data.profile.verificationStatus, 'VERIFIED');
          assert.equal(verified.body.data.user.accountStatus, 'ACTIVE');
          await request(app)
            .post('/api/v1/admin/students/' + studentProfileId + '/reject')
            .set(auth(adminToken))
            .send({ ...body, notes: 'Needs more detail' })
            .expect(409);
          const filtered = await request(app)
            .get('/api/v1/admin/students?verificationStatus=VERIFIED')
            .set(auth(adminToken))
            .expect(200);
          assert.ok(
            filtered.body.data.items.some(
              (item: { profile: { id: string } }) => item.profile.id === studentProfileId,
            ),
          );
          await request(app)
            .post('/api/v1/admin/students/' + studentProfileId + '/reject')
            .set(auth(adminToken))
            .send({
              expectedUpdatedAt: verified.body.data.profile.updatedAt,
              notes: 'Please expand your biography.',
            })
            .expect(200);
          const revised = await request(app)
            .put('/api/v1/students/me')
            .set(auth(studentToken))
            .send({ biography: 'I can photograph products and make catalogues.' })
            .expect(200);
          assert.equal(revised.body.data.verificationStatus, 'PENDING');
        },
      );
      await t.test(
        'public assistance submissions are stored; only admin can list or change them',
        async () => {
          const help = await request(app)
            .post('/api/v1/assisted-registrations')
            .send({
              name: artisan.fullName,
              phone: artisan.phone,
              preferredLanguage: 'HI',
              preferredCallTime: '4–6 pm IST',
              city: 'Jaipur',
              state: 'Rajasthan',
            })
            .expect(201);
          assert.deepEqual(Object.keys(help.body.data).sort(), ['id', 'status']);
          await request(app).get('/api/v1/admin/assisted-registrations').expect(401);
          await request(app)
            .get('/api/v1/admin/assisted-registrations')
            .set(auth(studentToken))
            .expect(403);
          await request(app)
            .patch('/api/v1/admin/assisted-registrations/' + help.body.data.id)
            .set(auth(artisanToken))
            .send({ status: 'COMPLETED' })
            .expect(403);
          const list = await request(app)
            .get('/api/v1/admin/assisted-registrations?status=PENDING')
            .set(auth(adminToken))
            .expect(200);
          const row = list.body.data.items.find(
            (item: { id: string }) => item.id === help.body.data.id,
          );
          const updated = await request(app)
            .patch('/api/v1/admin/assisted-registrations/' + row.id)
            .set(auth(adminToken))
            .send({ status: 'CONTACTED', expectedUpdatedAt: row.updatedAt })
            .expect(200);
          assert.equal(updated.body.data.status, 'CONTACTED');
          assert.ok(updated.body.data.assignedAdminId);
        },
      );
      await t.test('current-user, admin users and overview do not expose hashes', async () => {
        for (const endpoint of [
          '/api/v1/auth/me',
          '/api/v1/admin/users',
          '/api/v1/admin/overview',
          '/api/v1/admin/students',
        ]) {
          const result = await request(app).get(endpoint).set(auth(adminToken)).expect(200);
          assert.ok(!/passwordHash|password_hash|tokenVersion/.test(JSON.stringify(result.body)));
        }
      });
      await t.test(
        'logout revokes old tokens and cannot be bypassed by a restored browser token',
        async () => {
          await request(app)
            .post('/api/v1/auth/logout')
            .set(auth(artisanToken))
            .send({})
            .expect(200);
          await request(app).get('/api/v1/auth/me').set(auth(artisanToken)).expect(401);
        },
      );
      await t.test(
        'database constraints enforce contact presence and seed remains idempotent',
        async () => {
          await assert.rejects(
            db.transaction(async (tx) => {
              await tx
                .insert(users)
                .values({ role: 'ARTISAN', passwordHash: 'test-only-invalid-hash' });
            }),
          );
          const before = await db.select({ value: count() }).from(skills);
          await seedDatabase(db);
          await seedDatabase(db);
          assert.deepEqual(await db.select({ value: count() }).from(skills), before);
          await db.execute(sql`select 1`);
        },
      );
    });
  },
);

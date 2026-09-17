import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { login } from '../src/services/auth-service.js';
import {
  artisanProfiles,
  assignments,
  contracts,
  studentProfiles,
  users,
} from '../src/schemas/index.js';
import { credentials, testConfig, withTestDatabase } from './test-database.js';

test('Phase 4 authorization boundaries use rollback-only fixtures', async () => {
  await withTestDatabase(async (db) => {
    const app = createApp(testConfig, db);
    const values = [credentials(), credentials(), credentials(), credentials(), credentials()];
    const roles = ['ADMIN', 'ARTISAN', 'ARTISAN', 'STUDENT', 'STUDENT'] as const;
    const rows = [] as Array<{ id: string; email: string; password: string }>;
    for (let index = 0; index < roles.length; index++) {
      const item = values[index]!;
      const [user] = await db
        .insert(users)
        .values({
          email: item.email,
          passwordHash: await bcrypt.hash(item.password, 10),
          role: roles[index]!,
          accountStatus: 'ACTIVE',
        })
        .returning({ id: users.id });
      rows.push({ id: user!.id, email: item.email, password: item.password });
    }
    const [, artisanId, outsiderId, studentId] = rows;
    const [artisan] = await db
      .insert(artisanProfiles)
      .values({ userId: artisanId!.id, fullName: 'Artisan A' })
      .returning();
    await db
      .insert(artisanProfiles)
      .values({ userId: outsiderId!.id, fullName: 'Outsider Artisan' });
    const [student] = await db
      .insert(studentProfiles)
      .values({ userId: studentId!.id, fullName: 'Student A' })
      .returning();
    await db.insert(studentProfiles).values({ userId: rows[4]!.id, fullName: 'Outsider Student' });
    const [assignment] = await db
      .insert(assignments)
      .values({
        artisanProfileId: artisan!.id,
        studentProfileId: student!.id,
        type: 'PAID',
        status: 'CONTRACT_PENDING',
      })
      .returning();
    const [contract] = await db
      .insert(contracts)
      .values({
        assignmentId: assignment!.id,
        contractType: 'PAID',
        title: 'Rollback paid contract',
        problemStatement: 'Test',
        responsibilities: 'Test',
        deliverables: 'Test',
        growthTargets: 'Test',
        exclusions: 'Test',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        artisanPaymentAmount: '1000',
        currency: 'INR',
        paymentSchedule: 'ONE_TIME',
        createdByAdminId: rows[0]!.id,
      })
      .returning();
    const token = async (index: number) =>
      (await login(db, testConfig, rows[index]!.email, rows[index]!.password)).token;
    const auth = async (index: number) => ({ Authorization: 'Bearer ' + (await token(index)) });
    assert.equal((await request(app).get('/api/v1/admin/paid-contracts')).status, 401);
    assert.equal(
      (
        await request(app)
          .get('/api/v1/admin/paid-contracts')
          .set(await auth(1))
      ).status,
      403,
    );
    assert.equal(
      (
        await request(app)
          .get('/api/v1/admin/paid-contracts')
          .set(await auth(3))
      ).status,
      403,
    );
    assert.equal(
      (
        await request(app)
          .get('/api/v1/students/me/portfolio')
          .set(await auth(1))
      ).status,
      403,
    );
    assert.equal(
      (
        await request(app)
          .get('/api/v1/contracts/' + contract!.id)
          .set(await auth(2))
      ).status,
      403,
    );
  });
});

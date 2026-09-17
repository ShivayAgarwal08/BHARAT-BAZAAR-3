import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { assignments, contracts, users } from '../src/schemas/index.js';
import { credentials, testConfig, withTestDatabase } from './test-database.js';

test(
  'Phase 3 free-trial lifecycle is role protected and transactional',
  { timeout: 180000 },
  async (t) => {
    await withTestDatabase(async (db) => {
      const app = createApp(testConfig, db);
      const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
      const artisan = credentials(),
        student = credentials(),
        outsider = credentials(),
        admin = credentials();
      await db.insert(users).values({
        email: admin.email,
        passwordHash: await bcrypt.hash(admin.password, 10),
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      });
      const adminToken = (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ identifier: admin.email, password: admin.password })
          .expect(200)
      ).body.data.token;
      const artisanToken = (
        await request(app).post('/api/v1/auth/register/artisan').send(artisan).expect(201)
      ).body.data.token;
      const studentToken = (
        await request(app).post('/api/v1/auth/register/student').send(student).expect(201)
      ).body.data.token;
      const outsiderToken = (
        await request(app).post('/api/v1/auth/register/student').send(outsider).expect(201)
      ).body.data.token;
      await request(app)
        .put('/api/v1/artisans/me')
        .set(auth(artisanToken))
        .send({
          businessName: 'Trial Craft',
          craftCategory: 'Textiles',
          city: 'Jaipur',
          state: 'Rajasthan',
          languages: ['Hindi'],
          onlinePresence: 'None',
          businessProblems: 'Need catalogue',
          onboardingCompleted: true,
        })
        .expect(200);
      async function completeStudent(token: string, name: string) {
        const available = (await request(app).get('/api/v1/skills').expect(200)).body.data;
        await request(app)
          .put('/api/v1/students/me/skills')
          .set(auth(token))
          .send({ skills: [{ skillId: available[0].id, proficiencyLevel: 'ADVANCED' }] })
          .expect(200);
        return request(app)
          .put('/api/v1/students/me')
          .set(auth(token))
          .send({
            college: name + ' College',
            course: 'Design',
            studyYear: 2,
            city: 'Jaipur',
            state: 'Rajasthan',
            languages: ['English', 'Hindi'],
            biography: 'I make useful catalogues.',
            weeklyAvailabilityHours: 8,
            onboardingCompleted: true,
          })
          .expect(200);
      }
      const studentProfile = (await completeStudent(studentToken, 'Verified')).body.data;
      await completeStudent(outsiderToken, 'Outside');
      await request(app)
        .post('/api/v1/admin/students/' + studentProfile.id + '/verify')
        .set(auth(adminToken))
        .send({ expectedUpdatedAt: studentProfile.updatedAt })
        .expect(200);
      const skills = (await request(app).get('/api/v1/skills').expect(200)).body.data;
      let requestId = '',
        assignmentId = '',
        contractId = '',
        taskId = '';
      await t.test('only an onboarded artisan can create and submit its own request', async () => {
        const created = await request(app)
          .post('/api/v1/artisans/me/growth-requests')
          .set(auth(artisanToken))
          .send({
            title: 'Improve catalogues',
            problemDescription: 'We need clearer catalogues and digital listings.',
            preferredLanguage: 'HI',
            preferredDurationMonths: 3,
            skillIds: [skills[0].id],
          })
          .expect(201);
        requestId = created.body.data.request.id;
        await request(app)
          .post('/api/v1/artisans/me/growth-requests/' + requestId + '/submit')
          .set(auth(outsiderToken))
          .send({})
          .expect(403);
        await request(app)
          .post('/api/v1/artisans/me/growth-requests/' + requestId + '/submit')
          .set(auth(artisanToken))
          .send({})
          .expect(200);
      });
      await t.test(
        'only an admin reviews, ranks verified students, and assigns one active manager',
        async () => {
          await request(app)
            .get('/api/v1/admin/growth-requests/' + requestId + '/candidates')
            .set(auth(artisanToken))
            .expect(403);
          await request(app)
            .patch('/api/v1/admin/growth-requests/' + requestId + '/review')
            .set(auth(adminToken))
            .send({ status: 'UNDER_REVIEW' })
            .expect(200);
          const candidates = await request(app)
            .get('/api/v1/admin/growth-requests/' + requestId + '/candidates')
            .set(auth(adminToken))
            .expect(200);
          assert.ok(
            candidates.body.data.some(
              (row: { studentProfileId: string }) => row.studentProfileId === studentProfile.id,
            ),
          );
          const assigned = await request(app)
            .post('/api/v1/admin/growth-requests/' + requestId + '/assign')
            .set(auth(adminToken))
            .send({ studentProfileId: studentProfile.id })
            .expect(201);
          assignmentId = assigned.body.data.id;
          await request(app)
            .post('/api/v1/admin/growth-requests/' + requestId + '/assign')
            .set(auth(adminToken))
            .send({ studentProfileId: studentProfile.id })
            .expect(409);
        },
      );
      const discovery = {
        businessSummary: 'A textile workshop with local customers.',
        identifiedProblems: 'Low online visibility.',
        recommendedServices: 'Catalogues and listings.',
        proposedDeliverables: 'Twenty listings and a catalogue.',
        proposedDurationMonths: 3,
        knownConstraints: 'Limited photographs.',
        successMeasurementPlan: 'Track listings and enquiries.',
        additionalNotes: null,
      };
      await t.test(
        'student owns acceptance and discovery submission; admin owns review',
        async () => {
          await request(app)
            .post('/api/v1/students/me/assignments/' + assignmentId + '/accept')
            .set(auth(outsiderToken))
            .send({})
            .expect(403);
          await request(app)
            .post('/api/v1/students/me/assignments/' + assignmentId + '/accept')
            .set(auth(studentToken))
            .send({})
            .expect(200);
          await request(app)
            .post('/api/v1/students/me/assignments/' + assignmentId + '/discovery/submit')
            .set(auth(studentToken))
            .send(discovery)
            .expect(200);
          await request(app)
            .patch('/api/v1/admin/assignments/' + assignmentId + '/discovery')
            .set(auth(artisanToken))
            .send({ action: 'REVIEW' })
            .expect(403);
          await request(app)
            .patch('/api/v1/admin/assignments/' + assignmentId + '/discovery')
            .set(auth(adminToken))
            .send({ action: 'REVIEW' })
            .expect(200);
        },
      );
      await t.test(
        'contract requires both current-version acceptances before activation',
        async () => {
          const created = await request(app)
            .post('/api/v1/admin/contracts')
            .set(auth(adminToken))
            .send({
              assignmentId,
              title: 'Catalogue free trial',
              problemStatement: 'Improve online product discovery.',
              responsibilities: 'Student prepares catalogue; artisan supplies information.',
              deliverables: 'Catalogue and listings.',
              growthTargets: 'Twenty listings.',
              exclusions: 'No paid advertising or payment processing.',
              startDate: '2026-10-01',
              endDate: '2026-12-31',
              platformStudentStipend: 0,
            })
            .expect(201);
          contractId = created.body.data.id;
          await request(app)
            .post('/api/v1/admin/contracts/' + contractId + '/send')
            .set(auth(adminToken))
            .send({})
            .expect(200);
          await request(app)
            .post('/api/v1/students/me/contracts/' + contractId + '/accept')
            .set(auth(studentToken))
            .send({})
            .expect(200);
          const active = await request(app)
            .post('/api/v1/artisans/me/contracts/' + contractId + '/accept')
            .set(auth(artisanToken))
            .send({})
            .expect(200);
          assert.equal(active.body.data.status, 'ACTIVE');
          assert.equal(active.body.data.contractType, 'FREE_TRIAL');
          assert.equal(Number(active.body.data.artisanPaymentAmount), 0);
          const artisanEngagement = await request(app)
            .get('/api/v1/artisans/me/current-engagement')
            .set(auth(artisanToken))
            .expect(200);
          assert.equal(artisanEngagement.body.data.assignment.id, assignmentId);
          assert.equal(artisanEngagement.body.data.contract.artisanPaymentAmount, '0.00');
          const studentEngagement = await request(app)
            .get('/api/v1/students/me/current-engagement')
            .set(auth(studentToken))
            .expect(200);
          assert.equal(studentEngagement.body.data.assignment.id, assignmentId);
          assert.equal('address' in studentEngagement.body.data.artisan, false);
        },
      );
      await t.test('tasks and metrics stay with contract participants', async () => {
        const milestone = await request(app)
          .post('/api/v1/admin/contracts/' + contractId + '/milestones')
          .set(auth(adminToken))
          .send({
            title: 'Catalogue',
            description: 'Prepare product details.',
            sequence: 1,
            dueDate: '2026-10-20',
          })
          .expect(201);
        const task = await request(app)
          .post('/api/v1/admin/milestones/' + milestone.body.data.id + '/tasks')
          .set(auth(adminToken))
          .send({
            title: 'Draft catalogue',
            description: 'Prepare the first catalogue.',
            dueDate: '2026-10-10',
          })
          .expect(201);
        taskId = task.body.data.id;
        await request(app)
          .patch('/api/v1/students/me/tasks/' + taskId)
          .set(auth(outsiderToken))
          .send({ status: 'SUBMITTED', submissionNotes: 'Done.' })
          .expect(403);
        await request(app)
          .patch('/api/v1/students/me/tasks/' + taskId)
          .set(auth(studentToken))
          .send({ status: 'SUBMITTED', submissionNotes: 'First version ready.' })
          .expect(200);
        await request(app)
          .patch('/api/v1/artisans/me/tasks/' + taskId + '/review')
          .set(auth(artisanToken))
          .send({ action: 'APPROVE' })
          .expect(200);
        await request(app)
          .post('/api/v1/artisans/me/contracts/' + contractId + '/metrics')
          .set(auth(artisanToken))
          .send({ type: 'BASELINE', measurementDate: '2026-10-01', monthlyOrders: 3 })
          .expect(201);
        // An expected PostgreSQL constraint error must not poison the shared fixture transaction.
        const rollbackDuplicate = new Error('ROLLBACK_DUPLICATE_METRIC_CHECK');
        await assert.rejects(
          db.transaction(async (tx) => {
            await request(createApp(testConfig, tx))
              .post('/api/v1/artisans/me/contracts/' + contractId + '/metrics')
              .set(auth(artisanToken))
              .send({ type: 'BASELINE', measurementDate: '2026-10-02', monthlyOrders: 4 })
              .expect(409);
            throw rollbackDuplicate;
          }),
          (error: unknown) => error === rollbackDuplicate,
        );
      });
      await t.test(
        'completed pilot stays linked and owned alongside a current paid engagement',
        async () => {
          await request(app)
            .post('/api/v1/artisans/me/contracts/' + contractId + '/metrics')
            .set(auth(artisanToken))
            .send({ type: 'FINAL', measurementDate: '2026-12-31', monthlyOrders: 8 })
            .expect(201);
          const completion = await request(app)
            .post('/api/v1/contracts/' + contractId + '/completion')
            .set(auth(artisanToken))
            .send({
              completionSummary: 'Catalogue delivered and approved.',
              finalMetricsConfirmed: true,
            })
            .expect(201);
          await request(app)
            .patch('/api/v1/admin/completions/' + completion.body.data.id)
            .set(auth(adminToken))
            .send({ status: 'APPROVED' })
            .expect(200);

          // This later engagement is fixture data within the same rollback transaction.
          const [pilotAssignment] = await db
            .select()
            .from(assignments)
            .where(eq(assignments.id, assignmentId));
          const [pilotContract] = await db
            .select()
            .from(contracts)
            .where(eq(contracts.id, contractId));
          assert.ok(pilotAssignment);
          assert.ok(pilotContract);
          const [paidAssignment] = await db
            .insert(assignments)
            .values({
              artisanProfileId: pilotAssignment.artisanProfileId,
              studentProfileId: pilotAssignment.studentProfileId,
              assignedByAdminId: pilotAssignment.assignedByAdminId,
              type: 'PAID',
              status: 'ACTIVE',
            })
            .returning();
          assert.ok(paidAssignment);
          const [paidContract] = await db
            .insert(contracts)
            .values({
              ...pilotContract,
              id: undefined,
              assignmentId: paidAssignment.id,
              contractType: 'PAID',
              artisanPaymentAmount: '2500.00',
              title: 'Later paid fixture engagement',
              status: 'ACTIVE',
            })
            .returning();
          assert.ok(paidContract);
          const detail = (
            await request(app)
              .get('/api/v1/artisans/me/growth-requests/' + requestId)
              .set(auth(artisanToken))
              .expect(200)
          ).body.data;
          assert.equal(detail.request.status, 'COMPLETED');
          assert.equal(detail.assignment.id, assignmentId);
          assert.equal(detail.assignment.status, 'COMPLETED');
          assert.equal(detail.discovery.assignmentId, assignmentId);
          assert.equal(detail.discovery.status, 'REVIEWED');
          assert.equal(detail.contract.id, contractId);
          assert.equal(detail.contract.status, 'COMPLETED');
          const opened = (
            await request(app)
              .get('/api/v1/artisans/me/contracts/' + detail.contract.id)
              .set(auth(artisanToken))
              .expect(200)
          ).body.data;
          assert.equal(opened.contractType, 'FREE_TRIAL');
          assert.equal(Number(opened.artisanPaymentAmount), 0);
          const outsiderArtisanToken = (
            await request(app).post('/api/v1/auth/register/artisan').send(credentials()).expect(201)
          ).body.data.token;
          await request(app)
            .get('/api/v1/artisans/me/growth-requests/' + requestId)
            .set(auth(outsiderArtisanToken))
            .expect(403);
          await request(app)
            .get('/api/v1/artisans/me/contracts/' + contractId)
            .set(auth(outsiderArtisanToken))
            .expect(403);
          const current = (
            await request(app)
              .get('/api/v1/artisans/me/current-engagement')
              .set(auth(artisanToken))
              .expect(200)
          ).body.data;
          assert.equal(current.assignment.id, paidAssignment.id);
          assert.equal(current.contract.id, paidContract.id);
          assert.equal(current.contract.contractType, 'PAID');
        },
      );
    });
  },
);

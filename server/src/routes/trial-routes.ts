import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate-request.js';
import type { Environment } from '../config/env-schema.js';
import { trialControllers } from '../controllers/trial-controllers.js';
import {
  adminRequestReviewSchema,
  artisanTaskReviewSchema,
  assignStudentSchema,
  contractSchema,
  contractUpdateSchema,
  contractSendSchema,
  discoveryReviewSchema,
  discoverySchema,
  growthRequestFilter,
  growthRequestSchema,
  growthRequestUpdateSchema,
  metricSchema,
  milestoneSchema,
  studentTaskSchema,
  taskSchema,
} from '../validators/trial.js';

const empty = z.object({}).strict();
const id = z.object({ id: z.uuid() }).strict();
const envelope = (
  body: z.ZodType = empty.optional(),
  query: z.ZodType = empty,
  params: z.ZodType = empty,
) => validateRequest(z.object({ body, query, params }));
export function trialRoutes(db: Database, config: Environment) {
  const router = Router();
  const c = trialControllers(db);
  const auth = authenticate(db, config);
  const artisan = authorize('ARTISAN');
  const student = authorize('STUDENT');
  const admin = authorize('ADMIN');
  router.get(
    '/artisans/me/growth-requests',
    auth,
    artisan,
    envelope(undefined, growthRequestFilter),
    c.artisanRequests,
  );
  router.post(
    '/artisans/me/growth-requests',
    auth,
    artisan,
    envelope(growthRequestSchema),
    c.createRequest,
  );
  router.get(
    '/artisans/me/growth-requests/:id',
    auth,
    artisan,
    envelope(undefined, undefined, id),
    c.artisanRequest,
  );
  router.put(
    '/artisans/me/growth-requests/:id',
    auth,
    artisan,
    envelope(growthRequestUpdateSchema, undefined, id),
    c.updateRequest,
  );
  router.post(
    '/artisans/me/growth-requests/:id/submit',
    auth,
    artisan,
    envelope(empty, undefined, id),
    c.submitRequest,
  );
  router.get(
    '/artisans/me/contracts/:id',
    auth,
    artisan,
    envelope(undefined, undefined, id),
    c.artisanContract,
  );
  router.post(
    '/artisans/me/contracts/:id/accept',
    auth,
    artisan,
    envelope(empty, undefined, id),
    c.artisanAcceptContract,
  );
  router.get(
    '/artisans/me/contracts/:id/metrics',
    auth,
    artisan,
    envelope(undefined, undefined, id),
    c.artisanMetrics,
  );
  router.get(
    '/artisans/me/contracts/:id/tasks',
    auth,
    artisan,
    envelope(undefined, undefined, id),
    c.artisanTasks,
  );
  router.post(
    '/artisans/me/contracts/:id/metrics',
    auth,
    artisan,
    envelope(metricSchema, undefined, id),
    c.artisanAddMetric,
  );
  router.patch(
    '/artisans/me/tasks/:id/review',
    auth,
    artisan,
    envelope(artisanTaskReviewSchema, undefined, id),
    c.reviewTask,
  );
  router.get('/students/me/assignments', auth, student, envelope(), c.assignments);
  router.post(
    '/students/me/assignments/:id/accept',
    auth,
    student,
    envelope(empty, undefined, id),
    c.acceptAssignment,
  );
  router.get(
    '/students/me/assignments/:id/discovery',
    auth,
    student,
    envelope(undefined, undefined, id),
    c.studentDiscovery,
  );
  router.put(
    '/students/me/assignments/:id/discovery',
    auth,
    student,
    envelope(discoverySchema, undefined, id),
    c.saveDiscovery,
  );
  router.post(
    '/students/me/assignments/:id/discovery/submit',
    auth,
    student,
    envelope(discoverySchema, undefined, id),
    c.submitDiscovery,
  );
  router.get(
    '/students/me/contracts/:id',
    auth,
    student,
    envelope(undefined, undefined, id),
    c.studentContract,
  );
  router.post(
    '/students/me/contracts/:id/accept',
    auth,
    student,
    envelope(empty, undefined, id),
    c.studentAcceptContract,
  );
  router.get(
    '/students/me/contracts/:id/metrics',
    auth,
    student,
    envelope(undefined, undefined, id),
    c.studentMetrics,
  );
  router.get(
    '/students/me/contracts/:id/tasks',
    auth,
    student,
    envelope(undefined, undefined, id),
    c.studentTasks,
  );
  router.post(
    '/students/me/contracts/:id/metrics',
    auth,
    student,
    envelope(metricSchema, undefined, id),
    c.studentAddMetric,
  );
  router.patch(
    '/students/me/tasks/:id',
    auth,
    student,
    envelope(studentTaskSchema, undefined, id),
    c.studentTask,
  );
  router.get(
    '/admin/growth-requests',
    auth,
    admin,
    envelope(undefined, growthRequestFilter),
    c.adminRequests,
  );
  router.get(
    '/admin/growth-requests/:id',
    auth,
    admin,
    envelope(undefined, undefined, id),
    c.adminRequest,
  );
  router.patch(
    '/admin/growth-requests/:id/review',
    auth,
    admin,
    envelope(adminRequestReviewSchema, undefined, id),
    c.adminReviewRequest,
  );
  router.get(
    '/admin/growth-requests/:id/candidates',
    auth,
    admin,
    envelope(undefined, undefined, id),
    c.candidates,
  );
  router.post(
    '/admin/growth-requests/:id/assign',
    auth,
    admin,
    envelope(assignStudentSchema, undefined, id),
    c.assign,
  );
  router.patch(
    '/admin/assignments/:id/discovery',
    auth,
    admin,
    envelope(discoveryReviewSchema, undefined, id),
    c.reviewDiscovery,
  );
  router.get(
    '/admin/assignments/:id',
    auth,
    admin,
    envelope(undefined, undefined, id),
    c.assignmentProgress,
  );
  router.post('/admin/contracts', auth, admin, envelope(contractSchema), c.createContract);
  router.put(
    '/admin/contracts/:id',
    auth,
    admin,
    envelope(contractUpdateSchema, undefined, id),
    c.updateContract,
  );
  router.post(
    '/admin/contracts/:id/send',
    auth,
    admin,
    envelope(contractSendSchema, undefined, id),
    c.sendContract,
  );
  router.post(
    '/admin/contracts/:id/milestones',
    auth,
    admin,
    envelope(milestoneSchema, undefined, id),
    c.createMilestone,
  );
  router.post(
    '/admin/milestones/:id/tasks',
    auth,
    admin,
    envelope(taskSchema, undefined, id),
    c.createTask,
  );
  router.get(
    '/admin/contracts/:id/tasks',
    auth,
    admin,
    envelope(undefined, undefined, id),
    c.tasks,
  );
  router.get(
    '/admin/contracts/:id/metrics',
    auth,
    admin,
    envelope(undefined, undefined, id),
    c.adminMetrics,
  );
  return router;
}

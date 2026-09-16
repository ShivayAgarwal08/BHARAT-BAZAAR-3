import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { Database } from '../db/index.js';
import type { Environment } from '../config/env-schema.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate-request.js';
import { domainControllers } from '../controllers/domain-controllers.js';
import { artisanRegistration, studentRegistration, loginSchema } from '../validators/auth.js';
import {
  artisanProfileSchema,
  studentProfileSchema,
  skillSelectionSchema,
} from '../validators/profiles.js';
import {
  assistedSchema,
  assistedFilter,
  studentFilter,
  userFilter,
  statusUpdate,
  reviewSchema,
  rejectionSchema,
} from '../validators/admin.js';
import { trialRoutes } from './trial-routes.js';
import { marketplaceRoutes } from './marketplace-routes.js';

const empty = z.object({}).strict();
const id = z.object({ id: z.uuid() }).strict();
const envelope = (
  body: z.ZodType = empty.optional(),
  query: z.ZodType = empty,
  params: z.ZodType = empty,
) => validateRequest(z.object({ body, query, params }));
export function domainRoutes(db: Database, config: Environment) {
  const router = Router();
  const controller = domainControllers(db, config);
  const authenticated = authenticate(db, config);
  const artisan = authorize('ARTISAN'),
    student = authorize('STUDENT'),
    admin = authorize('ADMIN');
  const limited = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.NODE_ENV === 'test',
    message: {
      success: false,
      message: 'Too many attempts. Try again later.',
      error: { code: 'RATE_LIMITED' },
    },
  });
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  router.post(
    '/auth/register/artisan',
    limited,
    envelope(artisanRegistration),
    controller.registerArtisan,
  );
  router.post(
    '/auth/register/student',
    limited,
    envelope(studentRegistration),
    controller.registerStudent,
  );
  router.post('/auth/login', limited, envelope(loginSchema), controller.login);
  router.post('/auth/logout', authenticated, envelope(), controller.logout);
  router.get('/auth/me', authenticated, envelope(), controller.me);
  router.get('/artisans/me', authenticated, artisan, envelope(), controller.artisanProfile);
  router.put(
    '/artisans/me',
    authenticated,
    artisan,
    envelope(artisanProfileSchema),
    controller.saveArtisan,
  );
  router.get('/students/me', authenticated, student, envelope(), controller.studentProfile);
  router.put(
    '/students/me',
    authenticated,
    student,
    envelope(studentProfileSchema),
    controller.saveStudent,
  );
  router.put(
    '/students/me/skills',
    authenticated,
    student,
    envelope(z.object({ skills: skillSelectionSchema }).strict()),
    controller.saveSkills,
  );
  router.get('/skills', envelope(), controller.skills);
  router.post('/assisted-registrations', limited, envelope(assistedSchema), controller.assistance);
  router.use('/admin', authenticated, admin);
  router.get('/admin/overview', envelope(), controller.overview);
  router.get('/admin/users', envelope(undefined, userFilter), controller.users);
  router.get('/admin/students', envelope(undefined, studentFilter), controller.students);
  router.get('/admin/students/:id', envelope(undefined, undefined, id), controller.studentDetail);
  router.post(
    '/admin/students/:id/verify',
    envelope(reviewSchema, undefined, id),
    controller.verify,
  );
  router.post(
    '/admin/students/:id/reject',
    envelope(rejectionSchema, undefined, id),
    controller.reject,
  );
  router.get(
    '/admin/assisted-registrations',
    envelope(undefined, assistedFilter),
    controller.assistanceList,
  );
  router.patch(
    '/admin/assisted-registrations/:id',
    envelope(statusUpdate, undefined, id),
    controller.assistanceUpdate,
  );
  router.use(trialRoutes(db, config));
  router.use(marketplaceRoutes(db, config));
  return router;
}

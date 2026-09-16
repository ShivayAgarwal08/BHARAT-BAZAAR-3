import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Database } from '../db/index.js';
import type { Environment } from '../config/env-schema.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate-request.js';
import { marketplaceControllers } from '../controllers/marketplace-controllers.js';
import {
  completionRequestSchema,
  completionReviewSchema,
  disputeReviewSchema,
  disputeSchema,
  externalPaymentSchema,
  marketplaceFilterSchema,
  marketplaceRequestSchema,
  marketplaceResponseSchema,
  moderationSchema,
  paidContractSchema,
  reviewSchema,
} from '../validators/marketplace.js';

const empty = z.object({}).strict(),
  id = z.object({ id: z.uuid() }).strict();
const envelope = (
  body: z.ZodType = empty.optional(),
  query: z.ZodType = empty,
  params: z.ZodType = empty,
) => validateRequest(z.object({ body, query, params }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) =>
    done(null, ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)),
});
export function marketplaceRoutes(db: Database, config: Environment) {
  const r = Router(),
    c = marketplaceControllers(db),
    auth = authenticate(db, config),
    artisan = authorize('ARTISAN'),
    student = authorize('STUDENT'),
    admin = authorize('ADMIN');
  r.get(
    '/marketplace/students',
    auth,
    artisan,
    envelope(undefined, marketplaceFilterSchema),
    c.browse,
  );
  r.get('/marketplace/students/:id', auth, artisan, envelope(undefined, undefined, id), c.student);
  r.post(
    '/artisans/me/marketplace-requests',
    auth,
    artisan,
    envelope(marketplaceRequestSchema),
    c.request,
  );
  r.get('/artisans/me/marketplace-requests', auth, artisan, envelope(), c.artisanRequests);
  r.get('/students/me/marketplace-requests', auth, student, envelope(), c.studentRequests);
  r.post(
    '/students/me/marketplace-requests/:id/respond',
    auth,
    student,
    envelope(marketplaceResponseSchema, undefined, id),
    c.respond,
  );
  r.post('/admin/paid-contracts', auth, admin, envelope(paidContractSchema), c.paidContract);
  r.get('/contracts/:id/payments', auth, envelope(undefined, undefined, id), c.payments);
  r.patch(
    '/payments/:id/external',
    auth,
    artisan,
    envelope(externalPaymentSchema, undefined, id),
    c.markPayment,
  );
  r.post('/payments/:id/confirm', auth, student, envelope(empty, undefined, id), c.confirmPayment);
  r.post('/payments/:id/proof', auth, artisan, upload.single('proof'), c.uploadProof);
  r.get('/payments/:id/proof', auth, envelope(undefined, undefined, id), c.proof);
  r.post('/contracts/:id/disputes', auth, envelope(disputeSchema, undefined, id), c.dispute);
  r.get('/disputes', auth, envelope(), c.disputes);
  r.patch(
    '/admin/disputes/:id',
    auth,
    admin,
    envelope(disputeReviewSchema, undefined, id),
    c.reviewDispute,
  );
  r.post(
    '/contracts/:id/completion',
    auth,
    envelope(completionRequestSchema, undefined, id),
    c.completion,
  );
  r.patch(
    '/admin/completions/:id',
    auth,
    admin,
    envelope(completionReviewSchema, undefined, id),
    c.completionReview,
  );
  r.post('/contracts/:id/reviews', auth, envelope(reviewSchema, undefined, id), c.review);
  r.patch(
    '/admin/reviews/:id',
    auth,
    admin,
    envelope(moderationSchema, undefined, id),
    c.moderateReview,
  );
  return r;
}

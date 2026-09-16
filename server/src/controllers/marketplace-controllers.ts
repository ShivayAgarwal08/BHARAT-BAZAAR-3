import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import type { Database } from '../db/index.js';
import type { SafeUser } from '../types/auth.js';
import * as marketplace from '../services/marketplace-service.js';
import { AppError } from '../utils/app-error.js';
import type {
  marketplaceFilterSchema,
  marketplaceRequestSchema,
  marketplaceResponseSchema,
  paidContractSchema,
  externalPaymentSchema,
  disputeSchema,
  disputeReviewSchema,
  reviewSchema,
  moderationSchema,
  completionRequestSchema,
  completionReviewSchema,
} from '../validators/marketplace.js';

type Input<B, Q> = { body: B; query: Q; params: { id: string }; actor: SafeUser };
function action<B = undefined, Q = undefined>(
  work: (input: Input<B, Q>) => Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (_req, res) => {
    const data = await work({ ...res.locals.validated, actor: res.locals.actor });
    res.status(status).json({ success: true, message: 'Request completed.', data });
  };
}
export function marketplaceControllers(db: Database) {
  return {
    browse: action<undefined, z.output<typeof marketplaceFilterSchema>>(({ query }) =>
      marketplace.marketplaceStudents(db, query),
    ),
    student: action(({ params }) => marketplace.marketplaceStudent(db, params.id)),
    request: action<z.output<typeof marketplaceRequestSchema>>(
      ({ actor, body }) => marketplace.createMarketplaceRequest(db, actor.id, body),
      201,
    ),
    artisanRequests: action(({ actor }) => marketplace.artisanMarketplaceRequests(db, actor.id)),
    studentRequests: action(({ actor }) => marketplace.studentMarketplaceRequests(db, actor.id)),
    respond: action<z.output<typeof marketplaceResponseSchema>>(({ actor, params, body }) =>
      marketplace.respondMarketplaceRequest(
        db,
        actor.id,
        params.id,
        body.action,
        body.studentResponse,
      ),
    ),
    paidContract: action<z.output<typeof paidContractSchema>>(
      ({ actor, body }) => marketplace.createPaidContract(db, actor.id, body),
      201,
    ),
    payments: action(({ actor, params }) =>
      marketplace.paymentsForParticipant(db, actor.id, params.id),
    ),
    markPayment: action<z.output<typeof externalPaymentSchema>>(({ actor, params, body }) =>
      marketplace.markExternalPayment(db, actor.id, params.id, body),
    ),
    confirmPayment: action(({ actor, params }) =>
      marketplace.confirmPayment(db, actor.id, params.id),
    ),
    uploadProof: async (req: Request<{ id: string }>, res: Response) => {
      const file = req.file;
      if (!file) throw new AppError(400, 'Proof file is required.', 'INVALID_PROOF');
      const data = await marketplace.uploadProof(db, res.locals.actor.id, req.params.id, file);
      res.status(201).json({ success: true, message: 'Proof stored privately.', data });
    },
    proof: async (req: Request<{ id: string }>, res: Response) => {
      const proof = await marketplace.proofForAuthorizedUser(
        db,
        res.locals.actor.id,
        res.locals.actor.role,
        req.params.id,
      );
      res.set({
        'Content-Type': proof.mimeType,
        'Content-Length': String(proof.fileSize),
        'Content-Disposition': `attachment; filename="${proof.originalFileName.replace(/["\\]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.send(proof.fileData);
    },
    dispute: action<z.output<typeof disputeSchema>>(
      ({ actor, params, body }) => marketplace.openDispute(db, actor.id, params.id, body),
      201,
    ),
    disputes: action(({ actor }) => marketplace.listDisputes(db, actor.id, actor.role)),
    reviewDispute: action<z.output<typeof disputeReviewSchema>>(({ actor, params, body }) =>
      marketplace.reviewDispute(db, actor.id, params.id, body),
    ),
    completion: action<z.output<typeof completionRequestSchema>>(
      ({ actor, params, body }) => marketplace.requestCompletion(db, actor.id, params.id, body),
      201,
    ),
    completionReview: action<z.output<typeof completionReviewSchema>>(({ actor, params, body }) =>
      marketplace.reviewCompletion(db, actor.id, params.id, body),
    ),
    review: action<z.output<typeof reviewSchema>>(
      ({ actor, params, body }) => marketplace.createReview(db, actor.id, params.id, body),
      201,
    ),
    moderateReview: action<z.output<typeof moderationSchema>>(({ params, body }) =>
      marketplace.moderateReview(db, params.id, body.hidden, body.reason),
    ),
  };
}

import { z } from 'zod';
import { paginationSchema } from './request.js';

const concise = (max: number) => z.string().trim().min(1).max(max);
const long = (max = 5000) => concise(max);
const optionalText = (max = 5000) => z.string().trim().max(max).nullable().optional();
const money = z.number().finite().positive().max(9999999999.99);

export const marketplaceFilterSchema = paginationSchema.extend({
  skillId: z.uuid().optional(),
  language: z.string().trim().min(1).max(50).optional(),
  minimumRating: z.coerce.number().min(1).max(5).optional(),
  availability: z.coerce.number().int().min(1).max(60).optional(),
  maximumMonthlyRate: z.coerce.number().positive().max(9999999999.99).optional(),
});
export const marketplaceRequestSchema = z
  .object({
    studentProfileId: z.uuid(),
    message: long(2000),
    requestedServices: z.array(concise(100)).min(1).max(14),
    proposedDurationMonths: z.number().int().min(1).max(12),
    proposedMonthlyBudget: money.nullable().optional(),
  })
  .strict();
export const marketplaceResponseSchema = z
  .object({ action: z.enum(['ACCEPT', 'DECLINE']), studentResponse: optionalText(2000) })
  .strict();
export const paidContractSchema = z
  .object({
    assignmentId: z.uuid(),
    title: concise(160),
    problemStatement: long(),
    responsibilities: long(),
    deliverables: long(),
    growthTargets: long(),
    exclusions: long(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    artisanPaymentAmount: money,
    currency: z.literal('INR').default('INR'),
    paymentSchedule: z.enum(['MONTHLY', 'ONE_TIME']),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.endDate < value.startDate)
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must not be before start date.',
      });
  });
export const externalPaymentSchema = z
  .object({
    paymentMethod: z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'OTHER']),
    transactionReference: optionalText(200),
    artisanNotes: optionalText(2000),
  })
  .strict();
export const disputeSchema = z
  .object({
    paymentRecordId: z.uuid().nullable().optional(),
    category: z.enum(['PAYMENT', 'WORK_QUALITY', 'COMMUNICATION', 'CONTRACT', 'OTHER']),
    title: concise(160),
    description: long(),
  })
  .strict();
export const disputeReviewSchema = z
  .object({
    status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'REJECTED']),
    adminNotes: optionalText(),
    resolution: optionalText(),
  })
  .strict()
  .superRefine((value, context) => {
    if (['RESOLVED', 'REJECTED'].includes(value.status) && !value.resolution)
      context.addIssue({
        code: 'custom',
        path: ['resolution'],
        message: 'A resolution is required.',
      });
  });
export const reviewSchema = z
  .object({
    overallRating: z.number().int().min(1).max(5),
    communicationRating: z.number().int().min(1).max(5),
    professionalismRating: z.number().int().min(1).max(5),
    reliabilityRating: z.number().int().min(1).max(5),
    resultsRating: z.number().int().min(1).max(5).nullable().optional(),
    reviewText: long(3000),
  })
  .strict();
export const moderationSchema = z
  .object({ hidden: z.boolean(), reason: optionalText(1000) })
  .strict()
  .superRefine((value, context) => {
    if (value.hidden && !value.reason)
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'A reason is required when hiding a review.',
      });
  });
export const completionRequestSchema = z
  .object({
    completionSummary: long(3000),
    finalMetricsConfirmed: z.boolean(),
    explanation: optionalText(2000),
  })
  .strict();
export const completionReviewSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    adminNotes: optionalText(2000),
    overrideReason: optionalText(2000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'REJECTED' && !value.adminNotes)
      context.addIssue({
        code: 'custom',
        path: ['adminNotes'],
        message: 'Notes are required when rejecting completion.',
      });
  });
export type MarketplaceRequestInput = z.output<typeof marketplaceRequestSchema>;
export type PaidContractInput = z.output<typeof paidContractSchema>;

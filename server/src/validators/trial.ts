import { z } from 'zod';
import { paginationSchema } from './request.js';

const concise = (max: number) => z.string().trim().min(1).max(max);
const long = (max = 5000) => z.string().trim().min(1).max(max);
const optionalLong = (max = 5000) => z.string().trim().max(max).nullable().optional();
const money = z.number().finite().min(0).max(9999999999.99).nullable().optional();
const quantity = z.number().int().min(0).max(100000000).nullable().optional();
const dateString = z.iso.date();

export const growthRequestSchema = z
  .object({
    title: concise(160),
    problemDescription: long(5000),
    preferredLanguage: z.enum(['EN', 'HI']),
    preferredDurationMonths: z.number().int().min(1).max(12),
    currentMonthlyRevenue: money,
    currentMonthlyOrders: quantity,
    currentOnlineOrders: quantity,
    currentFollowers: quantity,
    currentProductsListed: quantity,
    skillIds: z
      .array(z.uuid())
      .min(1)
      .max(14)
      .refine((items) => new Set(items).size === items.length, 'Skills must be unique'),
  })
  .strict();
export const growthRequestUpdateSchema = growthRequestSchema.partial().strict();
export const growthRequestFilter = paginationSchema.extend({
  status: z
    .enum([
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'STUDENT_ASSIGNED',
      'DISCOVERY_IN_PROGRESS',
      'CONTRACT_PENDING',
      'ACTIVE',
      'COMPLETED',
      'CANCELLED',
    ])
    .optional(),
});
export const adminRequestReviewSchema = z
  .object({ status: z.enum(['UNDER_REVIEW', 'CANCELLED']) })
  .strict();
export const assignStudentSchema = z.object({ studentProfileId: z.uuid() }).strict();

export const discoverySchema = z
  .object({
    businessSummary: long(),
    identifiedProblems: long(),
    recommendedServices: long(),
    proposedDeliverables: long(),
    proposedDurationMonths: z.number().int().min(1).max(12),
    knownConstraints: long(),
    successMeasurementPlan: long(),
    additionalNotes: optionalLong(),
  })
  .strict();
export const discoveryReviewSchema = z
  .object({
    action: z.enum(['REVIEW', 'REVISION_REQUIRED']),
    adminFeedback: optionalLong(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === 'REVISION_REQUIRED' && !value.adminFeedback)
      context.addIssue({
        code: 'custom',
        path: ['adminFeedback'],
        message: 'Feedback is required when requesting a revision.',
      });
  });

const contractFields = z
  .object({
    assignmentId: z.uuid(),
    title: concise(160),
    problemStatement: long(),
    responsibilities: long(),
    deliverables: long(),
    growthTargets: long(),
    exclusions: long(),
    startDate: dateString,
    endDate: dateString,
    platformStudentStipend: money,
  })
  .strict();
export const contractSchema = contractFields.superRefine((value, context) => {
  if (value.endDate < value.startDate)
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date must not be before start date.',
    });
});
export const contractUpdateSchema = contractFields
  .omit({ assignmentId: true })
  .strict()
  .superRefine((value, context) => {
    if (value.endDate < value.startDate)
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must not be before start date.',
      });
  });
export const contractSendSchema = z.object({}).strict();

export const milestoneSchema = z
  .object({
    title: concise(160),
    description: long(),
    sequence: z.number().int().min(1).max(100),
    dueDate: dateString,
  })
  .strict();
export const taskSchema = z
  .object({
    title: concise(160),
    description: long(),
    dueDate: dateString,
  })
  .strict();
export const studentTaskSchema = z
  .object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'SUBMITTED']),
    submissionNotes: optionalLong(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'SUBMITTED' && !value.submissionNotes)
      context.addIssue({
        code: 'custom',
        path: ['submissionNotes'],
        message: 'Submission notes are required.',
      });
  });
export const artisanTaskReviewSchema = z
  .object({
    action: z.enum(['APPROVE', 'REVISION_REQUIRED']),
    artisanFeedback: optionalLong(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === 'REVISION_REQUIRED' && !value.artisanFeedback)
      context.addIssue({
        code: 'custom',
        path: ['artisanFeedback'],
        message: 'Feedback is required when requesting a revision.',
      });
  });

export const metricSchema = z
  .object({
    type: z.enum(['BASELINE', 'PROGRESS', 'FINAL']),
    measurementDate: dateString,
    monthlyRevenue: money,
    monthlyOrders: quantity,
    onlineOrders: quantity,
    socialFollowers: quantity,
    customerEnquiries: quantity,
    productsListedOnline: quantity,
    notes: optionalLong(),
  })
  .strict();
export type GrowthRequestInput = z.output<typeof growthRequestSchema>;
export type GrowthRequestUpdate = z.output<typeof growthRequestUpdateSchema>;
export type DiscoveryInput = z.output<typeof discoverySchema>;
export type ContractInput = z.output<typeof contractSchema>;
export type ContractUpdate = z.output<typeof contractUpdateSchema>;
export type MilestoneInput = z.output<typeof milestoneSchema>;
export type TaskInput = z.output<typeof taskSchema>;
export type MetricInput = z.output<typeof metricSchema>;

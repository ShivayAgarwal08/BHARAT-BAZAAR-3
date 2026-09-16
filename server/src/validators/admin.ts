import { z } from 'zod';
import { phoneSchema } from './auth.js';
import { paginationSchema } from './request.js';
export const assistedSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    preferredLanguage: z.enum(['EN', 'HI']),
    preferredCallTime: z.string().trim().min(2).max(160),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();
export const assistedStatuses = ['PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED'] as const;
export const assistedFilter = paginationSchema.extend({
  status: z.enum(assistedStatuses).optional(),
});
export const studentFilter = paginationSchema.extend({
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});
export const userFilter = paginationSchema.extend({
  role: z.enum(['ARTISAN', 'STUDENT', 'ADMIN']).optional(),
});
export const statusUpdate = z
  .object({
    status: z.enum(assistedStatuses),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const reviewSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const rejectionSchema = reviewSchema.extend({ notes: z.string().trim().min(3).max(2000) });

import { z } from 'zod';

// Future endpoint schemas describe the complete { body, params, query } envelope.
export const emptyRequestSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

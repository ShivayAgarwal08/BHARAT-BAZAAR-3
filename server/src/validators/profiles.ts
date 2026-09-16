import { z } from 'zod';
const short = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const languagesSchema = z
  .array(short(50))
  .max(12)
  .refine(
    (items) => new Set(items.map((item) => item.toLowerCase())).size === items.length,
    'Languages must be unique',
  );
const shared = {
  fullName: z.string().trim().min(2).max(120).optional(),
  city: short(100).optional(),
  state: short(100).optional(),
  languages: languagesSchema.optional(),
  biography: optionalText(2000),
  onboardingCompleted: z.boolean().optional(),
};
export const artisanProfileSchema = z
  .object({
    ...shared,
    businessName: short(160).optional(),
    craftCategory: short(100).optional(),
    address: optionalText(500),
    currentMonthlyRevenue: z.number().finite().min(0).max(9999999999.99).nullable().optional(),
    currentMonthlyOrders: z.number().int().min(0).max(10000000).nullable().optional(),
    onlinePresence: optionalText(2000),
    businessProblems: optionalText(2000),
  })
  .strict();
export const skillSelectionSchema = z
  .array(
    z
      .object({
        skillId: z.uuid(),
        proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
      })
      .strict(),
  )
  .max(30)
  .refine(
    (items) => new Set(items.map((item) => item.skillId)).size === items.length,
    'Skills must be unique',
  );
export const studentProfileSchema = z
  .object({
    ...shared,
    college: short(180).optional(),
    course: short(120).optional(),
    studyYear: z.number().int().min(1).max(8).optional(),
    weeklyAvailabilityHours: z.number().int().min(1).max(60).optional(),
    expectedMonthlyRate: z.number().finite().min(0).max(9999999999.99).nullable().optional(),
    portfolioUrl: z
      .string()
      .trim()
      .url()
      .max(1000)
      .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol))
      .nullable()
      .optional(),
    skills: skillSelectionSchema.optional(),
  })
  .strict();

export const completeArtisanSchema = z.object({
  businessName: short(160),
  craftCategory: short(100),
  city: short(100),
  state: short(100),
  languages: languagesSchema.min(1),
  onlinePresence: short(2000),
  businessProblems: short(2000),
});
export const completeStudentSchema = z.object({
  college: short(180),
  course: short(120),
  studyYear: z.number().int().min(1).max(8),
  city: short(100),
  state: short(100),
  languages: languagesSchema.min(1),
  biography: short(2000),
  weeklyAvailabilityHours: z.number().int().min(1).max(60),
});
export type ArtisanInput = z.output<typeof artisanProfileSchema>;
export type StudentInput = z.output<typeof studentProfileSchema>;
export type SkillSelection = z.output<typeof skillSelectionSchema>;

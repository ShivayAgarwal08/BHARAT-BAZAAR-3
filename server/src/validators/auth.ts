import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => {
    const cleaned = value.replace(/[\s()-]/g, '');
    return /^\d{10}$/.test(cleaned) ? '+91' + cleaned : cleaned;
  })
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/));
export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (value) => /\p{L}/u.test(value) && /\d/.test(value),
    'Use at least one letter and one number',
  )
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password exceeds 72 bytes');
const optionalContact = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
const registration = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: optionalContact(emailSchema),
    phone: optionalContact(phoneSchema),
    password: passwordSchema,
    preferredLanguage: z.enum(['EN', 'HI']).default('EN'),
  })
  .strict();
export const artisanRegistration = registration.extend({ phone: phoneSchema });
export const studentRegistration = registration.extend({ email: emailSchema });
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(200),
  })
  .strict();
export type Registration = z.output<typeof registration>;

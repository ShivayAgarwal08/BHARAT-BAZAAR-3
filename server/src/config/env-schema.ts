import { z } from 'zod';

const optionalValue = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const postgresUrl = z
  .string()
  .url()
  .refine(
    (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
    'Expected a PostgreSQL connection URL',
  );

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z
    .string()
    .url()
    .default('http://localhost:5173')
    .refine((value) => {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    }, 'CLIENT_URL must be an HTTP(S) origin without a trailing slash or path'),
  DATABASE_URL: optionalValue(postgresUrl),
  DATABASE_URL_UNPOOLED: optionalValue(postgresUrl),
  JWT_SECRET: optionalValue(z.string().min(32)),
  ADMIN_EMAIL: optionalValue(z.string().trim().toLowerCase().email().max(254)),
  ADMIN_PASSWORD: optionalValue(z.string().min(10).max(72)),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'Use a duration such as 7d')
    .default('7d'),
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnvironment(values: NodeJS.ProcessEnv): Environment {
  const result = envSchema.safeParse(values);
  if (!result.success) {
    // Report only variable names: never echo values that might contain credentials.
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(
      `Invalid environment configuration: ${keys.join(', ')}. Check server/.env.example.`,
    );
  }
  return result.data;
}

import type { CorsOptions } from 'cors';
import type { Environment } from './env-schema.js';
import { AppError } from '../utils/app-error.js';

export function createCorsOptions(
  config: Pick<Environment, 'CLIENT_URL' | 'CLIENT_URLS'>,
): CorsOptions {
  const origins = new Set([
    config.CLIENT_URL,
    ...(config.CLIENT_URLS?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []),
  ]);
  return {
    origin(origin, callback) {
      // Non-browser health probes and tools do not send Origin.
      if (!origin || origins.has(origin)) callback(null, true);
      else callback(new AppError(403, 'This origin is not allowed.', 'ORIGIN_NOT_ALLOWED'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
}

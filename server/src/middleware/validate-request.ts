import type { RequestHandler } from 'express';
import type { ZodType, output } from 'zod';

export interface ValidatedLocals<T> {
  validated: T;
}

// Parsed/coerced values live in res.locals.validated; Express 5 request.query is read-only.
export function validateRequest<T extends ZodType>(
  schema: T,
): RequestHandler<
  Record<string, string>,
  unknown,
  unknown,
  Record<string, unknown>,
  ValidatedLocals<output<T>>
> {
  return async (request, response, next) => {
    const result = await schema.safeParseAsync({
      body: request.body,
      params: request.params,
      query: request.query,
    });
    if (!result.success) {
      next(result.error);
      return;
    }
    response.locals.validated = result.data;
    next();
  };
}

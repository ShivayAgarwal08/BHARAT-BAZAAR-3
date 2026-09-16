import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../db/index.js';
import type { Environment } from '../config/env-schema.js';
import type { SafeUser, UserRole } from '../types/auth.js';
import { users } from '../schemas/index.js';
import { publicUserColumns } from '../services/user-service.js';
import { verifyToken } from '../services/auth-service.js';
import { AppError } from '../utils/app-error.js';

export function authenticate(db: Database, config: Environment): RequestHandler {
  return async (request, response, next) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new AppError(401, 'Please log in.', 'UNAUTHENTICATED');
    let claims;
    try {
      claims = z
        .object({ sub: z.uuid(), ver: z.number().int().nonnegative() })
        .parse(verifyToken(config, header.slice(7)));
    } catch {
      throw new AppError(401, 'Please log in again.', 'UNAUTHENTICATED');
    }
    const [row] = await db
      .select({ ...publicUserColumns, tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, claims.sub));
    if (!row || row.tokenVersion !== claims.ver || row.accountStatus === 'SUSPENDED') {
      throw new AppError(401, 'Please log in again.', 'UNAUTHENTICATED');
    }
    response.locals.actor = row;
    next();
  };
}
export function authorize(...roles: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    const actor = response.locals.actor as SafeUser | undefined;
    if (!actor) throw new AppError(401, 'Please log in.', 'UNAUTHENTICATED');
    if (!roles.includes(actor.role))
      throw new AppError(403, 'This action is not allowed for your role.', 'FORBIDDEN');
    next();
  };
}

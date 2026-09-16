import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, or, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import type { Environment } from '../config/env-schema.js';
import { users, artisanProfiles, studentProfiles } from '../schemas/index.js';
import type { Registration } from '../validators/auth.js';
import { phoneSchema } from '../validators/auth.js';
import { AppError } from '../utils/app-error.js';
import { getSessionUser } from './user-service.js';

const issuer = 'bharat-bazaar-api';
const audience = 'bharat-bazaar-client';
let dummyHash: Promise<string> | undefined;
export function authSecret(config: Environment) {
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET is required for authentication.');
  return config.JWT_SECRET;
}
function token(config: Environment, id: string, version: number) {
  return jwt.sign({ ver: version }, authSecret(config), {
    algorithm: 'HS256',
    subject: id,
    issuer,
    audience,
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}
export function verifyToken(config: Environment, value: string) {
  return jwt.verify(value, authSecret(config), { algorithms: ['HS256'], issuer, audience });
}
export async function register(
  db: Database,
  config: Environment,
  role: 'ARTISAN' | 'STUDENT',
  input: Registration,
) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          phone: input.phone,
          passwordHash,
          role,
          preferredLanguage: input.preferredLanguage,
        })
        .returning({ id: users.id });
      if (!user) throw new Error('Registration failed');
      const table = role === 'ARTISAN' ? artisanProfiles : studentProfiles;
      await tx.insert(table).values({ userId: user.id, fullName: input.fullName });
      return { token: token(config, user.id, 0), user: await getSessionUser(tx, user.id) };
    });
  } catch (error) {
    let cause: unknown = error;
    for (let depth = 0; depth < 5 && cause instanceof Error; depth++) {
      if ('code' in cause && cause.code === '23505') {
        throw new AppError(409, 'An account already uses these contact details.', 'CONTACT_EXISTS');
      }
      cause = cause.cause;
    }
    throw error;
  }
}
export async function login(
  db: Database,
  config: Environment,
  identifier: string,
  password: string,
) {
  const normalizedPhone = phoneSchema.safeParse(identifier);
  const [user] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, identifier.toLowerCase().trim()),
        ...(normalizedPhone.success ? [eq(users.phone, normalizedPhone.data)] : []),
      ),
    )
    .limit(1);
  dummyHash ??= bcrypt.hash(randomBytes(32).toString('hex'), 12);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !valid || user.accountStatus === 'SUSPENDED') {
    throw new AppError(401, 'Invalid email, phone or password.', 'INVALID_CREDENTIALS');
  }
  return {
    token: token(config, user.id, user.tokenVersion),
    user: await getSessionUser(db, user.id),
  };
}
export async function logout(db: Database, userId: string) {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

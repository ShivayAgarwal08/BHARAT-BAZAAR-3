import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { artisanProfiles, studentProfiles, users } from '../schemas/index.js';
import { AppError } from '../utils/app-error.js';
import type { SessionUser } from '../types/auth.js';

// Explicit allowlist: hashes and token versions never enter API responses.
export const publicUserColumns = {
  id: users.id,
  email: users.email,
  phone: users.phone,
  role: users.role,
  accountStatus: users.accountStatus,
  preferredLanguage: users.preferredLanguage,
  emailVerified: users.emailVerified,
  phoneVerified: users.phoneVerified,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};
export async function getSessionUser(db: Database, id: string): Promise<SessionUser> {
  const [user] = await db.select(publicUserColumns).from(users).where(eq(users.id, id));
  if (!user) throw new AppError(401, 'Please log in again.', 'UNAUTHENTICATED');
  const table = user.role === 'ARTISAN' ? artisanProfiles : studentProfiles;
  const [profile] =
    user.role === 'ADMIN'
      ? []
      : await db
          .select({
            fullName: table.fullName,
            onboardingCompleted: table.onboardingCompleted,
          })
          .from(table)
          .where(eq(table.userId, id));
  return {
    ...user,
    fullName: profile?.fullName ?? 'Admin',
    onboardingCompleted: user.role === 'ADMIN' || (profile?.onboardingCompleted ?? false),
  };
}

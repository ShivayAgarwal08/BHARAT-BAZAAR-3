import type { users } from '../schemas/index.js';
export type UserRole = typeof users.$inferSelect.role;
export type SafeUser = Omit<typeof users.$inferSelect, 'passwordHash' | 'tokenVersion'>;
export type SessionUser = SafeUser & { fullName: string; onboardingCompleted: boolean };

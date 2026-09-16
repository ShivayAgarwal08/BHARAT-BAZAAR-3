import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database } from '../db/index.js';
import {
  users,
  studentProfiles,
  assistedRegistrationRequests as requests,
} from '../schemas/index.js';
import { publicUserColumns } from './user-service.js';
import { getStudentSkills } from './profile-service.js';
import type {
  assistedFilter,
  studentFilter,
  userFilter,
  assistedSchema,
  statusUpdate,
  reviewSchema,
} from '../validators/admin.js';
import { AppError } from '../utils/app-error.js';

export async function overview(db: Database) {
  // A single query is both a consistent snapshot and safe on transaction-bound connections.
  const result = await db.execute<{
    totalArtisans: number;
    totalStudents: number;
    pendingStudentVerifications: number;
    pendingAssistedRegistrations: number;
  }>(sql`
    select
      (select count(*)::int from ${users} where role = 'ARTISAN') as "totalArtisans",
      (select count(*)::int from ${users} where role = 'STUDENT') as "totalStudents",
      (select count(*)::int from ${studentProfiles} where verification_status = 'PENDING' and onboarding_completed) as "pendingStudentVerifications",
      (select count(*)::int from ${requests} where status = 'PENDING') as "pendingAssistedRegistrations"
  `);
  return result.rows[0];
}
export async function listUsers(db: Database, filter: z.output<typeof userFilter>) {
  const condition = filter.role ? eq(users.role, filter.role) : undefined;
  const items = await db
    .select(publicUserColumns)
    .from(users)
    .where(condition)
    .orderBy(desc(users.createdAt), users.id)
    .limit(filter.limit)
    .offset((filter.page - 1) * filter.limit);
  const [total] = await db.select({ value: count() }).from(users).where(condition);
  return { items, total: total?.value ?? 0, page: filter.page, limit: filter.limit };
}
export async function listStudents(db: Database, filter: z.output<typeof studentFilter>) {
  const condition = filter.verificationStatus
    ? eq(studentProfiles.verificationStatus, filter.verificationStatus)
    : undefined;
  const items = await db
    .select({ profile: studentProfiles, user: publicUserColumns })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(condition)
    .orderBy(desc(studentProfiles.createdAt), studentProfiles.id)
    .limit(filter.limit)
    .offset((filter.page - 1) * filter.limit);
  const [total] = await db.select({ value: count() }).from(studentProfiles).where(condition);
  return { items, total: total?.value ?? 0, page: filter.page, limit: filter.limit };
}
export async function studentDetail(db: Database, id: string) {
  const [item] = await db
    .select({ profile: studentProfiles, user: publicUserColumns })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(eq(studentProfiles.id, id));
  if (!item) throw new AppError(404, 'Student not found.', 'NOT_FOUND');
  return { ...item, skills: await getStudentSkills(db, id) };
}
export async function reviewStudent(
  db: Database,
  id: string,
  status: 'VERIFIED' | 'REJECTED',
  input: z.output<typeof reviewSchema>,
) {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, id))
      .for('update');
    if (!profile) throw new AppError(404, 'Student not found.', 'NOT_FOUND');
    if (profile.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime())
      throw new AppError(409, 'This record changed. Refresh and review again.', 'STALE_RECORD');
    if (!profile.onboardingCompleted)
      throw new AppError(400, 'Onboarding must be completed first.', 'ONBOARDING_REQUIRED');
    const [user] = await tx
      .select({ status: users.accountStatus })
      .from(users)
      .where(eq(users.id, profile.userId))
      .for('update');
    if (user?.status === 'SUSPENDED')
      throw new AppError(409, 'This account is suspended.', 'ACCOUNT_SUSPENDED');
    await tx
      .update(studentProfiles)
      .set({
        verificationStatus: status,
        verificationNotes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, id));
    await tx
      .update(users)
      .set({ accountStatus: status === 'VERIFIED' ? 'ACTIVE' : 'REJECTED', updatedAt: new Date() })
      .where(eq(users.id, profile.userId));
    return studentDetail(tx, id);
  });
}
export async function submitAssistance(db: Database, input: z.output<typeof assistedSchema>) {
  const [result] = await db
    .insert(requests)
    .values(input)
    .returning({ id: requests.id, status: requests.status });
  return result; // Public endpoint never returns contact records.
}
export async function listAssistance(db: Database, filter: z.output<typeof assistedFilter>) {
  const condition = filter.status ? eq(requests.status, filter.status) : undefined;
  const items = await db
    .select()
    .from(requests)
    .where(condition)
    .orderBy(desc(requests.createdAt), requests.id)
    .limit(filter.limit)
    .offset((filter.page - 1) * filter.limit);
  const [total] = await db.select({ value: count() }).from(requests).where(condition);
  return { items, total: total?.value ?? 0, page: filter.page, limit: filter.limit };
}
export async function updateAssistance(
  db: Database,
  id: string,
  adminId: string,
  input: z.output<typeof statusUpdate>,
) {
  const [updated] = await db
    .update(requests)
    .set({ status: input.status, assignedAdminId: adminId, updatedAt: new Date() })
    .where(and(eq(requests.id, id), eq(requests.updatedAt, new Date(input.expectedUpdatedAt))))
    .returning();
  if (!updated)
    throw new AppError(
      409,
      'This record changed or no longer exists. Refresh and try again.',
      'STALE_RECORD',
    );
  return updated;
}

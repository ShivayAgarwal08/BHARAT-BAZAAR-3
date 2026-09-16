import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  artisanProfiles,
  studentProfiles,
  studentSkills,
  skills,
  users,
} from '../schemas/index.js';
import {
  completeArtisanSchema,
  completeStudentSchema,
  type ArtisanInput,
  type StudentInput,
  type SkillSelection,
} from '../validators/profiles.js';
import { AppError } from '../utils/app-error.js';

export async function getArtisanProfile(db: Database, userId: string) {
  const [profile] = await db
    .select()
    .from(artisanProfiles)
    .where(eq(artisanProfiles.userId, userId));
  if (!profile) throw new AppError(404, 'Profile not found.', 'NOT_FOUND');
  return profile;
}
export async function getStudentSkills(db: Database, profileId: string) {
  return db
    .select({
      skillId: skills.id,
      name: skills.name,
      slug: skills.slug,
      category: skills.category,
      proficiencyLevel: studentSkills.proficiencyLevel,
    })
    .from(studentSkills)
    .innerJoin(skills, eq(skills.id, studentSkills.skillId))
    .where(eq(studentSkills.studentProfileId, profileId))
    .orderBy(skills.name);
}
export async function getStudentProfile(db: Database, userId: string) {
  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId));
  if (!profile) throw new AppError(404, 'Profile not found.', 'NOT_FOUND');
  return { ...profile, skills: await getStudentSkills(db, profile.id) };
}
export async function saveArtisanProfile(db: Database, userId: string, input: ArtisanInput) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(artisanProfiles)
      .where(eq(artisanProfiles.userId, userId))
      .for('update');
    if (!current) throw new AppError(404, 'Profile not found.', 'NOT_FOUND');
    const complete = input.onboardingCompleted || current.onboardingCompleted;
    if (complete) completeArtisanSchema.parse({ ...current, ...input });
    const { currentMonthlyRevenue, ...fields } = input;
    const [updated] = await tx
      .update(artisanProfiles)
      .set({
        ...fields,
        onboardingCompleted: complete,
        ...(currentMonthlyRevenue !== undefined
          ? {
              currentMonthlyRevenue:
                currentMonthlyRevenue === null ? null : currentMonthlyRevenue.toFixed(2),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(artisanProfiles.userId, userId))
      .returning();
    if (complete)
      await tx
        .update(users)
        .set({ accountStatus: 'ACTIVE', updatedAt: new Date() })
        .where(eq(users.id, userId));
    return updated;
  });
}
export async function replaceSkills(db: Database, profileId: string, selected: SkillSelection) {
  if (selected.length) {
    const available = await db
      .select({ id: skills.id })
      .from(skills)
      .where(
        and(
          eq(skills.active, true),
          inArray(
            skills.id,
            selected.map((item) => item.skillId),
          ),
        ),
      );
    if (available.length !== selected.length)
      throw new AppError(400, 'Choose available skills.', 'INVALID_SKILLS');
  }
  await db.delete(studentSkills).where(eq(studentSkills.studentProfileId, profileId));
  if (selected.length)
    await db
      .insert(studentSkills)
      .values(selected.map((item) => ({ ...item, studentProfileId: profileId })));
}
export async function saveStudentProfile(db: Database, userId: string, input: StudentInput) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .for('update');
    if (!current) throw new AppError(404, 'Profile not found.', 'NOT_FOUND');
    const complete = input.onboardingCompleted || current.onboardingCompleted;
    if (complete) completeStudentSchema.parse({ ...current, ...input });
    const { skills: selected, expectedMonthlyRate, ...fields } = input;
    if (selected) await replaceSkills(tx, current.id, selected);
    if (complete && !(await getStudentSkills(tx, current.id)).length) {
      throw new AppError(400, 'Select at least one skill.', 'SKILLS_REQUIRED');
    }
    await tx
      .update(studentProfiles)
      .set({
        ...fields,
        onboardingCompleted: complete,
        ...(expectedMonthlyRate !== undefined
          ? {
              expectedMonthlyRate:
                expectedMonthlyRate === null ? null : expectedMonthlyRate.toFixed(2),
            }
          : {}),
        verificationStatus: 'PENDING',
        verificationNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, userId));
    // Material profile/skill edits require a fresh review, including previously verified profiles.
    await tx
      .update(users)
      .set({ accountStatus: 'PENDING', updatedAt: new Date() })
      .where(eq(users.id, userId));
    return getStudentProfile(tx, userId);
  });
}
export async function availableSkills(db: Database) {
  return db
    .select()
    .from(skills)
    .where(eq(skills.active, true))
    .orderBy(skills.category, skills.name);
}

import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  artisanProfiles,
  assignments,
  businessMetrics,
  contracts,
  discoveryReports,
  growthRequestSkills,
  growthRequests,
  milestones,
  skills,
  studentProfiles,
  studentSkills,
  tasks,
  users,
} from '../schemas/index.js';
import { AppError } from '../utils/app-error.js';
import type {
  ContractInput,
  ContractUpdate,
  DiscoveryInput,
  GrowthRequestInput,
  GrowthRequestUpdate,
  MetricInput,
  MilestoneInput,
  TaskInput,
} from '../validators/trial.js';

const activeAssignmentStatuses = [
  'PROPOSED',
  'ACCEPTED',
  'DISCOVERY_IN_PROGRESS',
  'DISCOVERY_SUBMITTED',
  'CONTRACT_PENDING',
  'ACTIVE',
] as const;
type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'STUDENT_ASSIGNED'
  | 'DISCOVERY_IN_PROGRESS'
  | 'CONTRACT_PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

function requireState(
  value: string,
  allowed: readonly string[],
  message: string,
  code = 'INVALID_STATE',
) {
  if (!allowed.includes(value)) throw new AppError(409, message, code);
}
function money(value: number | null | undefined) {
  return value === undefined ? undefined : value === null ? null : value.toFixed(2);
}
async function artisanForUser(db: Database, userId: string) {
  const [profile] = await db
    .select()
    .from(artisanProfiles)
    .where(eq(artisanProfiles.userId, userId));
  if (!profile || !profile.onboardingCompleted)
    throw new AppError(
      403,
      'Complete artisan onboarding before using the trial workflow.',
      'ONBOARDING_REQUIRED',
    );
  return profile;
}
async function studentForUser(db: Database, userId: string) {
  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId));
  if (!profile) throw new AppError(404, 'Student profile not found.', 'NOT_FOUND');
  return profile;
}
async function requestForArtisan(db: Database, id: string, userId: string) {
  const artisan = await artisanForUser(db, userId);
  const [request] = await db
    .select()
    .from(growthRequests)
    .where(and(eq(growthRequests.id, id), eq(growthRequests.artisanProfileId, artisan.id)));
  if (!request) throw new AppError(404, 'Growth request not found.', 'NOT_FOUND');
  return request;
}
async function assignmentWithPeople(db: Database, id: string) {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
  if (!assignment) throw new AppError(404, 'Assignment not found.', 'NOT_FOUND');
  const [[artisan], [student]] = await Promise.all([
    db.select().from(artisanProfiles).where(eq(artisanProfiles.id, assignment.artisanProfileId)),
    db.select().from(studentProfiles).where(eq(studentProfiles.id, assignment.studentProfileId)),
  ]);
  if (!artisan || !student)
    throw new AppError(409, 'Assignment profile data is unavailable.', 'ASSIGNMENT_INVALID');
  return { assignment, artisan, student };
}
async function assignmentForStudent(db: Database, id: string, userId: string) {
  const { assignment, artisan, student } = await assignmentWithPeople(db, id);
  if (student.userId !== userId)
    throw new AppError(403, 'This assignment is not yours.', 'FORBIDDEN');
  return { assignment, artisan, student };
}
async function assignmentForContract(db: Database, contractId: string) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) throw new AppError(404, 'Contract not found.', 'NOT_FOUND');
  const people = await assignmentWithPeople(db, contract.assignmentId);
  return { contract, ...people };
}
async function requestSkills(db: Database, requestId: string) {
  return db
    .select({ id: skills.id, name: skills.name, slug: skills.slug, category: skills.category })
    .from(growthRequestSkills)
    .innerJoin(skills, eq(skills.id, growthRequestSkills.skillId))
    .where(eq(growthRequestSkills.growthRequestId, requestId))
    .orderBy(skills.name);
}
async function taskWithContract(db: Database, taskId: string) {
  const [row] = await db
    .select({ task: tasks, milestone: milestones, contract: contracts })
    .from(tasks)
    .innerJoin(milestones, eq(milestones.id, tasks.milestoneId))
    .innerJoin(contracts, eq(contracts.id, milestones.contractId))
    .where(eq(tasks.id, taskId));
  if (!row) throw new AppError(404, 'Task not found.', 'NOT_FOUND');
  const people = await assignmentWithPeople(db, row.contract.assignmentId);
  return { ...row, ...people };
}
async function recalibrateMilestone(tx: Database, milestoneId: string) {
  const rows = await tx
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.milestoneId, milestoneId));
  if (!rows.length) return;
  const allApproved = rows.every((row) => row.status === 'APPROVED' || row.status === 'COMPLETED');
  const anySubmitted = rows.some((row) => row.status === 'SUBMITTED');
  const anyStarted = rows.some(
    (row) => row.status === 'IN_PROGRESS' || row.status === 'REVISION_REQUIRED',
  );
  await tx
    .update(milestones)
    .set({
      status: allApproved
        ? 'COMPLETED'
        : anySubmitted
          ? 'SUBMITTED'
          : anyStarted
            ? 'IN_PROGRESS'
            : 'NOT_STARTED',
      updatedAt: new Date(),
    })
    .where(eq(milestones.id, milestoneId));
}
function textIncludesLanguage(languages: string[], wanted: 'EN' | 'HI') {
  const terms = wanted === 'EN' ? ['en', 'english'] : ['hi', 'hindi', 'हिंदी', 'हिन्दी'];
  return languages.some((language) => terms.includes(language.trim().toLowerCase()));
}
function duplicateMetric(error: unknown) {
  let cause = error;
  for (let i = 0; i < 5 && cause instanceof Error; i += 1) {
    if ('code' in cause && cause.code === '23505') return true;
    cause = cause.cause;
  }
  return false;
}

export async function listGrowthRequests(
  db: Database,
  userId: string,
  filter: { page: number; limit: number; status?: RequestStatus },
) {
  const artisan = await artisanForUser(db, userId);
  const condition = filter.status
    ? and(eq(growthRequests.artisanProfileId, artisan.id), eq(growthRequests.status, filter.status))
    : eq(growthRequests.artisanProfileId, artisan.id);
  const items = await db
    .select()
    .from(growthRequests)
    .where(condition)
    .orderBy(desc(growthRequests.updatedAt))
    .limit(filter.limit)
    .offset((filter.page - 1) * filter.limit);
  const [total] = await db.select({ value: count() }).from(growthRequests).where(condition);
  return { items, total: total?.value ?? 0, page: filter.page, limit: filter.limit };
}
export async function createGrowthRequest(db: Database, userId: string, input: GrowthRequestInput) {
  const artisan = await artisanForUser(db, userId);
  return db.transaction(async (tx) => {
    const available = await tx
      .select({ id: skills.id })
      .from(skills)
      .where(and(eq(skills.active, true), inArray(skills.id, input.skillIds)));
    if (available.length !== input.skillIds.length) {
      throw new AppError(400, 'Choose active skills only.', 'INVALID_SKILLS');
    }
    const [created] = await tx
      .insert(growthRequests)
      .values({
        artisanProfileId: artisan.id,
        title: input.title,
        problemDescription: input.problemDescription,
        preferredLanguage: input.preferredLanguage,
        preferredDurationMonths: input.preferredDurationMonths,
        currentMonthlyRevenue: money(input.currentMonthlyRevenue),
        currentMonthlyOrders: input.currentMonthlyOrders,
        currentOnlineOrders: input.currentOnlineOrders,
        currentFollowers: input.currentFollowers,
        currentProductsListed: input.currentProductsListed,
      })
      .returning();
    if (!created) throw new Error('Growth request creation failed');
    await tx
      .insert(growthRequestSkills)
      .values(input.skillIds.map((skillId) => ({ growthRequestId: created.id, skillId })));
    return growthRequestDetail(tx, created.id);
  });
}
export async function updateGrowthRequest(
  db: Database,
  userId: string,
  id: string,
  input: GrowthRequestUpdate,
) {
  const current = await requestForArtisan(db, id, userId);
  requireState(current.status, ['DRAFT'], 'Only draft requests can be edited.');
  return db.transaction(async (tx) => {
    const { skillIds, currentMonthlyRevenue, ...fields } = input;
    await tx
      .update(growthRequests)
      .set({
        ...fields,
        ...(currentMonthlyRevenue !== undefined
          ? { currentMonthlyRevenue: money(currentMonthlyRevenue) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(growthRequests.id, id));
    if (skillIds) {
      const available = await tx
        .select({ id: skills.id })
        .from(skills)
        .where(and(eq(skills.active, true), inArray(skills.id, skillIds)));
      if (available.length !== skillIds.length)
        throw new AppError(400, 'Choose active skills only.', 'INVALID_SKILLS');
      await tx.delete(growthRequestSkills).where(eq(growthRequestSkills.growthRequestId, id));
      await tx
        .insert(growthRequestSkills)
        .values(skillIds.map((skillId) => ({ growthRequestId: id, skillId })));
    }
    return growthRequestDetail(tx, id);
  });
}
export async function submitGrowthRequest(db: Database, userId: string, id: string) {
  const request = await requestForArtisan(db, id, userId);
  requireState(request.status, ['DRAFT'], 'Only draft requests can be submitted.');
  const selected = await requestSkills(db, id);
  if (!selected.length) throw new AppError(400, 'Select at least one skill.', 'SKILLS_REQUIRED');
  const [updated] = await db
    .update(growthRequests)
    .set({ status: 'SUBMITTED', submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(growthRequests.id, id))
    .returning();
  return updated;
}
export async function growthRequestDetail(db: Database, id: string) {
  const [request] = await db.select().from(growthRequests).where(eq(growthRequests.id, id));
  if (!request) throw new AppError(404, 'Growth request not found.', 'NOT_FOUND');
  const [skillRows, assignmentRows] = await Promise.all([
    requestSkills(db, id),
    db
      .select()
      .from(assignments)
      .where(eq(assignments.growthRequestId, id))
      .orderBy(desc(assignments.createdAt)),
  ]);
  const assignment = assignmentRows[0];
  const discovery = assignment
    ? (
        await db
          .select()
          .from(discoveryReports)
          .where(eq(discoveryReports.assignmentId, assignment.id))
      )[0]
    : undefined;
  const contract = assignment
    ? (await db.select().from(contracts).where(eq(contracts.assignmentId, assignment.id)))[0]
    : undefined;
  return {
    request,
    skills: skillRows,
    assignment: assignment ?? null,
    discovery: discovery ?? null,
    contract: contract ?? null,
  };
}
export async function artisanGrowthRequestDetail(db: Database, userId: string, id: string) {
  await requestForArtisan(db, id, userId);
  return growthRequestDetail(db, id);
}
export async function adminListGrowthRequests(
  db: Database,
  filter: { page: number; limit: number; status?: RequestStatus },
) {
  const condition = filter.status ? eq(growthRequests.status, filter.status) : undefined;
  const items = await db
    .select({ request: growthRequests, artisan: artisanProfiles })
    .from(growthRequests)
    .innerJoin(artisanProfiles, eq(artisanProfiles.id, growthRequests.artisanProfileId))
    .where(condition)
    .orderBy(desc(growthRequests.updatedAt))
    .limit(filter.limit)
    .offset((filter.page - 1) * filter.limit);
  const [total] = await db.select({ value: count() }).from(growthRequests).where(condition);
  return { items, total: total?.value ?? 0, page: filter.page, limit: filter.limit };
}
export async function adminReviewGrowthRequest(
  db: Database,
  id: string,
  status: 'UNDER_REVIEW' | 'CANCELLED',
) {
  const [request] = await db.select().from(growthRequests).where(eq(growthRequests.id, id));
  if (!request) throw new AppError(404, 'Growth request not found.', 'NOT_FOUND');
  requireState(
    request.status,
    status === 'UNDER_REVIEW'
      ? ['SUBMITTED', 'UNDER_REVIEW']
      : ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'],
    'This request cannot be reviewed now.',
  );
  const [updated] = await db
    .update(growthRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(growthRequests.id, id))
    .returning();
  return updated;
}
export async function rankedCandidates(db: Database, requestId: string) {
  const [request] = await db.select().from(growthRequests).where(eq(growthRequests.id, requestId));
  if (!request) throw new AppError(404, 'Growth request not found.', 'NOT_FOUND');
  const required = await requestSkills(db, requestId);
  const rows = await db
    .select({ profile: studentProfiles, user: users })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(
      and(
        eq(studentProfiles.onboardingCompleted, true),
        eq(studentProfiles.verificationStatus, 'VERIFIED'),
        eq(users.accountStatus, 'ACTIVE'),
      ),
    );
  const ids = rows.map((row) => row.profile.id);
  const links = ids.length
    ? await db.select().from(studentSkills).where(inArray(studentSkills.studentProfileId, ids))
    : [];
  return rows
    .map(({ profile }) => {
      const ownSkills = new Set(
        links.filter((link) => link.studentProfileId === profile.id).map((link) => link.skillId),
      );
      const overlap = required.filter((skill) => ownSkills.has(skill.id));
      const languageScore = textIncludesLanguage(profile.languages, request.preferredLanguage)
        ? 40
        : 0;
      const skillScore = Math.round((overlap.length / required.length) * 40);
      const availabilityScore = (profile.weeklyAvailabilityHours ?? 0) >= 5 ? 20 : 0;
      return {
        studentProfileId: profile.id,
        fullName: profile.fullName,
        college: profile.college,
        weeklyAvailabilityHours: profile.weeklyAvailabilityHours,
        languages: profile.languages,
        matchedSkills: overlap,
        score: languageScore + skillScore + availabilityScore,
        explanation: {
          languageCompatibility: languageScore,
          requiredSkillOverlap: skillScore,
          availability: availabilityScore,
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName));
}
export async function assignStudent(
  db: Database,
  adminId: string,
  requestId: string,
  studentProfileId: string,
) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(growthRequests)
      .where(eq(growthRequests.id, requestId))
      .for('update');
    if (!request) throw new AppError(404, 'Growth request not found.', 'NOT_FOUND');
    requireState(
      request.status,
      ['SUBMITTED', 'UNDER_REVIEW'],
      'Review the request before assigning a student.',
    );
    const [student] = await tx
      .select({ profile: studentProfiles, user: users })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(eq(studentProfiles.id, studentProfileId));
    if (
      !student ||
      !student.profile.onboardingCompleted ||
      student.profile.verificationStatus !== 'VERIFIED' ||
      student.user.accountStatus !== 'ACTIVE'
    ) {
      throw new AppError(
        400,
        'Only verified active students can be assigned.',
        'STUDENT_NOT_ASSIGNABLE',
      );
    }
    const existing = await tx
      .select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.growthRequestId, requestId),
          inArray(assignments.status, [...activeAssignmentStatuses]),
        ),
      );
    if (existing.length)
      throw new AppError(
        409,
        'This request already has an active assignment.',
        'ASSIGNMENT_EXISTS',
      );
    const [created] = await tx
      .insert(assignments)
      .values({
        growthRequestId: requestId,
        artisanProfileId: request.artisanProfileId,
        studentProfileId,
        assignedByAdminId: adminId,
      })
      .returning();
    await tx
      .update(growthRequests)
      .set({ status: 'STUDENT_ASSIGNED', updatedAt: new Date() })
      .where(eq(growthRequests.id, requestId));
    return created;
  });
}
export async function studentAssignments(db: Database, userId: string) {
  const profile = await studentForUser(db, userId);
  return db
    .select({ assignment: assignments, request: growthRequests, artisan: artisanProfiles })
    .from(assignments)
    .innerJoin(growthRequests, eq(growthRequests.id, assignments.growthRequestId))
    .innerJoin(artisanProfiles, eq(artisanProfiles.id, assignments.artisanProfileId))
    .where(eq(assignments.studentProfileId, profile.id))
    .orderBy(desc(assignments.updatedAt));
}
export async function acceptAssignment(db: Database, userId: string, id: string) {
  const { assignment } = await assignmentForStudent(db, id, userId);
  requireState(assignment.status, ['PROPOSED'], 'This assignment cannot be accepted.');
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(assignments)
      .set({ status: 'ACCEPTED', studentAcceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    await tx
      .update(growthRequests)
      .set({ status: 'DISCOVERY_IN_PROGRESS', updatedAt: new Date() })
      .where(eq(growthRequests.id, assignment.growthRequestId));
    return updated;
  });
}
export async function getDiscoveryForStudent(db: Database, userId: string, assignmentId: string) {
  await assignmentForStudent(db, assignmentId, userId);
  const [report] = await db
    .select()
    .from(discoveryReports)
    .where(eq(discoveryReports.assignmentId, assignmentId));
  return report ?? null;
}
export async function saveDiscovery(
  db: Database,
  userId: string,
  assignmentId: string,
  input: DiscoveryInput,
  submit = false,
) {
  const { assignment } = await assignmentForStudent(db, assignmentId, userId);
  requireState(
    assignment.status,
    ['ACCEPTED', 'DISCOVERY_IN_PROGRESS'],
    'Discovery is not available for this assignment.',
  );
  return db.transaction(async (tx) => {
    const values = {
      ...input,
      additionalNotes: input.additionalNotes ?? null,
      status: submit ? ('SUBMITTED' as const) : ('DRAFT' as const),
      submittedAt: submit ? new Date() : null,
      updatedAt: new Date(),
    };
    const [existing] = await tx
      .select()
      .from(discoveryReports)
      .where(eq(discoveryReports.assignmentId, assignmentId))
      .for('update');
    const [report] = existing
      ? await tx
          .update(discoveryReports)
          .set(values)
          .where(eq(discoveryReports.id, existing.id))
          .returning()
      : await tx
          .insert(discoveryReports)
          .values({ assignmentId, ...values })
          .returning();
    if (submit) {
      await tx
        .update(assignments)
        .set({ status: 'DISCOVERY_SUBMITTED', updatedAt: new Date() })
        .where(eq(assignments.id, assignmentId));
    } else if (assignment.status === 'ACCEPTED') {
      await tx
        .update(assignments)
        .set({ status: 'DISCOVERY_IN_PROGRESS', updatedAt: new Date() })
        .where(eq(assignments.id, assignmentId));
    }
    return report;
  });
}
export async function reviewDiscovery(
  db: Database,
  assignmentId: string,
  action: 'REVIEW' | 'REVISION_REQUIRED',
  adminFeedback?: string | null,
) {
  return db.transaction(async (tx) => {
    const [report] = await tx
      .select()
      .from(discoveryReports)
      .where(eq(discoveryReports.assignmentId, assignmentId))
      .for('update');
    if (!report) throw new AppError(404, 'Discovery report not found.', 'NOT_FOUND');
    requireState(report.status, ['SUBMITTED'], 'Only submitted discovery reports can be reviewed.');
    const [assignment] = await tx
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .for('update');
    if (!assignment) throw new AppError(404, 'Assignment not found.', 'NOT_FOUND');
    const reviewed = action === 'REVIEW';
    const [updated] = await tx
      .update(discoveryReports)
      .set({
        status: reviewed ? 'REVIEWED' : 'REVISION_REQUIRED',
        adminFeedback: adminFeedback ?? null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(discoveryReports.id, report.id))
      .returning();
    await tx
      .update(assignments)
      .set({
        status: reviewed ? 'CONTRACT_PENDING' : 'DISCOVERY_IN_PROGRESS',
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, assignmentId));
    await tx
      .update(growthRequests)
      .set({
        status: reviewed ? 'CONTRACT_PENDING' : 'DISCOVERY_IN_PROGRESS',
        updatedAt: new Date(),
      })
      .where(eq(growthRequests.id, assignment.growthRequestId));
    return updated;
  });
}
export async function getContractForAssignment(db: Database, assignmentId: string) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.assignmentId, assignmentId));
  return contract ?? null;
}
export async function createContract(db: Database, adminId: string, input: ContractInput) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx
      .select()
      .from(assignments)
      .where(eq(assignments.id, input.assignmentId))
      .for('update');
    if (!assignment) throw new AppError(404, 'Assignment not found.', 'NOT_FOUND');
    const [report] = await tx
      .select()
      .from(discoveryReports)
      .where(eq(discoveryReports.assignmentId, input.assignmentId));
    if (!report || report.status !== 'REVIEWED')
      throw new AppError(
        409,
        'Discovery must be reviewed before creating a contract.',
        'DISCOVERY_NOT_REVIEWED',
      );
    const [existing] = await tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.assignmentId, input.assignmentId));
    if (existing)
      throw new AppError(409, 'A contract already exists for this assignment.', 'CONTRACT_EXISTS');
    const [created] = await tx
      .insert(contracts)
      .values({
        assignmentId: input.assignmentId,
        title: input.title,
        problemStatement: input.problemStatement,
        responsibilities: input.responsibilities,
        deliverables: input.deliverables,
        growthTargets: input.growthTargets,
        exclusions: input.exclusions,
        startDate: input.startDate,
        endDate: input.endDate,
        platformStudentStipend: money(input.platformStudentStipend),
        createdByAdminId: adminId,
      })
      .returning();
    return created;
  });
}
export async function updateContract(db: Database, id: string, input: ContractUpdate) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(contracts).where(eq(contracts.id, id)).for('update');
    if (!current) throw new AppError(404, 'Contract not found.', 'NOT_FOUND');
    requireState(
      current.status,
      ['DRAFT', 'AWAITING_ACCEPTANCE'],
      'Only unactivated contracts can be changed.',
    );
    const [updated] = await tx
      .update(contracts)
      .set({
        ...input,
        platformStudentStipend: money(input.platformStudentStipend),
        version: current.version + 1,
        status: 'DRAFT',
        artisanAcceptedVersion: null,
        studentAcceptedVersion: null,
        artisanAcceptedAt: null,
        studentAcceptedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  });
}
export async function sendContract(db: Database, id: string) {
  const [current] = await db.select().from(contracts).where(eq(contracts.id, id));
  if (!current) throw new AppError(404, 'Contract not found.', 'NOT_FOUND');
  requireState(current.status, ['DRAFT'], 'Only draft contracts can be sent.');
  const [updated] = await db
    .update(contracts)
    .set({ status: 'AWAITING_ACCEPTANCE', updatedAt: new Date() })
    .where(eq(contracts.id, id))
    .returning();
  return updated;
}
export async function acceptContract(
  db: Database,
  id: string,
  userId: string,
  actorRole: 'ARTISAN' | 'STUDENT',
) {
  return db.transaction(async (tx) => {
    const [contract] = await tx.select().from(contracts).where(eq(contracts.id, id)).for('update');
    if (!contract) throw new AppError(404, 'Contract not found.', 'NOT_FOUND');
    requireState(
      contract.status,
      ['AWAITING_ACCEPTANCE'],
      'This contract is not ready for acceptance.',
    );
    const { assignment, artisan, student } = await assignmentWithPeople(tx, contract.assignmentId);
    if (actorRole === 'ARTISAN' && artisan.userId !== userId)
      throw new AppError(403, 'This contract is not yours.', 'FORBIDDEN');
    if (actorRole === 'STUDENT' && student.userId !== userId)
      throw new AppError(403, 'This contract is not yours.', 'FORBIDDEN');
    const now = new Date();
    const patch =
      actorRole === 'ARTISAN'
        ? { artisanAcceptedVersion: contract.version, artisanAcceptedAt: now }
        : { studentAcceptedVersion: contract.version, studentAcceptedAt: now };
    const artisanVersion =
      actorRole === 'ARTISAN' ? contract.version : contract.artisanAcceptedVersion;
    const studentVersion =
      actorRole === 'STUDENT' ? contract.version : contract.studentAcceptedVersion;
    const activate = artisanVersion === contract.version && studentVersion === contract.version;
    const [updated] = await tx
      .update(contracts)
      .set({
        ...patch,
        ...(activate ? { status: 'ACTIVE' as const, activatedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(contracts.id, id))
      .returning();
    if (activate) {
      await tx
        .update(assignments)
        .set({ status: 'ACTIVE', updatedAt: now })
        .where(eq(assignments.id, assignment.id));
      await tx
        .update(growthRequests)
        .set({ status: 'ACTIVE', updatedAt: now })
        .where(eq(growthRequests.id, assignment.growthRequestId));
    }
    return updated;
  });
}
export async function contractForArtisan(db: Database, userId: string, id: string) {
  const { contract, artisan } = await assignmentForContract(db, id);
  if (artisan.userId !== userId)
    throw new AppError(403, 'This contract is not yours.', 'FORBIDDEN');
  return contract;
}
export async function contractForStudent(db: Database, userId: string, id: string) {
  const { contract, student } = await assignmentForContract(db, id);
  if (student.userId !== userId)
    throw new AppError(403, 'This contract is not yours.', 'FORBIDDEN');
  return contract;
}
export async function createMilestone(db: Database, contractId: string, input: MilestoneInput) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) throw new AppError(404, 'Contract not found.', 'NOT_FOUND');
  requireState(
    contract.status,
    ['DRAFT', 'AWAITING_ACCEPTANCE', 'ACTIVE'],
    'Milestones cannot be added to this contract.',
  );
  const [created] = await db
    .insert(milestones)
    .values({ contractId, ...input })
    .returning();
  return created;
}
export async function createTask(db: Database, milestoneId: string, input: TaskInput) {
  const [milestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
  if (!milestone) throw new AppError(404, 'Milestone not found.', 'NOT_FOUND');
  const [created] = await db
    .insert(tasks)
    .values({ milestoneId, ...input })
    .returning();
  return created;
}
export async function tasksForContract(db: Database, contractId: string) {
  const milestoneRows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.contractId, contractId))
    .orderBy(asc(milestones.sequence));
  const milestoneIds = milestoneRows.map((milestone) => milestone.id);
  const taskRows = milestoneIds.length
    ? await db
        .select()
        .from(tasks)
        .where(inArray(tasks.milestoneId, milestoneIds))
        .orderBy(asc(tasks.dueDate))
    : [];
  return milestoneRows.map((milestone) => ({
    ...milestone,
    tasks: taskRows.filter((task) => task.milestoneId === milestone.id),
  }));
}
export async function tasksForArtisan(db: Database, userId: string, contractId: string) {
  await contractForArtisan(db, userId, contractId);
  return tasksForContract(db, contractId);
}
export async function tasksForStudent(db: Database, userId: string, contractId: string) {
  await contractForStudent(db, userId, contractId);
  return tasksForContract(db, contractId);
}
export async function submitStudentTask(
  db: Database,
  userId: string,
  taskId: string,
  input: { status: 'TODO' | 'IN_PROGRESS' | 'SUBMITTED'; submissionNotes?: string | null },
) {
  const row = await taskWithContract(db, taskId);
  if (row.student.userId !== userId)
    throw new AppError(403, 'This task is not assigned to you.', 'FORBIDDEN');
  requireState(row.contract.status, ['ACTIVE'], 'Tasks can only be updated on an active contract.');
  if (input.status === 'TODO' && row.task.status !== 'TODO')
    throw new AppError(409, 'Started work cannot be reset to TODO.', 'INVALID_STATE');
  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(tasks)
      .set({
        status: input.status,
        submissionNotes: input.submissionNotes ?? null,
        ...(input.status === 'SUBMITTED' ? { submittedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId))
      .returning();
    await recalibrateMilestone(tx, row.milestone.id);
    return updated;
  });
}
export async function artisanReviewTask(
  db: Database,
  userId: string,
  taskId: string,
  input: { action: 'APPROVE' | 'REVISION_REQUIRED'; artisanFeedback?: string | null },
) {
  const row = await taskWithContract(db, taskId);
  if (row.artisan.userId !== userId)
    throw new AppError(403, 'This task is not part of your contract.', 'FORBIDDEN');
  requireState(row.task.status, ['SUBMITTED'], 'Only submitted tasks can be reviewed.');
  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(tasks)
      .set({
        status: input.action === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUIRED',
        artisanFeedback: input.artisanFeedback ?? null,
        ...(input.action === 'APPROVE' ? { approvedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId))
      .returning();
    await recalibrateMilestone(tx, row.milestone.id);
    return updated;
  });
}
export async function listMetrics(db: Database, contractId: string) {
  return db
    .select()
    .from(businessMetrics)
    .where(eq(businessMetrics.contractId, contractId))
    .orderBy(asc(businessMetrics.measurementDate));
}
export async function addMetric(
  db: Database,
  contractId: string,
  userId: string,
  input: MetricInput,
) {
  try {
    const [created] = await db
      .insert(businessMetrics)
      .values({
        contractId,
        recordedByUserId: userId,
        type: input.type,
        measurementDate: input.measurementDate,
        monthlyRevenue: money(input.monthlyRevenue),
        monthlyOrders: input.monthlyOrders,
        onlineOrders: input.onlineOrders,
        socialFollowers: input.socialFollowers,
        customerEnquiries: input.customerEnquiries,
        productsListedOnline: input.productsListedOnline,
        notes: input.notes ?? null,
      })
      .returning();
    return created;
  } catch (error) {
    if (duplicateMetric(error))
      throw new AppError(
        409,
        'A baseline or final metric already exists for this contract.',
        'METRIC_EXISTS',
      );
    throw error;
  }
}
export async function metricsForArtisan(db: Database, userId: string, contractId: string) {
  await contractForArtisan(db, userId, contractId);
  return listMetrics(db, contractId);
}
export async function metricsForStudent(db: Database, userId: string, contractId: string) {
  await contractForStudent(db, userId, contractId);
  return listMetrics(db, contractId);
}
export async function addMetricForArtisan(
  db: Database,
  userId: string,
  contractId: string,
  input: MetricInput,
) {
  await contractForArtisan(db, userId, contractId);
  return addMetric(db, contractId, userId, input);
}
export async function addMetricForStudent(
  db: Database,
  userId: string,
  contractId: string,
  input: MetricInput,
) {
  await contractForStudent(db, userId, contractId);
  return addMetric(db, contractId, userId, input);
}
export async function adminAssignmentProgress(db: Database, assignmentId: string) {
  const people = await assignmentWithPeople(db, assignmentId);
  const [request] = await db
    .select()
    .from(growthRequests)
    .where(eq(growthRequests.id, people.assignment.growthRequestId));
  const [discovery, contract] = await Promise.all([
    db.select().from(discoveryReports).where(eq(discoveryReports.assignmentId, assignmentId)),
    db.select().from(contracts).where(eq(contracts.assignmentId, assignmentId)),
  ]);
  const taskGroups = contract[0] ? await tasksForContract(db, contract[0].id) : [];
  const metricRows = contract[0] ? await listMetrics(db, contract[0].id) : [];
  return {
    ...people,
    request: request ?? null,
    discovery: discovery[0] ?? null,
    contract: contract[0] ?? null,
    milestones: taskGroups,
    metrics: metricRows,
  };
}

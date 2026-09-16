import { and, asc, avg, count, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  artisanProfiles,
  assignments,
  businessMetrics,
  contractCompletionRecords,
  contracts,
  discoveryReports,
  disputes,
  growthRequests,
  marketplaceRequests,
  paymentProofs,
  paymentRecords,
  reviews,
  studentProfiles,
  studentSkills,
  skills,
  tasks,
  milestones,
  users,
} from '../schemas/index.js';
import { AppError } from '../utils/app-error.js';
import type { MarketplaceRequestInput, PaidContractInput } from '../validators/marketplace.js';

const formatMoney = (value: number | null | undefined) => (value == null ? null : value.toFixed(2));
async function artisan(db: Database, userId: string) {
  const [p] = await db.select().from(artisanProfiles).where(eq(artisanProfiles.userId, userId));
  if (!p?.onboardingCompleted)
    throw new AppError(403, 'Complete artisan onboarding first.', 'ONBOARDING_REQUIRED');
  return p;
}
async function student(db: Database, userId: string) {
  const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  if (!p) throw new AppError(404, 'Student profile not found.', 'NOT_FOUND');
  return p;
}
async function peopleForContract(db: Database, contractId: string) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) throw new AppError(404, 'Contract not found.', 'NOT_FOUND');
  const [assignment] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, contract.assignmentId));
  if (!assignment) throw new AppError(409, 'Assignment unavailable.', 'ASSIGNMENT_INVALID');
  const [[a], [s]] = await Promise.all([
    db.select().from(artisanProfiles).where(eq(artisanProfiles.id, assignment.artisanProfileId)),
    db.select().from(studentProfiles).where(eq(studentProfiles.id, assignment.studentProfileId)),
  ]);
  if (!a || !s) throw new AppError(409, 'Contract parties unavailable.', 'ASSIGNMENT_INVALID');
  return { contract, assignment, artisan: a, student: s };
}
async function participantContract(db: Database, contractId: string, userId: string) {
  const data = await peopleForContract(db, contractId);
  if (data.artisan.userId !== userId && data.student.userId !== userId)
    throw new AppError(403, 'This contract is not yours.', 'FORBIDDEN');
  return data;
}
async function paidEligibility(db: Database, profile: typeof artisanProfiles.$inferSelect) {
  if (profile.marketplaceEligible) return true;
  const [row] = await db
    .select({ value: count() })
    .from(contracts)
    .innerJoin(assignments, eq(assignments.id, contracts.assignmentId))
    .where(
      and(
        eq(assignments.artisanProfileId, profile.id),
        eq(assignments.type, 'FREE_TRIAL'),
        eq(contracts.status, 'COMPLETED'),
      ),
    );
  return (row?.value ?? 0) > 0;
}
function duplicate(error: unknown) {
  let item = error;
  for (let i = 0; i < 4 && item instanceof Error; i += 1) {
    if ('code' in item && item.code === '23505') return true;
    item = item.cause;
  }
  return false;
}

export async function marketplaceStudents(
  db: Database,
  filter: {
    page: number;
    limit: number;
    skillId?: string;
    language?: string;
    minimumRating?: number;
    availability?: number;
    maximumMonthlyRate?: number;
  },
) {
  const rows = await db
    .select({ profile: studentProfiles })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(
      and(
        eq(studentProfiles.onboardingCompleted, true),
        eq(studentProfiles.verificationStatus, 'VERIFIED'),
        eq(users.accountStatus, 'ACTIVE'),
      ),
    );
  const ids = rows.map((r) => r.profile.id);
  const links = ids.length
    ? await db.select().from(studentSkills).where(inArray(studentSkills.studentProfileId, ids))
    : [];
  const skillRows = links.length
    ? await db
        .select()
        .from(skills)
        .where(
          inArray(
            skills.id,
            links.map((x) => x.skillId),
          ),
        )
    : [];
  const ratings = ids.length
    ? await db
        .select({
          reviewedUserId: reviews.reviewedUserId,
          average: avg(reviews.overallRating),
          total: count(),
        })
        .from(reviews)
        .innerJoin(users, eq(users.id, reviews.reviewedUserId))
        .where(
          and(
            eq(reviews.hiddenByAdmin, false),
            inArray(
              users.id,
              rows.map((r) => r.profile.userId),
            ),
          ),
        )
        .groupBy(reviews.reviewedUserId)
    : [];
  const items = rows
    .map(({ profile }) => {
      const selected = links
        .filter((x) => x.studentProfileId === profile.id)
        .map((x) => ({ ...x, skill: skillRows.find((s) => s.id === x.skillId)! }));
      const rate = ratings.find((r) => r.reviewedUserId === profile.userId);
      return {
        id: profile.id,
        fullName: profile.fullName,
        college: profile.college,
        course: profile.course,
        languages: profile.languages,
        weeklyAvailabilityHours: profile.weeklyAvailabilityHours,
        expectedMonthlyRate: profile.expectedMonthlyRate,
        portfolioUrl: profile.portfolioUrl,
        skills: selected.map((x) => ({
          id: x.skill.id,
          name: x.skill.name,
          proficiencyLevel: x.proficiencyLevel,
        })),
        averageRating: rate?.average ? Number(rate.average) : null,
        completedProjectCount: 0,
      };
    })
    .filter(
      (item) =>
        (!filter.skillId || item.skills.some((s) => s.id === filter.skillId)) &&
        (!filter.language ||
          item.languages.some((l) => l.toLowerCase() === filter.language!.toLowerCase())) &&
        (!filter.minimumRating || (item.averageRating ?? 0) >= filter.minimumRating) &&
        (!filter.availability || (item.weeklyAvailabilityHours ?? 0) >= filter.availability) &&
        (!filter.maximumMonthlyRate ||
          Number(item.expectedMonthlyRate ?? Number.MAX_SAFE_INTEGER) <= filter.maximumMonthlyRate),
    );
  return {
    items: items.slice((filter.page - 1) * filter.limit, filter.page * filter.limit),
    total: items.length,
    page: filter.page,
    limit: filter.limit,
  };
}
export async function marketplaceStudent(db: Database, id: string) {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id));
  if (!profile || !profile.onboardingCompleted || profile.verificationStatus !== 'VERIFIED')
    throw new AppError(404, 'Student not found.', 'NOT_FOUND');
  const links = await db.select().from(studentSkills).where(eq(studentSkills.studentProfileId, id));
  const s = links.length
    ? await db
        .select()
        .from(skills)
        .where(
          inArray(
            skills.id,
            links.map((x) => x.skillId),
          ),
        )
    : [];
  return {
    id: profile.id,
    fullName: profile.fullName,
    college: profile.college,
    course: profile.course,
    languages: profile.languages,
    weeklyAvailabilityHours: profile.weeklyAvailabilityHours,
    expectedMonthlyRate: profile.expectedMonthlyRate,
    portfolioUrl: profile.portfolioUrl,
    skills: links.map((x) => ({
      name: s.find((k) => k.id === x.skillId)?.name,
      proficiencyLevel: x.proficiencyLevel,
    })),
  };
}
export async function createMarketplaceRequest(
  db: Database,
  userId: string,
  input: MarketplaceRequestInput,
) {
  const a = await artisan(db, userId);
  if (!(await paidEligibility(db, a)))
    throw new AppError(
      403,
      'Complete a free trial before using the marketplace.',
      'MARKETPLACE_INELIGIBLE',
    );
  const [target] = await db
    .select()
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(eq(studentProfiles.id, input.studentProfileId));
  if (
    !target ||
    !target.student_profiles.onboardingCompleted ||
    target.student_profiles.verificationStatus !== 'VERIFIED' ||
    target.users.accountStatus !== 'ACTIVE'
  )
    throw new AppError(400, 'This student is not available.', 'STUDENT_NOT_AVAILABLE');
  try {
    const [created] = await db
      .insert(marketplaceRequests)
      .values({
        artisanProfileId: a.id,
        studentProfileId: input.studentProfileId,
        message: input.message,
        requestedServices: input.requestedServices,
        proposedDurationMonths: input.proposedDurationMonths,
        proposedMonthlyBudget: formatMoney(input.proposedMonthlyBudget),
      })
      .returning();
    return created;
  } catch (e) {
    if (duplicate(e))
      throw new AppError(
        409,
        'A pending request already exists for this student.',
        'REQUEST_EXISTS',
      );
    throw e;
  }
}
export async function artisanMarketplaceRequests(db: Database, userId: string) {
  const a = await artisan(db, userId);
  return db
    .select({ request: marketplaceRequests, student: studentProfiles })
    .from(marketplaceRequests)
    .innerJoin(studentProfiles, eq(studentProfiles.id, marketplaceRequests.studentProfileId))
    .where(eq(marketplaceRequests.artisanProfileId, a.id))
    .orderBy(desc(marketplaceRequests.createdAt));
}
export async function studentMarketplaceRequests(db: Database, userId: string) {
  const s = await student(db, userId);
  return db
    .select({ request: marketplaceRequests, artisan: artisanProfiles })
    .from(marketplaceRequests)
    .innerJoin(artisanProfiles, eq(artisanProfiles.id, marketplaceRequests.artisanProfileId))
    .where(eq(marketplaceRequests.studentProfileId, s.id))
    .orderBy(desc(marketplaceRequests.createdAt));
}
export async function respondMarketplaceRequest(
  db: Database,
  userId: string,
  id: string,
  action: 'ACCEPT' | 'DECLINE',
  response?: string | null,
) {
  const s = await student(db, userId);
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(marketplaceRequests)
      .where(eq(marketplaceRequests.id, id))
      .for('update');
    if (!request || request.studentProfileId !== s.id)
      throw new AppError(403, 'This request is not yours.', 'FORBIDDEN');
    if (request.status !== 'PENDING')
      throw new AppError(409, 'This request has already been handled.', 'INVALID_STATE');
    const now = new Date();
    if (action === 'DECLINE')
      return (
        await tx
          .update(marketplaceRequests)
          .set({
            status: 'DECLINED',
            studentResponse: response ?? null,
            respondedAt: now,
            updatedAt: now,
          })
          .where(eq(marketplaceRequests.id, id))
          .returning()
      )[0];
    const [assignment] = await tx
      .insert(assignments)
      .values({
        marketplaceRequestId: id,
        artisanProfileId: request.artisanProfileId,
        studentProfileId: s.id,
        type: 'PAID',
        status: 'ACCEPTED',
        studentAcceptedAt: now,
      })
      .returning();
    await tx
      .update(marketplaceRequests)
      .set({
        status: 'ASSIGNMENT_CREATED',
        studentResponse: response ?? null,
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(marketplaceRequests.id, id));
    return assignment;
  });
}
export async function createPaidContract(db: Database, adminId: string, input: PaidContractInput) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx
      .select()
      .from(assignments)
      .where(eq(assignments.id, input.assignmentId))
      .for('update');
    if (!assignment || assignment.type !== 'PAID')
      throw new AppError(400, 'A paid assignment is required.', 'INVALID_ASSIGNMENT');
    const [discovery] = await tx
      .select()
      .from(discoveryReports)
      .where(eq(discoveryReports.assignmentId, input.assignmentId));
    if (!discovery || discovery.status !== 'REVIEWED')
      throw new AppError(
        409,
        'Discovery must be reviewed before contract creation.',
        'DISCOVERY_NOT_REVIEWED',
      );
    const [existing] = await tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.assignmentId, input.assignmentId));
    if (existing) throw new AppError(409, 'A contract already exists.', 'CONTRACT_EXISTS');
    return (
      await tx
        .insert(contracts)
        .values({
          ...input,
          contractType: 'PAID',
          artisanPaymentAmount: formatMoney(input.artisanPaymentAmount)!,
          createdByAdminId: adminId,
          platformStudentStipend: null,
        })
        .returning()
    )[0];
  });
}
export async function activatePaidPayments(db: Database, contractId: string) {
  const { contract } = await peopleForContract(db, contractId);
  if (contract.contractType !== 'PAID') return [];
  const start = new Date(contract.startDate + 'T00:00:00Z');
  const end = new Date(contract.endDate + 'T00:00:00Z');
  const months =
    contract.paymentSchedule === 'ONE_TIME'
      ? 1
      : Math.max(
          1,
          (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
            end.getUTCMonth() -
            start.getUTCMonth() +
            1,
        );
  const amount = Number(contract.artisanPaymentAmount) / months;
  const values = Array.from({ length: months }, (_, index) => {
    const due = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, start.getUTCDate()),
    );
    return {
      contractId,
      periodLabel: months === 1 ? 'Project total' : `Month ${index + 1}`,
      dueDate: due.toISOString().slice(0, 10),
      amount: amount.toFixed(2),
      currency: contract.currency,
    };
  });
  for (const value of values) await db.insert(paymentRecords).values(value).onConflictDoNothing();
  return values;
}
export async function paymentsForParticipant(db: Database, userId: string, contractId: string) {
  await participantContract(db, contractId, userId);
  return db
    .select()
    .from(paymentRecords)
    .where(eq(paymentRecords.contractId, contractId))
    .orderBy(asc(paymentRecords.dueDate));
}
export async function markExternalPayment(
  db: Database,
  userId: string,
  paymentId: string,
  input: {
    paymentMethod: 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';
    transactionReference?: string | null;
    artisanNotes?: string | null;
  },
) {
  const [payment] = await db.select().from(paymentRecords).where(eq(paymentRecords.id, paymentId));
  if (!payment) throw new AppError(404, 'Payment record not found.', 'NOT_FOUND');
  const { artisan: a } = await peopleForContract(db, payment.contractId);
  if (a.userId !== userId)
    throw new AppError(
      403,
      'Only the contract artisan can record an external payment.',
      'FORBIDDEN',
    );
  if (!['DUE', 'PROOF_UPLOADED'].includes(payment.status))
    throw new AppError(409, 'This payment cannot be changed.', 'INVALID_STATE');
  return (
    await db
      .update(paymentRecords)
      .set({
        ...input,
        status: input.paymentMethod === 'CASH' ? 'RECEIVED' : 'PROOF_UPLOADED',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, paymentId))
      .returning()
  )[0];
}
export async function uploadProof(
  db: Database,
  userId: string,
  paymentId: string,
  file: Express.Multer.File,
) {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.mimetype) || file.size > 2 * 1024 * 1024)
    throw new AppError(400, 'Upload a JPEG, PNG, or PDF up to 2 MB.', 'INVALID_PROOF');
  const [payment] = await db.select().from(paymentRecords).where(eq(paymentRecords.id, paymentId));
  if (!payment) throw new AppError(404, 'Payment record not found.', 'NOT_FOUND');
  const { artisan: a } = await peopleForContract(db, payment.contractId);
  if (a.userId !== userId)
    throw new AppError(403, 'Only the artisan can upload proof.', 'FORBIDDEN');
  if (payment.paymentMethod === 'CASH')
    throw new AppError(400, 'Cash payments do not need proof.', 'CASH_PROOF_NOT_REQUIRED');
  await db
    .insert(paymentProofs)
    .values({
      paymentRecordId: paymentId,
      uploadedByUserId: userId,
      originalFileName: file.originalname.slice(0, 255),
      mimeType: file.mimetype,
      fileSize: file.size,
      fileData: file.buffer,
    })
    .onConflictDoUpdate({
      target: paymentProofs.paymentRecordId,
      set: {
        uploadedByUserId: userId,
        originalFileName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileData: file.buffer,
      },
    });
  return (
    await db
      .update(paymentRecords)
      .set({ status: 'PROOF_UPLOADED', updatedAt: new Date() })
      .where(eq(paymentRecords.id, paymentId))
      .returning()
  )[0];
}
export async function proofForAuthorizedUser(
  db: Database,
  userId: string,
  role: string,
  paymentId: string,
) {
  const [proof] = await db
    .select()
    .from(paymentProofs)
    .where(eq(paymentProofs.paymentRecordId, paymentId));
  if (!proof) throw new AppError(404, 'Proof not found.', 'NOT_FOUND');
  if (role !== 'ADMIN') {
    const [payment] = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.id, paymentId));
    await participantContract(db, payment!.contractId, userId);
  }
  return proof;
}
export async function confirmPayment(db: Database, userId: string, paymentId: string) {
  const [payment] = await db.select().from(paymentRecords).where(eq(paymentRecords.id, paymentId));
  if (!payment) throw new AppError(404, 'Payment record not found.', 'NOT_FOUND');
  const { student: s } = await peopleForContract(db, payment.contractId);
  if (s.userId !== userId)
    throw new AppError(403, 'Only the contract student can confirm receipt.', 'FORBIDDEN');
  if (!['RECEIVED', 'PROOF_UPLOADED'].includes(payment.status))
    throw new AppError(409, 'Payment must be recorded before confirmation.', 'INVALID_STATE');
  return (
    await db
      .update(paymentRecords)
      .set({
        status: 'VERIFIED',
        studentConfirmedAt: new Date(),
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, paymentId))
      .returning()
  )[0];
}
export async function openDispute(
  db: Database,
  userId: string,
  contractId: string,
  input: {
    paymentRecordId?: string | null;
    category: 'PAYMENT' | 'WORK_QUALITY' | 'COMMUNICATION' | 'CONTRACT' | 'OTHER';
    title: string;
    description: string;
  },
) {
  await participantContract(db, contractId, userId);
  if (input.paymentRecordId) {
    const [payment] = await db
      .select()
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.id, input.paymentRecordId),
          eq(paymentRecords.contractId, contractId),
        ),
      );
    if (!payment)
      throw new AppError(400, 'Payment does not belong to this contract.', 'INVALID_PAYMENT');
    await db
      .update(paymentRecords)
      .set({ status: 'DISPUTED', updatedAt: new Date() })
      .where(eq(paymentRecords.id, payment.id));
  }
  return (
    await db
      .insert(disputes)
      .values({ contractId, openedByUserId: userId, ...input })
      .returning()
  )[0];
}
export async function listDisputes(db: Database, actorId: string, role: string) {
  if (role === 'ADMIN') return db.select().from(disputes).orderBy(desc(disputes.createdAt));
  const rows = await db.select().from(disputes).orderBy(desc(disputes.createdAt));
  const allowed = await Promise.all(
    rows.map(async (item) => {
      try {
        await participantContract(db, item.contractId, actorId);
        return true;
      } catch {
        return false;
      }
    }),
  );
  return rows.filter((_, index) => allowed[index]);
}
export async function reviewDispute(
  db: Database,
  adminId: string,
  id: string,
  input: {
    status: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
    adminNotes?: string | null;
    resolution?: string | null;
  },
) {
  const [current] = await db.select().from(disputes).where(eq(disputes.id, id));
  if (!current) throw new AppError(404, 'Dispute not found.', 'NOT_FOUND');
  const legal =
    current.status === 'OPEN'
      ? ['UNDER_REVIEW', 'RESOLVED', 'REJECTED']
      : current.status === 'UNDER_REVIEW'
        ? ['RESOLVED', 'REJECTED']
        : [];
  if (!legal.includes(input.status))
    throw new AppError(409, 'Invalid dispute transition.', 'INVALID_STATE');
  const final = input.status === 'RESOLVED' || input.status === 'REJECTED';
  return (
    await db
      .update(disputes)
      .set({
        ...input,
        resolvedByAdminId: final ? adminId : null,
        resolvedAt: final ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning()
  )[0];
}
export async function requestCompletion(
  db: Database,
  userId: string,
  contractId: string,
  input: { completionSummary: string; finalMetricsConfirmed: boolean; explanation?: string | null },
) {
  const data = await participantContract(db, contractId, userId);
  if (data.contract.status !== 'ACTIVE')
    throw new AppError(409, 'Only active contracts can be completed.', 'INVALID_STATE');
  const milestoneIds = (
    await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(eq(milestones.contractId, contractId))
  ).map((x) => x.id);
  const taskRows = milestoneIds.length
    ? await db.select().from(tasks).where(inArray(tasks.milestoneId, milestoneIds))
    : [];
  const allDone = taskRows.every((t) => ['APPROVED', 'COMPLETED'].includes(t.status));
  const final = await db
    .select({ id: businessMetrics.id })
    .from(businessMetrics)
    .where(and(eq(businessMetrics.contractId, contractId), eq(businessMetrics.type, 'FINAL')));
  if (!allDone || (!final.length && !input.explanation))
    throw new AppError(
      409,
      'Complete tasks and add final metrics, or explain the exception.',
      'COMPLETION_REQUIREMENTS',
    );
  try {
    return (
      await db
        .insert(contractCompletionRecords)
        .values({
          contractId,
          requestedByUserId: userId,
          completionSummary: input.completionSummary,
          finalMetricsConfirmed: input.finalMetricsConfirmed,
        })
        .returning()
    )[0];
  } catch (e) {
    if (duplicate(e))
      throw new AppError(409, 'Completion is already requested.', 'COMPLETION_EXISTS');
    throw e;
  }
}
export async function reviewCompletion(
  db: Database,
  adminId: string,
  id: string,
  input: { status: 'APPROVED' | 'REJECTED'; adminNotes?: string | null },
) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(contractCompletionRecords)
      .where(eq(contractCompletionRecords.id, id))
      .for('update');
    if (!record) throw new AppError(404, 'Completion request not found.', 'NOT_FOUND');
    if (record.status !== 'REQUESTED')
      throw new AppError(409, 'Completion already reviewed.', 'INVALID_STATE');
    const now = new Date();
    const [updated] = await tx
      .update(contractCompletionRecords)
      .set({
        ...input,
        adminId,
        completedAt: input.status === 'APPROVED' ? now : null,
        updatedAt: now,
      })
      .where(eq(contractCompletionRecords.id, id))
      .returning();
    if (input.status === 'APPROVED') {
      const { assignment } = await peopleForContract(tx, record.contractId);
      await tx
        .update(contracts)
        .set({ status: 'COMPLETED', updatedAt: now })
        .where(eq(contracts.id, record.contractId));
      await tx
        .update(assignments)
        .set({ status: 'COMPLETED', updatedAt: now })
        .where(eq(assignments.id, assignment.id));
      if (assignment.growthRequestId)
        await tx
          .update(growthRequests)
          .set({ status: 'COMPLETED', updatedAt: now })
          .where(eq(growthRequests.id, assignment.growthRequestId));
    }
    return updated;
  });
}
export async function createReview(
  db: Database,
  userId: string,
  contractId: string,
  input: {
    overallRating: number;
    communicationRating: number;
    professionalismRating: number;
    reliabilityRating: number;
    resultsRating?: number | null;
    reviewText: string;
  },
) {
  const data = await participantContract(db, contractId, userId);
  if (data.contract.status !== 'COMPLETED')
    throw new AppError(
      409,
      'Reviews are available after contract completion.',
      'CONTRACT_NOT_COMPLETED',
    );
  const artisanReviewer = data.artisan.userId === userId;
  try {
    return (
      await db
        .insert(reviews)
        .values({
          contractId,
          reviewerUserId: userId,
          reviewedUserId: artisanReviewer ? data.student.userId : data.artisan.userId,
          reviewerRole: artisanReviewer ? 'ARTISAN' : 'STUDENT',
          ...input,
        })
        .returning()
    )[0];
  } catch (e) {
    if (duplicate(e))
      throw new AppError(409, 'You already reviewed this contract.', 'REVIEW_EXISTS');
    throw e;
  }
}
export async function moderateReview(
  db: Database,
  id: string,
  hidden: boolean,
  reason?: string | null,
) {
  const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
  if (!review) throw new AppError(404, 'Review not found.', 'NOT_FOUND');
  return (
    await db
      .update(reviews)
      .set({
        hiddenByAdmin: hidden,
        hiddenReason: hidden ? (reason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning()
  )[0];
}

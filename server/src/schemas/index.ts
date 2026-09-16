import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  customType,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const roleEnum = pgEnum('user_role', ['ARTISAN', 'STUDENT', 'ADMIN']);
export const accountStatusEnum = pgEnum('account_status', [
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'REJECTED',
]);
export const languageEnum = pgEnum('preferred_language', ['EN', 'HI']);
export const verificationEnum = pgEnum('verification_status', ['PENDING', 'VERIFIED', 'REJECTED']);
export const proficiencyEnum = pgEnum('proficiency_level', [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);
export const assistedStatusEnum = pgEnum('assisted_status', [
  'PENDING',
  'CONTACTED',
  'COMPLETED',
  'CANCELLED',
]);
export const growthRequestStatusEnum = pgEnum('growth_request_status', [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'STUDENT_ASSIGNED',
  'DISCOVERY_IN_PROGRESS',
  'CONTRACT_PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'PROPOSED',
  'ACCEPTED',
  'DISCOVERY_IN_PROGRESS',
  'DISCOVERY_SUBMITTED',
  'CONTRACT_PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);
export const discoveryStatusEnum = pgEnum('discovery_report_status', [
  'DRAFT',
  'SUBMITTED',
  'REVIEWED',
  'REVISION_REQUIRED',
]);
export const contractStatusEnum = pgEnum('contract_status', [
  'DRAFT',
  'AWAITING_ACCEPTANCE',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);
export const milestoneStatusEnum = pgEnum('milestone_status', [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'COMPLETED',
  'CANCELLED',
]);
export const taskStatusEnum = pgEnum('task_status', [
  'TODO',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REVISION_REQUIRED',
  'COMPLETED',
]);
export const metricTypeEnum = pgEnum('business_metric_type', ['BASELINE', 'PROGRESS', 'FINAL']);
export const marketplaceRequestStatusEnum = pgEnum('marketplace_request_status', [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'ASSIGNMENT_CREATED',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'DUE',
  'PROOF_UPLOADED',
  'RECEIVED',
  'DISPUTED',
  'VERIFIED',
]);
export const paymentMethodEnum = pgEnum('payment_method', [
  'UPI',
  'BANK_TRANSFER',
  'CASH',
  'OTHER',
]);
export const reviewRoleEnum = pgEnum('reviewer_role', ['ARTISAN', 'STUDENT']);
export const disputeStatusEnum = pgEnum('dispute_status', [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'REJECTED',
]);
export const disputeCategoryEnum = pgEnum('dispute_category', [
  'PAYMENT',
  'WORK_QUALITY',
  'COMMUNICATION',
  'CONTRACT',
  'OTHER',
]);
export const completionStatusEnum = pgEnum('completion_status', [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
]);
const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 254 }).unique(),
    phone: varchar('phone', { length: 16 }).unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull(),
    accountStatus: accountStatusEnum('account_status').notNull().default('PENDING'),
    preferredLanguage: languageEnum('preferred_language').notNull().default('EN'),
    emailVerified: boolean('email_verified').notNull().default(false),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    // Incrementing this revokes all previously issued access tokens (MVP logout).
    tokenVersion: integer('token_version').notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    check('users_contact_required', sql`${table.email} is not null or ${table.phone} is not null`),
    check(
      'users_email_normalized',
      sql`${table.email} is null or (${table.email} = lower(trim(${table.email})) and length(${table.email}) > 3)`,
    ),
    check(
      'users_phone_format',
      sql`${table.phone} is null or ${table.phone} ~ '^[+][1-9][0-9]{7,14}$'`,
    ),
    check('users_token_version_nonnegative', sql`${table.tokenVersion} >= 0`),
    index('users_role_status_idx').on(table.role, table.accountStatus),
  ],
);

export const artisanProfiles = pgTable(
  'artisan_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    // Nullable while the two-step onboarding draft is being saved.
    businessName: varchar('business_name', { length: 160 }),
    craftCategory: varchar('craft_category', { length: 100 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    address: text('address'),
    languages: text('languages')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    biography: text('biography'),
    currentMonthlyRevenue: numeric('current_monthly_revenue', { precision: 12, scale: 2 }),
    currentMonthlyOrders: integer('current_monthly_orders'),
    onlinePresence: text('online_presence'),
    businessProblems: text('business_problems'),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    marketplaceEligible: boolean('marketplace_eligible').notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    check('artisan_revenue_nonnegative', sql`${table.currentMonthlyRevenue} >= 0`),
    check('artisan_orders_nonnegative', sql`${table.currentMonthlyOrders} >= 0`),
    check(
      'artisan_completed_fields',
      sql`not ${table.onboardingCompleted} or (${table.businessName} is not null and ${table.craftCategory} is not null and ${table.city} is not null and ${table.state} is not null and cardinality(${table.languages}) > 0)`,
    ),
    index('artisan_location_idx').on(table.state, table.city),
  ],
);

export const studentProfiles = pgTable(
  'student_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    college: varchar('college', { length: 180 }),
    course: varchar('course', { length: 120 }),
    studyYear: integer('study_year'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    languages: text('languages')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    biography: text('biography'),
    weeklyAvailabilityHours: integer('weekly_availability_hours'),
    expectedMonthlyRate: numeric('expected_monthly_rate', { precision: 12, scale: 2 }),
    portfolioUrl: text('portfolio_url'),
    verificationStatus: verificationEnum('verification_status').notNull().default('PENDING'),
    verificationNotes: text('verification_notes'),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    check('student_study_year_range', sql`${table.studyYear} between 1 and 8`),
    check('student_hours_range', sql`${table.weeklyAvailabilityHours} between 1 and 60`),
    check('student_rate_nonnegative', sql`${table.expectedMonthlyRate} >= 0`),
    check(
      'student_completed_fields',
      sql`not ${table.onboardingCompleted} or (${table.college} is not null and ${table.course} is not null and ${table.studyYear} is not null and ${table.city} is not null and ${table.state} is not null and ${table.biography} is not null and ${table.weeklyAvailabilityHours} is not null and cardinality(${table.languages}) > 0)`,
    ),
    index('student_verification_idx').on(
      table.verificationStatus,
      table.onboardingCompleted,
      table.createdAt,
    ),
  ],
);

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 100 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const studentSkills = pgTable(
  'student_skills',
  {
    studentProfileId: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
    proficiencyLevel: proficiencyEnum('proficiency_level').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.studentProfileId, table.skillId] }),
    index('student_skills_skill_idx').on(table.skillId),
  ],
);

export const assistedRegistrationRequests = pgTable(
  'assisted_registration_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 16 }).notNull(),
    preferredLanguage: languageEnum('preferred_language').notNull(),
    preferredCallTime: varchar('preferred_call_time', { length: 160 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    notes: text('notes'),
    status: assistedStatusEnum('status').notNull().default('PENDING'),
    assignedAdminId: uuid('assigned_admin_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (table) => [
    check('assisted_phone_format', sql`${table.phone} ~ '^[+][1-9][0-9]{7,14}$'`),
    index('assisted_status_created_idx').on(table.status, table.createdAt),
    index('assisted_admin_idx').on(table.assignedAdminId),
  ],
);

export const growthRequests = pgTable(
  'growth_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artisanProfileId: uuid('artisan_profile_id')
      .notNull()
      .references(() => artisanProfiles.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    problemDescription: text('problem_description').notNull(),
    preferredLanguage: languageEnum('preferred_language').notNull(),
    preferredDurationMonths: integer('preferred_duration_months').notNull(),
    currentMonthlyRevenue: numeric('current_monthly_revenue', { precision: 12, scale: 2 }),
    currentMonthlyOrders: integer('current_monthly_orders'),
    currentOnlineOrders: integer('current_online_orders'),
    currentFollowers: integer('current_followers'),
    currentProductsListed: integer('current_products_listed'),
    status: growthRequestStatusEnum('status').notNull().default('DRAFT'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check('growth_duration_range', sql`${table.preferredDurationMonths} between 1 and 12`),
    check(
      'growth_revenue_nonnegative',
      sql`${table.currentMonthlyRevenue} is null or ${table.currentMonthlyRevenue} >= 0`,
    ),
    check(
      'growth_orders_nonnegative',
      sql`${table.currentMonthlyOrders} is null or ${table.currentMonthlyOrders} >= 0`,
    ),
    check(
      'growth_online_orders_nonnegative',
      sql`${table.currentOnlineOrders} is null or ${table.currentOnlineOrders} >= 0`,
    ),
    check(
      'growth_followers_nonnegative',
      sql`${table.currentFollowers} is null or ${table.currentFollowers} >= 0`,
    ),
    check(
      'growth_products_nonnegative',
      sql`${table.currentProductsListed} is null or ${table.currentProductsListed} >= 0`,
    ),
    index('growth_requests_artisan_status_idx').on(
      table.artisanProfileId,
      table.status,
      table.createdAt,
    ),
    index('growth_requests_status_idx').on(table.status, table.createdAt),
  ],
);

export const growthRequestSkills = pgTable(
  'growth_request_skills',
  {
    growthRequestId: uuid('growth_request_id')
      .notNull()
      .references(() => growthRequests.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.growthRequestId, table.skillId] }),
    index('growth_request_skills_skill_idx').on(table.skillId),
  ],
);

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    growthRequestId: uuid('growth_request_id').references(() => growthRequests.id, {
      onDelete: 'cascade',
    }),
    marketplaceRequestId: uuid('marketplace_request_id')
      .unique()
      .references(() => marketplaceRequests.id, { onDelete: 'set null' }),
    artisanProfileId: uuid('artisan_profile_id')
      .notNull()
      .references(() => artisanProfiles.id, { onDelete: 'restrict' }),
    studentProfileId: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'restrict' }),
    assignedByAdminId: uuid('assigned_by_admin_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    type: varchar('type', { length: 20 }).notNull().default('FREE_TRIAL'),
    status: assignmentStatusEnum('status').notNull().default('PROPOSED'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    studentAcceptedAt: timestamp('student_accepted_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check('assignment_type_valid', sql`${table.type} in ('FREE_TRIAL', 'PAID')`),
    uniqueIndex('assignments_one_open_request_idx')
      .on(table.growthRequestId)
      .where(sql`${table.status} not in ('COMPLETED', 'CANCELLED')`),
    index('assignments_student_status_idx').on(
      table.studentProfileId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const discoveryReports = pgTable(
  'discovery_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .unique()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    businessSummary: text('business_summary').notNull(),
    identifiedProblems: text('identified_problems').notNull(),
    recommendedServices: text('recommended_services').notNull(),
    proposedDeliverables: text('proposed_deliverables').notNull(),
    proposedDurationMonths: integer('proposed_duration_months').notNull(),
    knownConstraints: text('known_constraints').notNull(),
    successMeasurementPlan: text('success_measurement_plan').notNull(),
    additionalNotes: text('additional_notes'),
    status: discoveryStatusEnum('status').notNull().default('DRAFT'),
    adminFeedback: text('admin_feedback'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check('discovery_duration_range', sql`${table.proposedDurationMonths} between 1 and 12`),
    index('discovery_status_idx').on(table.status, table.updatedAt),
  ],
);

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .unique()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    contractType: varchar('contract_type', { length: 20 }).notNull().default('FREE_TRIAL'),
    title: varchar('title', { length: 160 }).notNull(),
    problemStatement: text('problem_statement').notNull(),
    responsibilities: text('responsibilities').notNull(),
    deliverables: text('deliverables').notNull(),
    growthTargets: text('growth_targets').notNull(),
    exclusions: text('exclusions').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    artisanPaymentAmount: numeric('artisan_payment_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    platformStudentStipend: numeric('platform_student_stipend', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    paymentSchedule: varchar('payment_schedule', { length: 24 }),
    version: integer('version').notNull().default(1),
    status: contractStatusEnum('status').notNull().default('DRAFT'),
    artisanAcceptedVersion: integer('artisan_accepted_version'),
    studentAcceptedVersion: integer('student_accepted_version'),
    artisanAcceptedAt: timestamp('artisan_accepted_at', { withTimezone: true }),
    studentAcceptedAt: timestamp('student_accepted_at', { withTimezone: true }),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    createdByAdminId: uuid('created_by_admin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps(),
  },
  (table) => [
    check('contract_type_valid', sql`${table.contractType} in ('FREE_TRIAL', 'PAID')`),
    check(
      'contract_payment_by_type',
      sql`(${table.contractType} = 'FREE_TRIAL' and ${table.artisanPaymentAmount} = 0) or (${table.contractType} = 'PAID' and ${table.artisanPaymentAmount} > 0)`,
    ),
    check(
      'contract_stipend_nonnegative',
      sql`${table.platformStudentStipend} is null or ${table.platformStudentStipend} >= 0`,
    ),
    check('contract_date_order', sql`${table.endDate} >= ${table.startDate}`),
    check('contract_version_positive', sql`${table.version} >= 1`),
    index('contracts_status_idx').on(table.status, table.updatedAt),
  ],
);

export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull(),
    sequence: integer('sequence').notNull(),
    dueDate: date('due_date').notNull(),
    status: milestoneStatusEnum('status').notNull().default('NOT_STARTED'),
    ...timestamps(),
  },
  (table) => [
    check('milestone_sequence_positive', sql`${table.sequence} > 0`),
    uniqueIndex('milestone_contract_sequence_idx').on(table.contractId, table.sequence),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => milestones.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull(),
    dueDate: date('due_date').notNull(),
    status: taskStatusEnum('status').notNull().default('TODO'),
    submissionNotes: text('submission_notes'),
    artisanFeedback: text('artisan_feedback'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index('tasks_milestone_status_idx').on(table.milestoneId, table.status, table.dueDate),
  ],
);

export const businessMetrics = pgTable(
  'business_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    recordedByUserId: uuid('recorded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    type: metricTypeEnum('type').notNull(),
    measurementDate: date('measurement_date').notNull(),
    monthlyRevenue: numeric('monthly_revenue', { precision: 12, scale: 2 }),
    monthlyOrders: integer('monthly_orders'),
    onlineOrders: integer('online_orders'),
    socialFollowers: integer('social_followers'),
    customerEnquiries: integer('customer_enquiries'),
    productsListedOnline: integer('products_listed_online'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'metric_revenue_nonnegative',
      sql`${table.monthlyRevenue} is null or ${table.monthlyRevenue} >= 0`,
    ),
    check(
      'metric_monthly_orders_nonnegative',
      sql`${table.monthlyOrders} is null or ${table.monthlyOrders} >= 0`,
    ),
    check(
      'metric_online_orders_nonnegative',
      sql`${table.onlineOrders} is null or ${table.onlineOrders} >= 0`,
    ),
    check(
      'metric_followers_nonnegative',
      sql`${table.socialFollowers} is null or ${table.socialFollowers} >= 0`,
    ),
    check(
      'metric_enquiries_nonnegative',
      sql`${table.customerEnquiries} is null or ${table.customerEnquiries} >= 0`,
    ),
    check(
      'metric_products_nonnegative',
      sql`${table.productsListedOnline} is null or ${table.productsListedOnline} >= 0`,
    ),
    uniqueIndex('business_metrics_one_baseline_idx')
      .on(table.contractId)
      .where(sql`${table.type} = 'BASELINE'`),
    uniqueIndex('business_metrics_one_final_idx')
      .on(table.contractId)
      .where(sql`${table.type} = 'FINAL'`),
    index('business_metrics_contract_date_idx').on(table.contractId, table.measurementDate),
  ],
);

export const marketplaceRequests = pgTable(
  'marketplace_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artisanProfileId: uuid('artisan_profile_id')
      .notNull()
      .references(() => artisanProfiles.id, { onDelete: 'cascade' }),
    studentProfileId: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'restrict' }),
    message: text('message').notNull(),
    requestedServices: text('requested_services').array().notNull(),
    proposedDurationMonths: integer('proposed_duration_months').notNull(),
    proposedMonthlyBudget: numeric('proposed_monthly_budget', { precision: 12, scale: 2 }),
    status: marketplaceRequestStatusEnum('status').notNull().default('PENDING'),
    studentResponse: text('student_response'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check('marketplace_duration_range', sql`${table.proposedDurationMonths} between 1 and 12`),
    check(
      'marketplace_budget_nonnegative',
      sql`${table.proposedMonthlyBudget} is null or ${table.proposedMonthlyBudget} >= 0`,
    ),
    uniqueIndex('marketplace_pending_pair_idx')
      .on(table.artisanProfileId, table.studentProfileId)
      .where(sql`${table.status} = 'PENDING'`),
    index('marketplace_student_status_idx').on(
      table.studentProfileId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const paymentRecords = pgTable(
  'payment_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    periodLabel: varchar('period_label', { length: 80 }).notNull(),
    dueDate: date('due_date').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    paymentMethod: paymentMethodEnum('payment_method'),
    transactionReference: varchar('transaction_reference', { length: 200 }),
    artisanNotes: text('artisan_notes'),
    status: paymentStatusEnum('status').notNull().default('DUE'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    studentConfirmedAt: timestamp('student_confirmed_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check('payment_amount_positive', sql`${table.amount} > 0`),
    uniqueIndex('payment_contract_period_idx').on(table.contractId, table.periodLabel),
    index('payment_status_due_idx').on(table.status, table.dueDate),
  ],
);

export const paymentProofs = pgTable(
  'payment_proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentRecordId: uuid('payment_record_id')
      .notNull()
      .unique()
      .references(() => paymentRecords.id, { onDelete: 'cascade' }),
    uploadedByUserId: uuid('uploaded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    fileData: bytea('file_data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('proof_size_range', sql`${table.fileSize} > 0 and ${table.fileSize} <= 2097152`),
    check(
      'proof_mime_type',
      sql`${table.mimeType} in ('image/jpeg', 'image/png', 'application/pdf')`,
    ),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    reviewerUserId: uuid('reviewer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reviewedUserId: uuid('reviewed_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reviewerRole: reviewRoleEnum('reviewer_role').notNull(),
    overallRating: integer('overall_rating').notNull(),
    communicationRating: integer('communication_rating').notNull(),
    professionalismRating: integer('professionalism_rating').notNull(),
    reliabilityRating: integer('reliability_rating').notNull(),
    resultsRating: integer('results_rating'),
    reviewText: text('review_text').notNull(),
    hiddenByAdmin: boolean('hidden_by_admin').notNull().default(false),
    hiddenReason: text('hidden_reason'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('reviews_one_reviewer_contract_idx').on(table.contractId, table.reviewerUserId),
    check('review_not_self', sql`${table.reviewerUserId} <> ${table.reviewedUserId}`),
    check('review_overall_range', sql`${table.overallRating} between 1 and 5`),
    check('review_communication_range', sql`${table.communicationRating} between 1 and 5`),
    check('review_professionalism_range', sql`${table.professionalismRating} between 1 and 5`),
    check('review_reliability_range', sql`${table.reliabilityRating} between 1 and 5`),
    check(
      'review_results_range',
      sql`${table.resultsRating} is null or ${table.resultsRating} between 1 and 5`,
    ),
    index('reviews_reviewed_visible_idx').on(table.reviewedUserId, table.hiddenByAdmin),
  ],
);

export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    paymentRecordId: uuid('payment_record_id').references(() => paymentRecords.id, {
      onDelete: 'set null',
    }),
    openedByUserId: uuid('opened_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    category: disputeCategoryEnum('category').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull(),
    status: disputeStatusEnum('status').notNull().default('OPEN'),
    adminNotes: text('admin_notes'),
    resolution: text('resolution'),
    resolvedByAdminId: uuid('resolved_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index('disputes_status_created_idx').on(table.status, table.createdAt),
    index('disputes_contract_idx').on(table.contractId),
  ],
);

export const contractCompletionRecords = pgTable(
  'contract_completion_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .unique()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    completionSummary: text('completion_summary').notNull(),
    finalMetricsConfirmed: boolean('final_metrics_confirmed').notNull(),
    status: completionStatusEnum('status').notNull().default('REQUESTED'),
    adminId: uuid('admin_id').references(() => users.id, { onDelete: 'set null' }),
    adminNotes: text('admin_notes'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [index('completion_status_created_idx').on(table.status, table.createdAt)],
);

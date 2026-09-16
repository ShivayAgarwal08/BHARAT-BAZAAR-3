import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
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
    growthRequestId: uuid('growth_request_id')
      .notNull()
      .references(() => growthRequests.id, { onDelete: 'cascade' }),
    artisanProfileId: uuid('artisan_profile_id')
      .notNull()
      .references(() => artisanProfiles.id, { onDelete: 'restrict' }),
    studentProfileId: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'restrict' }),
    assignedByAdminId: uuid('assigned_by_admin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    type: varchar('type', { length: 20 }).notNull().default('FREE_TRIAL'),
    status: assignmentStatusEnum('status').notNull().default('PROPOSED'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    studentAcceptedAt: timestamp('student_accepted_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check('assignment_type_free_trial', sql`${table.type} = 'FREE_TRIAL'`),
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
    check('contract_type_free_trial', sql`${table.contractType} = 'FREE_TRIAL'`),
    check('contract_artisan_payment_zero', sql`${table.artisanPaymentAmount} = 0`),
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

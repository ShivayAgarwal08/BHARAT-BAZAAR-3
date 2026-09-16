import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

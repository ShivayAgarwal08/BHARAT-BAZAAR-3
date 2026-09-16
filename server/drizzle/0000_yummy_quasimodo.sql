CREATE TYPE "public"."account_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."assisted_status" AS ENUM('PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."preferred_language" AS ENUM('EN', 'HI');--> statement-breakpoint
CREATE TYPE "public"."proficiency_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ARTISAN', 'STUDENT', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "artisan_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"business_name" varchar(160),
	"craft_category" varchar(100),
	"city" varchar(100),
	"state" varchar(100),
	"address" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"biography" text,
	"current_monthly_revenue" numeric(12, 2),
	"current_monthly_orders" integer,
	"online_presence" text,
	"business_problems" text,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artisan_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "artisan_revenue_nonnegative" CHECK ("artisan_profiles"."current_monthly_revenue" >= 0),
	CONSTRAINT "artisan_orders_nonnegative" CHECK ("artisan_profiles"."current_monthly_orders" >= 0),
	CONSTRAINT "artisan_completed_fields" CHECK (not "artisan_profiles"."onboarding_completed" or ("artisan_profiles"."business_name" is not null and "artisan_profiles"."craft_category" is not null and "artisan_profiles"."city" is not null and "artisan_profiles"."state" is not null and cardinality("artisan_profiles"."languages") > 0))
);
--> statement-breakpoint
CREATE TABLE "assisted_registration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone" varchar(16) NOT NULL,
	"preferred_language" "preferred_language" NOT NULL,
	"preferred_call_time" varchar(160) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"notes" text,
	"status" "assisted_status" DEFAULT 'PENDING' NOT NULL,
	"assigned_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assisted_phone_format" CHECK ("assisted_registration_requests"."phone" ~ '^[+][1-9][0-9]{7,14}$')
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"college" varchar(180),
	"course" varchar(120),
	"study_year" integer,
	"city" varchar(100),
	"state" varchar(100),
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"biography" text,
	"weekly_availability_hours" integer,
	"expected_monthly_rate" numeric(12, 2),
	"portfolio_url" text,
	"verification_status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"verification_notes" text,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "student_study_year_range" CHECK ("student_profiles"."study_year" between 1 and 8),
	CONSTRAINT "student_hours_range" CHECK ("student_profiles"."weekly_availability_hours" between 1 and 60),
	CONSTRAINT "student_rate_nonnegative" CHECK ("student_profiles"."expected_monthly_rate" >= 0),
	CONSTRAINT "student_completed_fields" CHECK (not "student_profiles"."onboarding_completed" or ("student_profiles"."college" is not null and "student_profiles"."course" is not null and "student_profiles"."study_year" is not null and "student_profiles"."city" is not null and "student_profiles"."state" is not null and "student_profiles"."biography" is not null and "student_profiles"."weekly_availability_hours" is not null and cardinality("student_profiles"."languages") > 0))
);
--> statement-breakpoint
CREATE TABLE "student_skills" (
	"student_profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"proficiency_level" "proficiency_level" NOT NULL,
	CONSTRAINT "student_skills_student_profile_id_skill_id_pk" PRIMARY KEY("student_profile_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254),
	"phone" varchar(16),
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"account_status" "account_status" DEFAULT 'PENDING' NOT NULL,
	"preferred_language" "preferred_language" DEFAULT 'EN' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_contact_required" CHECK ("users"."email" is not null or "users"."phone" is not null),
	CONSTRAINT "users_email_normalized" CHECK ("users"."email" is null or ("users"."email" = lower(trim("users"."email")) and length("users"."email") > 3)),
	CONSTRAINT "users_phone_format" CHECK ("users"."phone" is null or "users"."phone" ~ '^[+][1-9][0-9]{7,14}$'),
	CONSTRAINT "users_token_version_nonnegative" CHECK ("users"."token_version" >= 0)
);
--> statement-breakpoint
ALTER TABLE "artisan_profiles" ADD CONSTRAINT "artisan_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assisted_registration_requests" ADD CONSTRAINT "assisted_registration_requests_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artisan_location_idx" ON "artisan_profiles" USING btree ("state","city");--> statement-breakpoint
CREATE INDEX "assisted_status_created_idx" ON "assisted_registration_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "assisted_admin_idx" ON "assisted_registration_requests" USING btree ("assigned_admin_id");--> statement-breakpoint
CREATE INDEX "student_verification_idx" ON "student_profiles" USING btree ("verification_status","onboarding_completed","created_at");--> statement-breakpoint
CREATE INDEX "student_skills_skill_idx" ON "student_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","account_status");
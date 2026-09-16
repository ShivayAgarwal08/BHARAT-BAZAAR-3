CREATE TYPE "public"."assignment_status" AS ENUM('PROPOSED', 'ACCEPTED', 'DISCOVERY_IN_PROGRESS', 'DISCOVERY_SUBMITTED', 'CONTRACT_PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('DRAFT', 'AWAITING_ACCEPTANCE', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."discovery_report_status" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'REVISION_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."growth_request_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'STUDENT_ASSIGNED', 'DISCOVERY_IN_PROGRESS', 'CONTRACT_PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."business_metric_type" AS ENUM('BASELINE', 'PROGRESS', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUIRED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"growth_request_id" uuid NOT NULL,
	"artisan_profile_id" uuid NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"assigned_by_admin_id" uuid NOT NULL,
	"type" varchar(20) DEFAULT 'FREE_TRIAL' NOT NULL,
	"status" "assignment_status" DEFAULT 'PROPOSED' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"student_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_type_free_trial" CHECK ("assignments"."type" = 'FREE_TRIAL')
);
--> statement-breakpoint
CREATE TABLE "business_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"type" "business_metric_type" NOT NULL,
	"measurement_date" date NOT NULL,
	"monthly_revenue" numeric(12, 2),
	"monthly_orders" integer,
	"online_orders" integer,
	"social_followers" integer,
	"customer_enquiries" integer,
	"products_listed_online" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metric_revenue_nonnegative" CHECK ("business_metrics"."monthly_revenue" is null or "business_metrics"."monthly_revenue" >= 0),
	CONSTRAINT "metric_monthly_orders_nonnegative" CHECK ("business_metrics"."monthly_orders" is null or "business_metrics"."monthly_orders" >= 0),
	CONSTRAINT "metric_online_orders_nonnegative" CHECK ("business_metrics"."online_orders" is null or "business_metrics"."online_orders" >= 0),
	CONSTRAINT "metric_followers_nonnegative" CHECK ("business_metrics"."social_followers" is null or "business_metrics"."social_followers" >= 0),
	CONSTRAINT "metric_enquiries_nonnegative" CHECK ("business_metrics"."customer_enquiries" is null or "business_metrics"."customer_enquiries" >= 0),
	CONSTRAINT "metric_products_nonnegative" CHECK ("business_metrics"."products_listed_online" is null or "business_metrics"."products_listed_online" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"contract_type" varchar(20) DEFAULT 'FREE_TRIAL' NOT NULL,
	"title" varchar(160) NOT NULL,
	"problem_statement" text NOT NULL,
	"responsibilities" text NOT NULL,
	"deliverables" text NOT NULL,
	"growth_targets" text NOT NULL,
	"exclusions" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"artisan_payment_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"platform_student_stipend" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"artisan_accepted_version" integer,
	"student_accepted_version" integer,
	"artisan_accepted_at" timestamp with time zone,
	"student_accepted_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_assignment_id_unique" UNIQUE("assignment_id"),
	CONSTRAINT "contract_type_free_trial" CHECK ("contracts"."contract_type" = 'FREE_TRIAL'),
	CONSTRAINT "contract_artisan_payment_zero" CHECK ("contracts"."artisan_payment_amount" = 0),
	CONSTRAINT "contract_stipend_nonnegative" CHECK ("contracts"."platform_student_stipend" is null or "contracts"."platform_student_stipend" >= 0),
	CONSTRAINT "contract_date_order" CHECK ("contracts"."end_date" >= "contracts"."start_date"),
	CONSTRAINT "contract_version_positive" CHECK ("contracts"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "discovery_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"business_summary" text NOT NULL,
	"identified_problems" text NOT NULL,
	"recommended_services" text NOT NULL,
	"proposed_deliverables" text NOT NULL,
	"proposed_duration_months" integer NOT NULL,
	"known_constraints" text NOT NULL,
	"success_measurement_plan" text NOT NULL,
	"additional_notes" text,
	"status" "discovery_report_status" DEFAULT 'DRAFT' NOT NULL,
	"admin_feedback" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_reports_assignment_id_unique" UNIQUE("assignment_id"),
	CONSTRAINT "discovery_duration_range" CHECK ("discovery_reports"."proposed_duration_months" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "growth_request_skills" (
	"growth_request_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "growth_request_skills_growth_request_id_skill_id_pk" PRIMARY KEY("growth_request_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "growth_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artisan_profile_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"problem_description" text NOT NULL,
	"preferred_language" "preferred_language" NOT NULL,
	"preferred_duration_months" integer NOT NULL,
	"current_monthly_revenue" numeric(12, 2),
	"current_monthly_orders" integer,
	"current_online_orders" integer,
	"current_followers" integer,
	"current_products_listed" integer,
	"status" "growth_request_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "growth_duration_range" CHECK ("growth_requests"."preferred_duration_months" between 1 and 12),
	CONSTRAINT "growth_revenue_nonnegative" CHECK ("growth_requests"."current_monthly_revenue" is null or "growth_requests"."current_monthly_revenue" >= 0),
	CONSTRAINT "growth_orders_nonnegative" CHECK ("growth_requests"."current_monthly_orders" is null or "growth_requests"."current_monthly_orders" >= 0),
	CONSTRAINT "growth_online_orders_nonnegative" CHECK ("growth_requests"."current_online_orders" is null or "growth_requests"."current_online_orders" >= 0),
	CONSTRAINT "growth_followers_nonnegative" CHECK ("growth_requests"."current_followers" is null or "growth_requests"."current_followers" >= 0),
	CONSTRAINT "growth_products_nonnegative" CHECK ("growth_requests"."current_products_listed" is null or "growth_requests"."current_products_listed" >= 0)
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"sequence" integer NOT NULL,
	"due_date" date NOT NULL,
	"status" "milestone_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_sequence_positive" CHECK ("milestones"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"due_date" date NOT NULL,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"submission_notes" text,
	"artisan_feedback" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_growth_request_id_growth_requests_id_fk" FOREIGN KEY ("growth_request_id") REFERENCES "public"."growth_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_artisan_profile_id_artisan_profiles_id_fk" FOREIGN KEY ("artisan_profile_id") REFERENCES "public"."artisan_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_admin_id_users_id_fk" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reports" ADD CONSTRAINT "discovery_reports_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_request_skills" ADD CONSTRAINT "growth_request_skills_growth_request_id_growth_requests_id_fk" FOREIGN KEY ("growth_request_id") REFERENCES "public"."growth_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_request_skills" ADD CONSTRAINT "growth_request_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_requests" ADD CONSTRAINT "growth_requests_artisan_profile_id_artisan_profiles_id_fk" FOREIGN KEY ("artisan_profile_id") REFERENCES "public"."artisan_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_one_open_request_idx" ON "assignments" USING btree ("growth_request_id") WHERE "assignments"."status" not in ('COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE INDEX "assignments_student_status_idx" ON "assignments" USING btree ("student_profile_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_metrics_one_baseline_idx" ON "business_metrics" USING btree ("contract_id") WHERE "business_metrics"."type" = 'BASELINE';--> statement-breakpoint
CREATE UNIQUE INDEX "business_metrics_one_final_idx" ON "business_metrics" USING btree ("contract_id") WHERE "business_metrics"."type" = 'FINAL';--> statement-breakpoint
CREATE INDEX "business_metrics_contract_date_idx" ON "business_metrics" USING btree ("contract_id","measurement_date");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "discovery_status_idx" ON "discovery_reports" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "growth_request_skills_skill_idx" ON "growth_request_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "growth_requests_artisan_status_idx" ON "growth_requests" USING btree ("artisan_profile_id","status","created_at");--> statement-breakpoint
CREATE INDEX "growth_requests_status_idx" ON "growth_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_contract_sequence_idx" ON "milestones" USING btree ("contract_id","sequence");--> statement-breakpoint
CREATE INDEX "tasks_milestone_status_idx" ON "tasks" USING btree ("milestone_id","status","due_date");
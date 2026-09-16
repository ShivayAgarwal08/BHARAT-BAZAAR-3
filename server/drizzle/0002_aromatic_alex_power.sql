CREATE TYPE "public"."completion_status" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."dispute_category" AS ENUM('PAYMENT', 'WORK_QUALITY', 'COMMUNICATION', 'CONTRACT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."marketplace_request_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'ASSIGNMENT_CREATED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('UPI', 'BANK_TRANSFER', 'CASH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('DUE', 'PROOF_UPLOADED', 'RECEIVED', 'DISPUTED', 'VERIFIED');--> statement-breakpoint
CREATE TYPE "public"."reviewer_role" AS ENUM('ARTISAN', 'STUDENT');--> statement-breakpoint
CREATE TABLE "contract_completion_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"completion_summary" text NOT NULL,
	"final_metrics_confirmed" boolean NOT NULL,
	"status" "completion_status" DEFAULT 'REQUESTED' NOT NULL,
	"admin_id" uuid,
	"admin_notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_completion_records_contract_id_unique" UNIQUE("contract_id")
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"payment_record_id" uuid,
	"opened_by_user_id" uuid NOT NULL,
	"category" "dispute_category" NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"admin_notes" text,
	"resolution" text,
	"resolved_by_admin_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artisan_profile_id" uuid NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"message" text NOT NULL,
	"requested_services" text[] NOT NULL,
	"proposed_duration_months" integer NOT NULL,
	"proposed_monthly_budget" numeric(12, 2),
	"status" "marketplace_request_status" DEFAULT 'PENDING' NOT NULL,
	"student_response" text,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_duration_range" CHECK ("marketplace_requests"."proposed_duration_months" between 1 and 12),
	CONSTRAINT "marketplace_budget_nonnegative" CHECK ("marketplace_requests"."proposed_monthly_budget" is null or "marketplace_requests"."proposed_monthly_budget" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_record_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"file_data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_proofs_payment_record_id_unique" UNIQUE("payment_record_id"),
	CONSTRAINT "proof_size_range" CHECK ("payment_proofs"."file_size" > 0 and "payment_proofs"."file_size" <= 2097152),
	CONSTRAINT "proof_mime_type" CHECK ("payment_proofs"."mime_type" in ('image/jpeg', 'image/png', 'application/pdf'))
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_label" varchar(80) NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"payment_method" "payment_method",
	"transaction_reference" varchar(200),
	"artisan_notes" text,
	"status" "payment_status" DEFAULT 'DUE' NOT NULL,
	"paid_at" timestamp with time zone,
	"student_confirmed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amount_positive" CHECK ("payment_records"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"reviewed_user_id" uuid NOT NULL,
	"reviewer_role" "reviewer_role" NOT NULL,
	"overall_rating" integer NOT NULL,
	"communication_rating" integer NOT NULL,
	"professionalism_rating" integer NOT NULL,
	"reliability_rating" integer NOT NULL,
	"results_rating" integer,
	"review_text" text NOT NULL,
	"hidden_by_admin" boolean DEFAULT false NOT NULL,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_not_self" CHECK ("reviews"."reviewer_user_id" <> "reviews"."reviewed_user_id"),
	CONSTRAINT "review_overall_range" CHECK ("reviews"."overall_rating" between 1 and 5),
	CONSTRAINT "review_communication_range" CHECK ("reviews"."communication_rating" between 1 and 5),
	CONSTRAINT "review_professionalism_range" CHECK ("reviews"."professionalism_rating" between 1 and 5),
	CONSTRAINT "review_reliability_range" CHECK ("reviews"."reliability_rating" between 1 and 5),
	CONSTRAINT "review_results_range" CHECK ("reviews"."results_rating" is null or "reviews"."results_rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "assignment_type_free_trial";--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contract_type_free_trial";--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contract_artisan_payment_zero";--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "growth_request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "assigned_by_admin_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "artisan_profiles" ADD COLUMN "marketplace_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "marketplace_request_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "payment_schedule" varchar(24);--> statement-breakpoint
ALTER TABLE "contract_completion_records" ADD CONSTRAINT "contract_completion_records_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_completion_records" ADD CONSTRAINT "contract_completion_records_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_completion_records" ADD CONSTRAINT "contract_completion_records_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_payment_record_id_payment_records_id_fk" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_admin_id_users_id_fk" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_requests" ADD CONSTRAINT "marketplace_requests_artisan_profile_id_artisan_profiles_id_fk" FOREIGN KEY ("artisan_profile_id") REFERENCES "public"."artisan_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_requests" ADD CONSTRAINT "marketplace_requests_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_payment_record_id_payment_records_id_fk" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_user_id_users_id_fk" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "completion_status_created_idx" ON "contract_completion_records" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "disputes_status_created_idx" ON "disputes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "disputes_contract_idx" ON "disputes" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_pending_pair_idx" ON "marketplace_requests" USING btree ("artisan_profile_id","student_profile_id") WHERE "marketplace_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "marketplace_student_status_idx" ON "marketplace_requests" USING btree ("student_profile_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_contract_period_idx" ON "payment_records" USING btree ("contract_id","period_label");--> statement-breakpoint
CREATE INDEX "payment_status_due_idx" ON "payment_records" USING btree ("status","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_one_reviewer_contract_idx" ON "reviews" USING btree ("contract_id","reviewer_user_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewed_visible_idx" ON "reviews" USING btree ("reviewed_user_id","hidden_by_admin");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_marketplace_request_id_marketplace_requests_id_fk" FOREIGN KEY ("marketplace_request_id") REFERENCES "public"."marketplace_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_marketplace_request_id_unique" UNIQUE("marketplace_request_id");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignment_type_valid" CHECK ("assignments"."type" in ('FREE_TRIAL', 'PAID'));--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contract_type_valid" CHECK ("contracts"."contract_type" in ('FREE_TRIAL', 'PAID'));--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contract_payment_by_type" CHECK (("contracts"."contract_type" = 'FREE_TRIAL' and "contracts"."artisan_payment_amount" = 0) or ("contracts"."contract_type" = 'PAID' and "contracts"."artisan_payment_amount" > 0));
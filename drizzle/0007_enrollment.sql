CREATE TABLE IF NOT EXISTS "admin_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" text NOT NULL,
	"student_user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grant_reason_chk" CHECK ("admin_grant"."reason" IN ('promo','gift','comp','refund_replacement','other'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_pending_id" uuid,
	"source_grant_id" uuid,
	"price_at_purchase" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enroll_source_chk" CHECK ("enrollment"."source" IN ('paid','free_course','admin_grant')),
	CONSTRAINT "enroll_status_chk" CHECK ("enrollment"."status" IN ('active','cancelled')),
	CONSTRAINT "enroll_source_id_chk" CHECK (("enrollment"."source" = 'paid' AND "enrollment"."source_pending_id" IS NOT NULL AND "enrollment"."source_grant_id" IS NULL)
        OR ("enrollment"."source" = 'admin_grant' AND "enrollment"."source_grant_id" IS NOT NULL AND "enrollment"."source_pending_id" IS NULL)
        OR ("enrollment"."source" = 'free_course' AND "enrollment"."source_pending_id" IS NULL AND "enrollment"."source_grant_id" IS NULL))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_grant" ADD CONSTRAINT "admin_grant_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_source_pending_id_pending_enrollment_id_fk" FOREIGN KEY ("source_pending_id") REFERENCES "public"."pending_enrollment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_source_grant_id_admin_grant_id_fk" FOREIGN KEY ("source_grant_id") REFERENCES "public"."admin_grant"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grant_student_idx" ON "admin_grant" USING btree ("student_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grant_course_idx" ON "admin_grant" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enroll_user_idx" ON "enrollment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enroll_course_idx" ON "enrollment" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_enrollment" ON "enrollment" USING btree ("user_id","course_id") WHERE "enrollment"."status" = 'active';
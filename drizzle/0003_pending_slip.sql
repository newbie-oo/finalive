CREATE TABLE IF NOT EXISTS "idempotency_record" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"response_json" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_record_scope_key_pk" PRIMARY KEY("scope","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_slip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pending_enrollment_id" uuid NOT NULL,
	"image_media_id" uuid NOT NULL,
	"expected_amount" numeric(12, 2) NOT NULL,
	"reported_amount" numeric(12, 2),
	"status" text DEFAULT 'submitted' NOT NULL,
	"rejection_reason" text,
	"rejection_note" text,
	"idempotency_key" text NOT NULL,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_slip_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "slip_status_chk" CHECK ("payment_slip"."status" IN ('submitted','accepted','rejected')),
	CONSTRAINT "slip_reject_reason_chk" CHECK ("payment_slip"."status" != 'rejected' OR "payment_slip"."rejection_reason" IN ('blurry','wrong_amount','wrong_account','stale_slip','other'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"ref_code" text NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_enrollment_ref_code_unique" UNIQUE("ref_code"),
	CONSTRAINT "pe_status_chk" CHECK ("pending_enrollment"."status" IN ('awaiting_payment','slip_submitted','paid','expired','cancelled'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_slip" ADD CONSTRAINT "payment_slip_pending_enrollment_id_pending_enrollment_id_fk" FOREIGN KEY ("pending_enrollment_id") REFERENCES "public"."pending_enrollment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_slip" ADD CONSTRAINT "payment_slip_image_media_id_media_asset_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_enrollment" ADD CONSTRAINT "pending_enrollment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ir_expires_idx" ON "idempotency_record" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slip_status_created_idx" ON "payment_slip" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slip_pending_idx" ON "payment_slip" USING btree ("pending_enrollment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pe_user_idx" ON "pending_enrollment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pe_status_idx" ON "pending_enrollment" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pe_expires_idx" ON "pending_enrollment" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_pending" ON "pending_enrollment" USING btree ("user_id","course_id") WHERE "pending_enrollment"."status" IN ('awaiting_payment','slip_submitted');
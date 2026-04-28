CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_user_id" text,
	"actor_admin_impersonating" text,
	"action" text NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"request_id" text,
	"ip" text,
	"user_agent" text,
	"metadata_json" jsonb,
	CONSTRAINT "audit_log_occurred_at_id_pk" PRIMARY KEY("occurred_at","id"),
	CONSTRAINT "audit_actor_chk" CHECK ("audit_log"."actor_type" IN ('user','system','cron','webhook'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"params_json" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "em_status_chk" CHECK ("email_message"."status" IN ('queued','sent','failed'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_log" USING btree ("actor_user_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_log" USING btree ("action","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_request_idx" ON "audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "em_dispatch_idx" ON "email_message" USING btree ("status","last_attempt_at");
DROP INDEX IF EXISTS "ir_expires_idx";--> statement-breakpoint
ALTER TABLE "idempotency_record" DROP COLUMN IF EXISTS "expires_at";

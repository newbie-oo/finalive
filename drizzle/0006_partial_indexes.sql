ALTER TABLE "course" DROP CONSTRAINT "course_slug_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "course_status_published_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "module_course_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "lesson_module_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "course_slug_idx" ON "course" USING btree ("slug") WHERE "course"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_status_published_idx" ON "course" USING btree ("status","published_at" DESC) WHERE "course"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "module_course_idx" ON "module" USING btree ("course_id") WHERE "module"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_module_idx" ON "lesson" USING btree ("module_id") WHERE "lesson"."deleted_at" IS NULL;
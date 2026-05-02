ALTER TABLE "media_asset" ADD COLUMN "status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_asset_pending_idx" ON "media_asset" USING btree ("created_at") WHERE "media_asset"."status" = 'pending_upload';--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_status_chk" CHECK ("media_asset"."status" IN ('pending_upload','ready'));
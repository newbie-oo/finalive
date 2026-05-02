-- Expand media_asset.status to include 'encoding' (Bunny video uploaded but
-- not yet transcoded) and 'failed' (Bunny encoding error). The /api/webhooks/
-- bunny endpoint flips encoding → ready on the VideoEncoded event.
ALTER TABLE "media_asset" DROP CONSTRAINT IF EXISTS "media_asset_status_chk";--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_status_chk" CHECK ("media_asset"."status" IN ('pending_upload','encoding','ready','failed'));

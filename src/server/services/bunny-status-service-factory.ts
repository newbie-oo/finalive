import "server-only";
import { MediaAssetRepo } from "@/server/repos/media-asset";
import { LessonVideoRepo } from "@/server/repos/lesson-video";
import { BunnyVideoStatusService } from "./bunny-video-status";

/**
 * Shared factory for BunnyVideoStatusService wired to the local DB.
 * Used by both the polling route (GET /api/admin/video-status) and
 * the webhook handler (POST /api/webhooks/bunny).
 */
export function makeBunnyStatusService() {
	return new BunnyVideoStatusService({
		findAssetByBunnyId: MediaAssetRepo.findAssetByBunnyId,
		updateAsset: MediaAssetRepo.updateAsset,
		updateLessonDuration: LessonVideoRepo.updateLessonDuration,
	});
}

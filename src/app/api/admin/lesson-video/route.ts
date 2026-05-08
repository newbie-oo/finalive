import { z } from "zod";
import { apiCourseRoute } from "@/lib/api-course-route";
import { ApiError } from "@/lib/api-error";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { HttpBunnyStreamClient } from "@/server/services/bunny-stream";
import { LessonVideoService } from "@/server/services/lesson-video";
import { LessonVideoRepo } from "@/server/repos/lesson-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeService() {
	const bunny = new HttpBunnyStreamClient();
	return new LessonVideoService({
		bunny,
		getLessonVideoMediaId: LessonVideoRepo.getLessonVideoMediaId,
		createVideoAsset: LessonVideoRepo.createVideoAsset,
		updateLessonVideo: LessonVideoRepo.updateLessonVideo,
		findAssetByBunnyId: LessonVideoRepo.findAssetByBunnyId,
		findPreviousVideoMediaId: LessonVideoRepo.findPreviousVideoMediaId,
		deleteMediaAsset: LessonVideoRepo.deleteMediaAsset,
	});
}

const bodySchema = z.object({
	action: z.enum(["create", "cancel"]),
	courseId: z.string().uuid(),
	lessonId: z.string().uuid(),
	fileName: z.string().optional(),
	bunnyVideoId: z.string().optional(),
});

export const POST = apiCourseRoute({
	auth: "required",
	rateLimit: rateLimitConfigs.upload,
	body: bodySchema,
	getCourseId: ({ body }) => body.courseId,
	handler: async ({ body, user }) => {
		const { action, lessonId, fileName, bunnyVideoId } = body;

		const env = getEnv();
		const apiKey = env.BUNNY_API_KEY;
		if (!apiKey) {
			logger.error("lesson-video.bunny_not_configured");
			throw new ApiError("invalid_state", "video provider not configured");
		}

		const service = makeService();

		if (action === "create") {
			try {
				const result = await service.createVideo({
					lessonId,
					fileName: fileName ?? "video.mp4",
					userId: user.id,
				});
				logger.info("lesson-video.created", {
					videoId: result.bunnyVideoId,
					lessonId,
					assetId: result.assetId,
					oldMediaId: result.oldMediaId,
				});
				return {
					ok: true,
					bunnyVideoId: result.bunnyVideoId,
					uploadUrl: result.uploadUrl,
					apiKey,
					oldMediaId: result.oldMediaId,
				};
			} catch (err) {
				if (err instanceof ApiError) throw err;
				logger.error("lesson-video.create_failed", err, { lessonId });
				throw new ApiError("internal_error", "video provider error");
			}
		}

		if (!bunnyVideoId) {
			throw new ApiError("validation_failed", "missing bunnyVideoId");
		}

		const result = await service.cancelVideo({ lessonId, bunnyVideoId });
		logger.info("lesson-video.cancelled", { bunnyVideoId, lessonId });
		return {
			ok: true,
			restoredMediaId: result.restoredMediaId,
		};
	},
});

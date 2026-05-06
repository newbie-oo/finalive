import { z } from "zod";
import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";
import { canEditCoursePure } from "@/server/services/course-authz";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
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

export const POST = apiRoute({
	auth: "required",
	body: bodySchema,
	handler: async ({ body, user }) => {
		const { action, courseId, lessonId, fileName, bunnyVideoId } = body;

		const [courseOwnerId, collaboratorRole] = await Promise.all([
			getCourseOwnerId(courseId),
			getCollaboratorRole(courseId, user!.id),
		]);
		if (
			!canEditCoursePure({
				userId: user!.id,
				userRole: user!.role ?? "user",
				courseOwnerId,
				collaboratorRole,
			})
		) {
			return NextResponse.json({ code: "forbidden" }, { status: 403 });
		}

		const env = getEnv();
		const apiKey = env.BUNNY_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{ code: "bunny_not_configured", message: "Bunny credentials missing" },
				{ status: 500 },
			);
		}

		const service = makeService();

		if (action === "create") {
			try {
				const result = await service.createVideo({
					lessonId,
					fileName: fileName ?? "video.mp4",
					userId: user!.id,
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
				const message =
					err instanceof Error ? err.message : "Bunny create failed";
				logger.error("lesson-video.create_failed", err, { lessonId });
				return NextResponse.json(
					{ code: "bunny_error", message },
					{ status: 502 },
				);
			}
		}

		if (action === "cancel") {
			if (!bunnyVideoId) {
				return NextResponse.json(
					{ code: "validation_failed", message: "missing bunnyVideoId" },
					{ status: 400 },
				);
			}

			const result = await service.cancelVideo({ lessonId, bunnyVideoId });
			logger.info("lesson-video.cancelled", { bunnyVideoId, lessonId });
			return {
				ok: true,
				restoredMediaId: result.restoredMediaId,
			};
		}

		return NextResponse.json(
			{ code: "validation_failed", message: "action must be create or cancel" },
			{ status: 400 },
		);
	},
});

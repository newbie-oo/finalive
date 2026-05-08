import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { ApiError } from "@/lib/api-error";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rate-limit";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";
import { canEditCoursePure } from "@/server/services/course-authz";
import { LessonVideoRepo } from "@/server/repos/lesson-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

const body = z.object({
	lessonId: z.string().uuid(),
	courseId: z.string().uuid(),
});

export const POST = apiRoute({
	auth: "admin",
	rateLimit: rateLimitConfigs.upload,
	body,
	handler: async ({ body, user }) => {
		const { lessonId, courseId } = body;

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
			throw new ApiError("forbidden", "no edit access for this course");
		}

		const row = await LessonVideoRepo.getLessonVideoAsset(lessonId);

		if (!row || row.storage !== "bunny_stream") {
			throw new ApiError("not_found", "no bunny_stream asset for lesson");
		}

		const env = getEnv();
		const lib = env.BUNNY_LIBRARY_ID;
		const apiKey = env.BUNNY_API_KEY;
		if (!lib || !apiKey) {
			throw new ApiError("internal_error", "Bunny stream is not configured");
		}

		const res = await fetch(
			`${BUNNY_API_BASE}/library/${lib}/videos/${row.bunnyId}/reencode`,
			{
				method: "POST",
				headers: { AccessKey: apiKey, accept: "application/json" },
			},
		);

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			logger.error("reencode-video.bunny_failed", { status: res.status, text });
			throw new ApiError("internal_error", `Bunny upstream failure: ${res.status}`);
		}

		await LessonVideoRepo.setAssetEncoding(row.assetId);

		logger.info("reencode-video.requested", {
			lessonId,
			bunnyId: row.bunnyId,
			requestedBy: user!.id,
		});

		return { ok: true, bunnyVideoId: row.bunnyId };
	},
});

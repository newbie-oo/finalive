import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson, courseModule } from "@/db/schema/course";
import { apiRoute } from "@/lib/api-route";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";
import { canEditCoursePure } from "@/server/services/course-authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

const body = z.object({
	lessonId: z.string().uuid(),
	courseId: z.string().uuid(),
});

export const POST = apiRoute({
	auth: "admin",
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
			return { code: "forbidden" };
		}

		const [row] = await db
			.select({
				assetId: mediaAsset.id,
				storage: mediaAsset.storage,
				bunnyId: mediaAsset.storageKey,
			})
			.from(lesson)
			.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
			.innerJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
			.where(eq(lesson.id, lessonId))
			.limit(1);

		if (!row || row.storage !== "bunny_stream") {
			return { code: "not_found" };
		}

		const env = getEnv();
		const lib = env.BUNNY_LIBRARY_ID;
		const apiKey = env.BUNNY_API_KEY;
		if (!lib || !apiKey) {
			return { code: "bunny_not_configured" };
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
			return { code: "bunny_error", message: `Bunny ${res.status}` };
		}

		await db
			.update(mediaAsset)
			.set({ status: "encoding" })
			.where(eq(mediaAsset.id, row.assetId));

		logger.info("reencode-video.requested", {
			lessonId,
			bunnyId: row.bunnyId,
			requestedBy: user!.id,
		});

		return { ok: true, bunnyVideoId: row.bunnyId };
	},
});

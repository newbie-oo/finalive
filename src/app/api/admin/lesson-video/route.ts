import { z } from "zod";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";
import {
	requireSession,
	getUserRole,
	normalizeRole,
} from "@/server/auth-session";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";
import { canEditCoursePure } from "@/server/services/course-authz";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { HttpBunnyStreamClient } from "@/server/services/bunny-stream";
import { LessonVideoService } from "@/server/services/lesson-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeService() {
	const bunny = new HttpBunnyStreamClient();
	return new LessonVideoService({
		bunny,
		getLessonVideoMediaId: async (lessonId) => {
			const rows = await db
				.select({ videoMediaId: lesson.videoMediaId })
				.from(lesson)
				.where(eq(lesson.id, lessonId))
				.limit(1);
			return rows[0]?.videoMediaId ?? null;
		},
		createVideoAsset: async (args) => {
			const [row] = await db
				.insert(mediaAsset)
				.values({
					kind: "video",
					storage: "bunny_stream",
					storageKey: args.storageKey,
					mimeType: "video/mp4",
					sizeBytes: null,
					status: "encoding",
					createdByUserId: args.userId,
				})
				.returning({ id: mediaAsset.id });
			return { id: row!.id };
		},
		updateLessonVideo: async (lessonId, mediaAssetId) => {
			await db
				.update(lesson)
				.set({ videoMediaId: mediaAssetId, updatedAt: new Date() })
				.where(eq(lesson.id, lessonId));
		},
		findAssetByBunnyId: async (bunnyVideoId) => {
			const rows = await db
				.select({ id: mediaAsset.id })
				.from(mediaAsset)
				.where(
					and(
						eq(mediaAsset.storage, "bunny_stream"),
						eq(mediaAsset.storageKey, bunnyVideoId),
					),
				)
				.limit(1);
			return rows[0] ?? null;
		},
		findPreviousVideoMediaId: async (lessonId, excludeAssetId) => {
			const rows = await db
				.select({ mediaId: lesson.videoMediaId })
				.from(lesson)
				.where(
					and(
						eq(lesson.id, lessonId),
						ne(lesson.videoMediaId, excludeAssetId),
						sql`${lesson.videoMediaId} IS NOT NULL`,
					),
				)
				.limit(1);
			return rows[0]?.mediaId ?? null;
		},
		deleteMediaAsset: async (assetId) => {
			await db.delete(mediaAsset).where(eq(mediaAsset.id, assetId));
		},
	});
}

const bodySchema = z.object({
	action: z.enum(["create", "cancel"]),
	courseId: z.string().uuid(),
	lessonId: z.string().uuid(),
	fileName: z.string().optional(),
	bunnyVideoId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
	const ctx = await requireSession();
	const role = normalizeRole(getUserRole(ctx.user));

	let body: Record<string, unknown>;
	try {
		body = (await req.json()) as Record<string, unknown>;
	} catch {
		return Response.json(
			{ code: "validation_failed", message: "invalid JSON" },
			{ status: 400 },
		);
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{
				code: "validation_failed",
				message: parsed.error.errors[0]?.message ?? "invalid body",
			},
			{ status: 400 },
		);
	}

	const { action, courseId, lessonId } = parsed.data;

	const [courseOwnerId, collaboratorRole] = await Promise.all([
		getCourseOwnerId(courseId),
		getCollaboratorRole(courseId, ctx.user.id),
	]);
	if (
		!canEditCoursePure({
			userId: ctx.user.id,
			userRole: role,
			courseOwnerId,
			collaboratorRole,
		})
	) {
		return Response.json({ code: "forbidden" }, { status: 403 });
	}

	const env = getEnv();
	const apiKey = env.BUNNY_API_KEY;
	if (!apiKey) {
		return Response.json(
			{ code: "bunny_not_configured", message: "Bunny credentials missing" },
			{ status: 500 },
		);
	}

	const service = makeService();

	if (action === "create") {
		try {
			const result = await service.createVideo({
				lessonId,
				fileName: parsed.data.fileName ?? "video.mp4",
				userId: ctx.user.id,
			});
			logger.info("lesson-video.created", {
				videoId: result.bunnyVideoId,
				lessonId,
				assetId: result.assetId,
				oldMediaId: result.oldMediaId,
			});
			return Response.json({
				ok: true,
				bunnyVideoId: result.bunnyVideoId,
				uploadUrl: result.uploadUrl,
				apiKey,
				oldMediaId: result.oldMediaId,
			});
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Bunny create failed";
			logger.error("lesson-video.create_failed", err, { lessonId });
			return Response.json({ code: "bunny_error", message }, { status: 502 });
		}
	}

	if (action === "cancel") {
		const bunnyVideoId = parsed.data.bunnyVideoId;
		if (!bunnyVideoId) {
			return Response.json(
				{ code: "validation_failed", message: "missing bunnyVideoId" },
				{ status: 400 },
			);
		}

		const result = await service.cancelVideo({ lessonId, bunnyVideoId });
		logger.info("lesson-video.cancelled", { bunnyVideoId, lessonId });
		return Response.json({
			ok: true,
			restoredMediaId: result.restoredMediaId,
		});
	}

	return Response.json(
		{ code: "validation_failed", message: "action must be create or cancel" },
		{ status: 400 },
	);
}

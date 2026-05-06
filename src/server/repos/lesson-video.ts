import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson, courseModule } from "@/db/schema/course";

export const LessonVideoRepo = {
	async getLessonVideoMediaId(lessonId: string): Promise<string | null> {
		const rows = await db
			.select({ videoMediaId: lesson.videoMediaId })
			.from(lesson)
			.where(eq(lesson.id, lessonId))
			.limit(1);
		return rows[0]?.videoMediaId ?? null;
	},

	async createVideoAsset(args: {
		storageKey: string;
		userId: string;
	}): Promise<{ id: string }> {
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

	async updateLessonVideo(
		lessonId: string,
		mediaAssetId: string | null,
	): Promise<void> {
		await db
			.update(lesson)
			.set({ videoMediaId: mediaAssetId, updatedAt: new Date() })
			.where(eq(lesson.id, lessonId));
	},

	async findAssetByBunnyId(
		bunnyVideoId: string,
	): Promise<{ id: string } | null> {
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

	async findPreviousVideoMediaId(
		lessonId: string,
		excludeAssetId: string,
	): Promise<string | null> {
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

	async deleteMediaAsset(assetId: string): Promise<void> {
		await db.delete(mediaAsset).where(eq(mediaAsset.id, assetId));
	},

	async getLessonVideoAsset(lessonId: string): Promise<
		| {
				assetId: string;
				storage: string;
				bunnyId: string;
		  }
		| undefined
	> {
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
		return row;
	},

	async setAssetEncoding(assetId: string): Promise<void> {
		await db
			.update(mediaAsset)
			.set({ status: "encoding" })
			.where(eq(mediaAsset.id, assetId));
	},
};

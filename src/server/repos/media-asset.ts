import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";

export const MediaAssetRepo = {
	async getById(
		id: string,
	): Promise<{ id: string; storageKey: string } | null> {
		const rows = await db
			.select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
			.from(mediaAsset)
			.where(eq(mediaAsset.id, id))
			.limit(1);
		return rows[0] ?? null;
	},

	async delete(id: string): Promise<void> {
		await db.delete(mediaAsset).where(eq(mediaAsset.id, id));
	},

	async findAssetByBunnyId(
		bunnyId: string,
	): Promise<
		| { id: string; currentStatus: string; currentDuration: number | null }
		| undefined
	> {
		const rows = await db
			.select({
				id: mediaAsset.id,
				currentStatus: mediaAsset.status,
				currentDuration: mediaAsset.durationSeconds,
			})
			.from(mediaAsset)
			.where(
				and(
					eq(mediaAsset.storage, "bunny_stream"),
					eq(mediaAsset.storageKey, bunnyId),
				),
			)
			.limit(1);
		return rows[0];
	},

	async updateAsset(
		assetId: string,
		updates: Partial<{
			status: string;
			durationSeconds: number | null;
		}>,
	): Promise<void> {
		await db.update(mediaAsset).set(updates).where(eq(mediaAsset.id, assetId));
	},

	async createImageAsset(args: {
		storageKey: string;
		mimeType: string;
		userId: string;
	}): Promise<{ id: string }> {
		const [row] = await db
			.insert(mediaAsset)
			.values({
				kind: "image",
				storage: "r2_public",
				storageKey: args.storageKey,
				mimeType: args.mimeType,
				status: "ready",
				createdByUserId: args.userId,
			})
			.returning({ id: mediaAsset.id });
		return { id: row!.id };
	},

	async createRaw(
		values: typeof mediaAsset.$inferInsert,
	): Promise<{ id: string }> {
		const [media] = await db
			.insert(mediaAsset)
			.values(values)
			.returning({ id: mediaAsset.id });
		return media!;
	},
};

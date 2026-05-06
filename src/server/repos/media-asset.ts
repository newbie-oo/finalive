import "server-only";
import { eq } from "drizzle-orm";
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
};

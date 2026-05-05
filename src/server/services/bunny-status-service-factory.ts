import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";
import { BunnyVideoStatusService } from "./bunny-video-status";

/**
 * Shared factory for BunnyVideoStatusService wired to the local DB.
 * Used by both the polling route (GET /api/admin/video-status) and
 * the webhook handler (POST /api/webhooks/bunny).
 */
export function makeBunnyStatusService() {
  return new BunnyVideoStatusService({
    findAssetByBunnyId: async (bunnyId) => {
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
    updateAsset: async (assetId, updates) => {
      await db
        .update(mediaAsset)
        .set(updates)
        .where(eq(mediaAsset.id, assetId));
    },
    updateLessonDuration: async (assetId, durationSeconds) => {
      await db
        .update(lesson)
        .set({ durationSeconds, updatedAt: new Date() })
        .where(eq(lesson.videoMediaId, assetId));
    },
  });
}

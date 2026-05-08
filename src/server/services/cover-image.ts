import "server-only";
import type { ObjectStorage } from "./storage";
import { logger } from "@/lib/logger";
import { coverKeys } from "@/lib/storage-keys";

export interface CoverImageDeps {
  storage: ObjectStorage;
  /** Look up a media asset by id. Returns null if not found. */
  getMediaAsset: (
    mediaAssetId: string,
  ) => Promise<{ id: string; storageKey: string } | null>;
  /** Delete a media asset row from the DB. */
  deleteMediaAsset: (mediaAssetId: string) => Promise<void>;
  /** Update the course's coverMediaId. */
  updateCourseCover: (
    courseId: string,
    mediaAssetId: string | null,
  ) => Promise<void>;
}

/**
 * Replaces a course cover image: deletes old cover files from storage,
 * removes the old media_asset row, and updates the course.
 * Failures during old-cover cleanup are swallowed (best-effort).
 */
export class CoverImageService {
  constructor(private deps: CoverImageDeps) {}

  async replaceCover(params: {
    courseId: string;
    newMediaAssetId: string;
    oldCoverMediaId: string | null;
  }): Promise<void> {
    // Update the course first so the FK is released before we delete the old
    // media_asset row (otherwise Postgres raises 23503).
    await this.deps.updateCourseCover(params.courseId, params.newMediaAssetId);

    if (params.oldCoverMediaId) {
      const oldAsset = await this.deps.getMediaAsset(params.oldCoverMediaId);
      if (oldAsset) {
        try {
          await Promise.all(
            coverKeys(oldAsset.storageKey).map((key) =>
              this.deps.storage.delete(key),
            ),
          );
        } catch (err) {
          logger.error("cover_image.cleanup_failed", err, {
            mediaAssetId: oldAsset.id,
          });
        }
        await this.deps.deleteMediaAsset(oldAsset.id);
      }
    }
  }
}

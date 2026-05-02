import "server-only";
import type { ObjectStorage } from "./storage";

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
		if (params.oldCoverMediaId) {
			const oldAsset = await this.deps.getMediaAsset(params.oldCoverMediaId);
			if (oldAsset) {
				try {
					const uuid = oldAsset.storageKey;
					await this.deps.storage.delete(`covers/${uuid}-640.webp`);
					await this.deps.storage.delete(`covers/${uuid}-1200.webp`);
				} catch (err) {
					console.error(
						"CoverImageService: failed to delete old cover files:",
						err,
					);
				}
				await this.deps.deleteMediaAsset(oldAsset.id);
			}
		}

		await this.deps.updateCourseCover(params.courseId, params.newMediaAssetId);
	}
}

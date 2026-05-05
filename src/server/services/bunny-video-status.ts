import "server-only";

/** Bunny Stream webhook status codes */
export const BUNNY_WEBHOOK_STATUS = {
	UPLOADED: 1,
	FINISHED: 4,
	ERROR: 5,
	UPLOAD_FAILED: 6,
} as const;

export type BunnyStatusName =
	| "created"
	| "uploaded"
	| "processing"
	| "transcoding"
	| "finished"
	| "error"
	| "upload_failed"
	| "jit_segmenting"
	| "unknown";

const STATUS_MAP: Record<number, BunnyStatusName> = {
	0: "created",
	1: "uploaded",
	2: "processing",
	3: "transcoding",
	4: "finished",
	5: "error",
	6: "upload_failed",
	7: "jit_segmenting",
};

export function bunnyStatusName(code: number): BunnyStatusName {
	return STATUS_MAP[code] ?? "unknown";
}

export interface BunnyVideoStatusDeps {
	/** Find a media_asset by its Bunny video GUID. */
	findAssetByBunnyId: (bunnyId: string) => Promise<
		| {
				id: string;
				currentStatus: string;
				currentDuration: number | null;
		  }
		| undefined
	>;
	/** Update the media_asset row. */
	updateAsset: (
		assetId: string,
		updates: { status?: string; durationSeconds?: number | null },
	) => Promise<void>;
	/** Update the lesson's duration when the video is ready. */
	updateLessonDuration: (
		assetId: string,
		durationSeconds: number,
	) => Promise<void>;
}

export interface SyncResult {
	/** True when local DB was updated. */
	changed: boolean;
	/** The new status written to media_asset, or null if unchanged. */
	newStatus: string | null;
}

/**
 * Sync Bunny video status into our local media_asset + lesson tables.
 * Used by both the polling route (GET) and the webhook (POST).
 *
 * Idempotent: if the DB already reflects the Bunny state, returns
 * changed=false so callers can skip unnecessary writes.
 */
export class BunnyVideoStatusService {
	constructor(private deps: BunnyVideoStatusDeps) {}

	/**
	 * Sync a Bunny status update into the DB.
	 * @param bunnyId The Bunny video GUID
	 * @param bunnyStatus Bunny status code (1=uploaded, 4=finished, 5=error, 6=upload_failed)
	 * @param durationSeconds Video duration in seconds, if available
	 */
	async sync(
		bunnyId: string,
		bunnyStatus: number,
		durationSeconds: number | null,
	): Promise<SyncResult> {
		const asset = await this.deps.findAssetByBunnyId(bunnyId);
		if (!asset) {
			return { changed: false, newStatus: null };
		}

		const newAssetStatus =
			bunnyStatus === BUNNY_WEBHOOK_STATUS.FINISHED
				? "ready"
				: bunnyStatus === BUNNY_WEBHOOK_STATUS.ERROR ||
						bunnyStatus === BUNNY_WEBHOOK_STATUS.UPLOAD_FAILED
					? "failed"
					: null;

		const durationChanged =
			durationSeconds !== null && asset.currentDuration !== durationSeconds;
		const statusChanged =
			newAssetStatus !== null && asset.currentStatus !== newAssetStatus;

		if (!durationChanged && !statusChanged) {
			return { changed: false, newStatus: null };
		}

		const updates: { status?: string; durationSeconds?: number | null } = {};
		if (statusChanged) updates.status = newAssetStatus!;
		if (durationChanged) updates.durationSeconds = durationSeconds;

		await this.deps.updateAsset(asset.id, updates);

		if (durationChanged && durationSeconds !== null) {
			await this.deps.updateLessonDuration(asset.id, durationSeconds);
		}

		return { changed: true, newStatus: newAssetStatus };
	}
}

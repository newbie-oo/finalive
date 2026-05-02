import "server-only";
import type { ObjectStorage } from "./storage";

export interface ProcessedImage {
	buffer: Buffer;
	key: string;
	contentType: string;
	/** Name used in the returned urls map so callers don't need to parse keys. */
	name: string;
}

export interface ImageUploadDeps {
	storage: ObjectStorage;
	processImage: (buffer: Buffer) => Promise<ProcessedImage[]>;
	createMediaAsset: (args: {
		storageKey: string;
		mimeType: string;
		userId: string;
	}) => Promise<{ id: string }>;
	maxSizeBytes: number;
}

export interface ImageUploadResult {
	mediaAssetId: string;
	urls: Record<string, string>;
}

/**
 * Generic image upload: validate → process → store → record.
 * The processImage hook decides how many variants to create and their keys.
 */
export class ImageUploadService {
	constructor(private deps: ImageUploadDeps) {}

	async upload(params: {
		bytes: Buffer;
		userId: string;
		/** Override the storageKey written to media_asset. Defaults to the first variant's key. */
		storageKey?: string;
	}): Promise<ImageUploadResult> {
		if (params.bytes.length === 0) {
			throw new ImageUploadError("empty_file", "File is empty");
		}
		if (params.bytes.length > this.deps.maxSizeBytes) {
			throw new ImageUploadError(
				"file_too_large",
				`File exceeds ${this.deps.maxSizeBytes} bytes`,
			);
		}

		const variants = await this.deps.processImage(params.bytes);
		if (variants.length === 0) {
			throw new ImageUploadError(
				"processing_failed",
				"Image processing failed",
			);
		}

		await Promise.all(
			variants.map((v) =>
				this.deps.storage.put(v.key, v.buffer, v.contentType),
			),
		);

		const primary = variants[0]!;
		const asset = await this.deps.createMediaAsset({
			storageKey: params.storageKey ?? primary.key,
			mimeType: primary.contentType,
			userId: params.userId,
		});

		const urls: Record<string, string> = {};
		for (const v of variants) {
			urls[v.name] = this.deps.storage.urlFor(v.key);
		}

		return { mediaAssetId: asset.id, urls };
	}
}

export class ImageUploadError extends Error {
	constructor(
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "ImageUploadError";
	}
}

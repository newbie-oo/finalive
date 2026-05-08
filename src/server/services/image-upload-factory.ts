import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { MediaAssetRepo } from "@/server/repos/media-asset";
import { ApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { thaiErrorMessage } from "@/lib/error-messages";
import { R2ObjectStorage } from "./storage";
import {
	ImageUploadService,
	ImageUploadError,
	type ImageUploadResult,
	type ProcessedImage,
} from "./image-upload";
import type { ApiUser } from "@/lib/api-route";

export interface ImageUploadFactoryOptions {
	maxSizeBytes: number;
	processImage: (buffer: Buffer) => Promise<ProcessedImage[]>;
}

/**
 * Factory that wires the standard R2 public storage + mediaAsset creation
 * for image upload routes. Callers only supply the image processing strategy.
 */
export function createImageUploadService(options: ImageUploadFactoryOptions) {
	const storage = new R2ObjectStorage("public");
	return new ImageUploadService({
		storage,
		maxSizeBytes: options.maxSizeBytes,
		processImage: options.processImage,
		createMediaAsset: MediaAssetRepo.createImageAsset,
	});
}

export interface UploadHandlerOptions {
	makeService: () => ImageUploadService;
	buildResponse: (result: ImageUploadResult) => unknown;
	logPrefix: string;
}

/**
 * Shared upload handler used by both /api/upload/image and
 * /api/upload/lesson-image. Deduplicates FormData parsing, file validation,
 * and error formatting so each route only supplies its processing strategy.
 *
 * Errors throw `ApiError` so the route wrapper formats the standard
 * `{ code, message, request_id }` envelope rather than ad-hoc shapes.
 */
export async function runImageUpload(
	req: NextRequest,
	user: ApiUser,
	options: UploadHandlerOptions,
): Promise<NextResponse> {
	let formData: FormData;
	try {
		formData = await req.formData();
	} catch {
		throw new ApiError("validation_failed", "invalid form data");
	}

	const file = formData.get("file") as File | null;
	if (!file || !file.type.startsWith("image/")) {
		throw new ApiError("validation_failed", "invalid file");
	}

	try {
		const buffer = Buffer.from(await file.arrayBuffer());
		const service = options.makeService();
		const result = await service.upload({ bytes: buffer, userId: user.id });
		return NextResponse.json(options.buildResponse(result));
	} catch (err) {
		if (err instanceof ApiError) throw err;
		if (err instanceof ImageUploadError) {
			throw new ApiError("validation_failed", err.code);
		}
		logger.error(`${options.logPrefix} upload failed`, { err });
		throw new ApiError("internal_error", thaiErrorMessage("internal_error"));
	}
}

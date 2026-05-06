import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
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
		createMediaAsset: async (args) => {
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
		return NextResponse.json({ error: "invalid_form" }, { status: 400 });
	}

	const file = formData.get("file") as File | null;
	if (!file || !file.type.startsWith("image/")) {
		return NextResponse.json({ error: "invalid_file" }, { status: 400 });
	}

	try {
		const buffer = Buffer.from(await file.arrayBuffer());
		const service = options.makeService();
		const result = await service.upload({ bytes: buffer, userId: user.id });
		return NextResponse.json(options.buildResponse(result));
	} catch (err) {
		if (err instanceof ImageUploadError) {
			return NextResponse.json({ error: err.code }, { status: 400 });
		}
		console.error(`${options.logPrefix} upload failed:`, err);
		return NextResponse.json({ error: "processing_failed" }, { status: 500 });
	}
}

import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { apiRouteRaw } from "@/lib/api-route";
import { R2ObjectStorage } from "@/server/services/storage";
import {
	ImageUploadService,
	ImageUploadError,
} from "@/server/services/image-upload";
import { rateLimitConfigs } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;

function makeService(imageUuid: string) {
	const storage = new R2ObjectStorage("public");
	return new ImageUploadService({
		storage,
		maxSizeBytes: MAX_SIZE,
		processImage: async (buffer) => {
			const [coverBuffer, ogBuffer] = await Promise.all([
				sharp(buffer)
					.resize(640, 360, { fit: "cover" })
					.webp({ quality: 80 })
					.toBuffer(),
				sharp(buffer)
					.resize(1200, 630, { fit: "cover" })
					.webp({ quality: 80 })
					.toBuffer(),
			]);
			return [
				{
					buffer: coverBuffer,
					key: `covers/${imageUuid}-640.webp`,
					contentType: "image/webp",
					name: "cover",
				},
				{
					buffer: ogBuffer,
					key: `covers/${imageUuid}-1200.webp`,
					contentType: "image/webp",
					name: "og",
				},
			];
		},
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

export const POST = apiRouteRaw({
	auth: "required",
	rateLimit: rateLimitConfigs.upload,
	handler: async ({ req, user }) => {
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
			const imageUuid = crypto.randomUUID();
			const service = makeService(imageUuid);
			const result = await service.upload({
				bytes: buffer,
				userId: user!.id,
				storageKey: imageUuid,
			});

			return {
				mediaAssetId: result.mediaAssetId,
				urls: {
					cover: result.urls.cover ?? "",
					og: result.urls.og ?? "",
				},
			};
		} catch (err) {
			if (err instanceof ImageUploadError) {
				return NextResponse.json({ error: err.code }, { status: 400 });
			}
			console.error("Image upload failed:", err);
			return NextResponse.json({ error: "processing_failed" }, { status: 500 });
		}
	},
});

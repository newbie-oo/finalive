import sharp from "sharp";
import { apiRouteRaw } from "@/lib/api-route";
import {
	createImageUploadService,
	runImageUpload,
} from "@/server/services/image-upload-factory";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

// Rate limiting is handled by the Vercel Firewall rule for /api/upload/*
// (60/min/IP, Challenge action) — see README.md "Rate limiting".

function makeService() {
	return createImageUploadService({
		maxSizeBytes: MAX_UPLOAD_BYTES,
		processImage: async (buffer) => {
			const processed = await sharp(buffer)
				.resize(1920, undefined, { fit: "inside", withoutEnlargement: true })
				.webp({ quality: 85 })
				.toBuffer();
			const uuid = crypto.randomUUID();
			const key = `lesson-images/${uuid}.webp`;
			return [
				{
					buffer: processed,
					key,
					contentType: "image/webp",
					name: "default",
				},
			];
		},
	});
}

export const POST = apiRouteRaw({
	auth: "required",
	handler: async ({ req, user }) => {
		return runImageUpload(req, user!, {
			makeService,
			buildResponse: (result) => ({
				mediaAssetId: result.mediaAssetId,
				url: result.urls.default ?? "",
			}),
			logPrefix: "Lesson image",
		});
	},
});

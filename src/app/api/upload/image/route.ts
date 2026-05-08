import sharp from "sharp";
import { apiRouteRaw } from "@/lib/api-route";
import {
	createImageUploadService,
	runImageUpload,
} from "@/server/services/image-upload-factory";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

// Rate limiting is handled by the Vercel Firewall rule for /api/upload/*
// (60/min/IP, Challenge action) — see README.md "Rate limiting".

function makeService(imageUuid: string) {
	return createImageUploadService({
		maxSizeBytes: MAX_UPLOAD_BYTES,
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
	});
}

export const POST = apiRouteRaw({
	auth: "required",
	handler: async ({ req, user }) => {
		const imageUuid = crypto.randomUUID();
		return runImageUpload(req, user!, {
			makeService: () => makeService(imageUuid),
			buildResponse: (result) => ({
				mediaAssetId: result.mediaAssetId,
				urls: {
					cover: result.urls.cover ?? "",
					og: result.urls.og ?? "",
				},
			}),
			logPrefix: "Image",
		});
	},
});

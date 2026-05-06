import sharp from "sharp";
import { apiRouteRaw } from "@/lib/api-route";
import {
	createImageUploadService,
	runImageUpload,
} from "@/server/services/image-upload-factory";
import { rateLimitConfigs } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;

function makeService() {
	return createImageUploadService({
		maxSizeBytes: MAX_SIZE,
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
	rateLimit: rateLimitConfigs.upload,
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

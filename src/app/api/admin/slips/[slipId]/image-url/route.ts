import { apiRoute } from "@/lib/api-route";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { presignReadUrl } from "@/server/services/r2";
import { getSlipImageMedia } from "@/server/repos/slip";
import { ApiError } from "@/lib/api-error";

const SIGN_TTL_SECONDS = 600;

export const GET = apiRoute({
	auth: "admin",
	rateLimit: rateLimitConfigs.api,
	handler: async ({ req }) => {
		const slipId = new URL(req.url).pathname.split("/").slice(-2)[0]!;
		const media = await getSlipImageMedia(slipId);

		if (!media) throw new ApiError("not_found", "slip not found");
		if (media.storage !== "r2_private") {
			throw new ApiError(
				"invalid_state",
				"slip image is not in private storage",
			);
		}

		const url = await presignReadUrl({
			bucket: "private",
			key: media.storageKey,
			expiresInSeconds: SIGN_TTL_SECONDS,
		});

		return {
			url,
			mimeType: media.mimeType,
			expiresInSeconds: SIGN_TTL_SECONDS,
		};
	},
});

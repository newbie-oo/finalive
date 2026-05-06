import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip } from "@/db/schema/payment";
import { mediaAsset } from "@/db/schema/media";
import { apiRoute } from "@/lib/api-route";
import { presignReadUrl } from "@/server/services/r2";
import { ApiError } from "@/lib/api-error";

const SIGN_TTL_SECONDS = 600;

export const GET = apiRoute({
	auth: "admin",
	handler: async ({ req }) => {
		const slipId = new URL(req.url).pathname.split("/").slice(-2)[0]!;
		const rows = await db
			.select({
				storageKey: mediaAsset.storageKey,
				storage: mediaAsset.storage,
				mimeType: mediaAsset.mimeType,
			})
			.from(paymentSlip)
			.innerJoin(mediaAsset, eq(paymentSlip.imageMediaId, mediaAsset.id))
			.where(eq(paymentSlip.id, slipId))
			.limit(1);

		const media = rows[0];
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

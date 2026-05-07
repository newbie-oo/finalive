import { z } from "zod";
import { apiRouteRaw } from "@/lib/api-route";
import { getEnv } from "@/lib/env";
import { verifyHmacSha256 } from "@/lib/webhook-signature";
import { logger } from "@/lib/logger";
import { makeBunnyStatusService } from "@/server/services/bunny-status-service-factory";

const bunnyWebhookSchema = z.object({
	VideoLibraryId: z.number().optional(),
	VideoGuid: z.string().optional(),
	Status: z.number().optional(),
	Length: z.number().optional(),
	Title: z.string().optional(),
});

export const POST = apiRouteRaw({
	handler: async ({ req }) => {
		const env = getEnv();
		const libraryId = env.BUNNY_LIBRARY_ID;
		const webhookSecret = env.BUNNY_WEBHOOK_SECRET;

		const rawBody = await req.text();

		if (webhookSecret) {
			const version = req.headers.get("x-bunnystream-signature-version");
			const algorithm = req.headers.get("x-bunnystream-signature-algorithm");
			const sig = req.headers.get("x-bunnystream-signature");
			if (version !== "v1" || algorithm !== "hmac-sha256") {
				return { error: "unsupported_signature_scheme" };
			}
			if (!verifyHmacSha256(rawBody, sig, webhookSecret)) {
				return { error: "unauthorized" };
			}
		}

		let rawPayload: unknown;
		try {
			rawPayload = JSON.parse(rawBody);
		} catch {
			return { error: "invalid_json" };
		}

		const parsed = bunnyWebhookSchema.safeParse(rawPayload);
		if (!parsed.success) {
			return { error: "invalid_payload", details: parsed.error.flatten() };
		}

		const { VideoGuid: videoGuid, VideoLibraryId: receivedLibraryId } =
			parsed.data;

		if (!videoGuid || !receivedLibraryId) {
			return { error: "missing_fields" };
		}

		if (String(receivedLibraryId) !== String(libraryId)) {
			return { error: "invalid_library" };
		}

		const status = parsed.data.Status ?? -1;
		if (![1, 4, 5, 6].includes(status)) {
			return { ok: true, note: "ignored_status" };
		}

		const durationSeconds =
			typeof parsed.data.Length === "number"
				? Math.round(parsed.data.Length)
				: null;
		const service = makeBunnyStatusService();
		const result = await service.sync(videoGuid, status, durationSeconds);

		if (!result.changed) {
			return { ok: true, note: "already_applied" };
		}

		logger.info("bunny.webhook.applied", {
			videoGuid,
			bunnyStatus: status,
			durationSeconds,
			assetStatus: result.newStatus,
		});

		return { ok: true };
	},
});

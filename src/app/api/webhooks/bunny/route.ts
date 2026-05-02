import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { verifyHmacSha256 } from "@/lib/webhook-signature";
import { logger } from "@/lib/logger";
import { makeBunnyStatusService } from "@/server/services/bunny-status-service-factory";

interface BunnyWebhookPayload {
	VideoLibraryId?: number;
	VideoGuid?: string;
	Status?: number;
	Length?: number;
	Title?: string;
}

export async function POST(request: Request) {
	const env = getEnv();
	const libraryId = env.BUNNY_LIBRARY_ID;
	const webhookSecret = env.BUNNY_WEBHOOK_SECRET;

	const rawBody = await request.text();

	if (webhookSecret) {
		const sig = request.headers.get("x-webhook-signature");
		if (!verifyHmacSha256(rawBody, sig, webhookSecret)) {
			return NextResponse.json({ error: "unauthorized" }, { status: 401 });
		}
	}

	let payload: BunnyWebhookPayload;
	try {
		payload = JSON.parse(rawBody) as BunnyWebhookPayload;
	} catch {
		return NextResponse.json({ error: "invalid_json" }, { status: 400 });
	}

	const videoGuid = payload.VideoGuid;
	const receivedLibraryId = payload.VideoLibraryId;

	if (!videoGuid || !receivedLibraryId) {
		return NextResponse.json({ error: "missing_fields" }, { status: 400 });
	}

	if (String(receivedLibraryId) !== String(libraryId)) {
		return NextResponse.json({ error: "invalid_library" }, { status: 403 });
	}

	const status = payload.Status ?? -1;
	if (![1, 4, 5, 6].includes(status)) {
		return NextResponse.json({ ok: true, note: "ignored_status" });
	}

	const durationSeconds =
		typeof payload.Length === "number" ? Math.round(payload.Length) : null;
	const service = makeBunnyStatusService();
	const result = await service.sync(videoGuid, status, durationSeconds);

	if (!result.changed) {
		return NextResponse.json({ ok: true, note: "already_applied" });
	}

	logger.info("bunny.webhook.applied", {
		videoGuid,
		bunnyStatus: status,
		durationSeconds,
		assetStatus: result.newStatus,
	});

	return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";
import { eq, and } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { verifyHmacSha256 } from "@/lib/webhook-signature";
import { logger } from "@/lib/logger";

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

  // Read raw body once so we can verify the signature against it before
  // parsing — both sides must hash the exact bytes.
  const rawBody = await request.text();

  // Require an HMAC header in `X-Webhook-Signature` (lowercase hex of
  // HMAC-SHA256(body, secret)). The previous implementation accepted a
  // shared secret in the URL query string, which leaked into proxy logs
  // and Referer headers. The header-based scheme keeps the secret out of
  // logs and gates against body tampering.
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

  // Bunny Stream webhook status codes:
  //   1 Uploaded   — bytes received, not yet encoded; carries Length
  //   4 Finished   — encoding done, playable (HLS ready)
  //   5 Error      — transcode failure
  //   6 UploadFail — upload itself failed
  // Anything else is ignored.
  const status = payload.Status ?? -1;
  if (![1, 4, 5, 6].includes(status)) {
    return NextResponse.json({ ok: true, note: "ignored_status" });
  }

  const durationSeconds = payload.Length ? Math.round(payload.Length) : null;

  const assets = await db
    .select({
      id: mediaAsset.id,
      currentDuration: mediaAsset.durationSeconds,
      currentStatus: mediaAsset.status,
    })
    .from(mediaAsset)
    .where(
      and(
        eq(mediaAsset.storage, "bunny_stream"),
        eq(mediaAsset.storageKey, videoGuid),
      ),
    )
    .limit(1);

  const asset = assets[0];
  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }

  // Map Bunny status → media_asset lifecycle. Status=1 (Uploaded) keeps
  // the asset in 'encoding' until Status=4 fires.
  const newAssetStatus =
    status === 4 ? "ready" : status === 5 || status === 6 ? "failed" : null;

  // Idempotency: if nothing would change, skip the writes. Bunny redelivers
  // the same event on retries; this keeps replay cheap without a dedupe
  // table.
  const durationChanged =
    durationSeconds !== null && asset.currentDuration !== durationSeconds;
  const statusChanged =
    newAssetStatus !== null && asset.currentStatus !== newAssetStatus;
  if (!durationChanged && !statusChanged) {
    return NextResponse.json({ ok: true, note: "already_applied" });
  }

  const assetUpdate: { durationSeconds?: number | null; status?: string } = {};
  if (durationChanged) assetUpdate.durationSeconds = durationSeconds;
  if (statusChanged) assetUpdate.status = newAssetStatus!;
  await db.update(mediaAsset).set(assetUpdate).where(eq(mediaAsset.id, asset.id));

  if (durationChanged) {
    await db
      .update(lesson)
      .set({ durationSeconds, updatedAt: new Date() })
      .where(eq(lesson.videoMediaId, asset.id));
  }

  logger.info("bunny.webhook.applied", {
    videoGuid,
    bunnyStatus: status,
    durationSeconds,
    assetStatus: newAssetStatus,
    assetId: asset.id,
  });

  return NextResponse.json({ ok: true });
}

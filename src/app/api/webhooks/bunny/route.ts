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

  // Only process when video is active (Status === 1).
  if (payload.Status !== 1) {
    return NextResponse.json({ ok: true, note: "ignored_non_active" });
  }

  const durationSeconds = payload.Length ? Math.round(payload.Length) : null;

  const assets = await db
    .select({
      id: mediaAsset.id,
      currentDuration: mediaAsset.durationSeconds,
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

  // Idempotency: if duration is already what the webhook reports, skip the
  // writes. Bunny may redeliver the same Status=1 event; this keeps the
  // handler a no-op on replay without needing a separate dedupe table.
  if (asset.currentDuration === durationSeconds) {
    return NextResponse.json({ ok: true, note: "already_applied" });
  }

  await db
    .update(mediaAsset)
    .set({ durationSeconds })
    .where(eq(mediaAsset.id, asset.id));

  await db
    .update(lesson)
    .set({ durationSeconds, updatedAt: new Date() })
    .where(eq(lesson.videoMediaId, asset.id));

  logger.info("bunny.webhook.applied", {
    videoGuid,
    durationSeconds,
    assetId: asset.id,
  });

  return NextResponse.json({ ok: true });
}

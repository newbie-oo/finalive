import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";
import { eq, and } from "drizzle-orm";
import { getEnv } from "@/lib/env";

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

  let payload: BunnyWebhookPayload;
  try {
    payload = (await request.json()) as BunnyWebhookPayload;
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

  // Find media_asset by bunny video guid.
  const assets = await db
    .select({ id: mediaAsset.id })
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

  // Update media_asset duration.
  await db
    .update(mediaAsset)
    .set({ durationSeconds })
    .where(eq(mediaAsset.id, asset.id));

  // Update linked lesson duration.
  await db
    .update(lesson)
    .set({ durationSeconds, updatedAt: new Date() })
    .where(eq(lesson.videoMediaId, asset.id));

  return NextResponse.json({ ok: true });
}

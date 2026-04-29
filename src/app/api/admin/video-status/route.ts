import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/server/auth-session";
import { getEnv } from "@/lib/env";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

interface BunnyVideoStatus {
  guid: string;
  title: string;
  status: number;
  length?: number;
  // Bunny Stream GET /library/{libId}/videos/{id} status codes:
  //   0 Created
  //   1 Uploaded
  //   2 Processing
  //   3 Transcoding
  //   4 Finished (playable — HLS available)
  //   5 Error
  //   6 UploadFailed
  //   7 JitSegmenting
  // The Webhook payload uses a different scheme; see api/webhooks/bunny.
}

export async function GET(request: NextRequest) {
  await requireRole("admin");

  const videoId = request.nextUrl.searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }

  const env = getEnv();
  const libraryId = env.BUNNY_LIBRARY_ID;
  const apiKey = env.BUNNY_API_KEY;

  if (!libraryId || !apiKey) {
    return NextResponse.json({ error: "Bunny not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`, {
      headers: {
        Accept: "application/json",
        AccessKey: apiKey,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown");
      return NextResponse.json(
        { error: `Bunny API error: ${res.status} ${text}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as BunnyVideoStatus;

    const statusMap: Record<number, string> = {
      0: "created",
      1: "uploaded",
      2: "processing",
      3: "transcoding",
      4: "finished",
      5: "error",
      6: "upload_failed",
      7: "jit_segmenting",
    };

    const isReady = data.status === 4;
    const durationSeconds = data.length ? Math.round(data.length) : null;

    // The Bunny webhook is the canonical path for syncing duration/status,
    // but it can't reach localhost during dev. When the poll detects a
    // Finished video and the local mediaAsset is still in 'encoding', mirror
    // what the webhook would do so the lesson page sees the real duration.
    if (isReady) {
      const [asset] = await db
        .select({
          id: mediaAsset.id,
          status: mediaAsset.status,
          durationSeconds: mediaAsset.durationSeconds,
        })
        .from(mediaAsset)
        .where(
          and(
            eq(mediaAsset.storage, "bunny_stream"),
            eq(mediaAsset.storageKey, videoId),
          ),
        )
        .limit(1);
      if (asset) {
        const needsStatus = asset.status !== "ready";
        const needsDuration =
          durationSeconds !== null && asset.durationSeconds !== durationSeconds;
        if (needsStatus || needsDuration) {
          const update: { status?: string; durationSeconds?: number } = {};
          if (needsStatus) update.status = "ready";
          if (needsDuration && durationSeconds !== null) {
            update.durationSeconds = durationSeconds;
          }
          await db.update(mediaAsset).set(update).where(eq(mediaAsset.id, asset.id));
          if (needsDuration && durationSeconds !== null) {
            await db
              .update(lesson)
              .set({ durationSeconds, updatedAt: new Date() })
              .where(eq(lesson.videoMediaId, asset.id));
          }
        }
      }
    }

    return NextResponse.json({
      videoId: data.guid,
      title: data.title,
      status: statusMap[data.status] ?? "unknown",
      statusCode: data.status,
      isReady,
      durationSeconds,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch video status" }, { status: 500 });
  }
}

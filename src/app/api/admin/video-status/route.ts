import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth-session";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

interface BunnyVideoStatus {
  guid: string;
  title: string;
  status: number;
  // 0 = created, 1 = queued, 2 = processing, 3 = finished, 4 = error, 5 = uploading, 6 = deleting, 7 = failed
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
      1: "queued",
      2: "processing",
      3: "finished",
      4: "error",
      5: "uploading",
      6: "deleting",
      7: "failed",
    };

    return NextResponse.json({
      videoId: data.guid,
      title: data.title,
      status: statusMap[data.status] ?? "unknown",
      statusCode: data.status,
      isReady: data.status === 3,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch video status" }, { status: 500 });
  }
}

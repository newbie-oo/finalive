import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth-session";
import { getEnv } from "@/lib/env";
import { makeBunnyStatusService } from "@/server/services/bunny-status-service-factory";
import { bunnyStatusName } from "@/server/services/bunny-video-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return NextResponse.json(
      { error: "Bunny not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      {
        headers: {
          Accept: "application/json",
          AccessKey: apiKey,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown");
      return NextResponse.json(
        { error: `Bunny API error: ${res.status} ${text}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      guid: string;
      title: string;
      status: number;
      length?: number;
    };

    const isReady = data.status === 4;
    const durationSeconds =
      typeof data.length === "number" ? Math.round(data.length) : null;

    if (isReady) {
      const service = makeBunnyStatusService();
      await service.sync(videoId, data.status, durationSeconds);
    }

    return NextResponse.json({
      videoId: data.guid,
      title: data.title,
      status: bunnyStatusName(data.status),
      statusCode: data.status,
      isReady,
      durationSeconds,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch video status" },
      { status: 500 },
    );
  }
}

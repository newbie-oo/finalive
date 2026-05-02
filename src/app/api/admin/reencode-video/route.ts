import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireRole } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson, courseModule } from "@/db/schema/course";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Admin-only escalation: ask Bunny Stream to reprocess a video that
 * encoded incompletely (e.g. HLS playlist duration < source duration).
 * Bunny has a `POST /library/{lib}/videos/{guid}/reencode` endpoint
 * that retains the same GUID and just regenerates the renditions.
 *
 * We flip the local mediaAsset back to 'encoding' so the lesson page
 * shows the encoding spinner again until the new HLS appears.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

export async function POST(req: Request) {
  const { user } = await requireRole("admin");
  let body: { lessonId?: string; courseId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "validation_failed" }, { status: 400 });
  }

  const { lessonId, courseId } = body;
  if (!lessonId || !courseId) {
    return NextResponse.json({ code: "validation_failed" }, { status: 400 });
  }

  if (!(await canEditCourse(user.id, user.role, courseId))) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  // Lookup the Bunny video GUID via the lesson → mediaAsset relation, also
  // confirming the lesson really belongs to this course.
  const [row] = await db
    .select({
      assetId: mediaAsset.id,
      storage: mediaAsset.storage,
      bunnyId: mediaAsset.storageKey,
    })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
    .where(eq(lesson.id, lessonId))
    .limit(1);

  if (!row || row.storage !== "bunny_stream") {
    return NextResponse.json({ code: "not_found" }, { status: 404 });
  }

  const env = getEnv();
  const lib = env.BUNNY_LIBRARY_ID;
  const apiKey = env.BUNNY_API_KEY;
  if (!lib || !apiKey) {
    return NextResponse.json({ code: "bunny_not_configured" }, { status: 500 });
  }

  const res = await fetch(
    `${BUNNY_API_BASE}/library/${lib}/videos/${row.bunnyId}/reencode`,
    {
      method: "POST",
      headers: { AccessKey: apiKey, accept: "application/json" },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("reencode-video.bunny_failed", { status: res.status, text });
    return NextResponse.json(
      { code: "bunny_error", message: `Bunny ${res.status}` },
      { status: 502 },
    );
  }

  // Reset our local status so the polling UI shows the spinner again.
  await db
    .update(mediaAsset)
    .set({ status: "encoding" })
    .where(eq(mediaAsset.id, row.assetId));

  logger.info("reencode-video.requested", {
    lessonId,
    bunnyId: row.bunnyId,
    requestedBy: user.id,
  });

  return NextResponse.json({ ok: true, bunnyVideoId: row.bunnyId });
}

import { NextResponse } from "next/server";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";
import { requireSession, getUserRole, normalizeRole } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Admin video upload — two-step flow so the browser uploads directly to Bunny.
 *
 * Step 1 (server): POST { action: "create", courseId, lessonId, fileName }
 *   → Server creates Bunny video + DB records, returns uploadUrl + apiKey.
 *
 * Step 2 (client): XHR PUT uploadUrl
 *   → Body = raw file bytes, header AccessKey = apiKey.
 *   → Bunny receives the file directly; server is not in the data path.
 *
 * Step 3 (client, on failure): POST { action: "cancel", courseId, lessonId, bunnyVideoId }
 *   → Server deletes the orphaned Bunny video and restores the previous lesson video.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

interface BunnyCreateResponse {
  guid: string;
}

async function bunnyCreate(title: string): Promise<string> {
  const env = getEnv();
  const lib = env.BUNNY_LIBRARY_ID;
  const apiKey = env.BUNNY_API_KEY;
  if (!lib || !apiKey) throw new Error("Bunny credentials not configured");
  const res = await fetch(`${BUNNY_API_BASE}/library/${lib}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Bunny create failed ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as BunnyCreateResponse;
  return data.guid;
}

async function bunnyDelete(guid: string): Promise<void> {
  const env = getEnv();
  const lib = env.BUNNY_LIBRARY_ID;
  const apiKey = env.BUNNY_API_KEY;
  if (!lib || !apiKey) return;
  await fetch(`${BUNNY_API_BASE}/library/${lib}/videos/${guid}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
}

/* ------------------------------------------------------------------ */

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireSession();
  const role = normalizeRole(getUserRole(ctx.user));

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { code: "validation_failed", message: "invalid JSON" },
      { status: 400 },
    );
  }

  const action = String(body.action ?? "");
  const courseId = String(body.courseId ?? "");
  const lessonId = String(body.lessonId ?? "");

  if (!courseId || !lessonId) {
    return NextResponse.json(
      { code: "validation_failed", message: "missing courseId/lessonId" },
      { status: 400 },
    );
  }

  if (!(await canEditCourse(ctx.user.id, role, courseId))) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  if (action === "create") {
    return handleCreate({
      courseId,
      lessonId,
      fileName: String(body.fileName ?? "video.mp4"),
      userId: ctx.user.id,
    });
  }

  if (action === "cancel") {
    return handleCancel({
      courseId,
      lessonId,
      bunnyVideoId: String(body.bunnyVideoId ?? ""),
    });
  }

  return NextResponse.json(
    { code: "validation_failed", message: "action must be create or cancel" },
    { status: 400 },
  );
}

/* ------------------------------------------------------------------ */

interface CreateArgs {
  courseId: string;
  lessonId: string;
  fileName: string;
  userId: string;
}

async function handleCreate(args: CreateArgs): Promise<Response> {
  const { courseId: _courseId, lessonId, fileName, userId } = args;

  const env = getEnv();
  const lib = env.BUNNY_LIBRARY_ID;
  const apiKey = env.BUNNY_API_KEY;
  if (!lib || !apiKey) {
    return NextResponse.json(
      { code: "bunny_not_configured", message: "Bunny credentials missing" },
      { status: 500 },
    );
  }

  let bunnyVideoId: string;
  try {
    bunnyVideoId = await bunnyCreate(fileName);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bunny create failed";
    logger.error("lesson-video.create_failed", err, { lessonId });
    return NextResponse.json({ code: "bunny_error", message }, { status: 502 });
  }

  // Remember the old video so we can restore on cancel.
  const existing = (
    await db
      .select({ videoMediaId: lesson.videoMediaId })
      .from(lesson)
      .where(eq(lesson.id, lessonId))
      .limit(1)
  )[0];
  const oldMediaId = existing?.videoMediaId ?? null;

  // Insert the new media_asset and link it to the lesson immediately.
  // The webhook will flip status to 'ready' when Bunny finishes encoding.
  const [asset] = await db
    .insert(mediaAsset)
    .values({
      kind: "video",
      storage: "bunny_stream",
      storageKey: bunnyVideoId,
      mimeType: "video/mp4",
      sizeBytes: null,
      status: "encoding",
      createdByUserId: userId,
    })
    .returning({ id: mediaAsset.id });

  await db
    .update(lesson)
    .set({ videoMediaId: asset!.id, updatedAt: new Date() })
    .where(eq(lesson.id, lessonId));

  logger.info("lesson-video.created", {
    videoId: bunnyVideoId,
    lessonId,
    assetId: asset!.id,
    oldMediaId,
  });

  return NextResponse.json({
    ok: true,
    bunnyVideoId,
    uploadUrl: `${BUNNY_API_BASE}/library/${lib}/videos/${bunnyVideoId}`,
    apiKey,
    oldMediaId,
  });
}

/* ------------------------------------------------------------------ */

interface CancelArgs {
  courseId: string;
  lessonId: string;
  bunnyVideoId: string;
}

async function handleCancel(args: CancelArgs): Promise<Response> {
  const { lessonId, bunnyVideoId } = args;

  if (!bunnyVideoId) {
    return NextResponse.json(
      { code: "validation_failed", message: "missing bunnyVideoId" },
      { status: 400 },
    );
  }

  // Find the media_asset created for this Bunny video + lesson.
  const [asset] = await db
    .select({ id: mediaAsset.id })
    .from(mediaAsset)
    .where(
      and(
        eq(mediaAsset.storage, "bunny_stream"),
        eq(mediaAsset.storageKey, bunnyVideoId),
      ),
    )
    .limit(1);

  // Best-effort delete at Bunny.
  try {
    await bunnyDelete(bunnyVideoId);
  } catch (err) {
    logger.error("lesson-video.cancel_delete_failed", err, { bunnyVideoId });
  }

  if (asset) {
    // Restore the lesson's previous video if any.  We look for the most
    // recent media_asset still referenced by this lesson that is NOT the
    // one we're cancelling.  If none exists, videoMediaId becomes null.
    const [prev] = await db
      .select({ mediaId: lesson.videoMediaId })
      .from(lesson)
      .where(
        and(
          eq(lesson.id, lessonId),
          ne(lesson.videoMediaId, asset.id),
          sql`${lesson.videoMediaId} IS NOT NULL`,
        ),
      )
      .limit(1);

    await db
      .update(lesson)
      .set({
        videoMediaId: prev?.mediaId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(lesson.id, lessonId));

    await db.delete(mediaAsset).where(eq(mediaAsset.id, asset.id));
  }

  logger.info("lesson-video.cancelled", { bunnyVideoId, lessonId });

  return NextResponse.json({ ok: true });
}

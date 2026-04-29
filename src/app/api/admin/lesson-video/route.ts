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
 * Direct video upload to Bunny.
 *
 * Why not multipart `formData()`? Next.js 16 caps the buffered FormData
 * body and big videos trip "Failed to parse body as FormData". The TUS
 * proxy that we used before tripped a different bug (DESIGN.md §0
 * #12-13). This endpoint solves both by *not* buffering the body:
 *
 *   client →   POST /api/admin/lesson-video
 *              ?courseId=…&lessonId=…
 *              Content-Type: video/mp4
 *              X-File-Name: original.mp4
 *              body = raw bytes (ReadableStream)
 *   server →   1. create Bunny video → guid
 *              2. fetch(PUT bunny, body=req.body, duplex="half")
 *                 — the request body streams straight through, never
 *                 buffered in Node memory
 *              3. INSERT media_asset, UPDATE lesson, cleanup old asset
 *
 * Browser side runs an XHR with `xhr.send(file)` so onProgress reports
 * upload bytes accurately.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024 * 1024;

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

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireSession();
  const role = normalizeRole(getUserRole(ctx.user));

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const lessonId = url.searchParams.get("lessonId");
  const fileName = req.headers.get("x-file-name") || "video.mp4";
  const contentType = req.headers.get("content-type") || "video/mp4";
  const lengthHeader = req.headers.get("content-length");
  const fileSize = lengthHeader ? parseInt(lengthHeader, 10) : 0;

  if (!courseId || !lessonId) {
    return NextResponse.json(
      { code: "validation_failed", message: "missing courseId/lessonId in query" },
      { status: 400 },
    );
  }
  if (!contentType.startsWith("video/")) {
    return NextResponse.json(
      { code: "validation_failed", message: "Content-Type ต้องเป็น video/*" },
      { status: 400 },
    );
  }
  if (fileSize > MAX_BYTES) {
    return NextResponse.json(
      { code: "validation_failed", message: `ไฟล์ใหญ่เกิน ${MAX_BYTES / (1024 ** 3)} GB` },
      { status: 413 },
    );
  }
  if (!req.body) {
    return NextResponse.json(
      { code: "validation_failed", message: "missing body" },
      { status: 400 },
    );
  }

  if (!(await canEditCourse(ctx.user.id, role, courseId))) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  let bunnyVideoId: string | null = null;
  try {
    // Buffer the body once. Node's streaming fetch with duplex:"half" was
    // unreliable here (undici returned "fetch failed" mid-stream). For
    // typical lesson sizes (a few hundred MB at most) buffering is fine,
    // and gives us a clean Buffer for Bunny's PUT.
    const body = Buffer.from(await req.arrayBuffer());

    bunnyVideoId = await bunnyCreate(fileName);
    logger.info("lesson-video.bunny_created", {
      videoId: bunnyVideoId,
      lessonId,
      bytes: body.length,
    });

    const env = getEnv();
    const put = await fetch(
      `${BUNNY_API_BASE}/library/${env.BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: env.BUNNY_API_KEY!,
          "content-type": "application/octet-stream",
        },
        body,
      },
    );
    if (!put.ok) {
      throw new Error(`Bunny upload failed ${put.status}: ${await put.text()}`);
    }
    logger.info("lesson-video.bunny_uploaded", { videoId: bunnyVideoId, lessonId });

    const existing = (
      await db
        .select({ videoMediaId: lesson.videoMediaId })
        .from(lesson)
        .where(eq(lesson.id, lessonId))
        .limit(1)
    )[0];
    const oldMediaId = existing?.videoMediaId ?? null;

    const [asset] = await db
      .insert(mediaAsset)
      .values({
        kind: "video",
        storage: "bunny_stream",
        storageKey: bunnyVideoId,
        mimeType: contentType,
        sizeBytes: fileSize || null,
        status: "ready",
        createdByUserId: ctx.user.id,
      })
      .returning({ id: mediaAsset.id });

    await db
      .update(lesson)
      .set({ videoMediaId: asset!.id, updatedAt: new Date() })
      .where(eq(lesson.id, lessonId));

    // Cleanup old asset only if no other lesson references it (the seed
    // attaches a single demo video to several preview lessons, so we
    // can't delete unconditionally).
    if (oldMediaId) {
      const old = (
        await db
          .select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
          .from(mediaAsset)
          .where(eq(mediaAsset.id, oldMediaId))
          .limit(1)
      )[0];
      if (old) {
        const stillReferenced = (
          await db
            .select({ n: sql<number>`count(*)::int` })
            .from(lesson)
            .where(
              and(eq(lesson.videoMediaId, oldMediaId), ne(lesson.id, lessonId)),
            )
        )[0]?.n ?? 0;
        if (stillReferenced === 0) {
          try {
            await bunnyDelete(old.storageKey);
          } catch (err) {
            logger.error("lesson-video.delete_old_failed", err, {
              storageKey: old.storageKey,
            });
          }
          await db.delete(mediaAsset).where(eq(mediaAsset.id, old.id));
        } else {
          logger.info("lesson-video.shared_asset_kept", {
            mediaId: oldMediaId,
            stillReferenced,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      assetId: asset!.id,
      bunnyVideoId,
    });
  } catch (err) {
    logger.error("lesson-video.failed", err, { lessonId });
    if (bunnyVideoId) {
      try {
        await bunnyDelete(bunnyVideoId);
      } catch {
        // best-effort
      }
    }
    const message = err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ";
    return NextResponse.json({ code: "internal_error", message }, { status: 500 });
  }
}

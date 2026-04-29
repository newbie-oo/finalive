import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import path from "path";
import { auth } from "@/server/auth";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson } from "@/db/schema/course";
import { eq } from "drizzle-orm";
import { createBunnyVideo, uploadBunnyVideo, deleteBunnyVideo } from "@/server/services/bunny";
import { unlink } from "node:fs/promises";
import { canEditCourse } from "@/server/services/course-authz";
import { getUserRole, normalizeRole } from "@/server/auth-session";
import { logger } from "@/lib/logger";

const uploadDir = path.join(process.cwd(), "uploads", "video");

// Cap each upload at 4 GiB. Without this, FileStore happily writes any size
// onto disk, which is a free DoS on a shared host. Tune via env if needed.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;

async function safeUnlink(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // File may already be cleaned up — best-effort.
  }
}

const tusServer = new Server({
  path: "/api/upload/tus",
  datastore: new FileStore({ directory: uploadDir }),
  maxSize: MAX_UPLOAD_BYTES,
  // Without this, @tus/server swallows handler errors as opaque 500s and the
  // browser only sees "Internal Server Error". Surface the real reason in the
  // server log + as a body so we can diagnose without tailing process stdio.
  onResponseError: (...args: unknown[]) => {
    const err = args[args.length - 1];
    const e = err as Error & { status_code?: number; body?: string };
    logger.error("tus.response_error", err);
    return {
      status_code: e.status_code ?? 500,
      body: e.body ?? (e.message || "Upload failed"),
    };
  },
  async onUploadCreate(req, upload) {
    const lessonId = upload.metadata?.lessonId;
    const courseId = upload.metadata?.courseId;
    if (!lessonId || !courseId) {
      throw { status_code: 400, body: "Missing lessonId or courseId in metadata" };
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      throw { status_code: 401, body: "Unauthorized" };
    }

    const canEdit = await canEditCourse(
      session.user.id,
      normalizeRole(getUserRole(session.user)),
      courseId,
    );
    if (!canEdit) {
      throw { status_code: 403, body: "Forbidden" };
    }

    return { metadata: upload.metadata };
  },
  async onUploadFinish(req, upload) {
    const filePath = path.join(uploadDir, upload.id);
    const lessonId = upload.metadata?.lessonId;
    const courseId = upload.metadata?.courseId;

    // Wrap the entire body in a try/finally that always unlinks the temp file.
    // The previous shape early-returned when metadata was missing, leaving the
    // bytes orphaned on disk and accumulating across uploads.
    try {
      if (!lessonId || !courseId) {
        logger.warn("tus.finish.missing_metadata", { uploadId: upload.id });
        return {};
      }

      const title = upload.metadata?.filename || upload.metadata?.name || "Untitled";

      // Cleanup old video if exists.
      const lessonRows = await db
        .select({ videoMediaId: lesson.videoMediaId })
        .from(lesson)
        .where(eq(lesson.id, lessonId))
        .limit(1);
      const oldVideoMediaId = lessonRows[0]?.videoMediaId;
      if (oldVideoMediaId) {
        const oldAssets = await db
          .select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
          .from(mediaAsset)
          .where(eq(mediaAsset.id, oldVideoMediaId))
          .limit(1);
        const oldAsset = oldAssets[0];
        if (oldAsset) {
          try {
            await deleteBunnyVideo(oldAsset.storageKey);
          } catch (err) {
            logger.error("tus.finish.delete_old_bunny_failed", err, {
              storageKey: oldAsset.storageKey,
            });
          }
          await db.delete(mediaAsset).where(eq(mediaAsset.id, oldAsset.id));
        }
      }

      let videoId: string;
      try {
        videoId = await createBunnyVideo(title);
        logger.info("tus.finish.bunny_video_created", { videoId, title });
      } catch (err) {
        logger.error("tus.finish.bunny_create_failed", err, { title });
        throw err;
      }

      try {
        await uploadBunnyVideo(videoId, filePath);
        logger.info("tus.finish.bunny_uploaded", { videoId });
      } catch (err) {
        logger.error("tus.finish.bunny_upload_failed", err, { videoId, filePath });
        // Attempt to clean up orphaned Bunny video before re-throwing.
        try {
          await deleteBunnyVideo(videoId);
        } catch {
          // Best-effort cleanup.
        }
        throw err;
      }

      const session = await auth.api.getSession({ headers: req.headers });
      const [asset] = await db
        .insert(mediaAsset)
        .values({
          kind: "video",
          storage: "bunny_stream",
          storageKey: videoId,
          mimeType: upload.metadata?.filetype || "video/mp4",
          status: "ready",
          createdByUserId: session?.user?.id ?? "system",
        })
        .returning({ id: mediaAsset.id });

      await db
        .update(lesson)
        .set({ videoMediaId: asset!.id, updatedAt: new Date() })
        .where(eq(lesson.id, lessonId));

      logger.info("tus.finish.applied", {
        lessonId,
        videoId,
        assetId: asset!.id,
      });
    } catch (err) {
      logger.error("tus.finish.failed", err, { uploadId: upload.id, lessonId });
      throw err; // Propagate so TUS client knows upload failed.
    } finally {
      await safeUnlink(filePath);
    }

    return {};
  },
});

export const OPTIONS = tusServer.handleWeb.bind(tusServer);
export const POST = tusServer.handleWeb.bind(tusServer);
export const PATCH = tusServer.handleWeb.bind(tusServer);
export const HEAD = tusServer.handleWeb.bind(tusServer);
export const DELETE = tusServer.handleWeb.bind(tusServer);

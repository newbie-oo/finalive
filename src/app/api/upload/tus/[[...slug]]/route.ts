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

const uploadDir = path.join(process.cwd(), "uploads", "video");

const tusServer = new Server({
  path: "/api/upload/tus",
  datastore: new FileStore({ directory: uploadDir }),
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
      (session.user as { role?: string }).role ?? "user",
      courseId,
    );
    if (!canEdit) {
      throw { status_code: 403, body: "Forbidden" };
    }

    return { metadata: upload.metadata };
  },
  async onUploadFinish(req, upload) {
    const lessonId = upload.metadata?.lessonId;
    const courseId = upload.metadata?.courseId;
    if (!lessonId || !courseId) return {};

    try {
      const title = upload.metadata?.filename || upload.metadata?.name || "Untitled";
      const filePath = path.join(uploadDir, upload.id);

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
            console.error("Failed to delete old Bunny video:", err);
          }
          await db.delete(mediaAsset).where(eq(mediaAsset.id, oldAsset.id));
        }
      }

      const videoId = await createBunnyVideo(title);
      await uploadBunnyVideo(videoId, filePath);

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

      // Delete temp file.
      try {
        await unlink(filePath);
      } catch {
        // File may already be cleaned up.
      }
    } catch (err) {
      console.error("Failed to process upload to Bunny:", err);
    }

    return {};
  },
});

export const OPTIONS = tusServer.handleWeb.bind(tusServer);
export const POST = tusServer.handleWeb.bind(tusServer);
export const PATCH = tusServer.handleWeb.bind(tusServer);
export const HEAD = tusServer.handleWeb.bind(tusServer);
export const DELETE = tusServer.handleWeb.bind(tusServer);

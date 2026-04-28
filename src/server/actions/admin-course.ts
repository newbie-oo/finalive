"use server";

import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { createAdminCourse, updateAdminCourse } from "@/server/repos/admin-course";
import { canEditCourse } from "@/server/services/course-authz";
import { getAdminCourseById } from "@/server/repos/admin-course";

const createSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  isFree: z.coerce.boolean(),
});

export async function createCourseAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { ok: false, error: "unauthorized" as const };
  }

  const parsed = createSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    price: formData.get("price"),
    isFree: formData.get("isFree"),
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const courseId = await createAdminCourse({
    ...parsed.data,
    ownerUserId: session.user.id,
  });

  return { ok: true, courseId };
}

const updateSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(500).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isFree: z.coerce.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function updateCourseAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const courseId = formData.get("courseId") as string;
  const courseRow = await getAdminCourseById(courseId);
  if (!courseRow) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  const raw: Record<string, unknown> = { courseId };
  for (const key of ["title", "summary", "price", "isFree", "status"] as const) {
    const val = formData.get(key);
    if (val !== null) raw[key] = val;
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const { courseId: _, ...updates } = parsed.data;
  await updateAdminCourse(courseId, updates);

  return { ok: true };
}


import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { eq } from "drizzle-orm";
import { deleteObject } from "@/server/services/r2";

export async function updateCourseCoverAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const courseId = formData.get("courseId") as string;
  const mediaAssetId = formData.get("mediaAssetId") as string;

  const courseRow = await getAdminCourseById(courseId);
  if (!courseRow) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  // Cleanup old cover.
  const oldCoverMediaId = courseRow.coverMediaId;
  if (oldCoverMediaId) {
    const oldAssets = await db
      .select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
      .from(mediaAsset)
      .where(eq(mediaAsset.id, oldCoverMediaId))
      .limit(1);
    const oldAsset = oldAssets[0];
    if (oldAsset) {
      try {
        const uuid = oldAsset.storageKey;
        await deleteObject({ bucket: "public", key: `covers/${uuid}-640.webp` });
        await deleteObject({ bucket: "public", key: `covers/${uuid}-1200.webp` });
      } catch (err) {
        console.error("Failed to delete old cover from R2:", err);
      }
      await db.delete(mediaAsset).where(eq(mediaAsset.id, oldAsset.id));
    }
  }

  await updateAdminCourse(courseId, { coverMediaId: mediaAssetId });

  return { ok: true };
}

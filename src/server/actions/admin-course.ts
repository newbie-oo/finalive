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

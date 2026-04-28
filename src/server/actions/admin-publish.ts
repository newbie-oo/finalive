"use server";

import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { getAdminCourseById, updateAdminCourse } from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";

const publishSchema = z.object({
  courseId: z.string().uuid(),
});

export async function publishCourseAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const parsed = publishSchema.safeParse({
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const { courseId } = parsed.data;

  const course = await getAdminCourseById(courseId);
  if (!course) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  // Validate course readiness.
  const errors: string[] = [];

  if (!course.title.trim()) errors.push("ชื่อคอร์สว่างเปล่า");
  if (!course.summary.trim()) errors.push("คำอธิบายคอร์สว่างเปล่า");

  const curriculum = await getCourseCurriculum(courseId);
  if (curriculum.length === 0) errors.push("ยังไม่มีโมดูล");

  const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
  if (totalLessons === 0) errors.push("ยังไม่มีบทเรียน");

  for (const mod of curriculum) {
    for (const _ls of mod.lessons) {
      // Note: we don't have bodyMd in curriculum data; skip content check for now.
      void _ls;
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: "validation_failed" as const, errors };
  }

  await updateAdminCourse(courseId, {
    status: "published",
    publishedAt: new Date(),
  });

  return { ok: true };
}

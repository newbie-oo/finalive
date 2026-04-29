"use server";

import { z } from "zod";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import { lesson, courseModule } from "@/db/schema/course";
import { getSession } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { getAdminCourseById, updateAdminCourse } from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";
import { isPlaceholderBody, isInsufficientBody } from "@/server/lib/lesson-content";

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

  // Content readiness check: pull bodyMd for every lesson in the course and
  // reject placeholder/empty bodies. Without this gate admins can publish
  // courses whose lessons still contain seed-script lorem-ipsum filler.
  if (totalLessons > 0) {
    const lessonRows = await db
      .select({
        id: lesson.id,
        title: lesson.title,
        bodyMd: lesson.bodyMd,
        videoMediaId: lesson.videoMediaId,
        moduleId: lesson.moduleId,
      })
      .from(lesson)
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .where(
        and(
          eq(courseModule.courseId, courseId),
          isNull(lesson.deletedAt),
          isNull(courseModule.deletedAt),
        ),
      );

    for (const ls of lessonRows) {
      if (isPlaceholderBody(ls.bodyMd)) {
        errors.push(`บทเรียน "${ls.title}" ยังเป็นเนื้อหา placeholder จาก seed`);
        continue;
      }
      // A lesson is allowed to skip body content if it has a video instead.
      if (!ls.videoMediaId && isInsufficientBody(ls.bodyMd)) {
        errors.push(`บทเรียน "${ls.title}" เนื้อหาว่างหรือสั้นเกินไป`);
      }
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

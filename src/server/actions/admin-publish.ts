"use server";

import { z } from "zod";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import { course, lesson, courseModule } from "@/db/schema/course";
import { updateAdminCourse } from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";
import { CoursePublishValidator } from "@/server/services/course-publish-validator";
import {
  requireAdminSession,
  requireCourseAccess,
} from "@/server/admin/admin-command";

const publishSchema = z.object({
  courseId: z.string().uuid(),
});

function makePublishValidator() {
  return new CoursePublishValidator({
    getCourseMeta: async (courseId) => {
      const rows = await db
        .select({ title: course.title, summary: course.summary })
        .from(course)
        .where(and(eq(course.id, courseId), isNull(course.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    },
    getCurriculum: getCourseCurriculum,
    getLessons: async (courseId) => {
      const rows = await db
        .select({
          id: lesson.id,
          title: lesson.title,
          bodyMd: lesson.bodyMd,
          videoMediaId: lesson.videoMediaId,
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
      return rows;
    },
  });
}

export async function publishCourseAction(formData: FormData) {
  const auth = await requireAdminSession();
  if (!auth.ok) return { ok: false, error: auth.error } as const;

  const parsed = publishSchema.safeParse({
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const { courseId } = parsed.data;

  const access = await requireCourseAccess(auth.session, courseId);
  if (!access.ok) return { ok: false, error: access.error } as const;

  const validator = makePublishValidator();
  const result = await validator.validate(courseId);
  if (!result.ok) {
    return {
      ok: false,
      error: "validation_failed" as const,
      errors: result.errors,
    };
  }

  await updateAdminCourse(courseId, {
    status: "published",
    publishedAt: new Date(),
  });

  return { ok: true };
}

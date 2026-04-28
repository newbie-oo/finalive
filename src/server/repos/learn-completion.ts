import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress } from "@/db/schema/progress";

export async function checkAndMarkCourseComplete(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const lessonRows = await db
    .select({ lessonCount: count() })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      and(
        eq(courseModule.courseId, courseId),
        isNull(lesson.deletedAt),
        isNull(courseModule.deletedAt),
      ),
    );

  const lessonCount = lessonRows[0]?.lessonCount ?? 0;
  if (lessonCount === 0) return false;

  const completedRows = await db
    .select({ completedCount: count() })
    .from(lessonProgress)
    .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(courseModule.courseId, courseId),
        eq(lessonProgress.status, "completed"),
        isNull(lesson.deletedAt),
        isNull(courseModule.deletedAt),
      ),
    );

  const completedCount = completedRows[0]?.completedCount ?? 0;
  if (completedCount !== lessonCount) return false;

  await db
    .update(enrollment)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(enrollment.userId, userId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.status, "active"),
      ),
    );

  return true;
}

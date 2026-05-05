import "server-only";
import { and, count, eq, isNull, inArray, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress, quizAttempt } from "@/db/schema/progress";
import { quiz } from "@/db/schema/quiz";

/**
 * Mark a course as completed for the user iff:
 *  1. Every published lesson under the course has a 'completed' progress row.
 *  2. Every quiz attached to those lessons has at least one passed attempt
 *     by this user (latest attempt is the source of truth — a re-take that
 *     fails after a pass un-completes the course).
 *
 * Idempotent on the enrollment side: if `completedAt` is already set, the
 * UPDATE returns the same row and the caller can issue the certificate.
 */
export async function checkAndMarkCourseComplete(
  userId: string,
  courseId: string,
): Promise<{ completed: boolean; enrollmentId: string | null }> {
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
  if (lessonCount === 0) return { completed: false, enrollmentId: null };

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
  if (completedCount !== lessonCount)
    return { completed: false, enrollmentId: null };

  // Quiz gate: every quiz attached to the course's lessons must have been
  // passed (latest attempt). Without this, the certificate fires the moment
  // the last video ends, even if a quiz is still unanswered or failed.
  const courseQuizzes = await db
    .select({ quizId: quiz.id })
    .from(quiz)
    .innerJoin(lesson, eq(quiz.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      and(
        eq(courseModule.courseId, courseId),
        isNull(quiz.deletedAt),
        isNull(lesson.deletedAt),
        isNull(courseModule.deletedAt),
      ),
    );

  if (courseQuizzes.length > 0) {
    const quizIds = courseQuizzes.map((r) => r.quizId);
    const attempts = await db
      .select({
        quizId: quizAttempt.quizId,
        passed: quizAttempt.passed,
      })
      .from(quizAttempt)
      .where(
        and(
          eq(quizAttempt.userId, userId),
          inArray(quizAttempt.quizId, quizIds),
        ),
      )
      .orderBy(desc(quizAttempt.submittedAt));

    const latestPass = new Map<string, boolean>();
    for (const a of attempts) {
      if (!latestPass.has(a.quizId)) latestPass.set(a.quizId, a.passed);
    }
    for (const id of quizIds) {
      if (latestPass.get(id) !== true) {
        return { completed: false, enrollmentId: null };
      }
    }
  }

  const [updated] = await db
    .update(enrollment)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(enrollment.userId, userId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.status, "active"),
        isNull(enrollment.completedAt),
      ),
    )
    .returning({ id: enrollment.id });

  return { completed: true, enrollmentId: updated?.id ?? null };
}

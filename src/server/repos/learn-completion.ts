import "server-only";
import { and, count, eq, isNull, inArray, desc } from "drizzle-orm";
import { notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress, quizAttempt } from "@/db/schema/progress";
import { quiz } from "@/db/schema/quiz";

/**
 * Clear `completedAt` on the user's active enrollment when criteria stop
 * holding (e.g. latest quiz attempt failed after a previous pass). Returns
 * the enrollment id when a row was un-completed.
 */
async function unmarkCourseComplete(
  userId: string,
  courseId: string,
): Promise<string | null> {
  const [updated] = await db
    .update(enrollment)
    .set({ completedAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(enrollment.userId, userId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.status, "active"),
      ),
    )
    .returning({ id: enrollment.id });
  return updated?.id ?? null;
}

/**
 * Mark a course as completed for the user iff:
 *  1. Every published lesson under the course has a 'completed' progress row.
 *  2. Every quiz attached to those lessons has at least one passed attempt
 *     by this user (latest attempt is the source of truth — a re-take that
 *     fails after a pass un-completes the course).
 *
 * If criteria no longer hold but `completedAt` is set, the row is un-marked.
 * Idempotent on the enrollment side: if `completedAt` is already set, the
 * UPDATE returns the same row and the caller can issue the certificate.
 */
export async function checkAndMarkCourseComplete(
  userId: string,
  courseId: string,
): Promise<{ completed: boolean; enrollmentId: string | null }> {
  // Lesson count, completed count, and quiz list all key off (userId, courseId)
  // and don't depend on each other. Run them concurrently.
  const [lessonRows, completedRows, courseQuizzes] = await Promise.all([
    db
      .select({ lessonCount: count() })
      .from(lesson)
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .where(
        and(
          eq(courseModule.courseId, courseId),
          notDeleted(lesson),
          notDeleted(courseModule),
        ),
      ),
    db
      .select({ completedCount: count() })
      .from(lessonProgress)
      .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(courseModule.courseId, courseId),
          eq(lessonProgress.status, "completed"),
          notDeleted(lesson),
          notDeleted(courseModule),
        ),
      ),
    // Quiz gate: every quiz attached to the course's lessons must have been
    // passed (latest attempt). Without this, the certificate fires the moment
    // the last video ends, even if a quiz is still unanswered or failed.
    db
      .select({ quizId: quiz.id })
      .from(quiz)
      .innerJoin(lesson, eq(quiz.lessonId, lesson.id))
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .where(
        and(
          eq(courseModule.courseId, courseId),
          notDeleted(quiz),
          notDeleted(lesson),
          notDeleted(courseModule),
        ),
      ),
  ]);

  const lessonCount = lessonRows[0]?.lessonCount ?? 0;
  if (lessonCount === 0) return { completed: false, enrollmentId: null };

  const completedCount = completedRows[0]?.completedCount ?? 0;
  if (completedCount !== lessonCount) {
    await unmarkCourseComplete(userId, courseId);
    return { completed: false, enrollmentId: null };
  }

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
        await unmarkCourseComplete(userId, courseId);
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

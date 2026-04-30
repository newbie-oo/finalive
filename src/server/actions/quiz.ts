"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";
import { getQuizById, submitQuizAttempt } from "@/server/repos/quiz";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { issueCertificate } from "@/server/actions/certificate";

const submitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.string().uuid()),
});

export async function submitQuizAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const quizId = formData.get("quizId") as string;
  const answersJson = formData.get("answers") as string;

  let answers: Record<string, string>;
  try {
    answers = JSON.parse(answersJson);
  } catch {
    return { ok: false, error: "invalid_answers" as const };
  }

  const parsed = submitSchema.safeParse({ quizId, answers });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const quiz = await getQuizById(quizId);
  if (!quiz) {
    return { ok: false, error: "quiz_not_found" as const };
  }

  const result = await submitQuizAttempt({
    userId: session.user.id,
    quizId,
    answers,
  });

  // After a passing attempt, re-evaluate course completion. Without this,
  // a course whose final gate is a quiz never gets a certificate because
  // the lesson-progress route only re-checks on lesson completion.
  if (result.passed) {
    const lessonRow = await db
      .select({ courseId: courseModule.courseId })
      .from(lesson)
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .where(eq(lesson.id, quiz.lessonId))
      .limit(1);
    const courseId = lessonRow[0]?.courseId;
    if (courseId) {
      const { completed, enrollmentId } = await checkAndMarkCourseComplete(
        session.user.id,
        courseId,
      );
      if (completed && enrollmentId) {
        await issueCertificate(enrollmentId);
      }
    }
  }

  return { ok: true, result };
}

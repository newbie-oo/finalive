"use server";

import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { getAdminQuizById, saveAdminQuiz } from "@/server/repos/admin-quiz";

const saveQuizSchema = z.object({
  quizId: z.string().uuid(),
  questions: z.array(
    z.object({
      id: z.string().uuid().optional(),
      promptMd: z.string().min(1).max(2000),
      choices: z.array(
        z.object({
          id: z.string().uuid().optional(),
          body: z.string().min(1).max(500),
          isCorrect: z.boolean(),
        }),
      ).min(2).max(6),
    }),
  ).min(1).max(50),
});

export async function saveQuizAction(input: z.infer<typeof saveQuizSchema>) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const parsed = saveQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const quiz = await getAdminQuizById(parsed.data.quizId);
  if (!quiz) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, quiz.courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  await saveAdminQuiz(parsed.data.quizId, {
    questions: parsed.data.questions,
  });

  return { ok: true };
}

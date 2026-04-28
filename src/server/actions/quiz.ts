"use server";

import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { getQuizById, submitQuizAttempt } from "@/server/repos/quiz";

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

  return { ok: true, result };
}

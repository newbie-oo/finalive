"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { db } from "@/db/client";
import { lesson, courseModule } from "@/db/schema/course";
import {
  getAdminQuizById,
  saveAdminQuiz,
  createAdminQuiz,
  type AdminQuiz,
} from "@/server/repos/admin-quiz";

const saveQuizSchema = z.object({
  quizId: z.string().uuid(),
  passScorePct: z.number().int().min(1).max(100).default(60),
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

type SaveQuizResult =
  | { ok: true; quiz: AdminQuiz }
  | { ok: false; error: "unauthorized" | "invalid_input" | "not_found" | "forbidden" };

export async function saveQuizAction(
  input: z.infer<typeof saveQuizSchema>,
): Promise<SaveQuizResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = saveQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  const quiz = await getAdminQuizById(parsed.data.quizId);
  if (!quiz) {
    return { ok: false, error: "not_found" };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, quiz.courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" };
  }

  await saveAdminQuiz(parsed.data.quizId, {
    passScorePct: parsed.data.passScorePct,
    questions: parsed.data.questions,
  });

  // Refetch with the persisted IDs so the client can replace its
  // optimistic crypto.randomUUID() ids and avoid duplicate-key collisions
  // on the next save.
  const fresh = await getAdminQuizById(parsed.data.quizId);
  if (!fresh) {
    return { ok: false, error: "not_found" };
  }

  revalidatePath(`/admin/courses/${quiz.courseId}/quizzes/${quiz.id}`);
  revalidatePath(`/admin/courses/${quiz.courseId}/curriculum`);

  return { ok: true, quiz: fresh };
}

const createQuizSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200),
  passScorePct: z.number().int().min(1).max(100).default(60),
});

export async function createQuizAction(input: z.infer<typeof createQuizSchema>) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const parsed = createQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  // Verify lesson belongs to a course the user can edit.
  const [row] = await db
    .select({ courseId: courseModule.courseId })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(eq(lesson.id, parsed.data.lessonId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, row.courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  const quizId = await createAdminQuiz({
    lessonId: parsed.data.lessonId,
    title: parsed.data.title,
    passScorePct: parsed.data.passScorePct,
    createdByUserId: session.user.id,
  });

  revalidatePath(`/admin/courses/${row.courseId}/curriculum`);

  return { ok: true, quizId };
}

import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { quiz, quizQuestion, quizChoice } from "@/db/schema/quiz";
import { lesson, courseModule, course } from "@/db/schema/course";

export interface AdminQuizQuestion {
  id: string;
  promptMd: string;
  sortOrder: number;
  choices: AdminQuizChoice[];
}

export interface AdminQuizChoice {
  id: string;
  body: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface AdminQuiz {
  id: string;
  title: string;
  passScorePct: number;
  lessonId: string;
  courseId: string;
  questions: AdminQuizQuestion[];
}

export async function getAdminQuizById(quizId: string): Promise<AdminQuiz | null> {
  const quizRows = await db
    .select({
      id: quiz.id,
      title: quiz.title,
      passScorePct: quiz.passScorePct,
      lessonId: quiz.lessonId,
      courseId: course.id,
    })
    .from(quiz)
    .innerJoin(lesson, eq(quiz.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(and(eq(quiz.id, quizId), isNull(quiz.deletedAt)))
    .limit(1);

  const qz = quizRows[0];
  if (!qz) return null;

  const questions = await db
    .select({
      id: quizQuestion.id,
      promptMd: quizQuestion.promptMd,
      sortOrder: quizQuestion.sortOrder,
    })
    .from(quizQuestion)
    .where(and(eq(quizQuestion.quizId, quizId), isNull(quizQuestion.deletedAt)))
    .orderBy(asc(quizQuestion.sortOrder));

  const choices = await db
    .select({
      id: quizChoice.id,
      questionId: quizChoice.questionId,
      body: quizChoice.body,
      isCorrect: quizChoice.isCorrect,
      sortOrder: quizChoice.sortOrder,
    })
    .from(quizChoice)
    .innerJoin(quizQuestion, eq(quizChoice.questionId, quizQuestion.id))
    .where(and(eq(quizQuestion.quizId, quizId), isNull(quizChoice.deletedAt)))
    .orderBy(asc(quizChoice.sortOrder));

  const byQuestion = new Map<string, AdminQuizChoice[]>();
  for (const c of choices) {
    const list = byQuestion.get(c.questionId) ?? [];
    list.push({
      id: c.id,
      body: c.body,
      isCorrect: c.isCorrect,
      sortOrder: c.sortOrder,
    });
    byQuestion.set(c.questionId, list);
  }

  return {
    ...qz,
    questions: questions.map((q) => ({
      ...q,
      choices: byQuestion.get(q.id) ?? [],
    })),
  };
}

export async function saveAdminQuiz(
  quizId: string,
  input: {
    questions: Array<{
      id?: string;
      promptMd: string;
      choices: Array<{ id?: string; body: string; isCorrect: boolean }>;
    }>;
  },
) {
  await db.transaction(async (tx) => {
    // Fetch existing questions.
    const existingQuestions = await tx
      .select({ id: quizQuestion.id })
      .from(quizQuestion)
      .where(and(eq(quizQuestion.quizId, quizId), isNull(quizQuestion.deletedAt)));

    const existingQuestionIds = new Set(existingQuestions.map((q) => q.id));
    const keptQuestionIds = new Set<string>();

    // Upsert questions.
    for (let qi = 0; qi < input.questions.length; qi++) {
      const q = input.questions[qi]!;
      let questionId: string;

      if (q.id && existingQuestionIds.has(q.id)) {
        questionId = q.id;
        await tx
          .update(quizQuestion)
          .set({ promptMd: q.promptMd, sortOrder: qi, updatedAt: new Date() })
          .where(eq(quizQuestion.id, questionId));
      } else {
        const [inserted] = await tx
          .insert(quizQuestion)
          .values({
            quizId,
            promptMd: q.promptMd,
            sortOrder: qi,
          })
          .returning({ id: quizQuestion.id });
        questionId = inserted!.id;
      }

      keptQuestionIds.add(questionId);

      // Fetch existing choices for this question.
      const existingChoices = await tx
        .select({ id: quizChoice.id })
        .from(quizChoice)
        .where(
          and(eq(quizChoice.questionId, questionId), isNull(quizChoice.deletedAt)),
        );

      const existingChoiceIds = new Set(existingChoices.map((c) => c.id));
      const keptChoiceIds = new Set<string>();

      // Upsert choices.
      for (let ci = 0; ci < q.choices.length; ci++) {
        const c = q.choices[ci]!;
        if (c.id && existingChoiceIds.has(c.id)) {
          keptChoiceIds.add(c.id);
          await tx
            .update(quizChoice)
            .set({
              body: c.body,
              isCorrect: c.isCorrect,
              sortOrder: ci,
              updatedAt: new Date(),
            })
            .where(eq(quizChoice.id, c.id));
        } else {
          const [inserted] = await tx
            .insert(quizChoice)
            .values({
              questionId,
              body: c.body,
              isCorrect: c.isCorrect,
              sortOrder: ci,
            })
            .returning({ id: quizChoice.id });
          keptChoiceIds.add(inserted!.id);
        }
      }

      // Soft-delete removed choices.
      const removedChoiceIds = existingChoiceIds.difference(keptChoiceIds);
      if (removedChoiceIds.size > 0) {
        await tx
          .update(quizChoice)
          .set({ deletedAt: new Date() })
          .where(inArray(quizChoice.id, Array.from(removedChoiceIds)));
      }
    }

    // Soft-delete removed questions.
    const removedQuestionIds = existingQuestionIds.difference(keptQuestionIds);
    if (removedQuestionIds.size > 0) {
      await tx
        .update(quizQuestion)
        .set({ deletedAt: new Date() })
        .where(inArray(quizQuestion.id, Array.from(removedQuestionIds)));
    }
  });
}

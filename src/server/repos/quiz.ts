import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { quiz, quizQuestion, quizChoice } from "@/db/schema/quiz";
import { quizAttempt } from "@/db/schema/progress";

export interface QuizWithQuestions {
  id: string;
  title: string;
  passScorePct: number;
  lessonId: string;
  questions: QuestionWithChoices[];
}

export interface QuestionWithChoices {
  id: string;
  promptMd: string;
  sortOrder: number;
  choices: { id: string; body: string; sortOrder: number }[];
}

export async function getQuizByLessonId(lessonId: string): Promise<{ id: string; title: string } | null> {
  const rows = await db
    .select({ id: quiz.id, title: quiz.title })
    .from(quiz)
    .where(and(eq(quiz.lessonId, lessonId), isNull(quiz.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getQuizById(quizId: string): Promise<QuizWithQuestions | null> {
  const quizRows = await db
    .select({
      id: quiz.id,
      title: quiz.title,
      passScorePct: quiz.passScorePct,
      lessonId: quiz.lessonId,
    })
    .from(quiz)
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
      sortOrder: quizChoice.sortOrder,
    })
    .from(quizChoice)
    .innerJoin(quizQuestion, eq(quizChoice.questionId, quizQuestion.id))
    .where(and(eq(quizQuestion.quizId, quizId), isNull(quizChoice.deletedAt)))
    .orderBy(asc(quizChoice.sortOrder));

  const byQuestion = new Map<string, QuestionWithChoices["choices"]>();
  for (const c of choices) {
    const list = byQuestion.get(c.questionId) ?? [];
    list.push({ id: c.id, body: c.body, sortOrder: c.sortOrder });
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

export interface SubmitAttemptInput {
  userId: string;
  quizId: string;
  answers: Record<string, string>; // questionId -> choiceId
}

export interface SubmitAttemptResult {
  attemptId: string;
  scorePct: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
}

export async function submitQuizAttempt(input: SubmitAttemptInput): Promise<SubmitAttemptResult> {
  const questions = await db
    .select({ id: quizQuestion.id })
    .from(quizQuestion)
    .where(and(eq(quizQuestion.quizId, input.quizId), isNull(quizQuestion.deletedAt)));

  const correctChoices = await db
    .select({
      questionId: quizChoice.questionId,
      id: quizChoice.id,
    })
    .from(quizChoice)
    .innerJoin(quizQuestion, eq(quizChoice.questionId, quizQuestion.id))
    .where(
      and(
        eq(quizQuestion.quizId, input.quizId),
        eq(quizChoice.isCorrect, true),
        isNull(quizChoice.deletedAt),
      ),
    );

  const correctMap = new Map<string, string>();
  for (const c of correctChoices) {
    correctMap.set(c.questionId, c.id);
  }

  let correctCount = 0;
  for (const q of questions) {
    if (input.answers[q.id] === correctMap.get(q.id)) {
      correctCount += 1;
    }
  }

  const totalQuestions = questions.length;
  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const quizRow = await db
    .select({ passScorePct: quiz.passScorePct })
    .from(quiz)
    .where(eq(quiz.id, input.quizId))
    .limit(1);

  const passScorePct = quizRow[0]?.passScorePct ?? 70;
  const passed = scorePct >= passScorePct;

  const [inserted] = await db
    .insert(quizAttempt)
    .values({
      userId: input.userId,
      quizId: input.quizId,
      answersJson: input.answers,
      scorePct,
      passed,
    })
    .returning({ id: quizAttempt.id });

  return {
    attemptId: inserted!.id,
    scorePct,
    passed,
    totalQuestions,
    correctCount,
  };
}

import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { quiz, quizQuestion, quizChoice } from "@/db/schema/quiz";
import { courseModule, lesson } from "@/db/schema/course";
import { quizAttempt } from "@/db/schema/progress";

export interface QuizWithQuestions {
	id: string;
	title: string;
	passScorePct: number;
	lessonId: string;
	lessonTitle: string;
	questions: QuestionWithChoices[];
}

export interface QuestionWithChoices {
	id: string;
	promptMd: string;
	sortOrder: number;
	choices: {
		id: string;
		body: string;
		sortOrder: number;
		explanation?: string;
	}[];
}

/**
 * For each quiz attached to any lesson within the given course, return the
 * pass status of the user's *latest* attempt (so a re-take that fails after
 * a pass also flips the icon back). Quizzes the user has not attempted are
 * not included in the map.
 */
export async function listLatestQuizPassByCourse(
	userId: string,
	courseId: string,
): Promise<Map<string, boolean>> {
	const quizRows = await db
		.select({ quizId: quiz.id })
		.from(quiz)
		.innerJoin(lesson, eq(lesson.id, quiz.lessonId))
		.innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
		.where(and(eq(courseModule.courseId, courseId), notDeleted(quiz)));
	const quizIds = quizRows.map((r) => r.quizId);
	if (quizIds.length === 0) return new Map();

	// Pull every attempt for this user across the relevant quizzes, ordered
	// newest-first, then keep the first row we see per quizId. The course's
	// quiz count is small (one per lesson at most) so this is cheap and
	// avoids a Postgres-only DISTINCT ON for portability.
	const rows = await db
		.select({
			quizId: quizAttempt.quizId,
			passed: quizAttempt.passed,
			submittedAt: quizAttempt.submittedAt,
		})
		.from(quizAttempt)
		.where(
			and(eq(quizAttempt.userId, userId), inArray(quizAttempt.quizId, quizIds)),
		)
		.orderBy(desc(quizAttempt.submittedAt));

	const result = new Map<string, boolean>();
	for (const r of rows) {
		if (!result.has(r.quizId)) {
			result.set(r.quizId, r.passed);
		}
	}
	return result;
}

export async function getQuizByLessonId(
	lessonId: string,
): Promise<{ id: string; title: string } | null> {
	const rows = await db
		.select({ id: quiz.id, title: quiz.title })
		.from(quiz)
		.where(and(eq(quiz.lessonId, lessonId), notDeleted(quiz)))
		.limit(1);
	return rows[0] ?? null;
}

export async function getQuizById(
	quizId: string,
): Promise<QuizWithQuestions | null> {
	const quizRows = await db
		.select({
			id: quiz.id,
			title: quiz.title,
			passScorePct: quiz.passScorePct,
			lessonId: quiz.lessonId,
			lessonTitle: lesson.title,
		})
		.from(quiz)
		.innerJoin(lesson, eq(lesson.id, quiz.lessonId))
		.where(and(eq(quiz.id, quizId), notDeleted(quiz)))
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
		.where(and(eq(quizQuestion.quizId, quizId), notDeleted(quizQuestion)))
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
		.where(and(eq(quizQuestion.quizId, quizId), notDeleted(quizChoice)))
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

export async function getCorrectChoices(
	quizId: string,
): Promise<Array<{ questionId: string; choiceId: string }>> {
	const rows = await db
		.select({
			questionId: quizChoice.questionId,
			choiceId: quizChoice.id,
		})
		.from(quizChoice)
		.innerJoin(quizQuestion, eq(quizChoice.questionId, quizQuestion.id))
		.where(
			and(
				eq(quizQuestion.quizId, quizId),
				eq(quizChoice.isCorrect, true),
				notDeleted(quizChoice),
			),
		);
	return rows;
}

export interface InsertAttemptInput {
	userId: string;
	quizId: string;
	answersJson: Record<string, string>;
	scorePct: number;
	passed: boolean;
}

export async function insertQuizAttempt(
	input: InsertAttemptInput,
): Promise<{ attemptId: string }> {
	const [inserted] = await db
		.insert(quizAttempt)
		.values({
			userId: input.userId,
			quizId: input.quizId,
			answersJson: input.answersJson,
			scorePct: input.scorePct,
			passed: input.passed,
		})
		.returning({ id: quizAttempt.id });

	return { attemptId: inserted!.id };
}

export async function deleteQuizAttemptsByUserId(
	userId: string,
): Promise<void> {
	await db.delete(quizAttempt).where(eq(quizAttempt.userId, userId));
}

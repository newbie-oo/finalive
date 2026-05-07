import {
	getQuizById,
	getCorrectChoices,
	insertQuizAttempt,
} from "@/server/repos/quiz";
import type { QuestionResult } from "@/lib/quiz-types";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { getCourseIdByLessonId } from "@/server/repos/course";
import { CourseCompletionChecker } from "@/server/services/course-completion-checker";
import { QuizScorer } from "@/server/services/quiz-scorer";

export interface QuizServiceDeps {
	getQuizById: typeof getQuizById;
	getCorrectChoices: typeof getCorrectChoices;
	isUserEnrolledInCourse: typeof EnrollmentRepo.hasActive;
	getCourseIdByLessonId: typeof getCourseIdByLessonId;
	insertQuizAttempt: typeof insertQuizAttempt;
	completionChecker: CourseCompletionChecker;
}

export interface SubmitQuizResult {
	ok: true;
	attemptId: string;
	passed: boolean;
	scorePct: number;
	totalQuestions: number;
	correctCount: number;
	questionResults: QuestionResult[];
	courseCompleted: boolean;
}

export interface SubmitQuizError {
	ok: false;
	error: "quiz_not_found" | "not_enrolled" | "invalid_answers";
}

/**
 * Handles quiz submission and, on pass, triggers course completion re-evaluation.
 * This keeps the action thin: auth + parse + delegate.
 */
export class QuizService {
	constructor(private deps: QuizServiceDeps) {}

	async submit(params: {
		userId: string;
		userEmail: string;
		userRole?: string;
		quizId: string;
		answers: Record<string, string>;
	}): Promise<SubmitQuizResult | SubmitQuizError> {
		const quiz = await this.deps.getQuizById(params.quizId);
		if (!quiz) {
			return { ok: false, error: "quiz_not_found" };
		}

		const courseId = await this.deps.getCourseIdByLessonId(quiz.lessonId);

		if (courseId) {
			const isEnrolled = await this.deps.isUserEnrolledInCourse(
				params.userId,
				courseId,
			);
			if (!isEnrolled) {
				return { ok: false, error: "not_enrolled" };
			}
		}

		const correctChoices = await this.deps.getCorrectChoices(params.quizId);
		const scorer = new QuizScorer();
		const score = scorer.score({
			questions: quiz.questions.map((q) => ({ id: q.id })),
			correctChoices: correctChoices.map((c) => ({
				questionId: c.questionId,
				choiceId: c.choiceId,
			})),
			answers: params.answers,
			passScorePct: quiz.passScorePct,
		});

		const result = await this.deps.insertQuizAttempt({
			userId: params.userId,
			quizId: params.quizId,
			answersJson: params.answers,
			scorePct: score.scorePct,
			passed: score.passed,
		});

		// Always re-evaluate after a quiz attempt — a failed re-take of a
		// previously-passed quiz must un-complete the course, so we cannot
		// short-circuit on `score.passed`.
		let courseCompleted = false;
		if (courseId) {
			const checkResult =
				await this.deps.completionChecker.reevaluateCourseCompletion({
					userId: params.userId,
					userEmail: params.userEmail,
					userRole: params.userRole,
					courseId,
				});
			courseCompleted = checkResult.courseCompleted;
		}

		return {
			ok: true,
			attemptId: result.attemptId,
			passed: score.passed,
			scorePct: score.scorePct,
			totalQuestions: score.totalQuestions,
			correctCount: score.correctCount,
			questionResults: score.questionResults,
			courseCompleted,
		};
	}
}

import { getQuizById, submitQuizAttempt } from "@/server/repos/quiz";
import { isUserEnrolledInCourse } from "@/server/repos/course";
import { CourseCompletionChecker } from "@/server/services/course-completion-checker";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";

export interface QuizServiceDeps {
	getQuizById: typeof getQuizById;
	isUserEnrolledInCourse: typeof isUserEnrolledInCourse;
	submitQuizAttempt: typeof submitQuizAttempt;
	completionChecker: CourseCompletionChecker;
}

export interface QuestionResult {
	questionId: string;
	selectedChoiceId: string;
	correctChoiceId: string;
	isCorrect: boolean;
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

		const lessonRow = await db
			.select({ courseId: courseModule.courseId })
			.from(lesson)
			.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
			.where(eq(lesson.id, quiz.lessonId))
			.limit(1);
		const courseId = lessonRow[0]?.courseId;

		if (courseId) {
			const isEnrolled = await this.deps.isUserEnrolledInCourse(
				params.userId,
				courseId,
			);
			if (!isEnrolled) {
				return { ok: false, error: "not_enrolled" };
			}
		}

		const result = await this.deps.submitQuizAttempt({
			userId: params.userId,
			quizId: params.quizId,
			answers: params.answers,
		});

		let courseCompleted = false;
		if (result.passed && courseId) {
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
			passed: result.passed,
			scorePct: result.scorePct,
			totalQuestions: result.totalQuestions,
			correctCount: result.correctCount,
			questionResults: result.questionResults,
			courseCompleted,
		};
	}
}

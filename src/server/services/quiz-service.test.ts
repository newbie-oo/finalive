import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuizService, type QuizServiceDeps } from "./quiz-service";

vi.mock("server-only", () => ({}));

interface FakeQuestion {
	id: string;
}

function makeDeps(overrides: Partial<QuizServiceDeps> = {}): QuizServiceDeps {
	const reevaluateCourseCompletion = vi.fn().mockResolvedValue({
		courseCompleted: false,
	});
	return {
		getQuizById: vi.fn().mockResolvedValue({
			id: "q1",
			lessonId: "L1",
			passScorePct: 70,
			questions: [
				{ id: "qq1" } as FakeQuestion,
				{ id: "qq2" } as FakeQuestion,
			],
		}),
		getCorrectChoices: vi.fn().mockResolvedValue([
			{ questionId: "qq1", choiceId: "c1" },
			{ questionId: "qq2", choiceId: "c2" },
		]),
		isUserEnrolledInCourse: vi.fn().mockResolvedValue(true),
		getCourseIdByLessonId: vi.fn().mockResolvedValue("course-1"),
		insertQuizAttempt: vi
			.fn()
			.mockResolvedValue({ attemptId: "attempt-1" }),
		completionChecker: { reevaluateCourseCompletion } as unknown as
			QuizServiceDeps["completionChecker"],
		...overrides,
	};
}

const submitArgs = {
	userId: "u1",
	userEmail: "u1@example.com",
	quizId: "q1",
	answers: { qq1: "c1", qq2: "c2" },
};

describe("QuizService.submit", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns quiz_not_found when the quiz does not exist", async () => {
		const deps = makeDeps({
			getQuizById: vi.fn().mockResolvedValue(null),
		});
		const service = new QuizService(deps);

		const result = await service.submit(submitArgs);

		expect(result).toEqual({ ok: false, error: "quiz_not_found" });
		expect(deps.insertQuizAttempt).not.toHaveBeenCalled();
	});

	it("returns not_enrolled when the user is not enrolled in the course", async () => {
		const deps = makeDeps({
			isUserEnrolledInCourse: vi.fn().mockResolvedValue(false),
		});
		const service = new QuizService(deps);

		const result = await service.submit(submitArgs);

		expect(result).toEqual({ ok: false, error: "not_enrolled" });
		expect(deps.insertQuizAttempt).not.toHaveBeenCalled();
	});

	it("scores a passing attempt and triggers course-completion re-evaluation", async () => {
		const reevaluate = vi
			.fn()
			.mockResolvedValue({ courseCompleted: true });
		const deps = makeDeps({
			completionChecker: { reevaluateCourseCompletion: reevaluate } as
				unknown as QuizServiceDeps["completionChecker"],
		});
		const service = new QuizService(deps);

		const result = await service.submit(submitArgs);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.passed).toBe(true);
			expect(result.scorePct).toBe(100);
			expect(result.correctCount).toBe(2);
			expect(result.totalQuestions).toBe(2);
			expect(result.courseCompleted).toBe(true);
			expect(result.attemptId).toBe("attempt-1");
		}
		expect(deps.insertQuizAttempt).toHaveBeenCalledWith(
			expect.objectContaining({ passed: true, scorePct: 100 }),
		);
		expect(reevaluate).toHaveBeenCalledTimes(1);
	});

	it("re-evaluates course completion even when the attempt fails", async () => {
		// Critical invariant: a failed re-take of a previously passed quiz must
		// un-complete the course, so the checker runs unconditionally.
		const reevaluate = vi
			.fn()
			.mockResolvedValue({ courseCompleted: false });
		const deps = makeDeps({
			completionChecker: { reevaluateCourseCompletion: reevaluate } as
				unknown as QuizServiceDeps["completionChecker"],
		});
		const service = new QuizService(deps);

		const result = await service.submit({
			...submitArgs,
			answers: { qq1: "wrong", qq2: "wrong" },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.passed).toBe(false);
			expect(result.scorePct).toBe(0);
		}
		expect(reevaluate).toHaveBeenCalledTimes(1);
	});

	it("skips enrollment + completion checks when the lesson has no course", async () => {
		const reevaluate = vi.fn();
		const deps = makeDeps({
			getCourseIdByLessonId: vi.fn().mockResolvedValue(null),
			completionChecker: { reevaluateCourseCompletion: reevaluate } as
				unknown as QuizServiceDeps["completionChecker"],
		});
		const service = new QuizService(deps);

		const result = await service.submit(submitArgs);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.courseCompleted).toBe(false);
		}
		expect(deps.isUserEnrolledInCourse).not.toHaveBeenCalled();
		expect(reevaluate).not.toHaveBeenCalled();
	});
});

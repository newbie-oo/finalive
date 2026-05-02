import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuizForm } from "./quiz-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock server action
vi.mock("@/server/actions/quiz", () => ({
	submitQuizAction: vi.fn(),
}));

const mockQuiz = {
	id: "q1",
	title: "Test Quiz",
	passScorePct: 70,
	lessonId: "l1",
	lessonTitle: "Lesson 1",
	questions: [
		{
			id: "qq1",
			promptMd: "What is 2+2?",
			sortOrder: 1,
			choices: [
				{ id: "c1", body: "3", sortOrder: 1 },
				{
					id: "c2",
					body: "4",
					sortOrder: 2,
					explanation: "2+2 equals 4 because addition.",
				},
			],
		},
		{
			id: "qq2",
			promptMd: "What is the capital of France?",
			sortOrder: 2,
			choices: [
				{ id: "c3", body: "London", sortOrder: 1 },
				{
					id: "c4",
					body: "Paris",
					sortOrder: 2,
					explanation: "Paris is the capital of France.",
				},
			],
		},
	],
};

const mockResult = {
	ok: true,
	result: {
		attemptId: "a1",
		scorePct: 50,
		passed: false,
		correctCount: 1,
		totalQuestions: 2,
		questionResults: [
			{
				questionId: "qq1",
				selectedChoiceId: "c2",
				correctChoiceId: "c2",
				isCorrect: true,
			},
			{
				questionId: "qq2",
				selectedChoiceId: "c3",
				correctChoiceId: "c4",
				isCorrect: false,
			},
		],
	},
};

describe("QuizForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows explanations after submitting", async () => {
		const { submitQuizAction } = await import("@/server/actions/quiz");
		vi.mocked(submitQuizAction).mockResolvedValue(mockResult);

		render(<QuizForm quiz={mockQuiz} courseSlug="cs1" nextLessonId="l2" />);

		// Answer q1
		fireEvent.click(screen.getByText("4"));
		fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));

		// Answer q2
		fireEvent.click(screen.getByText("London"));
		fireEvent.click(screen.getByRole("button", { name: /ตรวจคำตอบ/ }));

		await waitFor(() => {
			expect(screen.getByText("สรุปผลแต่ละข้อ")).toBeInTheDocument();
		});

		// Explanation for correct answer should show
		expect(screen.getByText(/2\+2 equals 4/)).toBeInTheDocument();

		// Explanation for wrong answer should show correct answer
		expect(screen.getByText(/คำตอบที่ถูกต้อง: Paris/)).toBeInTheDocument();
	});

	it("correct and wrong answers have different styling", async () => {
		const { submitQuizAction } = await import("@/server/actions/quiz");
		vi.mocked(submitQuizAction).mockResolvedValue(mockResult);

		render(<QuizForm quiz={mockQuiz} courseSlug="cs1" nextLessonId="l2" />);

		// Answer and submit
		fireEvent.click(screen.getByText("4"));
		fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));
		fireEvent.click(screen.getByText("London"));
		fireEvent.click(screen.getByRole("button", { name: /ตรวจคำตอบ/ }));

		await waitFor(() => {
			expect(screen.getByText("สรุปผลแต่ละข้อ")).toBeInTheDocument();
		});

		const rows = screen.getAllByText(/What is/);
		expect(rows.length).toBe(2);
	});

	it("shows next-lesson CTA after submit", async () => {
		const { submitQuizAction } = await import("@/server/actions/quiz");
		vi.mocked(submitQuizAction).mockResolvedValue(mockResult);

		render(<QuizForm quiz={mockQuiz} courseSlug="cs1" nextLessonId="l2" />);

		// Answer and submit
		fireEvent.click(screen.getByText("4"));
		fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));
		fireEvent.click(screen.getByText("London"));
		fireEvent.click(screen.getByRole("button", { name: /ตรวจคำตอบ/ }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /ไปบทถัดไป/ }),
			).toBeInTheDocument();
		});

		expect(
			screen.getByRole("button", { name: /ทบทวนเนื้อหา/ }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /ทำอีกครั้ง/ })).toBeInTheDocument();
	});

	it("shows 'ดูคอร์สของฉัน' when no next lesson", async () => {
		const { submitQuizAction } = await import("@/server/actions/quiz");
		vi.mocked(submitQuizAction).mockResolvedValue(mockResult);

		render(<QuizForm quiz={mockQuiz} courseSlug="cs1" nextLessonId={null} />);

		// Answer and submit
		fireEvent.click(screen.getByText("4"));
		fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));
		fireEvent.click(screen.getByText("London"));
		fireEvent.click(screen.getByRole("button", { name: /ตรวจคำตอบ/ }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /ดูคอร์สของฉัน/ }),
			).toBeInTheDocument();
		});
	});
});

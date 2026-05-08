import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizResultAccordion } from "./quiz-result-accordion";

const ITEMS = [
	{
		n: 1,
		ok: true,
		question: "What is 2+2?",
		selectedAnswer: "4",
		correctAnswer: "4",
		explanation: "Addition: 2 plus 2 is 4.",
	},
	{
		n: 2,
		ok: false,
		question: "Capital of France?",
		selectedAnswer: "London",
		correctAnswer: "Paris",
		explanation: "Paris has been the capital since the Middle Ages.",
	},
];

describe("QuizResultAccordion", () => {
	it("renders one accordion item per question with the index and prompt", () => {
		render(<QuizResultAccordion items={ITEMS} />);
		expect(screen.getByText(/What is 2\+2\?/)).toBeInTheDocument();
		expect(screen.getByText(/Capital of France\?/)).toBeInTheDocument();
	});

	it("auto-expands wrong answers but collapses correct ones", () => {
		render(<QuizResultAccordion items={ITEMS} />);
		const triggers = screen.getAllByRole("button");
		// Wrong-answer item should be expanded
		expect(
			triggers.find((b) => b.textContent?.includes("Capital of France")),
		).toHaveAttribute("aria-expanded", "true");
		// Correct-answer item should be collapsed
		expect(
			triggers.find((b) => b.textContent?.includes("What is 2+2")),
		).toHaveAttribute("aria-expanded", "false");
	});
});

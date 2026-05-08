import { describe, it, expect } from "vitest";
import { QuizScorer } from "./quiz-scorer";
import type {
	ScoringQuestion,
	ScoringCorrectChoice,
} from "@/lib/quiz-types";

const scorer = new QuizScorer();

function q(id: string): ScoringQuestion {
	return { id } as ScoringQuestion;
}

function correct(qid: string, cid: string): ScoringCorrectChoice {
	return { questionId: qid, choiceId: cid };
}

describe("QuizScorer", () => {
	it("scores a perfect attempt to 100% and passes", () => {
		const result = scorer.score({
			questions: [q("q1"), q("q2")],
			correctChoices: [correct("q1", "a"), correct("q2", "b")],
			answers: { q1: "a", q2: "b" },
			passScorePct: 50,
		});
		expect(result.scorePct).toBe(100);
		expect(result.passed).toBe(true);
		expect(result.correctCount).toBe(2);
		expect(result.questionResults).toEqual([
			{ questionId: "q1", selectedChoiceId: "a", correctChoiceId: "a", isCorrect: true },
			{ questionId: "q2", selectedChoiceId: "b", correctChoiceId: "b", isCorrect: true },
		]);
	});

	it("rounds partial scores and respects passScorePct", () => {
		const result = scorer.score({
			questions: [q("q1"), q("q2"), q("q3")],
			correctChoices: [
				correct("q1", "a"),
				correct("q2", "b"),
				correct("q3", "c"),
			],
			answers: { q1: "a", q2: "x", q3: "x" },
			passScorePct: 50,
		});
		// 1/3 = 33.33 → rounds to 33
		expect(result.scorePct).toBe(33);
		expect(result.passed).toBe(false);
		expect(result.correctCount).toBe(1);
	});

	it("treats missing answers as incorrect (not as accidental matches)", () => {
		// Edge case: empty selectedChoiceId must NOT match an empty correct id.
		const result = scorer.score({
			questions: [q("q1")],
			correctChoices: [],
			answers: {},
			passScorePct: 50,
		});
		expect(result.correctCount).toBe(0);
		expect(result.questionResults[0]?.isCorrect).toBe(false);
	});

	it("returns 0% when there are no questions", () => {
		const result = scorer.score({
			questions: [],
			correctChoices: [],
			answers: {},
			passScorePct: 50,
		});
		expect(result.scorePct).toBe(0);
		expect(result.passed).toBe(false);
		expect(result.totalQuestions).toBe(0);
	});

	it("passes exactly at the threshold", () => {
		const result = scorer.score({
			questions: [q("q1"), q("q2")],
			correctChoices: [correct("q1", "a"), correct("q2", "b")],
			answers: { q1: "a", q2: "x" },
			passScorePct: 50,
		});
		expect(result.scorePct).toBe(50);
		expect(result.passed).toBe(true);
	});
});

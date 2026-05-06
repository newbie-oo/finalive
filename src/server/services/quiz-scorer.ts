/**
 * Pure quiz scoring — no DB access, no side effects.
 * All data is injected so tests can run in milliseconds with plain objects.
 */

export interface ScoringQuestion {
	id: string;
}

export interface ScoringCorrectChoice {
	questionId: string;
	choiceId: string;
}

export interface QuestionResult {
	questionId: string;
	selectedChoiceId: string;
	correctChoiceId: string;
	isCorrect: boolean;
}

export interface ScoreResult {
	scorePct: number;
	passed: boolean;
	totalQuestions: number;
	correctCount: number;
	questionResults: QuestionResult[];
}

export class QuizScorer {
	score(params: {
		questions: ScoringQuestion[];
		correctChoices: ScoringCorrectChoice[];
		answers: Record<string, string>;
		passScorePct: number;
	}): ScoreResult {
		const correctMap = new Map<string, string>();
		for (const c of params.correctChoices) {
			correctMap.set(c.questionId, c.choiceId);
		}

		let correctCount = 0;
		const questionResults: QuestionResult[] = [];

		for (const q of params.questions) {
			const selectedChoiceId = params.answers[q.id] ?? "";
			const correctChoiceId = correctMap.get(q.id) ?? "";
			const isCorrect =
				selectedChoiceId === correctChoiceId && selectedChoiceId !== "";
			if (isCorrect) correctCount += 1;
			questionResults.push({
				questionId: q.id,
				selectedChoiceId,
				correctChoiceId,
				isCorrect,
			});
		}

		const totalQuestions = params.questions.length;
		const scorePct =
			totalQuestions > 0
				? Math.round((correctCount / totalQuestions) * 100)
				: 0;
		const passed = scorePct >= params.passScorePct;

		return {
			scorePct,
			passed,
			totalQuestions,
			correctCount,
			questionResults,
		};
	}
}

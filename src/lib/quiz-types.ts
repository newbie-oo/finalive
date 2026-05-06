/**
 * Shared quiz types used by both repos and services.
 * Kept in lib so repos don't depend on the services layer.
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

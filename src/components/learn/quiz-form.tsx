"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAction } from "@/server/actions/quiz";
import type { QuizWithQuestions } from "@/server/repos/quiz";
import { QuizQuestionScreen } from "./quiz-question-screen";
import { QuizBriefing } from "./quiz-briefing";
import {
	QuizResultScreen,
	type QuizResult,
} from "./quiz-result-screen";

interface QuizFormProps {
	quiz: QuizWithQuestions;
	courseSlug: string;
	nextLessonId?: string | null;
	/** Where 'กลับไปบทเรียน' on the briefing screen should navigate. */
	lessonHref: string;
}

export function QuizForm({
	quiz,
	courseSlug,
	nextLessonId,
	lessonHref,
}: QuizFormProps) {
	const router = useRouter();
	const [started, setStarted] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [result, setResult] = useState<QuizResult | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const total = quiz.questions.length;
	const currentQ = quiz.questions[currentIndex];

	const handleSelect = (choiceId: string) => {
		if (!currentQ) return;
		setAnswers((prev) => ({ ...prev, [currentQ.id]: choiceId }));
	};

	const handleNext = () => {
		if (currentIndex < total - 1) {
			setCurrentIndex((i) => i + 1);
		}
	};

	const handleSubmit = async () => {
		setSubmitting(true);
		const formData = new FormData();
		formData.append("quizId", quiz.id);
		formData.append("answers", JSON.stringify(answers));

		const res = await submitQuizAction(formData);
		if (res.ok && res.result) {
			setResult({
				scorePct: res.result.scorePct,
				passed: res.result.passed,
				correctCount: res.result.correctCount,
				totalQuestions: res.result.totalQuestions,
				questionResults: res.result.questionResults,
			});
			// Re-fetch server data so sidebar quiz icons update immediately.
			router.refresh();
		}
		setSubmitting(false);
	};

	const handleRetry = () => {
		setResult(null);
		setAnswers({});
		setCurrentIndex(0);
	};

	if (result) {
		return (
			<QuizResultScreen
				quiz={quiz}
				courseSlug={courseSlug}
				nextLessonId={nextLessonId}
				result={result}
				onRetry={handleRetry}
			/>
		);
	}

	if (!started) {
		return (
			<QuizBriefing
				title={quiz.title}
				questionCount={total}
				passScorePct={quiz.passScorePct}
				lessonHref={lessonHref}
				onStart={() => setStarted(true)}
			/>
		);
	}

	return (
		<QuizQuestionScreen
			quiz={quiz}
			currentIndex={currentIndex}
			answers={answers}
			submitting={submitting}
			onSelect={handleSelect}
			onNext={handleNext}
			onSkip={handleNext}
			onSubmit={handleSubmit}
		/>
	);
}

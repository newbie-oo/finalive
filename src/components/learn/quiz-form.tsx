"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Check,
	X,
	ArrowRight,
	Sparkle,
	BookOpen,
	ListBullets,
	Trophy,
} from "@phosphor-icons/react";
import { QuizCelebration } from "./quiz-celebration";
import { submitQuizAction } from "@/server/actions/quiz";
import type { QuizWithQuestions } from "@/server/repos/quiz";
import type { QuestionResult } from "@/server/repos/quiz";
import { Button } from "@/components/ui/button";

interface QuizFormProps {
	quiz: QuizWithQuestions;
	courseSlug: string;
	nextLessonId?: string | null;
}

interface QuizResult {
	scorePct: number;
	passed: boolean;
	correctCount: number;
	totalQuestions: number;
	questionResults: QuestionResult[];
}

function ScoreCircle({
	score,
	passed,
	size = 180,
}: {
	score: number;
	passed: boolean;
	size?: number;
}) {
	const r = (size - 14) / 2;
	const C = 2 * Math.PI * r;
	const offset = C - (score / 100) * C;
	return (
		<div className="relative mx-auto" style={{ width: size, height: size }}>
			<svg width={size} height={size}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--surface-muted)"
					strokeWidth={10}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={passed ? "var(--success)" : "var(--destructive)"}
					strokeWidth={10}
					strokeLinecap="round"
					strokeDasharray={C}
					strokeDashoffset={offset}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div
					className="num font-bold text-(--foreground)"
					style={{
						fontSize: size * 0.32,
						lineHeight: 1,
						letterSpacing: "-0.02em",
					}}
				>
					{score}
					<span
						className="font-medium text-(--foreground-muted)"
						style={{ fontSize: size * 0.13 }}
					>
						%
					</span>
				</div>
				<div className="text-caption text-(--foreground-muted) mt-1">
					ผ่าน <span className="num">70%</span>
				</div>
			</div>
		</div>
	);
}

function ResultRow({
	n,
	ok,
	q,
	exp,
	correctAnswer,
	selectedAnswer,
}: {
	n: number;
	ok: boolean;
	q: string;
	exp?: string;
	correctAnswer?: string;
	selectedAnswer?: string;
}) {
	return (
		<div
			className="flex gap-3 items-start rounded-[10px] border border-(--border) bg-(--surface) p-3.5"
			style={{
				borderLeftWidth: "4px",
				borderLeftColor: ok ? "var(--success)" : "var(--destructive)",
			}}
		>
			<div
				className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
				style={{
					background: ok ? "var(--success-bg)" : "var(--destructive-bg)",
					color: ok ? "var(--success)" : "var(--destructive)",
				}}
			>
				{ok ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-ui font-medium text-(--foreground)">
					<span className="num mr-1.5 text-(--foreground-muted)">{n}.</span>
					{q}
				</div>
				{!ok && selectedAnswer && (
					<div className="mt-1.5 text-caption text-(--destructive)">
						คุณเลือก: {selectedAnswer}
					</div>
				)}
				{!ok && correctAnswer && (
					<div className="mt-1 text-caption text-(--success)">
						คำตอบที่ถูกต้อง: {correctAnswer}
					</div>
				)}
				{exp && (
					<div className="mt-2 flex gap-2 rounded-lg bg-(--info-bg) p-3 text-[13px] leading-relaxed text-(--foreground)">
						<Sparkle
							size={14}
							weight="bold"
							className="mt-0.5 shrink-0 text-(--info)"
						/>
						<span>{exp}</span>
					</div>
				)}
			</div>
		</div>
	);
}

export function QuizForm({ quiz, courseSlug, nextLessonId }: QuizFormProps) {
	const router = useRouter();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [result, setResult] = useState<QuizResult | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const total = quiz.questions.length;
	const currentQ = quiz.questions[currentIndex];
	const progressPct =
		total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

	const handleSelect = (choiceId: string) => {
		if (!currentQ) return;
		setAnswers((prev) => ({ ...prev, [currentQ.id]: choiceId }));
	};

	const handleNext = () => {
		if (currentIndex < total - 1) {
			setCurrentIndex((i) => i + 1);
		}
	};

	const handleSkip = () => {
		handleNext();
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

	const isLast = currentIndex === total - 1;
	const hasAnswer = currentQ ? !!answers[currentQ.id] : false;

	if (result) {
		const resultMap = new Map(
			result.questionResults.map((r) => [r.questionId, r]),
		);
		return (
			<div className="space-y-6">
				<QuizCelebration passed={result.passed} />

				{/* Score card */}
				<div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 text-center md:p-9">
					<ScoreCircle
						score={result.scorePct}
						passed={result.passed}
						size={180}
					/>
					<div
						className="mt-4 text-uism font-semibold uppercase tracking-widest"
						style={{
							color: result.passed ? "var(--success)" : "var(--destructive)",
						}}
					>
						{result.passed ? "ผ่าน" : "ยังไม่ผ่าน"}
					</div>
					<h2 className="text-h2 mt-2 mb-1.5">
						{result.passed ? "ทำได้ดีมาก!" : "ลองทำใหม่อีกครั้ง"}
					</h2>
					<p className="text-body text-(--foreground-muted)">
						ตอบถูก{" "}
						<span className="num font-semibold text-(--foreground)">
							{result.correctCount}
						</span>{" "}
						จาก <span className="num">{result.totalQuestions}</span> ข้อ
					</p>
				</div>

				{/* Per-question feedback */}
				<div>
					<div className="text-uism font-medium uppercase tracking-widest text-(--foreground-subtle) mb-3">
						สรุปผลแต่ละข้อ
					</div>
					<div className="flex flex-col gap-2.5">
						{quiz.questions.map((q, idx) => {
							const r = resultMap.get(q.id);
							const selectedChoice = q.choices.find(
								(c) => c.id === r?.selectedChoiceId,
							);
							const correctChoice = q.choices.find(
								(c) => c.id === r?.correctChoiceId,
							);
							const explanation =
								selectedChoice?.explanation ?? correctChoice?.explanation;
							const genericExp = !r?.isCorrect
								? `คำตอบที่ถูกต้องคือ ${correctChoice?.body ?? "—"}`
								: undefined;
							return (
								<ResultRow
									key={q.id}
									n={idx + 1}
									ok={r?.isCorrect ?? false}
									q={q.promptMd}
									exp={explanation ?? genericExp}
									correctAnswer={
										!r?.isCorrect ? correctChoice?.body : undefined
									}
									selectedAnswer={
										!r?.isCorrect ? selectedChoice?.body : undefined
									}
								/>
							);
						})}
					</div>
				</div>

				{/* Next-lesson CTA */}
				<div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 text-center">
					<h3 className="text-h3 mb-1">
						{result.passed ? "พร้อมไปต่อแล้ว!" : "อย่าลืมทบทวนเนื้อหา"}
					</h3>
					<p className="text-body text-(--foreground-muted) mb-5">
						{result.passed
							? "คุณผ่านแบบทดสอบแล้ว ไปบทถัดไปกันเลย"
							: "ทบทวนเนื้อหาและลองทำแบบทดสอบอีกครั้ง"}
					</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						{nextLessonId ? (
							<Button
								variant={result.passed ? "primary" : "secondary"}
								size="lg"
								onClick={() =>
									router.push(`/learn/${courseSlug}/${nextLessonId}`)
								}
							>
								ไปบทถัดไป <ArrowRight size={16} weight="bold" />
							</Button>
						) : (
							<Button
								variant={result.passed ? "primary" : "secondary"}
								size="lg"
								onClick={() => router.push("/account/enrollments")}
							>
								<ListBullets size={16} weight="bold" /> ดูคอร์สของฉัน
							</Button>
						)}
						{result.passed && (
							<Button
								asChild
								variant="outline"
								size="lg"
								className="border-(--primary) text-(--primary) hover:bg-(--primary)/5"
							>
								<a
									href={`/verify/${courseSlug}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Trophy size={16} weight="bold" /> ดูใบประกาศ
								</a>
							</Button>
						)}
						<Button
							variant="ghost"
							size="lg"
							onClick={() => router.push(`/learn/${courseSlug}`)}
						>
							<BookOpen size={16} weight="bold" /> ทบทวนเนื้อหา
						</Button>
						<Button
							variant="secondary"
							size="lg"
							onClick={() => {
								setResult(null);
								setAnswers({});
								setCurrentIndex(0);
							}}
						>
							ทำอีกครั้ง
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (!currentQ) return null;

	return (
		<div className="space-y-6">
			{/* Progress */}
			<div>
				<div className="mb-2 flex justify-between">
					<span className="text-uism font-semibold text-(--foreground-muted)">
						ข้อ <span className="num text-(--primary)">{currentIndex + 1}</span>{" "}
						จาก <span className="num">{total}</span>
					</span>
					<span className="num text-uism text-(--foreground-muted)">
						{progressPct}%
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-(--surface-muted)">
					<div
						className="h-full rounded-full bg-(--primary) transition-[width] duration-300"
						style={{ width: `${progressPct}%` }}
					/>
				</div>
			</div>

			{/* Question card */}
			<div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 md:p-7">
				<div className="text-uism font-medium uppercase tracking-widest text-(--foreground-subtle) mb-3">
					คำถามที่ <span className="num">{currentIndex + 1}</span>
				</div>
				<h2 className="text-[18px] font-medium leading-relaxed text-(--foreground) mb-6">
					{currentQ.promptMd}
				</h2>
				<div className="flex flex-col gap-2.5">
					{currentQ.choices.map((c, i) => {
						const isSelected = answers[currentQ.id] === c.id;
						return (
							<label
								key={c.id}
								className="flex cursor-pointer items-center gap-3.5 rounded-[10px] border p-4 transition-colors"
								style={{
									borderColor: isSelected ? "var(--primary)" : "var(--border)",
									borderWidth: isSelected ? "2px" : "1px",
									background: isSelected
										? "color-mix(in srgb, var(--primary) 5%, var(--surface))"
										: "var(--surface)",
								}}
							>
								<input
									type="radio"
									name={`q-${currentQ.id}`}
									value={c.id}
									checked={isSelected}
									onChange={() => handleSelect(c.id)}
									className="sr-only"
								/>
								<div
									className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors"
									style={{
										border: isSelected
											? "6px solid var(--primary)"
											: "1.5px solid var(--border-strong)",
										background: isSelected ? "var(--surface)" : "transparent",
									}}
								/>
								<div
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold"
									style={{
										background: isSelected
											? "var(--primary)"
											: "var(--surface-muted)",
										color: isSelected ? "#fff" : "var(--foreground-muted)",
									}}
								>
									{String.fromCharCode(65 + i)}
								</div>
								<span className="text-bodylg num font-medium text-(--foreground)">
									{c.body}
								</span>
							</label>
						);
					})}
				</div>
			</div>

			{/* Bottom actions */}
			<div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
				<button
					type="button"
					onClick={handleSkip}
					className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-muted) w-full sm:w-auto"
				>
					ข้ามข้อนี้
				</button>
				{isLast ? (
					<Button
						onClick={handleSubmit}
						disabled={!hasAnswer || submitting}
						variant="primary"
						size="md"
						className="w-full sm:w-auto sm:min-w-[180px]"
					>
						{submitting ? "กำลังส่ง…" : "ตรวจคำตอบ"}
						<ArrowRight size={14} weight="bold" />
					</Button>
				) : (
					<Button
						onClick={handleNext}
						disabled={!hasAnswer}
						variant="primary"
						size="md"
						className="w-full sm:w-auto sm:min-w-[180px]"
					>
						ถัดไป
						<ArrowRight size={14} weight="bold" />
					</Button>
				)}
			</div>
		</div>
	);
}

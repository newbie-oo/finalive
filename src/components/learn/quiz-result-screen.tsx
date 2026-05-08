"use client";

import { useRouter } from "next/navigation";
import {
	ArrowRight,
	BookOpen,
	ListBullets,
	Trophy,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { QuizCelebration } from "./quiz-celebration";
import { QuizScoreCircle } from "./quiz-score-circle";
import { QuizResultAccordion } from "./quiz-result-accordion";
import type { QuizWithQuestions } from "@/server/repos/quiz";
import type { QuestionResult } from "@/lib/quiz-types";

export interface QuizResult {
	scorePct: number;
	passed: boolean;
	correctCount: number;
	totalQuestions: number;
	questionResults: QuestionResult[];
}

interface QuizResultScreenProps {
	quiz: QuizWithQuestions;
	courseSlug: string;
	nextLessonId?: string | null;
	result: QuizResult;
	onRetry: () => void;
}

export function QuizResultScreen({
	quiz,
	courseSlug,
	nextLessonId,
	result,
	onRetry,
}: QuizResultScreenProps) {
	const router = useRouter();
	const resultMap = new Map(
		result.questionResults.map((r) => [r.questionId, r]),
	);

	return (
		<div className="space-y-6">
			<QuizCelebration passed={result.passed} />

			<div className="rounded-card border border-border bg-card p-6 text-center md:p-9">
				<QuizScoreCircle
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
				<p className="text-body text-muted-foreground">
					ตอบถูก{" "}
					<span className="num font-semibold text-foreground">
						{result.correctCount}
					</span>{" "}
					จาก <span className="num">{result.totalQuestions}</span> ข้อ
				</p>
			</div>

			<div>
				<div className="text-uism font-medium uppercase tracking-widest text-foreground-subtle mb-3">
					สรุปผลแต่ละข้อ
				</div>
				<QuizResultAccordion
					items={quiz.questions.map((q, idx) => {
						const r = resultMap.get(q.id);
						const selectedChoice = q.choices.find(
							(c) => c.id === r?.selectedChoiceId,
						);
						const correctChoice = q.choices.find(
							(c) => c.id === r?.correctChoiceId,
						);
						const explanation =
							selectedChoice?.explanation ?? correctChoice?.explanation;
						return {
							n: idx + 1,
							ok: r?.isCorrect ?? false,
							question: q.promptMd,
							selectedAnswer: selectedChoice?.body,
							correctAnswer: correctChoice?.body,
							explanation,
						};
					})}
				/>
			</div>

			<div
				className={`overflow-hidden rounded-card border p-7 text-center sm:p-10 ${
					result.passed
						? "border-success/25 bg-linear-to-br from-success-bg via-card to-card"
						: "border-warning/30 bg-linear-to-br from-warning-bg via-card to-card"
				}`}
			>
				<h3 className="mb-1.5 text-h2">
					{result.passed ? "พร้อมไปต่อแล้ว!" : "อย่าลืมทบทวนเนื้อหา"}
				</h3>
				<p className="mx-auto mb-6 max-w-md text-body text-muted-foreground">
					{result.passed
						? "คุณผ่านแบบทดสอบแล้ว ไปบทถัดไปกันเลย"
						: "ทบทวนเนื้อหาและลองทำแบบทดสอบอีกครั้ง"}
				</p>
				<div className="mx-auto flex max-w-md flex-col items-stretch gap-2 sm:max-w-lg sm:flex-row sm:items-center sm:justify-center">
					{nextLessonId ? (
						<Button
							variant={result.passed ? "primary" : "secondary"}
							size="lg"
							className="w-full sm:flex-1"
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
							className="w-full sm:flex-1"
							onClick={() => router.push("/account/enrollments")}
						>
							<ListBullets size={16} weight="bold" /> ดูคอร์สของฉัน
						</Button>
					)}
					{result.passed && (
						<Button
							asChild
							variant="secondary"
							size="lg"
							className="w-full sm:w-auto"
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
				</div>
				<div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-uism">
					<button
						type="button"
						onClick={() => router.push(`/learn/${courseSlug}`)}
						className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<BookOpen size={14} weight="bold" /> ทบทวนเนื้อหา
					</button>
					<button
						type="button"
						onClick={onRetry}
						className="font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						ทำอีกครั้ง
					</button>
				</div>
			</div>
		</div>
	);
}

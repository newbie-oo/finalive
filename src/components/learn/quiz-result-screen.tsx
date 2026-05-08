"use client";

import { useRouter } from "next/navigation";
import {
	ArrowRight,
	BookOpen,
	ListBullets,
	Trophy,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { QuizCelebration } from "./quiz-celebration";
import { QuizScoreCircle } from "./quiz-score-circle";
import { QuizResultRow } from "./quiz-result-row";
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
							<QuizResultRow
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

			<div className="rounded-card border border-border bg-card p-6 text-center">
				<h3 className="text-h3 mb-1">
					{result.passed ? "พร้อมไปต่อแล้ว!" : "อย่าลืมทบทวนเนื้อหา"}
				</h3>
				<p className="text-body text-muted-foreground mb-5">
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
							className="border-primary text-primary hover:bg-primary/5"
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
					<Button variant="secondary" size="lg" onClick={onRetry}>
						ทำอีกครั้ง
					</Button>
				</div>
			</div>
		</div>
	);
}

"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import type { QuizWithQuestions } from "@/server/repos/quiz";

interface QuizQuestionScreenProps {
	quiz: QuizWithQuestions;
	currentIndex: number;
	answers: Record<string, string>;
	submitting: boolean;
	onSelect: (choiceId: string) => void;
	onNext: () => void;
	onSkip: () => void;
	onSubmit: () => void;
}

export function QuizQuestionScreen({
	quiz,
	currentIndex,
	answers,
	submitting,
	onSelect,
	onNext,
	onSkip,
	onSubmit,
}: QuizQuestionScreenProps) {
	const total = quiz.questions.length;
	const currentQ = quiz.questions[currentIndex];
	const progressPct =
		total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
	const isLast = currentIndex === total - 1;
	const hasAnswer = currentQ ? !!answers[currentQ.id] : false;

	if (!currentQ) return null;

	return (
		<div className="space-y-6">
			<div>
				<div className="mb-2 flex justify-between">
					<span className="text-uism font-semibold text-muted-foreground">
						ข้อ <span className="num text-primary">{currentIndex + 1}</span>{" "}
						จาก <span className="num">{total}</span>
					</span>
					<span className="num text-uism text-muted-foreground">
						{progressPct}%
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary transition-[width] duration-300"
						style={{ width: `${progressPct}%` }}
					/>
				</div>
			</div>

			<div className="rounded-card border border-border bg-card p-6 md:p-7">
				<div className="text-uism font-medium uppercase tracking-widest text-foreground-subtle mb-3">
					คำถามที่ <span className="num">{currentIndex + 1}</span>
				</div>
				<h2 className="text-[18px] font-medium leading-relaxed text-foreground mb-6">
					{currentQ.promptMd}
				</h2>
				<div className="flex flex-col gap-2.5">
					{currentQ.choices.map((c, i) => {
						const isSelected = answers[currentQ.id] === c.id;
						return (
							<label
								key={c.id}
								className="flex cursor-pointer items-center gap-3.5 rounded-button border p-4 transition-colors"
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
									onChange={() => onSelect(c.id)}
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
								<span className="text-bodylg num font-medium text-foreground">
									{c.body}
								</span>
							</label>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
				<button
					type="button"
					onClick={onSkip}
					className="inline-flex h-10 items-center justify-center gap-2 rounded-button px-4 text-ui font-medium text-foreground transition-colors hover:bg-muted w-full sm:w-auto"
				>
					ข้ามข้อนี้
				</button>
				{isLast ? (
					<Button
						onClick={onSubmit}
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
						onClick={onNext}
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

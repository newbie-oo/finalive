import { Check, X, Sparkle } from "@phosphor-icons/react";

interface ResultRowProps {
	n: number;
	ok: boolean;
	q: string;
	exp?: string;
	correctAnswer?: string;
	selectedAnswer?: string;
}

export function QuizResultRow({
	n,
	ok,
	q,
	exp,
	correctAnswer,
	selectedAnswer,
}: ResultRowProps) {
	return (
		<div
			className="flex gap-3 items-start rounded-button border border-border bg-card p-3.5"
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
				<div className="text-ui font-medium text-foreground">
					<span className="num mr-1.5 text-muted-foreground">{n}.</span>
					{q}
				</div>
				{!ok && selectedAnswer && (
					<div className="mt-1.5 text-caption text-destructive">
						คุณเลือก: {selectedAnswer}
					</div>
				)}
				{!ok && correctAnswer && (
					<div className="mt-1 text-caption text-success">
						คำตอบที่ถูกต้อง: {correctAnswer}
					</div>
				)}
				{exp && (
					<div className="mt-2 flex gap-2 rounded-lg bg-info-bg p-3 text-[13px] leading-relaxed text-foreground">
						<Sparkle
							size={14}
							weight="bold"
							className="mt-0.5 shrink-0 text-info"
						/>
						<span>{exp}</span>
					</div>
				)}
			</div>
		</div>
	);
}

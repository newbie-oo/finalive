"use client";

import { Check, Sparkle, X as XIcon } from "@phosphor-icons/react";

import { Accordion, AccordionItem } from "@/components/ui/accordion";

export interface QuizResultAccordionItem {
	n: number;
	ok: boolean;
	question: string;
	selectedAnswer?: string;
	correctAnswer?: string;
	explanation?: string;
}

interface QuizResultAccordionProps {
	items: QuizResultAccordionItem[];
}

/**
 * Per-question review list shown after submitting. Wraps each row in an
 * AccordionItem so a long quiz keeps the screen scannable, but auto-opens
 * the items the student got wrong — those are the ones they need to read
 * the explanation for, while the correct ones stay tucked away.
 */
export function QuizResultAccordion({ items }: QuizResultAccordionProps) {
	return (
		<Accordion>
			{items.map((item) => (
				<AccordionItem
					key={item.n}
					defaultOpen={!item.ok}
					header={
						<span className="flex min-w-0 flex-1 items-center gap-3">
							<span
								className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
									item.ok
										? "bg-success-bg text-success"
										: "bg-destructive-bg text-destructive"
								}`}
							>
								{item.ok ? (
									<Check size={14} weight="bold" />
								) : (
									<XIcon size={14} weight="bold" />
								)}
							</span>
							<span className="min-w-0 flex-1 truncate text-left text-ui font-medium text-foreground">
								<span className="num mr-1.5 text-muted-foreground">
									{item.n}.
								</span>
								{item.question}
							</span>
						</span>
					}
				>
					<div className="space-y-2.5 px-4 pb-4 pt-3">
						{!item.ok && item.selectedAnswer && (
							<div className="text-caption font-medium text-destructive">
								{`คุณเลือก: ${item.selectedAnswer}`}
							</div>
						)}
						{item.correctAnswer && (
							<div className="text-caption font-medium text-success">
								{`คำตอบที่ถูกต้อง: ${item.correctAnswer}`}
							</div>
						)}
						{item.explanation && (
							<div className="flex gap-2 rounded-card bg-info-bg p-3 text-uism leading-relaxed text-foreground">
								<Sparkle
									size={14}
									weight="bold"
									className="mt-0.5 shrink-0 text-info"
								/>
								<span>{item.explanation}</span>
							</div>
						)}
					</div>
				</AccordionItem>
			))}
		</Accordion>
	);
}

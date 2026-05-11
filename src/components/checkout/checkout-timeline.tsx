"use client";

import { Check } from "@phosphor-icons/react";

export interface TimelineItem {
	state: "done" | "active" | "future";
	title: string;
	desc: string;
	time: string;
}

export interface CheckoutTimelineProps {
	items: TimelineItem[];
}

export function CheckoutTimeline({ items }: CheckoutTimelineProps) {
	return (
		<div className="relative">
			<div className="absolute bottom-3.5 left-3.5 top-3.5 w-0.5 bg-border" />
			{items.map((item, i) => (
				<TimelineNode key={i} {...item} isLast={i === items.length - 1} />
			))}
		</div>
	);
}

function TimelineNode({
	state,
	title,
	desc,
	time,
	isLast,
}: TimelineItem & { isLast: boolean }) {
	return (
		<div className={`relative flex gap-4 ${isLast ? "" : "pb-6"}`}>
			<div
				className={`relative z-[2] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
					state === "done"
						? "bg-success text-white"
						: state === "active"
							? "bg-warning text-white shadow-[0_0_0_4px_rgba(245,158,11,0.18)]"
							: "border-2 border-border bg-card"
				}`}
			>
				{state === "done" && <Check weight="bold" className="h-3.5 w-3.5" />}
				{state === "active" && (
					<div className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
				)}
			</div>
			<div className="flex-1 pt-0.5">
				<div className="mb-0.5 flex items-baseline justify-between gap-3">
					<div
						className={`text-ui font-semibold ${
							state === "future" ? "text-foreground-subtle" : "text-foreground"
						}`}
					>
						{title}
					</div>
					{time && (
						<div className="text-caption num shrink-0 text-muted-foreground">
							{time}
						</div>
					)}
				</div>
				<div
					className={`text-uism ${
						state === "future"
							? "text-foreground-subtle"
							: "text-muted-foreground"
					}`}
				>
					{desc}
				</div>
			</div>
		</div>
	);
}

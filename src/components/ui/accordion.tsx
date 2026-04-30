"use client";

import * as React from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
	children: React.ReactNode;
	defaultOpen?: boolean;
	header: React.ReactNode;
}

export function AccordionItem({
	children,
	defaultOpen = false,
	header,
}: AccordionItemProps) {
	const [open, setOpen] = React.useState(defaultOpen);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const [maxHeight, setMaxHeight] = React.useState<string>(
		defaultOpen ? "9999px" : "0px",
	);

	React.useEffect(() => {
		if (contentRef.current) {
			setMaxHeight(open ? `${contentRef.current.scrollHeight}px` : "0px");
		}
	}, [open, children]);

	return (
		<div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full cursor-pointer items-center justify-between bg-(--surface-muted) px-4 py-3 text-ui font-medium"
				aria-expanded={open}
			>
				{header}
				<CaretDown
					size={16}
					className={cn(
						"text-(--foreground-muted) transition-transform duration-300 ease-out",
						open && "rotate-180",
					)}
					aria-hidden
				/>
			</button>
			<div
				className="overflow-hidden transition-[max-height] duration-300 ease-out"
				style={{ maxHeight }}
			>
				<div ref={contentRef}>{children}</div>
			</div>
		</div>
	);
}

interface AccordionProps {
	children: React.ReactNode;
	className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
	return <div className={cn("space-y-3", className)}>{children}</div>;
}

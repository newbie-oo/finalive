"use client";

import { SquaresFour, List } from "@phosphor-icons/react";

interface ViewModeToggleProps {
	value: "grid" | "list";
	onChange: (mode: "grid" | "list") => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
	return (
		<div className="inline-flex rounded-button border border-(--border) bg-(--surface) p-0.5">
			<button
				type="button"
				onClick={() => onChange("grid")}
				className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
					value === "grid"
						? "bg-(--primary) text-white"
						: "text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
				}`}
				aria-label="มุมมองตาราง"
				aria-pressed={value === "grid"}
			>
				<SquaresFour size={16} />
			</button>
			<button
				type="button"
				onClick={() => onChange("list")}
				className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
					value === "list"
						? "bg-(--primary) text-white"
						: "text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
				}`}
				aria-label="มุมมองรายการ"
				aria-pressed={value === "list"}
			>
				<List size={16} />
			</button>
		</div>
	);
}

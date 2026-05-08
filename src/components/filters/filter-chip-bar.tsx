"use client";

import { X } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActiveFilter {
	key: string;
	label: string;
}

interface FilterChipBarProps {
	filters: ActiveFilter[];
	onRemove: (key: string) => void;
	onClearAll: () => void;
	className?: string;
}

/**
 * Presentational chip bar for active filters. Each chip is a removable
 * shadcn `<Badge>` rendered as a button; when more than one filter is
 * active a ghost "ล้างทั้งหมด" button appears at the end.
 */
export function FilterChipBar({
	filters,
	onRemove,
	onClearAll,
	className,
}: FilterChipBarProps) {
	if (filters.length === 0) return null;

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2",
				className,
			)}
		>
			{filters.map((filter) => (
				<Badge key={filter.key} variant="outline" asChild>
					<button
						type="button"
						onClick={() => onRemove(filter.key)}
						aria-label={`ลบตัวกรอง: ${filter.label}`}
						className="cursor-pointer"
					>
						{filter.label}
						<X size={12} weight="bold" aria-hidden />
					</button>
				</Badge>
			))}
			{filters.length > 1 && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onClearAll}
				>
					ล้างทั้งหมด
				</Button>
			)}
		</div>
	);
}

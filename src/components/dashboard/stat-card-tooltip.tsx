"use client";

import { useEffect, useState } from "react";
import { Info } from "@phosphor-icons/react/dist/ssr";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardTooltipProps {
	readonly label: string;
	readonly tooltip: string;
}

/**
 * Client-only tooltip trigger for the dashboard StatCard. We defer rendering
 * until after mount so the SSR HTML doesn't contain a button for browser
 * extensions (wallet injectors, etc.) to wrap or replace before React hydrates
 * — the previous inline server-rendered Tooltip caused recurring hydration
 * mismatches when such extensions were active.
 */
export function StatCardTooltip({ label, tooltip }: StatCardTooltipProps) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={`คำอธิบาย: ${label}`}
					className="inline-flex items-center text-foreground-subtle transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				>
					<Info size={12} aria-hidden />
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{tooltip}</TooltipContent>
		</Tooltip>
	);
}

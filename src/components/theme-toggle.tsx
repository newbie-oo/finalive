"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useThemeToggle } from "@/lib/use-theme-toggle";

export function ThemeToggle() {
	const { Icon, label, nextLabel, cycle } = useThemeToggle();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-11 w-11 cursor-pointer"
					aria-label={`Theme: ${label} (click to change)`}
					onClick={cycle}
					data-testid="theme-toggle"
				>
					<Icon className="h-5 w-5" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>เปลี่ยนเป็น {nextLabel} mode</TooltipContent>
		</Tooltip>
	);
}

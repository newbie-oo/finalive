"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
	size?: number;
	variant?: "mark" | "badge";
	className?: string;
}

/**
 * Finalive brand mark — a geometric "F" with an upward-trend arrow.
 *
 * - **mark**:   stroke-only, uses `currentColor`. Best for headers.
 * - **badge**:  rounded-square with indigo→violet gradient bg + white mark.
 *               Best for favicons, avatars, and empty-state illustrations.
 */
export function Logo({ size = 32, variant = "mark", className }: LogoProps) {
	const vb = "0 0 32 32";
	const markPath = (
		<path
			d="M8 24V8h12M8 16h7M15 8l4-4"
			stroke={variant === "badge" ? "white" : "currentColor"}
			strokeWidth="3"
			strokeLinecap="round"
			strokeLinejoin="round"
			fill="none"
		/>
	);

	if (variant === "badge") {
		return (
			<svg
				width={size}
				height={size}
				viewBox={vb}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className={cn("flex-shrink-0", className)}
				aria-hidden="true"
			>
				<defs>
					<linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
						<stop stopColor="#4F46E5" />
						<stop offset="1" stopColor="#7C3AED" />
					</linearGradient>
				</defs>
				<rect width="32" height="32" rx="7" fill="url(#logoGrad)" />
				{markPath}
			</svg>
		);
	}

	return (
		<svg
			width={size}
			height={size}
			viewBox={vb}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("flex-shrink-0", className)}
			aria-hidden="true"
		>
			{markPath}
		</svg>
	);
}

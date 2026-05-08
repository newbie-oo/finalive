"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
	size?: number;
	variant?: "mark" | "badge";
	className?: string;
}

/**
 * Finalive brand logo — renders the PNG mark.
 *
 * - **mark**:   Transparent PNG, scales via size. Best for headers.
 * - **badge**:  Same PNG inside a rounded-square container with gradient border.
 *               Best for avatars and favicon-style spots.
 */
export function Logo({ size = 32, variant = "mark", className }: LogoProps) {
	if (variant === "badge") {
		return (
			<div
				className={cn(
					"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-card bg-linear-to-br from-[#4F46E5] to-[#7C3AED]",
					className,
				)}
				style={{ width: size, height: size }}
				aria-hidden="true"
			>
				<Image
					src="/logo.png"
					alt=""
					width={size}
					height={size}
					className="h-full w-full object-contain"
				/>
			</div>
		);
	}

	return (
		<Image
			src="/logo.png"
			alt=""
			width={size}
			height={size}
			className={cn("shrink-0 object-contain", className)}
			aria-hidden="true"
		/>
	);
}

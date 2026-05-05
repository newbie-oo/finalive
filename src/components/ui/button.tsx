import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent bg-clip-padding font-medium leading-tight whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				// Brand variants per handoff/02-DESIGN-SYSTEM.md
				primary:
					"bg-(--primary) text-(--primary-fg) hover:bg-(--primary-hover)",
				accent: "bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)",
				secondary:
					"bg-(--surface-muted) text-(--foreground) border-(--border) hover:bg-(--surface-sunken)",
				ghost: "bg-transparent text-(--foreground) hover:bg-(--surface-muted)",
				destructive: "bg-(--destructive) text-white hover:bg-[#B91C1C]",
				outline:
					"border-(--border) bg-(--surface) text-(--foreground) hover:bg-(--surface-muted)",
				link: "bg-transparent text-(--primary) underline-offset-4 hover:underline",
				// Back-compat — `default` aliases to primary so existing usages keep working
				default:
					"bg-(--primary) text-(--primary-fg) hover:bg-(--primary-hover)",
			},
			size: {
				sm: "h-8 px-3 text-[13px] rounded-[8px]",
				md: "h-10 px-5 text-sm rounded-full",
				lg: "h-12 px-8 text-[15px] rounded-full",
				icon: "h-10 w-10 rounded-[10px]",
				"icon-sm": "h-8 w-8 rounded-[8px]",
				"icon-lg": "h-12 w-12 rounded-[10px]",
				// Back-compat aliases
				default: "h-10 px-4 text-sm rounded-[10px]",
				xs: "h-7 px-2.5 text-xs rounded-[6px]",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

function Button({
	className,
	variant = "primary",
	size = "md",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button };

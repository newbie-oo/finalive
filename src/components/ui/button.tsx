import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent bg-clip-padding font-medium leading-tight whitespace-nowrap transition-colors duration-150 outline-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Brand variants per handoff/02-DESIGN-SYSTEM.md
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary:
          "bg-muted text-foreground border-border hover:bg-surface-sunken",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-[#B91C1C]",
        outline:
          "border-border bg-card text-foreground hover:bg-muted",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
        // Back-compat — `default` aliases to primary so existing usages keep working
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-nav",
        md: "h-10 px-5 text-sm rounded-full",
        lg: "h-12 px-8 text-[15px] rounded-full",
        icon: "h-10 w-10 rounded-button",
        "icon-sm": "h-8 w-8 rounded-nav",
        "icon-lg": "h-12 w-12 rounded-button",
        // Back-compat aliases
        default: "h-10 px-4 text-sm rounded-button",
        xs: "h-7 px-2.5 text-xs rounded-input",
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

export { Button, buttonVariants };

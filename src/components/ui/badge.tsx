import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 text-[12px] font-medium leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-primary-hover",
        primary:
          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary",
        secondary: "bg-muted text-muted-foreground",
        success: "bg-success-bg text-success-foreground",
        warning: "bg-warning-bg text-warning-foreground",
        destructive: "bg-destructive-bg text-destructive-foreground",
        info: "bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-info",
        review: "bg-review-bg text-review-foreground",
        accent:
          "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-accent",
        outline:
          "border-border bg-card text-foreground [a]:hover:bg-muted",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

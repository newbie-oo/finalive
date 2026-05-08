import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-[12px] font-medium leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        primary:
          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary",
        success: "bg-success-bg text-success-foreground",
        warning: "bg-warning-bg text-warning-foreground",
        destructive: "bg-destructive-bg text-destructive-foreground",
        info: "bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-info",
        review: "bg-review-bg text-review-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

export function StatusChip({ tone, className, ...props }: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      className={cn(chipVariants({ tone, className }))}
      {...props}
    />
  );
}
